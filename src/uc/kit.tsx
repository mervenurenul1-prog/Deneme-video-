import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { Easing, interpolate } from "remotion";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { handFamily } from "../fonts";

// 3D videoların ortak parçaları: karakter iskeleti ve pozlar, kamera planları, efektler, oda.
// Videoya özel sahneler src/uc/sahneler/ altında.

export type V3 = [number, number, number];
export type W = (i: number) => number;
export type Ctx = { f: number; w: W; d: number };

export const ease = Easing.inOut(Easing.cubic);
export const tw = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
export const pop = (f: number, a: number, len = 12) =>
  interpolate(f, [a, a + len * 0.6, a + len], [0, 1.12, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
export const cycles = (f: number, start: number, period: number, life: number) => {
  const out: { k: number; p: number }[] = [];
  if (f < start) return out;
  const n = Math.floor((f - start) / period);
  for (let k = Math.max(0, n - Math.ceil(life / period)); k <= n; k++) {
    const p = (f - start - k * period) / life;
    if (p >= 0 && p <= 1) out.push({ k, p });
  }
  return out;
};
export const mix3 = (a: V3, b: V3, p: number) => a.map((v, j) => v + (b[j] - v) * p) as V3;
export const add3 = (a: V3, b: V3, k = 1) => a.map((v, j) => v + b[j] * k) as V3;

export const PAPER = "#d9c29a";
export const FAT = "#f0c24b";
export const WATER = "#4f97c2";
export const RED = "#b23a2a";

/* ---------- 3D dünya ---------- */

export type SceneRef = { visual: string; w: W; d: number; start: number };

// Kemiklerin modeldeki duruşu saklanır; her karede o duruşa dönülüp üstüne poz eklenir
export const useRig = (model: THREE.Group) =>
  useMemo(() => {
    const p = SkeletonUtils.clone(model) as THREE.Group;
    p.scale.multiplyScalar(1.68 / 1.66);
    const rest = new Map<THREE.Object3D, THREE.Quaternion>();
    p.traverse((o) => {
      rest.set(o, o.quaternion.clone());
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
      }
    });
    const bone = (n: string) => p.getObjectByName(`mixamorig${n}`)!;
    return { p, rest, bone };
  }, [model]);

// Poz: kol [aşağı, öne, dirsek], bacak [kaldır, diz], gövde/baş eğimleri, zıplama ve dönüş
export type Pose = {
  armL?: V3;
  armR?: V3;
  legL?: [number, number];
  legR?: [number, number];
  spine?: number;
  chest?: number;
  head?: V3; // [eğil, dön, yana yat]
  bob?: number;
  turn?: number;
  // karakterin odadaki yeri (ör. tartıdan inmek için öne adım)
  x?: number;
  z?: number;
};
export const REST_ARM: V3 = [1.42, 0.1, 0.25];

export const applyPose = (rig: ReturnType<typeof useRig>, pose: Pose, f: number) => {
  rig.rest.forEach((q, o) => o.quaternion.copy(q));
  const rot = (n: string, x: number, y: number, z: number) =>
    rig.bone(n).quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)));
  const breathe = Math.sin(f / 22) * 0.025;
  const [la, lf, le] = pose.armL ?? REST_ARM;
  const [ra, rf, re] = pose.armR ?? REST_ARM;
  rot("LeftArm", la, 0, lf);
  rot("RightArm", ra, 0, -rf);
  rot("LeftForeArm", 0, 0, le);
  rot("RightForeArm", 0, 0, -re);
  const [ll, lk] = pose.legL ?? [0, 0];
  const [rl, rk] = pose.legR ?? [0, 0];
  rot("LeftUpLeg", ll, 0, 0.03);
  rot("RightUpLeg", rl, 0, -0.03);
  rot("LeftLeg", lk, 0, 0);
  rot("RightLeg", rk, 0, 0);
  rot("Spine", (pose.spine ?? 0) + breathe * 0.5, 0, Math.sin(f / 40) * 0.015);
  rot("Spine2", (pose.chest ?? 0) - breathe, 0, 0);
  const [hn, ht, hz] = pose.head ?? [0, 0, 0];
  rot("Head", hn + Math.sin(f / 33) * 0.015, ht, hz);
  rig.p.position.set(pose.x ?? 0, pose.bob ?? 0, pose.z ?? 0);
  rig.p.rotation.y = pose.turn ?? 0;
  rig.p.updateMatrixWorld(true);
};

