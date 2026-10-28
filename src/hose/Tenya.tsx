// 21 Tenya hapı — 1930'lar stili (Yunus + Duru). Sahneler `tn-*`; kelime zamanı w(i).
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { HoseChar, gestureT } from "../avatar2/Hose";
import { fontFamily, handFamily } from "../fonts";

type SceneProps = { d: number; w: (i: number) => number };

const INK = "#141010";
const PAPER = "#efe3c8";
const RED = "#c0302b";
const NAVY = "#1f3a68";
const WHITE = "#fbf7ee";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ease = Easing.inOut(Easing.cubic);
const prog = (f: number, a: number, b: number) => interpolate(f, [a, Math.max(a + 1, b)], [0, 1], { ...clamp, easing: ease });
const pop = (f: number, a: number, len = 10) => interpolate(f, [a, a + len], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.4)) });
const q2 = (f: number) => Math.floor(f / 2) * 2; // ikişer kare

// Kamera: anahtar kareler [kare, merkezX, merkezY, yakınlık]; aralar yumuşak geçer
type Key = [number, number, number, number];
const camAt = (f: number, keys: Key[]) => {
  if (f <= keys[0][0]) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (f <= b[0]) {
      const t = ease((f - a[0]) / Math.max(1, b[0] - a[0]));
      return [f, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t] as Key;
    }
  }
  return keys[keys.length - 1];
};
const Cam: React.FC<{ f: number; keys: Key[]; shake?: number; rot?: number; children: React.ReactNode }> = ({ f, keys, shake = 0, rot = 0, children }) => {
  const [, cx, cy, z] = camAt(f, keys);
  const sx = shake * Math.sin(f * 2.1) * 14;
  const sy = shake * Math.cos(f * 2.7) * 10;
  return <g transform={`translate(${540 + sx} ${900 + sy}) rotate(${rot}) scale(${z}) translate(${-cx} ${-cy})`}>{children}</g>;
};
// el konumu (HoseChar koordinatları: omuz [±62, -376])
const handAt = (x: number, y: number, s: number, arm: [number, number, number], side: 1 | -1) => [x + s * (side * 62 + arm[0]), y + s * (-376 + arm[1])];

/* ---------- mekânlar ---------- */

const Room: React.FC = () => (
  <g>
    <rect x={-800} y={-600} width={2700} height={3200} fill="#efdcb6" />
    {[...Array(30)].map((_, i) => (
      <rect key={i} x={-800 + i * 90} y={-600} width={30} height={2350} fill="#e4cb9a" />
    ))}
    <rect x={-800} y={1380} width={2700} height={40} fill="#8a5a33" stroke={INK} strokeWidth={6} />
    <rect x={-800} y={1420} width={2700} height={330} fill="#b07a44" />
    {/* pencere */}
    <g stroke={INK} strokeWidth={7}>
      <rect x={-60} y={300} width={360} height={460} fill="#cfe2e6" />
      <path d="M120 300 L120 760 M-60 530 L300 530" />
      <path d="M-110 260 Q-40 520 -100 820 L-10 820 Q20 520 -20 260 Z" fill="#a8342b" />
      <path d="M350 260 Q280 520 340 820 L250 820 Q220 520 260 260 Z" fill="#a8342b" />
      <rect x={-130} y={240} width={500} height={30} fill="#8a5a33" />
    </g>
    {/* çerçeveli resim */}
    <g stroke={INK} strokeWidth={6}>
      <rect x={760} y={360} width={240} height={290} fill="#f6ecd4" />
      <rect x={780} y={380} width={200} height={250} fill="#d7c08f" />
      <path d="M800 600 Q840 480 880 560 Q920 440 960 600 Z" fill="#8a9a6a" />
    </g>
    <rect x={-800} y={1750} width={2700} height={900} fill="#a06a3a" />
    {[1820, 1920, 2040].map((y) => (
      <path key={y} d={`M-800 ${y} L1900 ${y}`} stroke="#6e4422" strokeWidth={5} />
    ))}
  </g>
);

const Savanna: React.FC<{ f: number }> = ({ f }) => (
  <g>
    <rect x={-900} y={-700} width={2900} height={3400} fill="#f4d79a" />
    <g transform={`rotate(${f * 0.2} 820 420)`} opacity={0.35}>
      {[...Array(12)].map((_, i) => (
        <path key={i} d="M820 420 L820 -500 L960 -500 Z" fill="#f0b45a" transform={`rotate(${i * 30} 820 420)`} />
      ))}
    </g>
    <circle cx={820} cy={420} r={150} fill="#f6a640" stroke={INK} strokeWidth={7} />
    <path d="M-900 1180 Q-300 1060 200 1150 Q700 1060 1300 1140 Q1700 1100 2000 1160 L2000 2700 L-900 2700 Z" fill="#c9a25a" stroke={INK} strokeWidth={7} />
    <path d="M-900 1500 L2000 1500 L2000 2700 L-900 2700 Z" fill="#b48a44" />
    {/* akasya ağacı */}
    <g stroke={INK} strokeWidth={7}>
      <path d="M90 1180 Q70 960 40 860 M60 980 Q120 920 190 880" fill="none" strokeWidth={22} />
      <path d="M90 1180 Q70 960 40 860 M60 980 Q120 920 190 880" fill="none" stroke="#5a3a22" strokeWidth={12} />
      <path d="M-160 860 Q40 740 320 840 Q160 900 -160 860 Z" fill="#5f7a3a" />
    </g>
    {[...Array(26)].map((_, i) => (
      <path key={i} d={`M${-800 + i * 110} 1520 q10 -40 20 0 q10 -30 20 0`} stroke={INK} strokeWidth={4} fill="#a07a38" />
    ))}
  </g>
);

