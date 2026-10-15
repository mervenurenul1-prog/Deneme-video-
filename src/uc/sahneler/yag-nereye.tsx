// Video: "Verdiğin yağ nereye gidiyor?" (uc-01-yag-nereye)
import { Easing, interpolate, random, useCurrentFrame } from "remotion";
import { Cross, HandText } from "../../cizim/Cizim";
import { handFamily } from "../../fonts";
import { tw, pop, cycles, mix3, add3, FAT, WATER, RED, REST_ARM, Ball, FatLayer, Drop3, Puff3, Lungs3, Glow, Star3, MICRO, MICRO_CELLS, WIDE, WIDE_LOOK, plan, faceCam, jog, A0 } from "../kit";
import type { Def, OverlayProps } from "../kit";

export const DEFS: Record<string, Def> = {
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

export const OVERLAYS: Record<string, React.FC<OverlayProps>> = {
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
