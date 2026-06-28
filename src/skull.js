import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { skullRegions, identifyRegionByMeshName } from './skullData.js';
import { MODEL_URLS } from './modelUrls.js';

/**
 * SkullViewer — hiển thị mô hình hộp sọ 3D đã tách sẵn từng xương.
 *
 * Khác với bản cũ (đoán vùng theo tọa độ), bản này nhận diện xương bằng
 * cách raycast trực tiếp vào mesh và đọc TÊN mesh → ánh xạ sang vùng giải phẫu.
 * Nhờ vậy việc click chính xác đến từng xương riêng lẻ.
 */
export class SkullViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container #${containerId} not found.`);
      return;
    }

    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.modelGroup = null;
    this.boneMeshes = []; // [{ mesh, regionId, baseMaterial, highlightMaterial }]
    this.regionToMeshes = {}; // regionId -> [mesh,...]
    this.highlightedRegion = null;
    this.hoveredRegion = null;
    this.isLoaded = false;

    this.onRegionClick = null; // callback(region, screenPos)
    this.onHover = null; // callback(region | null, screenPos)
    this.onLoadProgress = null; // callback(pct)

    this.initScene();
    this.initLights();
    this.initCameraControls();
    this.loadModel();

    // Raycasting
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this._downPos = null; // để phân biệt click vs kéo xoay

    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseDown = (e) => { this._downPos = { x: e.clientX, y: e.clientY }; };
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
    this.scene.background = new THREE.Color(0x06050b);
    this.scene.fog = new THREE.FogExp2(0x06050b, 0.015);

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.01, 1000);
    this.camera.position.set(0, 0.4, 4);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);

    this._createBackgroundParticles();
  }

  _createBackgroundParticles() {
    const geo = new THREE.BufferGeometry();
    const count = 200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x6a5acd,
      size: 0.03,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.bgParticles = new THREE.Points(geo, mat);
    this.scene.add(this.bgParticles);
  }

  initLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.1);
    keyLight.position.set(3, 5, 4);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xb0c4ff, 0.5);
    fillLight.position.set(-3, 2, -2);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xbf95ff, 0.6);
    rimLight.position.set(0, -3, -5);
    this.scene.add(rimLight);

    const bottomLight = new THREE.DirectionalLight(0x4a90d9, 0.3);
    bottomLight.position.set(0, -5, 2);
    this.scene.add(bottomLight);
  }

  initCameraControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 12;
    this.controls.minDistance = 1.2;
    this.controls.enablePan = false;
    this.controls.target.set(0, 0, 0);
  }

  loadModel() {
    const loader = new GLTFLoader();
    loader.load(
      MODEL_URLS.skull,
      (gltf) => {
        const model = gltf.scene;
        this.modelGroup = new THREE.Group();
        this.modelGroup.add(model);
        this.scene.add(this.modelGroup);

        // Thu thập tất cả mesh xương và gắn vùng giải phẫu theo tên
        model.traverse((obj) => {
          if (!obj.isMesh) return;

          // Tên vùng có thể nằm ở mesh hoặc node cha
          const region =
            identifyRegionByMeshName(obj.name) ||
            identifyRegionByMeshName(obj.parent?.name);

          // Chuẩn hóa vật liệu (một bản clone riêng cho mỗi mesh để highlight độc lập)
          const baseMaterial = this._makeBaseMaterial(obj.material, region);
          obj.material = baseMaterial;
          obj.castShadow = false;
          obj.receiveShadow = false;

          if (region) {
            obj.userData.regionId = region.id;
            this.boneMeshes.push({ mesh: obj, regionId: region.id, baseMaterial });
            (this.regionToMeshes[region.id] ??= []).push(obj);
          }
        });

        this._fitAndCenter();
        this.isLoaded = true;
        if (this.onReady) this.onReady();

        console.log(
          `[SkullViewer] Loaded. ${this.boneMeshes.length} bone meshes mapped across ${Object.keys(this.regionToMeshes).length} regions.`
        );
      },
      (progress) => {
        const pct = progress.total ? Math.round((progress.loaded / progress.total) * 100) : null;
        if (this.onLoadProgress && pct !== null) this.onLoadProgress(pct);
      },
      (error) => {
        console.error('[SkullViewer] Error loading GLB:', error);
      }
    );
  }

  _makeBaseMaterial(srcMaterial, region) {
    // Giữ tông xương ngà, hơi nhuốm màu vùng để dễ phân biệt
    const boneColor = new THREE.Color(0xeae2d0);
    const mat = new THREE.MeshStandardMaterial({
      color: boneColor,
      roughness: 0.72,
      metalness: 0.0,
      emissive: new THREE.Color(region ? region.color : 0x000000),
      emissiveIntensity: 0.0,
    });
    return mat;
  }

  _fitAndCenter() {
    // Tính bounding box toàn mô hình rồi căn giữa + scale vừa khung nhìn
    const box = new THREE.Box3().setFromObject(this.modelGroup);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const targetSize = 3.0;
    const scale = targetSize / maxDim;

    this.modelGroup.scale.setScalar(scale);
    // Sau khi scale, dịch tâm về gốc tọa độ
    this.modelGroup.position.set(
      -center.x * scale,
      -center.y * scale,
      -center.z * scale
    );

    this.modelGroup.updateMatrixWorld(true);
  }

  // ---------- Picking ----------

  _pick(event) {
    if (!this.isLoaded || this.boneMeshes.length === 0) return null;

    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.boneMeshes.map((b) => b.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;

    const mesh = hits[0].object;
    const regionId = mesh.userData.regionId;
    const region = skullRegions.find((r) => r.id === regionId) || null;
    return {
      region,
      mesh,
      point: hits[0].point,
      screen: { x: event.clientX - rect.left, y: event.clientY - rect.top },
    };
  }

  _handleMouseMove(event) {
    const result = this._pick(event);
    const region = result?.region || null;

    if (region !== this.hoveredRegion) {
      this.hoveredRegion = region;
      this.renderer.domElement.style.cursor = region ? 'pointer' : 'grab';
    }

    if (this.onHover) {
      const rect = this.container.getBoundingClientRect();
      this.onHover(region, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    }
  }

  _handleMouseUp(event) {
    // Bỏ qua nếu người dùng đang kéo để xoay (di chuyển > ngưỡng)
    if (this._downPos) {
      const dx = event.clientX - this._downPos.x;
      const dy = event.clientY - this._downPos.y;
      this._downPos = null;
      if (dx * dx + dy * dy > 36) return; // > 6px → coi là kéo
    }

    const result = this._pick(event);
    if (result && result.region) {
      this.highlightRegion(result.region.id);
      this.focusRegion(result.region.id);
      if (this.onRegionClick) this.onRegionClick(result.region, result.screen);
    } else {
      this.clearHighlight();
      if (this.onRegionClick) this.onRegionClick(null, null);
    }
  }

  // ---------- Highlight ----------

  highlightRegion(regionId) {
    this.highlightedRegion = regionId;
    const hasSelection = !!regionId;

    this.boneMeshes.forEach(({ mesh, regionId: rid, baseMaterial }) => {
      const isSelected = rid === regionId;
      if (isSelected) {
        baseMaterial.emissiveIntensity = 0.85;
        baseMaterial.color.set(0xffffff);
        baseMaterial.opacity = 1.0;
        baseMaterial.transparent = false;
      } else {
        // Làm mờ các xương khác để vùng được chọn nổi bật
        baseMaterial.emissiveIntensity = 0.0;
        baseMaterial.color.set(0xeae2d0);
        baseMaterial.transparent = hasSelection;
        baseMaterial.opacity = hasSelection ? 0.22 : 1.0;
      }
      baseMaterial.needsUpdate = true;
    });
  }

  clearHighlight() {
    this.highlightedRegion = null;
    this.boneMeshes.forEach(({ baseMaterial }) => {
      baseMaterial.emissiveIntensity = 0.0;
      baseMaterial.color.set(0xeae2d0);
      baseMaterial.transparent = false;
      baseMaterial.opacity = 1.0;
      baseMaterial.needsUpdate = true;
    });
  }

  /** Xoay camera để nhìn vào tâm của vùng xương được chọn. */
  focusRegion(regionId) {
    const meshes = this.regionToMeshes[regionId];
    if (!meshes || meshes.length === 0) return;
    const box = new THREE.Box3();
    meshes.forEach((m) => box.expandByObject(m));
    const center = new THREE.Vector3();
    box.getCenter(center);
    this._animateTarget(center);
  }

  _animateTarget(targetLookAt) {
    let frames = 30;
    const step = () => {
      if (frames <= 0) return;
      this.controls.target.lerp(targetLookAt, 0.15);
      this.controls.update();
      frames--;
      requestAnimationFrame(step);
    };
    step();
  }

  // ---------- Loop / resize ----------

  _animate() {
    this._animFrameId = requestAnimationFrame(this._animate.bind(this));
    try {
      // Hiệu ứng nhấp nháy nhẹ cho vùng đang chọn
      if (this.highlightedRegion) {
        const t = performance.now() * 0.003;
        const pulse = 0.7 + Math.sin(t) * 0.25;
        const meshes = this.regionToMeshes[this.highlightedRegion] || [];
        meshes.forEach((m) => {
          m.material.emissiveIntensity = pulse;
        });
      }

      if (this.bgParticles) {
        this.bgParticles.rotation.y += 0.0003;
        this.bgParticles.rotation.x += 0.00015;
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      console.error('[SkullViewer] Animate error:', err);
    }
  }

  _handleResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  // ---------- Camera presets ----------

  setCameraPreset(preset) {
    const presets = {
      front: new THREE.Vector3(0, 0.2, 4.2),
      side: new THREE.Vector3(4.2, 0.2, 0),
      back: new THREE.Vector3(0, 0.2, -4.2),
      top: new THREE.Vector3(0, 4.5, 0.6),
    };
    const pos = presets[preset];
    if (pos) this._animateCamera(pos, new THREE.Vector3(0, 0, 0));
  }

  _animateCamera(targetPos, targetLookAt) {
    let frames = 40;
    const step = () => {
      if (frames <= 0) return;
      this.camera.position.lerp(targetPos, 0.12);
      this.controls.target.lerp(targetLookAt, 0.12);
      this.controls.update();
      frames--;
      requestAnimationFrame(step);
    };
    step();
  }

  show() {
    this.renderer.domElement.style.display = 'block';
  }

  hide() {
    this.renderer.domElement.style.display = 'none';
  }

  destroy() {
    cancelAnimationFrame(this._animFrameId);
    this.container.removeEventListener('mousemove', this._onMouseMove);
    this.container.removeEventListener('mousedown', this._onMouseDown);
    this.container.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('resize', this._onResize);
    if (this.renderer) {
      this.container.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
  }
}
