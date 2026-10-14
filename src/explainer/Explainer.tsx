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
import { interFamily, monoFamily } from "../fonts";
import { audioFor, ProgressBar, sceneDurations, useSeconds, wordsFor } from "../shared";
import type { Explainer, ExplainerScene, PostVoiceover, WordTiming } from "../types";

// Bilgi videosu: koyu zemin, VOOM yeşili vurgu; uyarılar için sıcak turuncu / kırmızı
const C = {
  bg: "#06070a",
  card: "#111318",
  cardHi: "#181b21",
  border: "#262a31",
  text: "#f5f5f5",
  muted: "#8b8f97",
  lime: "#c8e85a",
  warm: "#ff9a3d",
  danger: "#ff5d5d",
  teal: "#6ad0c7",
};

type Tone = "lime" | "warm" | "danger" | "muted" | "teal";
const toneColor = (t?: string) =>
  ({ lime: C.lime, warm: C.warm, danger: C.danger, muted: C.muted, teal: C.teal })[(t as Tone) ?? "lime"] ?? C.lime;

// Görselin yerleştiği alan (başlığın altı, altyazının üstü)
const STAGE = { top: 560, height: 860, width: 900 };

export type ExplainerProps = { explainer: Explainer; voiceover: PostVoiceover | null };

export const ExplainerVideo: React.FC<ExplainerProps> = ({ explainer, voiceover }) => {
  const { fps } = useVideoConfig();
  const durations = sceneDurations(explainer, voiceover, fps);
  let from = 0;

  return (
    <AbsoluteFill style={{ fontFamily: interFamily, color: C.text, backgroundColor: C.bg }}>
      <Backdrop />
      {explainer.scenes.map((scene, i) => {
        const start = from;
        from += durations[i];
        const audio = audioFor(explainer, voiceover, i);
        const Visual = VISUALS[scene.visual] ?? Missing;
        const fullscreen = scene.visual === "soru" || scene.visual === "kapanis";
        return (
          <Sequence key={i} from={start} durationInFrames={durations[i]} name={`${i + 1}-${scene.visual}`}>
            <Fade>
              {fullscreen ? null : <Header scene={scene} />}
              <div
                style={{
                  position: "absolute",
                  left: (1080 - STAGE.width) / 2,
                  top: fullscreen ? 0 : STAGE.top,
                  width: STAGE.width,
                  height: fullscreen ? 1920 : STAGE.height,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Visual scene={scene} data={scene.data ?? {}} />
              </div>
            </Fade>
            <Captions words={wordsFor(scene.voice, audio)} />
            {audio ? <Audio src={staticFile(audio.file)} /> : null}
          </Sequence>
        );
      })}
      <Watermark tag={explainer.tag} />
      <ProgressBar color={C.lime} />
    </AbsoluteFill>
  );
};

type VisualProps = { scene: ExplainerScene; data: Record<string, unknown> };
const Missing: React.FC<VisualProps> = () => null;

/* ---------- Ortak parçalar ---------- */

// Yavaşça süzülen bulanık ışık noktaları + ince ızgara
const BOKEH = Array.from({ length: 14 }, (_, i) => ({
  x: random(`bx${i}`) * 1080,
  y: random(`by${i}`) * 1920,
  r: 30 + random(`br${i}`) * 90,
  s: 0.3 + random(`bs${i}`) * 0.7,
}));

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <AbsoluteFill
        style={{ background: "radial-gradient(circle at 50% 52%, rgba(200,232,90,0.09) 0%, rgba(0,0,0,0) 55%)" }}
      />
      {BOKEH.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: b.x + Math.sin(frame / 70 + i) * 20,
            top: (b.y - frame * b.s + 1920 * 2) % 1920,
            width: b.r,
            height: b.r,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            filter: "blur(6px)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// Sol üstte "VOOM · KONU", sağ üstte akan zaman kodu
const Watermark: React.FC<{ tag?: string }> = ({ tag }) => {
  const frame = useCurrentFrame();
  const sec = Math.floor(frame / 30);
  const tc = `00:${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}:${String(frame % 30).padStart(2, "0")}`;
  const style: React.CSSProperties = { fontFamily: monoFamily, fontSize: 24, letterSpacing: 5, color: C.muted };
  return (
    <div style={{ position: "absolute", top: 110, left: 70, right: 70, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ ...style, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: C.lime }} />
        VOOM{tag ? ` · ${tag}` : ""}
      </div>
      <div style={style}>{tc}</div>
    </div>
  );
};

// Altyazı: soldaki yeşil çizgiyle, söylenen kelimeler beyaz, sıradakiler gri, o an söylenen yeşil
const Captions: React.FC<{ words: WordTiming[] }> = ({ words }) => {
  const t = useSeconds();
  const chunks: WordTiming[][] = [];
  let cur: WordTiming[] = [];
  for (const w of words) {
    cur.push(w);
    const len = cur.reduce((a, x) => a + x.word.length + 1, 0);
    if (len > 26 || /[.?!]$/.test(w.word)) {
      chunks.push(cur);
      cur = [];
    }
  }
  if (cur.length) chunks.push(cur);
  const current = chunks.findLast((c) => t >= c[0].start) ?? chunks[0];
  if (!current) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 340,
        left: 90,
        right: 90,
        display: "flex",
        gap: 26,
        alignItems: "stretch",
      }}
    >
      <div style={{ width: 8, borderRadius: 4, backgroundColor: C.lime, flexShrink: 0 }} />
      <div style={{ fontSize: 50, fontWeight: 700, lineHeight: 1.25, textShadow: "0 4px 18px rgba(0,0,0,0.9)" }}>
        {current.map((w, i) => {
          const said = t >= w.start;
          const now = t >= w.start && t <= w.end;
          return (
            <span key={i} style={{ color: now ? C.lime : said ? C.text : "rgba(245,245,245,0.38)" }}>
              {i > 0 ? " " : ""}
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const Fade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(frame, [0, 8, durationInFrames - 6, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const useEnter = (delay = 0, damping = 16) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 130 } });
};

// Sahnenin ilerleme oranı (0 → 1), görsellerin sesle birlikte ilerlemesi için
const useProgress = (startAt = 0.05, endAt = 0.85) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(frame, [durationInFrames * startAt, durationInFrames * endAt], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
};

// *yıldız* içindeki kelimeleri işaretler
const markedWords = (text: string) => {
  let on = false;
  return text.toLocaleUpperCase("tr-TR").split(" ").map((raw) => {
    const opens = raw.startsWith("*");
    const closes = raw.endsWith("*") && (raw.length > 1 || !opens);
    const word = raw.replace(/\*/g, "");
    const mark = on || opens;
    if (opens) on = true;
    if (closes) on = false;
    return { word, mark };
  });
};

// Kelime kelime beliren başlık
const Title: React.FC<{ text: string; size: number; delay?: number }> = ({ text, size, delay = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ fontSize: size, fontWeight: 900, lineHeight: 1.05, letterSpacing: -size * 0.02, textAlign: "center" }}>
      {markedWords(text).map(({ word, mark }, i) => {
        const o = interpolate(frame, [delay + i * 3, delay + 8 + i * 3], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: o,
              transform: `translateY(${(1 - o) * 20}px)`,
              color: mark ? C.lime : undefined,
            }}
          >
            {word}&nbsp;
          </span>
        );
      })}
    </div>
  );
};