const Party: React.FC<{ f: number }> = ({ f }) => (
  <g>
    <rect x={-800} y={-600} width={2700} height={3200} fill="#f1dfc0" />
    {/* bayrak süsleri + ışık zinciri */}
    {[0, 1].map((r) => (
      <g key={r}>
        <path d={`M-200 ${180 + r * 160} Q540 ${330 + r * 160} 1280 ${180 + r * 160}`} stroke={INK} strokeWidth={4} fill="none" />
        {[...Array(14)].map((_, i) => {
          const t = i / 13;
          const x = -200 + 1480 * t;
          const y = 180 + r * 160 + Math.sin(Math.PI * t) * 150;
          return r === 0 ? (
            <path key={i} d={`M${x - 30} ${y} L${x + 30} ${y} L${x} ${y + 60} Z`} fill={i % 2 ? RED : NAVY} stroke={INK} strokeWidth={4} />
          ) : (
            <circle key={i} cx={x} cy={y + 14} r={14} fill={(q2(f) / 8 + i) % 3 < 1.5 ? "#ffe9a8" : "#e8c46a"} stroke={INK} strokeWidth={4} />
          );
        })}
      </g>
    ))}
    {/* masa + pasta */}
    <rect x={-800} y={1330} width={2700} height={1300} fill="#b07a44" />
    <path d="M-60 1250 L1140 1250 L1180 1420 L-100 1420 Z" fill={WHITE} stroke={INK} strokeWidth={7} />
    <g stroke={INK} strokeWidth={6}>
      <rect x={430} y={1080} width={220} height={170} rx={20} fill="#f6c8d2" />
      <rect x={470} y={960} width={140} height={120} rx={16} fill="#fbe3e8" />
      <path d="M540 960 L540 910" strokeWidth={8} />
      <path d="M540 900 q-12 -20 0 -36 q12 16 0 36" fill="#f6a640" />
    </g>
  </g>
);

/* ---------- eşyalar ---------- */

const Worm: React.FC<{ x: number; y: number; s?: number; f: number; wink?: boolean; chomp?: number; napkin?: boolean }> = ({ x, y, s = 1, f, wink, chomp = 0, napkin }) => {
  const segs = 7;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[...Array(segs)].map((_, i) => {
        const k = segs - 1 - i;
        const px = -k * 34;
        const py = Math.sin(q2(f) / 5 + k * 0.9) * 14 + k * 6;
        return <circle key={i} cx={px} cy={py} r={30 - k * 1.5} fill="#f2e6c8" stroke={INK} strokeWidth={6} />;
      })}
      {/* baş */}
      <circle cx={18} cy={-10} r={42} fill="#f6ecd2" stroke={INK} strokeWidth={6} />
      {wink ? (
        <path d="M2 -26 q12 10 22 0" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
      ) : (
        <g>
          <ellipse cx={8} cy={-24} rx={9} ry={14} fill={WHITE} stroke={INK} strokeWidth={4} />
          <ellipse cx={10} cy={-22} rx={4} ry={8} fill={INK} />
        </g>
      )}
      <ellipse cx={34} cy={-24} rx={9} ry={14} fill={WHITE} stroke={INK} strokeWidth={4} />
      <ellipse cx={36} cy={-22} rx={4} ry={8} fill={INK} />
      <path d={`M2 ${4 - chomp * 4} Q22 ${18 + chomp * 22} 44 ${2 - chomp * 4}`} stroke={INK} strokeWidth={6} fill={chomp > 0.2 ? "#4a1512" : "none"} strokeLinecap="round" />
      {napkin ? <path d="M-4 20 L40 20 L18 60 Z" fill={WHITE} stroke={INK} strokeWidth={4} /> : null}
    </g>
  );
};

// kapsül: yarısı kırmızı yarısı şeffaf (içinde kurt görünür)
const Pill: React.FC<{ x: number; y: number; s?: number; r?: number; f: number; wormIn?: boolean; wink?: boolean; glow?: number }> = ({ x, y, s = 1, r = -20, f, wormIn = true, wink, glow = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    {glow > 0 ? <ellipse cx={0} cy={0} rx={130} ry={80} fill="#ffe9a8" opacity={0.5 * glow} /> : null}
    <path d="M0 -40 L-60 -40 A40 40 0 0 0 -60 40 L0 40 Z" fill={RED} stroke={INK} strokeWidth={6} />
    <path d="M0 -40 L60 -40 A40 40 0 0 1 60 40 L0 40 Z" fill="#f7efe0" fillOpacity={0.75} stroke={INK} strokeWidth={6} />
    {wormIn ? <Worm x={44} y={6} s={0.32} f={f} wink={wink} /> : null}
    <path d="M-70 -24 Q-40 -34 -10 -30" stroke="#fff" strokeWidth={8} strokeLinecap="round" opacity={0.7} fill="none" />
  </g>
);

const Lens: React.FC<{ x: number; y: number; r?: number; children?: React.ReactNode; id: string }> = ({ x, y, r = 130, children, id }) => (
  <g>
    <path d={`M${x + r * 0.7} ${y + r * 0.7} L${x + r * 1.5} ${y + r * 1.5}`} stroke={INK} strokeWidth={34} strokeLinecap="round" />
    <path d={`M${x + r * 0.7} ${y + r * 0.7} L${x + r * 1.5} ${y + r * 1.5}`} stroke="#7a4e26" strokeWidth={20} strokeLinecap="round" />
    <clipPath id={id}>
      <circle cx={x} cy={y} r={r} />
    </clipPath>
    <circle cx={x} cy={y} r={r} fill="#fbf3dc" />
    <g clipPath={`url(#${id})`}>{children}</g>
    <circle cx={x} cy={y} r={r} fill="none" stroke={INK} strokeWidth={12} />
    <path d={`M${x - r * 0.55} ${y - r * 0.4} Q${x - r * 0.3} ${y - r * 0.7} ${x} ${y - r * 0.75}`} stroke="#fff" strokeWidth={10} fill="none" opacity={0.7} strokeLinecap="round" />
  </g>
);

const Stamp: React.FC<{ x: number; y: number; t: string; p: number; color?: string; size?: number; r?: number }> = ({ x, y, t, p, color = RED, size = 120, r = -8 }) => {
  if (p <= 0) return null;
  const k = 1.8 - 0.8 * p;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`} opacity={Math.min(1, p * 1.5)}>
      <text x={0} y={size * 0.35} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={size} fill={color} stroke={INK} strokeWidth={5} paintOrder="stroke fill" letterSpacing={4}>
        {t}
      </text>
    </g>
  );
};

const YearCard: React.FC<{ f: number; t: string; at: number; x?: number; y?: number }> = ({ f, t, at, x = 540, y = 520 }) => {
  const p = prog(f, at, at + 14);
  if (f < at) return null;
  const rot = (1 - p) * 720;
  const sc = 0.1 + 0.9 * p;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${sc})`}>
      <rect x={-260} y={-110} width={520} height={220} rx={16} fill="#f3e6c6" stroke={INK} strokeWidth={8} />
      <rect x={-240} y={-90} width={480} height={180} rx={10} fill="none" stroke={INK} strokeWidth={3} />
      <text x={0} y={40} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={120} fill={INK}>
        {t}
      </text>
    </g>
  );
};

