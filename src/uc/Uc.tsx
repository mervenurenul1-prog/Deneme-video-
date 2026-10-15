import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Audio, Easing, interpolate, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { Captions, Cross, HandText } from "../cizim/Cizim";
import { fontFamily, handFamily } from "../fonts";
import { audioFor, sceneDurations, wordsFor } from "../shared";
import type { Cizim, PostVoiceover } from "../types";
import { useModel } from "./model";

// 3D video: ücretsiz Mixamo kadın modeli (public/3d/kadin.glb), Three.js ile güneşli bir odada.
// Her sahne: kamera planları (kelimelerde sert kesme), karakter pozu, 3D efektler ve 2D katman
// (altyazı + yalnızca önemli sayılar). Animasyonlar kelime zamanlamasına bağlıdır.

export type UcProps = { uc: Cizim; voiceover: PostVoiceover | null };

type V3 = [number, number, number];
type W = (i: number) => number;
type Ctx = { f: number; w: W; d: number };

const ease = Easing.inOut(Easing.cubic);
const tw = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
const pop = (f: number, a: number, len = 12) =>
  interpolate(f, [a, a + len * 0.6, a + len], [0, 1.12, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const cycles = (f: number, start: number, period: number, life: number) => {
  const out: { k: number; p: number }[] = [];
  if (f < start) return out;
  const n = Math.floor((f - start) / period);
  for (let k = Math.max(0, n - Math.ceil(life / period)); k <= n; k++) {
    const p = (f - start - k * period) / life;
    if (p >= 0 && p <= 1) out.push({ k, p });
  }
  return out;
};
const mix3 = (a: V3, b: V3, p: number) => a.map((v, j) => v + (b[j] - v) * p) as V3;
const add3 = (a: V3, b: V3, k = 1) => a.map((v, j) => v + b[j] * k) as V3;

const PAPER = "#d9c29a";
const FAT = "#f0c24b";
const WATER = "#4f97c2";
const RED = "#b23a2a";

export const UcVideo: React.FC<UcProps> = ({ uc, voiceover }) => {
  const { width, height, fps } = useVideoConfig();
  const durations = sceneDurations(uc, voiceover, fps);
  const model = useModel("3d/kadin.glb");
  const scenes = uc.scenes.map((scene, i) => {
    const audio = audioFor(uc, voiceover, i);
    const words = wordsFor(scene.voice, audio);
    const w: W = (k) => Math.round((words[Math.min(k, words.length - 1)]?.start ?? 0) * fps);
    return { scene, audio, words, w, d: durations[i], start: durations.slice(0, i).reduce((a, b) => a + b, 0) };
  });
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, fontFamily }}>
      {model ? (
        <ThreeCanvas width={width} height={height} shadows gl={{ preserveDrawingBuffer: true }}>
          <World model={model} scenes={scenes.map(({ scene, w, d, start }) => ({ visual: scene.visual, w, d, start }))} />
        </ThreeCanvas>
      ) : null}
      {/* sıcak ton ve köşe kararması: serinin renk dünyası */}
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 42%, rgba(0,0,0,0) 55%, rgba(70,45,20,0.5) 100%)" }} />
      {scenes.map(({ scene, audio, words, w, d, start }, i) => {
        const Overlay = OVERLAYS[scene.visual];
        return (
          <Sequence key={i} from={start} durationInFrames={d} name={`${i + 1}-${scene.visual}`}>
            <Flash />
            {Overlay ? (
              <AbsoluteFill>
                <svg width="100%" height="100%" viewBox="0 0 1080 1920">
                  <Overlay w={w} d={d} />
                </svg>
              </AbsoluteFill>
            ) : null}
            <Captions words={words} />
            {audio ? <Audio src={staticFile(audio.file)} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// Sahne başında kısa ışık patlaması: sert kesmeyi yumuşatır
const Flash: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 5], [0.35, 0], { extrapolateRight: "clamp" });
  return o > 0 ? <AbsoluteFill style={{ backgroundColor: "#fff3d6", opacity: o }} /> : null;
};

/* ---------- 3D dünya ---------- */

type SceneRef = { visual: string; w: W; d: number; start: number };

// Kemiklerin modeldeki duruşu saklanır; her karede o duruşa dönülüp üstüne poz eklenir
const useRig = (model: THREE.Group) =>
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
type Pose = {
  armL?: V3;
  armR?: V3;
  legL?: [number, number];
  legR?: [number, number];
  spine?: number;
  chest?: number;
  head?: V3; // [eğil, dön, yana yat]
  bob?: number;
  turn?: number;
};
const REST_ARM: V3 = [1.42, 0.1, 0.25];

const applyPose = (rig: ReturnType<typeof useRig>, pose: Pose, f: number) => {
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
  rig.p.position.y = pose.bob ?? 0;
  rig.p.rotation.y = pose.turn ?? 0;
  rig.p.updateMatrixWorld(true);
};

type Anchors = { belly: V3; chest: V3; mouth: V3; head: V3; hipL: V3; kneeL: V3; footL: V3; hipR: V3; kneeR: V3; footR: V3 };
const anchors = (rig: ReturnType<typeof useRig>): Anchors => {
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

type Plan = { t: number; pos: [V3, V3]; look: [V3, V3] };
const useCam = (plans: Plan[], f: number, end: number, shake = 0) => {
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

const World: React.FC<{ model: THREE.Group; scenes: SceneRef[] }> = ({ model, scenes }) => {
  const g = useCurrentFrame();
  const rig = useRig(model);
  let i = 0;
  scenes.forEach((s, j) => {
    if (g >= s.start) i = j;
  });
  const s = scenes[i];
  const ctx: Ctx = { f: g - s.start, w: s.w, d: s.d };
  const def = DEFS[s.visual] ?? DEFS.acilis;
  applyPose(rig, def.pose(ctx), g);
  const a = anchors(rig);
  const Fx = def.fx;
  return (
    <>
      <color attach="background" args={[PAPER]} />
      <fog attach="fog" args={[PAPER, 9, 40]} />
      <hemisphereLight args={["#fff1d6", "#8a6a45", 0.9]} />
      <directionalLight
        position={[-2.5, 4, 3]}
        intensity={2.4}
        color="#ffe0b0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-1}
      />
      <pointLight position={[1.5, 1.6, 1.5]} intensity={1.2} color="#ffd7a0" />
      <Room />
      <primitive object={rig.p} />
      <CamRig def={def} ctx={ctx} />
      <Fx {...ctx} a={a} />
    </>
  );
};

const CamRig: React.FC<{ def: Def; ctx: Ctx }> = ({ def, ctx }) => {
  useCam(def.cam(ctx), ctx.f, ctx.d, def.shake?.(ctx) ?? 0);
  return null;
};

/* ---------- 3D efekt parçaları ---------- */

const Ball: React.FC<{ p: V3; r: number; color: string; o?: number; glow?: number; front?: boolean }> = ({ p, r, color, o = 1, glow = 0, front }) => (
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
const FAT_CELLS: V3[] = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + i;
  const r = 0.03 + ((i * 37) % 10) / 100;
  return [Math.cos(a) * r, Math.sin(a) * r * 0.55, 0.018 + ((i * 13) % 5) / 400];
});
const FatLayer: React.FC<{ at: V3; o: number }> = ({ at, o }) =>
  o > 0.01 ? (
    <>
      {FAT_CELLS.map(([x, y, z], j) => (
        <Ball key={j} p={add3(at, [x, y, z])} r={0.022 + (j % 4) * 0.006} color={FAT} o={0.85 * o} glow={0.4} front />
      ))}
    </>
  ) : null;

// Damla: aşağı uzamış küre
const Drop3: React.FC<{ p: V3; s?: number; color?: string; o?: number; front?: boolean }> = ({ p, s = 1, color = WATER, o = 1, front }) => (
  <mesh position={p} scale={[s, s * 1.35, s]} renderOrder={front ? 3 : 0}>
    <sphereGeometry args={[0.012, 14, 12]} />
    <meshStandardMaterial color={color} transparent opacity={o} roughness={0.15} metalness={0.1} depthTest={!front} />
  </mesh>
);

// "CO₂" yazılı etiket (kâğıt üstüne el yazısı gibi)
const useLabel = (text: string, color: string) =>
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
const PUFF: [number, number, number, number][] = [
  [0, 0, 0, 1],
  [-0.8, -0.3, 0, 0.7],
  [0.8, -0.25, 0.1, 0.75],
  [0.1, 0.55, -0.1, 0.75],
];
const Puff3: React.FC<{ from: V3; p: number; dir?: V3; size?: number; label?: boolean }> = ({ from, p, dir = [0.4, 0.22, 0.25], size = 0.075, label }) => {
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

const Lungs3: React.FC<{ at: V3; o: number; k: number }> = ({ at, o, k }) =>
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
const Glow: React.FC<{ a: V3; b: V3; r: number; o: number }> = ({ a, b, r, o }) => {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const len = va.distanceTo(vb);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return (
    <mesh position={mid} quaternion={q} renderOrder={3}>
      <capsuleGeometry args={[r, len, 8, 16]} />
      <meshBasicMaterial color="#ff7a1a" transparent opacity={o} depthTest={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
};

const Star3: React.FC<{ p: V3; rot: number }> = ({ p, rot }) => (
  <mesh position={p} rotation={[rot, rot * 1.3, 0]} renderOrder={3}>
    <octahedronGeometry args={[0.03, 0]} />
    <meshStandardMaterial color="#ffd23f" emissive="#ffb000" emissiveIntensity={0.8} depthTest={false} transparent />
  </mesh>
);

// Vücudun içi: yağ hücrelerinin yakın çekimi için odanın uzağına kurulan ayrı bir "mikro" set
const MICRO: V3 = [30, 1.2, 0];
const MICRO_CELLS: V3[] = [
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

const Room: React.FC = () => (
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

const WIDE: [V3, V3] = [
  [0, 1.05, 4.0],
  [0, 1.0, 3.4],
];
const WIDE_LOOK: [V3, V3] = [
  [0, 0.95, 0],
  [0, 0.95, 0],
];
const plan = (t: number, pos: [V3, V3], look: [V3, V3]): Plan => ({ t, pos, look });
const faceCam = (t: number, a: Anchors, side = 0, dist = 1.0): Plan =>
  plan(t, [add3(a.head, [side, -0.03, dist]), add3(a.head, [side + 0.05, -0.02, dist - 0.1])], [add3(a.head, [0, -0.05, 0]), add3(a.head, [0, -0.04, 0])]);

// Yerinde koşu
const jog = (f: number, go: number): Pose => {
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

/* ---------- sahneler ---------- */

type Def = {
  pose: (c: Ctx) => Pose;
  cam: (c: Ctx) => Plan[];
  shake?: (c: Ctx) => number;
  fx: React.FC<Ctx & { a: Anchors }>;
};

// Anchors kamera planları için sabit (dinlenme pozunda) değerler
const A0: Anchors = {
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

const DEFS: Record<string, Def> = {
  // "Verdiğin yağın büyük kısmını, nefes vererek dışarı atıyorsun."
  acilis: {
    pose: ({ f, w, d }) => {
      const ex = tw(f, w(4), w(4) + 12) * (1 - tw(f, w(7), d));
      return { head: [0.05 - ex * 0.1 + tw(f, w(1), w(2)) * 0.25 * (1 - tw(f, w(3), w(4))), 0, 0], chest: ex * 0.06 };
    },
    cam: ({ w }) => [
      plan(0, WIDE, WIDE_LOOK),
      plan(w(1), [add3(A0.belly, [0.05, 0.02, 0.9]), add3(A0.belly, [0.05, 0, 0.7])], [A0.belly, A0.belly]),
      plan(w(3), [add3(A0.chest, [0, 0, 0.9]), add3(A0.mouth, [0, -0.08, 0.85])], [A0.chest, add3(A0.mouth, [0, -0.06, 0])]),
      faceCam(w(4) + 2, A0, -0.1),
      plan(w(6), [[0.4, 1.2, 3.0], [0, 1.1, 3.8]], [[0.2, 1.2, 0], [0, 1.0, 0]]),
    ],
    fx: ({ f, w, a }) => {
      const fatO = tw(f, w(1) - 4, w(1) + 6) * (1 - 0.6 * tw(f, w(4), w(7)));
      const rise = tw(f, w(2), w(4) + 2);
      return (
        <>
          <FatLayer at={a.belly} o={fatO} />
          {rise > 0 && rise < 1 ? <Ball p={mix3(add3(a.belly, [0, 0, 0.03]), a.mouth, rise)} r={0.03 * (1 - 0.4 * rise)} color="#ffd35a" glow={0.9} front /> : null}
          {cycles(f, w(4) + 2, 24, 60)
            .filter(({ k }) => k < 3)
            .map(({ k, p }) => (
              <Puff3 key={k} from={a.mouth} p={p} dir={[0.45, 0.2 - k * 0.04, 0.25]} label />
            ))}
        </>
      );
    },
  },

  // "Çoğu insan yağın eridiğini ya da tere dönüştüğünü sanır. Ama ikisi de doğru değil."
  "yanlis-fikir": {
    pose: ({ f, w }) => ({
      // düşünen poz: sağ el çenede, sonra şaşkınlık
      armR: [1.15, 1.15, 1.85],
      armL: [1.35, 0.5, 1.4],
      head: [-0.08 + (f > w(13) - 2 ? -0.08 : 0), 0.1, 0.12],
    }),
    cam: ({ w }) => [
      faceCam(0, A0, 0.15, 1.2),
      plan(w(2), [add3(A0.belly, [0.1, -0.05, 0.8]), add3(A0.belly, [0.1, -0.2, 0.85])], [add3(A0.belly, [0, -0.15, 0]), add3(A0.belly, [0, -0.35, 0])]),
      faceCam(w(6), A0, -0.12),
      plan(w(9), WIDE, WIDE_LOOK),
    ],
    shake: ({ f, w }) => (f > w(12) && f < w(12) + 10 ? 0.02 : 0),
    fx: ({ f, w, a }) => {
      const melt = tw(f, w(2), w(5) + 10);
      const gone = f >= w(12) + 4;
      if (gone) return null;
      return (
        <>
          <FatLayer at={a.belly} o={tw(f, w(2) - 4, w(2) + 4) * (1 - 0.5 * melt)} />
          {/* eriyen yağ damlaları ve yerde birikinti */}
          {cycles(f, w(2), 5, 22).map(({ k, p }) => (
            <Drop3 key={k} p={add3(a.belly, [((k % 5) - 2) * 0.03, -0.05 - 1.0 * p * p, 0.03])} s={1.3} color={FAT} />
          ))}
          <mesh position={[0, 0.004, 0.12]} scale={[0.05 + 0.25 * melt, 1, 0.04 + 0.18 * melt]}>
            <cylinderGeometry args={[1, 1, 0.006, 32]} />
            <meshStandardMaterial color={FAT} roughness={0.2} />
          </mesh>
          {/* tere dönen yağ: alından süzülen damlalar */}
          {cycles(f, w(6) - 4, 6, 26).map(({ k, p }) => (
            <Drop3
              key={`t${k}`}
              p={add3(a.head, [((k % 5) - 2) * 0.03, 0.02 - 0.3 * p * p, 0.075 - 0.02 * p])}
              s={0.9}
              color={k % 2 ? FAT : WATER}
              o={interpolate(p, [0, 0.1, 0.85, 1], [0, 1, 1, 0])}
            />
          ))}
        </>
      );
    },
  },

  // "Yağ hücresi yakıldığında, karbondioksit ve suya ayrılır."
  "yag-hucresi": {
    pose: () => ({ head: [0.25, 0, 0] }),
    cam: ({ w }) => [
      plan(0, [add3(A0.belly, [0, 0, 0.7]), add3(A0.belly, [0, 0, 0.25])], [A0.belly, A0.belly]),
      plan(w(1), [add3(MICRO, [0, -0.1, 5.2]), add3(MICRO, [0, -0.1, 4.6])], [add3(MICRO, [0, -0.1, 0]), add3(MICRO, [0, -0.1, 0])]),
      plan(w(3), [add3(MICRO, [0.3, 0.1, 5.6]), add3(MICRO, [0.5, 0.2, 6.2])], [MICRO, MICRO]),
      plan(w(6), WIDE, WIDE_LOOK),
    ],
    fx: ({ f, w, a }) => {
      const start = w(2);
      const step = Math.max(3, (w(6) - w(2)) / MICRO_CELLS.length);
      return (
        <>
          <FatLayer at={a.belly} o={1} />
          {MICRO_CELLS.map((c, i) => {
            const p = tw(f, start + i * step, start + i * step + 20);
            const at = add3(MICRO, c);
            return (
              <group key={i}>
                {p < 1 ? (
                  <group position={at} scale={(1 - 0.9 * p) * (1 + 0.15 * Math.sin(p * Math.PI))}>
                    <mesh>
                      <sphereGeometry args={[0.3, 32, 24]} />
                      <meshStandardMaterial color={FAT} emissive="#c98a10" emissiveIntensity={0.25} roughness={0.35} transparent opacity={1 - 0.4 * p} />
                    </mesh>
                    <mesh position={[0.08, 0.05, 0.22]}>
                      <sphereGeometry args={[0.06, 16, 12]} />
                      <meshStandardMaterial color="#b8862a" />
                    </mesh>
                  </group>
                ) : null}
                {p > 0
                  ? [0, 1, 2, 3].map((k) => {
                      const ang = random(`a${i}${k}`) * Math.PI * 2;
                      const dist = 0.15 + 0.6 * Easing.out(Easing.quad)(p);
                      const pos = add3(at, [Math.cos(ang) * dist, Math.sin(ang) * dist + 0.2 * p, 0.2 * p]);
                      const o = Math.min(1, p * 3);
                      return k < 3 ? (
                        <group key={k} position={pos} rotation={[0, 0, ang]}>
                          <Ball p={[0, 0, 0]} r={0.06} color="#8e9196" o={o} />
                          <Ball p={[-0.075, 0, 0]} r={0.04} color="#4d4f53" o={o} />
                          <Ball p={[0.075, 0, 0]} r={0.04} color="#4d4f53" o={o} />
                        </group>
                      ) : (
                        <Drop3 key={k} p={pos} s={5} o={o} />
                      );
                    })
                  : null}
              </group>
            );
          })}
        </>
      );
    },
  },

  // "Bunun yüzde seksen dördü karbondioksittir ve akciğerlerinden, nefesinle çıkar."
  nefes: {
    pose: ({ f, w }) => {
      const ph = f < w(6) - 8 ? 0 : ((f - (w(6) - 8)) % 42) / 42;
      const ex = f >= w(6) - 8 && ph < 0.5;
      return { chest: ex ? 0.05 : -0.03, head: [ex ? -0.05 : 0.02, 0, 0] };
    },
    cam: ({ w }) => [
      plan(0, WIDE, WIDE_LOOK),
      plan(w(5), [add3(A0.chest, [0, 0, 0.75]), add3(A0.chest, [0, 0, 0.6])], [A0.chest, A0.chest]),
      plan(w(7), [add3(A0.head, [0.25, -0.05, 1.2]), add3(A0.head, [0.4, 0.0, 1.3])], [add3(A0.head, [0.2, -0.05, 0]), add3(A0.head, [0.3, 0.02, 0])]),
      plan(w(8) + 6, [[0.3, 1.2, 3.0], [0, 1.1, 3.6]], WIDE_LOOK),
    ],
    fx: ({ f, w, a }) => {
      const start = w(6) - 8;
      const ph = f < start ? 0.5 + 0.5 * Math.sin(f / 10) : ((f - start) % 42) / 42;
      const k = f < start ? ph : ph < 0.5 ? 1 - ph * 2 : (ph - 0.5) * 2;
      return (
        <>
          <Lungs3 at={a.chest} o={tw(f, w(5) - 4, w(5) + 4)} k={k} />
          {cycles(f, start, 42, 56).map(({ k: n, p }) => (
            <Puff3 key={n} from={a.mouth} p={p} label size={0.085} />
          ))}
        </>
      );
    },
  },

  // "Kalan yüzde on altı ise su olur; terle ve idrarla atılır."
  su: {
    pose: ({ f, w }) => {
      const tired = tw(f, w(7) - 4, w(7) + 8);
      return { head: [0.05 + 0.08 * tired, 0, 0.05 * tired], chest: 0.04 * tired };
    },
    cam: ({ w }) => [
      plan(0, WIDE, WIDE_LOOK),
      faceCam(w(7), A0, 0.1),
      plan(w(9), [[0.15, 0.35, 1.1], [0.15, 0.3, 0.95]], [[0, 0.08, 0.1], [0, 0.06, 0.1]]),
      plan(w(10) + 6, [[0, 1.3, 2.0], [0, 1.2, 2.4]], [[0, 1.15, 0], [0, 1.1, 0]]),
    ],
    fx: ({ f, w, a }) => {
      const puddle = tw(f, w(8), w(10) + 20);
      return (
        <>
          {cycles(f, w(7) - 4, 6, 30).map(({ k, p }) => (
            <Drop3 key={k} p={add3(a.head, [((k % 5) - 2) * 0.035, 0.06 - 0.32 * p * p, 0.11])} s={1.4} o={interpolate(p, [0, 0.1, 0.85, 1], [0, 1, 1, 0])} front />
          ))}
          {cycles(f, w(8), 6, 24).map(({ k, p }) => (
            <Drop3 key={`b${k}`} p={[((k % 4) - 1.5) * 0.08, 0.6 - 0.58 * p * p, 0.12]} s={1.4} o={interpolate(p, [0, 0.1, 0.9, 1], [0, 1, 1, 0])} />
          ))}
          <mesh position={[0, 0.004, 0.1]} scale={[0.05 + 0.3 * puddle, 1, 0.04 + 0.2 * puddle]}>
            <cylinderGeometry args={[1, 1, 0.006, 32]} />
            <meshStandardMaterial color={WATER} transparent opacity={0.75} roughness={0.05} metalness={0.2} />
          </mesh>
        </>
      );
    },
  },

  // "O zaman hızlı hızlı nefes alsan daha mı çok yağ yakarsın? Hayır, sadece başın döner."
  "hizli-nefes": {
    pose: ({ f, w }) => {
      const pant = f >= w(2) - 3 ? Math.sin(f * 0.9) : 0;
      const dizzy = f >= w(12) - 2;
      return {
        chest: 0.05 * pant,
        spine: 0.02 * pant,
        head: dizzy ? [0.05 + Math.sin(f / 5) * 0.08, Math.cos(f / 5) * 0.12, Math.sin(f / 5) * 0.15] : [-0.04 * pant, 0, 0],
        bob: Math.abs(pant) * 0.006,
      };
    },
    cam: ({ w }) => [
      plan(0, [[0, 1.4, 1.8], [0, 1.4, 1.6]], [[0, 1.3, 0], [0, 1.32, 0]]),
      faceCam(w(2), A0, 0),
      plan(w(6), [add3(A0.chest, [0, 0, 0.7]), add3(A0.chest, [0, 0, 0.6])], [A0.chest, A0.chest]),
      plan(w(9), [add3(A0.belly, [0, 0, 0.7]), add3(A0.belly, [0, 0, 0.6])], [A0.belly, A0.belly]),
      plan(w(11), WIDE, WIDE_LOOK),
      faceCam(w(12) + 2, A0, 0, 1.2),
    ],
    shake: ({ f, w }) => (f >= w(2) && f < w(11) ? 0.004 : f >= w(11) && f < w(11) + 8 ? 0.03 : 0),
    fx: ({ f, w, a }) => {
      const pant = f >= w(2) - 3;
      const dizzy = f >= w(12) - 2;
      return (
        <>
          <Lungs3 at={a.chest} o={pant ? 0.9 : 0} k={0.5 + 0.5 * Math.sin(f * 0.9)} />
          <FatLayer at={a.belly} o={tw(f, w(9) - 3, w(9) + 3) * (1 - tw(f, w(11), w(11) + 4))} />
          {pant && !dizzy ? cycles(f, w(2) - 3, 8, 16).map(({ k, p }) => <Puff3 key={k} from={a.mouth} p={p} size={0.04} dir={[0.25, 0.05 + (k % 3) * 0.05, 0.2]} />) : null}
          {dizzy
            ? [0, 1, 2].map((i) => {
                const ang = f / 7 + (i * Math.PI * 2) / 3;
                return <Star3 key={i} p={add3(a.head, [Math.cos(ang) * 0.14, 0.14 + Math.sin(ang * 2) * 0.01, Math.sin(ang) * 0.14])} rot={f / 4} />;
              })
            : null}
        </>
      );
    },
  },

  // "Yağın yanması için önce kasların onu yakıt olarak kullanmalı. Bunu da sadece hareket sağlar."
  hareket: {
    pose: ({ f, w }) => ({ ...jog(f, tw(f, 0, 10)), head: [0.05, 0, 0], turn: 0 * (f >= w(9) && f < w(12) ? 1 : 0) }),
    cam: ({ w }) => [
      plan(0, WIDE, WIDE_LOOK),
      plan(w(3), [[0.25, 0.65, 1.6], [0.2, 0.6, 1.4]], [[0, 0.55, 0], [0, 0.55, 0]]),
      plan(w(5), [[0, 0.95, 1.4], [0, 0.9, 1.25]], [[0, 0.85, 0], [0, 0.8, 0]]),
      plan(w(9), [[0.25, 1.45, -1.4], [0.15, 1.4, -1.2]], [[0, 1.0, 0.6], [0, 1.0, 0.6]]),
      plan(w(12), [[0, 1.45, 1.4], [0, 1.4, 1.6]], [[0, 1.35, 0], [0, 1.3, 0]]),
    ],
    fx: ({ f, w, a }) => {
      const glow = tw(f, w(4) - 2, w(4) + 10) * (0.55 + 0.15 * Math.sin(f / 4));
      const burn = tw(f, w(6) - 3, w(6) + 10);
      return (
        <>
          {glow > 0.01 ? (
            <>
              <Glow a={a.hipL} b={a.kneeL} r={0.05} o={0.5 * glow} />
              <Glow a={a.hipR} b={a.kneeR} r={0.05} o={0.5 * glow} />
              <Glow a={a.kneeL} b={a.footL} r={0.035} o={0.4 * glow} />
              <Glow a={a.kneeR} b={a.footR} r={0.035} o={0.4 * glow} />
            </>
          ) : null}
          <FatLayer at={a.belly} o={tw(f, w(4), w(5)) * (1 - tw(f, w(9), w(9) + 1))} />
          {f < w(9)
            ? cycles(f, w(5), 3, 22).map(({ k, p }) => {
                const side = k % 2 ? a.kneeL : a.kneeR;
                const pos = mix3(add3(a.belly, [((k % 3) - 1) * 0.04, 0, 0.02]), add3(side, [0, 0.1, 0.1]), p);
                return <Ball key={k} p={pos} r={0.016} color={p > 0.65 && burn > 0 ? "#ff8a2a" : FAT} glow={p > 0.65 ? burn : 0.3} front />;
              })
            : null}
          {f >= w(12) ? cycles(f, w(12), 18, 46).map(({ k, p }) => <Puff3 key={k} from={a.mouth} p={p} label size={0.07} />) : null}
        </>
      );
    },
  },

  // "Kısacası yağı hareketle yakar, nefesinle dışarı verirsin. Kaydet, sonra lazım olur."
  kapanis: {
    pose: ({ f, w }) => {
      const running = f < w(4);
      const cheer = tw(f, w(7) - 3, w(7) + 8);
      if (running) return { ...jog(f, 1), head: [0.05, 0, 0] };
      return { armR: mix3(REST_ARM, [-0.9, 0.3, 0.3], cheer), head: [f < w(7) ? -0.06 : -0.02, 0, 0] };
    },
    cam: ({ w }) => [
      plan(0, [[0.3, 0.6, 1.7], [0.25, 0.6, 1.5]], [[0, 0.55, 0], [0, 0.55, 0]]),
      faceCam(w(4), A0, -0.15),
      plan(w(7), [[-0.35, 1.1, 3.2], [-0.35, 1.05, 3.6]], [[-0.35, 1.0, 0], [-0.35, 1.0, 0]]),
    ],
    fx: ({ f, w, a }) => (
      <>
        {f < w(4) ? (
          <>
            <Glow a={a.hipL} b={a.kneeL} r={0.05} o={0.45} />
            <Glow a={a.hipR} b={a.kneeR} r={0.05} o={0.45} />
          </>
        ) : null}
        {f >= w(4) && f < w(7) + 20 ? cycles(f, w(4), 28, 56).map(({ k, p }) => <Puff3 key={k} from={a.mouth} p={p} label size={0.085} />) : null}
      </>
    ),
  },
};

/* ---------- 2D katman: yalnızca önemli sayılar ---------- */

type OverlayProps = { w: W; d: number };

const OVERLAYS: Record<string, React.FC<OverlayProps>> = {
  "yanlis-fikir": ({ w }) => {
    const f = useCurrentFrame();
    return <Cross x={540} y={820} size={260} p={tw(f, w(12) - 2, w(12) + 14)} />;
  },
  "yag-hucresi": ({ w }) => {
    const f = useCurrentFrame();
    return f < w(6) ? (
      <>
        <HandText x={230} y={420} text="CO₂" size={130} p={tw(f, w(3), w(3) + 12)} color="#3a2716" />
        <HandText x={820} y={420} text="su" size={130} p={tw(f, w(5), w(5) + 10)} color={WATER} />
      </>
    ) : null;
  },
  nefes: ({ w }) => {
    const f = useCurrentFrame();
    return f < w(5) ? (
      <>
        <HandText x={300} y={480} text="%84" size={180} p={tw(f, w(1), w(3) + 6)} color={RED} />
        <HandText x={300} y={580} text="karbondioksit" size={66} p={tw(f, w(4), w(4) + 14)} color={RED} />
      </>
    ) : null;
  },
  su: ({ w }) => {
    const f = useCurrentFrame();
    return f < w(7) ? <HandText x={540} y={480} text="%16 su" size={150} p={tw(f, w(1), w(5) + 6)} color={WATER} /> : null;
  },
  "hizli-nefes": ({ w }) => {
    const f = useCurrentFrame();
    return f >= w(11) && f < w(12) + 2 ? <HandText x={540} y={520} text="Hayır!" size={180} p={tw(f, w(11), w(11) + 8)} color={RED} rotate={-6} /> : null;
  },
  kapanis: ({ w }) => {
    const f = useCurrentFrame();
    const save = pop(f, w(7), 14);
    return save > 0 ? (
      <g transform={`translate(230 820) scale(${save}) rotate(-6)`}>
        <path d="M-70 -95 L70 -95 L70 100 L0 50 L-70 100 Z" fill="#ffd23f" stroke="#3a2716" strokeWidth={10} strokeLinejoin="round" />
        <text x={0} y={175} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={80} fill="#3a2716">
          kaydet
        </text>
      </g>
    ) : null;
  },
};
