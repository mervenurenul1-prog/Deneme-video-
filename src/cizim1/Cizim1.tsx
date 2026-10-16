import { useId } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  random,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily, handFamily } from "../fonts";
import { audioFor, SAFE, sceneDurations, useSeconds, wordsFor } from "../shared";
import type { Cizim, PostVoiceover, WordTiming } from "../types";

// 1. sürüm çizim stili (kullanıcının seçtiği): sade karakter, yavaş animasyonlar.
// Elle çizilmiş görünüm: sıcak sepya kâğıt, mürekkep çizgiler, ışık huzmeleri.
// Her sahne söylenen şeyi birebir gösterir; animasyonlar kelime zamanlamalarına bağlıdır
// (sessiz önizlemede tahmini, seslendirmeden sonra gerçek zamanlamalar).
const C = {
  paper: "#ecdcbc",
  ink: "#3a2716",
  skin: "#eab48c",
  shirt: "#5d8c87",
  shirtLight: "#86b3ac",
  shorts: "#4b3f5e",
  hair: "#4a2f1d",
  shoe: "#33292a",
  fat: "#f0c24b",
  fatDark: "#b8862a",
  co2: "#8e9196",
  water: "#4f97c2",
  red: "#b23a2a",
  lung: "#e58f8f",
  glow: "#ff8a2a",
  yellow: "#ffd23f",
  cream: "#fbf3e2",
};

export type Cizim1Props = { cizim: Cizim; voiceover: PostVoiceover | null };

// w(i): i. kelimenin başladığı kare (sahneye göre)
type SceneProps = { d: number; w: (i: number) => number };

export const Cizim1Video: React.FC<Cizim1Props> = ({ cizim, voiceover }) => {
  const { fps } = useVideoConfig();
  const durations = sceneDurations(cizim, voiceover, fps);
  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: C.paper, fontFamily }}>
      <Paper />
      <Beams />
      {cizim.scenes.map((scene, i) => {
        const start = from;
        from += durations[i];
        const audio = audioFor(cizim, voiceover, i);
        const words = wordsFor(scene.voice, audio);
        const w = (k: number) => Math.round((words[Math.min(k, words.length - 1)]?.start ?? 0) * fps);
        const Visual = SCENES[scene.visual] ?? Missing;
        return (
          <Sequence key={i} from={start} durationInFrames={durations[i]} name={`${i + 1}-${scene.visual}`}>
            <Shot d={durations[i]} zoom={ZOOM[scene.visual]}>
              <Visual d={durations[i]} w={w} />
            </Shot>
            <Captions words={words} />
            {audio ? <Audio src={staticFile(audio.file)} /> : null}
            {/* sahne geçişi + o sahnedeki olayların efekt sesleri */}
            {i > 0 ? <Audio src={staticFile("sfx/whoosh.mp3")} volume={0.18} /> : null}
            {(SFX[scene.visual]?.(w, durations[i]) ?? []).map(([at, file, vol], k) =>
              at >= 0 && at < durations[i] ? (
                <Sequence key={k} from={Math.round(at)} layout="none">
                  <Audio src={staticFile(`sfx/${file}.mp3`)} volume={vol} />
                </Sequence>
              ) : null,
            )}
          </Sequence>
        );
      })}
      {cizim.music ? <Music src={cizim.music} /> : null}
      <Dust />
    </AbsoluteFill>
  );
};

const Missing: React.FC<SceneProps> = () => null;

