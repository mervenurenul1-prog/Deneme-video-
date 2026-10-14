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
import { brand } from "./brand";
import { fontFamily } from "./fonts";
import { audioFor, ProgressBar, SAFE, sceneDurations, Subtitles, useSeconds, wordsFor } from "./shared";
import type { Post, PostVoiceover, Scene, WordTiming } from "./types";

export type ReelProps = { post: Post; voiceover: PostVoiceover | null };

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
            <SceneView scene={scene} number={pointNo} words={wordsFor(scene.voice, audio)} />
            {audio ? <Audio src={staticFile(audio.file)} /> : null}
          </Sequence>
        );
      })}
      {brand.music ? <Audio src={staticFile(brand.music)} volume={brand.musicVolume} loop /> : null}
      <ProgressBar color={brand.colors.accent} />
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

const SceneView: React.FC<{ scene: Scene; number: number; words: WordTiming[] }> = ({
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
        {headline ?? <Karaoke words={words} />}
      </div>
      {scene.type === "cta" ? <CtaFooter /> : null}
      {headline && words ? <Subtitles words={words} accent={brand.colors.accent} /> : null}
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
