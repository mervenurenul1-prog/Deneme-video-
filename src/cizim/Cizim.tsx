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

// Sahne girişi: sert kesme + kısa kamera savurması (yatay hareket bulanıklığı)
const Shot: React.FC<{ d: number; children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const k = interpolate(f, [0, 6], [1, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ transform: `translateX(${-110 * k}px)`, filter: k > 0.02 ? `blur(${12 * k}px)` : undefined }}>
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

// Kamera planı: t karesinde sert kesmeyle başlar, bir sonraki plana kadar a → b görünümüne yavaşça kayar.
// Görünüm: [odak x, odak y, yakınlık]. Oda arka planı daha az yakınlaşır (derinlik / paralaks).
type View = [number, number, number];
type Plan = { t: number; a: View; b?: View };

const Cam: React.FC<{ plans: Plan[]; end: number; shake?: number; room?: boolean; children: React.ReactNode }> = ({
  plans,
  end,
  shake = 0,
  room = true,
  children,
}) => {
  const f = useCurrentFrame();
  const list = [...plans].sort((x, y) => x.t - y.t);
  let i = 0;
  list.forEach((pl, j) => {
    if (f >= pl.t) i = j;
  });
  const pl = list[i];
  const next = list[i + 1]?.t ?? end;
  const p = Easing.inOut(Easing.quad)(Math.min(1, Math.max(0, (f - pl.t) / Math.max(1, next - pl.t))));
  const b = pl.b ?? pl.a;
  const [x, y, z] = [0, 1, 2].map((j) => pl.a[j] + (b[j] - pl.a[j]) * p);
  const sx = shake ? Math.sin(f * 2.1) * shake : 0;
  const sy = shake ? Math.cos(f * 2.7) * shake : 0;
  const drift = 1 + 0.01 * Math.sin(f / 45);
  const view = (zz: number) => `translate(${540 + sx} ${960 + sy}) scale(${zz * drift}) translate(${-x} ${-y})`;
  return (
    <>
      {room ? (
        <g transform={view(1 + (z - 1) * 0.8)}>
          <Room />
        </g>
      ) : null}
      <g transform={view(z)}>{children}</g>
    </>
  );
};

/* ---------- mekân: güneşli oda ---------- */

const Room: React.FC = () => {
  const frame = useCurrentFrame();
  const floorY = 1180;
  const planks = [1205, 1240, 1290, 1355, 1440, 1550, 1690, 1870, 2100];
  return (
    <g>
      <rect x={-200} y={-300} width={1480} height={floorY + 300} fill="#e2cda4" />
      <rect x={-200} y={-300} width={1480} height={floorY + 300} fill="url(#hatch)" opacity={0.05} />
      {/* lambri ve süpürgelik */}
      <path d={`M-200 960 L1280 960`} stroke={C.ink} strokeWidth={5} opacity={0.5} />
      <rect x={-200} y={960} width={1480} height={floorY - 960} fill="#d6bd8f" />
      {[-60, 140, 340, 540, 740, 940, 1140].map((x) => (
        <rect key={x} x={x + 20} y={985} width={160} height={floorY - 1015} rx={6} fill="none" stroke={C.ink} strokeWidth={3} opacity={0.3} />
      ))}
      <rect x={-200} y={floorY - 26} width={1480} height={26} fill="#b48f62" stroke={C.ink} strokeWidth={5} />
      {/* parke zemin */}
      <rect x={-200} y={floorY} width={1480} height={1100} fill="#c9a777" />
      {planks.map((y) => (
        <path key={y} d={`M-200 ${y} L1280 ${y}`} stroke={C.ink} strokeWidth={3} opacity={0.3} />
      ))}
      {planks.slice(0, -1).map((y, i) =>
        [0, 1, 2, 3, 4].map((k) => {
          const x = 540 + (k - 2 + (i % 2) * 0.5) * 260 * (1 + (y - floorY) / 300);
          return <path key={`${y}-${k}`} d={`M${x} ${y} L${x} ${planks[i + 1]}`} stroke={C.ink} strokeWidth={3} opacity={0.25} />;
        }),
      )}
      {/* pencere ve içeri düşen güneş */}
      <g>
        <rect x={80} y={330} width={320} height={470} fill="#f7ecd2" stroke={C.ink} strokeWidth={9} />
        <path d="M80 330 L400 330 L400 800 L80 800 Z" fill="#fff6dc" opacity={0.5 + 0.1 * Math.sin(frame / 30)} />
        <path d="M240 330 L240 800 M80 565 L400 565" stroke={C.ink} strokeWidth={8} />
        <path d="M120 760 Q170 690 220 760 M270 740 Q320 640 370 740" stroke="#9fae86" strokeWidth={6} fill="none" opacity={0.7} />
        <rect x={60} y={800} width={360} height={24} fill="#d9c49b" stroke={C.ink} strokeWidth={6} />
        <path d="M60 310 Q240 290 420 310 L420 330 L60 330 Z" fill="#a8574a" stroke={C.ink} strokeWidth={6} />
        <path d="M70 330 Q40 600 60 900 L100 900 Q90 600 110 330 Z M410 330 Q440 600 420 900 L380 900 Q390 600 370 330 Z" fill="#b86a5a" stroke={C.ink} strokeWidth={5} />
      </g>
      <path
        d={`M110 820 L390 820 L860 ${floorY + 420} L330 ${floorY + 420} Z`}
        fill="#fff4d6"
        opacity={0.22 + 0.04 * Math.sin(frame / 40)}
      />
      {/* tablo */}
      <g transform="rotate(2 860 520)">
        <rect x={770} y={420} width={190} height={210} fill="#efe2c4" stroke={C.ink} strokeWidth={8} />
        <rect x={792} y={442} width={146} height={166} fill="#e6d4ae" stroke={C.ink} strokeWidth={3} />
        <path d="M800 590 L840 520 L870 560 L895 530 L930 590 Z" fill="#9fae86" stroke={C.ink} strokeWidth={3} />
        <circle cx={905} cy={480} r={13} fill="#e8b25a" stroke={C.ink} strokeWidth={3} />
      </g>
      {/* saksı bitkisi */}
      <g>
        {[-50, -20, 10, 40, -70, 60].map((a, i) => (
          <path
            key={i}
            d={`M960 1150 Q${960 + a * 1.4} ${1060 - i * 8} ${960 + a * 2.2} ${980 - (i % 3) * 30}`}
            stroke="#5f7a4f"
            strokeWidth={14}
            fill="none"
            strokeLinecap="round"
            transform={`rotate(${Math.sin(frame / 40 + i) * 1.5} 960 1150)`}
          />
        ))}
        <path d="M905 1140 L1015 1140 L1000 1240 L920 1240 Z" fill="#b8664a" stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
      </g>
      {/* yerde dambıl */}
      <g transform="translate(170 1300)">
        <rect x={-55} y={-6} width={110} height={12} fill="#77706a" stroke={C.ink} strokeWidth={4} />
        <rect x={-75} y={-28} width={26} height={56} rx={6} fill="#3d3a3a" stroke={C.ink} strokeWidth={5} />
        <rect x={49} y={-28} width={26} height={56} rx={6} fill="#3d3a3a" stroke={C.ink} strokeWidth={5} />
        <ellipse cx={0} cy={34} rx={95} ry={10} fill={C.ink} opacity={0.15} />
      </g>
    </g>
  );
};

/* ---------- altyazı: ortada, küçük, o anki kelime sarı ---------- */

export const Captions: React.FC<{ words: WordTiming[] }> = ({ words }) => {
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
        fontSize: 52,
        fontWeight: 800,
        color: "#fffaf0",
        WebkitTextStroke: `10px ${C.ink}`,
        textShadow: "0 6px 18px rgba(40,25,10,0.45)",
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
  back?: boolean; // arkadan görünüm (yüz yok, ense ve saç)
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
  back = false,
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
        {fat > 0 && !back ? <FatLayer o={fat} waist={waist} /> : null}
      </g>
      <path d={back ? "M-30 -684 Q0 -674 30 -684" : "M-30 -684 Q0 -652 30 -684"} stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
      {back ? <path d="M0 -676 L0 -450" stroke={C.ink} strokeWidth={3} opacity={0.3} /> : null}
      {lungs > 0 && !back ? <Lungs o={lungs} breath={breath + breathe * 0.1} /> : null}
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
        {back ? <HeadBack /> : <Head eyes={blink ? "closed" : eyes} mouth={mouth} look={look} blush={blush} sweat={sweat} />}
      </g>
      {children}
    </g>
  );
};