// Arka plan müziği: konuşmanın altında kısık, başta ve sonda yumuşak geçiş
const Music: React.FC<{ src: string }> = ({ src }) => {
  const { durationInFrames } = useVideoConfig();
  return (
    <Audio
      src={staticFile(src)}
      loop
      volume={(f) =>
        0.11 * interpolate(f, [0, 20, durationInFrames - 45, durationInFrames - 1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      }
    />
  );
};

// Efekt sesleri: [kare, dosya (public/sfx), ses düzeyi]. Animasyonlarla aynı kelime zamanlarına bağlı.
type Sfx = [number, string, number];
const every = (from: number, to: number, step: number, file: string, vol: number): Sfx[] => {
  const out: Sfx[] = [];
  for (let t = from; t < to; t += step) out.push([t, file, vol]);
  return out;
};
const SFX: Record<string, (w: (i: number) => number, d: number) => Sfx[]> = {
  tarti: (w) => [
    [w(0) + 2, "bip", 0.35],
    [w(2) + 18, "bip", 0.35],
    [w(2) + 4, "pirilti", 0.3],
    [w(6), "pop", 0.4],
    [w(7), "pop", 0.4],
  ],
  "yanlis-fikir": (w) => [
    [w(2) - 4, "pop", 0.45],
    [w(3), "kalem", 0.35],
    [w(6) - 4, "pop", 0.45],
    [w(6), "damla", 0.4],
    [w(6) + 14, "damla", 0.3],
    [w(7), "kalem", 0.35],
    [w(11) - 2, "cizik", 0.5],
    [w(11) + 6, "cizik", 0.5],
  ],
  "yag-hucresi": (w) => [
    [4, "pop", 0.4],
    ...Array.from({ length: 10 }, (_, i): Sfx => [w(1) + i * Math.max(3, (w(5) - w(1)) / 10), "pop", 0.18]),
    [w(2), "kalem", 0.3],
    [w(4), "kalem", 0.3],
  ],
  nefes: (w, d) => [[w(1), "kalem", 0.35], [w(4), "kalem", 0.25], ...every(w(4) - 10, d - 20, 42, "nefes", 0.45)],
  su: (w, d) => [[w(2) - 3, "damla", 0.45], [w(2), "kalem", 0.3], ...every(w(4), d - 10, 18, "damla", 0.22)],
  "hizli-nefes": (w) => [...every(w(1), w(10), 18, "nefes", 0.3), [w(10), "cizik", 0.4], [w(10) + 4, "pirilti", 0.35], [w(10) + 8, "kalem", 0.3]],
  hareket: (w, d) => [[w(1), "boom", 0.15], [w(4), "kalem", 0.3], [w(4) + 2, "ding", 0.25], ...every(w(7), d - 20, 22, "nefes", 0.35)],
  kapanis: (w) => [[w(1), "kalem", 0.35], [w(4), "kalem", 0.35], [w(4), "nefes", 0.4], [w(7), "pop", 0.5], [w(8), "ding", 0.3]],
};

/* ---------- yardımcılar ---------- */

const ease = Easing.inOut(Easing.cubic);
const tw = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
// Yaylanarak beliren öğeler için (0 → biraz taşar → 1)
const pop = (f: number, a: number, len = 12) =>
  interpolate(f, [a, a + len * 0.6, a + len], [0, 1.12, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
// start karesinden itibaren her period'da doğan, life kare yaşayan parçacıkların ilerlemesi (0..1)
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
const svgId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");

/* ---------- arka plan: kâğıt, ışık huzmeleri, toz ---------- */

const Paper: React.FC = () => (
  <AbsoluteFill>
    <svg width="100%" height="100%" viewBox="0 0 1080 1920" preserveAspectRatio="none">
      <defs>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
          <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.24  0 0 0 0 0.12  0 0 0 0.16 0" />
        </filter>
        <filter id="blotch">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.006" numOctaves="3" seed="8" />
          <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.12  0 0 0 0.5 -0.12" />
        </filter>
        <radialGradient id="vignette" cx="50%" cy="42%" r="75%">
          <stop offset="55%" stopColor="#5a3c1e" stopOpacity="0" />
          <stop offset="100%" stopColor="#5a3c1e" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill={C.paper} />
      <rect width="1080" height="1920" filter="url(#blotch)" />
      <rect width="1080" height="1920" filter="url(#grain)" />
      <rect width="1080" height="1920" fill="url(#vignette)" />
    </svg>
  </AbsoluteFill>
);

const Beams: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", pointerEvents: "none" }}>
      {[
        { x: 120, w: 170, a: 24, o: 0.22 },
        { x: 380, w: 110, a: 21, o: 0.16 },
        { x: 560, w: 220, a: 26, o: 0.12 },
      ].map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: b.x,
            top: -300,
            width: b.w,
            height: 2600,
            transformOrigin: "50% 0",
            transform: `rotate(${b.a + Math.sin(frame / 70 + i * 2) * 1.6}deg)`,
            background: "linear-gradient(180deg, rgba(255,240,200,1) 0%, rgba(255,230,180,0.5) 45%, rgba(255,230,180,0) 85%)",
            opacity: b.o * (0.85 + 0.15 * Math.sin(frame / 40 + i)),
            filter: "blur(28px)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const DUST = Array.from({ length: 28 }, (_, i) => ({
  x: random(`dx${i}`) * 1080,
  y: random(`dy${i}`) * 1920,
  r: 2 + random(`dr${i}`) * 4,
  v: 0.2 + random(`dv${i}`) * 0.5,
}));

const Dust: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="100%" height="100%" viewBox="0 0 1080 1920">
        {DUST.map((p, i) => (
          <circle
            key={i}
            cx={(p.x + Math.sin(frame / 50 + i) * 20 + frame * p.v * 0.3) % 1080}
            cy={(p.y - frame * p.v + 1920) % 1920}
            r={p.r}
            fill="#fff6dc"
            opacity={0.35 + 0.25 * Math.sin(frame / 20 + i)}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/* ---------- kamera ve geçiş ---------- */

type Zoom = { to: number; x: number; y: number };
// Sahneye özel yavaş kamera yakınlaşması: ölçek ve odak noktası (piksel)
const ZOOM: Record<string, Zoom> = {
  tarti: { to: 1.07, x: 540, y: 1000 },
  "yanlis-fikir": { to: 1.05, x: 540, y: 700 },
  "yag-hucresi": { to: 1.06, x: 700, y: 760 },
  nefes: { to: 1.08, x: 600, y: 700 },
  su: { to: 1.06, x: 540, y: 900 },
  "hizli-nefes": { to: 1.07, x: 540, y: 800 },
  hareket: { to: 1.05, x: 540, y: 950 },
  kapanis: { to: 1.04, x: 540, y: 800 },
  "tarti-acilis": { to: 1.07, x: 540, y: 1050 },
  "tarti-panik": { to: 1.06, x: 540, y: 800 },
  "tarti-kalori": { to: 1.05, x: 400, y: 900 },
  "tarti-su": { to: 1.06, x: 700, y: 760 },
  "tarti-tuz": { to: 1.06, x: 700, y: 950 },
  "tarti-diger": { to: 1.05, x: 540, y: 900 },
  "tarti-ortalama": { to: 1.05, x: 540, y: 600 },
  "tarti-kapanis": { to: 1.04, x: 540, y: 900 },
};

const Shot: React.FC<{ d: number; zoom?: Zoom; children: React.ReactNode }> = ({ d, zoom, children }) => {
  const f = useCurrentFrame();
  const z = zoom ?? { to: 1.05, x: 540, y: 960 };
  const opacity = interpolate(f, [0, 9, d - 7, d], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(f, [0, d], [1, z.to]);
  const blur = interpolate(f, [0, 9], [6, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})`, transformOrigin: `${z.x}px ${z.y}px`, filter: `blur(${blur}px)` }}>
      <svg width="100%" height="100%" viewBox="0 0 1080 1920">
        <Rough />
        <g filter="url(#rough)">{children}</g>
      </svg>
    </AbsoluteFill>
  );
};

// El çizimi titreşimi: çizgiler hafifçe dalgalanır, desen birkaç karede bir değişir ("kaynayan çizgi")
const Rough: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <defs>
      <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed={Math.floor(frame / 4) % 5} />
        <feDisplacementMap in="SourceGraphic" scale="6" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="14" />
      </filter>
    </defs>
  );
};

/* ---------- altyazı: ortada, küçük, o anki kelime sarı ---------- */

const Captions: React.FC<{ words: WordTiming[] }> = ({ words }) => {
  const t = useSeconds();
  const chunks: WordTiming[][] = [];
  for (let i = 0; i < words.length; i += 3) chunks.push(words.slice(i, i + 3));
  const current = chunks.findLast((c) => t >= c[0].start) ?? chunks[0];
  if (!current) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: SAFE.bottom + 10,
        left: SAFE.side,
        right: SAFE.side,
        textAlign: "center",
        fontSize: 54,
        fontWeight: 800,
        color: "#fffaf0",
        WebkitTextStroke: `12px ${C.ink}`,
        paintOrder: "stroke fill",
        lineHeight: 1.25,
      }}
    >
      {current.map((w, i) => (
        <span key={i} style={{ color: t >= w.start && t <= w.end + 0.08 ? C.yellow : undefined }}>
          {i > 0 ? " " : ""}
          {w.word}
        </span>
      ))}
    </div>
  );
};

/* ---------- karakter ---------- */

type Arm = [number, number]; // [omuz açısı, dirsek bükümü] derece; 0 = aşağı, + = dışarı
type Leg = { lift?: number; spread?: number };
type Mouth = "smile" | "grin" | "flat" | "o" | "open" | "worry";
type Eyes = "open" | "wide" | "closed" | "dizzy";

type PersonProps = {
  x: number;
  y: number;
  s?: number;
  belly?: number; // 0 ince … 1 göbekli
  armL?: Arm;
  armR?: Arm;
  legL?: Leg;
  legR?: Leg;
  mouth?: Mouth;
  eyes?: Eyes;
  lookY?: number;
  tilt?: number;
  lungs?: number; // göğüste akciğerlerin görünürlüğü
  breath?: number; // akciğerlerin şişmesi 0..1
  legGlow?: number; // kasların "yanması"
  blush?: number;
  children?: React.ReactNode; // karakterin koordinatlarında ek çizimler
};

const dir = (side: number, deg: number) => {
  const r = (deg * Math.PI) / 180;
  return [side * Math.sin(r), Math.cos(r)];
};
const pt = (p: number[]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

const armPoints = (side: number, [a1, a2]: Arm) => {
  const s = [side * 100, -578];
  const e1 = dir(side, a1);
  const e = [s[0] + e1[0] * 150, s[1] + e1[1] * 150];
  const h1 = dir(side, a1 + a2);
  return [s, e, [e[0] + h1[0] * 140, e[1] + h1[1] * 140]];
};

const legPoints = (side: number, { lift = 0, spread = 4 }: Leg) => {
  const h = [side * 42, -345];
  const k1 = dir(side, spread);
  const k = [h[0] + k1[0] * 165 * (1 - 0.5 * lift), h[1] + k1[1] * 165 * (1 - 0.5 * lift)];
  return [h, k, [k[0] + side * 4, k[1] + 165 * (1 - 0.08 * lift)]];
};

const Limb: React.FC<{ p: number[][]; w: number; color: string; sleeve?: string }> = ({ p, w, color, sleeve }) => {
  const d = `M${pt(p[0])} L${pt(p[1])} L${pt(p[2])}`;
  const sl = sleeve ? [p[0], [p[0][0] + (p[1][0] - p[0][0]) * 0.5, p[0][1] + (p[1][1] - p[0][1]) * 0.5]] : null;
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={C.ink} strokeWidth={w + 11} />
      <path d={d} stroke={color} strokeWidth={w} />
      {sl ? (
        <>
          <path d={`M${pt(sl[0])} L${pt(sl[1])}`} stroke={C.ink} strokeWidth={w + 25} />
          <path d={`M${pt(sl[0])} L${pt(sl[1])}`} stroke={sleeve} strokeWidth={w + 14} />
        </>
      ) : null}
    </g>
  );
};

const Person: React.FC<PersonProps> = ({
  x,
  y,
  s = 1,
  belly = 0.5,
  armL = [10, 0],
  armR = [10, 0],
  legL = {},
  legR = {},
  mouth = "smile",
  eyes = "open",
  lookY = 0,
  tilt = 0,
  lungs = 0,
  breath = 0,
  legGlow = 0,
  blush = 0.4,
  children,
}) => {
  const frame = useCurrentFrame();
  const waist = 88 + 70 * belly;
  const hipW = 84 + 32 * belly;
  const hem = -350 + 28 * belly;
  const lL = legPoints(-1, legL);
  const lR = legPoints(1, legR);
  const aL = armPoints(-1, armL);
  const aR = armPoints(1, armR);
  const thigh = (p: number[][], side: number) => {
    const m = [p[0][0] + (p[1][0] - p[0][0]) * 0.55, p[0][1] + (p[1][1] - p[0][1]) * 0.55];
    return [
      [m[0] + side * 44, m[1]],
      [m[0] - side * 38, m[1]],
    ];
  };
  const [tLo, tLi] = thigh(lL, -1);
  const [tRo, tRi] = thigh(lR, 1);
  const torso = `M-98 -592 Q-102 -520 ${-waist} -455 Q${-waist - 4} -385 ${-hipW} -362 Q0 ${hem + 22} ${hipW} -362 Q${waist + 4} -385 ${waist} -455 Q102 -520 98 -592 Q0 -614 -98 -592 Z`;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={14} rx={150 + 30 * belly} ry={20} fill={C.ink} opacity={0.18} />
      {/* bacaklar */}
      {legGlow > 0 ? (
        <g filter="url(#glow)" opacity={legGlow * (0.75 + 0.25 * Math.sin(frame / 4))}>
          {[lL, lR].map((p, i) => (
            <path key={i} d={`M${pt(p[0])} L${pt(p[1])} L${pt(p[2])}`} stroke={C.glow} strokeWidth={90} fill="none" strokeLinecap="round" />
          ))}
        </g>
      ) : null}
      <Limb p={lL} w={52} color={C.skin} />
      <Limb p={lR} w={52} color={C.skin} />
      {legGlow > 0 ? (
        <g opacity={legGlow * 0.55}>
          {[lL, lR].map((p, i) => (
            <path key={i} d={`M${pt(p[0])} L${pt(p[1])} L${pt(p[2])}`} stroke={C.glow} strokeWidth={30} fill="none" strokeLinecap="round" />
          ))}
        </g>
      ) : null}
      {[lL, lR].map((p, i) => (
        <ellipse
          key={i}
          cx={p[2][0] + (i ? 14 : -14)}
          cy={p[2][1] + 10}
          rx={40}
          ry={19}
          fill={C.shoe}
          stroke={C.ink}
          strokeWidth={6}
        />
      ))}
      {/* şort */}
      <path
        d={`M${-hipW - 4} -392 L${hipW + 4} -392 L${pt(tRo)} L${pt(tRi)} L0 -300 L${pt(tLi)} L${pt(tLo)} Z`}
        fill={C.shorts}
        stroke={C.ink}
        strokeWidth={7}
        strokeLinejoin="round"
      />
      {/* gövde */}
      <path d={torso} fill={C.shirt} stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
      <ellipse cx={0} cy={-445} rx={waist * 0.62} ry={52 + 40 * belly} fill={C.shirtLight} opacity={0.25 + 0.4 * belly} />
      {belly > 0.15 ? (
        <path
          d={`M${-waist * 0.72} -410 Q0 ${-372 + 26 * belly} ${waist * 0.72} -410`}
          stroke={C.ink}
          strokeWidth={5}
          fill="none"
          opacity={Math.min(1, (belly - 0.15) * 3) * 0.6}
          strokeLinecap="round"
        />
      ) : null}
      <path d="M-34 -603 Q0 -566 34 -603" stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
      {lungs > 0 ? <Lungs o={lungs} breath={breath} /> : null}
      {/* kollar */}
      <Limb p={aL} w={44} color={C.skin} sleeve={C.shirt} />
      <Limb p={aR} w={44} color={C.skin} sleeve={C.shirt} />
      {[aL, aR].map((p, i) => (
        <circle key={i} cx={p[2][0]} cy={p[2][1]} r={27} fill={C.skin} stroke={C.ink} strokeWidth={6} />
      ))}
      {/* baş */}
      <g transform={`rotate(${tilt} 0 -630)`}>
        <rect x={-24} y={-650} width={48} height={52} fill={C.skin} stroke={C.ink} strokeWidth={6} />
        <circle cx={-80} cy={-700} r={17} fill={C.skin} stroke={C.ink} strokeWidth={6} />
        <circle cx={80} cy={-700} r={17} fill={C.skin} stroke={C.ink} strokeWidth={6} />
        <circle cx={0} cy={-700} r={80} fill={C.skin} stroke={C.ink} strokeWidth={7} />
        <path
          d="M-84 -698 C-96 -812 96 -812 84 -698 C74 -742 34 -756 2 -750 C-30 -758 -72 -744 -84 -698 Z"
          fill={C.hair}
          stroke={C.ink}
          strokeWidth={6}
          strokeLinejoin="round"
        />
        <ellipse cx={-48} cy={-676} rx={16} ry={9} fill="#e0806f" opacity={blush} />
        <ellipse cx={48} cy={-676} rx={16} ry={9} fill="#e0806f" opacity={blush} />
        <Face eyes={eyes} mouth={mouth} lookY={lookY} />
      </g>
      {children}
    </g>
  );
};

const Face: React.FC<{ eyes: Eyes; mouth: Mouth; lookY: number }> = ({ eyes, mouth, lookY }) => {
  const ex = [-29, 29];
  const ey = -708 + lookY;
  return (
    <g stroke={C.ink} strokeLinecap="round" fill="none">
      {ex.map((x) =>
        eyes === "closed" ? (
          <path key={x} d={`M${x - 11} ${ey} Q${x} ${ey + 9} ${x + 11} ${ey}`} strokeWidth={5} />
        ) : eyes === "dizzy" ? (
          <g key={x} strokeWidth={5}>
            <path d={`M${x - 10} ${ey - 10} L${x + 10} ${ey + 10} M${x + 10} ${ey - 10} L${x - 10} ${ey + 10}`} />
          </g>
        ) : eyes === "wide" ? (
          <g key={x}>
            <circle cx={x} cy={ey} r={14} fill="#fffaf0" strokeWidth={4} />
            <circle cx={x} cy={ey + 2} r={6} fill={C.ink} stroke="none" />
          </g>
        ) : (
          <circle key={x} cx={x} cy={ey} r={8} fill={C.ink} stroke="none" />
        ),
      )}
      <path d="M-42 -738 L-16 -742 M16 -742 L42 -738" strokeWidth={5} />
      <path d="M-3 -694 Q6 -682 -2 -677" strokeWidth={4} />
      {mouth === "smile" ? <path d="M-22 -664 Q0 -644 22 -664" strokeWidth={5} /> : null}
      {mouth === "grin" ? <path d="M-28 -666 Q0 -630 28 -666 Z" strokeWidth={5} fill="#8a2f26" /> : null}
      {mouth === "flat" ? <path d="M-18 -658 L18 -658" strokeWidth={5} /> : null}
      {mouth === "worry" ? <path d="M-20 -650 Q0 -666 20 -650" strokeWidth={5} /> : null}
      {mouth === "o" ? <ellipse cx={0} cy={-656} rx={11} ry={14} fill="#8a2f26" strokeWidth={4} /> : null}
      {mouth === "open" ? <ellipse cx={0} cy={-656} rx={20} ry={17} fill="#8a2f26" strokeWidth={4} /> : null}
    </g>
  );
};

const Lungs: React.FC<{ o: number; breath: number }> = ({ o, breath }) => {
  const k = 0.92 + 0.16 * breath;
  const lobe = "M-14 -568 C-62 -572 -84 -512 -80 -462 C-78 -440 -42 -440 -16 -462 Z";
  return (
    <g opacity={o}>
      <ellipse cx={0} cy={-510} rx={96} ry={88} fill="#2d3b3a" opacity={0.25} />
      <g transform={`translate(0 -515) scale(${k}) translate(0 515)`}>
        <path d={lobe} fill={C.lung} stroke={C.ink} strokeWidth={5} />
        <path d={lobe} transform="scale(-1 1)" fill={C.lung} stroke={C.ink} strokeWidth={5} />
        <path d="M0 -612 L0 -566 M0 -566 L-22 -540 M0 -566 L22 -540" stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
};

/* ---------- eşyalar ve işaretler ---------- */

const HandText: React.FC<{
  x: number;
  y: number;
  text: string;
  size?: number;
  color?: string;
  p: number; // yazılma ilerlemesi 0..1
  anchor?: "start" | "middle" | "end";
  rotate?: number;
}> = ({ x, y, text, size = 80, color = C.ink, p, anchor = "middle", rotate = -3 }) => {
  const id = svgId(useId());
  if (p <= 0) return null;
  const w = text.length * size * 0.5 + 20;
  const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  return (
    <g transform={`rotate(${rotate} ${x} ${y})`}>
      <clipPath id={`c${id}`}>
        <rect x={left - 10} y={y - size * 1.1} width={(w + 20) * p} height={size * 1.6} />
      </clipPath>
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        fontFamily={handFamily}
        fontWeight={700}
        fontSize={size}
        fill={color}
        clipPath={`url(#c${id})`}
      >
        {text}
      </text>
    </g>
  );
};

const Drop: React.FC<{ x: number; y: number; s?: number; color?: string; o?: number }> = ({ x, y, s = 1, color = C.water, o = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
    <path d="M0 -24 C9 -9 15 0 15 9 A15 15 0 0 1 -15 9 C-15 0 -9 -9 0 -24 Z" fill={color} stroke={C.ink} strokeWidth={4} />
    <ellipse cx={-5} cy={6} rx={3.5} ry={6} fill="#fff" opacity={0.6} />
  </g>
);

// Nefesle çıkan bulut: ağızdan çıkar, büyür, yukarı-yana süzülür ve kaybolur
const Puff: React.FC<{ x: number; y: number; p: number; dx?: number; dy?: number; label?: string; s?: number }> = ({
  x,
  y,
  p,
  dx = 190,
  dy = -150,
  label,
  s = 1,
}) => {
  const e = Easing.out(Easing.quad)(p);
  const r = (12 + 36 * e) * s;
  const o = interpolate(p, [0, 0.12, 0.7, 1], [0, 0.95, 0.85, 0]);
  const cx = x + dx * e;
  const cy = y + dy * e;
  return (
    <g opacity={o}>
      {[
        [0, 0, 1],
        [-0.8, 0.35, 0.7],
        [0.8, 0.3, 0.75],
        [0.1, -0.55, 0.75],
      ].map(([ox, oy, k], i) => (
        <circle key={i} cx={cx + ox * r} cy={cy + oy * r} r={r * k} fill="#d9d6cf" stroke={C.ink} strokeWidth={4} />
      ))}
      {[
        [0, 0, 1],
        [-0.8, 0.35, 0.7],
        [0.8, 0.3, 0.75],
        [0.1, -0.55, 0.75],
      ].map(([ox, oy, k], i) => (
        <circle key={`f${i}`} cx={cx + ox * r} cy={cy + oy * r} r={r * k - 3} fill="#dcd9d2" />
      ))}
      {label ? (
        <text x={cx} y={cy + r * 0.3} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={r * 0.95} fill={C.ink}>
          {label}
        </text>
      ) : null}
    </g>
  );
};

// Düşünce balonu: daireler çevreye dizilir, önce çizgiler sonra dolgu (iç çizgiler kaybolur)
const Bubble: React.FC<{ x: number; y: number; rx: number; ry: number; p: number; tail: [number, number]; children?: React.ReactNode }> = ({
  x,
  y,
  rx,
  ry,
  p,
  tail,
  children,
}) => {
  if (p <= 0) return null;
  const n = 11;
  const circles = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [x + Math.cos(a) * rx, y + Math.sin(a) * ry, (ry * 0.42) * (0.85 + 0.3 * random(`b${i}`))];
  });
  const dots = [0.35, 0.62, 0.85].map((k, i) => [x + (tail[0] - x) * k, y + ry * 0.8 + (tail[1] - y - ry * 0.8) * k, 22 - i * 6]);
  return (
    <g transform={`translate(${x} ${y}) scale(${p}) translate(${-x} ${-y})`}>
      {dots.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={C.cream} stroke={C.ink} strokeWidth={5} />
      ))}
      {circles.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={C.cream} stroke={C.ink} strokeWidth={7} />
      ))}
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={C.cream} />
      {circles.map(([cx, cy, r], i) => (
        <circle key={`f${i}`} cx={cx} cy={cy} r={r - 3.5} fill={C.cream} />
      ))}
      {children}
    </g>
  );
};

const Cross: React.FC<{ x: number; y: number; size: number; p: number }> = ({ x, y, size, p }) => {
  const a = tw(p, 0, 0.5);
  const b = tw(p, 0.5, 1);
  return (
    <g stroke={C.red} strokeWidth={22} strokeLinecap="round" fill="none">
      {a > 0 ? (
        <path d={`M${x - size} ${y - size} L${x + size} ${y + size}`} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - a} />
      ) : null}
      {b > 0 ? (
        <path d={`M${x + size} ${y - size} L${x - size} ${y + size}`} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - b} />
      ) : null}
    </g>
  );
};

