import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  random,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily } from "../fonts";
import { audioFor, ProgressBar, SAFE, sceneDurations, Subtitles, wordsFor } from "../shared";
import type { PostVoiceover, Story } from "../types";

// Belgesel havası: koyu arka plan, sıcak kehribar vurgu, küf için yeşil
const C = {
  bg: "#0b0f14",
  glow: "#3a2a12",
  text: "#f8f5ee",
  muted: "#a8a29e",
  accent: "#fbbf24",
  mold: "#84cc16",
  moldDark: "#3f6212",
  bacteria: "#fde68a",
  danger: "#f87171",
};

export type StoryProps = { story: Story; voiceover: PostVoiceover | null };

export const StoryVideo: React.FC<StoryProps> = ({ story, voiceover }) => {
  const { fps } = useVideoConfig();
  const durations = sceneDurations(story, voiceover, fps);
  let from = 0;

  return (
    <AbsoluteFill style={{ fontFamily, color: C.text, backgroundColor: C.bg }}>
      <Backdrop />
      {story.scenes.map((scene, i) => {
        const start = from;
        from += durations[i];
        const audio = audioFor(story, voiceover, i);
        const Visual = VISUALS[scene.visual] ?? Missing;
        return (
          <Sequence key={i} from={start} durationInFrames={durations[i]} name={`${i + 1}-${scene.visual}`}>
            <SceneShell>
              <Visual />
            </SceneShell>
            <Subtitles words={wordsFor(scene.voice, audio)} accent={C.accent} />
            {audio ? <Audio src={staticFile(audio.file)} /> : null}
          </Sequence>
        );
      })}
      <ProgressBar color={C.accent} />
    </AbsoluteFill>
  );
};