// Baş, arkadan: kulaklar, ense ve saç
const HeadBack: React.FC = () => (
  <g>
    {[-1, 1].map((side) => (
      <ellipse key={side} cx={side * 51} cy={-744} rx={9} ry={15} fill={C.skin} stroke={C.ink} strokeWidth={5} />
    ))}
    <path d="M-50 -760 C-52 -722 -40 -694 -18 -684 Q0 -678 18 -684 C40 -694 52 -722 50 -760 C50 -808 -50 -808 -50 -760 Z" fill={C.skin} stroke={C.ink} strokeWidth={6} />
    <path
      d="M-55 -752 C-62 -808 -30 -830 2 -828 C36 -830 62 -808 55 -754 C57 -728 50 -706 34 -699 Q0 -692 -34 -699 C-50 -706 -57 -728 -55 -752 Z"
      fill={C.hair}
      stroke={C.ink}
      strokeWidth={5}
      strokeLinejoin="round"
    />
    <path d="M-30 -800 Q-34 -760 -26 -716 M0 -812 Q2 -760 0 -708 M30 -800 Q34 -760 26 -716" stroke="#7a5236" strokeWidth={3} fill="none" />
    <path d="M18 -820 C44 -806 52 -770 46 -730" stroke="#2e1c10" strokeWidth={8} fill="none" opacity={0.4} />
  </g>
);

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

