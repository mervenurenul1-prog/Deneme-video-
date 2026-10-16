// Video: "Bir gecede 1 kilo mu aldın?" (uc-02-tarti)
import { interpolate, random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { HandText } from "../../cizim/Cizim";
import { handFamily } from "../../fonts";
import { A0, add3, useScreen, Ball, cycles, Drop3, faceCam, FAT, Glow, MICRO, mix3, plan, pop, REST_ARM, RED, tw, WATER } from "../kit";
import type { Def, OverlayProps, V3 } from "../kit";

const ON_SCALE = 0.05; // tartının üstündeyken karakterin yüksekliği
const DISPLAY: V3 = [0, 0.052, 0.17]; // tartı ekranı (üst yüzeyin ön kısmı)

const BathScale: React.FC<{ value: string }> = ({ value }) => {
  const tex = useScreen([value]);
  return (
    <group>
      <mesh position={[0, 0.025, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 0.05, 0.42]} />
        <meshStandardMaterial color="#ece7dc" roughness={0.3} metalness={0.05} />
      </mesh>
      <mesh position={DISPLAY} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.13, 0.057]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};

// Ekrandaki değer: sahneye göre sabit, sayarak ya da titreyerek değişir
const flicker = (f: number, vals: string[], every = 4) => vals[Math.floor(f / every) % vals.length];

const StandOnScale = (extra: Partial<ReturnType<Def["pose"]>> = {}) => ({ bob: ON_SCALE, ...extra });

// Yemek tabaklarından kule (7.700 kalori)
const FOODS = ["#9a5a2c", "#e0b040", "#c4452f", "#7a9a3a", "#d98b3a"];
const Plates: React.FC<{ n: number; at: V3; wobble: number }> = ({ n, at, wobble }) => (
  <group position={at} rotation={[0, 0, wobble]}>
    {Array.from({ length: Math.floor(n) }, (_, i) => (
      <group key={i} position={[Math.sin(i * 1.7) * 0.012, 0.03 + i * 0.062, Math.cos(i * 1.3) * 0.012]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.14, 0.12, 0.014, 28]} />
          <meshStandardMaterial color="#f5f1ea" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.02, 0]} scale={[1, 0.45, 1]}>
          <sphereGeometry args={[0.085, 18, 12]} />
          <meshStandardMaterial color={FOODS[i % FOODS.length]} roughness={0.7} />
        </mesh>
      </group>
    ))}
  </group>
);

// Kas içindeki karbonhidrat (glikojen) taneleri ve etrafındaki su
const GRAINS: V3[] = [
  [-0.55, 0.3, 0],
  [0.5, 0.35, -0.1],
  [0, -0.05, 0.1],
  [-0.45, -0.5, 0],
  [0.45, -0.45, 0],
];

// Haftalık tartı panelleri
const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const WEIGHTS = ["60.6", "61.2", "60.1", "60.8", "61.0", "60.3", "60.7"];
const DayPanel: React.FC<{ i: number; s: number }> = ({ i, s }) => {
  const tex = useScreen([DAYS[i], WEIGHTS[i]], 256, 176, "#f6efe0", "#3a2716");
  return (
    <mesh position={[-0.72 + i * 0.24, 2.05, -1.0]} scale={s * 0.82}>
      <planeGeometry args={[0.26, 0.18]} />
      <meshBasicMaterial map={tex} toneMapped={false} transparent />
    </mesh>
  );
};

const DisplayCam = (t: number): ReturnType<typeof plan> =>
  plan(t, [add3(DISPLAY, [0.02, 0.5, 0.42]), add3(DISPLAY, [0, 0.42, 0.34])], [DISPLAY, DISPLAY]);
const BELLY = add3(A0.belly, [0, ON_SCALE, 0]);
const FACE = { ...A0, head: add3(A0.head, [0, ON_SCALE, 0]) };

