import { useCurrentFrame, useVideoConfig } from "remotion";
import { VIDEO } from "./brand";
import type { PostVoiceover, SceneAudio, WordTiming } from "./types";

type Voiced = { scenes: { voice: string; lead?: number; hold?: number; intro?: { voice: string } }[]; padding?: number; speed?: number };

// Instagram arayüzünün (alt açıklama, sağ butonlar) kapattığı alanlar
export const SAFE = { top: 220, bottom: 420, side: 90 };

// Manifestteki ses, sahnenin güncel metniyle eşleşmiyorsa kullanılmaz (eski ses).
export const audioFor = (item: Voiced, vo: PostVoiceover | null, i: number): SceneAudio | null => {
  const a = vo?.scenes[i];
  return a && a.voice === item.scenes[i].voice ? a : null;
};

// Ses yokken metnin okunma süresi tahmini (Türkçe seslendirme ~14 karakter/sn)
// speed: seslendirme sonradan hızlandırılacaksa (ör. 1.2) sessiz önizleme de o hızda akar
const estimateSeconds = (voice: string, speed = 1) => Math.max(VIDEO.fallbackSeconds, voice.length / 14 / speed);

// Sahnenin başındaki kanca sesi (intro); metni değiştiyse eski ses kullanılmaz
export const introFor = (item: Voiced, vo: PostVoiceover | null, i: number) => {
  const want = item.scenes[i].intro;
  const a = vo?.scenes[i]?.intro;
  return want && a && a.voice === want.voice ? a : null;
};
// Asıl ses başlamadan önceki süre: sessiz açılış (lead) + varsa kanca sesi ve kısa bir nefes
export const leadSeconds = (item: Voiced, vo: PostVoiceover | null, i: number) => {
  const s = item.scenes[i];
  const intro = s.intro ? (introFor(item, vo, i)?.durationInSeconds ?? estimateSeconds(s.intro.voice)) + 0.2 : 0;
  return (s.lead ?? 0) + intro;
};
export const introWords = (item: Voiced, vo: PostVoiceover | null, i: number): WordTiming[] => {
  const s = item.scenes[i];
  return s.intro ? wordsFor(s.intro.voice, introFor(item, vo, i)) : [];
};

export const sceneDurations = (item: Voiced, vo: PostVoiceover | null, fps: number) =>
  item.scenes.map((s, i) => {
    const seconds = audioFor(item, vo, i)?.durationInSeconds ?? estimateSeconds(s.voice, item.speed);
    return Math.ceil((leadSeconds(item, vo, i) + seconds + (s.hold ?? 0) + (item.padding ?? VIDEO.paddingSeconds)) * fps);
  });

// Ses yokken kelime zamanlamalarını kelime uzunluğuna göre tahmin eder (sessiz önizleme için)
export const wordsFor = (voice: string, audio: { words: WordTiming[] } | null, speed = 1): WordTiming[] => {
  if (audio) return audio.words;
  const words = voice.split(/\s+/).filter(Boolean);
  const total = estimateSeconds(voice, speed);
  const weight = words.reduce((a, w) => a + w.length + 1, 0);
  let t = 0;
  return words.map((word) => {
    const d = ((word.length + 1) / weight) * total;
    const w = { word, start: t, end: t + d * 0.9 };
    t += d;
    return w;
  });
};

export const useSeconds = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

// Seslendirme alt yazı olarak 3'erli kelime gruplarıyla gösterilir
// (Instagram'da videoların çoğu sessiz izlenir)
export const Subtitles: React.FC<{ words: WordTiming[]; accent: string; bottom?: number; boxed?: boolean }> = ({
  words,
  accent,
  bottom = SAFE.bottom,
  // Arkasında görsel olan yerlerde okunabilirlik için koyu kutu
  boxed = false,
}) => {
  const t = useSeconds();
  const chunks: WordTiming[][] = [];
  for (let i = 0; i < words.length; i += 3) chunks.push(words.slice(i, i + 3));
  const current = chunks.findLast((c) => t >= c[0].start) ?? chunks[0];
  if (!current) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom,
        left: SAFE.side,
        right: SAFE.side,
        textAlign: "center",
        fontSize: 56,
        fontWeight: 800,
        textShadow: "0 4px 16px rgba(0,0,0,0.7)",
      }}
    >
      <span
        style={
          boxed
            ? { backgroundColor: "rgba(0,0,0,0.82)", padding: "10px 26px", borderRadius: 18, boxDecorationBreak: "clone" }
            : undefined
        }
      >
        {current.map((w, i) => (
          <span key={i} style={{ color: t >= w.start && t <= w.end ? accent : undefined }}>
            {i > 0 ? " " : ""}
            {w.word}
          </span>
        ))}
      </span>
    </div>
  );
};

export const ProgressBar: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: 14,
        width: `${(frame / Math.max(1, durationInFrames - 1)) * 100}%`,
        backgroundColor: color,
      }}
    />
  );
};