const Kicker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const e = useEnter(0, 200);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 26px",
        borderRadius: 999,
        border: `2px solid ${C.border}`,
        backgroundColor: "rgba(17,19,24,0.8)",
        fontFamily: monoFamily,
        fontSize: 28,
        fontWeight: 600,
        letterSpacing: 6,
        color: C.lime,
        opacity: e,
        transform: `translateY(${(1 - e) * -16}px)`,
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.lime }} />
      {children}
    </div>
  );
};

const Header: React.FC<{ scene: ExplainerScene }> = ({ scene }) => (
  <div
    style={{
      position: "absolute",
      top: 210,
      left: 70,
      right: 70,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 28,
    }}
  >
    {scene.kicker ? <Kicker>{scene.kicker}</Kicker> : null}
    {scene.title ? <Title text={scene.title} size={68} delay={4} /> : null}
  </div>
);

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      backgroundColor: C.card,
      border: `2px solid ${C.border}`,
      borderRadius: 28,
      boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
      ...style,
    }}
  >
    {children}
  </div>
);

const Check: React.FC<{ size: number; color?: string; progress?: number }> = ({ size, color = C.lime, progress = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      d="M5 12.5l4.5 4.5L19 7.5"
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={24}
      strokeDashoffset={24 * (1 - progress)}
    />
  </svg>
);

const Cross: React.FC<{ size: number; color?: string; progress?: number }> = ({ size, color = C.danger, progress = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M6 6l12 12" stroke={color} strokeWidth={3} strokeLinecap="round" strokeDasharray={17} strokeDashoffset={17 * (1 - Math.min(1, progress * 2))} />
    <path d="M18 6L6 18" stroke={color} strokeWidth={3} strokeLinecap="round" strokeDasharray={17} strokeDashoffset={17 * (1 - Math.max(0, progress * 2 - 1))} />
  </svg>
);

/* ---------- Açılış sorusu ---------- */

const Soru: React.FC<VisualProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const ring = useEnter(0, 12);
  const pulse = 1 + Math.sin(frame / 10) * 0.04;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 70, marginTop: -260 }}>
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: 100,
          border: `5px solid ${C.lime}`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 120,
          fontWeight: 800,
          color: C.lime,
          opacity: ring,
          transform: `scale(${ring * pulse})`,
          boxShadow: `0 0 80px rgba(200,232,90,${0.25 * ring})`,
        }}
      >
        ?
      </div>
      <Title text={scene.title ?? ""} size={92} delay={6} />
    </div>
  );
};

/* ---------- Kapanış: VOOM + takip et ---------- */

const Kapanis: React.FC<VisualProps> = ({ scene }) => {
  const mark = useEnter(0, 14);
  const line = useEnter(12, 200);
  const pill = useEnter(26, 12);
  const tick = useEnter(40, 200);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 54, marginTop: -260 }}>
      <div
        style={{
          fontFamily: monoFamily,
          fontSize: 150,
          fontWeight: 500,
          letterSpacing: 68,
          marginRight: -68,
          opacity: mark,
          transform: `scale(${0.85 + 0.15 * mark})`,
        }}
      >
        VOOM
      </div>
      <div style={{ width: 140 * line, height: 5, backgroundColor: C.lime }} />
      {scene.title ? (
        <div style={{ opacity: line }}>
          <Title text={scene.title} size={58} delay={14} />
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "22px 48px",
          borderRadius: 999,
          backgroundColor: tick > 0.5 ? C.lime : "transparent",
          border: `3px solid ${C.lime}`,
          color: tick > 0.5 ? "#000" : C.lime,
          fontFamily: monoFamily,
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: 6,
          opacity: pill,
          transform: `scale(${pill})`,
        }}
      >
        {tick > 0.5 ? <Check size={40} color="#000" progress={tick} /> : <span style={{ fontSize: 44 }}>+</span>}
        {tick > 0.5 ? "TAKİPTESİN" : "TAKİP ET"}
      </div>
    </div>
  );
};

/* ---------- Çizgi grafik (bir veya iki seri) ---------- */
// data: { series: [{ points: number[], label?, tone? }], labels: string[], from?: 0..1, to?: 0..1, note?: string }

