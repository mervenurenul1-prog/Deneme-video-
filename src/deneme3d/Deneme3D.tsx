import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { Captions } from "../cizim/Cizim";
import { fontFamily } from "../fonts";
import { wordsFor } from "../shared";

// Deneme: çizimli pilotun açılış sahnesi, 3D olarak (ücretsiz Mixamo kadın modeli, Three.js).
// Amaç yalnızca iki yöntemi karşılaştırmak.
export const DENEME_3D_VOICE = "Verdiğin yağın büyük kısmını, nefes vererek dışarı atıyorsun.";

const ease = Easing.inOut(Easing.cubic);
const tw = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

const useModel = (file: string) => {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [handle] = useState(() => delayRender(`3D model: ${file}`));
  useEffect(() => {
    new GLTFLoader().load(
      staticFile(file),
      (gltf) => setScene(gltf.scene),
      undefined,
      (err) => cancelRender(err),
    );
  }, [file]);
  // Model sahneye yerleştikten sonra karenin çekilmesine izin ver
  useEffect(() => {
    if (scene) continueRender(handle);
  }, [scene, handle]);
  return scene;
};

export const Deneme3D: React.FC = () => {
  const { width, height, fps } = useVideoConfig();
  const words = wordsFor(DENEME_3D_VOICE, null);
  // Model 3D tuvalin dışında yüklenir (tuvalin içi ayrı bir React kökü)
  const model = useModel("3d/kadin.glb");
  const w = (k: number) => Math.round((words[Math.min(k, words.length - 1)]?.start ?? 0) * fps);
  return (
    <AbsoluteFill style={{ backgroundColor: "#d9c29a", fontFamily }}>
      {/* Tuval, model yüklendikten sonra kurulur: ilk kare model hazırken çekilir */}
      {model ? (
        <ThreeCanvas width={width} height={height} shadows gl={{ preserveDrawingBuffer: true }}>
          <Stage w={w} model={model} />
        </ThreeCanvas>
      ) : null}
      {/* sıcak ton ve köşe kararması: çizimli serinin renk dünyasıyla uyum */}
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 42%, rgba(0,0,0,0) 55%, rgba(70,45,20,0.55) 100%)" }} />
      <AbsoluteFill style={{ backgroundColor: "rgba(255,200,130,0.08)", mixBlendMode: "multiply" }} />
      <Captions words={words} />
    </AbsoluteFill>
  );
};

type V3 = [number, number, number];
type Plan = { t: number; pos: [V3, V3]; look: [V3, V3] };