export const DEFS: Record<string, Def> = {
  // "Dün akşam her şey normaldi. Bu sabah tartıya çıktın ve bir kilo fazla."
  "tarti-acilis": {
    pose: ({ f, w }) => {
      const look = tw(f, w(7), w(8)) * (1 - tw(f, w(12) - 2, w(12) + 3));
      const shock = tw(f, w(12) - 2, w(12) + 6);
      return StandOnScale({
        head: [0.5 * look - 0.1 * shock, 0, 0],
        armL: mix3(REST_ARM, [0.3, 0.8, 2.0], shock),
        armR: mix3(REST_ARM, [0.3, 0.8, 2.0], shock),
      });
    },
    cam: ({ w }) => [
      plan(0, [[0.6, 1.2, 4.2], [0.3, 1.1, 3.6]], [[0, 1.0, 0], [0, 0.95, 0]]),
      plan(w(5), [[0.2, 0.45, 1.3], [0.15, 0.4, 1.1]], [[0, 0.15, 0], [0, 0.12, 0]]),
      DisplayCam(w(9)),
      faceCam(w(12), FACE, 0, 1.1),
    ],
    fx: ({ f, w }) => {
      const v = f < w(8) ? "--.-" : f < w(11) ? flicker(f, ["58.7", "60.3", "59.4", "61.2", "60.6"], 3) : "61.0";
      return <BathScale value={v} />;
    },
  },

  // "Panik yapma. O bir kilo yağ değil."
  "tarti-panik": {
    pose: ({ f }) => StandOnScale({ head: [0.05, 0, 0.06 * Math.sin(f / 30)], armL: [1.1, 0.7, 0.9], armR: [1.1, 0.7, 0.9] }),
    cam: ({ w }) => [faceCam(0, FACE, 0.1, 1.2), plan(w(2), [add3(BELLY, [0, 0, 0.75]), add3(BELLY, [0, 0, 0.6])], [BELLY, BELLY])],
    fx: ({ f, w, a }) => {
      // göbekte "1 kilo" topak: önce yağ gibi sarı, "yağ değil" derken suya (maviye) döner
      const show = pop(f, w(3), 10);
      const toWater = tw(f, w(6) - 2, w(6) + 10);
      const col = new THREE.Color(FAT).lerp(new THREE.Color(WATER), toWater).getStyle();
      return (
        <>
          <BathScale value="61.0" />
          {show > 0 ? <Ball p={add3(a.belly, [0, 0, 0.06])} r={0.045 * show} color={col} glow={0.3} front o={0.95} /> : null}
          {toWater > 0.5
            ? cycles(f, w(6) + 6, 4, 18).map(({ k, p }) => (
                <Drop3 key={k} p={add3(a.belly, [Math.cos(k) * 0.1 * p, -0.05 - 0.2 * p, 0.08])} s={1.2} o={1 - p} front />
              ))
            : null}
        </>
      );
    },
  },

  // "Bir kilo yağ için yaklaşık yedi bin yedi yüz kalori fazla yemen gerekir. Tek gecede mi? Neredeyse imkânsız."
  "tarti-kalori": {
    pose: ({ f, w }) => {
      const up = tw(f, w(6), w(12));
      const doubt = tw(f, w(13), w(13) + 8);
      return StandOnScale({ head: [-0.35 * up * (1 - doubt), 0.25 * up * (1 - doubt), 0.15 * doubt] });
    },
    cam: ({ w }) => [
      plan(0, [[0.3, 1.3, 2.4], [0.4, 1.25, 2.6]], [[0.2, 1.15, 0], [0.25, 1.1, 0]]),
      plan(w(4), [[1.2, 0.9, 3.4], [1.3, 1.4, 3.6]], [[0.4, 0.8, 0], [0.4, 1.4, 0]]),
      plan(w(9), [[0.9, 2.0, 2.6], [1.0, 2.2, 2.4]], [[0.5, 1.8, 0], [0.55, 2.0, 0]]),
      faceCam(w(13), FACE, -0.1, 1.1),
      plan(w(16), [[0.5, 1.1, 4.4], [0.4, 1.1, 4.0]], [[0.3, 1.1, 0], [0.3, 1.0, 0]]),
    ],
    fx: ({ f, w }) => {
      const n = 32 * tw(f, w(4), w(12));
      const fall = tw(f, w(16), w(16) + 14);
      return (
        <>
          <BathScale value="61.0" />
          {fall < 1 ? <Plates n={n} at={[0.62, 0, 0.15]} wobble={Math.sin(f / 9) * 0.01 + fall * 0.5} /> : null}
          {/* devrilen kule: tabaklar dağılır */}
          {fall > 0.5
            ? Array.from({ length: 10 }, (_, i) => (
                <mesh key={i} position={[0.8 + random(`x${i}`) * 0.8, 0.02, 0.3 + random(`z${i}`) * 0.6 - 0.3]} rotation={[0, random(`r${i}`) * 3, 0]}>
                  <cylinderGeometry args={[0.14, 0.12, 0.014, 24]} />
                  <meshStandardMaterial color="#f5f1ea" />
                </mesh>
              ))
            : null}
        </>
      );
    },
  },

  // "Asıl sebep su. Kasların karbonhidrat depolarken yanında üç katı su tutar."
  "tarti-su": {
    pose: () => StandOnScale({ head: [0.1, 0, 0] }),
    cam: ({ w }) => [
      faceCam(0, FACE, 0.05, 1.0),
      plan(w(2), [[0.25, 0.85, 1.4], [0.2, 0.8, 1.25]], [[0, 0.72, 0], [0, 0.7, 0]]),
      plan(w(3), [add3(MICRO, [0, 0, 4.6]), add3(MICRO, [0, 0, 4.0])], [MICRO, MICRO]),
    ],
    fx: ({ f, w, a }) => {
      const legs = tw(f, w(2) - 2, w(2) + 8);
      return (
        <>
          <BathScale value="61.0" />
          {legs > 0 ? (
            <>
              <Glow a={a.hipL} b={a.kneeL} r={0.05} o={0.5 * legs} color="#3a8fd0" />
              <Glow a={a.hipR} b={a.kneeR} r={0.05} o={0.5 * legs} color="#3a8fd0" />
            </>
          ) : null}
          {GRAINS.map((g, i) => {
            const at = add3(MICRO, g);
            const s = pop(f, w(4) + i * 3, 10);
            const wob = Math.sin(f / 7 + i) * 0.02;
            return (
              <group key={i}>
                {s > 0 ? (
                  <mesh position={add3(at, [0, wob, 0])} scale={s}>
                    <icosahedronGeometry args={[0.17, 1]} />
                    <meshStandardMaterial color="#c9822f" roughness={0.6} flatShading />
                  </mesh>
                ) : null}
                {[0, 1, 2].map((k) => {
                  const ws = pop(f, w(7 + k), 8);
                  const ang = (k / 3) * Math.PI * 2 + i;
                  return ws > 0 ? <Drop3 key={k} p={add3(at, [Math.cos(ang) * 0.27, Math.sin(ang) * 0.27 + wob, 0.05])} s={8 * ws} /> : null;
                })}
              </group>
            );
          })}
        </>
      );
    },
  },

  // "Tuzlu bir akşam yemeği yedin mi, vücudun o suyu bırakmaz."
  "tarti-tuz": {
    pose: ({ f, w }) => StandOnScale({ head: [0.12 * (1 - tw(f, w(6), w(6) + 8)), 0, 0] }),
    cam: ({ w }) => [
      plan(0, [[0.75, 1.2, 1.0], [0.7, 1.15, 0.9]], [[0.6, 0.85, 0.35], [0.6, 0.83, 0.35]]),
      plan(w(6), [[0.2, 1.1, 2.6], [0, 1.05, 2.9]], [[0, 0.95, 0], [0, 0.95, 0]]),
    ],
    fx: ({ f, w, a }) => {
      const hold = tw(f, w(6), w(9));
      return (
        <>
          <BathScale value="61.0" />
          {/* küçük masa, tabak ve tuzluk */}
          <group position={[0.6, 0, 0.35]}>
            <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.42, 0.04, 0.42]} />
              <meshStandardMaterial color="#8a5a36" roughness={0.7} />
            </mesh>
            {[
              [-0.17, -0.17],
              [0.17, -0.17],
              [-0.17, 0.17],
              [0.17, 0.17],
            ].map(([x, z], i) => (
              <mesh key={i} position={[x, 0.35, z]}>
                <cylinderGeometry args={[0.018, 0.018, 0.7, 10]} />
                <meshStandardMaterial color="#6e4a32" />
              </mesh>
            ))}
            <mesh position={[0, 0.75, 0]}>
              <cylinderGeometry args={[0.14, 0.12, 0.014, 28]} />
              <meshStandardMaterial color="#f5f1ea" />
            </mesh>
            <mesh position={[0, 0.77, 0]} scale={[1, 0.4, 1]}>
              <sphereGeometry args={[0.09, 18, 12]} />
              <meshStandardMaterial color="#c47a3a" />
            </mesh>
            <group position={[0.02, 0.98, 0]} rotation={[0, 0, 2.6 + Math.sin(f / 3) * 0.12]}>
              <mesh>
                <cylinderGeometry args={[0.03, 0.035, 0.1, 18]} />
                <meshStandardMaterial color="#f2f2f2" roughness={0.2} transparent opacity={0.9} />
              </mesh>
              <mesh position={[0, 0.06, 0]}>
                <cylinderGeometry args={[0.032, 0.032, 0.025, 18]} />
                <meshStandardMaterial color="#b8b8b8" metalness={0.8} roughness={0.3} />
              </mesh>
            </group>
            {f < w(6) + 6
              ? cycles(f, 0, 1, 14).map(({ k, p }) => (
                  <Ball key={k} p={[0.02 + (random(`s${k}`) - 0.5) * 0.04, 0.92 - 0.15 * p, (random(`t${k}`) - 0.5) * 0.04]} r={0.004} color="#ffffff" />
                ))
              : null}
          </group>
          {/* vücutta tutulan su: damlalar etrafında toplanır ve kalır */}
          {hold > 0
            ? Array.from({ length: 22 }, (_, i) => {
                const base = [a.belly, a.chest, a.kneeL, a.kneeR, a.hipL, a.hipR][i % 6];
                const ang = random(`h${i}`) * Math.PI * 2 + f / 40;
                const r = 0.16 + random(`r${i}`) * 0.08;
                const s = pop(f, w(6) + i, 8);
                return s > 0 ? (
                  <Drop3 key={i} p={add3(base, [Math.cos(ang) * r, (random(`y${i}`) - 0.5) * 0.2, Math.sin(ang) * r * 0.6 + 0.05])} s={2.2 * s} o={0.85} />
                ) : null;
              })
            : null}
        </>
      );
    },
  },

  // "Regl dönemi, midendeki yemek, hatta dünkü antrenman bile tartıyı oynatır."
  "tarti-diger": {
    pose: ({ f }) => StandOnScale({ head: [0.1, 0, 0.04 * Math.sin(f / 25)] }),
    cam: ({ w }) => [
      plan(0, [add3(BELLY, [0.05, -0.08, 0.75]), add3(BELLY, [0.05, -0.08, 0.62])], [add3(BELLY, [0, -0.08, 0]), add3(BELLY, [0, -0.08, 0])]),
      plan(w(2), [add3(BELLY, [-0.05, 0.12, 0.7]), add3(BELLY, [-0.05, 0.12, 0.58])], [add3(BELLY, [0, 0.12, 0]), add3(BELLY, [0, 0.12, 0])]),
      plan(w(4), [[0.25, 0.75, 1.5], [0.2, 0.7, 1.35]], [[0, 0.6, 0], [0, 0.58, 0]]),
      DisplayCam(w(8)),
    ],
    fx: ({ f, w, a }) => {
      const regl = tw(f, 0, 6) * (1 - tw(f, w(2) - 2, w(2)));
      const food = tw(f, w(2), w(2) + 6) * (1 - tw(f, w(4) - 2, w(4)));
      const legs = tw(f, w(4), w(4) + 6) * (1 - tw(f, w(8) - 2, w(8)));
      const v = f < w(8) ? "61.0" : flicker(f, ["60.4", "61.6", "60.9", "61.3", "60.7"], 5);
      return (
        <>
          <BathScale value={v} />
          {regl > 0 ? <Ball p={add3(a.belly, [0, -0.08, 0.05])} r={0.045} color="#e58f8f" o={0.6 * regl} glow={0.5} front /> : null}
          {food > 0
            ? [0, 1, 2, 3, 4].map((i) => (
                <Ball key={i} p={add3(a.belly, [((i % 3) - 1) * 0.025, 0.06 + (i > 2 ? 0.02 : 0), 0.06])} r={0.016} color={FOODS[i]} o={food} front />
              ))
            : null}
          {legs > 0 ? (
            <>
              <Glow a={a.hipL} b={a.kneeL} r={0.05} o={0.5 * legs} color="#e04a2a" />
              <Glow a={a.hipR} b={a.kneeR} r={0.05} o={0.5 * legs} color="#e04a2a" />
            </>
          ) : null}
        </>
      );
    },
  },

  // "O yüzden tek bir güne değil, haftalık ortalamaya bak."
  "tarti-ortalama": {
    pose: ({ f, w }) => StandOnScale({ head: [-0.35 * tw(f, w(5), w(6)), 0, 0] }),
    cam: ({ w }) => [DisplayCam(0), plan(w(5), [[0, 1.25, 4.2], [0, 1.35, 3.9]], [[0, 1.5, 0], [0, 1.6, -0.5]])],
    fx: ({ f, w }) => (
      <>
        <BathScale value="61.0" />
        {DAYS.map((_, i) => {
          const s = pop(f, w(5) + i * 2, 8);
          return s > 0 ? <DayPanel key={i} i={i} s={s} /> : null;
        })}
      </>
    ),
  },

  // "Tartı yalan söylemez ama abartır. Kaydet, sonra lazım olur."
  "tarti-kapanis": {
    pose: ({ f, w }) => {
      const off = tw(f, w(5) - 2, w(5) + 8);
      const cheer = tw(f, w(6), w(6) + 8);
      return {
        bob: ON_SCALE * (1 - off) + Math.sin(off * Math.PI) * 0.04,
        z: 0.4 * off,
        legL: [0.6 * Math.sin(off * Math.PI), 0.8 * Math.sin(off * Math.PI)],
        armR: mix3(REST_ARM, [-0.9, 0.3, 0.3], cheer),
        head: [0.02, 0, 0],
      };
    },
    cam: ({ w }) => [
      faceCam(0, FACE, -0.1, 1.2),
      DisplayCam(w(3)),
      plan(w(5), [[-0.35, 1.1, 3.4], [-0.35, 1.05, 3.8]], [[-0.3, 1.0, 0], [-0.3, 1.0, 0]]),
    ],
    fx: ({ f, w }) => {
      const v = f < w(3) ? "61.0" : f < w(5) ? (Math.floor(f / 4) % 2 ? "88.8" : "99.9") : f < w(5) + 8 ? "61.0" : "0.0";
      return <BathScale value={v} />;
    },
  },
};

