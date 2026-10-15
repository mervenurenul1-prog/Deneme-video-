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

// Elle çizilmiş görünüm: sıcak sepya kâğıt, mürekkep çizgiler, tarama gölgeler, ışık huzmeleri.
// Her sahne söylenen şeyi birebir gösterir; animasyonlar ve kamera kelime zamanlamalarına bağlıdır
// (sessiz önizlemede tahmini, seslendirmeden sonra gerçek zamanlamalar).
const C = {
  paper: "#ecdcbc",
  ink: "#3a2716",
  skin: "#e9b48e",
  skinShade: "#c98b66",
  shirt: "#5d8c87",
  shirtShade: "#3f6a66",
  shirtLight: "#86b3ac",
  shorts: "#4b3f5e",
  shortsShade: "#352b45",
  hair: "#4a2f1d",
  shoe: "#33292a",
  sole: "#e8e0cf",
  fat: "#f0c24b",
  fatDark: "#b8862a",
  co2: "#8e9196",
  water: "#4f97c2",
  red: "#b23a2a",
  lung: "#e58f8f",
  glow: "#ff8a2a",
  yellow: "#ffd23f",
  cream: "#fbf3e2",
  lip: "#a4493c",
};

export type CizimProps = { cizim: Cizim; voiceover: PostVoiceover | null };

// w(i): i. kelimenin başladığı kare (sahneye göre)
type SceneProps = { d: number; w: (i: number) => number };

export const CizimVideo: React.FC<CizimProps> = ({ cizim, voiceover }) => {
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
            <Shot d={durations[i]}>
              <Visual d={durations[i]} w={w} />
            </Shot>
            <Captions words={words} />
            {audio ? <Audio src={staticFile(audio.file)} /> : null}
          </Sequence>
        );
      })}
      <Dust />
    </AbsoluteFill>
  );
};

const Missing: React.FC<SceneProps> = () => null;

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

type P = [number, number];
const add = (a: P, b: P, k = 1): P => [a[0] + b[0] * k, a[1] + b[1] * k];
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const perp = (a: P, b: P): P => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  return [-dy / l, dx / l];
};
const pt = (p: P) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
const circle = (c: P, r: number) => `M${pt([c[0] - r, c[1]])} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

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
        { x: 120, w: 170, a: 24, o: 0.26 },
        { x: 380, w: 110, a: 21, o: 0.2 },
        { x: 560, w: 220, a: 26, o: 0.15 },
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

/* ---------- geçiş ve kamera ---------- */

// Sahne girişi: hafif büyükten oturarak ve bulanıklıktan netleşerek; çıkışta kâğıda solar
const Shot: React.FC<{ d: number; children: React.ReactNode }> = ({ d, children }) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 7, d - 6, d], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(f, [0, 12], [1.12, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const blur = interpolate(f, [0, 10], [10, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})`, filter: blur > 0.1 ? `blur(${blur}px)` : undefined }}>
      <svg width="100%" height="100%" viewBox="0 0 1080 1920">
        <Defs />
        <g filter="url(#rough)">{children}</g>
      </svg>
    </AbsoluteFill>
  );
};

// El çizimi titreşimi ("kaynayan çizgi"), parlama ve tarama (gravür gölgesi) desenleri
const Defs: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <defs>
      <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed={Math.floor(frame / 4) % 5} />
        <feDisplacementMap in="SourceGraphic" scale="5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="14" />
      </filter>
      <pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
        <line x1="0" y1="0" x2="0" y2="9" stroke={C.ink} strokeWidth="2.2" />
      </pattern>
    </defs>
  );
};