const Burger: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={6}>
    <path d="M-70 -10 Q0 -80 70 -10 Z" fill="#d9944a" />
    <rect x={-74} y={-10} width={148} height={20} rx={8} fill="#5a3320" />
    <path d="M-76 12 L76 12 L64 26 L-64 26 Z" fill="#7ab04a" />
    <path d="M-70 26 L70 26 Q60 50 0 50 Q-60 50 -70 26 Z" fill="#d9944a" />
  </g>
);

const Cake: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={6}>
    <path d="M-60 40 L60 40 L60 -10 L-60 -40 Z" fill="#f6c8d2" />
    <path d="M-60 -40 L60 -10 L60 0 Q0 -10 -60 -26 Z" fill={WHITE} />
    <circle cx={10} cy={-40} r={12} fill={RED} />
  </g>
);

const Scale: React.FC<{ x: number; y: number; s?: number; kg: number; red?: boolean }> = ({ x, y, s = 1, kg, red }) => {
  const ang = -90 + kg * 60; // 0 kg yukarı; +1 kg sağa
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={8}>
      <rect x={-230} y={-90} width={460} height={200} rx={40} fill="#e9e2d2" />
      <circle cx={0} cy={-150} r={150} fill="#f8f3e6" />
      {[-2, -1, 0, 1, 2].map((k) => {
        const a = ((-90 + k * 60) * Math.PI) / 180;
        return (
          <g key={k}>
            <path d={`M${Math.cos(a) * 118} ${-150 + Math.sin(a) * 118} L${Math.cos(a) * 140} ${-150 + Math.sin(a) * 140}`} strokeWidth={6} />
            <text x={Math.cos(a) * 92} y={-150 + Math.sin(a) * 92 + 14} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={40} fill={k === 1 && red ? RED : INK} stroke="none">
              {k > 0 ? `+${k}` : k}
            </text>
          </g>
        );
      })}
      <path d={`M0 -150 L${Math.cos((ang * Math.PI) / 180) * 120} ${-150 + Math.sin((ang * Math.PI) / 180) * 120}`} stroke={red ? RED : INK} strokeWidth={12} strokeLinecap="round" />
      <circle cx={0} cy={-150} r={16} fill={INK} />
    </g>
  );
};

const Cow: React.FC<{ x: number; y: number; s?: number; f: number; tongue?: number }> = ({ x, y, s = 1, f, tongue = 0 }) => {
  const b = Math.abs(Math.sin(q2(f) / 8)) * 6;
  return (
    <g transform={`translate(${x} ${y - b}) scale(${s})`} stroke={INK} strokeWidth={7} strokeLinejoin="round">
      {[-110, -40, 60, 130].map((lx, i) => (
        <path key={i} d={`M${lx} 60 L${lx} 210`} strokeWidth={34} />
      ))}
      {[-110, -40, 60, 130].map((lx, i) => (
        <path key={`w${i}`} d={`M${lx} 60 L${lx} 196`} stroke={WHITE} strokeWidth={20} />
      ))}
      <ellipse cx={10} cy={0} rx={200} ry={120} fill={WHITE} />
      <path d="M-120 -60 Q-80 -100 -40 -60 Q-60 0 -120 -20 Z M40 20 Q90 -20 120 30 Q80 80 40 60 Z" fill={INK} />
      <path d="M200 -10 q40 20 30 80" fill="none" strokeWidth={8} />
      {/* baş */}
      <g transform="translate(-200 -60)">
        <path d="M-50 -70 Q-90 -110 -70 -130 M50 -70 Q90 -110 70 -130" fill="none" strokeWidth={12} />
        <ellipse cx={0} cy={0} rx={90} ry={86} fill={WHITE} />
        <ellipse cx={-30} cy={-20} rx={14} ry={22} fill={WHITE} />
        <ellipse cx={-28} cy={-16} rx={7} ry={12} fill={INK} />
        <ellipse cx={30} cy={-20} rx={14} ry={22} fill={WHITE} />
        <ellipse cx={32} cy={-16} rx={7} ry={12} fill={INK} />
        <ellipse cx={0} cy={44} rx={60} ry={36} fill="#f2a9a0" />
        <circle cx={-18} cy={44} r={7} fill={INK} />
        <circle cx={18} cy={44} r={7} fill={INK} />
        {tongue > 0 ? (
          <g transform={`translate(0 76) scale(1 ${tongue})`}>
            <path d="M-24 0 Q-30 70 0 80 Q30 70 24 0 Z" fill="#e0606a" />
            {[[-8, 36], [8, 52], [-2, 64]].map(([cx, cy], k) => (
              <circle key={k} cx={cx} cy={cy} r={6} fill={WHITE} strokeWidth={3} />
            ))}
          </g>
        ) : null}
      </g>
    </g>
  );
};

const Calendar: React.FC<{ x: number; y: number; n: number; s?: number }> = ({ x, y, n, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={7}>
    <rect x={-150} y={-170} width={300} height={340} rx={16} fill={WHITE} />
    <rect x={-150} y={-170} width={300} height={90} rx={16} fill={RED} />
    <circle cx={-80} cy={-170} r={14} fill={INK} />
    <circle cx={80} cy={-170} r={14} fill={INK} />
    <text x={0} y={-108} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={46} fill={WHITE} stroke="none">
      HAFTA
    </text>
    <text x={0} y={90} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={170} fill={INK} stroke="none">
      {n}
    </text>
  </g>
);

const Syringe: React.FC<{ x: number; y: number; s?: number; r?: number }> = ({ x, y, s = 1, r = 30 }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} stroke={INK} strokeWidth={6}>
    <rect x={-30} y={-130} width={60} height={220} rx={26} fill="#dfe8ee" />
    <rect x={-30} y={-130} width={60} height={60} rx={26} fill={NAVY} />
    <rect x={-18} y={-40} width={36} height={70} rx={8} fill="#b9d6e6" />
    <path d="M0 90 L0 140" strokeWidth={5} />
  </g>
);