/* ---------- sahneler ---------- */

// Her sahne birkaç kamera planına bölünür (geniş, yakın, arkadan, nesne yakın çekimi) ve
// planlar kelimelerle kesilir. Ekrandaki yazı en aza indirildi: anlatımı çizim taşır.

const PX = 540;
const PY = 1330;
const S = 0.95;
// Karakterin yerel noktasını ekran koordinatına çevirir
const at = (lx: number, ly: number, x = PX, y = PY, s = S): P => [x + lx * s, y + ly * s];
const WIDE: View = [540, 940, 1.0];
const FACE = at(0, -740);
const CHEST = at(0, -590);
const BELLY = at(0, -480);
const LEGS = at(0, -230);
const FEET = at(0, -20);
const MOUTH = at(14, -703);

// Yerinde koşu: bacaklar sırayla kalkar, kollar sallanır, gövde zıplar
const jog = (f: number, go: number) => {
  const run = f / 4.2;
  const l = Math.max(0, Math.sin(run)) * go;
  const r = Math.max(0, -Math.sin(run)) * go;
  return {
    bob: Math.abs(Math.sin(run)) * 16 * go,
    legL: { lift: l },
    legR: { lift: r },
    // dirsekler bükük, önkollar öne doğru (önden bakınca kısalmış görünür)
    armL: [8 + (10 + 25 * r) * go, (-105 + 25 * l) * go, 1 - 0.45 * go] as Arm,
    armR: [8 + (10 + 25 * l) * go, (-105 + 25 * r) * go, 1 - 0.45 * go] as Arm,
  };
};

const FatBlob: React.FC<{ p: P; s?: number }> = ({ p, s = 1 }) => (
  <g transform={`translate(${p[0]} ${p[1]}) scale(${s})`}>
    <circle r={34} fill={C.fat} stroke={C.fatDark} strokeWidth={5} />
    <ellipse cx={-10} cy={-12} rx={10} ry={6} fill="#fff4c8" opacity={0.8} />
  </g>
);

// "Verdiğin yağın büyük kısmını, nefes vererek dışarı atıyorsun."
const Acilis: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const rise = tw(f, w(2), w(4) + 2);
  const blob = lerp(BELLY, MOUTH, rise);
  const exhale = f >= w(4) + 2;
  return (
    <Cam
      end={d}
      plans={[
        { t: 0, a: [540, 960, 1.0], b: [540, 900, 1.12] },
        { t: w(1), a: [...BELLY, 3.0], b: [...BELLY, 3.3] },
        { t: w(3), a: [CHEST[0], CHEST[1] + 20, 2.0], b: [FACE[0], FACE[1] + 50, 2.3] },
        { t: w(4) + 2, a: [FACE[0] + 30, FACE[1], 2.6], b: [FACE[0] + 120, FACE[1] - 60, 2.3] },
        { t: w(6), a: [540, 880, 1.15], b: WIDE },
      ]}
    >
      <Person
        x={PX}
        y={PY}
        s={S}
        belly={tw(f, w(4), d, 0.55, 0.45)}
        fat={tw(f, w(1) - 4, w(1) + 4) * (1 - 0.5 * tw(f, w(4), w(7)))}
        mouth={exhale ? "o" : "flat"}
        eyes={exhale ? "closed" : "open"}
        look={[0, 3]}
      />
      {rise > 0 && rise < 1 ? <FatBlob p={blob} s={1 - 0.5 * rise} /> : null}
      {exhale
        ? cycles(f, w(4) + 2, 26, 64)
            .filter(({ k }) => k < 3)
            .map(({ k, p }) => <Puff key={k} x={MOUTH[0] + 8} y={MOUTH[1]} p={p} dx={260} dy={-230 + k * 40} s={1.2} label="CO₂" />)
        : null}
    </Cam>
  );
};