const Cizgi: React.FC<VisualProps> = ({ data }) => {
  const series = (data.series as { points: number[]; label?: string; tone?: string }[]) ?? [];
  const labels = (data.labels as string[]) ?? [];
  const from = (data.from as number) ?? 0;
  const to = (data.to as number) ?? 1;
  const p = useProgress(0.05, 0.75);
  const reveal = from + (to - from) * p;
  const card = useEnter(0);
  const W = 820;
  const H = 520;
  const pad = { l: 40, r: 40, t: 50, b: 70 };
  const n = Math.max(...series.map((s) => s.points.length), 2);
  const x = (i: number) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);

  return (
    <Card style={{ padding: 30, opacity: card, transform: `translateY(${(1 - card) * 60}px)` }}>
      <svg width={W} height={H}>
        {[0, 25, 50, 75, 100].map((g) => (
          <line key={g} x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="rgba(255,255,255,0.06)" strokeWidth={2} />
        ))}
        {labels.map((l, i) => (
          <text key={i} x={x(i)} y={H - 22} fill={C.muted} fontSize={24} fontFamily={monoFamily} textAnchor="middle">
            {l}
          </text>
        ))}
        <defs>
          <clipPath id="reveal">
            <rect x={0} y={0} width={pad.l + reveal * (W - pad.l - pad.r) + 2} height={H} />
          </clipPath>
        </defs>
        {series.map((s, si) => {
          const color = toneColor(s.tone ?? (si === 0 ? "lime" : "teal"));
          const d = s.points.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
          const area = `${d} L${x(s.points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
          // Uç noktası: açılan kısmın sonundaki değer
          const fi = reveal * (s.points.length - 1);
          const i0 = Math.floor(fi);
          const i1 = Math.min(s.points.length - 1, i0 + 1);
          const v = s.points[i0] + (s.points[i1] - s.points[i0]) * (fi - i0);
          return (
            <g key={si}>
              <g clipPath="url(#reveal)">
                <path d={area} fill={color} opacity={0.08} />
                <path d={d} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <circle cx={x(fi)} cy={y(v)} r={14} fill={color} />
              <circle cx={x(fi)} cy={y(v)} r={26} fill={color} opacity={0.2} />
              {s.label ? (
                <text x={x(fi) + (fi > (n - 1) * 0.7 ? -34 : 34)} y={y(v) - 26} fill={color} fontSize={28} fontWeight={700} fontFamily={interFamily} textAnchor={fi > (n - 1) * 0.7 ? "end" : "start"}>
                  {s.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {data.note ? (
        <div style={{ fontFamily: monoFamily, fontSize: 24, letterSpacing: 4, color: C.muted, textAlign: "center", marginTop: 6 }}>
          {data.note as string}
        </div>
      ) : null}
    </Card>
  );
};

/* ---------- Takvim / blok ızgarası ---------- */
// data: { columns?: number, cells: [{ top, main, tone?, check?, cross? }] }

const Takvim: React.FC<VisualProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const cells = (data.cells as { top: string; main: string; tone?: string; check?: boolean; cross?: boolean }[]) ?? [];
  const columns = (data.columns as number) ?? 4;
  const gap = 18;
  const w = (STAGE.width - gap * (columns - 1)) / columns;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap, width: STAGE.width, justifyContent: "center" }}>
      {cells.map((c, i) => {
        const e = spring({ frame: frame - 4 - i * 5, fps: 30, config: { damping: 14, stiffness: 130 } });
        const mark = interpolate(frame, [20 + i * 5, 34 + i * 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const color = c.tone ? toneColor(c.tone) : C.text;
        return (
          <div
            key={i}
            style={{
              width: w,
              height: w * 1.05,
              borderRadius: 24,
              backgroundColor: c.tone ? `${color}14` : C.card,
              border: `2px solid ${c.tone ? color : C.border}`,
              padding: "22px 18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              opacity: e,
              transform: `scale(${0.8 + 0.2 * e})`,
            }}
          >
            <div style={{ fontFamily: monoFamily, fontSize: 22, letterSpacing: 3, color: C.muted }}>{c.top}</div>
            <div style={{ fontSize: c.main.length > 9 ? 30 : 36, fontWeight: 800, lineHeight: 1.1, color }}>{c.main}</div>
            <div style={{ height: 44 }}>
              {c.check ? <Check size={44} color={color === C.text ? C.lime : color} progress={mark} /> : null}
              {c.cross ? <Cross size={44} progress={mark} /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- Sütun grafik ---------- */
// data: { bars: [{ label, value (0-100), text?, tone? }], limit?: number, limitLabel?: string }

const Bar: React.FC<VisualProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const bars = (data.bars as { label: string; value: number; text?: string; tone?: string }[]) ?? [];
  const limit = data.limit as number | undefined;
  const H = 600;
  const gap = 22;
  const w = (STAGE.width - 80 - gap * (bars.length - 1)) / bars.length;
  const lim = useEnter(10 + bars.length * 7, 200);
  return (
    <Card style={{ padding: "50px 40px 30px", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap, height: H }}>
        {bars.map((b, i) => {
          const g = interpolate(frame, [6 + i * 7, 30 + i * 7], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          const color = toneColor(b.tone);
          return (
            <div key={i} style={{ width: w, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: w > 120 ? 34 : 28, fontWeight: 800, color, opacity: g }}>{b.text ?? ""}</div>
              <div
                style={{
                  width: "100%",
                  height: ((H - 110) * b.value * g) / 100,
                  borderRadius: 16,
                  background: `linear-gradient(${color}, ${color}55)`,
                  boxShadow: `0 0 40px ${color}33`,
                }}
              />
              <div style={{ fontFamily: monoFamily, fontSize: 22, color: C.muted, letterSpacing: 2 }}>{b.label}</div>
            </div>
          );
        })}
      </div>
      {limit !== undefined ? (
        <div
          style={{
            position: "absolute",
            left: 30,
            right: 30,
            top: 50 + (H - 60) - ((H - 110) * limit) / 100 - 40,
            borderTop: `4px dashed ${C.danger}`,
            opacity: lim,
          }}
        >
          <div style={{ position: "absolute", right: 0, top: -50, fontFamily: monoFamily, fontSize: 24, color: C.danger, letterSpacing: 3 }}>
            {(data.limitLabel as string) ?? "SINIR"}
          </div>
        </div>
      ) : null}
    </Card>
  );
};

/* ---------- Seri: gün gün tekrar (kaçırılan günler kırmızı) ---------- */
// data: { count, miss?: number[], label? }

const Seri: React.FC<VisualProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const count = (data.count as number) ?? 14;
  const miss = new Set((data.miss as number[]) ?? []);
  const per = 7;
  const size = 96;
  const done = Array.from({ length: count }, (_, i) => i).filter((i) => !miss.has(i));
  const filled = Math.floor(interpolate(frame, [10, 10 + count * 4], [0, count], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const shown = done.filter((i) => i < filled).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 50 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${per}, ${size}px)`, gap: 22 }}>
        {Array.from({ length: count }, (_, i) => {
          const on = i < filled;
          const m = miss.has(i);
          const color = m ? C.danger : C.lime;
          return (
            <div
              key={i}
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                border: `4px solid ${on ? color : C.border}`,
                backgroundColor: on ? (m ? "rgba(255,93,93,0.12)" : C.lime) : "transparent",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                transform: `scale(${on ? 1 : 0.85})`,
              }}
            >
              {on ? m ? <Cross size={48} /> : <Check size={52} color="#000" /> : null}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
        <div style={{ fontSize: 120, fontWeight: 900, color: C.lime, lineHeight: 1 }}>{shown}</div>
        <div style={{ fontSize: 40, fontWeight: 700, color: C.muted }}>{(data.label as string) ?? "gün"}</div>
      </div>
    </div>
  );
};

/* ---------- Mesajlaşma (koç ile) ---------- */
// data: { messages: [{ from: "me" | "coach", text }], startAt?: number, badge?: string }

const Mesaj: React.FC<VisualProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const messages = (data.messages as { from: "me" | "coach"; text: string }[]) ?? [];
  const startAt = (data.startAt as number) ?? 0;
  const animated = messages.length - startAt;
  const step = Math.max(18, (durationInFrames * 0.7) / Math.max(1, animated));
  const badgeAt = 10 + animated * step;
  const badge = spring({ frame: frame - badgeAt, fps: 30, config: { damping: 12, stiffness: 140 } });
  return (
    <Card style={{ width: 820, padding: "34px 34px 40px", display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 18, borderBottom: `2px solid ${C.border}` }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.lime, color: "#000", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: 900, fontSize: 30 }}>
          K
        </div>
        <div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>Koçun</div>
          <div style={{ fontFamily: monoFamily, fontSize: 20, color: C.lime, letterSpacing: 3 }}>ÇEVRİMİÇİ</div>
        </div>
      </div>
      {messages.map((m, i) => {
        const at = i < startAt ? -100 : 10 + (i - startAt) * step;
        const e = spring({ frame: frame - at, fps: 30, config: { damping: 15, stiffness: 140 } });
        if (e <= 0.01) return null;
        const me = m.from === "me";
        return (
          <div
            key={i}
            style={{
              alignSelf: me ? "flex-end" : "flex-start",
              maxWidth: "82%",
              padding: "20px 28px",
              borderRadius: 28,
              borderBottomRightRadius: me ? 8 : 28,
              borderBottomLeftRadius: me ? 28 : 8,
              backgroundColor: me ? C.cardHi : "rgba(200,232,90,0.12)",
              border: `2px solid ${me ? C.border : "rgba(200,232,90,0.45)"}`,
              fontSize: 32,
              lineHeight: 1.3,
              opacity: e,
              transform: `translateY(${(1 - e) * 30}px) scale(${0.9 + 0.1 * e})`,
            }}
          >
            {m.text}
          </div>
        );
      })}
      {data.badge ? (
        <div
          style={{
            alignSelf: "center",
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 30px",
            borderRadius: 999,
            backgroundColor: C.lime,
            color: "#000",
            fontFamily: monoFamily,
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: 4,
            opacity: badge,
            transform: `scale(${badge})`,
          }}
        >
          <Check size={30} color="#000" />
          {data.badge as string}
        </div>
      ) : null}
    </Card>
  );
};

