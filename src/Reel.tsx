import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand, VIDEO } from "./brand";
import { fontFamily } from "./fonts";
import type { Post, PostVoiceover, Scene, SceneAudio, WordTiming } from "./types";

// Instagram arayüzünün (alt açıklama, sağ butonlar) kapattığı alanlar
const SAFE = { top: 220, bottom: 420, side: 90 };

export type ReelProps = { post: Post; voiceover: PostVoiceover | null };

// Manifestteki ses, sahnenin güncel metniyle eşleşmiyorsa kullanılmaz (eski ses).
export const audioFor = (post: Post, vo: PostVoiceover | null, i: number): SceneAudio | null => {
  const a = vo?.scenes[i];
  return a && a.voice === post.scenes[i].voice ? a : null;
};

export const sceneDurations = (post: Post, vo: PostVoiceover | null, fps: number) =>
  post.scenes.map((_, i) => {
    const a = audioFor(post, vo, i);
    return Math.ceil(((a?.durationInSeconds ?? VIDEO.fallbackSeconds) + VIDEO.paddingSeconds) * fps);
  });

export const Reel: React.FC<ReelProps> = ({ post, voiceover }) => {
  const { fps } = useVideoConfig();
  const durations = sceneDurations(post, voiceover, fps);
  let from = 0;
  let pointNo = 0;

  return (
    <AbsoluteFill style={{ fontFamily, color: brand.colors.text }}>
      <Background />
      {post.scenes.map((scene, i) => {
        const start = from;
        from += durations[i];
        if (scene.type === "point") pointNo++;
        const audio = audioFor(post, voiceover, i);
        return (
          <Sequence key={i} from={start} durationInFrames={durations[i]} name={`${i + 1}-${scene.type}`}>
            <SceneView scene={scene} number={pointNo} words={audio?.words ?? null} />
            {audio ? <Audio src={staticFile(audio.file)} /> : null}
          </Sequence>
        );
      })}
      {brand.music ? <Audio src={staticFile(brand.music)} volume={brand.musicVolume} loop /> : null}
      <ProgressBar />
    </AbsoluteFill>
  );
};

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const angle = 160 + Math.sin(frame / 60) * 15;
  return (
    <AbsoluteFill
      style={{ background: `linear-gradient(${angle}deg, ${brand.colors.bgFrom}, ${brand.colors.bgTo})` }}
    />
  );
};

// İzleyicinin videonun ne kadarının kaldığını görmesi izlenme süresini artırır
const ProgressBar: React.FC = () => {
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
        backgroundColor: brand.colors.accent,
      }}
    />
  );
};

const SceneView: React.FC<{ scene: Scene; number: number; words: WordTiming[] | null }> = ({
  scene,
  number,
  words,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 160 } });
  const headline = scene.display ?? null;

  const label =
    scene.type === "point" ? (
      <Badge color={brand.colors.accent}>{number}</Badge>
    ) : scene.type === "myth" ? (
      <Badge color={brand.colors.myth}>MİT</Badge>
    ) : scene.type === "fact" ? (
      <Badge color={brand.colors.fact}>GERÇEK</Badge>
    ) : null;

  const size = scene.type === "hook" ? 104 : 84;

  return (
    <AbsoluteFill
      style={{
        padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
        justifyContent: "center",
        alignItems: "center",
        gap: 48,
        textAlign: "center",
      }}
    >
      <div style={{ transform: `scale(${enter})` }}>{label}</div>
      <div
        style={{
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1.15,
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [60, 0])}px)`,
          textDecoration: scene.type === "myth" ? `line-through ${brand.colors.myth}` : undefined,
          textDecorationThickness: 6,
        }}
      >
        {headline ?? (words ? <Karaoke words={words} /> : scene.voice)}
      </div>
      {scene.type === "cta" ? <CtaFooter /> : null}
      {headline && words ? <Subtitles words={words} /> : null}
    </AbsoluteFill>
  );
};

const Badge: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <div
    style={{
      backgroundColor: color,
      color: brand.colors.bgFrom,
      fontSize: 64,
      fontWeight: 900,
      padding: "12px 44px",
      borderRadius: 999,
    }}
  >
    {children}
  </div>
);

const CtaFooter: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ fontSize: 96, fontWeight: 900, color: brand.colors.accent }}>{brand.appName}</div>
    <div style={{ fontSize: 44, fontWeight: 600 }}>{brand.ctaLine}</div>
    <div style={{ fontSize: 44, fontWeight: 600, opacity: 0.7 }}>{brand.handle}</div>
  </div>
);

const useSeconds = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

// Ekran metni yoksa: seslendirme metni, söylenen kelime vurgulanarak gösterilir
const Karaoke: React.FC<{ words: WordTiming[] }> = ({ words }) => {
  const t = useSeconds();
  return (
    <>
      {words.map((w, i) => (
        <span
          key={i}
          style={{
            opacity: t >= w.start ? 1 : 0.3,
            color: t >= w.start && t <= w.end ? brand.colors.accent : undefined,
          }}
        >
          {w.word}{" "}
        </span>
      ))}
    </>
  );
};

// Ekran metni varsa: seslendirme alt yazı olarak 3'erli kelime gruplarıyla gösterilir
// (Instagram'da videoların çoğu sessiz izlenir)
const Subtitles: React.FC<{ words: WordTiming[] }> = ({ words }) => {
  const t = useSeconds();
  const chunks: WordTiming[][] = [];
  for (let i = 0; i < words.length; i += 3) chunks.push(words.slice(i, i + 3));
  const current = chunks.findLast((c) => t >= c[0].start) ?? chunks[0];
  if (!current) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: SAFE.bottom,
        left: SAFE.side,
        right: SAFE.side,
        fontSize: 56,
        fontWeight: 800,
        textShadow: "0 4px 16px rgba(0,0,0,0.6)",
      }}
    >
      {current.map((w, i) => (
        <span key={i} style={{ color: t >= w.start && t <= w.end ? brand.colors.accent : undefined }}>
          {w.word}{" "}
        </span>
      ))}
    </div>
  );
};