// "Çoğu insan yağın eridiğini ya da tere dönüştüğünü sanır. Ama ikisi de doğru değil."
const YanlisFikir: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const left = pop(f, w(2) - 4, 14);
  const right = pop(f, w(6) - 4, 14);
  const melt = tw(f, w(3), w(3) + 40);
  const x1 = tw(f, w(12) - 2, w(12) + 10);
  const x2 = tw(f, w(12) + 6, w(12) + 18);
  const shock = f > w(13) - 2;
  const py = PY + 20;
  const face = at(0, -740, PX, py, 0.82);
  return (
    <Cam
      end={d}
      shake={f > w(12) && f < w(12) + 10 ? 7 : 0}
      plans={[
        { t: 0, a: [face[0], face[1] + 30, 2.2], b: [face[0], face[1] + 10, 2.4] },
        { t: w(2), a: [300, 520, 1.7], b: [290, 500, 1.85] },
        { t: w(6), a: [780, 460, 1.7], b: [790, 440, 1.85] },
        { t: w(9), a: [540, 840, 1.0], b: [540, 820, 1.05] },
        { t: w(13), a: [face[0], face[1] + 30, 2.0] },
      ]}
    >
      <Person x={PX} y={py} s={0.82} belly={0.5} armL={[8, 0]} armR={[10, -163, 1.55]} mouth={shock ? "o" : "flat"} eyes={shock ? "wide" : "open"} look={[0, -3]} tilt={4} />
      <Bubble x={290} y={500} rx={200} ry={170} p={left} tail={[470, 760]}>
        {/* göbeğindeki yağ eriyip damlayan küçük insan */}
        <Person x={290} y={640} s={0.33} belly={0.9 - 0.4 * melt} mouth="worry" idle={false} fat={0.9} />
        {[0, 1, 2].map((i) => {
          const p = (melt * 2 + i * 0.33) % 1;
          return melt > 0 ? (
            <path key={i} d={`M${272 + i * 18} ${495 + p * 140} q6 14 0 22 q-6 -8 0 -22 Z`} fill={C.fat} stroke={C.fatDark} strokeWidth={2.5} opacity={1 - p} />
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
      end={d}
      plans={[
        { t: 0, a: [B.x + 40, B.y - 20, 2.3], b: [B.x + 80, B.y - 40, 2.0] },
        { t: w(2), a: [L.x, L.y, 1.9], b: [L.x, L.y, 2.15] },
        { t: w(3), a: [L.x - 30, L.y + 110, 1.45], b: [L.x - 40, L.y + 130, 1.35] },
        { t: w(6), a: [540, 900, 1.0] },
      ]}
    >
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
  const period = 42;
  const start = w(6) - 8;
  const phase = f < start ? 0 : ((f - start) % period) / period;
  const exhaling = f >= start && phase < 0.5;
  const breath = f < start ? 0.5 + 0.5 * Math.sin(f / 10) : exhaling ? 1 - phase * 2 : (phase - 0.5) * 2;
  return (
    <Cam
      end={d}
      plans={[
        { t: 0, a: [540, 900, 1.0], b: [520, 880, 1.06] },
        { t: w(5), a: [CHEST[0], CHEST[1], 2.2], b: [CHEST[0], CHEST[1] - 10, 2.4] },
        { t: w(7), a: [MOUTH[0] + 60, MOUTH[1] - 20, 2.3], b: [MOUTH[0] + 200, MOUTH[1] - 160, 2.0] },
        { t: w(8) + 6, a: [600, 860, 1.1], b: [540, 900, 1.0] },
      ]}
    >
      <Person
        x={PX}
        y={PY}
        s={S}
        belly={tw(f, w(6), d, 0.45, 0.38)}
        lungs={tw(f, w(5) - 4, w(5) + 4)}
        breath={breath}
        mouth={exhaling ? "o" : "smile"}
        eyes={exhaling ? "closed" : "open"}
      />
      {cycles(f, start, period, 54).map(({ k, p }) => (
        <Puff key={k} x={MOUTH[0] + 10} y={MOUTH[1]} p={p} dx={240} dy={-220} label="CO₂" s={1.3} />
      ))}
      <HandText x={300} y={470} text="%84" size={170} p={tw(f, w(1), w(3) + 6)} color={C.red} />
      <HandText x={300} y={570} text="karbondioksit" size={64} p={tw(f, w(4), w(4) + 14)} color={C.red} />
    </Cam>
  );
};

// "Kalan yüzde on altı ise su olur; terle ve idrarla atılır."
const Su: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const wipe = tw(f, w(7) - 4, w(7) + 8) - tw(f, w(9) - 2, w(9) + 8);
  const puddle = tw(f, w(8), w(10) + 20);
  return (
    <Cam
      end={d}
      plans={[
        { t: 0, a: [540, 900, 1.0], b: [540, 880, 1.06] },
        { t: w(7), a: [FACE[0], FACE[1] + 20, 2.5], b: [FACE[0], FACE[1] + 10, 2.7] },
        { t: w(9), a: [FEET[0], FEET[1] - 60, 2.0], b: [FEET[0], FEET[1] - 80, 2.2] },
        { t: w(10) + 6, a: [540, 800, 1.4], b: [540, 860, 1.15] },
      ]}
    >
      <Person
        x={PX}
        y={PY}
        s={S}
        belly={0.38}
        armL={[8, 0]}
        armR={[150 * wipe + 10 * (1 - wipe), -238 * wipe]}
        mouth="flat"
        eyes={wipe > 0.5 ? "closed" : "open"}
        blush={0.7}
        sweat={tw(f, w(7) - 6, w(7))}
      >
        {cycles(f, w(7) - 4, 8, 34).map(({ k, p }) => {
          const x = [-46, 40, -12, 52, -60][k % 5];
          const y0 = -780 + (k % 3) * 14;
          return <Drop key={k} x={x + (x > 0 ? 40 : -40) * p} y={y0 + 300 * p * p} s={0.9} o={interpolate(p, [0, 0.1, 0.8, 1], [0, 1, 1, 0])} />;
        })}
        {/* kollardan ve bacaklardan yere damlayan su */}
        {cycles(f, w(8), 9, 26).map(({ k, p }) => (
          <Drop key={`b${k}`} x={(k % 2 ? 1 : -1) * (60 + (k % 3) * 20)} y={-200 + 200 * p * p} s={0.8} o={interpolate(p, [0, 0.1, 0.85, 1], [0, 1, 1, 0])} />
        ))}
      </Person>
      <ellipse cx={PX} cy={PY + 16} rx={60 + 140 * puddle} ry={12 + 12 * puddle} fill={C.water} stroke={C.ink} strokeWidth={4} opacity={0.5 * Math.min(1, puddle * 4)} />
      <Drop x={300} y={470} s={2.4 * pop(f, w(1) - 3)} />
      <HandText x={490} y={500} text="%16 su" size={120} p={tw(f, w(1), w(5) + 6)} color={C.water} />
    </Cam>
  );
};

// "O zaman hızlı hızlı nefes alsan daha mı çok yağ yakarsın? Hayır, sadece başın döner."
const HizliNefes: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const pant = f >= w(2) - 3;
  const dizzy = f >= w(12) - 2;
  const fast = Math.sin(f * 0.9);
  const wobble = dizzy ? Math.sin(f / 5) * 7 : 0;
  return (
    <Cam
      end={d}
      shake={pant && !dizzy && f < w(11) ? 2.5 : f >= w(11) && f < w(11) + 8 ? 8 : 0}
      plans={[
        { t: 0, a: [540, 780, 1.5], b: [540, 760, 1.6] },
        { t: w(2), a: [FACE[0], FACE[1] + 30, 2.6], b: [FACE[0] + 20, FACE[1] + 20, 2.8] },
        { t: w(6), a: [CHEST[0], CHEST[1], 2.4] },
        { t: w(9), a: [BELLY[0], BELLY[1], 2.3], b: [BELLY[0], BELLY[1], 2.5] },
        { t: w(11), a: [540, 860, 1.0] },
        { t: w(12) + 2, a: [FACE[0], FACE[1] - 40, 2.0], b: [FACE[0], FACE[1] - 40, 2.2] },
      ]}
    >
      <Person
        x={PX + wobble * 3}
        y={PY + (pant ? Math.abs(fast) * 6 : 0)}
        s={S}
        belly={0.45}
        fat={tw(f, w(9) - 3, w(9) + 3) * (1 - tw(f, w(11), w(11) + 4))}
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
        ? cycles(f, w(2) - 3, 8, 16).map(({ k, p }) => <Puff key={k} x={MOUTH[0] + 8} y={MOUTH[1]} p={p} dx={110} dy={-50 + (k % 3) * 35} s={0.55} />)
        : null}
      {f < w(12) + 2 ? <HandText x={780} y={540} text="Hayır!" size={150} p={tw(f, w(11), w(11) + 8)} color={C.red} rotate={-8} /> : null}
    </Cam>
  );
};

// "Yağın yanması için önce kasların onu yakıt olarak kullanmalı. Bunu da sadece hareket sağlar."
const Hareket: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const j = jog(f, tw(f, 0, 10));
  const flowStart = w(5);
  const burn = tw(f, w(6) - 3, w(6) + 10);
  const back = f >= w(9) && f < w(12);
  const mouth = at(14, -703, PX, PY - j.bob);
  return (
    <Cam
      end={d}
      plans={[
        { t: 0, a: [540, 960, 1.0], b: [540, 930, 1.08] },
        { t: w(3), a: [LEGS[0], LEGS[1], 1.9], b: [LEGS[0], LEGS[1] - 20, 2.05] },
        { t: w(5), a: [540, at(0, -380)[1], 1.6], b: [540, at(0, -360)[1], 1.7] },
        { t: w(9), a: [540, 1020, 1.25], b: [540, 980, 1.1] },
        { t: w(12), a: [540, 760, 1.6], b: [540, 800, 1.4] },
      ]}
    >
      <Person
        x={PX}
        y={PY - j.bob}
        s={S}
        back={back}
        belly={tw(f, flowStart, d, 0.45, 0.25)}
        fat={tw(f, w(4), w(5)) * (1 - tw(f, w(9), w(9) + 1))}
        legL={j.legL}
        legR={j.legR}
        armL={j.armL}
        armR={j.armR}
        mouth="o"
        legGlow={tw(f, w(4) - 2, w(4) + 10) * (0.5 + 0.5 * burn)}
        blush={0.7}
        sweat={tw(f, w(9), w(12))}
      >
        {/* yağ parçacıkları göbekten bacak kaslarına akar, orada yanar */}
        {!back
          ? cycles(f, flowStart, 4, 26).map(({ k, p }) => {
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
            })
          : null}
      </Person>
      {!back
        ? cycles(f, w(9), 20, 46).map(({ k, p }) => <Puff key={k} x={mouth[0] + 8} y={mouth[1]} p={p} dx={200} dy={-170} label="CO₂" />)
        : null}
    </Cam>
  );
};

