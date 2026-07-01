"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Coordinate-driven 3D sign avatar. Given a sequence of MediaPipe frames (hands + pose
// landmarks), it renders a glowing body+hands puppet and animates by interpolating the
// coordinates — no hand-authored animation. Same idea as the recognizer, in reverse.

export type LM = [number, number, number];
export interface AnimFrame {
  hands: LM[][]; // 0..2 hands, each 21 points
  pose: LM[]; // 33 points (may be empty)
}

const HAND_CONN: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];
// Upper-body pose connections (shoulders, arms, torso).
const POSE_CONN: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
];

const OFF: THREE.Vector3 = new THREE.Vector3(0, -999, 0); // hidden position

function toV(p: LM | undefined, out: THREE.Vector3) {
  if (!p) return out.copy(OFF);
  // image coords -> centered 3D (x right, y up, z depth)
  return out.set((p[0] - 0.5) * 3.2, (0.5 - p[1]) * 3.2, -p[2] * 1.5);
}

export function SignAvatar({
  frames,
  playing,
  loop = false,
  onEnd,
  className = "",
}: {
  frames: AnimFrame[] | null;
  playing: boolean;
  loop?: boolean;
  onEnd?: () => void;
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    joints?: THREE.Points;
    bones?: THREE.LineSegments;
    jPos?: Float32Array;
    bPos?: Float32Array;
    raf?: number;
    playhead: number;
    frames: AnimFrame[] | null;
    playing: boolean;
    onEnd?: () => void;
    loop: boolean;
  }>({ playhead: 0, frames: null, playing: false, loop: false });

  // live-update playback params without recreating the scene
  stateRef.current.frames = frames;
  stateRef.current.onEnd = onEnd;
  stateRef.current.loop = loop;
  if (frames && !playing) stateRef.current.playing = false;

  useEffect(() => {
    if (frames) stateRef.current.playhead = 0;
    stateRef.current.playing = playing;
  }, [frames, playing]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const S = stateRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    mount.appendChild(renderer.domElement);

    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#2e7dff";
    const glow = getComputedStyle(document.documentElement).getPropertyValue("--orb-glow").trim() || "#60a5fa";

    const MAX_J = 33 + 21 * 2; // pose + 2 hands
    const jPos = new Float32Array(MAX_J * 3).fill(-999);
    const jGeo = new THREE.BufferGeometry();
    jGeo.setAttribute("position", new THREE.BufferAttribute(jPos, 3));
    const joints = new THREE.Points(jGeo, new THREE.PointsMaterial({ color: new THREE.Color("#ffffff"), size: 0.14, sizeAttenuation: true }));
    scene.add(joints);

    const MAX_B = (POSE_CONN.length + HAND_CONN.length * 2) * 2;
    const bPos = new Float32Array(MAX_B * 3).fill(-999);
    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
    const bones = new THREE.LineSegments(bGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(accent) }));
    scene.add(bones);

    scene.add(new THREE.AmbientLight(new THREE.Color(glow), 1.2));

    Object.assign(S, { renderer, scene, camera, joints, bones, jPos, bPos });

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3();

    const setFrameInto = (f: AnimFrame, prev: AnimFrame | null, t: number) => {
      let ji = 0, bi = 0;
      const put = (v: THREE.Vector3) => { jPos[ji++] = v.x; jPos[ji++] = v.y; jPos[ji++] = v.z; };
      const putB = (v: THREE.Vector3) => { bPos[bi++] = v.x; bPos[bi++] = v.y; bPos[bi++] = v.z; };
      const lerp = (cur: LM[] | undefined, pv: LM[] | undefined, i: number, out: THREE.Vector3) => {
        toV(cur?.[i], out);
        if (pv?.[i] && cur?.[i]) { toV(pv[i], tmpC); out.lerp(tmpC, 1 - t); }
        return out;
      };
      // pose joints + bones
      const pose = f.pose, ppose = prev?.pose;
      for (let i = 0; i < 33; i++) put(lerp(pose, ppose, i, tmpA));
      for (const [a, b] of POSE_CONN) {
        putB(lerp(pose, ppose, a, tmpA));
        putB(lerp(pose, ppose, b, tmpB));
      }
      // hands joints + bones (up to 2)
      for (let hIdx = 0; hIdx < 2; hIdx++) {
        const hand = f.hands[hIdx], phand = prev?.hands[hIdx];
        for (let i = 0; i < 21; i++) put(lerp(hand, phand, i, tmpA));
        for (const [a, b] of HAND_CONN) {
          putB(lerp(hand, phand, a, tmpA));
          putB(lerp(hand, phand, b, tmpB));
        }
      }
      // fill remainder as hidden
      while (ji < jPos.length) jPos[ji++] = -999;
      while (bi < bPos.length) bPos[bi++] = -999;
      joints.geometry.attributes.position.needsUpdate = true;
      bones.geometry.attributes.position.needsUpdate = true;
    };

    let last = performance.now();
    const animate = () => {
      const now = performance.now();
      const dt = (now - last) / 1000; last = now;
      const fr = S.frames;
      if (fr && fr.length) {
        if (S.playing) {
          S.playhead += dt * 12; // 12fps source
          if (S.playhead >= fr.length - 1) {
            if (S.loop) S.playhead = 0;
            else { S.playhead = fr.length - 1; S.playing = false; S.onEnd?.(); }
          }
        }
        const i = Math.min(fr.length - 1, Math.floor(S.playhead));
        const t = S.playhead - i;
        setFrameInto(fr[i], fr[Math.max(0, i - 1)] || null, t);
      }
      renderer.render(scene, camera);
      S.raf = requestAnimationFrame(animate);
    };
    S.raf = requestAnimationFrame(animate);

    return () => {
      if (S.raf) cancelAnimationFrame(S.raf);
      ro.disconnect();
      renderer.dispose();
      jGeo.dispose(); bGeo.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={`h-full w-full ${className}`} />;
}