const Dumbbell: React.FC<{ x: number; y: number; s?: number; r?: number }> = ({ x, y, s = 1, r = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} stroke={INK} strokeWidth={6}>
    <rect x={-70} y={-8} width={140} height={16} rx={6} fill="#8d8b87" />
    <rect x={-80} y={-36} width={30} height={72} rx={8} fill={INK} />
    <rect x={50} y={-36} width={30} height={72} rx={8} fill={INK} />
  </g>
);

// VOOM telefonu (arka planda, göze sokulmadan)
const VoomPhone: React.FC<{ x: number; y: number; s?: number; tick: number }> = ({ x, y, s = 1, tick }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={6}>
    <rect x={-90} y={-170} width={180} height={340} rx={26} fill="#2a2523" />
    <rect x={-76} y={-150} width={152} height={290} rx={14} fill="#f6efe0" />
    <text x={0} y={-110} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={30} fill={RED} stroke="none" letterSpacing={2}>
      VOOM
    </text>
    <text x={0} y={-78} textAnchor="middle" fontFamily={handFamily} fontSize={24} fill={INK} stroke="none">
      koçun
    </text>
    <rect x={-64} y={-50} width={128} height={70} rx={10} fill="#e3d6bc" strokeWidth={3} />
    <text x={0} y={-22} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={20} fill={NAVY} stroke="none">
      + Ağırlık
    </text>
    <text x={0} y={6} textAnchor="middle" fontFamily={fontFamily} fontWeight={600} fontSize={17} fill={INK} stroke="none">
      haftada 2 gün
    </text>
    {tick > 0 ? <path d={`M-20 70 l16 18 l30 -40`} stroke={NAVY} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={90} strokeDashoffset={90 * (1 - tick)} /> : null}
  </g>
);

const Hearts: React.FC<{ f: number; at: number; x: number; y: number }> = ({ f, at, x, y }) => {
  if (f < at) return null;
  return (
    <g>
      {[...Array(10)].map((_, i) => {
        const t = (f - at) / 30 + i * 0.13;
        const hx = x + Math.sin(i * 2.3) * 300 + Math.sin(t * 4 + i) * 20;
        const hy = y - (t % 1.3) * 600;
        const sc = 0.8 + (i % 3) * 0.3;
        return (
          <path key={i} transform={`translate(${hx} ${hy}) scale(${sc})`} d="M0 10 C-30 -20 -10 -40 0 -20 C10 -40 30 -20 0 10 Z" fill={i % 2 ? RED : "#e8607a"} stroke={INK} strokeWidth={4} opacity={Math.max(0, 1 - (t % 1.3))} />
        );
      })}
    </g>
  );
};

const Confetti: React.FC<{ f: number; at: number }> = ({ f, at }) => {
  if (f < at) return null;
  return (
    <g>
      {[...Array(40)].map((_, i) => {
        const t = (f - at) / 30;
        const x = ((i * 137) % 1300) - 100 + Math.sin(t * 3 + i) * 30;
        const y = -100 + ((t * 500 + i * 90) % 2200);
        return <rect key={i} x={x} y={y} width={16} height={26} fill={[RED, NAVY, "#e8c46a", "#7ab04a"][i % 4]} transform={`rotate(${t * 200 + i * 40} ${x} ${y})`} stroke={INK} strokeWidth={2} />;
      })}
    </g>
  );
};

const Banner: React.FC<{ p: number; t: string; sub?: string; y?: number }> = ({ p, t, sub, y = 300 }) => {
  if (p <= 0) return null;
  return (
    <g transform={`translate(540 ${y - (1 - p) * 500}) rotate(${(1 - p) * -10})`}>
      <rect x={-420} y={-90} width={840} height={sub ? 190 : 150} rx={24} fill="#f6ecd4" stroke={INK} strokeWidth={8} />
      <text x={0} y={-2} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={62} fill={RED} stroke={INK} strokeWidth={3} paintOrder="stroke fill">
        {t}
      </text>
      {sub ? (
        <text x={0} y={70} textAnchor="middle" fontFamily={handFamily} fontSize={54} fill={INK}>
          {sub}
        </text>
      ) : null}
    </g>
  );
};

/* ---------- sahneler ---------- */

// Duru'nun hapı tuttuğu el (yakın plan) — açılış ve kapanış aynı kareyi kullanır
const DURU1 = { x: 560, y: 2050, s: 2.5 };
const ARM_PILL: [number, number, number] = [40, -150, -60];
const PILL_AT = handAt(DURU1.x, DURU1.y, DURU1.s, ARM_PILL, 1);

// 1) Kanca: "Zayıflamak için kurt yutar mıydın?"
const TnKanca: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const back = w(3);
  return (
    <g>
      <Cam f={f} keys={[[0, PILL_AT[0], PILL_AT[1] - 20, 2.1], [back - 2, PILL_AT[0], PILL_AT[1] - 20, 2.25], [back + 10, 600, 820, 1.0]]}>
        <Room />
        <HoseChar x={DURU1.x} y={DURU1.y} s={DURU1.s} who="duru" beret armR={ARM_PILL} handR="fist" look={[1, -0.4]} face="smile" seed={9} />
        <Pill x={PILL_AT[0]} y={PILL_AT[1] - 30} s={1.2} f={f} wink={f >= w(2) && f < w(2) + 10} glow={prog(f, 0, 12)} />
        {/* büyüteç: kurt göz kırpar */}
        {f < back + 6 ? (
          <g opacity={1 - prog(f, back, back + 6)}>
            <Lens x={PILL_AT[0] + 40} y={PILL_AT[1] - 40} r={110} id="tnL1">
              <g transform={`translate(${PILL_AT[0] + 40} ${PILL_AT[1] - 40}) scale(2.4) translate(${-PILL_AT[0] - 40} ${-PILL_AT[1] + 40})`}>
                <Pill x={PILL_AT[0]} y={PILL_AT[1] - 30} s={1.2} f={f} wink={f >= w(2) && f < w(2) + 10} />
              </g>
            </Lens>
          </g>
        ) : null}
      </Cam>
    </g>
  );
};