// "Kısacası yağı hareketle yakar, nefesinle dışarı verirsin. Kaydet, sonra lazım olur."
const Kapanis: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const running = f < w(4);
  const j = jog(f, running ? 1 : 0);
  const cheer = tw(f, w(7) - 3, w(7) + 8);
  const save = pop(f, w(7), 14);
  const exhale = f >= w(4) && f < w(7);
  return (
    <Cam
      end={d}
      plans={[
        { t: 0, a: [LEGS[0], LEGS[1] - 40, 1.7], b: [LEGS[0], LEGS[1] - 60, 1.85] },
        { t: w(4), a: [FACE[0] + 40, FACE[1], 2.4], b: [FACE[0] + 140, FACE[1] - 60, 2.1] },
        { t: w(7), a: [500, 900, 1.08], b: [500, 900, 1.0] },
      ]}
    >
      <Person
        x={PX}
        y={PY - j.bob}
        s={S}
        belly={0.2}
        legL={j.legL}
        legR={j.legR}
        legGlow={running ? 0.8 : 0}
        armL={running ? j.armL : [45, -110]}
        armR={running ? j.armR : [45 + 120 * cheer, -110 + 95 * cheer]}
        mouth={exhale || running ? "o" : "grin"}
        eyes={exhale ? "closed" : "open"}
      />
      {exhale
        ? cycles(f, w(4), 30, 56).map(({ k, p }) => <Puff key={k} x={MOUTH[0] + 8} y={MOUTH[1]} p={p} dx={220} dy={-190} label="CO₂" s={1.2} />)
        : null}
      {save > 0 ? (
        <g transform={`translate(230 880) scale(${save}) rotate(-6)`}>
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
