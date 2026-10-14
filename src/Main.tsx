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
import { scenes, type Scene, type VoiceoverManifest, type WordTiming } from "./scenes";

export type MainProps = { manifest: VoiceoverManifest | null };

const PADDING_SECONDS = 0.5;
const FALLBACK_SECONDS = 3;

export const Main: React.FC<MainProps> = ({ manifest }) => {
  const { fps } = useVideoConfig();
  let from = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {scenes.map((scene) => {
        const vo = manifest?.[scene.id];
        const seconds = (vo?.durationInSeconds ?? FALLBACK_SECONDS) + PADDING_SECONDS;
        const duration = Math.ceil(seconds * fps);
        const start = from;
        from += duration;
        return (
          <Sequence key={scene.id} from={start} durationInFrames={duration} name={scene.id}>
            <SceneView scene={scene} words={vo?.words ?? null} />
            {vo ? <Audio src={staticFile(vo.file)} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const SceneView: React.FC<{ scene: Scene; words: WordTiming[] | null }> = ({ scene, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const enter = spring({ frame, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: scene.background,
        justifyContent: "center",
        alignItems: "center",
        padding: 120,
      }}
    >
      <div
        style={{
          color: "white",
          fontFamily: "Inter, Helvetica, Arial, sans-serif",
          fontSize: 80,
          fontWeight: 700,
          lineHeight: 1.3,
          textAlign: "center",
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px)`,
        }}
      >
        {words
          ? words.map((w, i) => (
              // Söylenen kelime vurgulanır, henüz söylenmeyenler soluk kalır
              <span
                key={i}
                style={{
                  opacity: t >= w.start ? 1 : 0.35,
                  color: t >= w.start && t <= w.end ? "#facc15" : "white",
                }}
              >
                {w.word}{" "}
              </span>
            ))
          : scene.text}
      </div>
    </AbsoluteFill>
  );
};