/* ---------- Liste (✓ / ✗) ---------- */
// data: { items: [{ text, ok?: boolean }] }

const Liste: React.FC<VisualProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const items = (data.items as { text: string; ok?: boolean }[]) ?? [];
  const step = Math.max(14, (durationInFrames * 0.55) / Math.max(1, items.length));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: 820 }}>
      {items.map((it, i) => {
        const at = 8 + i * step;
        const e = spring({ frame: frame - at, fps: 30, config: { damping: 16, stiffness: 140 } });
        const mark = interpolate(frame, [at + 8, at + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const color = it.ok ? C.lime : C.danger;
        return (
          <Card
            key={i}
            style={{
              padding: "30px 36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderColor: mark > 0.5 ? `${color}88` : C.border,
              opacity: e,
              transform: `translateX(${(1 - e) * -80}px)`,
            }}
          >
            <div style={{ fontSize: 44, fontWeight: 700 }}>{it.text}</div>
            {it.ok ? <Check size={64} progress={mark} /> : <Cross size={58} progress={mark} />}
          </Card>
        );
      })}
    </div>
  );
};

/* ---------- Zaman çizelgesi (gün içi) ---------- */
// data: { items: [{ time, text, tone? }] }

const Zaman: React.FC<VisualProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const items = (data.items as { time: string; text: string; tone?: string }[]) ?? [];
  const step = Math.max(14, (durationInFrames * 0.6) / Math.max(1, items.length));
  const line = interpolate(frame, [0, 8 + items.length * step], [0, 1], { extrapolateRight: "clamp" });
  const rowH = 190;
  return (
    <div style={{ position: "relative", width: 820, height: items.length * rowH }}>
      <div style={{ position: "absolute", left: 38, top: 30, width: 4, height: (items.length * rowH - 100) * line, backgroundColor: C.lime, opacity: 0.6 }} />
      {items.map((it, i) => {
        const e = spring({ frame: frame - (8 + i * step), fps: 30, config: { damping: 15, stiffness: 140 } });
        const color = toneColor(it.tone);
        return (
          <div key={i} style={{ position: "absolute", top: i * rowH, left: 0, right: 0, display: "flex", alignItems: "center", gap: 40, opacity: e, transform: `translateX(${(1 - e) * 60}px)` }}>
            <div style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.bg, border: `5px solid ${color}`, display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color }} />
            </div>
            <Card style={{ flex: 1, padding: "26px 32px" }}>
              <div style={{ fontFamily: monoFamily, fontSize: 24, letterSpacing: 5, color }}>{it.time}</div>
              <div style={{ fontSize: 40, fontWeight: 700, marginTop: 6 }}>{it.text}</div>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- Piramit (temelden tepeye) ---------- */
// data: { levels: [{ text, tone? }] } — ilk eleman en alttaki temel

const Piramit: React.FC<VisualProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const levels = (data.levels as { text: string; tone?: string }[]) ?? [];
  const h = 150;
  const gap = 14;
  return (
    <div style={{ display: "flex", flexDirection: "column-reverse", alignItems: "center", gap }}>
      {levels.map((l, i) => {
        const e = spring({ frame: frame - (6 + i * 9), fps: 30, config: { damping: 14, stiffness: 120 } });
        const w = 860 - i * (560 / Math.max(1, levels.length - 1));
        const color = toneColor(l.tone ?? (i === levels.length - 1 ? "warm" : "lime"));
        const top = i === levels.length - 1;
        return (
          <div
            key={i}
            style={{
              width: w,
              height: h,
              clipPath: top ? "polygon(50% 0, 100% 100%, 0 100%)" : "polygon(6% 0, 94% 0, 100% 100%, 0 100%)",
              background: top ? `linear-gradient(${color}, ${color}aa)` : `linear-gradient(${color}33, ${color}18)`,
              display: "flex",
              justifyContent: "center",
              alignItems: top ? "flex-end" : "center",
              paddingBottom: top ? 22 : 0,
              fontSize: top ? 34 : 42,
              fontWeight: 800,
              color: top ? "#000" : color,
              opacity: e,
              transform: `translateY(${(1 - e) * -60}px)`,
            }}
          >
            {l.text}
          </div>
        );
      })}
    </div>
  );
};

/* ---------- Kas lifleri: zorlanma (mikro yırtık) ve onarım ---------- */
// data: { phase: "yirtik" | "onarim" }

const FIBERS = Array.from({ length: 7 }, (_, i) => i);
const TEARS = Array.from({ length: 14 }, (_, i) => ({
  f: Math.floor(random(`tf${i}`) * 7),
  x: 120 + random(`tx${i}`) * 560,
}));

const Kas: React.FC<VisualProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const repair = data.phase === "onarim";
  const p = useProgress(0.05, 0.7);
  const tear = repair ? 1 - p : p;
  const grow = repair ? p : 0;
  const W = 820;
  const fiberH = 58 + 10 * grow;
  const gap = 14;
  const total = FIBERS.length * fiberH + (FIBERS.length - 1) * gap;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <svg width={W} height={total + 40} viewBox={`0 0 ${W} ${total + 40}`}>
        <defs>
          <linearGradient id="fiber" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ff8f8f" />
            <stop offset="50%" stopColor="#d9534f" />
            <stop offset="100%" stopColor="#8f2a2a" />
          </linearGradient>
        </defs>
        {FIBERS.map((f) => {
          const y = 20 + f * (fiberH + gap);
          const wob = Math.sin(frame / 6 + f) * (repair ? 0 : 2 * p);
          return (
            <g key={f} transform={`translate(0 ${wob})`}>
              <rect x={40} y={y} width={W - 80} height={fiberH} rx={fiberH / 2} fill="url(#fiber)" />
              {/* Lif çizgileri */}
              {[0.3, 0.55, 0.8].map((k) => (
                <line key={k} x1={70} x2={W - 70} y1={y + fiberH * k} y2={y + fiberH * k} stroke="rgba(255,255,255,0.18)" strokeWidth={2} />
              ))}
              {repair ? (
                <rect x={40} y={y} width={W - 80} height={fiberH} rx={fiberH / 2} fill="none" stroke={C.lime} strokeWidth={4} opacity={grow * 0.9} />
              ) : null}
            </g>
          );
        })}
        {TEARS.map((t, i) => {
          const y = 20 + t.f * (fiberH + gap) + fiberH / 2;
          const show = interpolate(tear, [i / TEARS.length, i / TEARS.length + 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <g key={i} opacity={show}>
              <path d={`M${t.x} ${y - 22} l10 14 l-12 10 l12 12`} stroke="#fff" strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={t.x} cy={y} r={30} fill={repair ? C.lime : C.warm} opacity={0.18} />
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 40, fontFamily: monoFamily, fontSize: 26, letterSpacing: 4 }}>
        <span style={{ color: repair ? C.lime : C.warm }}>{repair ? "ONARIM" : "MİKRO HASAR"}</span>
        <span style={{ color: C.muted }}>{Math.round((repair ? grow : tear) * 100)}%</span>
      </div>
    </div>
  );
};

/* ---------- Duruş figürü (yandan) ---------- */
// data: { mode: "boyun" | "omuz" }

const Figur: React.FC<VisualProps> = ({ data }) => {
  const p = useProgress(0.08, 0.7);
  const neck = data.mode === "boyun";
  // Baş öne eğildikçe boyna binen yük (yaklaşık, Hansraj 2014): 0° ≈ 5 kg, 60° ≈ 27 kg
  const angle = 60 * p;
  const kg = Math.round(5 + 22 * p);
  const hunch = neck ? 0.35 * p : 0.35 + 0.65 * p;
  const color = p > 0.5 ? C.danger : p > 0.2 ? C.warm : C.lime;

  // Omurga: kalçadan boyna eğri; kambur arttıkça kontrol noktası geriye kayar
  const hip = { x: 330, y: 560 };
  const neckBase = { x: 360 + 70 * hunch, y: 250 + 25 * hunch };
  const ctrl = { x: 300 - 60 * hunch, y: 400 };
  const headAngle = (neck ? angle : 20 + 25 * hunch) * (Math.PI / 180);
  const head = { x: neckBase.x + Math.sin(headAngle) * 95, y: neckBase.y - Math.cos(headAngle) * 95 };
  const shoulder = { x: neckBase.x + (neck ? 0 : 40 * hunch), y: neckBase.y + 40 };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <svg width={820} height={700} viewBox="0 0 820 700">
        {/* Masa, ekran ve sandalye */}
        <rect x={470} y={430} width={300} height={14} rx={7} fill="#3a3f47" />
        <rect x={720} y={444} width={12} height={220} fill="#2a2e35" />
        <rect x={620} y={250} width={130} height={170} rx={12} fill="#1b1f25" stroke="#3a3f47" strokeWidth={4} />
        <rect x={672} y={420} width={26} height={12} fill="#3a3f47" />
        <rect x={240} y={575} width={200} height={16} rx={8} fill="#3a3f47" />
        <rect x={236} y={420} width={14} height={170} rx={7} fill="#3a3f47" />
        <rect x={330} y={591} width={12} height={80} fill="#2a2e35" />
        {/* Bacaklar */}
        <path d={`M${hip.x} ${hip.y} L 520 565 L 520 670`} stroke="#5b616b" strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Gövde ve omurga */}
        <path d={`M${hip.x} ${hip.y} Q ${ctrl.x} ${ctrl.y} ${neckBase.x} ${neckBase.y}`} stroke="#5b616b" strokeWidth={70} strokeLinecap="round" fill="none" />
        <path d={`M${hip.x} ${hip.y} Q ${ctrl.x} ${ctrl.y} ${neckBase.x} ${neckBase.y}`} stroke={color} strokeWidth={8} strokeDasharray="2 16" strokeLinecap="round" fill="none" />
        {/* Kol: omuzdan klavyeye */}
        <path d={`M${shoulder.x} ${shoulder.y} L ${shoulder.x + 70} ${shoulder.y + 120} L 560 425`} stroke="#5b616b" strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Boyun ve baş */}
        <line x1={neckBase.x} y1={neckBase.y} x2={head.x} y2={head.y} stroke="#5b616b" strokeWidth={30} strokeLinecap="round" />
        <circle cx={head.x + Math.sin(headAngle) * 20} cy={head.y - Math.cos(headAngle) * 20} r={62} fill="#6b717b" />
        {/* Ağırlık oku */}
        {neck ? (
          <g opacity={0.4 + 0.6 * p}>
            <line x1={head.x + 20} y1={head.y + 70} x2={head.x + 20} y2={head.y + 70 + 40 + 80 * p} stroke={color} strokeWidth={8} />
            <path d={`M${head.x} ${head.y + 100 + 80 * p} l20 30 l20 -30 z`} fill={color} />
          </g>
        ) : (
          <circle cx={ctrl.x + 40} cy={ctrl.y - 10} r={60 + 30 * p} fill={color} opacity={0.12 + 0.12 * p} />
        )}
      </svg>
      <div style={{ display: "flex", gap: 24 }}>
        {neck ? (
          <>
            <Card style={{ padding: "18px 34px", borderColor: color }}>
              <div style={{ fontFamily: monoFamily, fontSize: 22, letterSpacing: 4, color: C.muted }}>EĞİM</div>
              <div style={{ fontSize: 56, fontWeight: 900, color }}>{Math.round(angle)}°</div>
            </Card>
            <Card style={{ padding: "18px 34px", borderColor: color }}>
              <div style={{ fontFamily: monoFamily, fontSize: 22, letterSpacing: 4, color: C.muted }}>BOYNA YÜK</div>
              <div style={{ fontSize: 56, fontWeight: 900, color }}>~{kg} kg</div>
            </Card>
          </>
        ) : (
          <Card style={{ padding: "18px 34px", borderColor: color }}>
            <div style={{ fontFamily: monoFamily, fontSize: 22, letterSpacing: 4, color: C.muted }}>OTURMA SÜRESİ</div>
            <div style={{ fontSize: 56, fontWeight: 900, color }}>{Math.round(1 + 9 * p)} saat</div>
          </Card>
        )}
      </div>
    </div>
  );
};