type Key = [number, number, number, number]; // [kare, odak x, odak y, yakınlık]
// Kamera: anahtar karelere göre odak noktası ve yakınlık değişir (kaydırma, yaklaşma, uzaklaşma)
const Cam: React.FC<{ keys: Key[]; shake?: number; children: React.ReactNode }> = ({ keys, shake = 0, children }) => {
  const f = useCurrentFrame();
  const ks: Key[] = [];
  for (const k of keys) ks.push([ks.length ? Math.max(k[0], ks[ks.length - 1][0] + 1) : k[0], k[1], k[2], k[3]]);
  const t = ks.map((k) => k[0]);
  const at = (j: number) =>
    ks.length === 1 ? ks[0][j] : interpolate(f, t, ks.map((k) => k[j]), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const sx = shake ? Math.sin(f * 2.1) * shake : 0;
  const sy = shake ? Math.cos(f * 2.7) * shake : 0;
  // Yavaş "nefes alan" kamera: hiç tam durmaz
  const drift = 1 + 0.012 * Math.sin(f / 45);
  return (
    <g transform={`translate(${540 + sx} ${960 + sy}) scale(${at(3) * drift}) translate(${-at(1)} ${-at(2)})`}>{children}</g>
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

// Gerçekçi oranlı (boy ≈ 7 baş) yetişkin, önden görünüm. Yerel koordinatlar: ayak tabanı (0,0), yukarı negatif.
// Kol: [omuz açısı, dirsek bükümü, (isteğe bağlı) önkol boy çarpanı — öne uzanan kolun kısalması/uzaması]
// Açılar derece; 0 = aşağı, + = dışarı, 180 = yukarı.
type Arm = [number, number] | [number, number, number];
type Leg = { lift?: number; spread?: number };
type Mouth = "smile" | "grin" | "flat" | "o" | "open" | "worry";
type Eyes = "open" | "wide" | "closed" | "dizzy";

type PersonProps = {
  x: number;
  y: number;
  s?: number;
  belly?: number; // 0 fit … 1 göbekli
  armL?: Arm;
  armR?: Arm;
  legL?: Leg;
  legR?: Leg;
  mouth?: Mouth;
  eyes?: Eyes;
  look?: P; // gözbebeklerinin kayması
  tilt?: number;
  lungs?: number; // göğüste akciğerlerin görünürlüğü
  breath?: number; // akciğerlerin şişmesi 0..1
  legGlow?: number; // kasların "yanması"
  fat?: number; // göbekteki yağ katmanının görünürlüğü (röntgen gibi)
  blush?: number;
  sweat?: number;
  idle?: boolean; // nefes, göz kırpma, hafif salınım
  children?: React.ReactNode; // karakterin koordinatlarında ek çizimler
};

const SHOULDER_Y = -632;
const HIP_Y = -430;
const dir = (side: number, deg: number): P => {
  const r = (deg * Math.PI) / 180;
  return [side * Math.sin(r), Math.cos(r)];
};

const armJoints = (side: number, arm: Arm) => {
  const [a1, a2, reach = 1] = arm;
  const s: P = [side * 104, SHOULDER_Y];
  const e = add(s, dir(side, a1), 165);
  const h = add(e, dir(side, a1 + a2), 150 * reach);
  return { s, e, h, hd: dir(side, a1 + a2) };
};

const legJoints = (side: number, { lift = 0, spread = 3 }: Leg) => {
  const h: P = [side * 46, HIP_Y];
  const k = add(h, dir(side, spread), 205 * (1 - 0.5 * lift));
  const a = add(k, [side * 0.02, 1], 205 * (1 - 0.08 * lift));
  return { h, k, a };
};

// Kalınlığı boyunca değişen uzuv: [nokta, genişlik] → kapalı şekil
const taper = (pts: [P, number][], offset = 0, scale = 1) => {
  const L: P[] = [];
  const R: P[] = [];
  pts.forEach(([p, w], i) => {
    const a = pts[Math.max(0, i - 1)][0];
    const b = pts[Math.min(pts.length - 1, i + 1)][0];
    let n = perp(a, b);
    if (n[0] < 0) n = [-n[0], -n[1]]; // gölge hep sağda (ışık sol üstten)
    const c = add(p, n, offset * w);
    L.push(add(c, n, (w * scale) / 2));
    R.push(add(c, n, (-w * scale) / 2));
  });
  return `M${L.map(pt).join(" L")} L${R.reverse().map(pt).join(" L")} Z`;
};

// Parçaları tek siluet gibi çizer: önce hepsinin mürekkep kontürü, sonra dolguları (iç dikişler kaybolur)
const Silhouette: React.FC<{ d: string[]; fill: string; sw?: number; shade?: string[]; shadeFill?: string }> = ({
  d,
  fill,
  sw = 9,
  shade = [],
  shadeFill,
}) => (
  <g>
    {d.map((p, i) => (
      <path key={`o${i}`} d={p} fill={C.ink} stroke={C.ink} strokeWidth={sw} strokeLinejoin="round" />
    ))}
    {d.map((p, i) => (
      <path key={`f${i}`} d={p} fill={fill} />
    ))}
    {shade.map((p, i) => (
      <g key={`s${i}`}>
        <path d={p} fill={shadeFill} opacity={0.55} />
        <path d={p} fill="url(#hatch)" opacity={0.22} />
      </g>
    ))}
  </g>
);

const limbShapes = (pts: [P, number][]) => ({
  body: [taper(pts), ...pts.map(([p, w]) => circle(p, w / 2))],
  shade: [taper(pts, 0.26, 0.46)],
});

const Person: React.FC<PersonProps> = ({
  x,
  y,
  s = 1,
  belly = 0.5,
  armL = [8, 0],
  armR = [8, 0],
  legL = {},
  legR = {},
  mouth = "smile",
  eyes = "open",
  look = [0, 0],
  tilt = 0,
  lungs = 0,
  breath = 0,
  legGlow = 0,
  fat = 0,
  blush = 0.35,
  sweat = 0,
  idle = true,
  children,
}) => {
  const frame = useCurrentFrame();
  const id = svgId(useId());
  const seed = Math.round(x);
  const breathe = idle ? Math.sin(frame / 24 + seed) : 0;
  const blink = idle && eyes === "open" && (frame + seed * 7) % 96 < 4;
  const sway = idle ? Math.sin(frame / 38 + seed) * 0.7 : 0;

  const b = belly;
  const waist = 76 + 80 * b;
  const hipW = 86 + 30 * b;
  const hem = -418 + 34 * b;
  const L = legJoints(-1, legL);
  const R = legJoints(1, legR);
  const AL = armJoints(-1, armL);
  const AR = armJoints(1, armR);

  const leg = (j: ReturnType<typeof legJoints>) =>
    limbShapes([
      [j.h, 66],
      [lerp(j.h, j.k, 0.5), 58],
      [j.k, 40],
      [lerp(j.k, j.a, 0.3), 46],
      [lerp(j.k, j.a, 0.75), 32],
      [j.a, 26],
    ]);
  const arm = (j: ReturnType<typeof armJoints>) =>
    limbShapes([
      [j.s, 50],
      [lerp(j.s, j.e, 0.45), 42],
      [j.e, 32],
      [lerp(j.e, j.h, 0.35), 36],
      [j.h, 24],
    ]);
  const hand = (j: ReturnType<typeof armJoints>, side: number) => {
    const c = add(j.h, j.hd, 18);
    const thumb = add(add(j.h, j.hd, 10), [-side * 1, 0], 13);
    return [circle(c, 17), circle(thumb, 8)];
  };
  const forearm = (j: ReturnType<typeof armJoints>) => {
    const sh = limbShapes([
      [lerp(j.e, j.h, 0.06), 33],
      [lerp(j.e, j.h, 0.35), 36],
      [j.h, 24],
    ]);
    return { body: [sh.body[0], sh.body[3]], shade: sh.shade };
  };
  const lg = [leg(L), leg(R)];
  const ar = [arm(AL), arm(AR)];
  const fore = [forearm(AL), forearm(AR)];
  // Tişört kolu: omuzu yuvarlak örter, üst kolun ortasına kadar iner
  const sleeve = (j: ReturnType<typeof armJoints>) => [
    taper([[lerp(j.s, j.e, -0.1), 68], [lerp(j.s, j.e, 0.42), 56]]),
    circle(add(j.s, [0, 4]), 34),
  ];
  const thighBand = (j: ReturnType<typeof legJoints>, side: number) => {
    const m = lerp(j.h, j.k, 0.42);
    return [add(m, [side, 0], 40), add(m, [-side, 0], 36)] as const;
  };
  const [lo, li] = thighBand(L, -1);
  const [ro, ri] = thighBand(R, 1);

  const torso = `M-22 -686 Q-62 -668 -102 -646 Q-116 -612 -96 -574 Q-90 -540 ${-waist} -500 Q${-waist - 6} -452 ${-hipW} -428 Q0 ${hem + 26} ${hipW} -428 Q${waist + 6} -452 ${waist} -500 Q90 -540 96 -574 Q116 -612 102 -646 Q62 -668 22 -686 Q0 -678 -22 -686 Z`;
  const shorts = `M${-hipW - 4} -452 L${hipW + 4} -452 L${pt(ro)} L${pt(ri)} L0 -360 L${pt(li)} L${pt(lo)} Z`;

  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${sway} 0 0)`}>
      <ellipse cx={0} cy={10} rx={150 + 30 * b} ry={20} fill={C.ink} opacity={0.18} />
      {/* bacaklar */}
      {legGlow > 0 ? (
        <g filter="url(#glow)" opacity={legGlow * (0.75 + 0.25 * Math.sin(frame / 4))}>
          {lg.map((l, i) => (
            <path key={i} d={l.body[0]} fill={C.glow} stroke={C.glow} strokeWidth={40} />
          ))}
        </g>
      ) : null}
      <Silhouette d={lg.flatMap((l) => l.body)} fill={C.skin} shade={lg.flatMap((l) => l.shade)} shadeFill={C.skinShade} />
      {legGlow > 0 ? (
        <g opacity={legGlow * 0.6}>
          {lg.map((l, i) => (
            <path key={i} d={l.body[0]} fill={C.glow} />
          ))}
        </g>
      ) : null}
      {/* diz çizgileri */}
      {[L, R].map((j, i) => (
        <path key={i} d={`M${pt(add(j.k, [-12, -4]))} Q${pt(add(j.k, [0, 6]))} ${pt(add(j.k, [12, -4]))}`} stroke={C.ink} strokeWidth={3.5} fill="none" opacity={0.6} />
      ))}
      {/* ayakkabılar */}
      {[L, R].map((j, i) => {
        const side = i ? 1 : -1;
        const a = j.a;
        const d = `M${a[0] - side * 24} ${a[1] - 6} Q${a[0] - side * 30} ${a[1] + 22} ${a[0]} ${a[1] + 26} L${a[0] + side * 34} ${a[1] + 26} Q${a[0] + side * 46} ${a[1] + 16} ${a[0] + side * 30} ${a[1] + 2} Q${a[0] + side * 22} ${a[1] - 10} ${a[0] + side * 22} ${a[1] - 6} Z`;
        return (
          <g key={i}>
            <path d={d} fill={C.shoe} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
            <path d={`M${a[0] - side * 28} ${a[1] + 20} L${a[0] + side * 38} ${a[1] + 20}`} stroke={C.sole} strokeWidth={6} strokeLinecap="round" />
            <path d={`M${a[0] - 8} ${a[1] + 2} l16 0 M${a[0] - 8} ${a[1] + 9} l16 0`} stroke={C.sole} strokeWidth={3} opacity={0.8} />
          </g>
        );
      })}
      {/* şort */}
      <path d={shorts} fill={C.shorts} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
      <clipPath id={`sh${id}`}>
        <path d={shorts} />
      </clipPath>
      <g clipPath={`url(#sh${id})`}>
        <rect x={hipW * 0.25} y={-470} width={200} height={200} fill={C.shortsShade} opacity={0.7} />
        <path d={`M${pt(lo)} L${pt(add(lo, [0, -60]))} M${pt(ro)} L${pt(add(ro, [0, -60]))}`} stroke="#e8e0cf" strokeWidth={6} opacity={0.7} />
        <path d="M0 -452 L0 -380" stroke={C.ink} strokeWidth={4} opacity={0.6} />
      </g>
      {/* kollar (tişörtün arkasında; önkollar aşağıda tekrar, önde çizilir) */}
      <Silhouette
        d={[...ar.flatMap((a) => a.body), ...hand(AL, -1), ...hand(AR, 1)]}
        fill={C.skin}
        shade={ar.flatMap((a) => a.shade)}
        shadeFill={C.skinShade}
      />
      {/* gövde (tişört, kollarıyla tek parça) */}
      <Silhouette d={[torso, ...sleeve(AL), ...sleeve(AR)]} fill={C.shirt} sw={8} />
      <path d={sleeve(AR)[0]} fill={C.shirtShade} opacity={0.45} />
      <clipPath id={`t${id}`}>
        <path d={torso} />
      </clipPath>
      <g clipPath={`url(#t${id})`}>
        <ellipse cx={-waist * 0.2} cy={-505} rx={waist * 0.6} ry={50 + 45 * b} fill={C.shirtLight} opacity={0.2 + 0.35 * b} />
        <path d={`M${waist * 0.3} -700 Q${waist * 0.15} -560 ${waist * 0.45} -400 L300 -400 L300 -700 Z`} fill={C.shirtShade} opacity={0.6} />
        <path d={`M${waist * 0.3} -700 Q${waist * 0.15} -560 ${waist * 0.45} -400 L300 -400 L300 -700 Z`} fill="url(#hatch)" opacity={0.22} />
        {/* gerilme kırışıkları ve göğüs çizgisi */}
        <path d="M-78 -590 Q-60 -578 -40 -584 M78 -590 Q60 -578 40 -584" stroke={C.ink} strokeWidth={3.5} fill="none" opacity={0.55} />
        {b > 0.3
          ? [0, 1, 2].map((i) => (
              <path
                key={i}
                d={`M${-waist * (0.85 - i * 0.05)} ${-520 + i * 26} Q${-waist * 0.6} ${-512 + i * 26} ${-waist * 0.4} ${-516 + i * 26}`}
                stroke={C.ink}
                strokeWidth={3}
                fill="none"
                opacity={(b - 0.3) * 1.2}
              />
            ))
          : null}
        {b > 0.15 ? (
          <path
            d={`M${-waist * 0.8} -460 Q0 ${-424 + 30 * b} ${waist * 0.8} -460`}
            stroke={C.ink}
            strokeWidth={4.5}
            fill="none"
            opacity={Math.min(1, (b - 0.15) * 3) * 0.55}
          />
        ) : null}
        {fat > 0 ? <FatLayer o={fat} waist={waist} /> : null}
      </g>
      <path d="M-30 -684 Q0 -652 30 -684" stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
      {lungs > 0 ? <Lungs o={lungs} breath={breath + breathe * 0.1} /> : null}
      {/* önkollar ve eller gövdenin önünde */}
      <Silhouette
        d={[...fore.flatMap((a) => a.body), ...hand(AL, -1), ...hand(AR, 1)]}
        fill={C.skin}
        shade={fore.flatMap((a) => a.shade)}
        shadeFill={C.skinShade}
      />
      {/* boyun ve baş */}
      <g transform={`rotate(${tilt} 0 -684) translate(0 ${breathe * 1.5})`}>
        <path d="M-21 -712 L-23 -676 Q0 -664 23 -676 L21 -712 Z" fill={C.skin} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
        <path d="M-21 -700 Q0 -684 21 -700 L21 -712 L-21 -712 Z" fill={C.skinShade} opacity={0.6} />
        <Head eyes={blink ? "closed" : eyes} mouth={mouth} look={look} blush={blush} sweat={sweat} />
      </g>
      {children}
    </g>
  );
};

// Baş: yerel merkez yaklaşık (0,-746); yüz genişliği ~100
const Head: React.FC<{ eyes: Eyes; mouth: Mouth; look: P; blush: number; sweat: number }> = ({ eyes, mouth, look, blush, sweat }) => {
  const face = "M-50 -760 C-52 -722 -40 -694 -18 -684 Q0 -678 18 -684 C40 -694 52 -722 50 -760 C50 -808 -50 -808 -50 -760 Z";
  const ex = [-20, 20];
  const ey = -752;
  return (
    <g>
      {[-1, 1].map((side) => (
        <g key={side}>
          <ellipse cx={side * 51} cy={-744} rx={9} ry={15} fill={C.skin} stroke={C.ink} strokeWidth={5} />
          <path d={`M${side * 51} -752 Q${side * 55} -744 ${side * 51} -736`} stroke={C.ink} strokeWidth={2.5} fill="none" />
        </g>
      ))}
      <path d={face} fill={C.skin} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
      <path d="M22 -800 C46 -790 54 -760 48 -730 C42 -704 30 -692 16 -686 C34 -712 38 -760 22 -800 Z" fill={C.skinShade} opacity={0.5} />
      {/* saç */}
      <path
        d="M-54 -752 C-62 -806 -30 -830 2 -828 C36 -830 62 -808 54 -754 C50 -778 40 -790 26 -794 C10 -786 -12 -790 -30 -798 C-42 -790 -50 -774 -54 -752 Z"
        fill={C.hair}
        stroke={C.ink}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <path d="M-30 -816 Q-10 -806 6 -812 M10 -822 Q30 -812 44 -800 M-44 -800 Q-36 -810 -20 -820" stroke="#7a5236" strokeWidth={3} fill="none" />
      {/* kaşlar */}
      <path
        d={eyes === "wide" ? "M-32 -772 Q-20 -780 -8 -774 M8 -774 Q20 -780 32 -772" : mouth === "worry" ? "M-32 -764 Q-20 -768 -8 -772 M8 -772 Q20 -768 32 -764" : "M-32 -766 Q-20 -772 -8 -767 M8 -767 Q20 -772 32 -766"}
        stroke={C.hair}
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
      />
      {/* gözler */}
      {ex.map((x) =>
        eyes === "closed" ? (
          <path key={x} d={`M${x - 9} ${ey} Q${x} ${ey + 6} ${x + 9} ${ey}`} stroke={C.ink} strokeWidth={3.5} fill="none" strokeLinecap="round" />
        ) : eyes === "dizzy" ? (
          <path
            key={x}
            d={`M${x} ${ey} m-2 0 a2 2 0 1 1 4 0 a4 4 0 1 1 -8 0 a6 6 0 1 1 12 0 a8 8 0 1 1 -16 0`}
            stroke={C.ink}
            strokeWidth={2.5}
            fill="none"
          />
        ) : (
          <g key={x}>
            <ellipse cx={x} cy={ey} rx={9} ry={eyes === "wide" ? 8 : 5.5} fill="#fffaf0" stroke={C.ink} strokeWidth={2.5} />
            <circle cx={x + look[0]} cy={ey + look[1] + 0.5} r={eyes === "wide" ? 3.8 : 4.2} fill={C.ink} />
            <path d={`M${x - 10} ${ey - 3} Q${x} ${ey - 10} ${x + 10} ${ey - 3}`} stroke={C.ink} strokeWidth={3.5} fill="none" strokeLinecap="round" />
          </g>
        ),
      )}
      {/* burun */}
      <path d="M-2 -748 Q-6 -730 -8 -726 Q-2 -720 6 -724" stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
      <ellipse cx={-30} cy={-728} rx={10} ry={6} fill="#e0806f" opacity={blush} />
      <ellipse cx={30} cy={-728} rx={10} ry={6} fill="#e0806f" opacity={blush} />
      {/* ağız */}
      <g stroke={C.ink} strokeLinecap="round" fill="none" strokeWidth={3.5}>
        {mouth === "smile" ? <path d="M-13 -707 Q0 -698 13 -707" /> : null}
        {mouth === "grin" ? <path d="M-16 -709 Q0 -688 16 -709 Z" fill={C.lip} /> : null}
        {mouth === "flat" ? <path d="M-11 -704 L11 -704" /> : null}
        {mouth === "worry" ? <path d="M-12 -700 Q0 -708 12 -700" /> : null}
        {mouth === "o" ? <ellipse cx={0} cy={-703} rx={6} ry={8} fill={C.lip} /> : null}
        {mouth === "open" ? <ellipse cx={0} cy={-703} rx={11} ry={10} fill={C.lip} /> : null}
      </g>
      <path d="M-6 -692 Q0 -689 6 -692" stroke={C.ink} strokeWidth={2.5} fill="none" opacity={0.5} />
      {sweat > 0 ? (
        <g opacity={sweat}>
          <Drop x={-42} y={-776} s={0.45} />
          <Drop x={44} y={-770} s={0.38} />
        </g>
      ) : null}
    </g>
  );
};

// Göbekteki yağ katmanı: tişörtün altında, röntgen gibi görünen yağ hücreleri
const FatLayer: React.FC<{ o: number; waist: number }> = ({ o, waist }) => (
  <g opacity={o}>
    <ellipse cx={0} cy={-480} rx={waist * 0.92} ry={70} fill={C.fat} opacity={0.75} />
    {Array.from({ length: 16 }, (_, i) => {
      const a = random(`fa${i}`) * Math.PI * 2;
      const r = Math.sqrt(random(`fr${i}`));
      return (
        <circle
          key={i}
          cx={Math.cos(a) * r * waist * 0.8}
          cy={-480 + Math.sin(a) * r * 55}
          r={14 + random(`fs${i}`) * 8}
          fill={C.fat}
          stroke={C.fatDark}
          strokeWidth={3}
        />
      );
    })}
  </g>
);

const Lungs: React.FC<{ o: number; breath: number }> = ({ o, breath }) => {
  const k = 0.92 + 0.16 * breath;
  const lobe = "M-10 -628 C-52 -630 -72 -584 -70 -540 C-68 -522 -38 -522 -14 -540 Z";
  return (
    <g opacity={o}>
      <ellipse cx={0} cy={-578} rx={86} ry={74} fill="#2d3b3a" opacity={0.25} />
      <g transform={`translate(0 -580) scale(${k}) translate(0 580)`}>
        <path d={lobe} fill={C.lung} stroke={C.ink} strokeWidth={4.5} />
        <path d={lobe} transform="scale(-1 1)" fill={C.lung} stroke={C.ink} strokeWidth={4.5} />
        <path d="M-40 -600 Q-50 -580 -44 -556 M40 -600 Q50 -580 44 -556" stroke="#b86868" strokeWidth={3} fill="none" />
        <path d="M0 -680 L0 -626 M0 -626 L-20 -604 M0 -626 L20 -604" stroke={C.ink} strokeWidth={5.5} fill="none" strokeLinecap="round" />
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
      <text x={x} y={y} textAnchor={anchor} fontFamily={handFamily} fontWeight={700} fontSize={size} fill={color} clipPath={`url(#c${id})`}>
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
const PUFF = [
  [0, 0, 1],
  [-0.8, 0.35, 0.7],
  [0.8, 0.3, 0.75],
  [0.1, -0.55, 0.75],
];
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
  const r = (10 + 40 * e) * s;
  const o = interpolate(p, [0, 0.12, 0.7, 1], [0, 0.95, 0.85, 0]);
  const cx = x + dx * e;
  const cy = y + dy * e;
  return (
    <g opacity={o}>
      {PUFF.map(([ox, oy, k], i) => (
        <circle key={i} cx={cx + ox * r} cy={cy + oy * r} r={r * k} fill="#d9d6cf" stroke={C.ink} strokeWidth={4} />
      ))}
      {PUFF.map(([ox, oy, k], i) => (
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
const Bubble: React.FC<{ x: number; y: number; rx: number; ry: number; p: number; tail: P; children?: React.ReactNode }> = ({
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
    return [x + Math.cos(a) * rx, y + Math.sin(a) * ry, ry * 0.42 * (0.85 + 0.3 * random(`b${i}`))];
  });
  const dots = [0.35, 0.62, 0.85].map((k, i) => [x + (tail[0] - x) * k, y + ry * 0.8 + (tail[1] - y - ry * 0.8) * k, 22 - i * 6]);
  const id = svgId(useId());
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
      <clipPath id={`bb${id}`}>
        <ellipse cx={x} cy={y} rx={rx + 30} ry={ry + 30} />
      </clipPath>
      <g clipPath={`url(#bb${id})`}>{children}</g>
    </g>
  );
};

const Cross: React.FC<{ x: number; y: number; size: number; p: number }> = ({ x, y, size, p }) => {
  const a = tw(p, 0, 0.5);
  const b = tw(p, 0.5, 1);
  return (
    <g stroke={C.red} strokeWidth={22} strokeLinecap="round" fill="none">
      {a > 0 ? <path d={`M${x - size} ${y - size} L${x + size} ${y + size}`} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - a} /> : null}
      {b > 0 ? <path d={`M${x + size} ${y - size} L${x - size} ${y + size}`} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - b} /> : null}
    </g>
  );
};

const Arrow: React.FC<{ d: string; p: number; color?: string; w?: number }> = ({ d, p, color = C.ink, w = 8 }) =>
  p > 0 ? (
    <path d={d} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ) : null;

const Star: React.FC<{ x: number; y: number; r: number; rot: number }> = ({ x, y, r, rot }) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = ((i * 36 + rot) * Math.PI) / 180;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(x + Math.sin(a) * rr).toFixed(1)},${(y - Math.cos(a) * rr).toFixed(1)}`;
  });
  return <polygon points={pts.join(" ")} fill={C.yellow} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />;
};

// Zemin: karakterin bastığı yer (hafif kalem çizgisi)
const Ground: React.FC<{ y: number }> = ({ y }) => (
  <path d={`M140 ${y} Q540 ${y - 8} 940 ${y}`} stroke={C.ink} strokeWidth={4} fill="none" opacity={0.35} strokeLinecap="round" />
);

/* ---------- sahneler ---------- */

const PX = 540;
const PY = 1330;
const S = 0.95;
// Karakterin yerel noktasını ekran koordinatına çevirir
const at = (lx: number, ly: number, x = PX, y = PY, s = S): P => [x + lx * s, y + ly * s];

// "Verdiğin yağın büyük kısmını, nefes vererek dışarı atıyorsun."
const Acilis: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const belly = at(0, -480);
  const face = at(0, -730);
  const mouth = at(14, -703);
  // yağ topağı göbekten ayrılır, göğüsten yukarı çıkar, ağızdan bulut olarak çıkar
  const rise = tw(f, w(2), w(4) + 4);
  const blob = lerp(belly, mouth, rise);
  const exhale = f >= w(4) + 2;
  const fatO = tw(f, w(0) - 6, w(1)) * (1 - 0.6 * tw(f, w(4), w(7)));
  return (
    <Cam
      keys={[
        [0, belly[0], belly[1], 1.9],
        [w(2), belly[0], belly[1], 1.75],
        [w(4) + 2, face[0], face[1], 1.75],
        [w(6), PX, 900, 1.0],
        [d, PX, 920, 1.04],
      ]}
    >
      <Ground y={PY + 12} />
      <Person
        x={PX}
        y={PY}
        s={S}
        belly={tw(f, w(4), w(7) + 10, 0.55, 0.45)}
        fat={fatO}
        mouth={exhale ? "o" : "flat"}
        eyes={exhale ? "closed" : "open"}
        look={[0, 3]}
      />
      {rise > 0 && rise < 1 ? (
        <g transform={`translate(${blob[0]} ${blob[1]}) scale(${1 - 0.5 * rise})`}>
          <circle r={34} fill={C.fat} stroke={C.fatDark} strokeWidth={5} />
          <ellipse cx={-10} cy={-12} rx={10} ry={6} fill="#fff4c8" opacity={0.8} />
        </g>
      ) : null}
      {exhale
        ? cycles(f, w(4) + 2, 26, 60)
            .filter(({ k }) => k < 3)
            .map(({ k, p }) => <Puff key={k} x={mouth[0] + 8} y={mouth[1]} p={p} dx={230} dy={-210 + k * 30} s={1.2} label="CO₂" />)
        : null}
    </Cam>
  );
};

// "Çoğu insan yağın eridiğini ya da tere dönüştüğünü sanır. Ama ikisi de doğru değil."
const YanlisFikir: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const left = pop(f, w(2) - 4, 14);
  const right = pop(f, w(6) - 4, 14);
  const melt = tw(f, w(3), w(3) + 40);
  const x1 = tw(f, w(12) - 2, w(12) + 10);
  const x2 = tw(f, w(12) + 6, w(12) + 18);
  const shock = f > w(13) - 2;
  const face = at(0, -730, PX, PY + 20, 0.82);
  return (
    <Cam
      keys={[
        [0, face[0], face[1], 1.7],
        [w(1), face[0], face[1] + 40, 1.5],
        [w(2) + 6, PX, 860, 1.0],
        [w(12), PX, 840, 1.0],
        [w(12) + 10, PX, 820, 1.08],
      ]}
      shake={f > w(12) && f < w(12) + 10 ? 6 : 0}
    >
      <Ground y={PY + 32} />
      <Person x={PX} y={PY + 20} s={0.82} belly={0.5} armL={[8, 0]} armR={[10, -163, 1.55]} mouth={shock ? "o" : "flat"} eyes={shock ? "wide" : "open"} look={[0, -3]} tilt={4} />
      <Bubble x={290} y={500} rx={200} ry={170} p={left} tail={[470, 760]}>
        {/* göbeğindeki yağ eriyip damlayan küçük insan */}
        <Person x={290} y={640} s={0.33} belly={0.9 - 0.4 * melt} mouth="worry" idle={false} fat={0.9} />
        {[0, 1, 2].map((i) => {
          const p = (melt * 2 + i * 0.33) % 1;
          return melt > 0 ? (
            <path
              key={i}
              d={`M${272 + i * 18} ${495 + p * 140} q6 14 0 22 q-6 -8 0 -22 Z`}
              fill={C.fat}
              stroke={C.fatDark}
              strokeWidth={2.5}
              opacity={1 - p}
            />
          ) : null;
        })}
        <ellipse cx={290} cy={648} rx={20 + 50 * melt} ry={6 + 4 * melt} fill={C.fat} stroke={C.fatDark} strokeWidth={3} opacity={melt} />
      </Bubble>
      <Bubble x={790} y={440} rx={200} ry={170} p={right} tail={[620, 720]}>
        {/* yağı ter olarak akan küçük insan */}
        <Person x={790} y={580} s={0.33} belly={0.8} mouth="open" idle={false} blush={0.8} sweat={1} />
        {cycles(f, w(6), 7, 22).map(({ k, p }) => (
          <Drop key={k} x={745 + (k % 4) * 30} y={420 + 150 * p} s={0.55} color={k % 2 ? C.fat : C.water} o={1 - p} />
        ))}
      </Bubble>
      <HandText x={270} y={290} text="Eriyor mu?" size={70} p={tw(f, w(3), w(3) + 14)} />
      <HandText x={800} y={230} text="Tere mi dönüyor?" size={64} p={tw(f, w(7), w(7) + 14)} />
      {left > 0 ? <Cross x={290} y={500} size={140} p={x1} /> : null}
      {right > 0 ? <Cross x={790} y={440} size={140} p={x2} /> : null}
    </Cam>
  );
};

// "Yağ hücresi yakıldığında, karbondioksit ve suya ayrılır."
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
const YagHucresi: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const id = svgId(useId());
  const L = { x: 720, y: 700, r: 250 };
  const person = { x: 290, y: PY, s: 0.84 };
  const B = { x: person.x, y: person.y - 480 * person.s };
  const open = tw(f, 4, 18);
  const v = [L.x - B.x, L.y - B.y];
  const len = Math.hypot(v[0], v[1]);
  const n = [-v[1] / len, v[0] / len];
  const start = w(2);
  const step = Math.max(3, (w(6) - w(2)) / CELLS.length);
  return (
    <Cam
      keys={[
        [0, B.x, B.y, 1.6],
        [16, (B.x + L.x) / 2, (B.y + L.y) / 2, 1.15],
        [w(2), L.x - 40, L.y + 40, 1.3],
        [w(5), L.x - 60, L.y + 120, 1.15],
        [d, PX, 860, 1.0],
      ]}
    >
      <Ground y={PY + 12} />
      <Person x={person.x} y={person.y} s={person.s} belly={0.45} fat={0.8} armL={[8, 0]} armR={[10, 0]} tilt={6} look={[3, -2]} mouth="o" />
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
            const wob = Math.sin(f / 6 + i) * 3 * (1 - p);
            return (
              <g key={i}>
                {p < 1 ? (
                  <g transform={`translate(${X + wob} ${Y}) scale(${(1 - 0.9 * p) * (1 + 0.15 * Math.sin(p * Math.PI))})`} opacity={1 - p * 0.6}>
                    <circle r={58} fill={C.fat} stroke={C.fatDark} strokeWidth={6} />
                    <circle cx={14} cy={10} r={10} fill={C.fatDark} opacity={0.35} />
                    <ellipse cx={-18} cy={-20} rx={16} ry={10} fill="#fff4c8" opacity={0.7} />
                  </g>
                ) : null}
                {p > 0
                  ? [0, 1, 2, 3].map((k) => {
                      const a = random(`a${i}${k}`) * Math.PI * 2;
                      const dist = 30 + 120 * Easing.out(Easing.quad)(p);
                      const px = X + Math.cos(a) * dist;
                      const py = Y + Math.sin(a) * dist - 40 * p;
                      return k < 3 ? (
                        <g key={k} opacity={Math.min(1, p * 3)}>
                          <circle cx={px} cy={py} r={15} fill={C.co2} stroke={C.ink} strokeWidth={4} />
                          <circle cx={px - 10} cy={py} r={7} fill="#5d5f63" />
                          <circle cx={px + 10} cy={py} r={7} fill="#5d5f63" />
                        </g>
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
      <g opacity={tw(f, w(3) - 2, w(3) + 8)}>
        <circle cx={590} cy={1035} r={24} fill={C.co2} stroke={C.ink} strokeWidth={5} />
        <HandText x={630} y={1058} text="CO₂" size={72} anchor="start" p={tw(f, w(3), w(3) + 12)} />
      </g>
      <g opacity={tw(f, w(5) - 2, w(5) + 8)}>
        <Drop x={810} y={1035} s={1.4} />
        <HandText x={845} y={1058} text="su" size={72} anchor="start" p={tw(f, w(5), w(5) + 10)} />
      </g>
    </Cam>
  );
};

// "Bunun yüzde seksen dördü karbondioksittir ve akciğerlerinden, nefesinle çıkar."
const Nefes: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const mouth = at(14, -703);
  const chest = at(0, -600);
  const period = 42;
  const start = w(6) - 8;
  const phase = f < start ? 0 : ((f - start) % period) / period;
  const exhaling = f >= start && phase < 0.5;
  const breath = f < start ? 0.5 + 0.5 * Math.sin(f / 10) : exhaling ? 1 - phase * 2 : (phase - 0.5) * 2;
  return (
    <Cam
      keys={[
        [0, PX, 860, 1.0],
        [w(4), PX, 860, 1.0],
        [w(6), chest[0], chest[1], 1.7],
        [w(7) + 6, chest[0] + 80, chest[1] - 60, 1.45],
        [d - 10, PX, 860, 1.0],
      ]}
    >
      <Ground y={PY + 12} />
      <Person
        x={PX}
        y={PY}
        s={S}
        belly={tw(f, w(6), d, 0.45, 0.38)}
        lungs={tw(f, w(5), w(6) + 4)}
        breath={breath}
        mouth={exhaling ? "o" : "smile"}
        eyes={exhaling ? "closed" : "open"}
      />
      {cycles(f, start, period, 54).map(({ k, p }) => (
        <Puff key={k} x={mouth[0] + 10} y={mouth[1]} p={p} dx={220} dy={-200} label="CO₂" s={1.3} />
      ))}
      <HandText x={330} y={470} text="%84" size={170} p={tw(f, w(1), w(3) + 6)} color={C.red} />
      <HandText x={330} y={570} text="karbondioksit" size={64} p={tw(f, w(4), w(4) + 14)} color={C.red} />
      <Arrow d="M430 500 Q600 400 760 480" p={tw(f, w(5), w(5) + 14)} color={C.red} w={9} />
      <Arrow d="M736 446 L762 482 L722 494" p={tw(f, w(5) + 12, w(5) + 18)} color={C.red} w={9} />
    </Cam>
  );
};

// "Kalan yüzde on altı ise su olur; terle ve idrarla atılır."
const Su: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const wipe = tw(f, w(7) - 4, w(7) + 8) - tw(f, w(9) + 4, w(9) + 14);
  const face = at(0, -740);
  return (
    <Cam
      keys={[
        [0, PX, 860, 1.0],
        [w(6), PX, 860, 1.0],
        [w(7) + 4, face[0], face[1] + 40, 1.6],
        [w(9) + 6, PX, 900, 1.05],
        [d, PX, 900, 1.08],
      ]}
    >
      <Ground y={PY + 12} />
      <Person x={PX} y={PY} s={S} belly={0.38} armL={[8, 0]} armR={[150 * wipe + 10 * (1 - wipe), -238 * wipe]} mouth="flat" eyes={wipe > 0.5 ? "closed" : "open"} blush={0.7} sweat={tw(f, w(7) - 6, w(7))}>
        {cycles(f, w(7), 8, 34).map(({ k, p }) => {
          const x = [-46, 40, -12, 52, -60][k % 5];
          const y0 = -780 + (k % 3) * 14;
          return <Drop key={k} x={x + (x > 0 ? 40 : -40) * p} y={y0 + 300 * p * p} s={0.9} o={interpolate(p, [0, 0.1, 0.8, 1], [0, 1, 1, 0])} />;
        })}
        {cycles(f, w(7) + 5, 12, 30).map(({ k, p }) => (
          <Drop key={`a${k}`} x={(k % 2 ? 1 : -1) * 160} y={-500 + 220 * p * p} s={0.8} o={1 - p} />
        ))}
      </Person>
      <ellipse cx={PX} cy={PY + 16} rx={60 + 120 * tw(f, w(7), w(10) + 20)} ry={12 + 10 * tw(f, w(7), w(10) + 20)} fill={C.water} opacity={0.45} />
      <Drop x={290} y={470} s={2.4 * pop(f, w(1) - 3)} />
      <HandText x={480} y={500} text="%16 su" size={120} p={tw(f, w(1), w(5) + 6)} color={C.water} />
    </Cam>
  );
};

// "O zaman hızlı hızlı nefes alsan daha mı çok yağ yakarsın? Hayır, sadece başın döner."
const HizliNefes: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const pant = f >= w(2);
  const dizzy = f >= w(12) - 2;
  const fast = Math.sin(f * 0.9);
  const wobble = dizzy ? Math.sin(f / 5) * 7 : 0;
  const mouth = at(14, -703);
  const face = at(0, -740);
  const belly = at(0, -480);
  return (
    <Cam
      keys={[
        [0, PX, 860, 1.0],
        [w(2), PX, 860, 1.05],
        [w(5), face[0], face[1] + 20, 1.75],
        [w(9), face[0], face[1] + 20, 1.85],
        [w(11), PX, 860, 1.0],
        [w(12) + 4, PX, 820, 1.1],
      ]}
      shake={pant && !dizzy ? 2.5 : f >= w(11) && f < w(11) + 8 ? 8 : 0}
    >
      <Ground y={PY + 12} />
      <Person
        x={PX + wobble * 3}
        y={PY + (pant ? Math.abs(fast) * 6 : 0)}
        s={S}
        belly={0.45}
        armL={[10 + (pant ? 4 * fast : 0), 0]}
        armR={[10 - (pant ? 4 * fast : 0), 0]}
        mouth={pant ? (fast > 0 ? "open" : "o") : "smile"}
        eyes={dizzy ? "dizzy" : pant ? "wide" : "open"}
        lungs={pant ? 0.9 : 0}
        breath={0.5 + 0.5 * fast}
        tilt={wobble}
        blush={pant ? 0.8 : 0.35}
      >
        {dizzy
          ? [0, 1, 2].map((i) => {
              const a = f / 7 + (i * Math.PI * 2) / 3;
              return <Star key={i} x={Math.cos(a) * 85} y={-850 + Math.sin(a) * 20} r={18} rot={f * 6} />;
            })
          : null}
      </Person>
      {pant && !dizzy
        ? cycles(f, w(2), 8, 16).map(({ k, p }) => <Puff key={k} x={mouth[0] + 8} y={mouth[1]} p={p} dx={110} dy={-50 + (k % 3) * 35} s={0.55} />)
        : null}
      <HandText x={780} y={540} text="Hayır!" size={150} p={tw(f, w(11), w(11) + 8)} color={C.red} rotate={-8} />
      <HandText x={230} y={900} text="yağ aynı" size={74} p={tw(f, w(11) + 6, w(11) + 20)} />
      <Arrow d={`M270 925 Q330 ${belly[1] + 40} ${belly[0] - 100} ${belly[1] + 10}`} p={tw(f, w(11) + 16, w(11) + 26)} w={7} />
    </Cam>
  );
};

// "Yağın yanması için önce kasların onu yakıt olarak kullanmalı. Bunu da sadece hareket sağlar."
const Hareket: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const go = tw(f, 0, 10);
  const run = f / 4.2;
  const l = Math.max(0, Math.sin(run)) * go;
  const r = Math.max(0, -Math.sin(run)) * go;
  const bob = Math.abs(Math.sin(run)) * 16 * go;
  const flowStart = w(5);
  const burn = tw(f, w(6) - 3, w(6) + 10);
  const mouth = at(14, -703, PX, PY - bob);
  const legs = at(0, -260);
  return (
    <Cam
      keys={[
        [0, PX, 860, 1.0],
        [w(3), PX, 860, 1.0],
        [w(4) + 6, legs[0], legs[1] - 80, 1.45],
        [w(8), legs[0], legs[1] - 120, 1.4],
        [w(10), PX, 860, 1.0],
        [d, PX, 880, 1.06],
      ]}
    >
      <Ground y={PY + 12} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${200 - i * 20} ${1080 + i * 90} l-90 0`} stroke={C.ink} strokeWidth={7} strokeLinecap="round" opacity={(0.45 + 0.3 * Math.sin(f / 3 + i)) * go} />
      ))}
      <Person
        x={PX}
        y={PY - bob}
        s={S}
        belly={tw(f, flowStart, d, 0.45, 0.25)}
        fat={tw(f, w(4), w(5)) * (1 - tw(f, w(10), d))}
        legL={{ lift: l }}
        legR={{ lift: r }}
        armL={[18 + 22 * r * go, -130 * go + 30 * l]}
        armR={[18 + 22 * l * go, -130 * go + 30 * r]}
        mouth="o"
        legGlow={tw(f, w(4) - 2, w(4) + 10) * (0.5 + 0.5 * burn)}
        blush={0.7}
        sweat={tw(f, w(9), w(10))}
      >
        {/* yağ parçacıkları göbekten bacak kaslarına akar, orada yanar */}
        {cycles(f, flowStart, 4, 26).map(({ k, p }) => {
          const side = k % 2 ? 1 : -1;
          const x = side * (25 + 25 * p) + Math.sin(k) * 15;
          const y = -480 + 260 * p;
          const lit = p > 0.65 ? burn : 0;
          return (
            <circle
              key={k}
              cx={x}
              cy={y}
              r={13 * (1 - 0.4 * p)}
              fill={lit ? C.glow : C.fat}
              stroke={C.fatDark}
              strokeWidth={3}
              opacity={interpolate(p, [0, 0.1, 0.85, 1], [0, 1, 1, 0])}
            />
          );
        })}
      </Person>
      {cycles(f, w(9), 20, 46).map(({ k, p }) => (
        <Puff key={k} x={mouth[0] + 8} y={mouth[1]} p={p} dx={200} dy={-170} label="CO₂" />
      ))}
      <HandText x={340} y={1000} text="yakıt" size={100} p={tw(f, w(6), w(6) + 12)} color={C.glow} />
      <Arrow d="M400 1020 Q430 1080 470 1100" p={tw(f, w(6) + 8, w(6) + 18)} color={C.glow} w={8} />
    </Cam>
  );
};