// Sabit, hafif hareketli sıcak ışık
const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const y = 40 + Math.sin(frame / 90) * 6;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% ${y}%, ${C.glow} 0%, ${C.bg} 60%)`,
      }}
    />
  );
};

// Her sahne yumuşakça belirir, hafifçe yakınlaşır (Ken Burns) ve kaybolur
const SceneShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(frame, [0, 10, durationInFrames - 8, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.04]);
  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${scale})`,
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom + 160}px`,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const Missing: React.FC = () => null;

const useEnter = (delay = 0, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 140 } });
};

const Kicker: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const e = useEnter(delay, 200);
  return (
    <div
      style={{
        fontSize: 40,
        fontWeight: 700,
        letterSpacing: 8,
        color: C.accent,
        opacity: e,
        transform: `translateY(${interpolate(e, [0, 1], [20, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
};

/* ---------- Petri kabı: bakteriler, küf ve temizlenen alan ---------- */

const DISH_R = 360;
const MOLD = { x: 470, y: 340 };
const BACTERIA = Array.from({ length: 220 }, (_, i) => {
  const a = random(`a${i}`) * Math.PI * 2;
  const r = Math.sqrt(random(`r${i}`)) * (DISH_R - 40);
  const x = 400 + Math.cos(a) * r;
  const y = 400 + Math.sin(a) * r;
  return { x, y, size: 6 + random(`s${i}`) * 7, dist: Math.hypot(x - MOLD.x, y - MOLD.y) };
});

const blobPath = (cx: number, cy: number, R: number, seed: number) => {
  const pts = Array.from({ length: 48 }, (_, i) => {
    const t = (i / 48) * Math.PI * 2;
    const r = R * (1 + 0.08 * Math.sin(3 * t + seed) + 0.05 * Math.sin(7 * t + seed * 2) + 0.03 * Math.sin(13 * t + seed * 3));
    return `${(cx + Math.cos(t) * r).toFixed(1)},${(cy + Math.sin(t) * r).toFixed(1)}`;
  });
  return `M${pts.join("L")}Z`;
};

const PetriDish: React.FC<{ mold: number; clear: number; size?: number }> = ({ mold, clear, size = 760 }) => {
  const frame = useCurrentFrame();
  const moldR = 95 * mold;
  const clearR = moldR + 170 * clear;
  return (
    <svg width={size} height={size} viewBox="0 0 800 800">
      <defs>
        <radialGradient id="agar" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#5b4a22" />
          <stop offset="100%" stopColor="#2a2214" />
        </radialGradient>
        <radialGradient id="mold" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d9f99d" />
          <stop offset="60%" stopColor={C.mold} />
          <stop offset="100%" stopColor={C.moldDark} />
        </radialGradient>
      </defs>
      <circle cx={400} cy={400} r={DISH_R} fill="url(#agar)" />
      {BACTERIA.map((b, i) => {
        const gone = interpolate(b.dist - clearR, [-30, 0], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const wobble = Math.sin(frame / 8 + i) * 1.2;
        return (
          <circle
            key={i}
            cx={b.x + wobble}
            cy={b.y}
            r={b.size * (0.4 + 0.6 * gone)}
            fill={C.bacteria}
            opacity={0.85 * gone}
          />
        );
      })}
      {clear > 0 ? (
        <circle
          cx={MOLD.x}
          cy={MOLD.y}
          r={clearR}
          fill="none"
          stroke={C.accent}
          strokeWidth={4}
          strokeDasharray="14 12"
          opacity={interpolate(clear, [0, 0.3, 1], [0, 0.9, 0.9])}
        />
      ) : null}
      {mold > 0 ? (
        <>
          {/* Küf kolonisi: ana leke + çevresinde küçük lekeler, yumuşak kenarlı */}
          <path d={blobPath(MOLD.x, MOLD.y, moldR * 1.15, 2.2)} fill={C.mold} opacity={0.25} />
          <path d={blobPath(MOLD.x, MOLD.y, moldR, 1.3)} fill="url(#mold)" opacity={0.95} />
          <path d={blobPath(MOLD.x - 70 * mold, MOLD.y + 60 * mold, moldR * 0.3, 5.2)} fill="url(#mold)" opacity={0.9} />
          <path d={blobPath(MOLD.x + 80 * mold, MOLD.y + 30 * mold, moldR * 0.22, 3.7)} fill="url(#mold)" opacity={0.9} />
          <path d={blobPath(MOLD.x + 20, MOLD.y - 20, moldR * 0.4, 4.1)} fill="#ecfccb" opacity={0.45} />
        </>
      ) : null}
      {/* Cam kenar ve parlama */}
      <circle cx={400} cy={400} r={DISH_R} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={12} />
      <circle cx={400} cy={400} r={DISH_R + 18} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={6} />
      <path d="M170 220 A300 300 0 0 1 330 110" stroke="rgba(255,255,255,0.35)" strokeWidth={14} fill="none" strokeLinecap="round" />
    </svg>
  );
};

/* ---------- Sahneler ---------- */

// 1928 — yıl sayacı ve dağınık masa
const Yil: React.FC = () => {
  const frame = useCurrentFrame();
  const year = Math.round(
    interpolate(frame, [0, 40], [1900, 1928], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }),
  );
  const desk = useEnter(25);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <Kicker>LONDRA</Kicker>
      <div style={{ fontSize: 260, fontWeight: 900, lineHeight: 1, color: C.text }}>{year}</div>
      <svg width={760} height={300} viewBox="0 0 760 300" style={{ opacity: desk, transform: `translateY(${(1 - desk) * 40}px)` }}>
        <rect x={20} y={240} width={720} height={16} rx={8} fill="#6b4f2a" />
        {[
          { x: 120, y: 218, r: -4 },
          { x: 150, y: 194, r: 6 },
          { x: 130, y: 170, r: -8 },
          { x: 420, y: 218, r: 3 },
          { x: 600, y: 218, r: -2 },
        ].map((d, i) => (
          <g key={i} transform={`rotate(${d.r} ${d.x + 70} ${d.y + 10})`}>
            <ellipse cx={d.x + 70} cy={d.y + 10} rx={80} ry={16} fill="rgba(253,230,138,0.25)" stroke="rgba(255,255,255,0.6)" strokeWidth={4} />
          </g>
        ))}
        {/* Devrilmiş bir tüp */}
        <rect x={300} y={205} width={90} height={22} rx={11} fill="rgba(255,255,255,0.35)" transform="rotate(-12 345 216)" />
      </svg>
      <div style={{ fontSize: 46, fontWeight: 600, color: C.muted, opacity: desk }}>Dağınık bir laboratuvar</div>
    </div>
  );
};

// Alexander Fleming tanıtım kartı
const Fleming: React.FC = () => {
  const card = useEnter(0);
  const line = useEnter(12, 200);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 28,
        transform: `translateY(${(1 - card) * 120}px)`,
        opacity: card,
      }}
    >
      <svg width={360} height={360} viewBox="0 0 200 200">
        <circle cx={100} cy={100} r={96} fill="#1f2937" stroke={C.accent} strokeWidth={6} />
        <circle cx={100} cy={80} r={34} fill={C.text} />
        <path d="M38 172 C46 128 154 128 162 172 Z" fill={C.text} />
        {/* Papyon */}
        <path d="M88 140 L100 148 L112 140 L112 156 L100 148 L88 156 Z" fill={C.accent} />
      </svg>
      <div style={{ fontSize: 92, fontWeight: 900, lineHeight: 1.05 }}>
        Alexander
        <br />
        Fleming
      </div>
      <div style={{ width: 400 * line, height: 6, backgroundColor: C.accent, borderRadius: 3 }} />
      <div style={{ fontSize: 44, fontWeight: 600, color: C.muted, opacity: line }}>Bakteri araştırmacısı</div>
    </div>
  );
};

// Kapta küf büyüyor
const Kuf: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const mold = interpolate(frame, [15, durationInFrames * 0.7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <Kicker>TATİLDEN DÖNÜŞ</Kicker>
      <PetriDish mold={mold} clear={0} />
    </div>
  );
};

// Küfün etrafındaki bakteriler yok oluyor
const Temizlik: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const clear = interpolate(frame, [durationInFrames * 0.35, durationInFrames * 0.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <Kicker>BİR TUHAFLIK</Kicker>
      <PetriDish mold={1} clear={clear} />
    </div>
  );
};