/* ---------- Büyük sayı sayacı ---------- */
// data: { from?, to, decimals?, prefix?, suffix?, label? }

const fmt = (v: number, decimals: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const Sayi: React.FC<VisualProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const from = (data.from as number) ?? 0;
  const to = (data.to as number) ?? 0;
  const decimals = (data.decimals as number) ?? 0;
  const v = interpolate(frame, [6, 45], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const e = useEnter(0, 14);
  const glow = interpolate(frame, [40, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36, opacity: e, transform: `scale(${0.85 + 0.15 * e})` }}>
      <div
        style={{
          fontSize: 210,
          fontWeight: 900,
          letterSpacing: -6,
          color: C.lime,
          lineHeight: 1,
          textShadow: `0 0 ${60 * glow}px rgba(200,232,90,0.45)`,
          whiteSpace: "nowrap",
        }}
      >
        {(data.prefix as string) ?? ""}
        {fmt(v, decimals)}
        <span style={{ fontSize: 110, letterSpacing: -2 }}>{(data.suffix as string) ?? ""}</span>
      </div>
      {data.label ? (
        <div style={{ padding: "16px 30px", borderRadius: 14, border: `2px solid ${C.border}`, backgroundColor: C.card, fontFamily: monoFamily, fontSize: 26, letterSpacing: 4, color: C.muted, textAlign: "center", maxWidth: 820 }}>
          {data.label as string}
        </div>
      ) : null}
    </div>
  );
};