export type Anchors = { belly: V3; chest: V3; mouth: V3; head: V3; hipL: V3; kneeL: V3; footL: V3; hipR: V3; kneeR: V3; footR: V3 };
export const anchors = (rig: ReturnType<typeof useRig>): Anchors => {
  const g = (n: string, off: V3 = [0, 0, 0]) => {
    const v = rig.bone(n).getWorldPosition(new THREE.Vector3());
    return add3([v.x, v.y, v.z], off);
  };
  return {
    belly: g("Spine", [0, -0.02, 0.13]),
    chest: g("Spine2", [0, 0.02, 0.12]),
    head: g("Head", [0, 0.1, 0.02]),
    mouth: g("Head", [0, 0.035, 0.1]),
    hipL: g("LeftUpLeg"),
    kneeL: g("LeftLeg"),
    footL: g("LeftFoot"),
    hipR: g("RightUpLeg"),
    kneeR: g("RightLeg"),
    footR: g("RightFoot"),
  };
};

export type Plan = { t: number; pos: [V3, V3]; look: [V3, V3] };
export const useCam = (plans: Plan[], f: number, end: number, shake = 0) => {
  const { camera } = useThree();
  const list = [...plans].sort((a, b) => a.t - b.t);
  let i = 0;
  list.forEach((p, j) => {
    if (f >= p.t) i = j;
  });
  const pl = list[i];
  const next = list[i + 1]?.t ?? end;
  const p = Easing.inOut(Easing.quad)(Math.min(1, Math.max(0, (f - pl.t) / Math.max(1, next - pl.t))));
  const pos = mix3(pl.pos[0], pl.pos[1], p);
  const sh = shake ? ([Math.sin(f * 2.1) * shake, Math.cos(f * 2.7) * shake, 0] as V3) : ([0, 0, 0] as V3);
  camera.position.set(...add3(pos, sh));
  camera.lookAt(new THREE.Vector3(...add3(mix3(pl.look[0], pl.look[1], p), sh)));
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = 35;
  cam.near = 0.02;
  cam.updateProjectionMatrix();
};

/* ---------- 3D efekt parçaları ---------- */

export const Ball: React.FC<{ p: V3; r: number; color: string; o?: number; glow?: number; front?: boolean }> = ({ p, r, color, o = 1, glow = 0, front }) => (
  <mesh position={p} renderOrder={front ? 3 : 0}>
    <sphereGeometry args={[r, 20, 16]} />
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={glow}
      transparent={o < 1 || front}
      opacity={o}
      depthTest={!front}
      roughness={0.5}
    />
  </mesh>
);

// Göbekteki yağ katmanı (röntgen gibi, vücudun önünde)
export const FAT_CELLS: V3[] = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + i;
  const r = 0.03 + ((i * 37) % 10) / 100;
  return [Math.cos(a) * r, Math.sin(a) * r * 0.55, 0.018 + ((i * 13) % 5) / 400];
});
export const FatLayer: React.FC<{ at: V3; o: number }> = ({ at, o }) =>
  o > 0.01 ? (
    <>
      {FAT_CELLS.map(([x, y, z], j) => (
        <Ball key={j} p={add3(at, [x, y, z])} r={0.022 + (j % 4) * 0.006} color={FAT} o={0.85 * o} glow={0.4} front />
      ))}
    </>
  ) : null;

// Damla: aşağı uzamış küre
export const Drop3: React.FC<{ p: V3; s?: number; color?: string; o?: number; front?: boolean }> = ({ p, s = 1, color = WATER, o = 1, front }) => (
  <mesh position={p} scale={[s, s * 1.35, s]} renderOrder={front ? 3 : 0}>
    <sphereGeometry args={[0.012, 14, 12]} />
    <meshStandardMaterial color={color} transparent opacity={o} roughness={0.15} metalness={0.1} depthTest={!front} />
  </mesh>
);

// "CO₂" yazılı etiket (kâğıt üstüne el yazısı gibi)
export const useLabel = (text: string, color: string) =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const x = c.getContext("2d")!;
    x.font = `700 92px ${handFamily}`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillStyle = color;
    x.fillText(text, 128, 70);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, color]);