const Arrow: React.FC<{ d: string; p: number; color?: string; w?: number }> = ({ d, p, color = C.ink, w = 8 }) =>
  p > 0 ? (
    <path
      d={d}
      pathLength={1}
      strokeDasharray="1"
      strokeDashoffset={1 - p}
      stroke={color}
      strokeWidth={w}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ) : null;

const Star: React.FC<{ x: number; y: number; r: number; rot: number }> = ({ x, y, r, rot }) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = ((i * 36 + rot) * Math.PI) / 180;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(x + Math.sin(a) * rr).toFixed(1)},${(y - Math.cos(a) * rr).toFixed(1)}`;
  });
  return <polygon points={pts.join(" ")} fill={C.yellow} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />;
};

const Bathroom: React.FC<{ x: number; y: number; value: string }> = ({ x, y, value }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-190} y={-54} width={380} height={58} rx={18} fill="#dcd6c8" stroke={C.ink} strokeWidth={8} />
    <rect x={-78} y={-44} width={156} height={38} rx={8} fill="#26332b" stroke={C.ink} strokeWidth={5} />
    <text x={0} y={-14} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={40} fill="#b8f28a">
      {value}
    </text>
  </g>
);

/* ---------- sahneler ---------- */

const PX = 540;
const PY = 1330;

// "Beş kilo verdin. Peki o yağ nereye gitti?"
const Tarti: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const belly = tw(f, w(0), w(2) + 18, 1, 0.42);
  const kg = tw(f, w(0), w(2) + 18, 85, 80);
  const cheer = tw(f, w(2) + 4, w(2) + 12) - tw(f, w(3) + 2, w(3) + 12);
  const think = tw(f, w(4), w(4) + 12);
  const ghost = tw(f, w(5) - 4, w(7) + 30);
  const lift = Math.abs(Math.sin(f / 5)) * cheer;
  return (
    <>
      <Bathroom x={PX} y={PY + 6} value={`${kg.toFixed(1)} kg`} />
      <Person
        x={PX}
        y={PY - 58 - lift * 18}
        s={0.95}
        belly={belly}
        armL={[10 + 150 * cheer, -10 * cheer]}
        armR={[10 + 150 * cheer + 140 * think * (1 - cheer), -10 * cheer - 135 * think]}
        mouth={think > 0.5 ? "worry" : cheer > 0.3 ? "grin" : "smile"}
        eyes={think > 0.5 ? "wide" : "open"}
        tilt={-8 * think}
      >
        {/* kaybolan yağ: göbekten ayrılıp süzülür ve gözden kaybolur */}
        {ghost > 0 && ghost < 1 ? (
          <g opacity={interpolate(ghost, [0, 0.15, 0.7, 1], [0, 0.9, 0.7, 0])}>
            <path
              d="M-60 0 C-70 -50 -20 -70 10 -55 C50 -75 80 -30 60 0 C70 40 20 55 -10 40 C-50 55 -75 30 -60 0 Z"
              transform={`translate(${-260 * ghost} ${-445 - 330 * ghost}) scale(${1 - 0.3 * ghost})`}
              fill={C.fat}
              stroke={C.fatDark}
              strokeWidth={6}
              strokeDasharray="14 10"
            />
          </g>
        ) : null}
      </Person>
      {[w(6), w(7)].map((t, i) => {
        const p = pop(f, t, 12);
        return p > 0 ? (
          <text
            key={i}
            x={i ? 770 : 300}
            y={i ? 520 : 610}
            textAnchor="middle"
            fontFamily={handFamily}
            fontWeight={700}
            fontSize={190 * p}
            fill={C.ink}
            transform={`rotate(${i ? 12 : -10} ${i ? 770 : 300} ${i ? 520 : 610})`}
          >
            ?
          </text>
        ) : null;
      })}
    </>
  );
};

// "Çoğu insan yağın eridiğini ya da tere dönüştüğünü sanır. İkisi de doğru değil."
const YanlisFikir: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const left = pop(f, w(2) - 4, 14);
  const right = pop(f, w(6) - 4, 14);
  const melt = tw(f, w(3), w(3) + 45);
  const x1 = tw(f, w(11) - 2, w(11) + 10);
  const x2 = tw(f, w(11) + 6, w(11) + 18);
  const shock = f > w(12);
  return (
    <>
      <Person
        x={PX}
        y={PY + 20}
        s={0.82}
        belly={0.42}
        armL={[12, 0]}
        armR={[28, -158]}
        mouth={shock ? "o" : "flat"}
        eyes={shock ? "wide" : "open"}
        lookY={-4}
        tilt={4}
      />
      <Bubble x={300} y={520} rx={190} ry={150} p={left} tail={[470, 760]}>
        {/* eriyen tereyağı gibi yağ */}
        <ellipse cx={300} cy={590} rx={70 + 60 * melt} ry={14 + 8 * melt} fill={C.fat} stroke={C.fatDark} strokeWidth={5} />
        <path
          d={`M240 ${590 - 90 * (1 - 0.55 * melt)} L360 ${590 - 90 * (1 - 0.55 * melt)} L360 585 L240 585 Z`}
          fill={C.fat}
          stroke={C.fatDark}
          strokeWidth={6}
          strokeLinejoin="round"
        />
        {[255, 300, 340].map((x, i) => (
          <path
            key={i}
            d={`M${x - 10} ${590 - 90 * (1 - 0.55 * melt)} Q${x} ${560 + 30 * melt + i * 6} ${x + 10} ${590 - 90 * (1 - 0.55 * melt)}`}
            fill={C.fat}
            stroke={C.fatDark}
            strokeWidth={4}
          />
        ))}
        <HandText x={300} y={470} text="Eridi mi?" size={64} p={tw(f, w(3), w(3) + 14)} />
      </Bubble>
      <Bubble x={780} y={460} rx={190} ry={150} p={right} tail={[620, 720]}>
        <Drop x={780} y={530} s={2.6} />
        {cycles(f, w(6), 14, 30).map(({ k, p }) => (
          <Drop key={k} x={720 + (k % 3) * 60} y={540 + 60 * p} s={0.8} o={1 - p} />
        ))}
        <HandText x={780} y={410} text="Tere mi döndü?" size={58} p={tw(f, w(7), w(7) + 14)} />
      </Bubble>
      {left > 0 ? <Cross x={300} y={520} size={130} p={x1} /> : null}
      {right > 0 ? <Cross x={780} y={460} size={130} p={x2} /> : null}
    </>
  );
};

// "Yağ yakıldığında karbondioksit ve suya dönüşür."
const CELLS = [
  [-110, -105],
  [5, -125],
  [115, -95],
  [-165, 10],
  [-55, -5],
  [60, 5],
  [170, 20],
  [-100, 115],
  [15, 120],
  [125, 115],
];
const YagHucresi: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const id = svgId(useId());
  const L = { x: 720, y: 700, r: 250 };
  const person = { x: 290, y: PY, s: 0.84 };
  const B = { x: person.x, y: person.y - 450 * person.s };
  const open = tw(f, 0, 16);
  const v = [L.x - B.x, L.y - B.y];
  const len = Math.hypot(v[0], v[1]);
  const n = [-v[1] / len, v[0] / len];
  const start = w(1);
  const step = Math.max(3, (w(5) - w(1)) / CELLS.length);
  return (
    <>
      <Person x={person.x} y={person.y} s={person.s} belly={0.42} armL={[10, 0]} armR={[14, 0]} tilt={6} lookY={-3} mouth="o" />
      <g opacity={open}>
        <circle cx={B.x} cy={B.y} r={46} fill="none" stroke={C.ink} strokeWidth={6} strokeDasharray="12 9" />
        {[1, -1].map((k) => (
          <path
            key={k}
            d={`M${B.x + n[0] * 46 * k} ${B.y + n[1] * 46 * k} L${L.x + n[0] * L.r * k} ${L.y + n[1] * L.r * k}`}
            stroke={C.ink}
            strokeWidth={5}
            strokeDasharray="14 10"
            opacity={0.55}
          />
        ))}
      </g>
      <g transform={`translate(${L.x} ${L.y}) scale(${open}) translate(${-L.x} ${-L.y})`}>
        <clipPath id={`lens${id}`}>
          <circle cx={L.x} cy={L.y} r={L.r} />
        </clipPath>
        <circle cx={L.x} cy={L.y} r={L.r} fill="#f3d2b0" />
        <g clipPath={`url(#lens${id})`}>
          {CELLS.map(([cx, cy], i) => {
            const p = tw(f, start + i * step, start + i * step + 22);
            const X = L.x + cx;
            const Y = L.y + cy;
            return (
              <g key={i}>
                {p < 1 ? (
                  <g transform={`translate(${X} ${Y}) scale(${1 - 0.9 * p})`} opacity={1 - p * 0.6}>
                    <circle r={58} fill={C.fat} stroke={C.fatDark} strokeWidth={6} />
                    <ellipse cx={-18} cy={-20} rx={16} ry={10} fill="#fff4c8" opacity={0.7} />
                  </g>
                ) : null}
                {p > 0
                  ? [0, 1, 2, 3].map((k) => {
                      const a = random(`a${i}${k}`) * Math.PI * 2;
                      const dist = 30 + 110 * Easing.out(Easing.quad)(p);
                      const px = X + Math.cos(a) * dist;
                      const py = Y + Math.sin(a) * dist - 40 * p;
                      return k < 3 ? (
                        <circle key={k} cx={px} cy={py} r={15} fill={C.co2} stroke={C.ink} strokeWidth={4} opacity={Math.min(1, p * 3)} />
                      ) : (
                        <Drop key={k} x={px} y={py} s={0.9} o={Math.min(1, p * 3)} />
                      );
                    })
                  : null}
              </g>
            );
          })}
        </g>
        <circle cx={L.x} cy={L.y} r={L.r} fill="none" stroke={C.ink} strokeWidth={16} />
        <circle cx={L.x} cy={L.y} r={L.r - 14} fill="none" stroke="#fff6dc" strokeWidth={5} opacity={0.6} />
        <path d={`M${L.x - 150} ${L.y - 150} A210 210 0 0 1 ${L.x + 20} ${L.y - 210}`} stroke="#fff" strokeWidth={10} fill="none" opacity={0.5} strokeLinecap="round" />
      </g>
      <g opacity={tw(f, w(2) - 2, w(2) + 8)}>
        <circle cx={590} cy={1035} r={24} fill={C.co2} stroke={C.ink} strokeWidth={5} />
        <HandText x={630} y={1058} text="CO₂" size={72} anchor="start" p={tw(f, w(2), w(2) + 12)} />
      </g>
      <g opacity={tw(f, w(4) - 2, w(4) + 8)}>
        <Drop x={810} y={1035} s={1.4} />
        <HandText x={845} y={1058} text="su" size={72} anchor="start" p={tw(f, w(4), w(4) + 10)} />
      </g>
    </>
  );
};