/* ---------- Halka grafik ---------- */
// data: { segments: [{ label, value (yüzde), tone? }] }

const Halka: React.FC<VisualProps> = ({ data }) => {
  const segs = (data.segments as { label: string; value: number; tone?: string }[]) ?? [];
  const p = useProgress(0.04, 0.5);
  const R = 250;
  const L = 2 * Math.PI * R;
  let acc = 0;
  const main = segs[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
      <div style={{ position: "relative", width: 620, height: 620 }}>
        <svg width={620} height={620} viewBox="0 0 620 620" style={{ transform: "rotate(-90deg)" }}>
          <circle cx={310} cy={310} r={R} fill="none" stroke={C.border} strokeWidth={70} />
          {segs.map((sg, i) => {
            const len = (sg.value / 100) * L * p;
            const off = acc;
            acc += (sg.value / 100) * L * p;
            return (
              <circle key={i} cx={310} cy={310} r={R} fill="none" stroke={toneColor(sg.tone ?? (i === 0 ? "lime" : "teal"))} strokeWidth={70} strokeDasharray={`${Math.max(0, len - 6)} ${L}`} strokeDashoffset={-off} />
            );
          })}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontSize: 150, fontWeight: 900, color: C.lime, lineHeight: 1 }}>%{Math.round((main?.value ?? 0) * p)}</div>
          <div style={{ fontSize: 34, fontWeight: 700, color: C.muted, marginTop: 10 }}>{main?.label}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 30 }}>
        {segs.map((sg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 32, fontWeight: 700 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: toneColor(sg.tone ?? (i === 0 ? "lime" : "teal")) }} />
            {sg.label} %{sg.value}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- Parçacık akışı (ör. nefesle çıkan CO₂) ---------- */
// data: { center, particle }

const PARTICLES = Array.from({ length: 26 }, (_, i) => ({
  x: (random(`px${i}`) - 0.5) * 520,
  delay: random(`pd${i}`) * 90,
  speed: 4 + random(`ps${i}`) * 4,
  size: 0.7 + random(`pz${i}`) * 0.6,
}));

const Parcacik: React.FC<VisualProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const e = useEnter(0, 14);
  const breathe = 1 + Math.sin(frame / 12) * 0.06;
  return (
    <div style={{ position: "relative", width: 900, height: 860 }}>
      {PARTICLES.map((pt, i) => {
        const t = (frame - pt.delay) * pt.speed;
        if (t < 0) return null;
        const y = 560 - (t % 620);
        const o = interpolate(y, [-60, 120, 480, 560], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 450 + pt.x + Math.sin((frame + i * 20) / 15) * 20 - 60,
              top: y,
              width: 120 * pt.size,
              height: 120 * pt.size,
              borderRadius: "50%",
              border: `3px solid ${C.lime}`,
              backgroundColor: "rgba(200,232,90,0.10)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 34 * pt.size,
              fontWeight: 800,
              color: C.lime,
              opacity: o * e,
            }}
          >
            {(data.particle as string) ?? "CO₂"}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 450 - 170,
          top: 620,
          width: 340,
          height: 200,
          borderRadius: 100,
          backgroundColor: C.card,
          border: `3px solid ${C.lime}`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: monoFamily,
          fontSize: 32,
          letterSpacing: 6,
          color: C.text,
          transform: `scale(${breathe * e})`,
          boxShadow: "0 0 80px rgba(200,232,90,0.25)",
        }}
      >
        {(data.center as string) ?? ""}
      </div>
    </div>
  );
};