// Nefesle çıkan bulut: ağızdan çıkar, büyür, yana-yukarı süzülür, kaybolur
export const PUFF: [number, number, number, number][] = [
  [0, 0, 0, 1],
  [-0.8, -0.3, 0, 0.7],
  [0.8, -0.25, 0.1, 0.75],
  [0.1, 0.55, -0.1, 0.75],
];
export const Puff3: React.FC<{ from: V3; p: number; dir?: V3; size?: number; label?: boolean }> = ({ from, p, dir = [0.4, 0.22, 0.25], size = 0.075, label }) => {
  const tex = useLabel("CO₂", "#3a2716");
  const e = 1 - (1 - p) * (1 - p);
  const o = interpolate(p, [0, 0.12, 0.7, 1], [0, 0.9, 0.75, 0]);
  return (
    <group position={add3(from, dir, e)} scale={size * (0.2 + 0.8 * e)}>
      {PUFF.map(([x, y, z, r], j) => (
        <mesh key={j} position={[x, y, z]}>
          <sphereGeometry args={[r, 18, 14]} />
          <meshStandardMaterial color="#e6e3dc" transparent opacity={o} roughness={1} />
        </mesh>
      ))}
      {label ? (
        <sprite position={[0, 0, 1.1]} scale={[1.9, 0.95, 1]}>
          <spriteMaterial map={tex} transparent opacity={o} depthTest={false} />
        </sprite>
      ) : null}
    </group>
  );
};

export const Lungs3: React.FC<{ at: V3; o: number; k: number }> = ({ at, o, k }) =>
  o > 0.01 ? (
    <group position={at} scale={0.9 + 0.2 * k}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.055, -0.01, 0]} scale={[0.045, 0.075, 0.03]} renderOrder={3}>
          <sphereGeometry args={[1, 24, 18]} />
          <meshStandardMaterial color="#e58f8f" emissive="#c86060" emissiveIntensity={0.3} transparent opacity={0.85 * o} depthTest={false} />
        </mesh>
      ))}
      <mesh position={[0, 0.07, 0]} renderOrder={3}>
        <cylinderGeometry args={[0.008, 0.008, 0.07, 10]} />
        <meshStandardMaterial color="#c97a7a" transparent opacity={o} depthTest={false} />
      </mesh>
    </group>
  ) : null;

// İki nokta arasında parlayan kapsül (yanan kaslar)
export const Glow: React.FC<{ a: V3; b: V3; r: number; o: number; color?: string }> = ({ a, b, r, o, color = "#ff7a1a" }) => {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const len = va.distanceTo(vb);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return (
    <mesh position={mid} quaternion={q} renderOrder={3}>
      <capsuleGeometry args={[r, len, 8, 16]} />
      <meshBasicMaterial color={color} transparent opacity={o} depthTest={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
};

export const Star3: React.FC<{ p: V3; rot: number }> = ({ p, rot }) => (
  <mesh position={p} rotation={[rot, rot * 1.3, 0]} renderOrder={3}>
    <octahedronGeometry args={[0.03, 0]} />
    <meshStandardMaterial color="#ffd23f" emissive="#ffb000" emissiveIntensity={0.8} depthTest={false} transparent />
  </mesh>
);

// Vücudun içi: yağ hücrelerinin yakın çekimi için odanın uzağına kurulan ayrı bir "mikro" set
export const MICRO: V3 = [30, 1.2, 0];
export const MICRO_CELLS: V3[] = [
  [-0.55, 0.35, 0],
  [0.05, 0.45, -0.15],
  [0.6, 0.3, 0],
  [-0.75, -0.25, -0.1],
  [-0.2, -0.05, 0.1],
  [0.4, -0.15, 0.05],
  [-0.4, -0.6, 0],
  [0.25, -0.65, -0.1],
];

/* ---------- oda ---------- */

export const Room: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[12, 12]} />
      <meshStandardMaterial color="#b88d5c" roughness={0.8} />
    </mesh>
    {Array.from({ length: 24 }, (_, i) => (
      <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-6 + i * 0.5, 0.001, 0]}>
        <planeGeometry args={[0.012, 12]} />
        <meshStandardMaterial color="#8a6438" />
      </mesh>
    ))}
    <mesh position={[0, 2, -1.6]} receiveShadow>
      <planeGeometry args={[12, 4]} />
      <meshStandardMaterial color="#e2cda4" roughness={0.95} />
    </mesh>
    <mesh position={[0, 2, 3.5]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[12, 4]} />
      <meshStandardMaterial color="#d9c29a" roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.45, -1.59]}>
      <planeGeometry args={[12, 0.9]} />
      <meshStandardMaterial color="#d3b98a" />
    </mesh>
    <mesh position={[-1.4, 1.6, -1.58]}>
      <planeGeometry args={[1.0, 1.3]} />
      <meshStandardMaterial color="#fff6dc" emissive="#fff0c8" emissiveIntensity={0.9} />
    </mesh>
    {[
      [-1.4, 1.6, 0.04, 1.3],
      [-1.4, 1.6, 1.0, 0.04],
    ].map(([x, y, ww, hh], i) => (
      <mesh key={i} position={[x, y, -1.57]}>
        <planeGeometry args={[ww, hh]} />
        <meshStandardMaterial color="#6e4a32" />
      </mesh>
    ))}
    <group position={[0.9, 1.55, -1.58]}>
      <mesh>
        <planeGeometry args={[0.5, 0.6]} />
        <meshStandardMaterial color="#6e4a32" />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[0.42, 0.52]} />
        <meshStandardMaterial color="#9fae86" />
      </mesh>
    </group>
    <group position={[1.3, 0, -1.1]}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.12, 0.36, 24]} />
        <meshStandardMaterial color="#b8664a" />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[Math.cos(i) * 0.08, 0.6, Math.sin(i) * 0.08]} rotation={[Math.sin(i) * 0.5, 0, Math.cos(i) * 0.5]} castShadow>
          <coneGeometry args={[0.05, 0.6, 8]} />
          <meshStandardMaterial color="#5f7a4f" />
        </mesh>
      ))}
    </group>
    <group position={[-0.9, 0.06, 0.6]} rotation={[0, 0.4, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.35, 12]} />
        <meshStandardMaterial color="#888" metalness={0.6} roughness={0.4} />
      </mesh>
      {[-0.15, 0.15].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.07, 20]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      ))}
    </group>
    {/* mikro set: sıcak dokulu iç yüzey */}
    <mesh position={MICRO}>
      <sphereGeometry args={[10, 32, 24]} />
      <meshStandardMaterial color="#e8b49a" side={THREE.BackSide} roughness={1} />
    </mesh>
    <pointLight position={add3(MICRO, [0.5, 1, 4])} intensity={12} distance={14} color="#fff0dc" />
  </group>
);

