import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { Captions } from "../cizim/Cizim";
import { fontFamily } from "../fonts";
import { audioFor, sceneDurations, wordsFor } from "../shared";
import type { Cizim, PostVoiceover } from "../types";
import { PAPER, useRig, applyPose, anchors, useCam, Room } from "./kit";
import type { W, Ctx, SceneRef, Def } from "./kit";
import { useModel } from "./model";
import * as tarti from "./sahneler/tarti";
import * as yagNereye from "./sahneler/yag-nereye";

// 3D video: ücretsiz Mixamo kadın modeli (public/3d/kadin.glb), Three.js ile güneşli bir odada.
// Her sahne: kamera planları (kelimelerde sert kesme), karakter pozu, 3D efektler ve 2D katman
// (altyazı + yalnızca önemli sayılar). Animasyonlar kelime zamanlamasına bağlıdır.

// Her videonun sahneleri ayrı dosyada; görsel adları (visual) videolar arasında benzersiz olmalı
const DEFS = { ...yagNereye.DEFS, ...tarti.DEFS };
const OVERLAYS = { ...yagNereye.OVERLAYS, ...tarti.OVERLAYS };

export type UcProps = { uc: Cizim; voiceover: PostVoiceover | null };

export const UcVideo: React.FC<UcProps> = ({ uc, voiceover }) => {
  const { width, height, fps } = useVideoConfig();
  const durations = sceneDurations(uc, voiceover, fps);
  const model = useModel("3d/kadin.glb");
  const scenes = uc.scenes.map((scene, i) => {
    const audio = audioFor(uc, voiceover, i);
    const words = wordsFor(scene.voice, audio);
    const w: W = (k) => Math.round((words[Math.min(k, words.length - 1)]?.start ?? 0) * fps);
    return { scene, audio, words, w, d: durations[i], start: durations.slice(0, i).reduce((a, b) => a + b, 0) };
  });
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, fontFamily }}>
      {model ? (
        <ThreeCanvas width={width} height={height} shadows gl={{ preserveDrawingBuffer: true }}>
          <World model={model} scenes={scenes.map(({ scene, w, d, start }) => ({ visual: scene.visual, w, d, start }))} />
        </ThreeCanvas>
      ) : null}
      {/* sıcak ton ve köşe kararması: serinin renk dünyası */}
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 42%, rgba(0,0,0,0) 55%, rgba(70,45,20,0.5) 100%)" }} />
      {scenes.map(({ scene, audio, words, w, d, start }, i) => {
        const Overlay = OVERLAYS[scene.visual];
        return (
          <Sequence key={i} from={start} durationInFrames={d} name={`${i + 1}-${scene.visual}`}>
            <Flash />
            {Overlay ? (
              <AbsoluteFill>
                <svg width="100%" height="100%" viewBox="0 0 1080 1920">
                  <Overlay w={w} d={d} />
                </svg>
              </AbsoluteFill>
            ) : null}
            <Captions words={words} />
            {audio ? <Audio src={staticFile(audio.file)} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// Sahne başında kısa ışık patlaması: sert kesmeyi yumuşatır
const Flash: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 5], [0.35, 0], { extrapolateRight: "clamp" });
  return o > 0 ? <AbsoluteFill style={{ backgroundColor: "#fff3d6", opacity: o }} /> : null;
};

const World: React.FC<{ model: THREE.Group; scenes: SceneRef[] }> = ({ model, scenes }) => {
  const g = useCurrentFrame();
  const rig = useRig(model);
  let i = 0;
  scenes.forEach((s, j) => {
    if (g >= s.start) i = j;
  });
  const s = scenes[i];
  const ctx: Ctx = { f: g - s.start, w: s.w, d: s.d };
  const def = DEFS[s.visual] ?? DEFS.acilis;
  applyPose(rig, def.pose(ctx), g);
  const a = anchors(rig);
  const Fx = def.fx;
  return (
    <>
      <color attach="background" args={[PAPER]} />
      <fog attach="fog" args={[PAPER, 9, 40]} />
      <hemisphereLight args={["#fff1d6", "#8a6a45", 0.9]} />
      <directionalLight
        position={[-2.5, 4, 3]}
        intensity={2.4}
        color="#ffe0b0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-1}
      />
      <pointLight position={[1.5, 1.6, 1.5]} intensity={1.2} color="#ffd7a0" />
      <Room />
      <primitive object={rig.p} />
      <CamRig def={def} ctx={ctx} />
      <Fx {...ctx} a={a} />
    </>
  );
};

const CamRig: React.FC<{ def: Def; ctx: Ctx }> = ({ def, ctx }) => {
  useCam(def.cam(ctx), ctx.f, ctx.d, def.shake?.(ctx) ?? 0);
  return null;
};
