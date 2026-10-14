import { Composition, staticFile } from "remotion";
import { VIDEO } from "./brand";
import { posts, promos, stories } from "./posts";
import { PromoVideo, type PromoProps } from "./promo/Promo";
import { Reel, type ReelProps } from "./Reel";
import { sceneDurations } from "./shared";
import { StoryVideo, type StoryProps } from "./stories/Story";
import type { PostVoiceover } from "./types";

const loadVoiceover = async (id: string): Promise<PostVoiceover | null> => {
  const res = await fetch(staticFile(`voiceover/${id}/manifest.json`)).catch(() => null);
  return res?.ok ? ((await res.json()) as PostVoiceover) : null;
};

const total = (item: { scenes: { voice: string }[] }, vo: PostVoiceover | null) =>
  sceneDurations(item, vo, VIDEO.fps).reduce((a, b) => a + b, 0);

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
            const voiceover = await loadVoiceover(props.post.id);
            return { props: { ...props, voiceover }, durationInFrames: total(props.post, voiceover) };
          }}
        />
      ))}
      {stories.map((story) => (
        <Composition
          key={story.id}
          id={story.id}
          component={StoryVideo}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          durationInFrames={1}
          defaultProps={{ story, voiceover: null } as StoryProps}
          calculateMetadata={async ({ props }) => {
            const voiceover = await loadVoiceover(props.story.id);
            return { props: { ...props, voiceover }, durationInFrames: total(props.story, voiceover) };
          }}
        />
      ))}
      {promos.map((promo) => (
        <Composition
          key={promo.id}
          id={promo.id}
          component={PromoVideo}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          durationInFrames={1}
          defaultProps={{ promo, voiceover: null } as PromoProps}
          calculateMetadata={async ({ props }) => {
            const voiceover = await loadVoiceover(props.promo.id);
            return { props: { ...props, voiceover }, durationInFrames: total(props.promo, voiceover) };
          }}
        />
      ))}
    </>
  );
};