// 2) Duru: "Asla!" — iğrenip geri sıçrar, bere havalanır, hap elinden uçar
const TnAsla: React.FC<SceneProps> = () => {
  const f = useCurrentFrame();
  const sp = interpolate(f, [0, 4, 18, 26], [0, 1, 1, 0], clamp);
  const fly = prog(f, 0, 20);
  return (
    <Cam f={f} keys={[[0, 600, 820, 1.15], [20, 600, 840, 1.08]]} shake={Math.max(0, 1 - f / 12)}>
      <Room />
      <HoseChar x={DURU1.x} y={DURU1.y} s={DURU1.s} who="duru" beret surprise={sp} talk={f < 14 ? 1 : 0} armR={[110, -60, -60]} handR="open" armL={[-110, -60, 60]} handL="open" seed={9} />
      <Pill x={PILL_AT[0] + fly * 420} y={PILL_AT[1] - 30 - Math.sin(fly * Math.PI) * 380 + fly * 200} r={-20 + fly * 540} s={1.2} f={f} />
    </Cam>
  );
};

// 3) "Yüz yıl önce bunu hap diye sattılar." — yıl kartı döner, şarlatan tezgâhı
const Stall: React.FC<{ f: number }> = ({ f }) => (
  <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
    <rect x={-800} y={-600} width={2700} height={3200} fill="#e8d3a6" />
    <path d="M-800 1500 L1900 1500 L1900 2600 L-800 2600 Z" fill="#b89058" />
    {/* çadır tezgâh */}
    <path d="M360 560 L1040 560 L1100 700 L300 700 Z" fill={RED} />
    {[0, 1, 2, 3, 4].map((i) => (
      <path key={i} d={`M${300 + i * 160} 700 q80 70 160 0`} fill={i % 2 ? WHITE : RED} />
    ))}
    <rect x={380} y={700} width={20} height={520} fill="#7a4e26" />
    <rect x={1000} y={700} width={20} height={520} fill="#7a4e26" />
    <rect x={330} y={1180} width={740} height={330} fill="#9a6a38" />
    <rect x={430} y={600} width={540} height={90} rx={10} fill="#f6ecd4" />
    <text x={700} y={665} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={60} fill={RED} stroke="none" letterSpacing={3}>
      TENYA HAPI
    </text>
    {/* şişeler */}
    {[420, 520, 620, 800, 900].map((bx, i) => (
      <g key={i} transform={`translate(${bx} ${1180 - Math.abs(Math.sin(q2(f) / 6 + i)) * 6})`}>
        <rect x={-26} y={-110} width={52} height={110} rx={10} fill={i % 2 ? "#7ab0a0" : "#c58a4a"} />
        <rect x={-12} y={-140} width={24} height={34} fill="#7a4e26" />
        <rect x={-20} y={-80} width={40} height={36} fill={WHITE} strokeWidth={3} />
      </g>
    ))}
    <Pill x={710} y={1110} s={0.9} f={f} r={0} />
  </g>
);

const TnHap: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const g = gestureT(f, w(3), w(6) + 10);
  return (
    <Cam f={f} keys={[[0, 540, 900, 1.0], [w(3), 620, 980, 1.0], [w(5) + 6, 700, 820, 1.35]]}>
      <Stall f={f} />
      <HoseChar x={250} y={1620} s={1.3} who="yunus" seed={4} talk={1} gesture="point" gT={g} look={[1, -0.3]} />
      <YearCard f={f} t="1900'LER" at={0} y={420} />
    </Cam>
  );
};

// 4) Tarih: ilan → mideye yerleşen kurt → yemeği o yer → "kurt var mıydı?"
const Stomach: React.FC<{ f: number; grow: number }> = ({ f, grow }) => (
  <g stroke={INK} strokeWidth={9}>
    <rect x={-800} y={-600} width={2700} height={3200} fill="#3a1c18" />
    <path d="M500 -100 L500 420" stroke="#e48a8a" strokeWidth={110} />
    <path d="M500 -100 L500 420" stroke={INK} strokeWidth={130} opacity={0.0} />
    <ellipse cx={540} cy={1000 + grow * 30} rx={470 + grow * 40} ry={560 + grow * 40} fill="#e48a8a" />
    <ellipse cx={540} cy={1060 + grow * 30} rx={400 + grow * 40} ry={470 + grow * 40} fill="#f2b2a8" />
    {[...Array(10)].map((_, i) => (
      <path key={i} d={`M${220 + i * 66} ${1400 + Math.sin(i + q2(f) / 6) * 12} q33 -30 66 0`} fill="none" stroke="#d07070" strokeWidth={6} />
    ))}
  </g>
);

const Newspaper: React.FC<{ f: number }> = ({ f }) => (
  <g stroke={INK} strokeWidth={6}>
    <rect x={-800} y={-600} width={2700} height={3200} fill="#2a2016" />
    <g transform="rotate(-3 540 900)">
      <rect x={80} y={180} width={920} height={1400} fill="#f1e4c2" strokeWidth={8} />
      <text x={540} y={300} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={70} fill={INK} stroke="none" letterSpacing={6}>
        GÜNÜN İLANI
      </text>
      <path d="M120 330 L960 330 M120 345 L960 345" strokeWidth={4} />
      {[0, 1].map((c) => [...Array(16)].map((_, r) => <path key={`${c}${r}`} d={`M${130 + c * 640} ${400 + r * 70} l200 0`} strokeWidth={5} opacity={0.5} />))}
      <rect x={340} y={380} width={400} height={1000} fill="#f8efd6" strokeWidth={6} />
      <text x={540} y={480} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={62} fill={RED} stroke="none">
        TENYA
      </text>
      <text x={540} y={550} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={62} fill={RED} stroke="none">
        HAPI!
      </text>
      <Pill x={540} y={720} s={1.3} f={f} r={-10} />
      <text x={540} y={960} textAnchor="middle" fontFamily={handFamily} fontSize={64} fill={INK} stroke="none">
        Ye, iç...
      </text>
      <text x={540} y={1060} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={80} fill={INK} stroke="none">
        ZAYIFLA!
      </text>
      <path d="M400 1150 L680 1150 M420 1210 L660 1210 M440 1270 L640 1270" strokeWidth={5} opacity={0.5} />
    </g>
  </g>
);