// "Kısacası yağı hareketle yakar, nefesinle dışarı verirsin. Kaydet, sonra lazım olur."
const Kapanis: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const cheer = tw(f, w(7) - 3, w(7) + 8);
  const px = PX + 150;
  const mouth = at(14, -703, px);
  const save = pop(f, w(7), 14);
  const exhale = f > w(4) && f < w(6) + 10;
  return (
    <Cam keys={[[0, PX, 900, 1.12], [w(3), PX, 880, 1.0], [d, PX, 880, 1.04]]}>
      <Ground y={PY + 12} />
      <Person
        x={px}
        y={PY}
        s={S}
        belly={0.2}
        armL={[45, -110]}
        armR={[45 + 120 * cheer, -110 + 95 * cheer]}
        mouth={exhale ? "o" : "grin"}
        eyes={exhale ? "closed" : "open"}
      />
      {cycles(f, w(4), 40, 50)
        .filter(({ k }) => k < 2)
        .map(({ k, p }) => (
          <Puff key={k} x={mouth[0] + 8} y={mouth[1]} p={p} dx={150} dy={-170} label="CO₂" />
        ))}
      <HandText x={100} y={420} text="hareket → yakar" size={92} anchor="start" p={tw(f, w(1), w(3) + 6)} />
      <HandText x={100} y={550} text="nefes → dışarı" size={92} anchor="start" p={tw(f, w(4), w(6) + 4)} />
      {save > 0 ? (
        <g transform={`translate(250 900) scale(${save}) rotate(-6)`}>
          <path d="M-70 -95 L70 -95 L70 100 L0 50 L-70 100 Z" fill={C.yellow} stroke={C.ink} strokeWidth={10} strokeLinejoin="round" />
          <text x={0} y={175} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={80} fill={C.ink}>
            kaydet
          </text>
        </g>
      ) : null}
    </Cam>
  );
};

const SCENES: Record<string, React.FC<SceneProps>> = {
  acilis: Acilis,
  "yanlis-fikir": YanlisFikir,
  "yag-hucresi": YagHucresi,
  nefes: Nefes,
  su: Su,
  "hizli-nefes": HizliNefes,
  hareket: Hareket,
  kapanis: Kapanis,
};
