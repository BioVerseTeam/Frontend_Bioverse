/**
 * Three.js scene for viewing and authoring molecular keyframes.
 * Viewer: orbit + interpolated frames.
 * Editor: place / drag / bond / delete on a lab-notebook grid.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import gsap from 'gsap';
import { atomColor, atomRadius, atomName, bondStyle } from './atomData.js';
import { vec3 } from './chemx.js';
import { prefersReducedMotion } from './uiMotion.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 14);
const SPHERE_CACHE = new Map();

function sphereGeo(radius) {
  const key = radius.toFixed(2);
  if (!SPHERE_CACHE.has(key)) {
    SPHERE_CACHE.set(key, new THREE.SphereGeometry(radius, 28, 20));
  }
  return SPHERE_CACHE.get(key);
}

export class MoleculeScene {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
      ? document.getElementById(container)
      : container;
    if (!this.container) throw new Error('MoleculeScene: missing container');

    this.interactive = Boolean(options.interactive);
    this.editMode = options.editMode || 'select';
    this.selectedId = null;
    this.bondStartId = null;

    this.onPlaceAtom = options.onPlaceAtom || null;
    this.onSelectAtom = options.onSelectAtom || null;
    this.onMoveAtom = options.onMoveAtom || null;
    this.onDeleteAtom = options.onDeleteAtom || null;
    this.onAddBond = options.onAddBond || null;
    this.onBreakBond = options.onBreakBond || null;
    this.onClearSelection = options.onClearSelection || null;

    this.atomMeshes = new Map();
    this.bondMeshes = [];
    this._bondFp = '';
    this._atoms = {};
    this._bonds = [];
    this._dragging = null;
    this._down = null;
    this._reduceMotion = prefersReducedMotion();

    this._init();
  }

  _init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || 600;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfdfbf7);

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.05, 80);
    this.camera.position.set(6.2, 4.4, 8.4);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.cursor = 'grab';

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(width, height);
    this.labelRenderer.domElement.className = 'rx-labels';
    this.container.appendChild(this.labelRenderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2.2;
    this.controls.maxDistance = 22;
    this.controls.target.set(0, 0.2, 0);

    const hemi = new THREE.HemisphereLight(0xfff8f0, 0xc9c2b8, 0.95);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(6, 10, 4);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x9f7aea, 0.22);
    fill.position.set(-6, 3, -4);
    this.scene.add(fill);

    this.moleculeGroup = new THREE.Group();
    this.scene.add(this.moleculeGroup);

    const grid = new THREE.GridHelper(16, 16, 0xd4c4f0, 0xe5e0d8);
    grid.position.y = -0.02;
    const gridMats = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMats.forEach((mat) => {
      mat.transparent = true;
      mat.opacity = 0.45;
      mat.depthWrite = false;
    });
    this.scene.add(grid);

    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.userData.isFloor = true;
    this.scene.add(this.floor);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hit = new THREE.Vector3();
    this.dragPlane = new THREE.Plane(Y_AXIS, 0);

    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerUp = this._handlePointerUp.bind(this);
    this._onResize = this._handleResize.bind(this);

    this.renderer.domElement.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('resize', this._onResize);

    this.labelRenderer.domElement.hidden = true;
    this._hintTween = null;
    this._raf = 0;
    this._loop();
  }

  setLabelsVisible(on) {
    if (this.labelRenderer?.domElement) {
      this.labelRenderer.domElement.hidden = !on;
    }
  }

  firstAtomId() {
    return this.atomMeshes.keys().next().value || null;
  }

  clearAtomHint() {
    if (this._hintTween) {
      this._hintTween.kill();
      this._hintTween = null;
    }
    this.atomMeshes.forEach((entry) => {
      gsap.set(entry.mesh.scale, { x: 1, y: 1, z: 1 });
      entry.labelEl.classList.remove('is-hint');
    });
  }

  pulseAtomHint(id) {
    this.clearAtomHint();
    const entry = (id && this.atomMeshes.get(id))
      || this.atomMeshes.values().next().value;
    if (!entry) return;
    entry.labelEl.classList.add('is-hint');
    if (this._reduceMotion) return;
    this._hintTween = gsap.to(entry.mesh.scale, {
      x: 1.2,
      y: 1.2,
      z: 1.2,
      duration: 0.55,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      overwrite: true,
    });
  }

  setInteractive(on) {
    this.interactive = Boolean(on);
    if (!on) {
      this.selectedId = null;
      this.bondStartId = null;
      this._refreshHighlights();
    }
  }

  setEditMode(mode) {
    this.editMode = mode;
    this.bondStartId = null;
    this.renderer.domElement.style.cursor = mode === 'addAtom' || mode === 'addBond' || mode === 'breakBond'
      ? 'crosshair'
      : 'grab';
    this._bondFp = '';
    this._syncBonds();
    this._refreshHighlights();
  }

  setSelected(id) {
    this.selectedId = id;
    this._refreshHighlights();
  }

  setBondStart(id) {
    this.bondStartId = id;
    this._refreshHighlights();
  }

  setFrame(atoms, bonds) {
    this._atoms = atoms || {};
    this._bonds = bonds || [];
    this._syncAtoms();
    this._syncBonds();
    this._refreshHighlights();
  }

  animateAtomsTo(atoms) {
    this.clearAtomHint();
    Object.entries(atoms || {}).forEach(([id, atom]) => {
      const entry = this.atomMeshes.get(id);
      const pos = atom?.position;
      if (!entry || !pos) return;
      this._atoms[id] = { ...(this._atoms[id] || atom), position: { ...pos } };
      if (this._reduceMotion) {
        entry.mesh.position.set(pos.x, pos.y, pos.z);
        this._layoutBonds();
        return;
      }
      gsap.to(entry.mesh.position, {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        duration: 0.55,
        ease: 'power2.out',
        overwrite: true,
        onUpdate: () => {
          if (this._atoms[id]) {
            this._atoms[id].position = {
              x: entry.mesh.position.x,
              y: entry.mesh.position.y,
              z: entry.mesh.position.z,
            };
          }
          this._layoutBonds();
        },
      });
    });
  }

  _syncAtoms() {
    const seen = new Set();
    Object.entries(this._atoms).forEach(([id, atom]) => {
      seen.add(id);
      const pos = vec3(atom.position);
      const radius = atomRadius(atom.symbol);
      let entry = this.atomMeshes.get(id);
      if (!entry) {
        const mesh = new THREE.Mesh(
          sphereGeo(radius),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(atom.color || atomColor(atom.symbol)),
            roughness: 0.38,
            metalness: 0.08,
          })
        );
        mesh.userData = { isAtom: true, atomId: id };
        mesh.position.set(pos.x, pos.y, pos.z);

        const labelEl = document.createElement('div');
        labelEl.className = 'rx-atom-label';
        labelEl.innerHTML = `<strong>${atom.symbol}</strong>`;
        labelEl.title = atomName(atom.symbol);
        const label = new CSS2DObject(labelEl);
        label.position.set(0, radius + 0.22, 0);
        mesh.add(label);

        this.moleculeGroup.add(mesh);
        entry = { mesh, label, labelEl, symbol: atom.symbol, radius };
        this.atomMeshes.set(id, entry);

        if (!this._reduceMotion && this.interactive) {
          gsap.fromTo(mesh.scale, { x: 0.2, y: 0.2, z: 0.2 }, {
            x: 1, y: 1, z: 1,
            duration: 0.28,
            ease: 'back.out(1.6)',
            overwrite: true,
          });
        }
      } else {
        if (entry.symbol !== atom.symbol) {
          entry.mesh.geometry = sphereGeo(radius);
          entry.mesh.material.color.set(atom.color || atomColor(atom.symbol));
          entry.labelEl.innerHTML = `<strong>${atom.symbol}</strong>`;
          entry.labelEl.title = atomName(atom.symbol);
          entry.label.position.set(0, radius + 0.22, 0);
          entry.symbol = atom.symbol;
          entry.radius = radius;
        }
        if (!this._dragging || this._dragging.id !== id) {
          entry.mesh.position.set(pos.x, pos.y, pos.z);
        }
      }
    });

    [...this.atomMeshes.keys()].forEach((id) => {
      if (seen.has(id)) return;
      const entry = this.atomMeshes.get(id);
      this.moleculeGroup.remove(entry.mesh);
      entry.mesh.material.dispose();
      this.atomMeshes.delete(id);
    });
  }

  _syncBonds() {
    const fp = this._bonds.map((b) => `${b.id}:${b.atomIds[0]}-${b.atomIds[1]}:${b.bondType}:${b.order || 1}`).join('|');
    if (fp !== this._bondFp) {
      this._rebuildBonds();
      this._bondFp = fp;
    }
    this._layoutBonds();
  }

  _rebuildBonds() {
    this.bondMeshes.forEach((item) => {
      this.moleculeGroup.remove(item.mesh);
      if (item.mesh.material) item.mesh.material.dispose();
    });
    this.bondMeshes = [];

    this._bonds.forEach((bond) => {
      const style = bondStyle(bond.bondType);
      const order = Math.max(1, Math.min(3, bond.order || 1));
      const offsets = order === 1 ? [0] : order === 2 ? [-0.08, 0.08] : [-0.11, 0, 0.11];
      offsets.forEach((off, i) => {
        const mesh = new THREE.Mesh(
          UNIT_CYL,
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(style.color),
            roughness: 0.45,
            metalness: 0.12,
            transparent: style.dashed,
            opacity: style.dashed ? 0.7 : 1,
          })
        );
        mesh.userData = { isBond: true, bondId: bond.id };
        this.moleculeGroup.add(mesh);
        const radius = this.editMode === 'breakBond' ? style.radius * 2.4 : style.radius;
        this.bondMeshes.push({ mesh, bondId: bond.id, offset: off, radius });
      });
    });
  }

  _layoutBonds() {
    this.bondMeshes.forEach((item) => {
      const bond = this._bonds.find((b) => b.id === item.bondId);
      if (!bond) return;
      const a = this._atoms[bond.atomIds[0]];
      const b = this._atoms[bond.atomIds[1]];
      if (!a || !b) return;
      const start = new THREE.Vector3(a.position.x, a.position.y, a.position.z);
      const end = new THREE.Vector3(b.position.x, b.position.y, b.position.z);
      const dir = new THREE.Vector3().subVectors(end, start);
      const length = dir.length();
      if (length < 0.01) return;
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const quat = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir.clone().normalize());
      const offsetDir = new THREE.Vector3().crossVectors(dir, Y_AXIS);
      if (offsetDir.lengthSq() < 0.001) offsetDir.set(1, 0, 0);
      offsetDir.normalize();
      item.mesh.quaternion.copy(quat);
      item.mesh.scale.set(item.radius, length, item.radius);
      item.mesh.position.copy(mid).addScaledVector(offsetDir, item.offset);
    });
  }

  updateAtomPosition(id, pos) {
    if (this._atoms[id]) this._atoms[id] = { ...this._atoms[id], position: { ...pos } };
    const entry = this.atomMeshes.get(id);
    if (entry) entry.mesh.position.set(pos.x, pos.y, pos.z);
    this._layoutBonds();
  }

  _refreshHighlights() {
    this.atomMeshes.forEach((entry, id) => {
      const mat = entry.mesh.material;
      const isSel = id === this.selectedId;
      const isStart = id === this.bondStartId;
      const deleting = this.interactive && this.editMode === 'deleteAtom';
      mat.emissive = new THREE.Color(isStart ? 0x00864c : isSel ? 0x9f7aea : deleting ? 0xdb3237 : 0x000000);
      mat.emissiveIntensity = isStart || isSel ? 0.45 : deleting ? 0.22 : 0;
      entry.labelEl.classList.toggle('is-selected', isSel || isStart);
    });
    this.bondMeshes.forEach((item) => {
      const breaking = this.interactive && this.editMode === 'breakBond';
      item.mesh.material.emissive = new THREE.Color(breaking ? 0xdb3237 : 0x000000);
      item.mesh.material.emissiveIntensity = breaking ? 0.35 : 0;
    });
  }

  _ndc(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  _pick() {
    const atomMeshes = [...this.atomMeshes.values()].map((e) => e.mesh);
    const bondMeshes = this.bondMeshes.map((b) => b.mesh);
    if (this.editMode === 'breakBond' && bondMeshes.length) {
      const bondHit = this.raycaster.intersectObjects(bondMeshes, false)[0];
      if (bondHit) return bondHit;
    }
    const hits = this.raycaster.intersectObjects([...atomMeshes, ...bondMeshes, this.floor], false);
    return hits[0] || null;
  }

  _bondIdOnAtom(atomId) {
    return this._bonds.find((bond) => bond.atomIds.includes(atomId))?.id || null;
  }

  _handlePointerDown(event) {
    if (!this.interactive) return;
    this._ndc(event);
    const hit = this._pick();
    this._down = { x: event.clientX, y: event.clientY, hit };

    if (this.editMode === 'select' && hit?.object.userData.isAtom) {
      const id = hit.object.userData.atomId;
      this.selectedId = id;
      this.onSelectAtom?.(id);
      this._dragging = { id, y: this._atoms[id]?.position?.y || 0 };
      this.dragPlane.set(Y_AXIS, -this._dragging.y);
      this.controls.enabled = false;
      this.renderer.domElement.style.cursor = 'grabbing';
      this._refreshHighlights();
    }
  }

  _handlePointerMove(event) {
    if (!this.interactive || !this._dragging) return;
    this._ndc(event);
    if (this.raycaster.ray.intersectPlane(this.dragPlane, this.hit)) {
      const next = { x: this.hit.x, y: this._dragging.y, z: this.hit.z };
      const entry = this.atomMeshes.get(this._dragging.id);
      if (entry) entry.mesh.position.set(next.x, next.y, next.z);
      if (this._atoms[this._dragging.id]) {
        this._atoms[this._dragging.id].position = next;
      }
      this._layoutBonds();
      this.onMoveAtom?.(this._dragging.id, next, { skipHistory: true });
    }
  }

  _handlePointerUp(event) {
    if (!this.interactive) return;
    const down = this._down;
    this._down = null;
    const dragged = this._dragging;
    if (dragged) {
      const entry = this.atomMeshes.get(dragged.id);
      if (entry) {
        this.onMoveAtom?.(dragged.id, {
          x: entry.mesh.position.x,
          y: entry.mesh.position.y,
          z: entry.mesh.position.z,
        }, { skipHistory: false });
      }
      this._dragging = null;
      this.controls.enabled = true;
      this.renderer.domElement.style.cursor = this.editMode === 'addAtom' ? 'crosshair' : 'grab';
      return;
    }

    if (!down) return;
    const dist = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    if (dist > 6) return;

    this._ndc(event);
    const hit = this._pick();
    this._applyClick(hit);
  }

  _applyClick(hit) {
    const atomId = hit?.object?.userData?.atomId;
    const bondId = hit?.object?.userData?.bondId;
    const isFloor = hit?.object?.userData?.isFloor;

    if (this.editMode === 'addAtom') {
      this.dragPlane.set(Y_AXIS, 0);
      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.hit)) {
        this.onPlaceAtom?.(this.hit.clone());
      }
      return;
    }

    if (this.editMode === 'deleteAtom' && atomId) {
      this.onDeleteAtom?.(atomId);
      return;
    }

    if (this.editMode === 'breakBond') {
      const target = bondId || (atomId && this._bondIdOnAtom(atomId));
      if (target) this.onBreakBond?.(target);
      return;
    }

    if (this.editMode === 'addBond' && atomId) {
      if (!this.bondStartId) {
        this.bondStartId = atomId;
        this.onSelectAtom?.(atomId);
      } else if (this.bondStartId === atomId) {
        this.bondStartId = null;
      } else {
        this.onAddBond?.(this.bondStartId, atomId);
        this.bondStartId = null;
      }
      this._refreshHighlights();
      return;
    }

    if (this.editMode === 'select') {
      if (atomId) {
        this.selectedId = atomId;
        this.onSelectAtom?.(atomId);
      } else if (isFloor || !hit) {
        this.selectedId = null;
        this.onClearSelection?.();
      }
      this._refreshHighlights();
    }
  }

  focusHome() {
    const pos = new THREE.Vector3(6.2, 4.4, 8.4);
    const target = new THREE.Vector3(0, 0.2, 0);
    if (this._reduceMotion) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      return;
    }
    gsap.to(this.camera.position, {
      x: pos.x, y: pos.y, z: pos.z,
      duration: 0.45,
      ease: 'power3.out',
      overwrite: true,
    });
    gsap.to(this.controls.target, {
      x: target.x, y: target.y, z: target.z,
      duration: 0.45,
      ease: 'power3.out',
      overwrite: true,
    });
  }

  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  _handleResize() {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  }

  dispose() {
    this.clearAtomHint();
    cancelAnimationFrame(this._raf);
    this.renderer.domElement.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('resize', this._onResize);
    this.controls.dispose();
    this.atomMeshes.forEach((entry) => entry.mesh.material.dispose());
    this.bondMeshes.forEach((item) => item.mesh.material.dispose());
    this.renderer.dispose();
    this.labelRenderer.domElement.remove();
    this.renderer.domElement.remove();
  }
}