// "Bunun yüzde seksen dördü, nefes verirken akciğerlerinden dışarı çıkar."
const Nefes: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const s = 1;
  const mouth = { x: PX, y: PY - 656 * s };
  const period = 42;
  const start = w(4) - 10;
  const phase = f < start ? 0 : ((f - start) % period) / period;
  const exhaling = f >= start && phase < 0.5;
  const breath = f < start ? 0.5 + 0.5 * Math.sin(f / 10) : exhaling ? 1 - phase * 2 : (phase - 0.5) * 2;
  return (
    <>
      <Person
        x={PX}
        y={PY}
        s={s}
        belly={tw(f, w(4), d, 0.42, 0.34)}
        armL={[14, 0]}
        armR={[14, 0]}
        lungs={tw(f, w(5), w(6) + 4)}
        breath={breath}
        mouth={exhaling ? "o" : "smile"}
        eyes={exhaling ? "closed" : "open"}
      />
      {cycles(f, start, period, 54).map(({ k, p }) => (
        <Puff key={k} x={mouth.x + 30} y={mouth.y} p={p} dx={200} dy={-200} label="CO₂" s={1.25} />
      ))}
      <HandText x={260} y={480} text="%84" size={170} p={tw(f, w(1), w(3) + 6)} color={C.red} />
      <Arrow d="M380 470 Q520 380 690 450" p={tw(f, w(4), w(4) + 14)} color={C.red} w={9} />
      <Arrow d="M668 420 L692 452 L655 466" p={tw(f, w(4) + 12, w(4) + 18)} color={C.red} w={9} />
    </>
  );
};

