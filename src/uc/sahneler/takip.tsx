// Video: "Neden hep 2. haftada bırakıyoruz?" (uc-03-takip)
import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { HandText } from "../../cizim/Cizim";
import { handFamily } from "../../fonts";
import { A0, add3, faceCam, jog, mix3, plan, pop, REST_ARM, tw, WIDE, WIDE_LOOK } from "../kit";
import type { Def, OverlayProps, Pose, V3 } from "../kit";
import { TEXTURES } from "../model";

// Kanepeye oturmuş, omuzları düşük
const SIT: Pose = { legL: [1.5, -1.5], legR: [1.5, -1.5], bob: -0.47, spine: 0.3, chest: 0.1, head: [0.35, 0, 0] };
const sitMix = (p: number, base: Pose = {}): Pose => ({
  ...base,
  legL: [1.5 * p, -1.5 * p],
  legR: [1.5 * p, -1.5 * p],
  bob: (base.bob ?? 0) * (1 - p) + SIT.bob! * p,
  spine: (base.spine ?? 0) * (1 - p) + SIT.spine! * p,
  chest: SIT.chest! * p,
  head: mix3(base.head ?? [0.05, 0, 0], SIT.head!, p),
  armL: mix3(base.armL ?? REST_ARM, [1.3, 0.5, 0.6], p),
  armR: mix3(base.armR ?? REST_ARM, [1.3, 0.5, 0.6], p),
});

// Çömelme (squat): tekrar tekrar
const squat = (f: number, on: number): Pose => {
  const k = on * (0.5 - 0.5 * Math.cos(f / 6));
  return {
    legL: [1.3 * k, -1.9 * k],
    legR: [1.3 * k, -1.9 * k],
    bob: -0.32 * k,
    spine: 0.45 * k,
    armL: mix3(REST_ARM, [0.1, 0.9, 0.2], k),
    armR: mix3(REST_ARM, [0.1, 0.9, 0.2], k),
    head: [-0.2 * k, 0, 0],
  };
};

const Couch: React.FC = () => (
  <group position={[0, 0, -0.32]}>
    <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.5, 0.44, 0.6]} />
      <meshStandardMaterial color="#6f8f8a" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.62, -0.25]} castShadow>
      <boxGeometry args={[1.5, 0.5, 0.15]} />
      <meshStandardMaterial color="#5f7f7a" roughness={0.9} />
    </mesh>
    {[-0.75, 0.75].map((x) => (
      <mesh key={x} position={[x, 0.36, 0]} castShadow>
        <boxGeometry args={[0.14, 0.5, 0.6]} />
        <meshStandardMaterial color="#5f7f7a" roughness={0.9} />
      </mesh>
    ))}
  </group>
);

// Motivasyon göstergesi: başın üstünde, yeşilden kırmızıya boşalan pil
const Battery: React.FC<{ at: V3; level: number; o: number }> = ({ at, level, o }) => {
  const col = new THREE.Color("#d8452f").lerp(new THREE.Color("#5cc85a"), level).getStyle();
  return o > 0.01 ? (
    <group position={at} scale={o}>
      <mesh renderOrder={3}>
        <boxGeometry args={[0.34, 0.13, 0.02]} />
        <meshBasicMaterial color="#3a2716" depthTest={false} transparent />
      </mesh>
      <mesh position={[0.185, 0, 0]} renderOrder={3}>
        <boxGeometry args={[0.03, 0.06, 0.02]} />
        <meshBasicMaterial color="#3a2716" depthTest={false} transparent />
      </mesh>
      <mesh position={[0, 0, 0.011]} renderOrder={4}>
        <boxGeometry args={[0.31, 0.1, 0.005]} />
        <meshBasicMaterial color="#f6efe0" depthTest={false} transparent />
      </mesh>
      <mesh position={[-0.155 + 0.155 * level, 0, 0.016]} scale={[Math.max(0.001, level), 1, 1]} renderOrder={5}>
        <boxGeometry args={[0.31, 0.1, 0.005]} />
        <meshBasicMaterial color={col} depthTest={false} transparent />
      </mesh>
    </group>
  ) : null;
};

// Gün kutuları: alışkanlık zinciri (her tekrar bir tik)
const useCheckTex = (n: number, done: boolean) =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const x = c.getContext("2d")!;
    x.fillStyle = "#f6efe0";
    x.fillRect(0, 0, 128, 128);
    x.strokeStyle = "#3a2716";
    x.lineWidth = 6;
    x.strokeRect(5, 5, 118, 118);
    x.fillStyle = "#3a2716";
    x.font = `700 30px ${handFamily}`;
    x.textAlign = "left";
    x.fillText(`${n}`, 14, 36);
    if (done) {
      x.strokeStyle = "#3f9a3a";
      x.lineWidth = 14;
      x.lineCap = "round";
      x.beginPath();
      x.moveTo(34, 70);
      x.lineTo(56, 94);
      x.lineTo(98, 40);
      x.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [n, done]);