/* ---------- Karşılaştırma: iki kart ---------- */
// data: { left: { label, value, tone? }, right: { label, value, tone? }, sign?: "→" | "vs" | "=" }

const Vs: React.FC<VisualProps> = ({ data }) => {
  const left = data.left as { label: string; value: string; tone?: string };
  const right = data.right as { label: string; value: string; tone?: string };
  const a = useEnter(2);
  const b = useEnter(18);
  const sign = useEnter(12, 10);
  const card = (it: { label: string; value: string; tone?: string }, e: number, dir: number) => (
    <Card style={{ width: 380, height: 420, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 24, borderColor: `${toneColor(it.tone ?? (dir > 0 ? "lime" : "muted"))}88`, opacity: e, transform: `translateX(${(1 - e) * 120 * dir}px)` }}>
      <div style={{ fontSize: it.value.length > 6 ? 76 : 96, fontWeight: 900, color: toneColor(it.tone ?? (dir > 0 ? "lime" : "muted")), whiteSpace: "nowrap" }}>{it.value}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: C.muted, textAlign: "center", padding: "0 20px" }}>{it.label}</div>
    </Card>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {card(left, a, -1)}
      <div style={{ width: 140, textAlign: "center", fontSize: 56, fontWeight: 900, color: C.lime, transform: `scale(${sign})` }}>{(data.sign as string) ?? "→"}</div>
      {card(right, b, 1)}
    </div>
  );
};

/* ---------- Termometre ---------- */
// data: { from, to, unit?, label? }

const Termometre: React.FC<VisualProps> = ({ data }) => {
  const from = (data.from as number) ?? 0;
  const to = (data.to as number) ?? 1;
  const p = useProgress(0.05, 0.6);
  const v = from + (to - from) * p;
  const color = p < 0.4 ? C.teal : p < 0.75 ? C.warm : C.danger;
  const H = 560;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 70 }}>
      <svg width={200} height={760} viewBox="0 0 200 760">
        <rect x={60} y={20} width={80} height={H + 60} rx={40} fill={C.card} stroke={C.border} strokeWidth={4} />
        <rect x={78} y={40 + H * (1 - (0.15 + 0.85 * p))} width={44} height={H * (0.15 + 0.85 * p) + 40} rx={22} fill={color} />
        <circle cx={100} cy={660} r={80} fill={C.card} stroke={C.border} strokeWidth={4} />
        <circle cx={100} cy={660} r={58} fill={color} />
        {[0, 1, 2, 3, 4].map((k) => (
          <line key={k} x1={150} x2={175} y1={60 + (H / 4) * k} y2={60 + (H / 4) * k} stroke={C.muted} strokeWidth={4} />
        ))}
      </svg>
      <div>
        <div style={{ fontSize: 150, fontWeight: 900, color, lineHeight: 1 }}>
          {fmt(v, 1)}
          <span style={{ fontSize: 80 }}>{(data.unit as string) ?? "°C"}</span>
        </div>
        {data.label ? <div style={{ fontFamily: monoFamily, fontSize: 28, letterSpacing: 5, color: C.muted, marginTop: 20 }}>{data.label as string}</div> : null}
      </div>
    </div>
  );
};

