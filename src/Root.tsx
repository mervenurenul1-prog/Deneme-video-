import { Composition, staticFile } from "remotion";
import { Main, type MainProps } from "./Main";
import type { VoiceoverManifest } from "./scenes";

const FPS = 30;
// Her sahnenin sonunda sesten sonra bırakılan boşluk
const PADDING_SECONDS = 0.5;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Main"
      component={Main}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={FPS * 10}
      defaultProps={{ manifest: null } as MainProps}
      calculateMetadata={async ({ props }) => {
        // Seslendirme henüz üretilmediyse sessiz önizleme göster
        const res = await fetch(staticFile("voiceover/manifest.json")).catch(() => null);
        if (!res?.ok) return { props };

        const manifest = (await res.json()) as VoiceoverManifest;
        const totalSeconds = Object.values(manifest).reduce(
          (sum, s) => sum + s.durationInSeconds + PADDING_SECONDS,
          0,
        );
        return {
          props: { ...props, manifest },
          durationInFrames: Math.max(1, Math.ceil(totalSeconds * FPS)),
        };
      }}
    />
  );
};