// "Geri kalanı su olarak ter ve idrarla atılır."
const Su: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const wipe = tw(f, w(4) - 4, w(4) + 8) - tw(f, w(6), w(6) + 10);
  return (
    <>
      <Person
        x={PX}
        y={PY}
        belly={0.34}
        armL={[12, 0]}
        armR={[30 + 120 * wipe, -150 * wipe]}
        mouth="flat"
        eyes={wipe > 0.5 ? "closed" : "open"}
        blush={0.7}
      >
        {cycles(f, w(4), 9, 34).map(({ k, p }) => {
          const x = [-50, 40, -10, 60, -70][k % 5];
          const y0 = -760 + (k % 3) * 20;
          return <Drop key={k} x={x + (x > 0 ? 40 : -40) * p} y={y0 + 300 * p * p} s={1.1} o={interpolate(p, [0, 0.1, 0.8, 1], [0, 1, 1, 0])} />;
        })}
        {cycles(f, w(4) + 5, 13, 30).map(({ k, p }) => (
          <Drop key={`a${k}`} x={(k % 2 ? 1 : -1) * 150} y={-470 + 220 * p * p} s={0.9} o={1 - p} />
        ))}
      </Person>
      <ellipse cx={PX} cy={PY + 18} rx={60 + 120 * tw(f, w(4), w(7) + 20)} ry={12 + 10 * tw(f, w(4), w(7) + 20)} fill={C.water} opacity={0.45} />
      <g>
        <Drop x={300} y={460} s={2.4 * pop(f, w(2) - 3)} />
        <HandText x={470} y={490} text="%16 su" size={110} p={tw(f, w(2), w(3) + 6)} color={C.water} />
      </g>
    </>
  );
};

// "Peki hızlı hızlı nefes alsan, daha çok yağ yakar mısın? Hayır."
const HizliNefes: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const pant = f >= w(1);
  const dizzy = f >= w(10);
  const fast = Math.sin(f * 0.9);
  const wobble = dizzy ? Math.sin(f / 5) * 7 : 0;
  const mouth = { x: PX, y: PY - 656 };
  return (
    <>
      <Person
        x={PX + wobble * 3}
        y={PY + (pant ? Math.abs(fast) * 6 : 0)}
        belly={0.42}
        armL={[14 + (pant ? 4 * fast : 0), 0]}
        armR={[14 - (pant ? 4 * fast : 0), 0]}
        mouth={pant ? (fast > 0 ? "open" : "o") : "smile"}
        eyes={dizzy ? "dizzy" : pant ? "wide" : "open"}
        lungs={pant ? 0.9 : 0}
        breath={0.5 + 0.5 * fast}
        tilt={wobble}
        blush={pant ? 0.8 : 0.4}
      >
        {dizzy
          ? [0, 1, 2].map((i) => {
              const a = f / 7 + (i * Math.PI * 2) / 3;
              return <Star key={i} x={Math.cos(a) * 115} y={-800 + Math.sin(a) * 26} r={24} rot={f * 6} />;
            })
          : null}
      </Person>
      {pant && !dizzy
        ? cycles(f, w(1), 9, 18).map(({ k, p }) => <Puff key={k} x={mouth.x + 25} y={mouth.y} p={p} dx={120} dy={-60 + (k % 3) * 40} s={0.6} />)
        : null}
      <HandText x={760} y={560} text="Hayır!" size={150} p={tw(f, w(10), w(10) + 10)} color={C.red} rotate={-8} />
      <HandText x={250} y={880} text="yağ aynı" size={74} p={tw(f, w(10) + 8, w(10) + 22)} />
      <Arrow d="M300 900 Q360 960 430 935" p={tw(f, w(10) + 18, w(10) + 28)} w={7} />
    </>
  );
};

