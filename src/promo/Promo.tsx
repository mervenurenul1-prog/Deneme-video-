import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { interFamily, monoFamily } from "../fonts";
import { audioFor, ProgressBar, sceneDurations, Subtitles, wordsFor } from "../shared";
import type { PostVoiceover, Promo, PromoScene } from "../types";

// VOOM uygulamasının kendi renkleri (ekran görüntülerinden alındı)
const C = {
  bg: "#000000",
  card: "#0a0a0a",
  border: "#1f1f1f",
  text: "#f5f5f5",
  muted: "#8a8a8a",
  lime: "#c8e85a",
  teal: "#6ad0c7",
};

// Ekran görüntüleri 923 px genişliğe göre ölçülür (focus koordinatları bu ölçekte)
const SHOT = { w: 923, h: 1876 };
const PHONE = { screenW: 500, bezel: 12, top: 440, radius: 64 };
const SCALE = PHONE.screenW / SHOT.w;
const SCREEN_H = SHOT.h * SCALE;
const PHONE_LEFT = (1080 - PHONE.screenW) / 2 - PHONE.bezel;
// Yakınlaşınca odak bölgesinin geleceği nokta
const FOCUS_TARGET = { x: 540, y: 960 };

export type PromoProps = { promo: Promo; voiceover: PostVoiceover | null };

export const PromoVideo: React.FC<PromoProps> = ({ promo, voiceover }) => {
  const { fps } = useVideoConfig();
  const durations = sceneDurations(promo, voiceover, fps);
  let from = 0;
  const last = promo.scenes.length - 1;

  return (
    <AbsoluteFill style={{ fontFamily: interFamily, color: C.text, backgroundColor: C.bg }}>
      <Glow />
      {promo.scenes.map((scene, i) => {
        const start = from;
        from += durations[i];
        const audio = audioFor(promo, voiceover, i);
        return (
          <Sequence key={i} from={start} durationInFrames={durations[i]} name={`${i + 1}-${scene.kicker ?? "yazı"}`}>
            <Fade>
              {scene.screen ? (
                <ScreenScene scene={scene} />
              ) : i === last ? (
                <EndCard scene={scene} />
              ) : (
                <TextScene scene={scene} />
              )}
            </Fade>
            <Subtitles words={wordsFor(scene.voice, audio)} accent={C.lime} bottom={360} boxed={!!scene.screen} />
            {audio ? <Audio src={staticFile(audio.file)} /> : null}
          </Sequence>
        );
      })}
      <ProgressBar color={C.lime} />
    </AbsoluteFill>
  );
};

const Glow: React.FC = () => {
  const frame = useCurrentFrame();
  const y = 55 + Math.sin(frame / 80) * 5;
  return (
    <AbsoluteFill
      style={{ background: `radial-gradient(circle at 50% ${y}%, rgba(200,232,90,0.10) 0%, rgba(0,0,0,0) 55%)` }}
    />
  );
};

const Fade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(frame, [0, 8, durationInFrames - 6, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const useEnter = (delay = 0, damping = 200) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 120 } });
};

// Uygulamadaki gibi aralıklı, büyük harfli mono etiket
const Kicker: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.lime }) => (
  <div style={{ fontFamily: monoFamily, fontSize: 34, fontWeight: 600, letterSpacing: 10, color }}>{children}</div>
);

const Wordmark: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ fontFamily: monoFamily, fontSize: size, fontWeight: 500, letterSpacing: size * 0.45, marginRight: -size * 0.45 }}>
    VOOM
  </div>
);

/* ---------- Telefon çerçevesinde ekran + odak bölgesine yakınlaşma ---------- */