const TnTarih: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const inGut = f >= w(3) && f < w(11);
  const drop = prog(f, w(3), w(5));
  const settle = prog(f, w(5), w(7));
  const foods = [w(7), w(8) + 4, w(9) + 4];
  const grow = foods.filter((t) => f > t + 14).length / 3;
  const chompAt = (t: number) => interpolate(f, [t + 8, t + 12, t + 16], [0, 1, 0], clamp);
  const chomp = Math.max(...foods.map(chompAt));
  const q = f >= w(11);
  return (
    <g>
      {f < w(3) ? (
        <Cam f={f} keys={[[0, 540, 760, 1.05], [w(2) + 8, 540, 950, 1.25]]}>
          <Newspaper f={f} />
        </Cam>
      ) : inGut ? (
        <Cam f={f} keys={[[w(3), 540, 700, 1.1], [w(6), 540, 1000, 1.0], [w(10), 540, 1080, 1.15]]} shake={chomp * 0.4}>
          <Stomach f={f} grow={grow} />
          <Worm x={560 + settle * -40} y={-120 + drop * 1100 + settle * 60} s={2.0} f={f} napkin={settle > 0.5} chomp={chomp} />
          {settle > 0.6 ? (
            <g>
              <path d="M700 1000 l40 -90 M720 1000 l70 -70" stroke={INK} strokeWidth={8} strokeLinecap="round" />
            </g>
          ) : null}
          {foods.map((t, i) => {
            const p = prog(f, t, t + 10);
            if (f < t || f > t + 13) return null;
            const fx = 620 - p * 20;
            const fy = 0 + p * 960;
            const sc = 1.6 * (f > t + 10 ? 1 - (f - t - 10) / 3 : 1);
            return i === 1 ? <Cake key={i} x={fx} y={fy} s={sc} /> : <Burger key={i} x={fx} y={fy} s={sc} />;
          })}
        </Cam>
      ) : (
        <Cam f={f} keys={[[w(11), 540, 900, 1.25], [w(18), 540, 900, 1.05]]}>
          <rect x={-800} y={-600} width={2700} height={3200} fill="#e8d3a6" />
          <Pill x={540} y={880} s={3.2} r={-12} f={f} wormIn={Math.floor(f / 6) % 2 === 0} />
          <text x={540} y={560 + Math.sin(f / 4) * 10} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={260} fill={RED} stroke={INK} strokeWidth={8} paintOrder="stroke fill" opacity={pop(f, w(13))}>
            ?
          </text>
          {q ? <HoseChar x={880} y={1760} s={1.2} who="duru" beret gesture="think" gT={gestureT(f, w(12), w(18) + 20)} look={[-1, -0.5]} seed={9} /> : null}
        </Cam>
      )}
    </g>
  );
};

// 5) Bilim: 2014, İngiliz doktor, Kenya, ineğin dili, 6 hafta
const DOC = { x: 300, y: 1640, s: 1.3 };
const TnDoktor: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const think = gestureT(f, w(4), w(6));
  const gulp = interpolate(f, [w(7), w(7) + 6, w(8) + 4], [0, 1, 0], clamp);
  const tongue = prog(f, w(11), w(12) + 4);
  const weeks = f >= w(16) ? 1 + Math.min(5, Math.floor((f - w(16)) / 5)) : 0;
  return (
    <Cam
      f={f}
      keys={[
        [0, 540, 900, 1.0],
        [w(3), 420, 980, 1.25],
        [w(8), 420, 980, 1.25],
        [w(9), 640, 900, 0.95],
        [w(11), 760, 1100, 1.5],
        [w(15), 760, 1100, 1.6],
        [w(16), 540, 900, 1.0],
      ]}
      shake={gulp * 0.4}
    >
      <Savanna f={f} />
      {/* KENYA tabelası */}
      <g transform={`translate(1000 1180) scale(${pop(f, w(9))})`} stroke={INK} strokeWidth={7}>
        <rect x={-12} y={-240} width={24} height={260} fill="#7a4e26" />
        <path d="M-150 -260 L130 -260 L180 -210 L130 -160 L-150 -160 Z" fill="#f6ecd4" />
        <text x={0} y={-190} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={60} fill={INK} stroke="none">
          KENYA
        </text>
      </g>
      <Cow x={840} y={1310} s={1.0} f={f} tongue={tongue} />
      {tongue > 0.6 && f < w(16) ? (
        <g>
          <circle cx={640} cy={1380} r={70} fill="none" stroke={RED} strokeWidth={8} strokeDasharray="14 10" />
        </g>
      ) : null}
      <HoseChar x={DOC.x} y={DOC.y} s={DOC.s} who="doktor" seed={2} gesture={f < w(7) ? "think" : "thumbs"} gT={f < w(7) ? think : gestureT(f, w(8) + 4, w(15))} surprise={gulp} face={gulp > 0.3 ? "o" : "smile"} look={f >= w(9) && f < w(16) ? [1, 0] : [0.5, -0.4]} />
      {/* kaşıkta kist */}
      {f >= w(5) && f < w(8) ? (
        <g transform={`translate(${DOC.x + 70} ${DOC.y - 560 - gulp * 40})`} stroke={INK} strokeWidth={6}>
          <path d="M0 0 L60 60" strokeWidth={10} />
          <ellipse cx={-10} cy={-10} rx={30} ry={18} fill="#d9d6cf" />
          <circle cx={-10} cy={-14} r={7} fill={WHITE} />
        </g>
      ) : null}
      <g opacity={1 - prog(f, w(8), w(9))}>
        <YearCard f={f} t="2014" at={0} x={540} y={420} />
      </g>
      {weeks > 0 ? (
        <g transform={`translate(540 760) rotate(${(f % 5) * 2 - 4})`}>
          <Calendar x={0} y={0} n={weeks} s={1.1} />
          {f % 5 < 3 ? <path d="M-150 -170 Q-40 -260 150 -220" stroke={INK} strokeWidth={4} fill="none" opacity={0.6} /> : null}
        </g>
      ) : null}
    </Cam>
  );
};