// "Önce kasların bu yağı yakıt olarak kullanmalı. Bu da ancak hareketle olur."
const Hareket: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const run = f / 4.2;
  const l = Math.max(0, Math.sin(run));
  const r = Math.max(0, -Math.sin(run));
  const bob = Math.abs(Math.sin(run)) * 16;
  const flowStart = w(3);
  const burn = tw(f, w(4) - 3, w(4) + 10);
  const s = 0.95;
  const mouth = { x: PX, y: PY - bob - 656 * s };
  return (
    <>
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${170 - i * 20} ${1060 + i * 90} l-90 0`}
          stroke={C.ink}
          strokeWidth={7}
          strokeLinecap="round"
          opacity={0.45 + 0.3 * Math.sin(f / 3 + i)}
        />
      ))}
      <Person
        x={PX}
        y={PY - bob}
        s={s}
        belly={tw(f, flowStart, d, 0.42, 0.24)}
        legL={{ lift: l }}
        legR={{ lift: r }}
        armL={[18 + 22 * r, -130 + 30 * l]}
        armR={[18 + 22 * l, -130 + 30 * r]}
        mouth="o"
        legGlow={tw(f, w(1) - 2, w(1) + 10) * (0.5 + 0.5 * burn)}
        blush={0.7}
      >
        {/* yağ parçacıkları göbekten bacak kaslarına akar, orada yanar */}
        {cycles(f, flowStart, 5, 26).map(({ k, p }) => {
          const side = k % 2 ? 1 : -1;
          const x = side * (30 + 20 * p) + Math.sin(k) * 15;
          const y = -440 + 230 * p;
          const lit = p > 0.7 ? burn : 0;
          return (
            <g key={k}>
              <circle cx={x} cy={y} r={13 * (1 - 0.4 * p)} fill={lit ? C.glow : C.fat} stroke={C.fatDark} strokeWidth={3} opacity={interpolate(p, [0, 0.1, 0.85, 1], [0, 1, 1, 0])} />
            </g>
          );
        })}
      </Person>
      {cycles(f, w(7), 22, 46).map(({ k, p }) => (
        <Puff key={k} x={mouth.x + 30} y={mouth.y} p={p} dx={200} dy={-170} label="CO₂" />
      ))}
      <HandText x={250} y={500} text="yakıt" size={110} p={tw(f, w(4), w(4) + 12)} color={C.glow} />
      <Arrow d="M260 530 Q300 760 450 980" p={tw(f, w(4) + 6, w(4) + 20)} color={C.glow} w={8} />
    </>
  );
};

// "Yani yağı hareketle yakar, nefesinle dışarı verirsin. Bunu kaydet, unutma."
const Kapanis: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const thumbs = tw(f, w(8) - 3, w(8) + 8);
  const s = 0.9;
  const mouth = { x: PX + 140, y: PY - 656 * s };
  const save = pop(f, w(7), 14);
  return (
    <>
      <Person
        x={PX + 140}
        y={PY}
        s={s}
        belly={0.22}
        armL={[45, -110]}
        armR={[45 + 120 * thumbs, -110 + 70 * thumbs]}
        mouth={f > w(4) && f < w(6) + 10 ? "o" : "grin"}
        eyes={f > w(4) && f < w(6) + 10 ? "closed" : "open"}
      />
      {cycles(f, w(4), 40, 50)
        .filter(({ k }) => k < 2)
        .map(({ k, p }) => (
          <Puff key={k} x={mouth.x + 25} y={mouth.y} p={p} dx={160} dy={-160} label="CO₂" />
        ))}
      <HandText x={110} y={430} text="hareket → yakar" size={92} anchor="start" p={tw(f, w(1), w(3) + 6)} />
      <HandText x={110} y={560} text="nefes → dışarı" size={92} anchor="start" p={tw(f, w(4), w(6) + 4)} />
      {save > 0 ? (
        <g transform={`translate(250 900) scale(${save}) rotate(-6)`}>
          <path d="M-70 -95 L70 -95 L70 100 L0 50 L-70 100 Z" fill={C.yellow} stroke={C.ink} strokeWidth={10} strokeLinejoin="round" />
          <text x={0} y={175} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={80} fill={C.ink}>
            kaydet
          </text>
        </g>
      ) : null}
    </>
  );
};

/* ---------- 02 tartı: eşyalar ---------- */

const Moon: React.FC<{ x: number; y: number; s?: number; o?: number }> = ({ x, y, s = 1, o = 1 }) =>
  o > 0 ? (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <path d="M10 -70 A70 70 0 1 0 10 70 A56 56 0 1 1 10 -70 Z" fill={C.cream} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
      {[
        [-150, -40, 10],
        [80, 50, 8],
        [-120, 70, 7],
      ].map(([sx, sy, r], i) => (
        <Star key={i} x={sx} y={sy} r={r * 1.6} rot={0} />
      ))}
    </g>
  ) : null;

const Sun: React.FC<{ x: number; y: number; s?: number; o?: number; rot?: number }> = ({ x, y, s = 1, o = 1, rot = 0 }) =>
  o > 0 ? (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <g transform={`rotate(${rot})`} stroke={C.ink} strokeWidth={7} strokeLinecap="round">
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i * 36 * Math.PI) / 180;
          return <path key={i} d={`M${Math.sin(a) * 82} ${Math.cos(a) * 82} L${Math.sin(a) * 110} ${Math.cos(a) * 110}`} />;
        })}
      </g>
      <circle r={62} fill={C.yellow} stroke={C.ink} strokeWidth={7} />
    </g>
  ) : null;

const Burger: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinejoin="round">
    <path d="M-72 0 Q-76 -16 -58 -16 L58 -16 Q76 -16 72 0 Z" fill="#d79a4e" stroke={C.ink} strokeWidth={5} />
    <rect x={-78} y={-36} width={156} height={22} rx={11} fill="#6b3b22" stroke={C.ink} strokeWidth={5} />
    <path d="M-80 -38 l16 -9 l16 9 l16 -9 l16 9 l16 -9 l16 9 l16 -9 l16 9 l16 -9 l16 9" stroke="#5e9a3c" strokeWidth={8} fill="none" strokeLinecap="round" />
    <path d="M-74 -44 Q-74 -96 0 -96 Q74 -96 74 -44 Z" fill="#e0a65a" stroke={C.ink} strokeWidth={5} />
    {[
      [-30, -72],
      [8, -82],
      [36, -66],
      [-4, -60],
    ].map(([sx, sy], i) => (
      <ellipse key={i} cx={sx} cy={sy} rx={6} ry={3.5} fill={C.cream} />
    ))}
  </g>
);

const Cake: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinejoin="round">
    <rect x={-72} y={-80} width={144} height={80} rx={8} fill="#f3d7a8" stroke={C.ink} strokeWidth={5} />
    <rect x={-72} y={-48} width={144} height={14} fill="#c9566b" />
    <path d="M-74 -78 Q-60 -96 -45 -80 Q-30 -96 -15 -80 Q0 -96 15 -80 Q30 -96 45 -80 Q60 -96 74 -78" fill={C.cream} stroke={C.ink} strokeWidth={5} />
    <circle cx={0} cy={-100} r={13} fill={C.red} stroke={C.ink} strokeWidth={4} />
  </g>
);

const Calendar: React.FC<{ x: number; y: number; s?: number; mark: number }> = ({ x, y, s = 1, mark }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-95} y={-90} width={190} height={180} rx={14} fill={C.cream} stroke={C.ink} strokeWidth={7} />
    <path d="M-95 -50 L-95 -76 Q-95 -90 -81 -90 L81 -90 Q95 -90 95 -76 L95 -50 Z" fill={C.red} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
    {[-50, 50].map((rx) => (
      <rect key={rx} x={rx - 6} y={-104} width={12} height={30} rx={6} fill={C.ink} />
    ))}
    {Array.from({ length: 12 }, (_, i) => {
      const cx = -66 + (i % 4) * 44;
      const cy = -26 + Math.floor(i / 4) * 44;
      return <rect key={i} x={cx - 13} y={cy - 13} width={26} height={26} rx={4} fill="#e4d4b4" />;
    })}
    {[5, 6, 7].map((k, i) => {
      const cx = -66 + (k % 4) * 44;
      const cy = -26 + Math.floor(k / 4) * 44;
      const p = tw(mark, i / 3, (i + 1) / 3);
      return p > 0 ? (
        <circle key={k} cx={cx} cy={cy} r={20} fill="none" stroke={C.red} strokeWidth={6} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} />
      ) : null;
    })}
  </g>
);

const Stomach: React.FC<{ x: number; y: number; s?: number; fill: number }> = ({ x, y, s = 1, fill }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-30 -120 L-30 -70" stroke={C.ink} strokeWidth={26} strokeLinecap="round" />
    <path d="M-30 -120 L-30 -70" stroke={C.lung} strokeWidth={14} strokeLinecap="round" />
    <path
      d="M-40 -78 C-10 -100 85 -86 82 -10 C80 60 10 92 -45 66 C-95 42 -78 -4 -40 -6 C-20 -8 -70 -48 -40 -78 Z"
      fill={C.lung}
      stroke={C.ink}
      strokeWidth={7}
      strokeLinejoin="round"
    />
    {[
      [10, 30, "#8a5a2b"],
      [40, 0, "#5e9a3c"],
      [-20, 45, "#d79a4e"],
      [30, 45, "#c9566b"],
      [55, 25, "#d79a4e"],
    ].map(([fx, fy, c], i) => {
      const p = tw(fill, i / 5, (i + 1) / 5);
      return <circle key={i} cx={fx as number} cy={(fy as number) - 40 * (1 - p)} r={13 * p} fill={c as string} stroke={C.ink} strokeWidth={3} />;
    })}
  </g>
);

const Dumbbell: React.FC<{ x: number; y: number; s?: number; rot?: number }> = ({ x, y, s = 1, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`} stroke={C.ink} strokeWidth={6} strokeLinejoin="round">
    <rect x={-92} y={-9} width={184} height={18} rx={9} fill="#9a9a9a" />
    {[-1, 1].map((k) => (
      <g key={k}>
        <rect x={k * 70 - 16} y={-56} width={32} height={112} rx={8} fill="#4b4b55" />
        <rect x={k * 100 - 11} y={-40} width={22} height={80} rx={7} fill="#4b4b55" />
      </g>
    ))}
  </g>
);

/* ---------- 02 tartı: sahneler ---------- */

// "Dün akşam her şey normaldi. Bu sabah tartıya çıktın ve bir kilo fazla."
const TartiAcilis: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const morning = tw(f, w(5) - 4, w(5) + 16);
  const step = tw(f, w(7) - 2, w(8) + 8);
  const kg = tw(f, w(9), w(12) + 6, 80, 81);
  const shock = tw(f, w(12) - 2, w(12) + 8);
  const shake = shock > 0 ? Math.sin(f / 2) * 3 * shock : 0;
  return (
    <>
      <Moon x={790} y={430} o={1 - morning} />
      <Sun x={790} y={430 + 60 * (1 - morning)} o={morning} rot={f * 0.4} />
      <Bathroom x={PX + 60} y={PY + 6} value={step < 1 ? "--.-" : `${kg.toFixed(1)} kg`} />
      <Person
        x={interpolate(step, [0, 1], [PX - 230, PX + 60]) + shake}
        y={PY - 58 * step - Math.sin(step * Math.PI) * 60}
        s={0.95}
        belly={0.42}
        legL={{ lift: Math.sin(step * Math.PI) * 0.6 }}
        armL={[10 + 135 * shock, -140 * shock]}
        armR={[10 + 135 * shock, -140 * shock]}
        mouth={shock > 0.5 ? "o" : f < w(5) ? "smile" : "flat"}
        eyes={shock > 0.5 ? "wide" : f < w(5) ? "closed" : "open"}
        lookY={step > 0.5 && shock < 0.5 ? 10 : 0}
        tilt={step > 0.5 && shock < 0.5 ? 8 : 0}
      />
      <HandText x={270} y={600} text="+1 kg" size={150} p={tw(f, w(12), w(12) + 12)} color={C.red} rotate={-8} />
    </>
  );
};

