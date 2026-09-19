import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { describePartPlacement, looksScientific, looksVietnamese, preferVietnamese, sideFromKey, vietnamesePartName } from './partNames.js';
import { identifyRegionByMeshName } from '../skull/skullData.js';
import { identifyParameciumRegion } from '../paramecium/parameciumData.js';

const PART_COLORS = [
  '#48bb78', '#db3237', '#2e5ea2', '#ed8936', '#9f7aea',
  '#38b2ac', '#d69e2e', '#e53e3e', '#3182ce', '#805ad5',
  '#319795', '#dd6b20', '#c53030', '#2b6cb0', '#6b46c1'
];

const JUNK_NAME = /^(scene|root|node|mesh|object|group|armature|camera|light|helper|empty|gltf_|sketchfab|rootnode)/i;

/**
 * Generic GLB viewer: orbit the whole specimen and pick each named mesh/part.
 */
export class ModelViewer {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.getElementById(container)
      : container;
    if (!this.container) {
      throw new Error('ModelViewer: canvas container not found');
    }

    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;

    this.parts = [];
    this.partById = new Map();
    this.highlightedPartId = null;
    this.hoveredPartId = null;
    this.isLoaded = false;
    this.isActive = true;
    this.isolateMode = false;
    this._maxAnisotropy = 1;
    this._screenVec = new THREE.Vector3();
    this._camTween = null;
    this._reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._keyLight = null;
    this._ground = null;
    this._outlineMats = [];
    this.exploded = false;
    this._explodeAmount = 0;
    this._explodeTarget = 0;
    this._explodeDistance = 1.1;
    this._cameraHome = null;
    this._targetHome = null;

    this.onPartClick = options.onPartClick || null;
    this.onHover = options.onHover || null;
    this.onLoadProgress = options.onLoadProgress || null;
    this.onReady = options.onReady || null;
    this.onError = options.onError || null;
    this.onPartsChange = options.onPartsChange || null;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this._downPos = null;

    this.initScene();
    this.initLights();
    this.initCameraControls();

    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseDown = (e) => {
      if (!this.isActive) return;
      this._downPos = { x: e.clientX, y: e.clientY };
    };
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onResize = this._handleResize.bind(this);

    this.container.addEventListener('pointermove', this._onMouseMove);
    this.container.addEventListener('pointerdown', this._onMouseDown);
    this.container.addEventListener('pointerup', this._onMouseUp);
    window.addEventListener('resize', this._onResize);

