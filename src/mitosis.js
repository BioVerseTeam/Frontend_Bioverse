import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ============================================================
//  MitosisSimulation — GLB-driven (mô hình dựng từ Blender)
//  Giữ nguyên interface cũ: update(progress) / render() /
//  getLabelPositions() / setCameraPreset() / destroy()
//  + onPartClick(info, screenPos): click-to-learn theo custom props
// ============================================================

// Mốc khớp timeline 5 kỳ (progress 0..1) -> frame keyframe của clip.
// Frames trong Blender: Interphase=1, Prophase=40, Metaphase=80,
// Anaphase=120, Telophase=160, Cytokinesis=200, End=230.
// Kỳ giữa [0.4,0.6] "giữ" ở frame 80; kỳ sau [0.6,0.8] mới tách chromatid.
const PROG_BREAKS = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];
const FRAME_BREAKS = [1, 40, 80, 80, 120, 230];
const END_FRAME = 230;

// Tên các bộ phận trong GLB cần làm trong suốt (vỏ bao)
const SHELL_OPACITY = {
  Cell_Membrane: 0.16,
  Cytoplasm: 0.08,
  Nuclear_Envelope: 0.22,
  Nucleus: 0.20,
};

export class MitosisSimulation {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container element with id ${containerId} not found.`);
      return;
    }

    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.progress = 0.0;
    this.ready = false;
    this.onPartClick = null;
    this.parts = {};

    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._tmpV = new THREE.Vector3();

    this.initScene();
    this.initLights();
    this.initBackground();
    this.initCameraControls();
    this.loadModel();

    this._onResize = this.onWindowResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this.initPointer();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06050b);
    this.scene.fog = new THREE.FogExp2(0x06050b, 0.045);

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 4, 11);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);
  }

  initLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(5, 8, 7);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xcfe0ff, 0.5);
    fill.position.set(-6, -2, -5);
    this.scene.add(fill);

    this.coreLight = new THREE.PointLight(0xfff0e0, 0.6, 12);
    this.coreLight.position.set(0, 0, 0);
    this.scene.add(this.coreLight);
  }

  // Nền hạt lấp lánh rất nhẹ (giảm để bớt cảm giác "ảo")
  initBackground() {
    this.bgParticles = new THREE.Group();
    const geo = new THREE.SphereGeometry(0.035, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x6b7bb0, transparent: true, opacity: 0.14,
      depthWrite: false,
    });
    for (let i = 0; i < 40; i++) {
      const r = 6 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      m.scale.setScalar(0.5 + Math.random());
      this.bgParticles.add(m);
    }
    this.scene.add(this.bgParticles);
  }

  initCameraControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 22;
    this.controls.minDistance = 4;
  }

  loadModel() {
    const loader = new GLTFLoader();
    loader.load(
      'mitosis_animation.glb',
      (gltf) => {
        this.model = gltf.scene;
        this.scene.add(this.model);

        this.tweakMaterials();
        this.collectParts();

        // Animation: Blender xuất MỖI object thành 1 clip riêng -> play TẤT CẢ.
        // Mỗi clip có độ dài khác nhau (theo keyframe cuối của object đó); mặc định
        // LoopRepeat sẽ LẶP clip ngắn khi scrub quá cuối -> ví dụ chromatin (kết thúc
        // ở frame 50) hiện lại ở kỳ giữa. Đồng bộ duration tất cả clip về max để khi
        // sample quá keyframe cuối thì GIỮ nguyên giá trị cuối (clamp), không lặp.
        this.mixer = new THREE.AnimationMixer(this.model);
        this.actions = [];
        const clips = gltf.animations || [];
        this.duration = clips.reduce((m, c) => Math.max(m, c.duration), 0) || 1;
        clips.forEach((clip) => {
          clip.duration = this.duration;
          const a = this.mixer.clipAction(clip);
          a.play();
          this.actions.push(a);
        });

        this.ready = true;
        this.update(this.progress);
      },
      undefined,
      (err) => console.error('[Bio3D] Lỗi tải mitosis_animation.glb:', err)
    );
  }

  // Ép vỏ bao trong suốt + bật transparent cho an toàn khi xuất glTF
  tweakMaterials() {
    this.model.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      o.material = o.material.clone(); // tránh chia sẻ material giữa các object
      const name = o.name;
      let shellOpacity = null;
      for (const key in SHELL_OPACITY) {
        if (name.startsWith(key)) { shellOpacity = SHELL_OPACITY[key]; break; }
      }
      const isThin = name.startsWith('Spindle_Fiber') ||
                     name.startsWith('Cleavage_Furrow') ||
                     name.includes('Aster');
      if (shellOpacity !== null) {
        o.material.transparent = true;
        o.material.opacity = shellOpacity;
        o.material.depthWrite = false;
        o.material.side = THREE.DoubleSide;
        o.material.roughness = 0.7;
        o.material.metalness = 0.0;
        o.userData._shell = true;
      } else if (isThin) {
        o.material.transparent = true;
        o.material.opacity = 0.5;
        o.material.depthWrite = false;
        o.material.roughness = 0.9;
        o.material.metalness = 0.0;
        o.userData._thin = true;
      } else {
        // NST, tâm động, trung tử: vật liệu mờ (matte) đặc
        o.material.roughness = 0.85;
        o.material.metalness = 0.0;
      }
    });
  }

  collectParts() {
    const g = (n) => this.model.getObjectByName(n);
    this.parts = {
      membrane: g('Cell_Membrane_Cycle'),
      nucleus: g('Nucleus_Cycle'),
      daughterN: g('Nucleus_Daughter_01'),
      cenL: g('Centrosome_Left_Cycle'),
      cenR: g('Centrosome_Right_Cycle'),
      chromo: g('Chromosome_Cycle_01_Parent') || g('Chromatid_Left_Cycle_01'),
    };
  }

  // progress (0..1) -> thời gian clip (s) theo các mốc kỳ
  progressToTime(p) {
    p = Math.max(0, Math.min(1, p));
    let frame = FRAME_BREAKS[FRAME_BREAKS.length - 1];
    for (let i = 0; i < PROG_BREAKS.length - 1; i++) {
      if (p <= PROG_BREAKS[i + 1]) {
        const t = (p - PROG_BREAKS[i]) / (PROG_BREAKS[i + 1] - PROG_BREAKS[i]);
        frame = FRAME_BREAKS[i] + t * (FRAME_BREAKS[i + 1] - FRAME_BREAKS[i]);
        break;
      }
    }
    return this.duration * (frame - 1) / (END_FRAME - 1);
  }

  update(progress) {
    this.progress = progress;
    if (!this.ready || !this.mixer) return;
    this.mixer.setTime(this.progressToTime(progress));
    this.scene.updateMatrixWorld(true);
  }

  _phaseFromProgress() {
    const p = this.progress;
    if (p < 0.2) return 0;
    if (p < 0.4) return 1;
    if (p < 0.6) return 2;
    if (p < 0.8) return 3;
    return 4;
  }

  getLabelPositions() {
    if (!this.ready) return [];
    const phase = this._phaseFromProgress();
    const P = this.parts;
    const world = (obj, fallback) => {
      if (obj) return obj.getWorldPosition(new THREE.Vector3());
      return fallback ? fallback.clone() : null;
    };

    const labels = [
      { id: 'label-membrane', name: 'Màng tế bào', pos: new THREE.Vector3(0, 2.9, 0), phases: [0, 1, 2, 3, 4] },
      { id: 'label-nucleus', name: 'Màng nhân',
        pos: phase === 4 ? world(P.daughterN, new THREE.Vector3(0, 1.4, 0)) : new THREE.Vector3(0, 1.4, 0),
        phases: [0, 1, 4] },
      { id: 'label-centrosome-l', name: 'Trung tử (Cực 1)', pos: world(P.cenL), phases: [1, 2, 3, 4] },
      { id: 'label-centrosome-r', name: 'Trung tử (Cực 2)', pos: world(P.cenR), phases: [1, 2, 3, 4] },
      { id: 'label-chromosome', name: 'Nhiễm sắc thể', pos: world(P.chromo), phases: [1, 2, 3] },
      { id: 'label-spindle', name: 'Tơ vô sắc', pos: null, phases: [1, 2, 3] },
    ];

    // Nhãn tơ vô sắc: trung điểm cực <-> NST
    const a = world(P.cenL), b = world(P.chromo);
    if (a && b) labels[5].pos = a.clone().lerp(b, 0.5);

    const result = [];
    labels.forEach((lbl) => {
      if (!lbl.pos) return;
      if (lbl.phases && !lbl.phases.includes(phase)) return;
      if (lbl.id === 'label-nucleus' && phase === 1 && this.progress >= 0.38) return;

      this._tmpV.copy(lbl.pos).project(this.camera);
      if (this._tmpV.z > 1) return;
      result.push({
        id: lbl.id,
        name: lbl.name,
        x: (this._tmpV.x * 0.5 + 0.5) * this.width,
        y: (this._tmpV.y * -0.5 + 0.5) * this.height,
      });
    });
    return result;
  }

  // ---- Click-to-learn ----
  initPointer() {
    const el = this.renderer.domElement;
    let downX = 0, downY = 0, moved = false;
    el.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; moved = false; });
    el.addEventListener('pointermove', (e) => {
      if (Math.abs(e.clientX - downX) > 5 || Math.abs(e.clientY - downY) > 5) moved = true;
    });
    el.addEventListener('pointerup', (e) => {
      if (moved) return;            // bỏ qua khi đang xoay camera
      this.handleClick(e);
    });
  }

  handleClick(e) {
    if (!this.ready || !this.onPartClick) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._mouse, this.camera);

    const hits = this._raycaster.intersectObject(this.model, true);
    // Ưu tiên bộ phận bên trong (không phải vỏ bao), nếu không có thì lấy vỏ
    let pickedInfo = null, shellInfo = null;
    for (const h of hits) {
      if (this._isInvisible(h.object)) continue;   // bỏ qua object scale≈0 (đang ẩn)
      const info = this._infoOf(h.object);
      if (!info) continue;
      if (this._isShell(h.object)) { if (!shellInfo) shellInfo = info; }
      else { pickedInfo = info; break; }
    }
    const info = pickedInfo || shellInfo;
    if (info) {
      this.onPartClick(info, { x: e.clientX, y: e.clientY });
    } else {
      this.onPartClick(null, null);
    }
  }

  _isShell(obj) {
    let o = obj;
    while (o) { if (o.userData && o.userData._shell) return true; o = o.parent; }
    return false;
  }

  // Object đang bị scale về ~0 (ẩn theo animation) thì coi như không click được
  _isInvisible(obj) {
    const s = obj.getWorldScale(new THREE.Vector3());
    return (s.x * s.y * s.z) < 1e-4;
  }

  _infoOf(obj) {
    let o = obj;
    while (o) {
      const u = o.userData || {};
      if (u.display_name) {
        return {
          display_name: u.display_name,
          description: u.description || '',
          function: u.function || '',
          stage: u.stage || '',
          quiz_tag: u.quiz_tag || '',
        };
      }
      o = o.parent;
    }
    return null;
  }

  setCameraPreset(preset) {
    if (preset === 'perspective') {
      this.animateCamera(new THREE.Vector3(0, 4, 11), new THREE.Vector3(0, 0, 0));
    } else if (preset === 'side') {
      this.animateCamera(new THREE.Vector3(11, 0, 0.001), new THREE.Vector3(0, 0, 0));
    } else if (preset === 'equator') {
      // Trục phân chia là trục dọc (Y) -> nhìn từ trên xuống để thấy chia đôi
      this.animateCamera(new THREE.Vector3(0.001, 11, 0.001), new THREE.Vector3(0, 0, 0));
    }
  }

  animateCamera(targetPos, targetLookAt) {
    let frames = 30;
    const step = () => {
      if (frames <= 0) return;
      this.camera.position.lerp(targetPos, 0.15);
      this.controls.target.lerp(targetLookAt, 0.15);
      this.controls.update();
      frames--;
      requestAnimationFrame(step);
    };
    step();
  }

  onWindowResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  render() {
    if (this.bgParticles) {
      this.bgParticles.rotation.y += 0.0008;
      this.bgParticles.rotation.x += 0.0004;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    if (this.renderer) {
      this.container.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
  }
}