/* ---------- kamera görünümleri ---------- */

export const WIDE: [V3, V3] = [
  [0, 1.05, 4.0],
  [0, 1.0, 3.4],
];
export const WIDE_LOOK: [V3, V3] = [
  [0, 0.95, 0],
  [0, 0.95, 0],
];
export const plan = (t: number, pos: [V3, V3], look: [V3, V3]): Plan => ({ t, pos, look });
export const faceCam = (t: number, a: Anchors, side = 0, dist = 1.0): Plan =>
  plan(t, [add3(a.head, [side, -0.03, dist]), add3(a.head, [side + 0.05, -0.02, dist - 0.1])], [add3(a.head, [0, -0.05, 0]), add3(a.head, [0, -0.04, 0])]);

// Yerinde koşu
export const jog = (f: number, go: number): Pose => {
  const ph = f / 4.2;
  const l = Math.max(0, Math.sin(ph)) * go;
  const r = Math.max(0, -Math.sin(ph)) * go;
  return {
    legL: [1.0 * l, 1.5 * l],
    legR: [1.0 * r, 1.5 * r],
    armL: [1.3, 0.12 + (0.7 * r - 0.3 * l) * go, 0.25 + 1.3 * go],
    armR: [1.3, 0.12 + (0.7 * l - 0.3 * r) * go, 0.25 + 1.3 * go],
    bob: Math.abs(Math.sin(ph)) * 0.05 * go,
    spine: 0.08 * go,
  };
};

export type Def = {
  pose: (c: Ctx) => Pose;
  cam: (c: Ctx) => Plan[];
  shake?: (c: Ctx) => number;
  fx: React.FC<Ctx & { a: Anchors }>;
};

// Anchors kamera planları için sabit (dinlenme pozunda) değerler
export const A0: Anchors = {
  belly: [0, 1.07, 0.13],
  chest: [0, 1.27, 0.12],
  head: [0, 1.6, 0.02],
  mouth: [0, 1.53, 0.1],
  hipL: [0.09, 0.95, 0],
  kneeL: [0.1, 0.52, 0],
  footL: [0.1, 0.09, 0],
  hipR: [-0.09, 0.95, 0],
  kneeR: [-0.1, 0.52, 0],
  footR: [-0.1, 0.09, 0],
};

export type OverlayProps = { w: W; d: number };