    this._animate();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfdfbf7);

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.01, 200);
    this.camera.position.set(0, 0.35, 4.2);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setClearColor(0xfdfbf7, 1);
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.48;
    pmrem.dispose();
    this._maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this._createOutlineMaterials();

    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.cursor = 'grab';
  }

  _createOutlineMaterials() {
    this._outlineMats = [
      new THREE.MeshBasicMaterial({
        color: 0x2d2d2d,
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false
      }),
      new THREE.MeshBasicMaterial({
        color: 0x48bb78,
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false
      }),
      new THREE.MeshBasicMaterial({
        color: 0x2e5ea2,
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false
      })
    ];
    this._outlineMats.forEach((mat) => {
      mat.userData.sharedOutline = true;
    });
  }

  initLights() {
    this.scene.add(new THREE.HemisphereLight(0xfffaf3, 0xcfc6bb, 0.32));

    const key = new THREE.DirectionalLight(0xffffff, 1.12);
    key.position.set(3.2, 5.4, 4.1);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.00025;
    key.shadow.normalBias = 0.03;
    key.shadow.camera.near = 0.4;
    key.shadow.camera.far = 24;
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    this._keyLight = key;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xf3eee6, 0.22);
    fill.position.set(-3.8, 1.8, 2.2);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.42);
    rim.position.set(-0.4, 2.2, -5.2);
    this.scene.add(rim);

    const bounce = new THREE.DirectionalLight(0xe8f5e9, 0.12);
    bounce.position.set(0.2, -4.2, 1.4);
    this.scene.add(bounce);
  }

  initCameraControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxDistance = 14;
    this.controls.minDistance = 0.8;
    this.controls.target.set(0, 0, 0);
  }

  load(url, settings = {}) {
    if (!url) {
      this.onError?.(new Error('Mô hình chưa có file 3D.'));
      return;
    }

    this._disposeModel();
    this.isLoaded = false;

    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader.setDRACOLoader(draco);

    loader.load(
      url,
      (gltf) => {
        this._mountGltf(gltf, settings);
        draco.dispose();
      },
      (xhr) => {
        if (!xhr.lengthComputable || !this.onLoadProgress) return;
        this.onLoadProgress(Math.round((xhr.loaded / xhr.total) * 100));
      },
      (err) => {
        draco.dispose();
        console.error(err);
        this.onError?.(err);
      }
    );
  }

  _mountGltf(gltf, settings) {
    this.modelGroup = new THREE.Group();
    this.modelGroup.add(gltf.scene);
    this.scene.add(this.modelGroup);

    this._fitAndCenter(settings);
    this._buildParts(settings.annotations);
    this._applyDefaultPose(settings);
    this._storeCameraHome();

    this.isLoaded = true;
    this._handleResize();
    this.onPartsChange?.(this.getParts());
    this.onReady?.(this.getParts());
  }

  _fitAndCenter(settings) {
    const box = new THREE.Box3().setFromObject(this.modelGroup);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const extra = Number(settings.scale);
    const scale = (3.05 / maxDim) * (Number.isFinite(extra) && extra > 0 ? extra : 1);

    this.modelGroup.scale.setScalar(scale);
    this.modelGroup.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    this.modelGroup.updateMatrixWorld(true);

    this._explodeDistance = Math.max(0.7, maxDim * scale * 0.42);
    this._placeGround();
  }

  _placeGround() {
    if (this._ground) {
      this.scene.remove(this._ground);
      this._ground.geometry.dispose();
      this._ground.material.dispose();
      this._ground = null;
    }
    const box = new THREE.Box3().setFromObject(this.modelGroup);
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.z, 2.4) * 0.72;
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 64),
      new THREE.ShadowMaterial({ color: 0x2d2d2d, opacity: 0.18 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = box.min.y - 0.012;
    ground.receiveShadow = true;
    ground.raycast = () => {};
    this.scene.add(ground);
    this._ground = ground;

    if (this._keyLight) {
      const span = Math.max(size.x, size.y, size.z, 2) * 0.7;
      const cam = this._keyLight.shadow.camera;
      cam.left = -span;
      cam.right = span;
      cam.top = span;
      cam.bottom = -span;
      cam.updateProjectionMatrix();
    }
  }

  _applyDefaultPose(settings) {
    const rotation = parseVec3(settings.rotation);
    if (rotation) {
      const useDegrees = Math.max(Math.abs(rotation.x), Math.abs(rotation.y), Math.abs(rotation.z)) > 6.3;
      const toRad = (v) => (useDegrees ? THREE.MathUtils.degToRad(v) : v);
      this.modelGroup.rotation.set(toRad(rotation.x), toRad(rotation.y), toRad(rotation.z));
      this.modelGroup.updateMatrixWorld(true);
    }

    const cam = parseVec3(settings.cameraPosition);
    if (cam) {
      this.camera.position.set(cam.x, cam.y, cam.z);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }

  _buildParts(annotationsRaw) {
    this.parts = [];
    this.partById.clear();

    const buckets = new Map();
    this.modelGroup.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry || obj.userData?.isOutline) return;
      obj.material = cloneMaterials(obj.material, this._maxAnisotropy);
      obj.castShadow = true;
      obj.receiveShadow = true;
      const key = partKeyFor(obj);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(obj);
    });

    const notes = normalizeAnnotations(annotationsRaw);
    let index = 0;
    buckets.forEach((meshes, key) => {
      const note = matchAnnotation(key, meshes, notes);
      let id = slugify(note?.id || key) || `part-${index + 1}`;
      if (this.partById.has(id)) id = `${id}-${index + 1}`;
      const color = note?.color || PART_COLORS[index % PART_COLORS.length];
      const group = new THREE.Group();
      group.name = `part:${id}`;

      const centroid = new THREE.Vector3();
      meshes.forEach((mesh) => {
        const box = new THREE.Box3().setFromObject(mesh);
        centroid.add(box.getCenter(new THREE.Vector3()));
      });
      centroid.divideScalar(meshes.length);
      this.modelGroup.worldToLocal(centroid);
      group.position.copy(centroid);
      this.modelGroup.add(group);
      meshes.forEach((mesh) => {
        mesh.userData.partId = id;
        group.attach(mesh);
      });

      const origin = group.position.clone();
      const dir = origin.clone();
      if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
      dir.normalize();

      const labeled = labelPart(note, key, index + 1);
      const part = {
        id,
        name: labeled.name,
        latin: labeled.latin,
        description: preferVietnamese(note?.description, labeled.description),
        function: preferVietnamese(note?.function, labeled.function),
        location: preferVietnamese(note?.location, labeled.location) || describePartPlacement(origin),
        sourceName: key,
        color,
        meshes,
        group,
        origin,
        explodeDir: dir,
        visible: true,
        outlines: []
      };
      meshes.forEach((mesh) => this._attachOutlines(part, mesh));
      this.parts.push(part);
      this.partById.set(id, part);
      index += 1;
    });
  }

  getParts() {
    return this.parts.map((part) => ({
      id: part.id,
      name: part.name,
      latin: part.latin,
      description: part.description,
      function: part.function,
      location: part.location,
      color: part.color,
      meshCount: part.meshes.length,
      visible: part.visible,
      sourceName: part.sourceName
    }));
  }

  getPartScreenPosition(id) {
    const part = this.partById.get(id);
    if (!part || !this.width || !this.height) return null;
    const box = new THREE.Box3().setFromObject(part.group);
    box.getCenter(this._screenVec);
    this._screenVec.project(this.camera);
    return {
      x: (this._screenVec.x * 0.5 + 0.5) * this.width,
      y: (-this._screenVec.y * 0.5 + 0.5) * this.height,
      visible: this._screenVec.z > -1 && this._screenVec.z < 1
    };
  }

  getPart(id) {
    const part = this.partById.get(id);
    if (!part) return null;
    return this.getParts().find((item) => item.id === id) || null;
  }

  selectPart(id, { focus = true } = {}) {
    const changed = id !== this.highlightedPartId;
    this.highlightedPartId = id || null;
    this._applyHighlight();
    if (id && changed) this._pulsePart(id);
    if (id && focus) this.focusPart(id);
  }

  setPartVisible(id, visible) {
    const part = this.partById.get(id);
    if (!part) return;
    part.visible = visible;
    part.group.visible = visible;
    if (!visible && this.highlightedPartId === id) {
      this.highlightedPartId = null;
    }
    this._applyHighlight();
  }

  setIsolated(isolated) {
    this.isolateMode = Boolean(isolated);
    this._applyHighlight();
  }

  setExploded(exploded) {
    this.exploded = Boolean(exploded);
    this._explodeTarget = this.exploded ? 1 : 0;
  }

  focusPart(id) {
    const part = this.partById.get(id);
    if (!part) return;
    const box = new THREE.Box3().setFromObject(part.group);
    const center = box.getCenter(new THREE.Vector3());
    this._animateTarget(center);
  }

  resetView() {
    this.highlightedPartId = null;
    this.hoveredPartId = null;
    this.parts.forEach((part) => {
      part.visible = true;
      part.group.visible = true;
      gsap.killTweensOf(part.group.scale);
      part.group.scale.set(1, 1, 1);
    });
    this.setExploded(false);
    this._applyHighlight();
    if (this._cameraHome && this._targetHome) {
      this._animateCamera(this._cameraHome.clone(), this._targetHome.clone());
    }
  }

  setCameraPreset(preset) {
    const presets = {
      front: new THREE.Vector3(0, 0.25, 4.3),
      side: new THREE.Vector3(4.3, 0.25, 0),
      back: new THREE.Vector3(0, 0.25, -4.3),
      top: new THREE.Vector3(0, 4.6, 0.45)
    };
    const pos = presets[preset];
    if (pos) this._animateCamera(pos, new THREE.Vector3(0, 0, 0));
  }

  _storeCameraHome() {
    this._cameraHome = this.camera.position.clone();
    this._targetHome = this.controls.target.clone();
  }

  _pick(event) {
    if (!this.isLoaded) return null;
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = this.parts.flatMap((part) => (part.visible ? part.meshes : []));
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;

    const mesh = hits[0].object;
    const part = this.partById.get(mesh.userData.partId);
    if (!part) return null;
    return {
      part: this.getPart(part.id),
      mesh,
      screen: { x: event.clientX - rect.left, y: event.clientY - rect.top }
    };
  }

  _handleMouseMove(event) {
    if (!this.isActive) return;
    const result = this._pick(event);
    const partId = result?.part?.id || null;
    if (partId !== this.hoveredPartId) {
      this.hoveredPartId = partId;
      this.renderer.domElement.style.cursor = partId ? 'pointer' : 'grab';
      this._applyHighlight();
    }
    this.onHover?.(result?.part || null, result?.screen || null);
  }

  _handleMouseUp(event) {
    if (!this.isActive) return;
    if (this._downPos) {
      const dx = event.clientX - this._downPos.x;
      const dy = event.clientY - this._downPos.y;
      this._downPos = null;
      if (dx * dx + dy * dy > 36) return;
    }
    const result = this._pick(event);
    if (result?.part) {
      this.selectPart(result.part.id);
      this.onPartClick?.(result.part, result.screen);
    } else {
      this.selectPart(null, { focus: false });
      this.onPartClick?.(null, null);
    }
  }

  _applyHighlight() {
    const selected = this.highlightedPartId;
    this.parts.forEach((part) => {
      const isSelected = part.id === selected;
      const isHovered = part.id === this.hoveredPartId && !isSelected;
      const ghost = Boolean(selected) && !isSelected;
      const ghostOpacity = this.isolateMode ? 0.07 : 0.18;

      part.outlines?.forEach((line) => {
        const mode = line.userData.mode;
        line.visible = (mode === 'select' && isSelected) || (mode === 'hover' && isHovered);
      });

      part.meshes.forEach((mesh) => {
        mesh.renderOrder = isSelected ? 4 : 0;
        mesh.castShadow = !ghost;
        eachMaterial(mesh.material, (mat) => {
          restoreMaterialLook(mat);
          if (mat.emissive) {
            if (isSelected) {
              mat.emissive.set(part.color || '#48bb78');
              mat.emissiveIntensity = 0.34;
            } else if (isHovered) {
              mat.emissive.setHex(0x2e5ea2);
              mat.emissiveIntensity = 0.18;
            }
          }
          const target = ghost ? ghostOpacity : (mat.userData.origOpacity ?? 1);
          mat.transparent = ghost || Boolean(mat.userData.origTransparent);
          mat.depthWrite = ghost ? false : Boolean(mat.userData.origDepthWrite ?? true);
          if (this._reduceMotion) {
            gsap.killTweensOf(mat);
            mat.opacity = target;
          } else {
            gsap.to(mat, {
              opacity: target,
              duration: 0.26,
              ease: 'power2.out',
              overwrite: 'auto'
            });
          }
          mat.needsUpdate = true;
        });
      });
    });
  }

  _attachOutlines(part, mesh) {
    const [ink, accent, hover] = this._outlineMats;
    const layers = [
      attachOutline(mesh, ink, 1.06, 'select'),
      attachOutline(mesh, accent, 1.032, 'select'),
      attachOutline(mesh, hover, 1.028, 'hover')
    ];
    part.outlines.push(...layers);
  }

  _pulsePart(id) {
    const part = this.partById.get(id);
    if (!part || this._reduceMotion) return;
    gsap.fromTo(part.group.scale, { x: 1.045, y: 1.045, z: 1.045 }, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.42,
      ease: 'back.out(2.1)',
      overwrite: true
    });
  }

  _applyExplode(amount) {
    this.parts.forEach((part) => {
      const offset = part.explodeDir.clone().multiplyScalar(this._explodeDistance * amount);
      part.group.position.copy(part.origin).add(offset);
    });
  }

  _animateTarget(targetLookAt) {
    this._killCamTween();
    this._camTween = gsap.to(this.controls.target, {
      x: targetLookAt.x,
      y: targetLookAt.y,
      z: targetLookAt.z,
      duration: 0.45,
      ease: 'power3.out',
      overwrite: 'auto',
      onUpdate: () => this.controls.update()
    });
  }

  _animateCamera(targetPos, targetLookAt) {
    this._killCamTween();
    const tl = gsap.timeline({ defaults: { duration: 0.55, ease: 'power3.out', overwrite: 'auto' } });
    tl.to(this.camera.position, { x: targetPos.x, y: targetPos.y, z: targetPos.z }, 0);
    tl.to(this.controls.target, {
      x: targetLookAt.x,
      y: targetLookAt.y,
      z: targetLookAt.z,
      onUpdate: () => this.controls.update()
    }, 0);
    this._camTween = tl;
  }

  _killCamTween() {
    this._camTween?.kill();
    this._camTween = null;
  }

  _animate() {
    this._animFrameId = requestAnimationFrame(() => this._animate());
    if (!this.isActive) return;
    if (Math.abs(this._explodeAmount - this._explodeTarget) > 0.001) {
      this._explodeAmount += (this._explodeTarget - this._explodeAmount) * 0.12;
      this._applyExplode(this._explodeAmount);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  _handleResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    if (!this.width || !this.height) return;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  _disposeModel() {
    if (this._ground) {
      this.scene.remove(this._ground);
      this._ground.geometry.dispose();
      this._ground.material.dispose();
      this._ground = null;
    }
    if (!this.modelGroup) return;
    this.parts.forEach((part) => {
      gsap.killTweensOf(part.group?.scale);
      part.meshes?.forEach((mesh) => {
        eachMaterial(mesh.material, (mat) => gsap.killTweensOf(mat));
      });
    });
    this.scene.remove(this.modelGroup);
    this.modelGroup.traverse((obj) => {
      if (obj.geometry && !obj.userData?.isOutline) obj.geometry.dispose();
      eachMaterial(obj.material, (mat) => {
        if (mat.userData?.sharedOutline) return;
        mat.dispose?.();
      });
    });
    this.modelGroup = null;
    this.parts = [];
    this.partById.clear();
    this.highlightedPartId = null;
    this.hoveredPartId = null;
  }

  destroy() {
    this._killCamTween();
    cancelAnimationFrame(this._animFrameId);
    this.container.removeEventListener('pointermove', this._onMouseMove);
    this.container.removeEventListener('pointerdown', this._onMouseDown);
    this.container.removeEventListener('pointerup', this._onMouseUp);
    window.removeEventListener('resize', this._onResize);
    this._disposeModel();
    this.controls?.dispose();
    this._outlineMats.forEach((mat) => mat.dispose());
    this._outlineMats = [];
    if (this.renderer) {
      this.container.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
  }
}

function partKeyFor(mesh) {
  const own = cleanName(mesh.name);
  if (own && !JUNK_NAME.test(own)) return own;
  let node = mesh.parent;
  while (node) {
    const name = cleanName(node.name);
    if (name && !JUNK_NAME.test(name)) return name;
    node = node.parent;
  }
  return own || `mesh-${mesh.id}`;
}

function cleanName(value) {
  return String(value || '').trim();
}

function labelPart(note, key, index) {
  const known = knownAnatomy(key);
  let name = (note?.name && looksVietnamese(note.name))
    ? note.name
    : (known?.name || vietnamesePartName(note?.name || key, index));
  const side = sideFromKey(key);
  if (side && !name.toLowerCase().includes(side.toLowerCase())) {
    name = `${name} ${side}`.trim();
  }
  const latinCandidate = note?.nameEn || known?.latin || '';
  const latin = looksScientific(latinCandidate) ? latinCandidate : '';
  return {
    name,
    latin,
    description: known?.description || '',
    function: known?.function || '',
    location: known?.location || ''
  };
}

function knownAnatomy(key) {
  const skull = identifyRegionByMeshName(key);
  if (skull) return skull;
  const token = String(key || '').toLowerCase();
  if (/paramecium|macronucleus|micronucleus|vacuole|pellicle/.test(token)) {
    return identifyParameciumRegion(key);
  }
  return null;
}

function cloneMaterials(material, anisotropy = 1) {
  if (!material) return material;
  if (Array.isArray(material)) return material.map((mat) => cloneOneMaterial(mat, anisotropy));
  return cloneOneMaterial(material, anisotropy);
}

function cloneOneMaterial(material, anisotropy) {
  const cloned = material.clone();
  cloned.userData.origEmissive = cloned.emissive ? cloned.emissive.clone() : null;
  cloned.userData.origEmissiveIntensity = cloned.emissiveIntensity ?? 0;
  cloned.userData.origOpacity = cloned.opacity ?? 1;
  cloned.userData.origTransparent = cloned.transparent ?? false;
  cloned.userData.origDepthWrite = cloned.depthWrite ?? true;
  if (cloned.metalness >= 0.92 && !cloned.metalnessMap) {
    cloned.metalness = 0.06;
  }
  if (cloned.normalMap && cloned.normalScale) {
    cloned.normalScale.multiplyScalar(1.18);
  }
  if (cloned.aoMapIntensity != null) cloned.aoMapIntensity = Math.max(cloned.aoMapIntensity, 1);
  sharpenMaps(cloned, anisotropy);
  return cloned;
}

function sharpenMaps(mat, anisotropy) {
  ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'bumpMap'].forEach((key) => {
    const tex = mat[key];
    if (!tex) return;
    tex.anisotropy = Math.max(tex.anisotropy || 1, anisotropy || 1);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
  });
  if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
}

function restoreMaterialLook(mat) {
  if (mat.emissive && mat.userData.origEmissive) {
    mat.emissive.copy(mat.userData.origEmissive);
  }
  if (mat.emissiveIntensity != null) {
    mat.emissiveIntensity = mat.userData.origEmissiveIntensity ?? 0;
  }
  mat.transparent = Boolean(mat.userData.origTransparent);
  mat.depthWrite = Boolean(mat.userData.origDepthWrite ?? true);
}

function attachOutline(mesh, material, inflate, mode) {
  const outline = new THREE.Mesh(mesh.geometry, material);
  outline.scale.setScalar(inflate);
  outline.visible = false;
  outline.renderOrder = 2;
  outline.frustumCulled = false;
  outline.userData.isOutline = true;
  outline.userData.mode = mode;
  outline.raycast = () => {};
  mesh.add(outline);
  return outline;
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function parseJson(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseVec3(value) {
  const data = parseJson(value) ?? value;
  if (!data) return null;
  if (Array.isArray(data) && data.length >= 3) {
    return { x: Number(data[0]) || 0, y: Number(data[1]) || 0, z: Number(data[2]) || 0 };
  }
  if (typeof data === 'object') {
    const x = Number(data.x);
    const y = Number(data.y);
    const z = Number(data.z);
    if ([x, y, z].every(Number.isFinite)) return { x, y, z };
  }
  return null;
}

function normalizeAnnotations(raw) {
  const data = parseJson(raw);
  if (!data) return [];
  if (Array.isArray(data)) return data.map(normalizeAnnotation);
  if (typeof data === 'object') {
    return Object.entries(data).map(([key, value]) => {
      if (value && typeof value === 'object') {
        return normalizeAnnotation({ id: key, meshNames: [key], ...value });
      }
      return normalizeAnnotation({ id: key, name: String(value), meshNames: [key] });
    });
  }
  return [];
}

function normalizeAnnotation(item = {}) {
  const meshNames = item.meshNames || item.meshes || item.targets || [];
  return {
    id: item.id || item.mesh || item.meshName || item.name,
    name: item.name || item.title || item.label || item.id,
    nameEn: item.nameEn || item.latin || item.scientificName || '',
    description: item.description || item.desc || item.note || '',
    function: item.function || item.role || '',
    location: item.location || item.position || '',
    color: item.color || null,
    meshNames: Array.isArray(meshNames) ? meshNames : [meshNames].filter(Boolean)
  };
}

function matchAnnotation(key, meshes, notes) {
  if (!notes.length) return null;
  const hay = [key, ...meshes.map((mesh) => mesh.name)]
    .filter(Boolean)
    .map((value) => value.toLowerCase());
  return notes.find((note) => {
    const needles = [note.id, note.name, ...(note.meshNames || [])]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    return needles.some((needle) => hay.some((item) => item === needle || item.includes(needle) || needle.includes(item)));
  }) || null;
}

function eachMaterial(material, fn) {
  if (!material) return;
  if (Array.isArray(material)) material.forEach(fn);
  else fn(material);
}

export function resolveModelUrl(url) {
  if (!url) return '';
  const raw = String(url).trim();
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) return raw;
  return `/api/models/${raw.split('/').map(encodeURIComponent).join('/')}`;
}

export function parseJsonField(value) {
  return parseJson(value);
}