export const OVERLAYS: Record<string, React.FC<OverlayProps>> = {
  "tarti-acilis": ({ w }) => {
    const f = useCurrentFrame();
    return f >= w(12) ? <HandText x={760} y={520} text="+1 kg" size={170} p={tw(f, w(12), w(12) + 8)} color={RED} rotate={-6} /> : null;
  },
  "tarti-kalori": ({ w }) => {
    const f = useCurrentFrame();
    return f >= w(5) && f < w(13) ? <HandText x={330} y={460} text="7.700 kcal" size={120} p={tw(f, w(5), w(9))} color={RED} /> : null;
  },
  "tarti-su": ({ w }) => {
    const f = useCurrentFrame();
    return f >= w(8) ? <HandText x={540} y={430} text="×3 su" size={150} p={tw(f, w(8), w(8) + 10)} color={WATER} /> : null;
  },
  "tarti-ortalama": ({ w, d }) => {
    const f = useCurrentFrame();
    const o = interpolate(f, [w(7), w(7) + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return f >= w(7) ? (
      <g opacity={o}>
        <HandText x={540} y={470} text="ortalama: 60.7" size={120} p={tw(f, w(7), Math.min(d, w(7) + 16))} color={RED} />
      </g>
    ) : null;
  },
  "tarti-kapanis": ({ w }) => {
    const f = useCurrentFrame();
    const save = pop(f, w(5), 14);
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