const Stage: React.FC<{ w: (i: number) => number; model: THREE.Group }> = ({ w, model }) => {
  const f = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const { camera } = useThree();

  // Karakter: boyu 1.68 m, ayakları zeminde. Göbek ~1.0 m, ağız ~1.52 m.
  const person = useMemo(() => {
    if (!model) return null;
    const p = SkeletonUtils.clone(model) as THREE.Group;
    // Model zaten metre ölçüsünde (iskelet uygulanınca boy 1.66 m); kutu hesabı deri kemiklerini görmez
    p.scale.multiplyScalar(1.68 / 1.66);
    p.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
      }
    });
    return p;
  }, [model]);

  // Poz: kollar yanlarda, hafif nefes ve salınım; nefes verirken omuzlar düşer
  const exhale = tw(f, w(4), w(4) + 12) * (1 - tw(f, w(7), d));
  if (person) {
    const bone = (n: string) => person.getObjectByName(n);
    const set = (n: string, x: number, y: number, z: number) => bone(n)?.rotation.set(x, y, z);
    const breathe = Math.sin(f / 22) * 0.02;
    set("mixamorigLeftArm", 1.15, 0, 0.05);
    set("mixamorigRightArm", 1.15, 0, -0.05);
    set("mixamorigLeftForeArm", 0, 0, 0.15);
    set("mixamorigRightForeArm", 0, 0, -0.15);
    set("mixamorigSpine", 0.02 + breathe, 0, Math.sin(f / 40) * 0.015);
    set("mixamorigSpine2", -breathe * 1.5 + exhale * 0.06, 0, 0);
    set("mixamorigHead", 0.05 - exhale * 0.08 + tw(f, w(1), w(2)) * 0.25 * (1 - tw(f, w(3), w(4))), 0, 0);
  }

  // Kamera planları: kelimelerde sert kesme, plan içinde yavaş kayma
  const plans: Plan[] = [
    { t: 0, pos: [[0, 1.05, 4.4], [0, 1.0, 3.6]], look: [[0, 0.95, 0], [0, 0.95, 0]] },
    { t: w(1), pos: [[0.05, 1.1, 1.0], [0.05, 1.08, 0.8]], look: [[0, 1.08, 0], [0, 1.08, 0]] },
    { t: w(3), pos: [[0, 1.25, 1.0], [0, 1.4, 0.95]], look: [[0, 1.2, 0], [0, 1.38, 0]] },
    { t: w(4) + 2, pos: [[-0.05, 1.42, 1.0], [0.1, 1.48, 1.2]], look: [[0.08, 1.4, 0], [0.2, 1.46, 0]] },
    { t: w(6), pos: [[0.4, 1.2, 3.0], [0, 1.1, 3.8]], look: [[0.2, 1.2, 0], [0, 1.0, 0]] },
  ];
  let i = 0;
  plans.forEach((p, j) => {
    if (f >= p.t) i = j;
  });
  const pl = plans[i];
  const next = plans[i + 1]?.t ?? d;
  const p = Easing.inOut(Easing.quad)(Math.min(1, Math.max(0, (f - pl.t) / Math.max(1, next - pl.t))));
  const mix = (a: V3, b: V3) => a.map((v, j) => v + (b[j] - v) * p) as V3;
  camera.position.set(...mix(...pl.pos));
  camera.lookAt(new THREE.Vector3(...mix(...pl.look)));
  (camera as THREE.PerspectiveCamera).fov = 35;
  camera.updateProjectionMatrix();

  // Yağ: göbekte röntgen gibi parlayan katman; bir topak ayrılıp ağza yükselir, nefesle bulut olarak çıkar
  const fatO = tw(f, w(1) - 4, w(1) + 6) * (1 - 0.6 * tw(f, w(4), w(7)));
  const rise = tw(f, w(2), w(4) + 2);
  const blobPos: V3 = [0, 1.08 + 0.29 * rise, 0.17 - 0.02 * rise];
  const puffs = [0, 1, 2]
    .map((k) => (f - (w(4) + 2 + k * 24)) / 60)
    .map((q, k) => ({ q, k }))
    .filter(({ q }) => q >= 0 && q <= 1);

  return (
    <>
      <color attach="background" args={["#d9c29a"]} />
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
      {person ? <primitive object={person} /> : null}
      {fatO > 0.01
        ? FAT.map(([x, y, r], j) => (
            <mesh key={j} position={[x, 1.08 + y, 0.13]} renderOrder={2}>
              <sphereGeometry args={[r, 20, 16]} />
              <meshStandardMaterial color="#f0c24b" emissive="#d99a1a" emissiveIntensity={0.5} transparent opacity={0.8 * fatO} depthTest={false} />
            </mesh>
          ))
        : null}
      {rise > 0 && rise < 1 ? (
        <mesh position={blobPos} renderOrder={3}>
          <sphereGeometry args={[0.035 * (1 - 0.4 * rise), 24, 18]} />
          <meshStandardMaterial color="#ffd35a" emissive="#f2a91c" emissiveIntensity={0.9} depthTest={false} transparent />
        </mesh>
      ) : null}
      {puffs.map(({ q, k }) => {
        const e = 1 - (1 - q) * (1 - q);
        const o = interpolate(q, [0, 0.12, 0.7, 1], [0, 0.85, 0.7, 0]);
        return (
          <group key={k} position={[0.03 + 0.45 * e, 1.37 + 0.22 * e - k * 0.03, 0.16 + 0.2 * e]} scale={0.015 + 0.075 * e}>
            {[
              [0, 0, 0, 1],
              [-0.8, -0.3, 0, 0.7],
              [0.8, -0.25, 0.1, 0.75],
              [0.1, 0.55, -0.1, 0.75],
            ].map(([x, y, z, r], j) => (
              <mesh key={j} position={[x, y, z]}>
                <sphereGeometry args={[r, 18, 14]} />
                <meshStandardMaterial color="#e6e3dc" transparent opacity={o} roughness={1} />
              </mesh>
            ))}
          </group>
        );
      })}
    </>
  );
};

const FAT: V3[] = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + i;
  const r = 0.03 + ((i * 37) % 10) / 100;
  return [Math.cos(a) * r, Math.sin(a) * r * 0.55, 0.018 + ((i * 13) % 5) / 400];
});

// Basit güneşli oda: parke zemin, duvar, pencere ışığı, bitki ve dambıl
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
  </group>
);