// 6) Duru: "Kaç kilo verdi?" — umutla öne eğilir
const TnKacKilo: React.FC<SceneProps> = () => {
  const f = useCurrentFrame();
  return (
    <Cam f={f} keys={[[0, 560, 860, 1.1], [30, 560, 820, 1.25]]}>
      <Room />
      <HoseChar x={DURU1.x} y={DURU1.y} s={DURU1.s} who="duru" beret talk={f < 26 ? 1 : 0} armL={[30, -60, 60]} armR={[-30, -60, -60]} handL="fist" handR="fist" tilt={-6} look={[0, -0.3]} seed={9} />
      {[0, 1, 2].map((i) => (
        <path key={i} transform={`translate(${300 + i * 240} ${380 + Math.sin(f / 4 + i) * 12}) scale(${pop(f, i * 4)})`} d="M0 -30 L8 -8 L30 0 L8 8 L0 30 L-8 8 L-30 0 L-8 -8 Z" fill="#ffe9a8" stroke={INK} strokeWidth={4} />
      ))}
    </Cam>
  );
};

// 7) "Bir kilo aldı." — tartı +1 kg, Duru yüzünü kapatır; "Sen yutar mıydın? Yorumlara yaz"
const TnAldi: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const swing = interpolate(f, [w(0), w(2), w(2) + 6, w(2) + 12], [-0.2, 1.25, 0.92, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const st = pop(f, w(2) + 2);
  return (
    <Cam f={f} keys={[[0, 540, 820, 1.25], [w(2), 540, 860, 1.15], [d, 540, 900, 1.0]]} shake={interpolate(f, [w(2), w(2) + 10], [0.8, 0], clamp)}>
      <Savanna f={f} />
      <Scale x={540} y={1300} s={1.6} kg={swing} red={swing > 0.6} />
      <Stamp x={540} y={760} t="+1 KG" p={st} size={150} />
      <HoseChar x={900} y={1820} s={1.05} who="duru" beret gesture="facepalm" gT={gestureT(f, w(2) + 6, d)} seed={9} face="sad" />
      <Banner p={pop(f, w(2) + 10, 14)} t="Sen yutar mıydın?" sub="Yorumlara yaz" y={300} />
    </Cam>
  );
};

// 8) Tavsiye: kurt da iğne de "hiçbir şey yapma" der → çarpı → Duru ağırlık kaldırır, VOOM telefonu arkada
const TnTavsiye: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const lazy = f < w(12);
  const x1 = pop(f, w(12));
  const lift = f >= w(13);
  const bnc = lift ? Math.abs(Math.sin((q2(f) * Math.PI) / 18)) : undefined;
  const up = bnc ?? 0;
  const armUp: [number, number, number] = [110 - up * 20, -40 - up * 130, -60 + up * 30];
  const armUpL: [number, number, number] = [-armUp[0], armUp[1], -armUp[2]];
  const D = { x: 560, y: 1700, s: 1.6 };
  const hR = handAt(D.x, D.y - up * 26 * D.s, D.s, armUp, 1);
  const hL = handAt(D.x, D.y - up * 26 * D.s, D.s, armUpL, -1);
  return (
    <Cam
      f={f}
      keys={[
        [0, 540, 900, 1.1],
        [w(7), 540, 860, 1.2],
        [w(12), 540, 900, 1.05],
        [w(15), 560, 920, 1.15],
        [w(20) + 10, 600, 960, 1.05],
      ]}
      shake={interpolate(f, [w(12), w(12) + 8], [0.6, 0], clamp)}
    >
      <Room />
      {/* arka planda masa + VOOM telefonu */}
      <g stroke={INK} strokeWidth={6}>
        <rect x={820} y={1240} width={320} height={30} fill="#8a5a33" />
        <path d="M850 1270 L850 1500 M1110 1270 L1110 1500" strokeWidth={12} />
      </g>
      <VoomPhone x={980} y={1110} s={0.75} tick={prog(f, w(18), w(20))} />
      {lazy ? (
        <HoseChar x={D.x} y={D.y} s={D.s} who="duru" beret gesture="hips" gT={gestureT(f, w(8), w(11) + 4)} lid={f >= w(8) ? 0.5 : 0} face="smirk" look={[0, 0]} seed={9} tilt={f >= w(8) ? 8 : 0} />
      ) : (
        <g>
          <HoseChar x={D.x} y={D.y} s={D.s} who="duru" beret bounce={lift ? bnc : 0} armR={lift ? armUp : [110, -60, -60]} armL={lift ? armUpL : [-110, -60, 60]} handR="fist" handL="fist" face={lift ? "grin" : "o"} surprise={lift ? 0 : interpolate(f, [w(12), w(12) + 4, w(13)], [0, 0.6, 0], clamp)} look={[0, 0]} seed={9} />
          {lift ? (
            <>
              <Dumbbell x={hR[0]} y={hR[1] - 30} s={1.35} r={-8} />
              <Dumbbell x={hL[0]} y={hL[1] - 30} s={1.35} r={8} />
              <circle cx={hR[0] - 40} cy={hR[1] + 160} r={50} fill="#ffe9a8" opacity={0.25 + 0.25 * up} />
              <circle cx={hL[0] + 40} cy={hL[1] + 160} r={50} fill="#ffe9a8" opacity={0.25 + 0.25 * up} />
            </>
          ) : null}
        </g>
      )}
      {/* kolay yollar: kurt hapı + iğne kalemi süzülür, "Oysa"da kırmızı çarpı ve düşer */}
      {f < w(15) ? (
        <g>
          {[
            { at: w(0), x: 250, el: <Pill x={0} y={0} s={1.1} f={f} r={-15} /> },
            { at: w(2), x: 860, el: <Syringe x={0} y={0} s={0.9} r={25} /> },
          ].map((it, i) => {
            const p = pop(f, it.at);
            const fall = prog(f, w(12) + 4, w(14));
            return (
              <g key={i} transform={`translate(${it.x} ${600 + Math.sin(f / 7 + i) * 16 + fall * 900}) rotate(${fall * (i ? 80 : -80)}) scale(${p})`}>
                <circle cx={0} cy={0} r={130} fill="#fff6d8" opacity={0.6 * (1 - fall)} />
                {it.el}
                {x1 > 0 ? <path d="M-110 -110 L110 110 M110 -110 L-110 110" stroke={RED} strokeWidth={26} strokeLinecap="round" opacity={x1} /> : null}
              </g>
            );
          })}
          <text x={540} y={470} textAnchor="middle" fontFamily={handFamily} fontSize={58} fill={INK} opacity={prog(f, w(8), w(9)) * (1 - x1)}>
            "sen hiçbir şey yapma"
          </text>
        </g>
      ) : null}
      {/* haftalık şerit: 2 gün lacivert */}
      {f >= w(17) ? (
        <g transform="translate(540 380) scale(0.78)">
          {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((dname, i) => {
            const on = (i === 1 || i === 4) && f >= w(18) + (i === 4 ? 6 : 0);
            return (
              <g key={i} transform={`translate(${(i - 3) * 120} 0) scale(${pop(f, w(17) + i * 2)})`}>
                <rect x={-50} y={-50} width={100} height={100} rx={14} fill={on ? NAVY : "#f6ecd4"} stroke={INK} strokeWidth={6} />
                <text x={0} y={14} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={36} fill={on ? WHITE : INK}>
                  {dname}
                </text>
              </g>
            );
          })}
        </g>
      ) : null}
    </Cam>
  );
};