const DayBox: React.FC<{ n: number; at: V3; done: boolean; s: number }> = ({ n, at, done, s }) => {
  const tex = useCheckTex(n, done);
  return (
    <mesh position={at} scale={s}>
      <planeGeometry args={[0.16, 0.16]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
};
const dayAt = (i: number): V3 => [-0.95 + (i % 7) * 0.2, 2.15 - Math.floor(i / 7) * 0.2, -1.1];

// Telefon: ekranında VOOM koç sohbeti (uygulama ekran görüntüsü)
const Phone: React.FC<{ at: V3; rot: V3; s?: number; file: string }> = ({ at, rot, s = 1, file }) => {
  const tex = TEXTURES.get(file) ?? null;
  return (
    <group position={at} rotation={rot} scale={s}>
      <mesh castShadow>
        <boxGeometry args={[0.08, 0.165, 0.009]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.4} />
      </mesh>
      {tex ? (
        <mesh position={[0, 0, 0.0047]}>
          <planeGeometry args={[0.074, 0.15]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
};
const PHONE: V3 = [0.12, 1.25, 0.32];
const PhoneCam = (t: number) =>
  plan(t, [add3(PHONE, [0.02, 0.02, 0.38]), add3(PHONE, [0.01, 0.01, 0.3])], [PHONE, PHONE]);

export const DEFS: Record<string, Def> = {
  // "Spora başlıyorsun. İlk hafta harikasın. İkinci hafta bir bakmışsın, bırakmışsın."
  "takip-acilis": {
    pose: ({ f, w }) => {
      const run = 1 - tw(f, w(5), w(6));
      const sit = tw(f, w(7), w(9));
      return sitMix(sit, jog(f, run));
    },
    cam: ({ w }) => [
      plan(0, WIDE, WIDE_LOOK),
      plan(w(2), [[0.3, 0.7, 1.5], [0.25, 0.65, 1.3]], [[0, 0.55, 0], [0, 0.55, 0]]),
      plan(w(5), [[0.6, 1.3, 2.4], [0.5, 1.2, 2.8]], [[0, 1.0, 0], [0, 0.9, 0]]),
      plan(w(9), [[0.1, 0.92, 0.95], [0.05, 0.9, 0.85]], [[0, 1.02, 0.15], [0, 1.02, 0.15]]),
    ],
    fx: ({ f, w }) => (
      <>
        <Couch />
        {/* takvim: ilk günler tikli, sonra boş */}
        {Array.from({ length: 14 }, (_, i) => {
          const s = pop(f, i * 2, 8);
          const done = i < 7 ? f > w(2) + i * 3 : false;
          return s > 0 ? <DayBox key={i} n={i + 1} at={dayAt(i)} done={done} s={s} /> : null;
        })}
      </>
    ),
  },

  // "Çünkü ilk heves motivasyonla gider. Motivasyon da birkaç günde düşer. Bu çok normal, sorun sende değil."
  "takip-motivasyon": {
    pose: ({ f, w }) => {
      const lift = tw(f, w(10), w(13));
      return { ...SIT, head: [0.35 - 0.4 * lift, 0, 0], spine: 0.3 - 0.15 * lift };
    },
    cam: ({ w }) => [
      plan(0, [[0, 1.4, 2.2], [0, 1.45, 2.0]], [[0, 1.25, 0], [0, 1.3, 0]]),
      plan(w(5), [[0.3, 1.25, 1.5], [0.2, 1.25, 1.3]], [[0, 1.2, 0], [0, 1.2, 0]]),
      faceCam(w(10), { ...A0, head: [0, 1.13, 0.05] }, 0.05, 1.0),
    ],
    fx: ({ f, w, a }) => {
      const level = 1 - tw(f, w(5), w(9) + 6);
      return (
        <>
          <Couch />
          <Battery at={add3(a.head, [0, 0.32, 0])} level={level} o={pop(f, w(2), 10) * (1 - tw(f, w(10), w(10) + 6))} />
        </>
      );
    },
  },

  // "Seni salona götüren şey motivasyon değil, alışkanlık. O da ancak tekrar ede ede oturur."
  "takip-aliskanlik": {
    pose: ({ f, w }) => {
      const up = tw(f, 0, 12);
      const sq = tw(f, w(6) - 4, w(6) + 4);
      if (up < 1) return sitMix(1 - up);
      return squat(f - w(6), sq);
    },
    cam: ({ w }) => [
      plan(0, [[0.5, 1.2, 3.4], [0.3, 1.15, 3.2]], [[0, 1.0, 0], [0, 1.0, 0]]),
      plan(w(6), [[1.2, 0.9, 2.2], [1.0, 0.85, 2.0]], [[0, 0.75, 0], [0, 0.7, 0]]),
      plan(w(10), [[0.3, 1.7, 2.6], [0.2, 1.8, 2.3]], [[-0.3, 1.9, -1.1], [-0.3, 1.95, -1.1]]),
    ],
    fx: ({ f, w }) => {
      const reps = Math.max(0, Math.floor((f - w(6)) / 12.6) + 1);
      return (
        <>
          <Couch />
          {Array.from({ length: 14 }, (_, i) => (
            <DayBox key={i} n={i + 1} at={dayAt(i)} done={i < Math.min(14, reps * 2)} s={1} />
          ))}
        </>
      );
    },
  },

  // "Asıl sır şu: biri seni takip edince bırakmak zorlaşır. Hesap verdiğin biri olunca devam edersin."
  "takip-takip": {
    pose: ({ f, w }) => {
      const hold = tw(f, w(3) - 6, w(3) + 4) * (1 - tw(f, w(12), w(12) + 6));
      const run = tw(f, w(13), w(13) + 8);
      const base = run > 0 ? jog(f, run) : {};
      return {
        ...base,
        armR: run > 0 ? base.armR : mix3(REST_ARM, [0.9, 1.2, 1.9], hold),
        head: [0.05 + 0.25 * hold, -0.15 * hold, 0],
      };
    },
    cam: ({ w }) => [
      faceCam(0, A0, 0.08, 0.95),
      PhoneCam(w(3)),
      plan(w(9), [[-0.6, 1.5, 1.3], [-0.5, 1.45, 1.15]], [[0.05, 1.3, 0.1], [0.05, 1.3, 0.1]]),
      plan(w(13), WIDE, WIDE_LOOK),
    ],
    fx: ({ f, w }) => {
      const show = pop(f, w(3) - 6, 10) * (1 - tw(f, w(12), w(12) + 6));
      return (
        <>
          <Couch />
          {show > 0 ? <Phone at={PHONE} rot={[-0.15, -0.35, 0.05]} s={show} file="app/koc.jpg" /> : null}
        </>
      );
    },
  },

  // "VOOM'da koçun seni takip eder. Bu sefer bırakmak yok. Kaydet, bırakmak üzereyken tekrar izle."
  "takip-voom": {
    pose: ({ f, w }) => {
      const cheer = tw(f, w(9) - 3, w(9) + 8);
      if (cheer > 0) return { armR: mix3(REST_ARM, [-0.9, 0.3, 0.3], cheer), head: [0, 0, 0] };
      return jog(f, 1);
    },
    cam: ({ w }) => [
      plan(0, [[0.04, 1.3, 0.55], [0.03, 1.3, 0.45]], [[0.03, 1.3, 0.2], [0.03, 1.3, 0.2]]),
      plan(w(5), WIDE, WIDE_LOOK),
      plan(w(9), [[-0.35, 1.1, 3.4], [-0.35, 1.05, 3.8]], [[-0.3, 1.0, 0], [-0.3, 1.0, 0]]),
    ],
    fx: ({ f, w }) => (
      <>
        <Couch />
        {f < w(5) ? <Phone at={[0.03, 1.3, 0.2]} rot={[0, 0, 0]} s={1.4} file="app/bugun.jpg" /> : null}
        {Array.from({ length: 14 }, (_, i) => (
          <DayBox key={i} n={i + 1} at={dayAt(i)} done s={1} />
        ))}
      </>
    ),
  },
};

export const OVERLAYS: Record<string, React.FC<OverlayProps>> = {
  "takip-voom": ({ w }) => {
    const f = useCurrentFrame();
    const save = pop(f, w(9), 14);
    return (
      <>
        {f >= w(5) && f < w(9) ? <HandText x={540} y={380} text="14 / 14" size={150} p={tw(f, w(5), w(5) + 10)} color="#3f9a3a" /> : null}
        {save > 0 ? (
          <g transform={`translate(230 820) scale(${save}) rotate(-6)`}>
            <path d="M-70 -95 L70 -95 L70 100 L0 50 L-70 100 Z" fill="#ffd23f" stroke="#3a2716" strokeWidth={10} strokeLinejoin="round" />
            <text x={0} y={175} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={80} fill="#3a2716">
              kaydet
            </text>
          </g>
        ) : null}
      </>
    );
  },
};