// İsim konuyor: PENİSİLİN damgası
const Penisilin: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const stampAt = Math.round(durationInFrames * 0.55);
  const stamp = useEnter(stampAt, 11);
  const shake = frame >= stampAt && frame < stampAt + 6 ? Math.sin(frame * 3) * 6 : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ transform: `translateX(${shake}px)` }}>
        <PetriDish mold={1} clear={1} size={560} />
      </div>
      <div
        style={{
          fontSize: 132,
          fontWeight: 900,
          letterSpacing: 6,
          color: C.accent,
          opacity: stamp,
          transform: `scale(${interpolate(stamp, [0, 1], [2.2, 1])}) rotate(-4deg)`,
          border: `8px solid ${C.accent}`,
          borderRadius: 18,
          padding: "4px 36px",
        }}
      >
        PENİSİLİN
      </div>
    </div>
  );
};

// Zaman çizelgesi: keşiften seri üretime
const Zaman: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const events = [
    { year: "1928", label: "Keşif" },
    { year: "1941", label: "İlk hasta tedavisi" },
    { year: "1944", label: "Seri üretim" },
  ];
  const progress = interpolate(frame, [10, durationInFrames * 0.85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const H = 820;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
      <Kicker>OXFORD</Kicker>
      <div style={{ position: "relative", width: 700, height: H }}>
        <div style={{ position: "absolute", left: 120, top: 0, width: 8, height: H, background: "rgba(255,255,255,0.12)", borderRadius: 4 }} />
        <div style={{ position: "absolute", left: 120, top: 0, width: 8, height: H * progress, background: C.accent, borderRadius: 4 }} />
        {events.map((e, i) => {
          const at = i / (events.length - 1);
          const on = interpolate(progress, [at - 0.05, at + 0.02], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={e.year}
              style={{
                position: "absolute",
                top: at * (H - 60),
                left: 96,
                display: "flex",
                alignItems: "center",
                gap: 40,
                opacity: 0.25 + 0.75 * on,
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: 28, background: on > 0.5 ? C.accent : C.bg, border: `6px solid ${C.accent}` }} />
              <div style={{ textAlign: "left", transform: `translateX(${(1 - on) * 30}px)` }}>
                <div style={{ fontSize: 84, fontWeight: 900, lineHeight: 1 }}>{e.year}</div>
                <div style={{ fontSize: 44, fontWeight: 600, color: C.muted }}>{e.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Kurtarılan hayatlar: insan simgeleri dalga halinde yanıyor
const Hayatlar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const cols = 10;
  const rows = 9;
  const title = useEnter(Math.round(durationInFrames * 0.45));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
      <svg width={800} height={720} viewBox={`0 0 ${cols * 80} ${rows * 80}`}>
        {Array.from({ length: cols * rows }, (_, i) => {
          const c = i % cols;
          const r = Math.floor(i / cols);
          const dist = Math.hypot(c - cols / 2, r - rows / 2);
          const on = interpolate(frame, [dist * 4, dist * 4 + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const x = c * 80 + 40;
          const y = r * 80 + 40;
          return (
            <g key={i} opacity={0.15 + 0.85 * on} fill={on > 0.5 ? C.accent : C.muted}>
              <circle cx={x} cy={y - 14} r={11} />
              <path d={`M${x - 20} ${y + 28} Q${x} ${y - 10} ${x + 20} ${y + 28} Z`} />
            </g>
          );
        })}
      </svg>
      <div style={{ fontSize: 88, fontWeight: 900, opacity: title, transform: `scale(${0.8 + 0.2 * title})` }}>
        Milyonlarca hayat
      </div>
    </div>
  );
};

// Kapanış: Fleming'in sözü kelime kelime belirir
const Alinti: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const words = "İnsan bazen aramadığı şeyi bulur.".split(" ");
  const sign = useEnter(Math.round(durationInFrames * 0.6), 200);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <div style={{ fontSize: 260, fontWeight: 900, color: C.accent, lineHeight: 0.6, height: 140 }}>“</div>
      <div style={{ fontSize: 100, fontWeight: 900, lineHeight: 1.15 }}>
        {words.map((w, i) => {
          const o = interpolate(frame, [20 + i * 7, 30 + i * 7], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <span key={i} style={{ opacity: o, display: "inline-block", transform: `translateY(${(1 - o) * 20}px)` }}>
              {w}&nbsp;
            </span>
          );
        })}
      </div>
      <div style={{ fontSize: 48, fontWeight: 600, color: C.muted, opacity: sign }}>— Alexander Fleming</div>
    </div>
  );
};

const VISUALS: Record<string, React.FC> = {
  yil: Yil,
  fleming: Fleming,
  kuf: Kuf,
  temizlik: Temizlik,
  penisilin: Penisilin,
  zaman: Zaman,
  hayatlar: Hayatlar,
  alinti: Alinti,
};

export const STORY_VISUALS = Object.keys(VISUALS);
