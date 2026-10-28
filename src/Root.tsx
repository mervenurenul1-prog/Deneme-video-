import { Composition, staticFile } from "remotion";
import { VIDEO } from "./brand";
import { ExplainerVideo, type ExplainerProps } from "./explainer/Explainer";
import { Deneme3D } from "./deneme3d/Deneme3D";
import { HeroCinema, HeroSheet } from "./avatar2/Hero";
import { CizimVideo, type CizimProps } from "./cizim/Cizim";
import { Cizim1Video, type Cizim1Props } from "./cizim1/Cizim1";
import { cizimler, cizimler1, explainers, posts, promos, stories, ucler } from "./posts";
import { UcVideo, type UcProps } from "./uc/Uc";
import { PromoVideo, type PromoProps } from "./promo/Promo";
import { Reel, type ReelProps } from "./Reel";
import { sceneDurations } from "./shared";
import { StoryVideo, type StoryProps } from "./stories/Story";
import type { PostVoiceover } from "./types";

const loadVoiceover = async (id: string): Promise<PostVoiceover | null> => {
  const res = await fetch(staticFile(`voiceover/${id}/manifest.json`)).catch(() => null);
  return res?.ok ? ((await res.json()) as PostVoiceover) : null;
};

const total = (item: { scenes: { voice: string; lead?: number; intro?: { voice: string } }[] }, vo: PostVoiceover | null) =>
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
      {explainers.map((explainer) => (
        <Composition
          key={explainer.id}
          id={explainer.id}
          component={ExplainerVideo}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          durationInFrames={1}
          defaultProps={{ explainer, voiceover: null } as ExplainerProps}
          calculateMetadata={async ({ props }) => {
            const voiceover = await loadVoiceover(props.explainer.id);
            return { props: { ...props, voiceover }, durationInFrames: total(props.explainer, voiceover) };
          }}
        />
      ))}
      {cizimler.map((cizim) => (
        <Composition
          key={cizim.id}
          id={cizim.id}
          component={CizimVideo}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          durationInFrames={1}
          defaultProps={{ cizim, voiceover: null } as CizimProps}
          calculateMetadata={async ({ props }) => {
            const voiceover = await loadVoiceover(props.cizim.id);
            return { props: { ...props, voiceover }, durationInFrames: total(props.cizim, voiceover) };
          }}
        />
      ))}
      {cizimler1.map((cizim) => (
        <Composition
          key={cizim.id}
          id={cizim.id}
          component={Cizim1Video}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          durationInFrames={1}
          defaultProps={{ cizim, voiceover: null } as Cizim1Props}
          calculateMetadata={async ({ props }) => {
            const voiceover = await loadVoiceover(props.cizim.id);
            return { props: { ...props, voiceover }, durationInFrames: total(props.cizim, voiceover) };
          }}
        />
      ))}
      {ucler.map((uc) => (
        <Composition
          key={uc.id}
          id={uc.id}
          component={UcVideo}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          durationInFrames={1}
          defaultProps={{ uc, voiceover: null } as UcProps}
          calculateMetadata={async ({ props }) => {
            const voiceover = await loadVoiceover(props.uc.id);
            return { props: { ...props, voiceover }, durationInFrames: total(props.uc, voiceover) };
          }}
        />
      ))}
      {/* Yöntem karşılaştırması: açılış sahnesinin 3D denemesi (ses yok, süre çizimli sürümle aynı) */}
      {/* Yeni avatar (Yunus v2) denemesi: karakter sayfası + sinematik klip */}
      <Composition id="avatar2-sayfa" component={HeroSheet} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} durationInFrames={1} />
      <Composition id="avatar2-sinema" component={HeroCinema} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} durationInFrames={300} />
      <Composition id="deneme-3d" component={Deneme3D} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} durationInFrames={142} />
    </>
  );
};