/* ---------- Vücut silüeti: yağın her yerden azalması ---------- */
// data: { mode: "tum" | "bolge" } — bolge: karın işaretli ama yağ yine her yerden gidiyor

const FAT = Array.from({ length: 46 }, (_, i) => {
  // Silüetin içine düşen rastgele noktalar
  const zones = [
    { x: 300, y: 120, w: 70, h: 60 },
    { x: 220, y: 230, w: 230, h: 330 },
    { x: 140, y: 240, w: 60, h: 260 },
    { x: 470, y: 240, w: 60, h: 260 },
    { x: 230, y: 580, w: 90, h: 330 },
    { x: 350, y: 580, w: 90, h: 330 },
  ];
  const z = zones[i % zones.length];
  return { x: z.x + random(`fx${i}`) * z.w, y: z.y + random(`fy${i}`) * z.h, r: 10 + random(`fr${i}`) * 10, belly: i % zones.length === 1 && random(`fy${i}`) > 0.4 };
});

const Vucut: React.FC<VisualProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const p = useProgress(0.15, 0.85);
  const bolge = data.mode === "bolge";
  const mark = useEnter(6, 12);
  const body = "#2a2e35";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <svg width={670} height={820} viewBox="0 0 670 950">
        <circle cx={335} cy={110} r={75} fill={body} />
        <rect x={290} y={175} width={90} height={50} fill={body} />
        <rect x={210} y={215} width={250} height={370} rx={70} fill={body} />
        <rect x={130} y={230} width={75} height={300} rx={37} fill={body} />
        <rect x={465} y={230} width={75} height={300} rx={37} fill={body} />
        <rect x={220} y={560} width={105} height={370} rx={50} fill={body} />
        <rect x={345} y={560} width={105} height={370} rx={50} fill={body} />
        {FAT.map((f, i) => {
          // Her noktanın sönme zamanı rastgele: yağ her bölgeden aynı anda azalır
          const k = random(`fk${i}`) * 0.7;
          // Tamamen yok olmaz: her bölgede eşit şekilde azalır
          const o = interpolate(p, [k, k + 0.3], [1, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return <circle key={i} cx={f.x} cy={f.y + Math.sin(frame / 10 + i) * 2} r={f.r * (0.5 + 0.5 * o)} fill={C.warm} opacity={0.75 * o} />;
        })}
        {bolge ? (
          <g opacity={mark}>
            <ellipse cx={335} cy={430} rx={110} ry={90} fill="none" stroke={C.lime} strokeWidth={6} strokeDasharray="16 12" />
            <text x={335} y={545} fill={C.lime} fontSize={30} fontWeight={800} textAnchor="middle" fontFamily={interFamily}>
              MEKİK
            </text>
          </g>
        ) : null}
      </svg>
      <div style={{ display: "flex", gap: 24, fontFamily: monoFamily, fontSize: 26, letterSpacing: 4 }}>
        <span style={{ color: C.warm }}>● YAĞ</span>
        <span style={{ color: C.muted }}>{Math.round(100 - 70 * p)}%</span>
      </div>
    </div>
  );
};

/* ---------- Kas çekirdekleri: büyürken eklenir, küçülünce kalır ---------- */
// data: { phase: "buyume" | "kuculme" }

const NUCLEI = Array.from({ length: 5 }, (_, f) =>
  Array.from({ length: 6 }, (_, k) => ({ x: 110 + k * 120 + random(`nx${f}${k}`) * 50, extra: k % 2 === 1 })),
);

const Cekirdek: React.FC<VisualProps> = ({ data }) => {
  const p = useProgress(0.05, 0.7);
  const shrink = data.phase === "kuculme";
  const size = shrink ? 1 - 0.4 * p : 0.65 + 0.35 * p;
  const W = 820;
  const fiberH = 110 * size;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <svg width={W} height={640} viewBox={`0 0 ${W} 640`}>
        <defs>
          <linearGradient id="fib2" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ff8f8f" />
            <stop offset="50%" stopColor="#d9534f" />
            <stop offset="100%" stopColor="#8f2a2a" />
          </linearGradient>
        </defs>
        {NUCLEI.map((row, f) => {
          const cy = 64 + f * 128;
          return (
            <g key={f}>
              <rect x={40} y={cy - fiberH / 2} width={W - 80} height={fiberH} rx={fiberH / 2} fill="url(#fib2)" />
              {row.map((n, k) => {
                // Büyürken yeni çekirdekler belirir; küçülürken hepsi yerinde kalır
                const show = shrink || !n.extra ? 1 : interpolate(p, [0.2 + k * 0.08, 0.35 + k * 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                return <circle key={k} cx={n.x} cy={cy} r={15 * show} fill={C.lime} stroke="#000" strokeWidth={3} opacity={show} />;
              })}
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 40, fontFamily: monoFamily, fontSize: 26, letterSpacing: 4 }}>
        <span style={{ color: C.lime }}>● ÇEKİRDEK</span>
        <span style={{ color: C.muted }}>KAS BOYUTU {Math.round(size * 100)}%</span>
      </div>
    </div>
  );
};

const VISUALS: Record<string, React.FC<VisualProps>> = {
  sayi: Sayi,
  halka: Halka,
  parcacik: Parcacik,
  vs: Vs,
  termometre: Termometre,
  vucut: Vucut,
  cekirdek: Cekirdek,
  soru: Soru,
  kapanis: Kapanis,
  cizgi: Cizgi,
  takvim: Takvim,
  bar: Bar,
  seri: Seri,
  mesaj: Mesaj,
  liste: Liste,
  zaman: Zaman,
  piramit: Piramit,
  kas: Kas,
  figur: Figur,
};
