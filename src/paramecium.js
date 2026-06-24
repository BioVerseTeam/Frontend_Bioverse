import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { parameciumRegions, identifyParameciumRegion } from './parameciumData.js';

/**
 * ParameciumViewer — mô hình 3D Trùng giày tương tác.
 *
 * Hai trạng thái xem, chuyển đổi bằng animation mượt (_reveal 0→1):
 *   - reveal = 0: thấy NGUYÊN CON — lớp vỏ (màng + tế bào chất) đục, bào quan ẩn.
 *   - reveal = 1: BỔ ĐÔI — vỏ trong suốt như thủy tinh, các bào quan hiện rõ,
 *                 lần lượt "nảy" ra và có thể click để xem thông tin.
 *
 * Mỗi bào quan là một mesh riêng (origin tại tâm của nó) nên có thể scale-pop
 * quanh tâm mà không bị trôi vị trí.
 */
export class ParameciumViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container #${containerId} not found.`);
      return;
    }

    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.modelGroup = null;
    this.shellMesh = null; // lớp vỏ ngoài (Màng & tế bào chất)
    this.shellExtras = []; // mesh phụ thuộc lớp ngoài: lông bơi (cilia), v.v.
    this.organelles = []; // [{ mesh, regionId, baseMaterial, baseColor }]
    this.regionToMeshes = {}; // regionId -> [mesh,...]
    this.highlightedRegion = null;
    this.hoveredRegion = null;
    this.isLoaded = false;

    // Trạng thái bổ đôi: _reveal là giá trị hiện tại (mượt), _revealTarget là đích
    this._reveal = 0;
    this._revealTarget = 0;

    this.onRegionClick = null; // callback(region, screenPos)
    this.onHover = null; // callback(region | null, screenPos)
    this.onRevealChange = null; // callback(isInside: boolean)
    this.onLoadProgress = null;
    this.onReady = null;

    this.initScene();
    this.initLights();
    this.initCameraControls();
    this.loadModel();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this._downPos = null;

    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseDown = (e) => { this._downPos = { x: e.clientX, y: e.clientY }; };
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onResize = this._handleResize.bind(this);

    this.container.addEventListener('mousemove', this._onMouseMove);
    this.container.addEventListener('mousedown', this._onMouseDown);
    this.container.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('resize', this._onResize);

    this._clock = { last: 0 };
    this._animate();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04080c);
    this.scene.fog = new THREE.FogExp2(0x04080c, 0.012);

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.01, 1000);
    this.camera.position.set(0, 0.6, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);

    this._createBackgroundParticles();
  }

  // Hạt lơ lửng gợi cảm giác môi trường nước (ao tù) nơi trùng giày sống
  _createBackgroundParticles() {
    const geo = new THREE.BufferGeometry();
    const count = 260;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x3fd6c4,
      size: 0.035,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.bgParticles = new THREE.Points(geo, mat);
    this.scene.add(this.bgParticles);
  }

  initLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.1);
    keyLight.position.set(3, 5, 4);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x9fe9ff, 0.55);
    fillLight.position.set(-4, 2, -2);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x7af0d0, 0.6);
    rimLight.position.set(0, -3, -5);
    this.scene.add(rimLight);
  }

  initCameraControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxDistance = 14;
    this.controls.minDistance = 1.5;
    this.controls.enablePan = false;
    this.controls.target.set(0, 0, 0);
  }

  loadModel() {
    const loader = new GLTFLoader();
    loader.load(
      '/trung_giay.glb',
      (gltf) => {
        const model = gltf.scene;
        this.modelGroup = new THREE.Group();
        this.modelGroup.add(model);
        this.scene.add(this.modelGroup);

        model.traverse((obj) => {
          if (!obj.isMesh) return;

          const region =
            identifyParameciumRegion(obj.name) ||
            identifyParameciumRegion(obj.parent?.name);

          obj.castShadow = false;
          obj.receiveShadow = false;

          // Mesh KHÔNG khớp bào quan nào → coi là phần thuộc lớp ngoài.
          // Đặc biệt nhận diện LÔNG BƠI (cilia/hair/fur/lông) để gán vật liệu riêng.
          // Nhờ vậy khi bạn export GLB có lông từ Blender, nó hiển thị được ngay.
          if (!region) {
            this._setupShellExtra(obj);
            return;
          }

          obj.userData.regionId = region.id;

          if (region.isShell) {
            // Lớp vỏ ngoài: vật liệu trong mờ kiểu màng tế bào
            const shellMat = new THREE.MeshPhysicalMaterial({
              color: new THREE.Color(region.color),
              roughness: 0.25,
              metalness: 0.0,
              transmission: 0.0,
              transparent: true,
              opacity: 1.0,
              clearcoat: 0.6,
              clearcoatRoughness: 0.4,
              side: THREE.FrontSide,
            });
            obj.material = shellMat;
            obj.renderOrder = 10; // vẽ sau cùng để nhìn xuyên vào trong
            this.shellMesh = obj;
            this.shellBaseColor = new THREE.Color(region.color);
          } else {
            // Bào quan: giữ màu phân biệt, có thể phát sáng khi chọn
            const baseColor = new THREE.Color(region.color);
            const mat = new THREE.MeshStandardMaterial({
              color: baseColor.clone(),
              roughness: 0.45,
              metalness: 0.05,
              emissive: baseColor.clone(),
              emissiveIntensity: 0.12,
              transparent: true,
              opacity: 0,
            });
            obj.material = mat;
            obj.renderOrder = 1;
            obj.userData.popDelay = 0; // gán sau khi gom xong
            this.organelles.push({ mesh: obj, regionId: region.id, baseMaterial: mat, baseColor });
            (this.regionToMeshes[region.id] ??= []).push(obj);
          }
        });

        // Gán độ trễ "nảy" tuần tự cho từng bào quan để hiện ra mượt mà
        this.organelles.forEach((o, i) => {
          o.mesh.userData.popDelay = (i / Math.max(this.organelles.length, 1)) * 0.45;
        });

        this._fitAndCenter();
        this._buildCilia(); // sinh lông bơi dày đặc phủ đều bề mặt thân
        this._applyReveal(0); // bắt đầu ở trạng thái nguyên con
        this.isLoaded = true;
        if (this.onReady) this.onReady();

        console.log(
          `[ParameciumViewer] Loaded. shell=${!!this.shellMesh}, ${this.organelles.length} organelles, ${Object.keys(this.regionToMeshes).length} regions.`
        );
      },
      (progress) => {
        const pct = progress.total ? Math.round((progress.loaded / progress.total) * 100) : null;
        if (this.onLoadProgress && pct !== null) this.onLoadProgress(pct);
      },
      (error) => {
        console.error('[ParameciumViewer] Error loading GLB:', error);
      }
    );
  }

  _fitAndCenter() {
    const box = new THREE.Box3().setFromObject(this.modelGroup);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const targetSize = 3.4;
    const scale = targetSize / maxDim;

    this.modelGroup.scale.setScalar(scale);
    this.modelGroup.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    this.modelGroup.updateMatrixWorld(true);
  }

  // Gán vật liệu cho mesh thuộc lớp ngoài (lông bơi hoặc phần phụ của thân).
  // Lông bơi giữ nguyên vẻ "tơ bạc" như trong Blender; mờ dần khi bổ đôi.
  _setupShellExtra(obj) {
    const name = (obj.name || '').toLowerCase();
    const parentName = (obj.parent?.name || '').toLowerCase();
    const isCilia = /cilia|hair|fur|lông|long|strand|tóc/.test(name + ' ' + parentName);

    // Lông từ Blender bake thưa (chỉ ~8000 sợi cha, không children) và là ribbon dẹt
    // nên gần như vô hình trên mặt thân. Ta ẩn nó đi và sinh lông procedural dày đặc.
    if (isCilia) {
      obj.visible = false;
      this.importedCiliaMesh = obj;
      return;
    }

    let mat;
    {
      // Phần phụ khác của thân: dùng tông giống lớp vỏ
      mat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0x5ad1c4),
        roughness: 0.3,
        metalness: 0.0,
        transparent: true,
        opacity: 1.0,
        clearcoat: 0.5,
        side: THREE.FrontSide,
      });
      obj.renderOrder = 9;
    }
    obj.material = mat;
    this.shellExtras.push({ mesh: obj, baseMaterial: mat, baseOpacity: 1.0 });
  }

  /**
   * Sinh lông bơi (cilia) procedural: rải hàng chục nghìn sợi mảnh phủ đều
   * bề mặt thân, mỗi sợi mọc dọc pháp tuyến. Dùng InstancedMesh (1 draw call)
   * + shader gợn sóng để lông "rung rinh" như đang bơi trong nước.
   */
  _buildCilia() {
    if (!this.shellMesh) return;
    const geom = this.shellMesh.geometry;
    geom.computeBoundingBox();
    const size = new THREE.Vector3();
    geom.boundingBox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;

    const len = maxDim * 0.085; // chiều dài sợi lông (theo tỉ lệ thân)
    const rad = len * 0.045; // độ mảnh
    const COUNT = 24000; // mật độ — đủ dày để trông như lớp lông phủ kín

    // Sợi lông: nón mảnh, gốc ở gốc tọa độ (y=0), ngọn ở y=len
    const strand = new THREE.ConeGeometry(rad, len, 4, 1, false);
    strand.translate(0, len / 2, 0);

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xeef5f1),
      roughness: 0.65,
      metalness: 0.0,
      emissive: new THREE.Color(0x2fd6c4),
      emissiveIntensity: 0.06,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });

    // Chèn dao động gợn sóng vào vertex shader (ngọn lông lắc, gốc đứng yên)
    const amp = len * 0.55;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      this._ciliaUniforms = shader.uniforms;
      shader.vertexShader =
        'uniform float uTime;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float yN = clamp(position.y / ${len.toFixed(5)}, 0.0, 1.0);
           vec3 iPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
           float ph = iPos.x * 9.0 + iPos.z * 9.0 + iPos.y * 5.0;
           float bend = yN * yN;
           transformed.x += sin(uTime * 2.0 + ph) * bend * ${amp.toFixed(5)};
           transformed.z += cos(uTime * 1.6 + ph) * bend * ${(amp * 0.7).toFixed(5)};`
        );
    };

    const inst = new THREE.InstancedMesh(strand, mat, COUNT);
    inst.frustumCulled = false;

    const sampler = new MeshSurfaceSampler(this.shellMesh).build();
    const pos = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const scl = new THREE.Vector3();
    const m = new THREE.Matrix4();
    // Sinh số giả ngẫu nhiên ổn định (không dùng Math.random để mỗi sợi nhất quán)
    let seed = 1234.5678;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };

    for (let i = 0; i < COUNT; i++) {
      sampler.sample(pos, nrm);
      nrm.normalize();
      q.setFromUnitVectors(up, nrm);
      // hơi nghiêng ngẫu nhiên + dài ngắn khác nhau cho tự nhiên
      const tiltQ = new THREE.Quaternion().setFromEuler(
        new THREE.Euler((rand() - 0.5) * 0.5, (rand() - 0.5) * 0.5, (rand() - 0.5) * 0.5)
      );
      q.multiply(tiltQ);
      const s = 0.7 + rand() * 0.6;
      scl.set(1, s, 1);
      m.compose(pos, q, scl);
      inst.setMatrixAt(i, m);
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.renderOrder = 8;

    this.cilia = inst;
    this.ciliaMat = mat;
    this.ciliaBaseOpacity = 0.95;
    // Thêm vào CHÍNH mesh thân để lông kế thừa biến đổi + tọa độ khớp sampler
    this.shellMesh.add(inst);
  }

  // ---------- Bổ đôi / Reveal ----------

  /** Đặt trạng thái xem bên trong. inside=true → bổ đôi, false → nguyên con. */
  setInside(inside) {
    this._revealTarget = inside ? 1 : 0;
    if (!inside) {
      // Khi đóng lại thì bỏ chọn để không kẹt highlight
      this.clearHighlight();
    }
    if (this.onRevealChange) this.onRevealChange(inside);
  }

  toggleInside() {
    this.setInside(this._revealTarget < 0.5);
  }

  get isInside() {
    return this._revealTarget >= 0.5;
  }

  // Áp giá trị reveal (0..1) lên vỏ và toàn bộ bào quan
  _applyReveal(r) {
    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const easeOutBack = (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    // Vỏ ngoài: mờ dần từ đặc (1.0) sang gần như thủy tinh (0.10)
    const k = easeInOut(r);
    if (this.shellMesh) {
      const op = 1.0 - 0.9 * k;
      this.shellMesh.material.opacity = op;
      this.shellMesh.material.depthWrite = r < 0.04;
      this.shellMesh.visible = op > 0.02;
    }

    // Lông bơi procedural mờ dần hẳn để nhìn rõ nội bào khi bổ đôi
    if (this.cilia && this.ciliaMat) {
      const op = this.ciliaBaseOpacity * (1.0 - k);
      this.ciliaMat.opacity = op;
      this.cilia.visible = op > 0.02;
    }

    // Phần phụ lớp ngoài khác (nếu có) mờ dần theo vỏ
    this.shellExtras.forEach(({ mesh, baseMaterial, baseOpacity }) => {
      const op = baseOpacity * (1.0 - k);
      baseMaterial.opacity = op;
      baseMaterial.depthWrite = r < 0.04;
      mesh.visible = op > 0.02;
    });

    // Bào quan: mỗi cái có độ trễ riêng → nảy ra tuần tự
    const span = 0.55; // bề rộng cửa sổ animation của một bào quan
    this.organelles.forEach(({ mesh, baseMaterial }) => {
      const delay = mesh.userData.popDelay || 0;
      let t = (r - delay) / span;
      t = Math.max(0, Math.min(1, t));

      baseMaterial.opacity = t;
      mesh.visible = t > 0.001;
      // scale nảy quanh tâm chính nó (origin mesh nằm ở tâm bào quan)
      const s = t <= 0 ? 0.0001 : easeOutBack(t);
      mesh.scale.setScalar(s);
    });
  }

  // ---------- Picking ----------

  _pick(event) {
    if (!this.isLoaded || this.organelles.length === 0) return null;

    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    // Chỉ cho bắt các bào quan đang hiện (đã bổ đôi)
    const meshes = this.organelles.filter((o) => o.mesh.visible && o.baseMaterial.opacity > 0.4).map((o) => o.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;

    const mesh = hits[0].object;
    const regionId = mesh.userData.regionId;
    const region = parameciumRegions.find((r) => r.id === regionId) || null;
    return {
      region,
      mesh,
      point: hits[0].point,
      screen: { x: event.clientX - rect.left, y: event.clientY - rect.top },
    };
  }

  _handleMouseMove(event) {
    if (!this.isInside) {
      if (this.hoveredRegion !== null) {
        this.hoveredRegion = null;
        this.renderer.domElement.style.cursor = 'grab';
        if (this.onHover) this.onHover(null, null);
      }
      return;
    }
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
    // Phân biệt click với kéo xoay
    if (this._downPos) {
      const dx = event.clientX - this._downPos.x;
      const dy = event.clientY - this._downPos.y;
      this._downPos = null;
      if (dx * dx + dy * dy > 36) return; // kéo > 6px → bỏ qua
    }

    // Chưa bổ đôi: click vào con trùng để "xem bên trong"
    if (!this.isInside) {
      this.setInside(true);
      return;
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

    this.organelles.forEach(({ mesh, regionId: rid, baseMaterial, baseColor }) => {
      const isSelected = rid === regionId;
      if (isSelected) {
        baseMaterial.emissiveIntensity = 0.9;
        baseMaterial.color.copy(baseColor).lerp(new THREE.Color(0xffffff), 0.35);
      } else {
        baseMaterial.emissiveIntensity = 0.1;
        baseMaterial.color.copy(baseColor);
        // làm mờ bào quan khác để cái được chọn nổi bật (giữ chút opacity để vẫn thấy)
        baseMaterial.userData = baseMaterial.userData || {};
      }
      baseMaterial.needsUpdate = true;
    });

    // Làm mờ nhẹ vỏ thêm khi đang soi một bào quan
    if (this.shellMesh && hasSelection) {
      this.shellMesh.material.opacity = Math.min(this.shellMesh.material.opacity, 0.07);
    }
  }

  clearHighlight() {
    this.highlightedRegion = null;
    this.organelles.forEach(({ baseMaterial, baseColor }) => {
      baseMaterial.emissiveIntensity = 0.12;
      baseMaterial.color.copy(baseColor);
      baseMaterial.needsUpdate = true;
    });
  }

  /** Đưa tâm xoay về bào quan được chọn (camera nhìn vào nó). */
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
    let frames = 36;
    const step = () => {
      if (frames <= 0) return;
      this.controls.target.lerp(targetLookAt, 0.16);
      this.controls.update();
      frames--;
      requestAnimationFrame(step);
    };
    step();
  }

  // ---------- Loop / resize ----------

  _animate(now) {
    this._animFrameId = requestAnimationFrame(this._animate.bind(this));
    try {
      const t = (now || 0) * 0.001;

      // Lông bơi gợn sóng theo thời gian
      if (this._ciliaUniforms) this._ciliaUniforms.uTime.value = t;

      // Tiến giá trị reveal về đích một cách mượt mà
      if (Math.abs(this._reveal - this._revealTarget) > 0.0005) {
        this._reveal += (this._revealTarget - this._reveal) * 0.08;
        if (Math.abs(this._reveal - this._revealTarget) <= 0.0005) this._reveal = this._revealTarget;
        this._applyReveal(this._reveal);
      }

      // Nhịp đập của bào quan đang chọn
      if (this.highlightedRegion) {
        const pulse = 0.7 + Math.sin(t * 3) * 0.3;
        (this.regionToMeshes[this.highlightedRegion] || []).forEach((m) => {
          m.material.emissiveIntensity = pulse;
        });
      }

      // Trùng giày khẽ xoay như đang trôi trong nước (chỉ khi xem nguyên con)
      if (this.modelGroup && this._revealTarget < 0.5) {
        this.modelGroup.rotation.y += 0.0025;
      }

      if (this.bgParticles) {
        this.bgParticles.rotation.y += 0.0003;
        this.bgParticles.rotation.x += 0.00012;
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      console.error('[ParameciumViewer] Animate error:', err);
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
      front: new THREE.Vector3(0, 0.3, 5),
      side: new THREE.Vector3(5, 0.3, 0),
      top: new THREE.Vector3(0, 5, 0.8),
    };
    const pos = presets[preset];
    if (pos) this._animateCamera(pos, new THREE.Vector3(0, 0, 0));
  }

  _animateCamera(targetPos, targetLookAt) {
    let frames = 44;
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

  show() { this.renderer.domElement.style.display = 'block'; }
  hide() { this.renderer.domElement.style.display = 'none'; }

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
