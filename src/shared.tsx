import { useCurrentFrame, useVideoConfig } from "remotion";
import { VIDEO } from "./brand";
import type { PostVoiceover, SceneAudio, WordTiming } from "./types";

type Voiced = { scenes: { voice: string }[]; padding?: number };

// Instagram arayüzünün (alt açıklama, sağ butonlar) kapattığı alanlar
export const SAFE = { top: 220, bottom: 420, side: 90 };

// Manifestteki ses, sahnenin güncel metniyle eşleşmiyorsa kullanılmaz (eski ses).
export const audioFor = (item: Voiced, vo: PostVoiceover | null, i: number): SceneAudio | null => {
  const a = vo?.scenes[i];
  return a && a.voice === item.scenes[i].voice ? a : null;
};

// Ses yokken metnin okunma süresi tahmini (Türkçe seslendirme ~14 karakter/sn)
const estimateSeconds = (voice: string) => Math.max(VIDEO.fallbackSeconds, voice.length / 14);

export const sceneDurations = (item: Voiced, vo: PostVoiceover | null, fps: number) =>
  item.scenes.map((s, i) => {
    const seconds = audioFor(item, vo, i)?.durationInSeconds ?? estimateSeconds(s.voice);
    return Math.ceil((seconds + (item.padding ?? VIDEO.paddingSeconds)) * fps);
  });

// Ses yokken kelime zamanlamalarını kelime uzunluğuna göre tahmin eder (sessiz önizleme için)
export const wordsFor = (voice: string, audio: SceneAudio | null): WordTiming[] => {
  if (audio) return audio.words;
  const words = voice.split(/\s+/).filter(Boolean);
  const total = estimateSeconds(voice);
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
