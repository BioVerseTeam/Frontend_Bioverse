/**
 * GSAP-driven keyframe playback for molecular reactions.
 * Time is tweened; atom positions lerp between neighboring keyframes.
 */

import gsap from 'gsap';
import { vec3 } from './chemx.js';

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpPos(a, b, t) {
  const pa = vec3(a);
  const pb = vec3(b);
  return {
    x: lerp(pa.x, pb.x, t),
    y: lerp(pa.y, pb.y, t),
    z: lerp(pa.z, pb.z, t),
  };
}

export class AnimationEngine {
  constructor() {
    this.data = null;
    this.proxy = { time: 0 };
    this.tl = null;
    this.playing = false;
    this.onFrame = null;
    this.onTime = null;
    this.onPlayState = null;
  }

  load(data) {
    this.dispose();
    this.data = data;
    this.proxy.time = 0;

    const durationMs = Math.max(data?.duration || 0, 1);
    const durationSec = durationMs / 1000;

    this.tl = gsap.timeline({
      paused: true,
      repeat: -1,
      onUpdate: () => this._emit(),
    });
    this.tl.to(this.proxy, {
      time: durationMs,
      duration: durationSec,
      ease: 'none',
    });

    this._emit();
  }

  play() {
    if (!this.tl) return;
    this.tl.play();
    this.playing = true;
    this.onPlayState?.(true);
  }

  pause() {
    this.tl?.pause();
    this.playing = false;
    this.onPlayState?.(false);
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  seek(timeMs) {
    if (!this.data || !this.tl) return;
    const duration = Math.max(this.data.duration || 0, 1);
    const clamped = Math.max(0, Math.min(timeMs, duration));
    const wasPlaying = this.playing;
    this.tl.pause();
    this.playing = wasPlaying;
    this.tl.time(clamped / 1000);
    this.proxy.time = clamped;
    this._emit();
    if (wasPlaying) this.tl.play();
  }

  reset() {
    this.pause();
    this.proxy.time = 0;
    this.tl?.progress(0);
    this._emit();
  }

  getDuration() {
    return this.data?.duration || 0;
  }

  getTime() {
    return this.proxy.time || 0;
  }

  interpolate(timeMs) {
    const keyframes = this.data?.keyframes || [];
    if (!keyframes.length) return { atoms: {}, bonds: [] };

    let index = 0;
    while (index < keyframes.length - 1 && keyframes[index + 1].timestamp < timeMs) {
      index += 1;
    }

    if (index >= keyframes.length - 1) {
      const last = keyframes[index];
      return { atoms: last.atoms, bonds: last.bonds };
    }

    const a = keyframes[index];
    const b = keyframes[index + 1];
    const span = Math.max(b.timestamp - a.timestamp, 1);
    const t = (timeMs - a.timestamp) / span;
    return this._mix(a, b, t);
  }

  _mix(frame1, frame2, t) {
    const atoms = {};
    const ids = new Set([
      ...Object.keys(frame1.atoms || {}),
      ...Object.keys(frame2.atoms || {}),
    ]);

    ids.forEach((id) => {
      const a1 = frame1.atoms[id];
      const a2 = frame2.atoms[id];
      if (a1 && a2) {
        atoms[id] = {
          ...a1,
          charge: lerp(a1.charge || 0, a2.charge || 0, t),
          position: lerpPos(a1.position, a2.position, t),
        };
      } else if (a1 && t < 0.5) {
        atoms[id] = a1;
      } else if (a2 && t >= 0.5) {
        atoms[id] = a2;
      }
    });

    return {
      atoms,
      bonds: t < 0.5 ? frame1.bonds : frame2.bonds,
    };
  }

  _emit() {
    const time = this.proxy.time || 0;
    const frame = this.interpolate(time);
    this.onFrame?.(frame.atoms, frame.bonds);
    this.onTime?.(time);
  }

  dispose() {
    this.pause();
    this.tl?.kill();
    this.tl = null;
    this.data = null;
  }
}