const ScreenScene: React.FC<{ scene: PromoScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const enter = useEnter(0, 18);
  const head = useEnter(4);
  const f = scene.focus;

  // Sahnenin ~%25'inde yakınlaşmaya başla
  const p = interpolate(frame, [durationInFrames * 0.22, durationInFrames * 0.55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  let camera = "none";
  let origin = "50% 50%";
  if (f) {
    const cx = PHONE_LEFT + PHONE.bezel + (f.x + f.w / 2) * SCALE;
    const cy = PHONE.top + PHONE.bezel + (f.y + f.h / 2) * SCALE;
    const zoom = Math.min(2.0, Math.max(1, Math.min(900 / (f.w * SCALE), 920 / (f.h * SCALE))));
    const z = 1 + (zoom - 1) * p;
    origin = `${cx}px ${cy}px`;
    camera = `translate(${(FOCUS_TARGET.x - cx) * p}px, ${(FOCUS_TARGET.y - cy) * p}px) scale(${z})`;
  }

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: camera, transformOrigin: origin }}>
        <div
          style={{
            position: "absolute",
            left: PHONE_LEFT,
            top: PHONE.top,
            padding: PHONE.bezel,
            borderRadius: PHONE.radius + PHONE.bezel,
            background: "#1a1a1a",
            boxShadow: `0 0 0 2px #2c2c2c, 0 40px 120px rgba(200,232,90,0.12)`,
            opacity: enter,
            transform: `translateY(${(1 - enter) * 120}px)`,
          }}
        >
          <div
            style={{
              position: "relative",
              width: PHONE.screenW,
              height: SCREEN_H,
              borderRadius: PHONE.radius,
              overflow: "hidden",
              backgroundColor: C.bg,
            }}
          >
            <Img src={staticFile(scene.screen!)} style={{ width: "100%", display: "block" }} />
            {f ? (
              <div
                style={{
                  position: "absolute",
                  left: f.x * SCALE,
                  top: f.y * SCALE,
                  width: f.w * SCALE,
                  height: f.h * SCALE,
                  borderRadius: 14,
                  border: `3px solid ${C.lime}`,
                  // Odak dışını karart
                  boxShadow: `0 0 0 2000px rgba(0,0,0,${0.55 * p})`,
                  opacity: p,
                }}
              />
            ) : null}
          </div>
        </div>
      </AbsoluteFill>

      {/* Başlık alanı: yakınlaşan telefonun üstünde okunur kalsın diye siyah geçişli */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: 200,
          paddingBottom: 60,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22,
          textAlign: "center",
          background: "linear-gradient(#000 78%, rgba(0,0,0,0))",
          opacity: head,
          transform: `translateY(${(1 - head) * -20}px)`,
        }}
      >
        {scene.kicker ? <Kicker>{scene.kicker}</Kicker> : null}
        {scene.display ? (
          <div style={{ fontSize: 66, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5, padding: "0 90px" }}>
            {scene.display}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Açılış: büyük soru ---------- */

const TextScene: React.FC<{ scene: PromoScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const words = (scene.display ?? scene.voice).split(" ");
  const mark = useEnter(0);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "220px 90px 520px", gap: 70 }}>
      <div style={{ opacity: mark, color: C.muted }}>
        <Wordmark size={40} />
      </div>
      <div style={{ fontSize: 104, fontWeight: 800, lineHeight: 1.05, letterSpacing: -3, textAlign: "center" }}>
        {words.map((w, i) => {
          const o = interpolate(frame, [4 + i * 4, 12 + i * 4], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const isLast = i === words.length - 1;
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: o,
                transform: `translateY(${(1 - o) * 24}px)`,
                color: isLast ? C.lime : undefined,
              }}
            >
              {w}&nbsp;
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Kapanış: logo, slogan, "link profilde" ---------- */

const EndCard: React.FC<{ scene: PromoScene }> = ({ scene }) => {
  const mark = useEnter(0, 14);
  const line = useEnter(14);
  const pill = useEnter(28, 12);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "220px 90px 520px", gap: 56 }}>
      <div style={{ transform: `scale(${0.85 + 0.15 * mark})`, opacity: mark }}>
        <Wordmark size={150} />
      </div>
      <div style={{ width: 120 * line, height: 4, backgroundColor: C.lime }} />
      <div
        style={{
          fontSize: 60,
          fontWeight: 600,
          color: C.muted,
          textAlign: "center",
          lineHeight: 1.25,
          opacity: line,
        }}
      >
        {scene.display}
      </div>
      <div
        style={{
          opacity: pill,
          transform: `scale(${pill})`,
          border: `2px solid ${C.lime}`,
          borderRadius: 999,
          padding: "22px 52px",
        }}
      >
        <Kicker>LİNK PROFİLDE</Kicker>
      </div>
    </AbsoluteFill>
  );
};