// 9) "Ve acele etme. Seni sevenler tartıya bakmaz, sana bakar." — düğün masası, arkadaşlar sarılır
const TnSevgi: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const turn = f >= w(6);
  const hug = gestureT(f, w(7), w(8) + 40);
  return (
    <Cam f={f} keys={[[0, 300, 1300, 1.5], [w(3), 300, 1300, 1.5], [w(5), 540, 1000, 1.0], [w(8) + 20, 540, 960, 1.1]]}>
      <Party f={f} />
      {/* köşede unutulan tartı */}
      <g opacity={1 - 0.5 * prog(f, w(6), w(7))}>
        <Scale x={160} y={1640} s={0.7} kg={0.3} />
      </g>
      <HoseChar x={180} y={1720} s={1.15} who="yunus" seed={4} look={turn ? [1, 0] : [-1, 0.6]} gesture="cheer" gT={hug} face={turn ? "grin" : "smile"} />
      <HoseChar x={900} y={1720} s={1.15} who="arkadas" seed={6} look={turn ? [-1, 0] : [-1, 0.6]} gesture="cheer" gT={hug} gSide="L" face={turn ? "grin" : "smile"} />
      <HoseChar x={540} y={1760} s={1.35} who="duru" beret seed={9} face={f < w(3) ? "sad" : "smile"} look={f < w(3) ? [-1, 0.8] : [0, 0]} laugh={interpolate(f, [w(7), w(7) + 6, w(8) + 30, w(8) + 40], [0, 1, 1, 0], clamp)} />
      <Hearts f={f} at={w(7)} x={540} y={1000} />
      <Confetti f={f} at={w(7)} />
    </Cam>
  );
};

// 10) "Bunu, aynaya bakıp kendine kızan arkadaşına gönder. Ve ona da sor:" → hap yakın planı (açılış karesi)
const TnSon: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const plane = prog(f, w(5), w(6) + 4);
  const toPill = f >= w(7);
  return (
    <g>
      {!toPill ? (
        <Cam f={f} keys={[[0, 540, 900, 1.0], [w(2), 640, 860, 1.15], [w(6), 600, 900, 1.05]]}>
          <Room />
          {/* ayna */}
          <g stroke={INK} strokeWidth={8}>
            <ellipse cx={760} cy={900} rx={230} ry={330} fill="#cfdde0" />
            <ellipse cx={760} cy={900} rx={230} ry={330} fill="none" stroke="#b08a3a" strokeWidth={26} />
          </g>
          <g opacity={0.55}>
            <svg x={530} y={570} width={460} height={660} viewBox="-230 -980 460 660" overflow="hidden">
              <HoseChar x={0} y={0} s={1.0} who="arkadas" seed={6} face="sad" lid={0.4} look={[0, 0.4]} live={false} />
            </svg>
          </g>
          <HoseChar x={380} y={1760} s={1.3} who="arkadas" seed={6} face={plane > 0.9 ? "o" : "sad"} lid={plane > 0.9 ? 0 : 0.4} look={plane > 0.5 ? [-1, -0.4] : [1, -0.2]} gesture="hips" gT={gestureT(f, w(1), w(5))} />
          {/* kâğıt uçak gelir */}
          {plane > 0 ? (
            <g transform={`translate(${-200 + plane * 600} ${500 + Math.sin(plane * Math.PI) * -120 + plane * 300}) rotate(${10 + plane * 15})`} stroke={INK} strokeWidth={6}>
              <path d="M0 0 L140 30 L0 60 L30 30 Z" fill={WHITE} />
              <path d="M30 30 L140 30" strokeWidth={4} />
            </g>
          ) : null}
        </Cam>
      ) : (
        // Yunus hapı kameraya uzatır, kamera hapın içine dalar → açılış karesi
        <Cam f={f} keys={[[w(7), 600, 820, 1.0], [w(9), 600, 820, 1.05], [d, PILL_AT[0], PILL_AT[1] - 20, 2.1]]}>
          <Room />
          <HoseChar x={DURU1.x} y={DURU1.y} s={DURU1.s} who="duru" beret armR={ARM_PILL} handR="fist" look={[1, -0.4]} face="smile" seed={9} />
          <Pill x={PILL_AT[0]} y={PILL_AT[1] - 30} s={1.2} f={f} glow={1} />
          <g transform={`translate(0 ${prog(f, w(7), w(8)) * -40})`} opacity={1 - prog(f, w(10), d - 6)}>
            <HoseChar x={200} y={2000} s={1.9} who="yunus" seed={4} talk={1} gesture="point" gT={gestureT(f, w(7), d)} look={[1, -0.5]} />
          </g>
        </Cam>
      )}
    </g>
  );
};

export const TENYA_SCENES: Record<string, React.FC<SceneProps>> = {
  "tn-kanca": TnKanca,
  "tn-asla": TnAsla,
  "tn-hap": TnHap,
  "tn-tarih": TnTarih,
  "tn-doktor": TnDoktor,
  "tn-kackilo": TnKacKilo,
  "tn-aldi": TnAldi,
  "tn-tavsiye": TnTavsiye,
  "tn-sevgi": TnSevgi,
  "tn-son": TnSon,
};

export { PAPER };
