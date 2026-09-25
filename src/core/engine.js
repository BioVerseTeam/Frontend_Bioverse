/**
 * Core 3D Engine for BioVerse
 * Manages Three.js Scene, Camera, Renderer, OrbitControls, and Animation Loop.
 */

import * as THREE from 'three';

export class Engine3D {
  constructor(containerElement) {
    this.container = containerElement || document.getElementById('canvas-container');
    if (!this.container) {
      throw new Error('Canvas container element not found for Engine3D');
    }

    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.animationCallbacks = new Set();
    this.isRunning = false;
    this.lastTime = 0;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Append to container
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Resize Handler
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);

    // Loop
    this.animate = this.animate.bind(this);
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.animate);
  }

  stop() {
    this.isRunning = false;
  }

  subscribe(callback) {
    this.animationCallbacks.add(callback);
    return () => this.animationCallbacks.delete(callback);
  }

  animate(now) {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);

    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Run subscribed per-frame updates
    for (const cb of this.animationCallbacks) {
      try {
        cb(delta, now);
      } catch (err) {
        console.error('Animation callback error:', err);
      }
    }

    if (this.controls) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    if (this.renderer && this.renderer.domElement) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    this.animationCallbacks.clear();
  }
}