// "Panik yapma. O bir kilo yağ değil."
const TartiPanik: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const calm = tw(f, w(1) + 2, w(2) + 8);
  const panic = 1 - calm;
  const wob = Math.sin(f / 2.5) * 6 * panic;
  const blob = pop(f, w(3) - 2, 14);
  const x = tw(f, w(6) - 2, w(6) + 14);
  return (
    <>
      <Bathroom x={PX + 120} y={PY + 6} value="81.0 kg" />
      <Person
        x={PX + 120 + wob}
        y={PY - 58}
        s={0.92}
        belly={0.42}
        armL={[150 * panic + 10 * calm, -150 * panic]}
        armR={[150 * panic + 10 * calm, -150 * panic]}
        mouth={panic > 0.5 ? "open" : "smile"}
        eyes={panic > 0.5 ? "wide" : f < w(3) ? "closed" : "open"}
        tilt={wob}
        blush={0.4 + 0.4 * panic}
      >
        {panic > 0.3
          ? cycles(f, 0, 7, 22).map(({ k, p }) => (
              <Drop key={k} x={(k % 2 ? 1 : -1) * (95 + 60 * p)} y={-760 + 120 * p * p} s={0.9} o={(1 - p) * panic} />
            ))
          : null}
      </Person>
      {calm > 0.2 && f < w(3) + 10
        ? cycles(f, w(2), 60, 50).map(({ k, p }) => <Puff key={k} x={PX + 150} y={PY - 58 - 600} p={p} dx={160} dy={-120} />)
        : null}
      {blob > 0 ? (
        <g transform={`translate(270 640) scale(${blob})`}>
          <path
            d="M-120 0 C-140 -100 -40 -140 20 -110 C100 -150 160 -60 120 0 C140 80 40 110 -20 80 C-100 110 -150 60 -120 0 Z"
            fill={C.fat}
            stroke={C.fatDark}
            strokeWidth={8}
          />
          <ellipse cx={-40} cy={-50} rx={34} ry={18} fill="#fff4c8" opacity={0.7} />
          <text x={0} y={30} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={90} fill={C.ink}>
            1 kg
          </text>
        </g>
      ) : null}
      {blob > 0 ? <Cross x={270} y={640} size={150} p={x} /> : null}
    </>
  );
};

// "Bir kilo yağ için yaklaşık yedi bin yedi yüz kalori fazla yemen gerekir. Tek gecede mi? Neredeyse imkânsız."
const TartiKalori: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const n = 9;
  const t0 = w(4);
  const step = Math.max(3, (w(12) - t0) / n);
  const night = pop(f, w(13) - 2, 14);
  const no = f >= w(16);
  const shakeHead = no ? Math.sin((f - w(16)) / 3) * 8 * (1 - tw(f, w(17) + 10, w(17) + 30)) : 0;
  return (
    <>
      <ellipse cx={290} cy={PY + 4} rx={140} ry={26} fill={C.cream} stroke={C.ink} strokeWidth={7} />
      {Array.from({ length: n }, (_, i) => {
        const p = tw(f, t0 + i * step, t0 + i * step + 10);
        if (p <= 0) return null;
        const y = PY - 8 - i * 88 - 140 * (1 - p);
        const sway = Math.sin(f / 18 + i * 0.7) * i * 1.4;
        const Item = i % 2 ? Cake : Burger;
        return (
          <g key={i} opacity={Math.min(1, p * 2)}>
            <Item x={290 + sway} y={y} s={0.95} />
          </g>
        );
      })}
      <Person
        x={790}
        y={PY}
        s={0.82}
        belly={0.42}
        armL={[14, 0]}
        armR={[14, 0]}
        mouth={no ? "grin" : f >= w(9) ? "o" : "flat"}
        eyes={f >= w(9) && !no ? "wide" : "open"}
        lookY={no ? 0 : -6}
        tilt={no ? shakeHead : -10 * tw(f, w(4), w(6))}
      />
      <HandText x={760} y={470} text="7.700 kcal" size={120} p={tw(f, w(5), w(9) + 6)} color={C.red} rotate={-4} />
      <Moon x={830} y={250} s={0.7 * night} o={night > 0 ? 1 : 0} />
      <Cross x={290} y={950} size={200} p={tw(f, w(17) - 2, w(17) + 14)} />
    </>
  );
};

// "Asıl sebep su. Kasların karbonhidrat depolarken yanında üç katı su tutar."
const GRAINS = [
  [-120, -100],
  [25, -130],
  [140, -50],
  [-160, 30],
  [-20, 10],
  [115, 85],
  [-70, 140],
];
const TartiSu: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const id = svgId(useId());
  const L = { x: 720, y: 760, r: 250 };
  const person = { x: 270, y: PY, s: 0.84 };
  const B = { x: person.x + 47 * person.s, y: person.y - 262 * person.s };
  const open = tw(f, 0, 16);
  const v = [L.x - B.x, L.y - B.y];
  const len = Math.hypot(v[0], v[1]);
  const nrm = [-v[1] / len, v[0] / len];
  const gStart = w(4) - 4;
  const gStep = Math.max(3, (w(6) - gStart) / GRAINS.length);
  const wStart = w(7) - 4;
  const wStep = Math.max(2, (w(10) - wStart) / GRAINS.length);
  const big = pop(f, w(2) - 3, 14);
  return (
    <>
      <Person x={person.x} y={person.y} s={person.s} belly={0.42} armL={[10, 0]} armR={[14, 0]} tilt={8} lookY={6} mouth="o" />
      <g opacity={open}>
        <circle cx={B.x} cy={B.y} r={40} fill="none" stroke={C.ink} strokeWidth={6} strokeDasharray="12 9" />
        {[1, -1].map((k) => (
          <path
            key={k}
            d={`M${B.x + nrm[0] * 40 * k} ${B.y + nrm[1] * 40 * k} L${L.x + nrm[0] * L.r * k} ${L.y + nrm[1] * L.r * k}`}
            stroke={C.ink}
            strokeWidth={5}
            strokeDasharray="14 10"
            opacity={0.55}
          />
        ))}
      </g>
      <g transform={`translate(${L.x} ${L.y}) scale(${open}) translate(${-L.x} ${-L.y})`}>
        <clipPath id={`lens${id}`}>
          <circle cx={L.x} cy={L.y} r={L.r} />
        </clipPath>
        <circle cx={L.x} cy={L.y} r={L.r} fill="#eab0a2" />
        <g clipPath={`url(#lens${id})`}>
          {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => {
            const y = L.y + i * 56 + Math.sin(f / 30 + i) * 3;
            return (
              <g key={i}>
                <path d={`M${L.x - 280} ${y} Q${L.x} ${y + 14} ${L.x + 280} ${y}`} stroke="#c9685b" strokeWidth={34} fill="none" opacity={0.55} />
                <path d={`M${L.x - 280} ${y + 22} Q${L.x} ${y + 36} ${L.x + 280} ${y + 22}`} stroke={C.ink} strokeWidth={3} fill="none" opacity={0.35} />
              </g>
            );
          })}
          {GRAINS.map(([gx, gy], i) => {
            const p = tw(f, gStart + i * gStep, gStart + i * gStep + 18);
            if (p <= 0) return null;
            const X = L.x + gx - 320 * (1 - p);
            const Y = L.y + gy;
            const wp = tw(f, wStart + i * wStep, wStart + i * wStep + 12);
            return (
              <g key={i}>
                {[0, 1, 2].map((k) => {
                  const a = ((k * 120 + i * 37) * Math.PI) / 180;
                  const r = 30 + 30 * wp;
                  return wp > 0 ? <Drop key={k} x={X + Math.cos(a) * r} y={Y + Math.sin(a) * r + 6} s={0.85 * wp} /> : null;
                })}
                <circle cx={X} cy={Y} r={20} fill="#c98a3a" stroke={C.ink} strokeWidth={4} />
                <ellipse cx={X - 6} cy={Y - 7} rx={6} ry={4} fill="#f6d8a0" opacity={0.8} />
              </g>
            );
          })}
        </g>
        <circle cx={L.x} cy={L.y} r={L.r} fill="none" stroke={C.ink} strokeWidth={16} />
        <circle cx={L.x} cy={L.y} r={L.r - 14} fill="none" stroke="#fff6dc" strokeWidth={5} opacity={0.6} />
        <path d={`M${L.x - 150} ${L.y - 150} A210 210 0 0 1 ${L.x + 20} ${L.y - 210}`} stroke="#fff" strokeWidth={10} fill="none" opacity={0.5} strokeLinecap="round" />
      </g>
      {big > 0 ? <Drop x={250} y={430} s={3.2 * big} /> : null}
      <HandText x={720} y={1150} text="×3 su" size={130} p={tw(f, w(7), w(9) + 6)} color={C.water} />
    </>
  );
};

