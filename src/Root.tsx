import { Composition, staticFile } from "remotion";
import { VIDEO } from "./brand";
import { posts } from "./posts";
import { Reel, sceneDurations, type ReelProps } from "./Reel";
import type { PostVoiceover } from "./types";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {posts.map((post) => (
        <Composition
          key={post.id}
          id={post.id}
          component={Reel}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          durationInFrames={1}
          defaultProps={{ post, voiceover: null } as ReelProps}
          calculateMetadata={async ({ props }) => {
            const res = await fetch(staticFile(`voiceover/${props.post.id}/manifest.json`)).catch(
              () => null,
            );
            const voiceover = res?.ok ? ((await res.json()) as PostVoiceover) : null;
            const total = sceneDurations(props.post, voiceover, VIDEO.fps).reduce((a, b) => a + b, 0);
            return { props: { ...props, voiceover }, durationInFrames: total };
          }}
        />
      ))}
    </>
  );
};
