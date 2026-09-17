import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HEART_STRUCTURES, HEART_CAMERA_PRESETS, getHeartStructure } from './organsData.js';
import { MODEL_URLS } from './modelUrls.js';

/**
 * ====================================================================
 * ORGANS VIEWER - ENGINE TƯƠNG TÁC GIẢI PHẪU 3D (GDPT 2018)
 * ====================================================================
 * Kiến trúc tương tác 4 lớp cho mô hình Single-mesh:
 * Layer 1: Hotspot System (Đầy đủ 6 cấu trúc với marker 3D nổi rõ)
 * Layer 2: 3D HUD Badges (Nhãn số [1]-[6] tự mở rộng khi hover/select)
 * Layer 3: Safe Surface Hover (Bắt va chạm bề mặt trong hoverRadius, loại trừ van tim)
 * Layer 4: Sidebar <-> 3D Bi-directional Synchronization
 * Occlusion: Camera-to-hotspot raycasting chống hiện tượng marker xuyên tim
 */
export class OrgansViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container #${containerId} not found.`);
      return;
    }

    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.modelGroup = null;
    this.heartMesh = null;

    // Hotspot & Interaction data
    this.currentStructures = HEART_STRUCTURES;
    this.currentPresets = HEART_CAMERA_PRESETS;
    this.hotspotGroups = []; // Array of hotspot objects
    this.hotspotRaycastMeshes = []; // Direct hitbox meshes
    this.selectedStructureId = null;
    this.hoveredStructure = null;
    this.isLoaded = false;
    this.isActive = false;
    this.labelsVisible = true;
    this.heartbeatEnabled = true;

    // Callbacks
    this.onRegionClick = null; // callback(structure | null, screenPos)
    this.onHover = null;       // callback(structure | null, screenPos)
    this.onLoadProgress = null;// callback(percent)
    this.onReady = null;

    // Floating 3D HUD labels layer
    this.floatingLabelsContainer = document.getElementById('organs-floating-labels');
    if (!this.floatingLabelsContainer) {
      this.floatingLabelsContainer = document.createElement('div');
      this.floatingLabelsContainer.id = 'organs-floating-labels';
      this.floatingLabelsContainer.className = 'organs-floating-labels';
      this.container.appendChild(this.floatingLabelsContainer);
    }

    // Raycasters & Reusable Vectors (Tránh cấp phát rác bộ nhớ mỗi frame)
    this.raycaster = new THREE.Raycaster();
    this.occlusionRaycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this._downPos = null;

    this._tempVecA = new THREE.Vector3();
    this._tempVecB = new THREE.Vector3();
    this._tempVecScreen = new THREE.Vector3();
    this._tempDir = new THREE.Vector3();
    this._cameraTweenId = null;

    // Initialize WebGL & Three.js environment
    this.initScene();
    this.initLights();
    this.initCameraControls();
    this.loadHeartModel();

    // Event listeners
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseDown = (e) => {
      if (!this.isActive) return;
      this._downPos = { x: e.clientX, y: e.clientY };
    };
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onResize = this._handleResize.bind(this);

    this.container.addEventListener('mousemove', this._onMouseMove);
    this.container.addEventListener('mousedown', this._onMouseDown);
    this.container.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('resize', this._onResize);

    this._animate();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060812);
    this.scene.fog = new THREE.FogExp2(0x060812, 0.08);

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.01, 100);
    this.camera.position.set(0, 0.03, 0.46);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Môi trường IBL / RoomEnvironment chất lượng cao
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    pmremGenerator.dispose();

    this.container.appendChild(this.renderer.domElement);

    // Background subtle particles
    this._createBackgroundParticles();
  }

  initLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(2, 3, 3);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
    rimLight.position.set(-2, -1, -2);
    this.scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.3);
    fillLight.position.set(-2, 2, 2);
    this.scene.add(fillLight);
  }

  initCameraControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.15;
    this.controls.maxDistance = 1.2;
    this.controls.target.set(0, 0, 0);
  }

  loadHeartModel() {
    const url = MODEL_URLS.human_heart || '/human_heart_3d.glb';
    const loader = new GLTFLoader();

    loader.load(
      url,
      (gltf) => {
        this.modelGroup = new THREE.Group();
        this.modelGroup.name = 'HeartRootGroup';

        const model = gltf.scene;

        // 1. Căn tâm hình học (Center Bounding Box to 0,0,0)
        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.sub(center);

        // 2. Kích hoạt texture map sRGB của mô hình PBR gốc
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            this.heartMesh = child;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m) => {
              if (m.map) {
                m.map.colorSpace = THREE.SRGBColorSpace;
                m.map.needsUpdate = true;
              }
              m.needsUpdate = true;
            });
          }
        });

        this.modelGroup.add(model);

        // 3. Khởi tạo 3D Hotspot Markers & HUD Badges
        this._createHotspotMarkers();

        // 4. Snap tọa độ các điểm ghim chính xác lên bề mặt ngoài của tim
        this._snapHotspotsToSurface();

        this.scene.add(this.modelGroup);
        this.isLoaded = true;

        if (this.onReady) this.onReady();
      },
      (xhr) => {
        if (xhr.lengthComputable && this.onLoadProgress) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          this.onLoadProgress(percent);
        }
      },
      (error) => {
        console.error('[OrgansViewer] Error loading human_heart_3d.glb:', error);
      }
    );
  }

  /**
   * Tự động căn chỉnh các điểm ghim nằm sát trên bề mặt ngoài của lưới 3D
   * Tránh việc điểm ghim bị chìm sâu vào khối cơ tim dẫn đến bị hiểu nhầm là occluded
   */
  _snapHotspotsToSurface() {
    if (!this.heartMesh) return;
    const ray = new THREE.Raycaster();
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3(0, 0, -1);

    this.hotspotGroups.forEach((h) => {
      // Bắn tia từ phía trước z = 0.35 tới điểm XY của hotspot
      origin.set(h.data.position.x, h.data.position.y, 0.35);
      ray.set(origin, dir);
      const hits = ray.intersectObject(this.heartMesh, false);
      if (hits.length > 0) {
        const localHit = this.modelGroup.worldToLocal(hits[0].point.clone());
        // Đẩy nhẹ ra ngoài bề mặt 4mm để marker hiển thị nổi bật, không bị Z-fighting
        localHit.z += 0.004;
        h.group.position.copy(localHit);
      }
    });
  }

  /**
   * Tạo các điểm ghim 3D Hotspots & Floating 2D HUD Badges
   */
  _createHotspotMarkers() {
    this.hotspotGroups = [];
    this.hotspotRaycastMeshes = [];
    if (this.floatingLabelsContainer) {
      this.floatingLabelsContainer.innerHTML = '';
    }

    this.currentStructures.forEach((item) => {
      const group = new THREE.Group();
      group.position.set(item.position.x, item.position.y, item.position.z);
      group.userData = { id: item.id, data: item };

      // Inner Core Sphere
      const coreGeo = new THREE.SphereGeometry(0.0055, 16, 16);
      const coreMat = new THREE.MeshStandardMaterial({
        color: item.color,
        emissive: item.color,
        emissiveIntensity: 0.9,
        roughness: 0.2,
        metalness: 0.3,
        transparent: true,
        opacity: 1.0,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.userData = { id: item.id, data: item, type: 'core' };
      group.add(coreMesh);

      // Outer Pulsing Ring
      const ringGeo = new THREE.RingGeometry(0.008, 0.0105, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: item.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.userData = { isRing: true };
      group.add(ringMesh);

      // Hit-box hình cầu vô hình (Direct raycast hit)
      const hitGeo = new THREE.SphereGeometry(0.015, 8, 8);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.userData = { id: item.id, data: item, group: group, core: coreMesh };
      group.add(hitMesh);

      this.modelGroup.add(group);

      // HTML HUD Floating Badge (Layer 2)
      let badgeEl = null;
      if (this.floatingLabelsContainer) {
        badgeEl = document.createElement('div');
        badgeEl.className = 'organ-hud-badge';
        badgeEl.id = `organ-hud-badge-${item.id}`;
        badgeEl.style.setProperty('--badge-color', item.color);
        badgeEl.innerHTML = `
          <span class="badge-num">${item.badge}</span>
          <span class="badge-text">${item.name}</span>
        `;

        // Direct badge click -> Select & Focus
        badgeEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!this.isActive) return;
          this.selectStructure(item.id);
          if (this.onRegionClick) {
            this.onRegionClick(item, { x: e.clientX, y: e.clientY });
          }
        });

        // Hover badge -> Sync 3D & Sidebar
        badgeEl.addEventListener('mouseenter', () => {
          if (!this.isActive) return;
          this.setHoveredStructure(item);
          if (this.onHover) {
            this.onHover(item, { x: badgeEl.offsetLeft, y: badgeEl.offsetTop });
          }
        });

        badgeEl.addEventListener('mouseleave', () => {
          if (!this.isActive) return;
          this.setHoveredStructure(null);
          if (this.onHover) {
            this.onHover(null, null);
          }
        });

        this.floatingLabelsContainer.appendChild(badgeEl);
      }

      this.hotspotGroups.push({
        id: item.id,
        group,
        core: coreMesh,
        ring: ringMesh,
        hitMesh,
        data: item,
        badgeEl,
        isOccluded: false,
      });

      this.hotspotRaycastMeshes.push(hitMesh);
    });
  }

  _createBackgroundParticles() {
    const count = 280;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 6;
      positions[i + 1] = (Math.random() - 0.5) * 6;
      positions[i + 2] = (Math.random() - 0.5) * 6;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xef4444,
      size: 0.008,
      transparent: true,
      opacity: 0.35,
    });

    this.bgParticles = new THREE.Points(geometry, material);
    this.scene.add(this.bgParticles);
  }

  // ---------- Raycasting & Picking (Layer 1 + Layer 3) ----------

  /**
   * Xác định cấu trúc theo thứ tự ưu tiên:
   * 1. Direct Hotspot Hit (chạm trúng hitbox của điểm ghim)
   * 2. Safe Surface Proximity (chạm bề mặt heartMesh trong khoảng hoverRadius)
   *    -> Lưu ý: Tuyệt đối LOẠI TRỪ cấu trúc internal (Hệ thống van tim)
   */
  _pickStructure(e) {
    if (!this.isLoaded) return null;

    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / this.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / this.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 1. Direct Hotspot Hit
    if (this.hotspotRaycastMeshes.length > 0) {
      const hotspotHits = this.raycaster.intersectObjects(this.hotspotRaycastMeshes, false);
      if (hotspotHits.length > 0) {
        return hotspotHits[0].object.userData.data;
      }
    }

    // 2. Safe Surface Proximity (Raycast vào heartMesh)
    if (this.heartMesh) {
      const surfaceHits = this.raycaster.intersectObject(this.heartMesh, false);
      if (surfaceHits.length > 0) {
        const hitPoint = surfaceHits[0].point; // World coordinate space

        let nearestCandidate = null;
        let minDistance = Infinity;

        for (const h of this.hotspotGroups) {
          const item = h.data;

          // LOẠI TRỪ cấu trúc bên trong (internal): Van tim không nhận diện từ surface!
          if (item.anatomy?.type === 'internal') continue;

          // Lấy tọa độ thế giới của hotspot
          h.group.getWorldPosition(this._tempVecA);
          const dist = hitPoint.distanceTo(this._tempVecA);

          const maxRadius = item.hoverRadius || 0.04;
          if (dist <= maxRadius && dist < minDistance) {
            minDistance = dist;
            nearestCandidate = item;
          }
        }

        if (nearestCandidate) {
          return nearestCandidate;
        }
      }
    }

    return null;
  }

  _handleMouseMove(e) {
    if (!this.isActive) return;

    const structure = this._pickStructure(e);

    if (structure) {
      if (this.hoveredStructure?.id !== structure.id) {
        this.setHoveredStructure(structure);
        this.container.style.cursor = 'pointer';

        if (this.onHover) {
          this.onHover(structure, { x: e.clientX, y: e.clientY });
        }
      } else if (this.onHover) {
        // Cập nhật vị trí thẻ bám theo trỏ chuột
        this.onHover(structure, { x: e.clientX, y: e.clientY });
      }
    } else {
      if (this.hoveredStructure) {
        this.setHoveredStructure(null);
        this.container.style.cursor = 'default';

        if (this.onHover) {
          this.onHover(null, null);
        }
      }
    }
  }

  _handleMouseUp(e) {
    if (!this.isActive) return;
    if (!this._downPos) return;
    const dist = Math.hypot(e.clientX - this._downPos.x, e.clientY - this._downPos.y);
    this._downPos = null;
    if (dist > 5) return; // Người dùng xoay OrbitControls -> bỏ qua click

    const structure = this._pickStructure(e);

    if (structure) {
      this.selectStructure(structure.id);
      if (this.onRegionClick) {
        this.onRegionClick(structure, { x: e.clientX, y: e.clientY });
      }
    } else {
      // Click vào không gian trống
      if (this.onRegionClick) {
        this.onRegionClick(null, null);
      }
    }
  }

  // ---------- Visual State & Selection (Layer 4) ----------

  setHoveredStructure(structure) {
    this.hoveredStructure = structure;
    this._updateMarkerVisuals();
  }

  setHoveredFromSidebar(structureId) {
    if (structureId) {
      const structure = getHeartStructure(structureId);
      this.setHoveredStructure(structure);
    } else {
      this.setHoveredStructure(null);
    }
  }

  selectStructure(structureId) {
    this.selectedStructureId = structureId;
    this._updateMarkerVisuals();

    if (!structureId) return;

    const structure = getHeartStructure(structureId);
    if (!structure) return;

    // Smooth camera focus tới cấu trúc được chọn
    this.focusStructure(structureId);
  }

  clearHighlight() {
    this.selectedStructureId = null;
    this.hoveredStructure = null;
    this._updateMarkerVisuals();
  }

  _updateMarkerVisuals() {
    const selId = this.selectedStructureId;
    const hovId = this.hoveredStructure?.id;

    this.hotspotGroups.forEach((h) => {
      const isSelected = h.id === selId;
      const isHovered = h.id === hovId;

      // Ưu tiên: selected > hovered > normal
      if (isSelected) {
        h.core.scale.set(1.5, 1.5, 1.5);
        h.core.material.emissiveIntensity = 2.0;
        h.ring.scale.set(1.4, 1.4, 1.0);
        if (h.badgeEl) {
          h.badgeEl.classList.add('is-selected');
          h.badgeEl.classList.remove('is-hovered');
        }
      } else if (isHovered) {
        h.core.scale.set(1.35, 1.35, 1.35);
        h.core.material.emissiveIntensity = 1.6;
        h.ring.scale.set(1.25, 1.25, 1.0);
        if (h.badgeEl) {
          h.badgeEl.classList.add('is-hovered');
          h.badgeEl.classList.remove('is-selected');
        }
      } else {
        // Normal state: Nếu có một item đang selected thì các item khác giảm nhẹ emphasis
        const dimFactor = selId ? 0.75 : 1.0;
        h.core.scale.set(dimFactor, dimFactor, dimFactor);
        h.core.material.emissiveIntensity = 0.85 * dimFactor;
        h.ring.scale.set(dimFactor, dimFactor, 1.0);
        if (h.badgeEl) {
          h.badgeEl.classList.remove('is-selected', 'is-hovered');
        }
      }
    });
  }

  // ---------- Occlusion Testing & Floating HUD Badges ----------

  _updateHUDLabels() {
    if (!this.floatingLabelsContainer) return;

    if (!this.labelsVisible || !this.isActive) {
      this.floatingLabelsContainer.style.display = 'none';
      return;
    }

    this.floatingLabelsContainer.style.display = 'block';
    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.hotspotGroups.forEach((h) => {
      if (!h.badgeEl) return;

      // 1. Tọa độ thế giới của hotspot
      h.group.getWorldPosition(this._tempVecA);

      // 2. Occlusion test bằng raycast từ Camera -> Hotspot
      if (this.heartMesh) {
        this._tempDir.subVectors(this._tempVecA, this.camera.position);
        const distToHotspot = this._tempDir.length();
        this._tempDir.normalize();

        this.occlusionRaycaster.set(this.camera.position, this._tempDir);
        const hits = this.occlusionRaycaster.intersectObject(this.heartMesh, false);

        // Nếu tia va chạm mesh trước khi đến hotspot (dung sai 0.015), hotspot đang bị che lấp
        if (hits.length > 0 && hits[0].distance < distToHotspot - 0.015) {
          h.isOccluded = true;
          h.core.material.opacity = 0.25;
          h.ring.material.opacity = 0.15;
          h.badgeEl.classList.add('is-occluded');
        } else {
          h.isOccluded = false;
          h.core.material.opacity = 1.0;
          h.ring.material.opacity = 0.75;
          h.badgeEl.classList.remove('is-occluded');
        }
      }

      // 3. Chiếu tọa độ 3D sang màn hình (NDC -> Screen pixels)
      this._tempVecScreen.copy(this._tempVecA).project(this.camera);

      // Nếu nằm sau camera Frustum (z > 1.0 hoặc z < -1.0) -> Ẩn badge
      if (this._tempVecScreen.z > 1.0 || this._tempVecScreen.z < -1.0) {
        h.badgeEl.style.display = 'none';
      } else {
        const x = ((this._tempVecScreen.x + 1) / 2) * rect.width;
        const y = ((-this._tempVecScreen.y + 1) / 2) * rect.height;

        h.badgeEl.style.display = 'flex';
        h.badgeEl.style.left = `${Math.round(x)}px`;
        h.badgeEl.style.top = `${Math.round(y)}px`;
      }
    });
  }

  // ---------- Camera Focus & Presets (Easing Tween) ----------

  focusStructure(structureId) {
    const structure = getHeartStructure(structureId);
    if (!structure) return;

    const targetPos = new THREE.Vector3(
      structure.cameraPosition?.x ?? 0.05,
      structure.cameraPosition?.y ?? 0.1,
      structure.cameraPosition?.z ?? 0.36
    );

    const targetLookAt = new THREE.Vector3(
      structure.cameraTarget?.x ?? 0,
      structure.cameraTarget?.y ?? 0,
      structure.cameraTarget?.z ?? 0
    );

    this._smoothMoveCamera(targetPos, targetLookAt);
  }

  resetView() {
    const defPreset = this.currentPresets?.default || {
      position: { x: 0, y: 0.03, z: 0.46 },
      target: { x: 0, y: 0, z: 0 },
    };

    const targetPos = new THREE.Vector3(defPreset.position.x, defPreset.position.y, defPreset.position.z);
    const targetLookAt = new THREE.Vector3(defPreset.target.x, defPreset.target.y, defPreset.target.z);

    this.clearHighlight();
    this._smoothMoveCamera(targetPos, targetLookAt);
  }

  setCameraPreset(preset) {
    const p = this.currentPresets?.[preset];
    if (p) {
      const targetPos = new THREE.Vector3(p.position.x, p.position.y, p.position.z);
      const targetLookAt = new THREE.Vector3(p.target.x, p.target.y, p.target.z);
      this._smoothMoveCamera(targetPos, targetLookAt);
    }
  }

  /**
   * Di chuyển camera mượt mà không dùng thư viện ngoài (Tween với easeInOutCubic)
   */
  _smoothMoveCamera(targetPos, targetTarget, durationMs = 700) {
    if (this._cameraTweenId) {
      cancelAnimationFrame(this._cameraTweenId);
      this._cameraTweenId = null;
    }

    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = performance.now();

    const animateStep = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1.0);

      // Easing function: easeInOutCubic
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.controls.target.lerpVectors(startTarget, targetTarget, ease);
      this.controls.update();

      if (progress < 1.0) {
        this._cameraTweenId = requestAnimationFrame(animateStep);
      } else {
        this._cameraTweenId = null;
      }
    };

    this._cameraTweenId = requestAnimationFrame(animateStep);
  }

  toggleLabels() {
    this.labelsVisible = !this.labelsVisible;
    if (this.floatingLabelsContainer) {
      this.floatingLabelsContainer.style.display = this.labelsVisible ? 'block' : 'none';
    }
    return this.labelsVisible;
  }

  // ---------- Animation Loop ----------

  _animate() {
    this._animFrameId = requestAnimationFrame(this._animate.bind(this));
    if (!this.isActive) return;

    const time = performance.now() * 0.001;

    try {
      // 1. Nhịp đập tim mô phỏng (Cardiac Cycle 75 BPM: 0.8s)
      if (this.heartbeatEnabled && this.modelGroup) {
        const tCycle = (time % 0.8) / 0.8;
        let beatScale = 1.0;
        if (tCycle < 0.12) {
          beatScale = 1.0 + Math.sin((tCycle / 0.12) * Math.PI) * 0.025;
        } else if (tCycle >= 0.18 && tCycle < 0.35) {
          beatScale = 1.0 + Math.sin(((tCycle - 0.18) / 0.17) * Math.PI) * 0.04;
        }
        this.modelGroup.scale.set(beatScale, beatScale * 1.02, beatScale);
      }

      // 2. Diễn hoạt vòng Hotspots nhấp nháy hướng về camera
      this.hotspotGroups.forEach((h) => {
        h.ring.quaternion.copy(this.camera.quaternion);
        const pulse = 0.7 + Math.sin(time * 3.5 + h.data.number) * 0.3;
        h.ring.material.opacity = (h.isOccluded ? 0.2 : 0.75) * pulse;
      });

      // 3. Cập nhật nhãn HUD Badges & Occlusion
      this._updateHUDLabels();

      // 4. Background particles drift
      if (this.bgParticles) {
        this.bgParticles.rotation.y += 0.0003;
        this.bgParticles.rotation.x += 0.00015;
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      console.error('[OrgansViewer] Render error:', err);
    }
  }

  _handleResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  // ---------- Lifecycle Management ----------

  activate() {
    this.isActive = true;
    if (this.renderer?.domElement) {
      this.renderer.domElement.style.display = 'block';
    }
    if (this.floatingLabelsContainer) {
      this.floatingLabelsContainer.style.display = this.labelsVisible ? 'block' : 'none';
    }
    this._handleResize();
  }

  deactivate() {
    this.isActive = false;
    if (this.renderer?.domElement) {
      this.renderer.domElement.style.display = 'none';
      this.container.style.cursor = 'default';
    }
    if (this.floatingLabelsContainer) {
      this.floatingLabelsContainer.style.display = 'none';
    }
    if (this._cameraTweenId) {
      cancelAnimationFrame(this._cameraTweenId);
      this._cameraTweenId = null;
    }
    this.hoveredStructure = null;
    this.clearHighlight();
    if (this.onHover) {
      this.onHover(null, null);
    }
  }

  show() {
    this.activate();
  }

  hide() {
    this.deactivate();
  }

  destroy() {
    this.deactivate();
    cancelAnimationFrame(this._animFrameId);
    this.container.removeEventListener('mousemove', this._onMouseMove);
    this.container.removeEventListener('mousedown', this._onMouseDown);
    this.container.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('resize', this._onResize);

    if (this.floatingLabelsContainer) {
      this.floatingLabelsContainer.innerHTML = '';
      if (this.floatingLabelsContainer.parentNode === this.container) {
        this.container.removeChild(this.floatingLabelsContainer);
      }
    }

    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }

    if (this.renderer) {
      if (this.renderer.domElement?.parentNode === this.container) {
        this.container.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
    }
  }
}