// "Tuzlu bir akşam yemeği yedin mi, vücudun o suyu bırakmaz."
const TartiTuz: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const s = 0.9;
  const px = PX - 120;
  const lower = tw(f, w(5) + 4, w(6) + 6);
  const shake = lower < 1 ? Math.sin(f / 2.2) * 9 * (1 - lower) : 0;
  const armR: Arm = [interpolate(lower, [0, 1], [100, 14]) + shake, interpolate(lower, [0, 1], [-45, 0])];
  const hand = armPoints(1, armR)[2];
  const plate = { x: px + armPoints(1, [100, -45])[2][0] * s, y: 1010 };
  const level = tw(f, w(6) - 2, d - 6);
  return (
    <>
      {/* masa */}
      <g stroke={C.ink} strokeWidth={8} strokeLinejoin="round">
        <rect x={plate.x - 200} y={1040} width={400} height={30} rx={8} fill="#b07b4a" />
        <rect x={plate.x - 170} y={1068} width={24} height={PY - 1060} fill="#8a5c35" />
        <rect x={plate.x + 146} y={1068} width={24} height={PY - 1060} fill="#8a5c35" />
      </g>
      <ellipse cx={plate.x} cy={plate.y + 18} rx={120} ry={26} fill={C.cream} stroke={C.ink} strokeWidth={6} />
      <ellipse cx={plate.x - 20} cy={plate.y + 6} rx={55} ry={20} fill="#8a5a2b" stroke={C.ink} strokeWidth={4} />
      <ellipse cx={plate.x + 40} cy={plate.y + 10} rx={34} ry={14} fill={C.cream} stroke={C.ink} strokeWidth={4} />
      {[-40, 0, 30].map((gx, i) => (
        <circle key={i} cx={plate.x + gx} cy={plate.y - 4 + (i % 2) * 8} r={7} fill="#5e9a3c" />
      ))}
      <Person
        x={px}
        y={PY}
        s={s}
        belly={interpolate(level, [0, 1], [0.42, 0.62])}
        armL={[12, 0]}
        armR={armR}
        mouth={level > 0.3 ? "worry" : "smile"}
        eyes={level > 0.6 ? "wide" : "open"}
        blush={0.4 + 0.4 * level}
      >
        {level > 0 ? (
          <ellipse cx={0} cy={-450} rx={70 + 30 * level} ry={30 + 45 * level} fill={C.water} opacity={0.35 * level} stroke={C.water} strokeWidth={4} />
        ) : null}
        {lower < 1 ? (
          <g transform={`translate(${hand[0]} ${hand[1]}) rotate(${160 + shake * 2})`} opacity={1 - lower}>
            <path d="M-26 -10 L26 -10 L22 70 Q0 78 -22 70 Z" fill={C.cream} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
            <path d="M-26 -10 Q0 -40 26 -10 Z" fill="#9a9a9a" stroke={C.ink} strokeWidth={6} />
            <text x={0} y={42} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={34} fill={C.ink} transform="rotate(180 0 32)">
              T
            </text>
          </g>
        ) : null}
        {lower < 1
          ? cycles(f, 4, 2, 16).map(({ k, p }) => (
              <circle
                key={k}
                cx={hand[0] + ((k * 7) % 20) - 10}
                cy={hand[1] + 50 + 170 * p}
                r={4}
                fill="#fffaf0"
                stroke={C.ink}
                strokeWidth={1.5}
                opacity={(1 - lower) * (1 - p * 0.5)}
              />
            ))
          : null}
        {/* su, dışarıdan vücuda çekilir ve orada kalır */}
        {cycles(f, w(6) - 2, 6, 30).map(({ k, p }) => {
          const a = random(`ts${k}`) * Math.PI * 2;
          const r0 = 380;
          const e = Easing.in(Easing.quad)(p);
          return (
            <Drop key={k} x={Math.cos(a) * r0 * (1 - e)} y={-450 + Math.sin(a) * r0 * (1 - e)} s={1} o={interpolate(p, [0, 0.15, 0.85, 1], [0, 1, 1, 0])} />
          );
        })}
      </Person>
    </>
  );
};

// "Regl dönemi, midendeki yemek, hatta dünkü antrenman bile tartıyı oynatır."
const TartiDiger: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const jolt = f >= w(8);
  const bounce = (i: number) => (jolt ? Math.abs(Math.sin((f - w(8)) / 4 + i)) * 18 : 0);
  const values = ["80.0", "81.2", "79.6", "80.9", "79.9", "81.4"];
  const val = jolt ? values[Math.floor((f - w(8)) / 6) % values.length] : "80.0";
  const shake = jolt ? Math.sin(f / 1.8) * 3 : 0;
  const c = pop(f, w(0) - 2, 14);
  const st = pop(f, w(2) - 2, 14);
  const db = pop(f, w(5) - 2, 14);
  return (
    <>
      {c > 0 ? (
        <g transform={`translate(210 ${560 - bounce(0)}) scale(${c})`}>
          <Calendar x={0} y={0} mark={tw(f, w(0) + 4, w(1) + 10)} />
        </g>
      ) : null}
      {st > 0 ? (
        <g transform={`translate(540 ${520 - bounce(1)}) scale(${st})`}>
          <Stomach x={0} y={0} s={1.15} fill={tw(f, w(2) + 2, w(3) + 12)} />
        </g>
      ) : null}
      {db > 0 ? (
        <g transform={`translate(870 ${560 - bounce(2)}) scale(${db})`}>
          <Dumbbell x={0} y={0} s={0.95} rot={-20 + (f > w(5) && f < w(7) + 10 ? Math.sin(f / 4) * 14 : 0)} />
        </g>
      ) : null}
      <g transform={`rotate(${shake} ${PX} ${PY})`}>
        <Bathroom x={PX} y={PY + 6} value={`${val} kg`} />
        <Person
          x={PX}
          y={PY - 58}
          s={0.9}
          belly={0.42}
          armL={[16, 0]}
          armR={[16, 0]}
          mouth={jolt ? "worry" : "flat"}
          eyes={jolt ? "wide" : "open"}
          lookY={jolt ? 10 : -6}
          tilt={jolt ? 8 : f < w(2) ? -6 : f < w(5) ? 0 : 6}
        />
      </g>
      {jolt
        ? [-1, 1].map((k) => (
            <g key={k} stroke={C.ink} strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.6 + 0.3 * Math.sin(f / 3)}>
              <path d={`M${PX + k * 230} ${PY - 40} q${k * 20} 20 0 40 q${-k * 20} 20 0 40`} />
              <path d={`M${PX + k * 265} ${PY - 50} q${k * 20} 25 0 50 q${-k * 20} 25 0 50`} />
            </g>
          ))
        : null}
    </>
  );
};

// "O yüzden tek bir güne değil, haftalık ortalamaya bak."
const DAILY = [520, 410, 575, 495, 605, 525, 640];
const DAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const TartiOrtalama: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const x = (i: number) => 190 + i * 118;
  const board = tw(f, 0, 14);
  const line = tw(f, 2, w(2) + 6);
  const spike = pop(f, w(2), 14);
  const avg = tw(f, w(6) - 2, w(7) + 12);
  const pts = DAILY.map((y, i) => `${i ? "L" : "M"}${x(i)} ${y}`).join(" ");
  return (
    <>
      <g opacity={board} transform="rotate(-1.5 540 600)">
        <rect x={110} y={300} width={860} height={560} rx={20} fill={C.cream} stroke={C.ink} strokeWidth={8} />
        <path d={`M150 760 L930 760`} stroke={C.ink} strokeWidth={5} opacity={0.5} />
        {DAYS.map((t, i) => (
          <text key={t} x={x(i)} y={820} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={46} fill={C.ink}>
            {t}
          </text>
        ))}
        <Arrow d={pts} p={line} w={6} color={C.ink} />
        {DAILY.map((y, i) => {
          const p = pop(f, 2 + i * ((w(2) + 4) / 7), 10);
          return p > 0 ? <circle key={i} cx={x(i)} cy={y} r={14 * p} fill={C.ink} /> : null;
        })}
        {spike > 0 ? <circle cx={x(1)} cy={DAILY[1]} r={44 * spike} fill="none" stroke={C.red} strokeWidth={7} /> : null}
        <Cross x={x(1)} y={DAILY[1]} size={34} p={tw(f, w(5) - 2, w(5) + 10)} />
        <Arrow d={`M${x(0)} 500 L${x(6)} 610`} p={avg} w={16} color="#3f7d4f" />
      </g>
      <Person
        x={820}
        y={PY + 40}
        s={0.68}
        belly={0.42}
        armL={[interpolate(avg, [0, 1], [150, 140]), -10]}
        armR={[14, 0]}
        mouth={avg > 0.5 ? "grin" : "smile"}
        lookY={-6}
        tilt={-6}
      />
    </>
  );
};

// "Tartı yalan söylemez ama abartır. Kaydet, sonra lazım olur."
const TartiKapanis: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const grow = tw(f, w(3) - 2, w(4) + 16);
  const laugh = f >= w(4) && f < w(5) + 6;
  const thumbs = tw(f, w(6) - 3, w(6) + 8);
  const save = pop(f, w(5), 14);
  const sx = 740;
  const disp = { x: sx, y: PY - 20 };
  const bx = interpolate(grow, [0, 1], [disp.x, 470]);
  const by = interpolate(grow, [0, 1], [disp.y, 560]);
  const wob = Math.sin(f / 6) * 4 * grow;
  return (
    <>
      <Bathroom x={sx} y={PY + 6} value="81.0 kg" />
      <Person
        x={sx}
        y={PY - 58 - (laugh ? Math.abs(Math.sin(f / 3)) * 10 : 0)}
        s={0.88}
        belly={0.42}
        armL={[14, 0]}
        armR={[14 + 130 * thumbs, -60 * thumbs]}
        mouth={laugh || thumbs > 0.5 ? "grin" : "smile"}
        eyes={laugh ? "closed" : "open"}
      />
      {grow > 0 ? (
        <g transform={`translate(${bx} ${by}) scale(${0.25 + 1.6 * grow}) rotate(${wob})`}>
          <ellipse cx={0} cy={-30} rx={150} ry={100} fill="#fbe3dc" stroke={C.red} strokeWidth={6} />
          <path d="M-10 70 L10 70 L0 88 Z" fill={C.red} />
          <text x={0} y={0} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={110} fill={C.red}>
            +1 kg
          </text>
        </g>
      ) : null}
      {save > 0 ? (
        <g transform={`translate(220 1060) scale(${save}) rotate(-6)`}>
          <path d="M-70 -95 L70 -95 L70 100 L0 50 L-70 100 Z" fill={C.yellow} stroke={C.ink} strokeWidth={10} strokeLinejoin="round" />
          <text x={0} y={175} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={80} fill={C.ink}>
            kaydet
          </text>
        </g>
      ) : null}
    </>
  );
};

const SCENES: Record<string, React.FC<SceneProps>> = {
  "tarti-acilis": TartiAcilis,
  "tarti-panik": TartiPanik,
  "tarti-kalori": TartiKalori,
  "tarti-su": TartiSu,
  "tarti-tuz": TartiTuz,
  "tarti-diger": TartiDiger,
  "tarti-ortalama": TartiOrtalama,
  "tarti-kapanis": TartiKapanis,
  tarti: Tarti,
  "yanlis-fikir": YanlisFikir,
  "yag-hucresi": YagHucresi,
  nefes: Nefes,
  su: Su,
  "hizli-nefes": HizliNefes,
  hareket: Hareket,
  kapanis: Kapanis,
};
