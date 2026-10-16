import { useId } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Freeze,
  interpolate,
  random,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily, handFamily } from "../fonts";
import { audioFor, SAFE, sceneDurations, useSeconds, wordsFor } from "../shared";
import type { Cizim, PostVoiceover, WordTiming } from "../types";

// 1. sürüm çizim stili (kullanıcının seçtiği): sade karakter, yavaş animasyonlar.
// Elle çizilmiş görünüm: sıcak sepya kâğıt, mürekkep çizgiler, ışık huzmeleri.
// Her sahne söylenen şeyi birebir gösterir; animasyonlar kelime zamanlamalarına bağlıdır
// (sessiz önizlemede tahmini, seslendirmeden sonra gerçek zamanlamalar).
const C = {
  paper: "#ecdcbc",
  ink: "#3a2716",
  skin: "#eab48c",
  shirt: "#5d8c87",
  shirtLight: "#86b3ac",
  shorts: "#4b3f5e",
  hair: "#4a2f1d",
  shoe: "#33292a",
  fat: "#f0c24b",
  fatDark: "#b8862a",
  co2: "#8e9196",
  water: "#4f97c2",
  red: "#b23a2a",
  lung: "#e58f8f",
  glow: "#ff8a2a",
  yellow: "#ffd23f",
  cream: "#fbf3e2",
};

export type Cizim1Props = { cizim: Cizim; voiceover: PostVoiceover | null };

// w(i): i. kelimenin başladığı kare (sahneye göre)
type SceneProps = { d: number; w: (i: number) => number };

// Döngülü videoda son karelerde ilk sahnenin ilk karesi belirir: Instagram başa sardığında kesinti görünmez
const LOOP_FRAMES = 14;

export const Cizim1Video: React.FC<Cizim1Props> = ({ cizim, voiceover }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const durations = sceneDurations(cizim, voiceover, fps);
  const loop = cizim.loop === true;
  const last = cizim.scenes.length - 1;
  let from = 0;
  const wordsAt = (i: number) => wordsFor(cizim.scenes[i].voice, audioFor(cizim, voiceover, i));
  const wOf = (i: number) => {
    const words = wordsAt(i);
    return (k: number) => Math.round((words[Math.min(k, words.length - 1)]?.start ?? 0) * fps);
  };
  const First = SCENES[cizim.scenes[0].visual] ?? Missing;
  return (
    <AbsoluteFill style={{ backgroundColor: C.paper, fontFamily }}>
      <Paper />
      <Beams />
      {cizim.scenes.map((scene, i) => {
        const start = from;
        from += durations[i];
        const audio = audioFor(cizim, voiceover, i);
        const words = wordsAt(i);
        const w = wOf(i);
        const Visual = SCENES[scene.visual] ?? Missing;
        return (
          <Sequence key={i} from={start} durationInFrames={durations[i]} name={`${i + 1}-${scene.visual}`}>
            <Shot d={durations[i]} zoom={ZOOM[scene.visual]} noIn={loop && i === 0} noOut={loop && i === last}>
              <Visual d={durations[i]} w={w} />
            </Shot>
            <Captions words={words} hideFrom={loop && i === last ? durations[i] - LOOP_FRAMES : undefined} />
            {audio ? <Audio src={staticFile(audio.file)} /> : null}
            {/* sahne geçişi + o sahnedeki olayların efekt sesleri */}
            {i > 0 ? <Audio src={staticFile("sfx/whoosh.mp3")} volume={0.18 * SFX_GAIN} /> : null}
            {tidySfx(SFX[scene.visual]?.(w, durations[i]) ?? []).map(([at, file, vol], k) =>
              at >= 0 && at < durations[i] ? (
                <Sequence key={k} from={Math.round(at)} layout="none">
                  <Audio src={staticFile(`sfx/${file}.mp3`)} volume={vol} />
                </Sequence>
              ) : null,
            )}
          </Sequence>
        );
      })}
      {loop ? (
        <Sequence from={durationInFrames - LOOP_FRAMES} durationInFrames={LOOP_FRAMES} name="dongu">
          <LoopIn>
            <Freeze frame={0}>
              <Paper />
              <Beams />
              <Shot d={durations[0]} zoom={ZOOM[cizim.scenes[0].visual]} noIn>
                <First d={durations[0]} w={wOf(0)} />
              </Shot>
              <Captions words={wordsAt(0)} />
            </Freeze>
          </LoopIn>
        </Sequence>
      ) : null}
      {cizim.music ? <Music src={cizim.music} loop={loop} /> : null}
      <Dust loop={loop} />
    </AbsoluteFill>
  );
};

// Döngü geçişi: ilk kare, kâğıt dahil tam opak olana kadar belirir (son kare = ilk kare)
const LoopIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, LOOP_FRAMES - 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

const Missing: React.FC<SceneProps> = () => null;

// Arka plan müziği: konuşmanın altında ama belirgin (kullanıcı: kısık olunca "var ile yok arası"), başta ve sonda yumuşak geçiş
// Döngülü videoda müzik baştan tam sesle girer, sonda yalnızca kısa bir an kısılır (başa sarınca kopukluk duyulmasın)
const Music: React.FC<{ src: string; loop?: boolean }> = ({ src, loop = false }) => {
  const { durationInFrames } = useVideoConfig();
  const edges = loop ? [0, 3, durationInFrames - 6, durationInFrames - 1] : [0, 20, durationInFrames - 45, durationInFrames - 1];
  const levels = loop ? [0.6, 1, 1, 0.6] : [0, 1, 1, 0];
  return (
    <Audio
      src={staticFile(src)}
      loop
      volume={(f) => 0.62 * interpolate(f, edges, levels, { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
  );
};

// Efekt sesleri: [kare, dosya (public/sfx), ses düzeyi]. Animasyonlarla aynı kelime zamanlarına bağlı.
type Sfx = [number, string, number];
// Kullanıcı: "efektler sesin ve müziğin önüne geçmesin, çok tik-tak olmasın". Hepsi kısılır; küçük tekrar eden
// sesler (tik, tak, bip, pop, damla, kalem…) birbirine 20 kareden yakınsa yalnız ilki çalar.
const SFX_GAIN = 0.45;
const SMALL = new Set(["tik", "tak", "bip", "pop", "damla", "kalem", "cizik", "adim", "nefes"]);
const tidySfx = (list: Sfx[]): Sfx[] => {
  const out: Sfx[] = [];
  let lastSmall = -999;
  for (const [at, file, vol] of [...list].sort((a, b) => a[0] - b[0])) {
    if (SMALL.has(file)) {
      if (at - lastSmall < 20) continue;
      lastSmall = at;
    }
    out.push([at, file, vol * SFX_GAIN]);
  }
  return out;
};
const every = (from: number, to: number, step: number, file: string, vol: number): Sfx[] => {
  const out: Sfx[] = [];
  for (let t = from; t < to; t += step) out.push([t, file, vol]);
  return out;
};
// Ayak sesleri: walk() döngüsünde ayağın yere bastığı kareler (sin sıfırdan geçer: f = k·π·speed)
const steps = (from: number, to: number, speed: number, vol: number): Sfx[] => {
  const out: Sfx[] = [];
  for (let k = Math.ceil(from / (Math.PI * speed)); k * Math.PI * speed < to; k++) out.push([Math.round(k * Math.PI * speed), "adim", vol]);
  return out;
};
// Saat tiklemesi (tik-tak): cevap gelmeden önceki bekleyiş ve dönen sayaçlar için
const ticks = (from: number, to: number, step: number, vol: number): Sfx[] =>
  every(from, to, step, "tik", vol).map(([t, , v], i): Sfx => [t, i % 2 ? "tak" : "tik", v]);
const SFX: Record<string, (w: (i: number) => number, d: number) => Sfx[]> = {
  tarti: (w, d) => [
    [w(0) + 2, "bip", 0.35],
    [w(2) + 18, "bip", 0.35],
    [w(2) + 4, "pirilti", 0.3],
    [w(5) - 6, "pop", 0.4],
    [w(5) + 2, "whoosh", 0.3],
    [w(6), "pop", 0.35],
    [w(7), "pop", 0.4],
    [w(7) + 8, "boom", 0.18],
    ...ticks(w(7) + 14, d - 4, 9, 0.35),
  ],
  "yanlis-fikir": (w) => [
    [w(2) - 4, "pop", 0.45],
    [w(3), "kalem", 0.35],
    [w(6) - 4, "pop", 0.45],
    [w(6), "damla", 0.4],
    [w(6) + 14, "damla", 0.3],
    [w(7), "kalem", 0.35],
    [w(11) - 2, "cizik", 0.5],
    [w(11) + 6, "cizik", 0.5],
  ],
  "yag-hucresi": (w) => [
    [2, "pop", 0.35],
    ...ticks(6, w(1) - 4, 9, 0.35),
    [w(1) - 4, "boom", 0.18],
    [w(1) - 2, "pirilti", 0.4],
    [w(2), "ding", 0.25],
    [w(4), "damla", 0.4],
    ...Array.from({ length: 10 }, (_, i): Sfx => [w(1) + i * Math.max(3, (w(5) - w(1)) / 10), "pop", 0.18]),
    [w(2), "kalem", 0.3],
    [w(4), "kalem", 0.3],
  ],
  nefes: (w, d) => [...ticks(w(0), w(3) + 2, 4, 0.22), [w(3) + 4, "ding", 0.3], [w(4), "kalem", 0.25], ...every(w(4) - 10, d - 20, 42, "nefes", 0.45)],
  su: (w, d) => [...ticks(w(0), w(2), 5, 0.22), [w(2) - 3, "damla", 0.45], [w(2) + 2, "ding", 0.25], ...every(w(4), d - 10, 18, "damla", 0.22)],
  "hizli-nefes": (w) => [
    [w(1) - 4, "pop", 0.35],
    ...every(w(1), w(10), 18, "nefes", 0.3),
    ...ticks(w(1) + 4, w(10) - 2, 9, 0.28),
    [w(10), "cizik", 0.4],
    [w(10) + 2, "boom", 0.15],
    [w(10) + 8, "kalem", 0.3],
  ],
  hareket: (w, d) => [[w(1), "boom", 0.15], [w(4), "kalem", 0.3], [w(4) + 2, "ding", 0.25], ...every(w(7), d - 20, 22, "nefes", 0.35)],
  kapanis: (w) => [[w(1), "kalem", 0.35], [w(4), "kalem", 0.35], [w(4), "nefes", 0.4], [w(7), "pop", 0.5], [w(8), "ding", 0.3]],

  // 02 tartı
  "tarti-acilis": (w) => [
    [w(5) - 4, "pirilti", 0.25],
    [w(8) + 4, "tak", 0.45],
    ...ticks(w(8) + 10, w(12) - 3, 4, 0.25),
    [w(12) - 2, "bip", 0.4],
    [w(12), "boom", 0.2],
    [w(12) + 2, "kalem", 0.35],
  ],
  "tarti-panik": (w) => [...every(4, w(1), 9, "damla", 0.18), [w(1) + 2, "nefes", 0.4], [w(3) - 2, "pop", 0.45], [w(6) - 2, "cizik", 0.5], [w(6) + 6, "cizik", 0.5]],
  "tarti-kalori": (w) => {
    const step = Math.max(3, (w(12) - w(4)) / 9);
    return [
      ...Array.from({ length: 9 }, (_, i): Sfx => [w(4) + i * step, "pop", 0.16]),
      ...ticks(w(5), w(9) + 2, 4, 0.2),
      [w(9) + 4, "ding", 0.28],
      [w(13) - 2, "pirilti", 0.25],
      [w(17) - 2, "cizik", 0.5],
      [w(17) + 6, "cizik", 0.5],
    ];
  },
  "tarti-su": (w) => [[2, "pop", 0.35], ...ticks(6, w(2) - 3, 9, 0.35), [w(2) - 3, "boom", 0.16], [w(2) - 2, "pirilti", 0.4], [w(2), "damla", 0.45], ...every(w(7) - 4, w(10), 6, "damla", 0.14)],
  "tarti-tuz": (w, d) => [[w(5) + 4, "tak", 0.3], [w(6) - 2, "damla", 0.35], ...every(w(6) + 4, d - 10, 12, "damla", 0.16)],
  "tarti-diger": (w) => [[w(0) - 2, "pop", 0.4], [w(2) - 2, "pop", 0.4], [w(5) - 2, "pop", 0.4], [w(8), "boom", 0.16], ...every(w(8), w(8) + 36, 6, "bip", 0.18)],
  "tarti-ortalama": (w) => [
    ...Array.from({ length: 7 }, (_, i): Sfx => [2 + i * ((w(2) + 4) / 7), "tik", 0.25]),
    [w(2), "pop", 0.4],
    [w(5) - 2, "cizik", 0.45],
    [w(6) - 2, "kalem", 0.4],
    [w(7) + 12, "ding", 0.3],
  ],
  "tarti-kapanis": (w) => [[w(3) - 2, "pirilti", 0.25], [w(4) + 14, "pop", 0.4], [w(5), "pop", 0.5], [w(6), "ding", 0.3]],

  // 03 on bin adım — ekranda beliren her olayın kendi sesi var; ayak sesleri yürüyüşte ayağın yere bastığı kareye denk gelir
  "adim-acilis": (w) => [
    ...steps(6, w(6) - 2, 5.5, 0.35),
    [w(0) - 2, "pop", 0.4],
    ...ticks(w(0), w(3) + 4, 3, 0.2),
    [w(3) + 4, "ding", 0.3],
    [w(6), "pop", 0.45],
    ...steps(w(6) - 6, w(8) + 2, 4.5, 0.3),
    [w(10) - 2, "sonme", 0.35],
    [w(10), "whoosh", 0.18],
    [w(10) + 5, "whoosh", 0.15],
  ],
  "adim-reklam": (w) => [
    [0, "kagit", 0.45],
    [w(0), "kalem", 0.35],
    [w(2) - 2, "pop", 0.4],
    [w(5) - 2, "pop", 0.4],
    ...every(w(5), w(7) + 20, 5, "tik", 0.18),
    ...[0, 1, 2, 3].map((i): Sfx => [w(6) - 2 + i * 4, "pop", 0.14]),
    [w(6) + 14, "kacing", 0.45],
    [w(7) + 2, "kagit", 0.45],
    [w(7) + 3, "whoosh", 0.25],
    [w(8), "kalem", 0.35],
    [w(8) + 6, "pirilti", 0.3],
  ],
  "adim-yayildi": (w, d) => {
    const step = Math.max(3, (d - 12 - w(7)) / 9);
    return [
      [w(0) - 2, "pop", 0.4],
      [w(1), "sihir", 0.3],
      [w(3), "kagit", 0.3],
      [w(3) + 5, "kagit", 0.3],
      [w(3) + 10, "kagit", 0.3],
      [w(5), "whoosh", 0.3],
      [w(6) - 4, "boom", 0.15],
      [w(6) - 2, "whoosh", 0.3],
      ...Array.from({ length: 9 }, (_, i): Sfx => [w(7) + i * step, "adim", 0.3]),
    ];
  },
  "adim-bilim": (w) => [
    [2, "pop", 0.35],
    ...ticks(6, w(4) - 3, 9, 0.35),
    [w(4) - 3, "boom", 0.16],
    [w(4) - 2, "pirilti", 0.4],
    [w(4), "yuksel", 0.3],
    ...ticks(w(4), w(7) + 4, 3, 0.16),
    ...every(w(4), w(7) + 6, 6, "pop", 0.08),
    [w(7) + 4, "ding", 0.28],
    [w(8) - 2, "whoosh", 0.3],
  ],
  "adim-egri": (w) => [
    [0, "kagit", 0.35],
    ...every(w(0), w(8) + 4, 12, "kalem", 0.2),
    ...steps(w(0), w(10), 3.2, 0.12),
    [w(1), "kalem", 0.3],
    [w(4), "pop", 0.3],
    [w(9) - 2, "ding", 0.35],
    ...every(w(10), w(15) + 4, 12, "kalem", 0.2),
    [w(11), "kalem", 0.3],
    [w(12), "pop", 0.3],
  ],
  "adim-sihirli": (w) => [
    [w(1) - 2, "sihir", 0.5],
    [w(3), "pirilti", 0.2],
    [w(6) - 2, "sonme", 0.5],
    [w(6) - 2, "cizik", 0.4],
    [w(6) + 4, "whoosh", 0.3],
    [w(7) + 4, "boom", 0.18],
    [w(7), "kagit", 0.35],
    [w(11) - 2, "cizik", 0.45],
    [w(12) - 2, "ding", 0.4],
    [w(12), "pirilti", 0.3],
  ],
  "adim-her-adim": (w, d) => [
    ...steps(4, d, 5.5, 0.3),
    [w(3), "yuksel", 0.3],
    [w(5), "yuksel", 0.35],
    [w(6), "pop", 0.35],
    [w(6) + 2, "pirilti", 0.35],
    [w(7) + 10, "ding", 0.3],
  ],
  "adim-kapanis": (w) => [
    [w(1) - 2, "pop", 0.5],
    [w(3) - 2, "adim", 0.3],
    [w(3) + 6, "adim", 0.3],
    [w(5), "pop", 0.45],
  ],

  // 04 kadın ve ağırlık — her olayın kendi sesi
  "kadin-acilis": (w) => [[w(3) - 2, "pop", 0.35], [w(10) - 2, "kagit", 0.45]],
  "kadin-hormon": (w) => [
    [w(5) - 2, "pop", 0.4],
    [w(7) - 2, "kalem", 0.3],
    [w(7) - 2, "yuksel", 0.35],
    ...every(w(7) - 2, w(8) + 4, 3, "damla", 0.1),
    ...every(w(8), w(13), 12, "damla", 0.14),
    ...ticks(w(8), w(13) - 2, 6, 0.2),
    [w(13) - 2, "boom", 0.16],
    [w(13), "ding", 0.35],
  ],
  "kadin-kas": (w, d) => {
    // her tekrarın tepesinde (kol yukarıdayken) kısa bir "tak"
    const reps: Sfx[] = [];
    for (let k = 0; Math.PI * 6.5 * (2 * k + 1) < d; k++) reps.push([Math.round(Math.PI * 6.5 * (2 * k + 1)), "tak", 0.3]);
    return [...reps, [w(2), "yuksel", 0.25], [w(10) - 2, "whoosh", 0.3], [w(11) - 2, "cizik", 0.45], [w(11) + 6, "cizik", 0.45], [w(12), "sihir", 0.4]];
  },
  "kadin-sahne": (w) => [
    [0, "boom", 0.18],
    [2, "pirilti", 0.25],
    ...every(w(6) - 2, w(7) + 10, Math.max(3, (w(7) + 12 - w(6)) / 6), "kagit", 0.3),
    [w(8) - 2, "pop", 0.4],
    ...[0, 1, 2, 3].map((i): Sfx => [w(8) + i * 4, "kalem", 0.22]),
    [w(11) - 2, "pop", 0.35],
    [w(11) + 4, "pop", 0.35],
    [w(11) + 10, "pop", 0.35],
  ],
  "kadin-kemik": (w, d) => [
    [2, "pop", 0.35],
    ...ticks(6, w(1) - 2, 9, 0.35),
    [w(1) - 2, "boom", 0.16],
    [w(1), "whoosh", 0.3],
    [w(3) - 2, "pop", 0.3],
    [w(3), "sonme", 0.4],
    ...every(w(4), d - 6, 9, "cizik", 0.1),
  ],
  "kadin-arastirma": (w, d) => {
    // halter her kalkışta (aşağıdan yukarı) kısa bir "tak"
    const lifts: Sfx[] = [];
    for (let k = 0; Math.PI * 9 * (2 * k + 1) < d; k++) lifts.push([Math.round(Math.PI * 9 * (2 * k + 1)), "tak", 0.3]);
    return [...lifts, [w(4) - 4, "whoosh", 0.3], [w(4), "yuksel", 0.3], [w(9), "pirilti", 0.35], [w(10) - 2, "kalem", 0.35], [w(12) - 2, "ding", 0.4]];
  },
  "kadin-sonuc": (w) => [[w(3) - 2, "pop", 0.35], [w(4) - 2, "cizik", 0.45], [w(5) - 2, "havalanma", 0.55], [w(6), "boom", 0.2], [w(6) + 2, "sihir", 0.45]],
  "kadin-kapanis": (w) => [[0, "pop", 0.3], [w(0) - 4, "pop", 0.25], [w(4), "havalanma", 0.4], [w(5) + 6, "ding", 0.3], [w(6) - 2, "pop", 0.55], [w(6) + 2, "tak", 0.35]],

  // 04 yeni hikâye — az ve anlamlı efektler
  "kadin-hook": (w) => [[3, "pop", 0.35], [w(5) - 3, "whoosh", 0.4], [w(5) - 2, "boom", 0.25], [w(8), "agir-dusme", 0.35], [w(8) + 2, "pirilti", 0.45], [w(15) + 2, "ding", 0.3]],
  "kadin-104": (w) => [[w(6) - 2, "yuksel", 0.35], [w(9) + 4, "ding", 0.25], [w(11) - 2, "kalem", 0.35], [w(17), "agir-dusme", 0.3]],
  "kadin-dongu2": (w) => [[w(6), "pop", 0.35]],
  "kadin5-hook": (w) => [[w(2), "yuksel", 0.3], [w(5) - 1, "sonme", 0.4], [w(7), "agir-dusme", 0.3], [w(9), "kagit", 0.35]],
  "kadin5-1896": (w) => [[w(1) - 2, "kalem", 0.35], [w(8), "agir-dusme", 0.3], [w(11) - 2, "boom", 0.18], [w(11), "pop", 0.4]],
  "kadin5-2000": (w) => [[w(2), "cizik", 0.45], [w(3), "whoosh", 0.35], [w(7) - 2, "pop", 0.3], [w(11), "ding", 0.4], [w(12), "pirilti", 0.45]],
  "kadin5-hormon": (w) => [[w(4) - 2, "pop", 0.35], [w(8), "damla", 0.2], [w(11) - 2, "kalem", 0.3], [w(14), "sihir", 0.4], [w(18) - 2, "cizik", 0.4]],
  "kadin5-mesaj": (w) => [[2, "kagit", 0.4], [w(4) - 4, "whoosh", 0.35], [w(5), "pirilti", 0.4]],
  "kadin-kemik3": (w) => [[w(2) - 2, "pirilti", 0.4], [w(7) - 2, "kalem", 0.3], [w(9), "yuksel", 0.35], [w(9) + 6, "ding", 0.35]],
  "kadin-dongu3": (w) => [[w(5) - 2, "pop", 0.35], [w(7) - 2, "whoosh", 0.35], [w(7), "pirilti", 0.4], [w(9), "ding", 0.3]],
  "kadin-1896": (w) => [[2, "kalem", 0.4], [w(10), "agir-dusme", 0.45], [w(13), "yuksel", 0.35], [w(17) + 4, "ding", 0.3]],
  "kadin-2000": (w) => [[2, "kalem", 0.4], [w(6), "agir-dusme", 0.35], [w(6) + 2, "pirilti", 0.45], [w(10) + 4, "ding", 0.3]],
  "kadin-korku": (w) => [[w(4) - 2, "cizik", 0.4], [w(5), "sonme", 0.4], [w(10) - 2, "pop", 0.4]],
  "kadin-kas2": (w) => [[w(3), "sihir", 0.4], [w(7) - 2, "cizik", 0.45]],
  "kadin-kemik2": (w) => [[w(1) - 2, "pirilti", 0.4], [w(5), "yuksel", 0.3], [w(15), "ding", 0.35]],
  "kadin-mesaj": (w) => [[w(6), "kagit", 0.45], [w(8) + 4, "havalanma", 0.35], [w(8) + 12, "sihir", 0.35]],
  "kadin-dongu": (w) => [[w(1) - 2, "kagit", 0.4], [w(4), "havalanma", 0.35]],
  // 05 boyun — her olayın kendi sesi (anahtar anlar ElevenLabs ile üretilmiş gerçekçi efektler: public/sfx/*.mp3)
  "boyun-acilis": (w) => [...every(4, w(2), 4, "tak", 0.18), [w(2) - 2, "havalanma", 0.7], [w(3) + 2, "agir-dusme", 0.9], [w(4) - 2, "pop", 0.45], [w(9) - 2, "damla", 0.3], [w(9) + 8, "damla", 0.25]],
  "boyun-gun": (w) => [[2, "alarm", 0.55], [w(2) - 2, "whoosh", 0.3], [w(2) - 2, "otobus", 0.55], [w(3) - 2, "whoosh", 0.25], [w(3), "klavye", 0.5], [w(4) - 2, "whoosh", 0.25], [w(4), "sonme", 0.2], [w(6), "agir-dusme", 0.35]],
  "boyun-kaldirac": (w) => [[0, "whoosh", 0.3], ...ticks(w(1), w(3) + 4, 4, 0.22), [w(3) + 4, "bip", 0.4], ...every(w(6), w(13) + 6, 6, "tik", 0.16), [w(11) - 2, "pop", 0.4], [w(11) + 4, "tak", 0.4]],
  "boyun-altmis": (w) => [...ticks(w(3), w(5) + 4, 4, 0.22), [w(5) + 4, "ding", 0.3], ...every(w(6), w(11) + 4, 6, "tik", 0.18), [w(8), "pop", 0.35], [w(12) - 2, "havalanma", 0.5], [w(12) + 8, "agir-dusme", 0.9], ...ticks(w(12) + 8, w(14) + 2, 3, 0.2), [w(14) + 2, "bip", 0.45]],
  "boyun-surpriz": (w) => [[2, "pop", 0.35], ...ticks(6, w(5) - 3, 9, 0.35), [w(5) - 3, "boom", 0.16], [w(5) - 2, "kagit", 0.4], [w(7) - 2, "pop", 0.4], [w(10) - 2, "pop", 0.4], ...every(w(11), w(12) + 6, 4, "tik", 0.2), [w(15) - 2, "zincir", 0.85], [w(15) + 4, "sonme", 0.3]],
  "boyun-asil": (w, d) => [...every(w(5) - 2, w(7) + 8, 3, "tik", 0.18), [w(5), "whoosh", 0.25], [w(6), "nefes", 0.3], [w(7) + 8, "ding", 0.2], ...every(w(8), d - 6, 10, "bip", 0.15)],
  "boyun-cozum": (w) => [[w(0), "yuksel", 0.35], [w(4) - 2, "whoosh", 0.2], [w(4) + 14, "whoosh", 0.2], [w(8) - 2, "whoosh", 0.4], [w(9) + 6, "agir-dusme", 0.85], [w(10), "nefes", 0.4], [w(10) + 4, "pirilti", 0.35], [w(11), "ding", 0.25]],
  "boyun-kapanis": (w) => [[w(1), "whoosh", 0.25], [w(6), "pop", 0.4], ...every(w(6), w(9) - 2, 3, "tak", 0.22), [w(9) - 4, "havalanma", 0.25]],
};

/* ---------- yardımcılar ---------- */

const ease = Easing.inOut(Easing.cubic);
const tw = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
// Yaylanarak beliren öğeler için (0 → biraz taşar → 1)
const pop = (f: number, a: number, len = 12) =>
  interpolate(f, [a, a + len * 0.6, a + len], [0, 1.12, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
// start karesinden itibaren her period'da doğan, life kare yaşayan parçacıkların ilerlemesi (0..1)
const cycles = (f: number, start: number, period: number, life: number) => {
  const out: { k: number; p: number }[] = [];
  if (f < start) return out;
  const n = Math.floor((f - start) / period);
  for (let k = Math.max(0, n - Math.ceil(life / period)); k <= n; k++) {
    const p = (f - start - k * period) / life;
    if (p >= 0 && p <= 1) out.push({ k, p });
  }
  return out;
};
const svgId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");

/* ---------- arka plan: kâğıt, ışık huzmeleri, toz ---------- */

const Paper: React.FC = () => (
  <AbsoluteFill>
    <svg width="100%" height="100%" viewBox="0 0 1080 1920" preserveAspectRatio="none">
      <defs>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
          <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.24  0 0 0 0 0.12  0 0 0 0.16 0" />
        </filter>
        <filter id="blotch">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.006" numOctaves="3" seed="8" />
          <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.12  0 0 0 0.5 -0.12" />
        </filter>
        <radialGradient id="vignette" cx="50%" cy="42%" r="75%">
          <stop offset="55%" stopColor="#5a3c1e" stopOpacity="0" />
          <stop offset="100%" stopColor="#5a3c1e" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill={C.paper} />
      <rect width="1080" height="1920" filter="url(#blotch)" />
      <rect width="1080" height="1920" filter="url(#grain)" />
      <rect width="1080" height="1920" fill="url(#vignette)" />
    </svg>
  </AbsoluteFill>
);

const Beams: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", pointerEvents: "none" }}>
      {[
        { x: 120, w: 170, a: 24, o: 0.22 },
        { x: 380, w: 110, a: 21, o: 0.16 },
        { x: 560, w: 220, a: 26, o: 0.12 },
      ].map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: b.x,
            top: -300,
            width: b.w,
            height: 2600,
            transformOrigin: "50% 0",
            transform: `rotate(${b.a + Math.sin(frame / 70 + i * 2) * 1.6}deg)`,
            background: "linear-gradient(180deg, rgba(255,240,200,1) 0%, rgba(255,230,180,0.5) 45%, rgba(255,230,180,0) 85%)",
            opacity: b.o * (0.85 + 0.15 * Math.sin(frame / 40 + i)),
            filter: "blur(28px)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const DUST = Array.from({ length: 28 }, (_, i) => ({
  x: random(`dx${i}`) * 1080,
  y: random(`dy${i}`) * 1920,
  r: 2 + random(`dr${i}`) * 4,
  v: 0.2 + random(`dv${i}`) * 0.5,
}));

// Döngülü videoda toz, süre boyunca tam tur atar: son karedeki konumlar ilk karedekilerle aynıdır
const Dust: React.FC<{ loop?: boolean }> = ({ loop = false }) => {
  const now = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const frame = loop ? (now % (durationInFrames - 1)) : now;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="100%" height="100%" viewBox="0 0 1080 1920">
        {DUST.map((p, i) => (
          <circle
            key={i}
            cx={(p.x + Math.sin(frame / 50 + i) * 20 + frame * p.v * 0.3) % 1080}
            cy={(p.y - frame * p.v + 1920) % 1920}
            r={p.r}
            fill="#fff6dc"
            opacity={0.35 + 0.25 * Math.sin(frame / 20 + i)}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/* ---------- kamera ve geçiş ---------- */

type Zoom = { to: number; x: number; y: number };
// Sahneye özel yavaş kamera yakınlaşması: ölçek ve odak noktası (piksel)
const ZOOM: Record<string, Zoom> = {
  tarti: { to: 1.07, x: 540, y: 1000 },
  "yanlis-fikir": { to: 1.05, x: 540, y: 700 },
  "yag-hucresi": { to: 1.06, x: 700, y: 760 },
  nefes: { to: 1.08, x: 600, y: 700 },
  su: { to: 1.06, x: 540, y: 900 },
  "hizli-nefes": { to: 1.07, x: 540, y: 800 },
  hareket: { to: 1.05, x: 540, y: 950 },
  kapanis: { to: 1.04, x: 540, y: 800 },
  "tarti-acilis": { to: 1.07, x: 540, y: 1050 },
  "tarti-panik": { to: 1.06, x: 540, y: 800 },
  "tarti-kalori": { to: 1.05, x: 400, y: 900 },
  "tarti-su": { to: 1.06, x: 700, y: 760 },
  "tarti-tuz": { to: 1.06, x: 700, y: 950 },
  "tarti-diger": { to: 1.05, x: 540, y: 900 },
  "tarti-ortalama": { to: 1.05, x: 540, y: 600 },
  "tarti-kapanis": { to: 1.04, x: 540, y: 900 },
  "adim-acilis": { to: 1.06, x: 540, y: 700 },
  "adim-reklam": { to: 1.07, x: 470, y: 900 },
  "adim-yayildi": { to: 1.05, x: 600, y: 760 },
  "adim-bilim": { to: 1.06, x: 540, y: 1000 },
  "adim-egri": { to: 1.05, x: 540, y: 640 },
  "adim-sihirli": { to: 1.05, x: 540, y: 600 },
  "adim-her-adim": { to: 1.04, x: 540, y: 900 },
  "adim-kapanis": { to: 1.04, x: 540, y: 800 },
  "kadin-acilis": { to: 1.06, x: 540, y: 800 },
  "kadin-hormon": { to: 1.05, x: 540, y: 700 },
  "kadin-kas": { to: 1.07, x: 540, y: 900 },
  "kadin-sahne": { to: 1.06, x: 540, y: 900 },
  "kadin-kemik": { to: 1.06, x: 690, y: 820 },
  "kadin-arastirma": { to: 1.05, x: 600, y: 900 },
  "kadin-sonuc": { to: 1.06, x: 480, y: 800 },
  "kadin-kapanis": { to: 1.04, x: 540, y: 800 },
  "kadin-hook": { to: 1.06, x: 540, y: 900 },
  "kadin-104": { to: 1.05, x: 600, y: 900 },
  "kadin-dongu2": { to: 1.03, x: 540, y: 900 },
  "kadin-kemik3": { to: 1.05, x: 600, y: 900 },
  "kadin5-hook": { to: 1.05, x: 600, y: 900 },
  "kadin5-1896": { to: 1.05, x: 540, y: 900 },
  "kadin5-2000": { to: 1.05, x: 540, y: 1000 },
  "kadin5-hormon": { to: 1.04, x: 540, y: 700 },
  "kadin5-mesaj": { to: 1.04, x: 540, y: 1000 },
  "kadin-dongu3": { to: 1.03, x: 540, y: 900 },
  "kadin-1896": { to: 1.05, x: 540, y: 900 },
  "kadin-2000": { to: 1.06, x: 540, y: 900 },
  "kadin-korku": { to: 1.05, x: 560, y: 800 },
  "kadin-kas2": { to: 1.06, x: 540, y: 900 },
  "kadin-kemik2": { to: 1.05, x: 600, y: 900 },
  "kadin-mesaj": { to: 1.04, x: 540, y: 900 },
  "kadin-dongu": { to: 1.0, x: 540, y: 960 },
  "boyun-acilis": { to: 1.07, x: 480, y: 700 },
  "boyun-gun": { to: 1.05, x: 560, y: 900 },
  "boyun-kaldirac": { to: 1.06, x: 540, y: 760 },
  "boyun-altmis": { to: 1.08, x: 540, y: 780 },
  "boyun-surpriz": { to: 1.05, x: 540, y: 900 },
  "boyun-asil": { to: 1.05, x: 540, y: 800 },
  "boyun-cozum": { to: 1.05, x: 540, y: 900 },
  "boyun-kapanis": { to: 1.04, x: 480, y: 800 },
};

// noIn / noOut: döngülü videoda ilk sahne karartmasız başlar, son sahne karartmasız biter
const Shot: React.FC<{ d: number; zoom?: Zoom; noIn?: boolean; noOut?: boolean; children: React.ReactNode }> = ({ d, zoom, noIn, noOut, children }) => {
  const f = useCurrentFrame();
  const z = zoom ?? { to: 1.05, x: 540, y: 960 };
  const opacity = interpolate(f, [0, 9, d - 7, d], [noIn ? 1 : 0, 1, 1, noOut ? 1 : 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(f, [0, d], [1, z.to]);
  const blur = noIn ? 0 : interpolate(f, [0, 9], [6, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})`, transformOrigin: `${z.x}px ${z.y}px`, filter: `blur(${blur}px)` }}>
      <svg width="100%" height="100%" viewBox="0 0 1080 1920">
        <Rough />
        <g filter="url(#rough)">{children}</g>
      </svg>
    </AbsoluteFill>
  );
};

// El çizimi titreşimi: çizgiler hafifçe dalgalanır, desen birkaç karede bir değişir ("kaynayan çizgi")
const Rough: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <defs>
      <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed={Math.floor(frame / 4) % 5} />
        <feDisplacementMap in="SourceGraphic" scale="6" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="14" />
      </filter>
    </defs>
  );
};

/* ---------- altyazı: ortada, küçük, o anki kelime sarı ---------- */

const Captions: React.FC<{ words: WordTiming[]; hideFrom?: number }> = ({ words, hideFrom }) => {
  const t = useSeconds();
  const frame = useCurrentFrame();
  if (hideFrom !== undefined && frame >= hideFrom) return null;
  const chunks: WordTiming[][] = [];
  for (let i = 0; i < words.length; i += 3) chunks.push(words.slice(i, i + 3));
  const current = chunks.findLast((c) => t >= c[0].start) ?? chunks[0];
  if (!current) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: SAFE.bottom + 10,
        left: SAFE.side,
        right: SAFE.side,
        textAlign: "center",
        fontSize: 54,
        fontWeight: 800,
        color: "#fffaf0",
        WebkitTextStroke: `12px ${C.ink}`,
        paintOrder: "stroke fill",
        lineHeight: 1.25,
      }}
    >
      {current.map((w, i) => (
        <span key={i} style={{ color: t >= w.start && t <= w.end + 0.08 ? C.yellow : undefined }}>
          {i > 0 ? " " : ""}
          {w.word}
        </span>
      ))}
    </div>
  );
};

/* ---------- karakter ---------- */

type Arm = [number, number]; // [omuz açısı, dirsek bükümü] derece; 0 = aşağı, + = dışarı
type Leg = { lift?: number; spread?: number };
type Mouth = "smile" | "grin" | "flat" | "o" | "open" | "worry";
type Eyes = "open" | "wide" | "closed" | "dizzy";

type PersonProps = {
  x: number;
  y: number;
  s?: number;
  belly?: number; // 0 ince … 1 göbekli
  armL?: Arm;
  armR?: Arm;
  legL?: Leg;
  legR?: Leg;
  mouth?: Mouth;
  eyes?: Eyes;
  lookY?: number;
  tilt?: number;
  lungs?: number; // göğüste akciğerlerin görünürlüğü
  breath?: number; // akciğerlerin şişmesi 0..1
  legGlow?: number; // kasların "yanması"
  blush?: number;
  shirt?: string; // gömlek rengi (ör. doktor önlüğü için beyaz)
  female?: boolean; // kadın karakter: at kuyruğu saç, kirpik, mercan tişört
  limbW?: number; // kol/bacak kalınlığı çarpanı (1 = normal; "iri vücut" korkusu için >1)
  children?: React.ReactNode; // karakterin koordinatlarında ek çizimler
};

const dir = (side: number, deg: number) => {
  const r = (deg * Math.PI) / 180;
  return [side * Math.sin(r), Math.cos(r)];
};
const pt = (p: number[]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

const armPoints = (side: number, [a1, a2]: Arm) => {
  const s = [side * 100, -578];
  const e1 = dir(side, a1);
  const e = [s[0] + e1[0] * 150, s[1] + e1[1] * 150];
  const h1 = dir(side, a1 + a2);
  return [s, e, [e[0] + h1[0] * 140, e[1] + h1[1] * 140]];
};

const legPoints = (side: number, { lift = 0, spread = 4 }: Leg) => {
  const h = [side * 42, -345];
  const k1 = dir(side, spread);
  const k = [h[0] + k1[0] * 165 * (1 - 0.5 * lift), h[1] + k1[1] * 165 * (1 - 0.5 * lift)];
  return [h, k, [k[0] + side * 4, k[1] + 165 * (1 - 0.08 * lift)]];
};

const Limb: React.FC<{ p: number[][]; w: number; color: string; sleeve?: string }> = ({ p, w, color, sleeve }) => {
  const d = `M${pt(p[0])} L${pt(p[1])} L${pt(p[2])}`;
  const sl = sleeve ? [p[0], [p[0][0] + (p[1][0] - p[0][0]) * 0.5, p[0][1] + (p[1][1] - p[0][1]) * 0.5]] : null;
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={C.ink} strokeWidth={w + 11} />
      <path d={d} stroke={color} strokeWidth={w} />
      {sl ? (
        <>
          <path d={`M${pt(sl[0])} L${pt(sl[1])}`} stroke={C.ink} strokeWidth={w + 25} />
          <path d={`M${pt(sl[0])} L${pt(sl[1])}`} stroke={sleeve} strokeWidth={w + 14} />
        </>
      ) : null}
    </g>
  );
};

const Person: React.FC<PersonProps> = ({
  x,
  y,
  s = 1,
  belly = 0.5,
  armL = [10, 0],
  armR = [10, 0],
  legL = {},
  legR = {},
  mouth = "smile",
  eyes = "open",
  lookY = 0,
  tilt = 0,
  lungs = 0,
  breath = 0,
  legGlow = 0,
  blush = 0.4,
  shirt,
  female = false,
  limbW = 1,
  children,
}) => {
  const top = shirt ?? (female ? "#d9705f" : C.shirt);
  const frame = useCurrentFrame();
  const waist = 88 + 70 * belly;
  const hipW = 84 + 32 * belly;
  const hem = -350 + 28 * belly;
  const lL = legPoints(-1, legL);
  const lR = legPoints(1, legR);
  const aL = armPoints(-1, armL);
  const aR = armPoints(1, armR);
  const thigh = (p: number[][], side: number) => {
    const m = [p[0][0] + (p[1][0] - p[0][0]) * 0.55, p[0][1] + (p[1][1] - p[0][1]) * 0.55];
    return [
      [m[0] + side * 44, m[1]],
      [m[0] - side * 38, m[1]],
    ];
  };
  const [tLo, tLi] = thigh(lL, -1);
  const [tRo, tRi] = thigh(lR, 1);
  const torso = `M-98 -592 Q-102 -520 ${-waist} -455 Q${-waist - 4} -385 ${-hipW} -362 Q0 ${hem + 22} ${hipW} -362 Q${waist + 4} -385 ${waist} -455 Q102 -520 98 -592 Q0 -614 -98 -592 Z`;
  // canlılık: ara ara göz kırpar, hafifçe nefes alıp verir (karakter hiç donup kalmaz)
  const blink = (frame + Math.round(x * 0.37)) % 96 < 4 && (eyes === "open" || eyes === "wide");
  const idle = 1 + 0.007 * Math.sin(frame / 22);
  return (
    <g transform={`translate(${x} ${y}) scale(${s} ${s * idle})`}>
      <ellipse cx={0} cy={14} rx={150 + 30 * belly} ry={20} fill={C.ink} opacity={0.18} />
      {/* bacaklar */}
      {legGlow > 0 ? (
        <g filter="url(#glow)" opacity={legGlow * (0.75 + 0.25 * Math.sin(frame / 4))}>
          {[lL, lR].map((p, i) => (
            <path key={i} d={`M${pt(p[0])} L${pt(p[1])} L${pt(p[2])}`} stroke={C.glow} strokeWidth={90} fill="none" strokeLinecap="round" />
          ))}
        </g>
      ) : null}
      <Limb p={lL} w={52 * limbW} color={C.skin} />
      <Limb p={lR} w={52 * limbW} color={C.skin} />
      {legGlow > 0 ? (
        <g opacity={legGlow * 0.55}>
          {[lL, lR].map((p, i) => (
            <path key={i} d={`M${pt(p[0])} L${pt(p[1])} L${pt(p[2])}`} stroke={C.glow} strokeWidth={30} fill="none" strokeLinecap="round" />
          ))}
        </g>
      ) : null}
      {[lL, lR].map((p, i) => (
        <ellipse
          key={i}
          cx={p[2][0] + (i ? 14 : -14)}
          cy={p[2][1] + 10}
          rx={40}
          ry={19}
          fill={C.shoe}
          stroke={C.ink}
          strokeWidth={6}
        />
      ))}
      {/* şort */}
      <path
        d={`M${-hipW - 4} -392 L${hipW + 4} -392 L${pt(tRo)} L${pt(tRi)} L0 -300 L${pt(tLi)} L${pt(tLo)} Z`}
        fill={C.shorts}
        stroke={C.ink}
        strokeWidth={7}
        strokeLinejoin="round"
      />
      {/* gövde */}
      <path d={torso} fill={top} stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
      {top === C.shirt ? <ellipse cx={0} cy={-445} rx={waist * 0.62} ry={52 + 40 * belly} fill={C.shirtLight} opacity={0.25 + 0.4 * belly} /> : null}
      {belly > 0.15 ? (
        <path
          d={`M${-waist * 0.72} -410 Q0 ${-372 + 26 * belly} ${waist * 0.72} -410`}
          stroke={C.ink}
          strokeWidth={5}
          fill="none"
          opacity={Math.min(1, (belly - 0.15) * 3) * 0.6}
          strokeLinecap="round"
        />
      ) : null}
      <path d="M-34 -603 Q0 -566 34 -603" stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
      {lungs > 0 ? <Lungs o={lungs} breath={breath} /> : null}
      {/* kollar */}
      <Limb p={aL} w={44 * limbW} color={C.skin} sleeve={top} />
      <Limb p={aR} w={44 * limbW} color={C.skin} sleeve={top} />
      {[aL, aR].map((p, i) => (
        <circle key={i} cx={p[2][0]} cy={p[2][1]} r={27} fill={C.skin} stroke={C.ink} strokeWidth={6} />
      ))}
      {/* baş */}
      <g transform={`rotate(${tilt} 0 -630)`}>
        {female ? (
          // at kuyruğu: başın arkasında, hareketle hafifçe sallanır
          <g transform={`rotate(${Math.sin(frame / 9) * 6} 62 -740)`}>
            <path d="M58 -748 C120 -740 132 -660 104 -600 C96 -640 80 -690 50 -712 Z" fill={C.hair} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
            <circle cx={62} cy={-736} r={11} fill={C.red} stroke={C.ink} strokeWidth={4} />
          </g>
        ) : null}
        <rect x={-24} y={-650} width={48} height={52} fill={C.skin} stroke={C.ink} strokeWidth={6} />
        <circle cx={-80} cy={-700} r={17} fill={C.skin} stroke={C.ink} strokeWidth={6} />
        <circle cx={80} cy={-700} r={17} fill={C.skin} stroke={C.ink} strokeWidth={6} />
        <circle cx={0} cy={-700} r={80} fill={C.skin} stroke={C.ink} strokeWidth={7} />
        <path
          d="M-84 -698 C-96 -812 96 -812 84 -698 C74 -742 34 -756 2 -750 C-30 -758 -72 -744 -84 -698 Z"
          fill={C.hair}
          stroke={C.ink}
          strokeWidth={6}
          strokeLinejoin="round"
        />
        {female ? (
          <path d="M-86 -700 C-92 -660 -84 -640 -72 -626 L-66 -690 Z M86 -700 C92 -660 84 -640 72 -626 L66 -690 Z" fill={C.hair} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
        ) : null}
        <ellipse cx={-48} cy={-676} rx={16} ry={9} fill="#e0806f" opacity={blush} />
        <ellipse cx={48} cy={-676} rx={16} ry={9} fill="#e0806f" opacity={blush} />
        <Face eyes={blink ? "closed" : eyes} mouth={mouth} lookY={lookY} />
        {female && !blink && eyes !== "closed" ? (
          <path d={`M-40 ${-716 + lookY} l-9 -7 M40 ${-716 + lookY} l9 -7`} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
        ) : null}
      </g>
      {children}
    </g>
  );
};

const Face: React.FC<{ eyes: Eyes; mouth: Mouth; lookY: number }> = ({ eyes, mouth, lookY }) => {
  const ex = [-29, 29];
  const ey = -708 + lookY;
  return (
    <g stroke={C.ink} strokeLinecap="round" fill="none">
      {ex.map((x) =>
        eyes === "closed" ? (
          <path key={x} d={`M${x - 11} ${ey} Q${x} ${ey + 9} ${x + 11} ${ey}`} strokeWidth={5} />
        ) : eyes === "dizzy" ? (
          <g key={x} strokeWidth={5}>
            <path d={`M${x - 10} ${ey - 10} L${x + 10} ${ey + 10} M${x + 10} ${ey - 10} L${x - 10} ${ey + 10}`} />
          </g>
        ) : eyes === "wide" ? (
          <g key={x}>
            <circle cx={x} cy={ey} r={14} fill="#fffaf0" strokeWidth={4} />
            <circle cx={x} cy={ey + 2} r={6} fill={C.ink} stroke="none" />
          </g>
        ) : (
          <circle key={x} cx={x} cy={ey} r={8} fill={C.ink} stroke="none" />
        ),
      )}
      <path d="M-42 -738 L-16 -742 M16 -742 L42 -738" strokeWidth={5} />
      <path d="M-3 -694 Q6 -682 -2 -677" strokeWidth={4} />
      {mouth === "smile" ? <path d="M-22 -664 Q0 -644 22 -664" strokeWidth={5} /> : null}
      {mouth === "grin" ? <path d="M-28 -666 Q0 -630 28 -666 Z" strokeWidth={5} fill="#8a2f26" /> : null}
      {mouth === "flat" ? <path d="M-18 -658 L18 -658" strokeWidth={5} /> : null}
      {mouth === "worry" ? <path d="M-20 -650 Q0 -666 20 -650" strokeWidth={5} /> : null}
      {mouth === "o" ? <ellipse cx={0} cy={-656} rx={11} ry={14} fill="#8a2f26" strokeWidth={4} /> : null}
      {mouth === "open" ? <ellipse cx={0} cy={-656} rx={20} ry={17} fill="#8a2f26" strokeWidth={4} /> : null}
    </g>
  );
};

const Lungs: React.FC<{ o: number; breath: number }> = ({ o, breath }) => {
  const k = 0.92 + 0.16 * breath;
  const lobe = "M-14 -568 C-62 -572 -84 -512 -80 -462 C-78 -440 -42 -440 -16 -462 Z";
  return (
    <g opacity={o}>
      <ellipse cx={0} cy={-510} rx={96} ry={88} fill="#2d3b3a" opacity={0.25} />
      <g transform={`translate(0 -515) scale(${k}) translate(0 515)`}>
        <path d={lobe} fill={C.lung} stroke={C.ink} strokeWidth={5} />
        <path d={lobe} transform="scale(-1 1)" fill={C.lung} stroke={C.ink} strokeWidth={5} />
        <path d="M0 -612 L0 -566 M0 -566 L-22 -540 M0 -566 L22 -540" stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
};

/* ---------- eşyalar ve işaretler ---------- */

const HandText: React.FC<{
  x: number;
  y: number;
  text: string;
  size?: number;
  color?: string;
  p: number; // yazılma ilerlemesi 0..1
  anchor?: "start" | "middle" | "end";
  rotate?: number;
}> = ({ x, y, text, size = 80, color = C.ink, p, anchor = "middle", rotate = -3 }) => {
  const id = svgId(useId());
  if (p <= 0) return null;
  const w = text.length * size * 0.5 + 20;
  const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  return (
    <g transform={`rotate(${rotate} ${x} ${y})`}>
      <clipPath id={`c${id}`}>
        <rect x={left - 10} y={y - size * 1.1} width={(w + 20) * p} height={size * 1.6} />
      </clipPath>
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        fontFamily={handFamily}
        fontWeight={700}
        fontSize={size}
        fill={color}
        clipPath={`url(#c${id})`}
      >
        {text}
      </text>
    </g>
  );
};

const Drop: React.FC<{ x: number; y: number; s?: number; color?: string; o?: number }> = ({ x, y, s = 1, color = C.water, o = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
    <path d="M0 -24 C9 -9 15 0 15 9 A15 15 0 0 1 -15 9 C-15 0 -9 -9 0 -24 Z" fill={color} stroke={C.ink} strokeWidth={4} />
    <ellipse cx={-5} cy={6} rx={3.5} ry={6} fill="#fff" opacity={0.6} />
  </g>
);

// Nefesle çıkan bulut: ağızdan çıkar, büyür, yukarı-yana süzülür ve kaybolur
const Puff: React.FC<{ x: number; y: number; p: number; dx?: number; dy?: number; label?: string; s?: number }> = ({
  x,
  y,
  p,
  dx = 190,
  dy = -150,
  label,
  s = 1,
}) => {
  const e = Easing.out(Easing.quad)(p);
  const r = (12 + 36 * e) * s;
  const o = interpolate(p, [0, 0.12, 0.7, 1], [0, 0.95, 0.85, 0]);
  const cx = x + dx * e;
  const cy = y + dy * e;
  return (
    <g opacity={o}>
      {[
        [0, 0, 1],
        [-0.8, 0.35, 0.7],
        [0.8, 0.3, 0.75],
        [0.1, -0.55, 0.75],
      ].map(([ox, oy, k], i) => (
        <circle key={i} cx={cx + ox * r} cy={cy + oy * r} r={r * k} fill="#d9d6cf" stroke={C.ink} strokeWidth={4} />
      ))}
      {[
        [0, 0, 1],
        [-0.8, 0.35, 0.7],
        [0.8, 0.3, 0.75],
        [0.1, -0.55, 0.75],
      ].map(([ox, oy, k], i) => (
        <circle key={`f${i}`} cx={cx + ox * r} cy={cy + oy * r} r={r * k - 3} fill="#dcd9d2" />
      ))}
      {label ? (
        <text x={cx} y={cy + r * 0.3} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={r * 0.95} fill={C.ink}>
          {label}
        </text>
      ) : null}
    </g>
  );
};

// Düşünce balonu: daireler çevreye dizilir, önce çizgiler sonra dolgu (iç çizgiler kaybolur)
const Bubble: React.FC<{ x: number; y: number; rx: number; ry: number; p: number; tail: [number, number]; children?: React.ReactNode }> = ({
  x,
  y,
  rx,
  ry,
  p,
  tail,
  children,
}) => {
  if (p <= 0) return null;
  const n = 11;
  const circles = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [x + Math.cos(a) * rx, y + Math.sin(a) * ry, (ry * 0.42) * (0.85 + 0.3 * random(`b${i}`))];
  });
  const dots = [0.35, 0.62, 0.85].map((k, i) => [x + (tail[0] - x) * k, y + ry * 0.8 + (tail[1] - y - ry * 0.8) * k, 22 - i * 6]);
  return (
    <g transform={`translate(${x} ${y}) scale(${p}) translate(${-x} ${-y})`}>
      {dots.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={C.cream} stroke={C.ink} strokeWidth={5} />
      ))}
      {circles.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={C.cream} stroke={C.ink} strokeWidth={7} />
      ))}
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={C.cream} />
      {circles.map(([cx, cy, r], i) => (
        <circle key={`f${i}`} cx={cx} cy={cy} r={r - 3.5} fill={C.cream} />
      ))}
      {children}
    </g>
  );
};

const Cross: React.FC<{ x: number; y: number; size: number; p: number }> = ({ x, y, size, p }) => {
  const a = tw(p, 0, 0.5);
  const b = tw(p, 0.5, 1);
  return (
    <g stroke={C.red} strokeWidth={22} strokeLinecap="round" fill="none">
      {a > 0 ? (
        <path d={`M${x - size} ${y - size} L${x + size} ${y + size}`} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - a} />
      ) : null}
      {b > 0 ? (
        <path d={`M${x + size} ${y - size} L${x - size} ${y + size}`} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - b} />
      ) : null}
    </g>
  );
};

const Arrow: React.FC<{ d: string; p: number; color?: string; w?: number }> = ({ d, p, color = C.ink, w = 8 }) =>
  p > 0 ? (
    <path
      d={d}
      pathLength={1}
      strokeDasharray="1"
      strokeDashoffset={1 - p}
      stroke={color}
      strokeWidth={w}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ) : null;

const Star: React.FC<{ x: number; y: number; r: number; rot: number }> = ({ x, y, r, rot }) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = ((i * 36 + rot) * Math.PI) / 180;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(x + Math.sin(a) * rr).toFixed(1)},${(y - Math.cos(a) * rr).toFixed(1)}`;
  });
  return <polygon points={pts.join(" ")} fill={C.yellow} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />;
};

const Bathroom: React.FC<{ x: number; y: number; value: string }> = ({ x, y, value }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-190} y={-54} width={380} height={58} rx={18} fill="#dcd6c8" stroke={C.ink} strokeWidth={8} />
    <rect x={-78} y={-44} width={156} height={38} rx={8} fill="#26332b" stroke={C.ink} strokeWidth={5} />
    <text x={0} y={-14} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={40} fill="#b8f28a">
      {value}
    </text>
  </g>
);

// Gizem kutusu: üstünde "?" olan kapalı karton kutu. Cevap söylenene kadar kapalı kalır ve sallanır
// (izleyici "içinde ne var?" diye bekler); open 0 → 1 iken kapak uçar, içerik ışıkla yukarı yükselir.
const MysteryBox: React.FC<{
  x: number;
  y: number;
  s?: number;
  p: number; // beliriş
  open: number;
  shake?: number; // derece
  rays?: boolean;
  children?: React.ReactNode; // kutu merkezine göre çizilen içerik
}> = ({ x, y, s = 1, p, open, shake = 0, rays = true, children }) => {
  if (p <= 0) return null;
  const rise = Easing.out(Easing.back(1.6))(open);
  return (
    <g transform={`translate(${x} ${y}) scale(${s * p}) rotate(${shake})`}>
      {rays && open > 0
        ? Array.from({ length: 9 }, (_, i) => {
            const a = ((-80 + i * 20) * Math.PI) / 180;
            return (
              <path
                key={i}
                d={`M${Math.sin(a) * 70} ${-100 - Math.cos(a) * 40} L${Math.sin(a) * 260} ${-100 - Math.cos(a) * 230}`}
                stroke={C.yellow}
                strokeWidth={14}
                strokeLinecap="round"
                opacity={0.75 * open}
              />
            );
          })
        : null}
      {children && open > 0 ? (
        <g transform={`translate(0 ${-60 - 150 * rise}) scale(${0.3 + 0.7 * rise})`} opacity={Math.min(1, open * 2)}>
          {children}
        </g>
      ) : null}
      <rect x={-110} y={-90} width={220} height={170} rx={8} fill="#c99a5c" stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
      <rect x={-18} y={-90} width={36} height={170} fill="#e0bb7f" opacity={0.8} />
      <text x={0} y={42} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={130} fill={C.ink} opacity={1 - open}>
        ?
      </text>
      <g transform={`translate(${-90 * open} ${-170 * open}) rotate(${-40 * open})`} opacity={1 - tw(open, 0.5, 1)}>
        <rect x={-122} y={-114} width={244} height={30} rx={8} fill="#b8864a" stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
      </g>
    </g>
  );
};

// Sayaç: hedef sayıya kadar hızla döner (merak), p = 1 olunca sabitlenir ve son eki görünür
const fmtNum = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const Counter: React.FC<{
  x: number;
  y: number;
  to: number;
  p: number;
  prefix?: string;
  suffix?: string;
  size?: number;
  color?: string;
  rotate?: number;
}> = ({ x, y, to, p, prefix = "", suffix = "", size = 150, color = C.ink, rotate = -4 }) => {
  if (p <= 0) return null;
  const n = Math.round(to * Easing.out(Easing.quad)(p));
  const done = p >= 1;
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontFamily={handFamily}
      fontWeight={700}
      fontSize={size}
      fill={color}
      transform={`rotate(${rotate} ${x} ${y})`}
      opacity={Math.min(1, p * 4)}
    >
      {prefix}
      {fmtNum(n)}
      {done ? suffix : ""}
    </text>
  );
};

/* ---------- sahneler ---------- */

const PX = 540;
const PY = 1330;

// "Beş kilo verdin. Peki o yağ nereye gitti?"
const Tarti: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const belly = tw(f, w(0), w(2) + 18, 1, 0.42);
  const kg = tw(f, w(0), w(2) + 18, 85, 80);
  const cheer = tw(f, w(2) + 4, w(2) + 12) - tw(f, w(3) + 2, w(3) + 12);
  const think = tw(f, w(4), w(4) + 12);
  const ghost = tw(f, w(5), w(7) + 2);
  const lift = Math.abs(Math.sin(f / 5)) * cheer;
  // yağ "?" kutusuna girer, kutu kapanır ve sallanır: cevap videonun devamında
  const box = pop(f, w(5) - 6, 14);
  const lid = tw(f, w(5) - 6, w(5) + 4) - tw(f, w(7) + 2, w(7) + 10);
  const shut = f > w(7) + 10;
  return (
    <>
      <Bathroom x={PX} y={PY + 6} value={`${kg.toFixed(1)} kg`} />
      <Person
        x={PX}
        y={PY - 58 - lift * 18}
        s={0.95}
        belly={belly}
        armL={[10 + 150 * cheer, -10 * cheer]}
        armR={[10 + 150 * cheer + 140 * think * (1 - cheer), -10 * cheer - 135 * think]}
        mouth={think > 0.5 ? "worry" : cheer > 0.3 ? "grin" : "smile"}
        eyes={think > 0.5 ? "wide" : "open"}
        tilt={-8 * think}
      >
        {/* kaybolan yağ: göbekten ayrılıp süzülür ve gözden kaybolur */}
        {ghost > 0 && ghost < 1 ? (
          <g opacity={interpolate(ghost, [0, 0.15, 0.85, 1], [0, 0.9, 0.9, 0])}>
            <path
              d="M-60 0 C-70 -50 -20 -70 10 -55 C50 -75 80 -30 60 0 C70 40 20 55 -10 40 C-50 55 -75 30 -60 0 Z"
              transform={`translate(${-260 * ghost} ${-445 - 330 * ghost}) scale(${1 - 0.3 * ghost})`}
              fill={C.fat}
              stroke={C.fatDark}
              strokeWidth={6}
              strokeDasharray="14 10"
            />
          </g>
        ) : null}
      </Person>
      <MysteryBox x={300} y={600} s={1.05} p={box} open={lid} rays={false} shake={shut ? Math.sin(f / 2.4) * 6 : 0} />
      {[w(6), w(7)].map((t, i) => {
        const p = pop(f, t, 12);
        return p > 0 ? (
          <text
            key={i}
            x={i ? 800 : 640}
            y={i ? 560 : 420}
            textAnchor="middle"
            fontFamily={handFamily}
            fontWeight={700}
            fontSize={(i ? 190 : 120) * p}
            fill={C.ink}
            transform={`rotate(${i ? 12 : -10} ${i ? 800 : 640} ${i ? 560 : 420})`}
          >
            ?
          </text>
        ) : null;
      })}
    </>
  );
};

// "Çoğu insan yağın eridiğini ya da tere dönüştüğünü sanır. İkisi de doğru değil."
const YanlisFikir: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const left = pop(f, w(2) - 4, 14);
  const right = pop(f, w(6) - 4, 14);
  const melt = tw(f, w(3), w(3) + 45);
  const x1 = tw(f, w(11) - 2, w(11) + 10);
  const x2 = tw(f, w(11) + 6, w(11) + 18);
  const shock = f > w(12);
  return (
    <>
      <Person
        x={PX}
        y={PY + 20}
        s={0.82}
        belly={0.42}
        armL={[12, 0]}
        armR={[28, -158]}
        mouth={shock ? "o" : "flat"}
        eyes={shock ? "wide" : "open"}
        lookY={-4}
        tilt={4}
      />
      <Bubble x={300} y={520} rx={190} ry={150} p={left} tail={[470, 760]}>
        {/* eriyen tereyağı gibi yağ */}
        <ellipse cx={300} cy={590} rx={70 + 60 * melt} ry={14 + 8 * melt} fill={C.fat} stroke={C.fatDark} strokeWidth={5} />
        <path
          d={`M240 ${590 - 90 * (1 - 0.55 * melt)} L360 ${590 - 90 * (1 - 0.55 * melt)} L360 585 L240 585 Z`}
          fill={C.fat}
          stroke={C.fatDark}
          strokeWidth={6}
          strokeLinejoin="round"
        />
        {[255, 300, 340].map((x, i) => (
          <path
            key={i}
            d={`M${x - 10} ${590 - 90 * (1 - 0.55 * melt)} Q${x} ${560 + 30 * melt + i * 6} ${x + 10} ${590 - 90 * (1 - 0.55 * melt)}`}
            fill={C.fat}
            stroke={C.fatDark}
            strokeWidth={4}
          />
        ))}
        <HandText x={300} y={470} text="Eridi mi?" size={64} p={tw(f, w(3), w(3) + 14)} />
      </Bubble>
      <Bubble x={780} y={460} rx={190} ry={150} p={right} tail={[620, 720]}>
        <Drop x={780} y={530} s={2.6} />
        {cycles(f, w(6), 14, 30).map(({ k, p }) => (
          <Drop key={k} x={720 + (k % 3) * 60} y={540 + 60 * p} s={0.8} o={1 - p} />
        ))}
        <HandText x={780} y={410} text="Tere mi döndü?" size={58} p={tw(f, w(7), w(7) + 14)} />
      </Bubble>
      {left > 0 ? <Cross x={300} y={520} size={130} p={x1} /> : null}
      {right > 0 ? <Cross x={780} y={460} size={130} p={x2} /> : null}
    </>
  );
};

// "Yağ yakıldığında karbondioksit ve suya dönüşür."
const CELLS = [
  [-110, -105],
  [5, -125],
  [115, -95],
  [-165, 10],
  [-55, -5],
  [60, 5],
  [170, 20],
  [-100, 115],
  [15, 120],
  [125, 115],
];
const YagHucresi: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const id = svgId(useId());
  const L = { x: 720, y: 700, r: 250 };
  const person = { x: 290, y: PY, s: 0.84 };
  const B = { x: person.x, y: person.y - 450 * person.s };
  // 1. sahnedeki "?" kutusu burada açılır: içinden büyüteç çıkar
  const open = tw(f, w(1) - 4, w(1) + 12);
  const boxShake = f < w(1) - 4 ? Math.sin(f / 2.4) * 6 : 0;
  const v = [L.x - B.x, L.y - B.y];
  const len = Math.hypot(v[0], v[1]);
  const n = [-v[1] / len, v[0] / len];
  const start = w(1);
  const step = Math.max(3, (w(5) - w(1)) / CELLS.length);
  return (
    <>
      <Person x={person.x} y={person.y} s={person.s} belly={0.42} armL={[10, 0]} armR={[14, 0]} tilt={6} lookY={-3} mouth="o" />
      <g opacity={1 - tw(f, w(1) + 4, w(1) + 14)}>
        <MysteryBox x={L.x} y={L.y + 60} s={1.2} p={pop(f, 0, 12)} open={tw(f, w(1) - 4, w(1) + 6)} rays={false} shake={boxShake} />
      </g>
      <g opacity={open}>
        <circle cx={B.x} cy={B.y} r={46} fill="none" stroke={C.ink} strokeWidth={6} strokeDasharray="12 9" />
        {[1, -1].map((k) => (
          <path
            key={k}
            d={`M${B.x + n[0] * 46 * k} ${B.y + n[1] * 46 * k} L${L.x + n[0] * L.r * k} ${L.y + n[1] * L.r * k}`}
            stroke={C.ink}
            strokeWidth={5}
            strokeDasharray="14 10"
            opacity={0.55}
          />
        ))}
      </g>
      <g transform={`translate(${L.x} ${L.y}) scale(${open}) translate(${-L.x} ${-L.y})`}>
        <clipPath id={`lens${id}`}>
          <circle cx={L.x} cy={L.y} r={L.r} />
        </clipPath>
        <circle cx={L.x} cy={L.y} r={L.r} fill="#f3d2b0" />
        <g clipPath={`url(#lens${id})`}>
          {CELLS.map(([cx, cy], i) => {
            const p = tw(f, start + i * step, start + i * step + 22);
            const X = L.x + cx;
            const Y = L.y + cy;
            return (
              <g key={i}>
                {p < 1 ? (
                  <g transform={`translate(${X} ${Y}) scale(${1 - 0.9 * p})`} opacity={1 - p * 0.6}>
                    <circle r={58} fill={C.fat} stroke={C.fatDark} strokeWidth={6} />
                    <ellipse cx={-18} cy={-20} rx={16} ry={10} fill="#fff4c8" opacity={0.7} />
                  </g>
                ) : null}
                {p > 0
                  ? [0, 1, 2, 3].map((k) => {
                      const a = random(`a${i}${k}`) * Math.PI * 2;
                      const dist = 30 + 110 * Easing.out(Easing.quad)(p);
                      const px = X + Math.cos(a) * dist;
                      const py = Y + Math.sin(a) * dist - 40 * p;
                      // adı söylenene kadar parçacık bir "?" (ne olduğu merak edilir)
                      const named = f >= (k < 3 ? w(2) : w(4)) - 2;
                      if (!named)
                        return (
                          <text key={k} x={px} y={py + 14} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={44} fill={k < 3 ? "#6d6f74" : C.water} opacity={Math.min(1, p * 3)}>
                            ?
                          </text>
                        );
                      return k < 3 ? (
                        <circle key={k} cx={px} cy={py} r={15} fill={C.co2} stroke={C.ink} strokeWidth={4} opacity={Math.min(1, p * 3)} />
                      ) : (
                        <Drop key={k} x={px} y={py} s={0.9} o={Math.min(1, p * 3)} />
                      );
                    })
                  : null}
              </g>
            );
          })}
        </g>
        <circle cx={L.x} cy={L.y} r={L.r} fill="none" stroke={C.ink} strokeWidth={16} />
        <circle cx={L.x} cy={L.y} r={L.r - 14} fill="none" stroke="#fff6dc" strokeWidth={5} opacity={0.6} />
        <path d={`M${L.x - 150} ${L.y - 150} A210 210 0 0 1 ${L.x + 20} ${L.y - 210}`} stroke="#fff" strokeWidth={10} fill="none" opacity={0.5} strokeLinecap="round" />
      </g>
      <g opacity={tw(f, w(2) - 2, w(2) + 8)}>
        <circle cx={590} cy={1035} r={24} fill={C.co2} stroke={C.ink} strokeWidth={5} />
        <HandText x={630} y={1058} text="CO₂" size={72} anchor="start" p={tw(f, w(2), w(2) + 12)} />
      </g>
      <g opacity={tw(f, w(4) - 2, w(4) + 8)}>
        <Drop x={810} y={1035} s={1.4} />
        <HandText x={845} y={1058} text="su" size={72} anchor="start" p={tw(f, w(4), w(4) + 10)} />
      </g>
    </>
  );
};

// "Bunun yüzde seksen dördü, nefes verirken akciğerlerinden dışarı çıkar."
const Nefes: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const s = 1;
  const mouth = { x: PX, y: PY - 656 * s };
  const period = 42;
  const start = w(4) - 10;
  const phase = f < start ? 0 : ((f - start) % period) / period;
  const exhaling = f >= start && phase < 0.5;
  const breath = f < start ? 0.5 + 0.5 * Math.sin(f / 10) : exhaling ? 1 - phase * 2 : (phase - 0.5) * 2;
  return (
    <>
      <Person
        x={PX}
        y={PY}
        s={s}
        belly={tw(f, w(4), d, 0.42, 0.34)}
        armL={[14, 0]}
        armR={[14, 0]}
        lungs={tw(f, w(5), w(6) + 4)}
        breath={breath}
        mouth={exhaling ? "o" : "smile"}
        eyes={exhaling ? "closed" : "open"}
      />
      {cycles(f, start, period, 54).map(({ k, p }) => (
        <Puff key={k} x={mouth.x + 30} y={mouth.y} p={p} dx={200} dy={-200} label="CO₂" s={1.25} />
      ))}
      <Counter x={260} y={480} to={84} prefix="%" p={tw(f, w(0), w(3) + 4)} size={170} color={C.red} />
      <Arrow d="M380 470 Q520 380 690 450" p={tw(f, w(4), w(4) + 14)} color={C.red} w={9} />
      <Arrow d="M668 420 L692 452 L655 466" p={tw(f, w(4) + 12, w(4) + 18)} color={C.red} w={9} />
    </>
  );
};

// "Geri kalanı su olarak ter ve idrarla atılır."
const Su: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const wipe = tw(f, w(4) - 4, w(4) + 8) - tw(f, w(6), w(6) + 10);
  return (
    <>
      <Person
        x={PX}
        y={PY}
        belly={0.34}
        armL={[12, 0]}
        armR={[30 + 120 * wipe, -150 * wipe]}
        mouth="flat"
        eyes={wipe > 0.5 ? "closed" : "open"}
        blush={0.7}
      >
        {cycles(f, w(4), 9, 34).map(({ k, p }) => {
          const x = [-50, 40, -10, 60, -70][k % 5];
          const y0 = -760 + (k % 3) * 20;
          return <Drop key={k} x={x + (x > 0 ? 40 : -40) * p} y={y0 + 300 * p * p} s={1.1} o={interpolate(p, [0, 0.1, 0.8, 1], [0, 1, 1, 0])} />;
        })}
        {cycles(f, w(4) + 5, 13, 30).map(({ k, p }) => (
          <Drop key={`a${k}`} x={(k % 2 ? 1 : -1) * 150} y={-470 + 220 * p * p} s={0.9} o={1 - p} />
        ))}
      </Person>
      <ellipse cx={PX} cy={PY + 18} rx={60 + 120 * tw(f, w(4), w(7) + 20)} ry={12 + 10 * tw(f, w(4), w(7) + 20)} fill={C.water} opacity={0.45} />
      <g>
        <Drop x={300} y={460} s={2.4 * pop(f, w(2) - 3)} />
        <Counter x={530} y={490} to={16} prefix="%" suffix=" su" p={tw(f, w(0), w(2) + 2)} size={110} color={C.water} rotate={-3} />
      </g>
    </>
  );
};

// "Peki hızlı hızlı nefes alsan, daha çok yağ yakar mısın? Hayır."
const HizliNefes: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const pant = f >= w(1);
  const dizzy = f >= w(10);
  const fast = Math.sin(f * 0.9);
  const wobble = dizzy ? Math.sin(f / 5) * 7 : 0;
  const mouth = { x: PX, y: PY - 656 };
  return (
    <>
      <Person
        x={PX + wobble * 3}
        y={PY + (pant ? Math.abs(fast) * 6 : 0)}
        belly={0.42}
        armL={[14 + (pant ? 4 * fast : 0), 0]}
        armR={[14 - (pant ? 4 * fast : 0), 0]}
        mouth={pant ? (fast > 0 ? "open" : "o") : "smile"}
        eyes={dizzy ? "dizzy" : pant ? "wide" : "open"}
        lungs={pant ? 0.9 : 0}
        breath={0.5 + 0.5 * fast}
        tilt={wobble}
        blush={pant ? 0.8 : 0.4}
      >
        {dizzy
          ? [0, 1, 2].map((i) => {
              const a = f / 7 + (i * Math.PI * 2) / 3;
              return <Star key={i} x={Math.cos(a) * 115} y={-800 + Math.sin(a) * 26} r={24} rot={f * 6} />;
            })
          : null}
      </Person>
      {pant && !dizzy
        ? cycles(f, w(1), 9, 18).map(({ k, p }) => <Puff key={k} x={mouth.x + 25} y={mouth.y} p={p} dx={120} dy={-60 + (k % 3) * 40} s={0.6} />)
        : null}
      <Gauge x={260} y={600} f={f} start={w(1)} drop={w(10)} />
      <HandText x={760} y={560} text="Hayır!" size={150} p={tw(f, w(10), w(10) + 10)} color={C.red} rotate={-8} />
      <HandText x={250} y={880} text="yağ aynı" size={74} p={tw(f, w(10) + 8, w(10) + 22)} />
      <Arrow d="M300 900 Q360 960 430 935" p={tw(f, w(10) + 18, w(10) + 28)} w={7} />
    </>
  );
};

// "Yağ yakımı" göstergesi: nefes hızlandıkça ibre umutla titreyerek yükselir ("?" yanıp söner),
// "Hayır" denince ibre başa düşer
const Gauge: React.FC<{ x: number; y: number; f: number; start: number; drop: number }> = ({ x, y, f, start, drop }) => {
  const show = pop(f, start - 4, 14);
  if (show <= 0) return null;
  const hope = tw(f, start, drop, 0, 1);
  const jitter = f >= start && f < drop ? Math.sin(f / 2.2) * 9 + Math.sin(f / 5.3) * 6 : 0;
  const fall = tw(f, drop, drop + 8);
  const angle = (-62 + 110 * hope + jitter) * (1 - fall) + -62 * fall;
  const a = (angle * Math.PI) / 180;
  const R = 130;
  const arc = (from: number, to: number) => {
    const p = (d: number) => [Math.sin((d * Math.PI) / 180) * R, -Math.cos((d * Math.PI) / 180) * R];
    const [x1, y1] = p(from);
    const [x2, y2] = p(to);
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  return (
    <g transform={`translate(${x} ${y}) scale(${show})`}>
      <path d={`${arc(-90, 90)} Z`} fill={C.cream} stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
      <path d={arc(-80, -30)} stroke="#9a9a9a" strokeWidth={18} fill="none" />
      <path d={arc(-28, 28)} stroke={C.yellow} strokeWidth={18} fill="none" />
      <path d={arc(30, 80)} stroke={C.glow} strokeWidth={18} fill="none" />
      <path d={`M0 0 L${(Math.sin(a) * (R - 24)).toFixed(1)} ${(-Math.cos(a) * (R - 24)).toFixed(1)}`} stroke={fall > 0.5 ? C.red : C.ink} strokeWidth={10} strokeLinecap="round" />
      <circle r={16} fill={C.ink} />
      <text x={0} y={70} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={54} fill={C.ink}>
        yağ yakımı
      </text>
      {f >= start && f < drop ? (
        <text x={150} y={-110} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={110} fill={C.ink} opacity={0.5 + 0.5 * Math.abs(Math.sin(f / 6))}>
          ?
        </text>
      ) : null}
    </g>
  );
};

// "Önce kasların bu yağı yakıt olarak kullanmalı. Bu da ancak hareketle olur."
const Hareket: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const run = f / 4.2;
  const l = Math.max(0, Math.sin(run));
  const r = Math.max(0, -Math.sin(run));
  const bob = Math.abs(Math.sin(run)) * 16;
  const flowStart = w(3);
  const burn = tw(f, w(4) - 3, w(4) + 10);
  const s = 0.95;
  const mouth = { x: PX, y: PY - bob - 656 * s };
  return (
    <>
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${170 - i * 20} ${1060 + i * 90} l-90 0`}
          stroke={C.ink}
          strokeWidth={7}
          strokeLinecap="round"
          opacity={0.45 + 0.3 * Math.sin(f / 3 + i)}
        />
      ))}
      <Person
        x={PX}
        y={PY - bob}
        s={s}
        belly={tw(f, flowStart, d, 0.42, 0.24)}
        legL={{ lift: l }}
        legR={{ lift: r }}
        armL={[18 + 22 * r, -130 + 30 * l]}
        armR={[18 + 22 * l, -130 + 30 * r]}
        mouth="o"
        legGlow={tw(f, w(1) - 2, w(1) + 10) * (0.5 + 0.5 * burn)}
        blush={0.7}
      >
        {/* yağ parçacıkları göbekten bacak kaslarına akar, orada yanar */}
        {cycles(f, flowStart, 5, 26).map(({ k, p }) => {
          const side = k % 2 ? 1 : -1;
          const x = side * (30 + 20 * p) + Math.sin(k) * 15;
          const y = -440 + 230 * p;
          const lit = p > 0.7 ? burn : 0;
          return (
            <g key={k}>
              <circle cx={x} cy={y} r={13 * (1 - 0.4 * p)} fill={lit ? C.glow : C.fat} stroke={C.fatDark} strokeWidth={3} opacity={interpolate(p, [0, 0.1, 0.85, 1], [0, 1, 1, 0])} />
            </g>
          );
        })}
      </Person>
      {cycles(f, w(7), 22, 46).map(({ k, p }) => (
        <Puff key={k} x={mouth.x + 30} y={mouth.y} p={p} dx={200} dy={-170} label="CO₂" />
      ))}
      <HandText x={250} y={500} text="yakıt" size={110} p={tw(f, w(4), w(4) + 12)} color={C.glow} />
      <Arrow d="M260 530 Q300 760 450 980" p={tw(f, w(4) + 6, w(4) + 20)} color={C.glow} w={8} />
    </>
  );
};

// "Yani yağı hareketle yakar, nefesinle dışarı verirsin. Bunu kaydet, unutma."
const Kapanis: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const thumbs = tw(f, w(8) - 3, w(8) + 8);
  const s = 0.9;
  const mouth = { x: PX + 140, y: PY - 656 * s };
  const save = pop(f, w(7), 14);
  return (
    <>
      <Person
        x={PX + 140}
        y={PY}
        s={s}
        belly={0.22}
        armL={[45, -110]}
        armR={[45 + 120 * thumbs, -110 + 70 * thumbs]}
        mouth={f > w(4) && f < w(6) + 10 ? "o" : "grin"}
        eyes={f > w(4) && f < w(6) + 10 ? "closed" : "open"}
      />
      {cycles(f, w(4), 40, 50)
        .filter(({ k }) => k < 2)
        .map(({ k, p }) => (
          <Puff key={k} x={mouth.x + 25} y={mouth.y} p={p} dx={160} dy={-160} label="CO₂" />
        ))}
      <HandText x={110} y={430} text="hareket → yakar" size={92} anchor="start" p={tw(f, w(1), w(3) + 6)} />
      <HandText x={110} y={560} text="nefes → dışarı" size={92} anchor="start" p={tw(f, w(4), w(6) + 4)} />
      {save > 0 ? (
        <g transform={`translate(250 900) scale(${save}) rotate(-6)`}>
          <path d="M-70 -95 L70 -95 L70 100 L0 50 L-70 100 Z" fill={C.yellow} stroke={C.ink} strokeWidth={10} strokeLinejoin="round" />
          <text x={0} y={175} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={80} fill={C.ink}>
            kaydet
          </text>
        </g>
      ) : null}
    </>
  );
};

/* ---------- 02 tartı: eşyalar ---------- */

const Moon: React.FC<{ x: number; y: number; s?: number; o?: number }> = ({ x, y, s = 1, o = 1 }) =>
  o > 0 ? (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <path d="M10 -70 A70 70 0 1 0 10 70 A56 56 0 1 1 10 -70 Z" fill={C.cream} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
      {[
        [-150, -40, 10],
        [80, 50, 8],
        [-120, 70, 7],
      ].map(([sx, sy, r], i) => (
        <Star key={i} x={sx} y={sy} r={r * 1.6} rot={0} />
      ))}
    </g>
  ) : null;

const Sun: React.FC<{ x: number; y: number; s?: number; o?: number; rot?: number }> = ({ x, y, s = 1, o = 1, rot = 0 }) =>
  o > 0 ? (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <g transform={`rotate(${rot})`} stroke={C.ink} strokeWidth={7} strokeLinecap="round">
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i * 36 * Math.PI) / 180;
          return <path key={i} d={`M${Math.sin(a) * 82} ${Math.cos(a) * 82} L${Math.sin(a) * 110} ${Math.cos(a) * 110}`} />;
        })}
      </g>
      <circle r={62} fill={C.yellow} stroke={C.ink} strokeWidth={7} />
    </g>
  ) : null;

const Burger: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinejoin="round">
    <path d="M-72 0 Q-76 -16 -58 -16 L58 -16 Q76 -16 72 0 Z" fill="#d79a4e" stroke={C.ink} strokeWidth={5} />
    <rect x={-78} y={-36} width={156} height={22} rx={11} fill="#6b3b22" stroke={C.ink} strokeWidth={5} />
    <path d="M-80 -38 l16 -9 l16 9 l16 -9 l16 9 l16 -9 l16 9 l16 -9 l16 9 l16 -9 l16 9" stroke="#5e9a3c" strokeWidth={8} fill="none" strokeLinecap="round" />
    <path d="M-74 -44 Q-74 -96 0 -96 Q74 -96 74 -44 Z" fill="#e0a65a" stroke={C.ink} strokeWidth={5} />
    {[
      [-30, -72],
      [8, -82],
      [36, -66],
      [-4, -60],
    ].map(([sx, sy], i) => (
      <ellipse key={i} cx={sx} cy={sy} rx={6} ry={3.5} fill={C.cream} />
    ))}
  </g>
);

const Cake: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinejoin="round">
    <rect x={-72} y={-80} width={144} height={80} rx={8} fill="#f3d7a8" stroke={C.ink} strokeWidth={5} />
    <rect x={-72} y={-48} width={144} height={14} fill="#c9566b" />
    <path d="M-74 -78 Q-60 -96 -45 -80 Q-30 -96 -15 -80 Q0 -96 15 -80 Q30 -96 45 -80 Q60 -96 74 -78" fill={C.cream} stroke={C.ink} strokeWidth={5} />
    <circle cx={0} cy={-100} r={13} fill={C.red} stroke={C.ink} strokeWidth={4} />
  </g>
);

const Calendar: React.FC<{ x: number; y: number; s?: number; mark: number }> = ({ x, y, s = 1, mark }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-95} y={-90} width={190} height={180} rx={14} fill={C.cream} stroke={C.ink} strokeWidth={7} />
    <path d="M-95 -50 L-95 -76 Q-95 -90 -81 -90 L81 -90 Q95 -90 95 -76 L95 -50 Z" fill={C.red} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
    {[-50, 50].map((rx) => (
      <rect key={rx} x={rx - 6} y={-104} width={12} height={30} rx={6} fill={C.ink} />
    ))}
    {Array.from({ length: 12 }, (_, i) => {
      const cx = -66 + (i % 4) * 44;
      const cy = -26 + Math.floor(i / 4) * 44;
      return <rect key={i} x={cx - 13} y={cy - 13} width={26} height={26} rx={4} fill="#e4d4b4" />;
    })}
    {[5, 6, 7].map((k, i) => {
      const cx = -66 + (k % 4) * 44;
      const cy = -26 + Math.floor(k / 4) * 44;
      const p = tw(mark, i / 3, (i + 1) / 3);
      return p > 0 ? (
        <circle key={k} cx={cx} cy={cy} r={20} fill="none" stroke={C.red} strokeWidth={6} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} />
      ) : null;
    })}
  </g>
);

const Stomach: React.FC<{ x: number; y: number; s?: number; fill: number }> = ({ x, y, s = 1, fill }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-30 -120 L-30 -70" stroke={C.ink} strokeWidth={26} strokeLinecap="round" />
    <path d="M-30 -120 L-30 -70" stroke={C.lung} strokeWidth={14} strokeLinecap="round" />
    <path
      d="M-40 -78 C-10 -100 85 -86 82 -10 C80 60 10 92 -45 66 C-95 42 -78 -4 -40 -6 C-20 -8 -70 -48 -40 -78 Z"
      fill={C.lung}
      stroke={C.ink}
      strokeWidth={7}
      strokeLinejoin="round"
    />
    {[
      [10, 30, "#8a5a2b"],
      [40, 0, "#5e9a3c"],
      [-20, 45, "#d79a4e"],
      [30, 45, "#c9566b"],
      [55, 25, "#d79a4e"],
    ].map(([fx, fy, c], i) => {
      const p = tw(fill, i / 5, (i + 1) / 5);
      return <circle key={i} cx={fx as number} cy={(fy as number) - 40 * (1 - p)} r={13 * p} fill={c as string} stroke={C.ink} strokeWidth={3} />;
    })}
  </g>
);

const Dumbbell: React.FC<{ x: number; y: number; s?: number; rot?: number }> = ({ x, y, s = 1, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`} stroke={C.ink} strokeWidth={6} strokeLinejoin="round">
    <rect x={-92} y={-9} width={184} height={18} rx={9} fill="#9a9a9a" />
    {[-1, 1].map((k) => (
      <g key={k}>
        <rect x={k * 70 - 16} y={-56} width={32} height={112} rx={8} fill="#4b4b55" />
        <rect x={k * 100 - 11} y={-40} width={22} height={80} rx={7} fill="#4b4b55" />
      </g>
    ))}
  </g>
);

/* ---------- 02 tartı: sahneler ---------- */

// "Dün akşam her şey normaldi. Bu sabah tartıya çıktın ve bir kilo fazla."
const TartiAcilis: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const morning = tw(f, w(5) - 4, w(5) + 16);
  const step = tw(f, w(7) - 2, w(8) + 8);
  const shock = tw(f, w(12) - 2, w(12) + 8);
  const shake = shock > 0 ? Math.sin(f / 2) * 3 * shock : 0;
  // tartı rakamları kararsızca titrer (bekleyiş), "fazla" denince 81.0'a oturur
  const settled = f >= w(12) - 2;
  const flicker = (79.2 + random(`kg${Math.floor(f / 3)}`) * 2.6).toFixed(1);
  return (
    <>
      <Moon x={790} y={430} o={1 - morning} />
      <Sun x={790} y={430 + 60 * (1 - morning)} o={morning} rot={f * 0.4} />
      <Bathroom x={PX + 60} y={PY + 6} value={step < 1 ? "--.-" : settled ? "81.0 kg" : `${flicker} kg`} />
      <Person
        x={interpolate(step, [0, 1], [PX - 230, PX + 60]) + shake}
        y={PY - 58 * step - Math.sin(step * Math.PI) * 60}
        s={0.95}
        belly={0.42}
        legL={{ lift: Math.sin(step * Math.PI) * 0.6 }}
        armL={[10 + 135 * shock, -140 * shock]}
        armR={[10 + 135 * shock, -140 * shock]}
        mouth={shock > 0.5 ? "o" : f < w(5) ? "smile" : "flat"}
        eyes={shock > 0.5 ? "wide" : f < w(5) ? "closed" : "open"}
        lookY={step > 0.5 && shock < 0.5 ? 10 : 0}
        tilt={step > 0.5 && shock < 0.5 ? 8 : 0}
      />
      <HandText x={270} y={600} text="+1 kg" size={150} p={tw(f, w(12), w(12) + 12)} color={C.red} rotate={-8} />
    </>
  );
};

// "Panik yapma. O bir kilo yağ değil."
const TartiPanik: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const calm = tw(f, w(1) + 2, w(2) + 8);
  const panic = 1 - calm;
  const wob = Math.sin(f / 2.5) * 6 * panic;
  const blob = pop(f, w(3) - 2, 14);
  const x = tw(f, w(6) - 2, w(6) + 14);
  return (
    <>
      <Bathroom x={PX + 120} y={PY + 6} value="81.0 kg" />
      <Person
        x={PX + 120 + wob}
        y={PY - 58}
        s={0.92}
        belly={0.42}
        armL={[150 * panic + 10 * calm, -150 * panic]}
        armR={[150 * panic + 10 * calm, -150 * panic]}
        mouth={panic > 0.5 ? "open" : "smile"}
        eyes={panic > 0.5 ? "wide" : f < w(3) ? "closed" : "open"}
        tilt={wob}
        blush={0.4 + 0.4 * panic}
      >
        {panic > 0.3
          ? cycles(f, 0, 7, 22).map(({ k, p }) => (
              <Drop key={k} x={(k % 2 ? 1 : -1) * (95 + 60 * p)} y={-760 + 120 * p * p} s={0.9} o={(1 - p) * panic} />
            ))
          : null}
      </Person>
      {calm > 0.2 && f < w(3) + 10
        ? cycles(f, w(2), 60, 50).map(({ k, p }) => <Puff key={k} x={PX + 150} y={PY - 58 - 600} p={p} dx={160} dy={-120} />)
        : null}
      {blob > 0 ? (
        <g transform={`translate(270 640) scale(${blob})`}>
          <path
            d="M-120 0 C-140 -100 -40 -140 20 -110 C100 -150 160 -60 120 0 C140 80 40 110 -20 80 C-100 110 -150 60 -120 0 Z"
            fill={C.fat}
            stroke={C.fatDark}
            strokeWidth={8}
          />
          <ellipse cx={-40} cy={-50} rx={34} ry={18} fill="#fff4c8" opacity={0.7} />
          <text x={0} y={30} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={90} fill={C.ink}>
            1 kg
          </text>
        </g>
      ) : null}
      {blob > 0 ? <Cross x={270} y={640} size={150} p={x} /> : null}
    </>
  );
};

// "Bir kilo yağ için yaklaşık yedi bin yedi yüz kalori fazla yemen gerekir. Tek gecede mi? Neredeyse imkânsız."
const TartiKalori: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const n = 9;
  const t0 = w(4);
  const step = Math.max(3, (w(12) - t0) / n);
  const night = pop(f, w(13) - 2, 14);
  const no = f >= w(16);
  const shakeHead = no ? Math.sin((f - w(16)) / 3) * 8 * (1 - tw(f, w(17) + 10, w(17) + 30)) : 0;
  return (
    <>
      <ellipse cx={290} cy={PY + 4} rx={140} ry={26} fill={C.cream} stroke={C.ink} strokeWidth={7} />
      {Array.from({ length: n }, (_, i) => {
        const p = tw(f, t0 + i * step, t0 + i * step + 10);
        if (p <= 0) return null;
        const y = PY - 8 - i * 88 - 140 * (1 - p);
        const sway = Math.sin(f / 18 + i * 0.7) * i * 1.4;
        const Item = i % 2 ? Cake : Burger;
        return (
          <g key={i} opacity={Math.min(1, p * 2)}>
            <Item x={290 + sway} y={y} s={0.95} />
          </g>
        );
      })}
      <Person
        x={790}
        y={PY}
        s={0.82}
        belly={0.42}
        armL={[14, 0]}
        armR={[14, 0]}
        mouth={no ? "grin" : f >= w(9) ? "o" : "flat"}
        eyes={f >= w(9) && !no ? "wide" : "open"}
        lookY={no ? 0 : -6}
        tilt={no ? shakeHead : -10 * tw(f, w(4), w(6))}
      />
      <Counter x={760} y={470} to={7700} suffix=" kcal" p={tw(f, w(5), w(9) + 4)} size={120} color={C.red} />
      <Moon x={830} y={250} s={0.7 * night} o={night > 0 ? 1 : 0} />
      <Cross x={290} y={950} size={200} p={tw(f, w(17) - 2, w(17) + 14)} />
    </>
  );
};

// "Asıl sebep su. Kasların karbonhidrat depolarken yanında üç katı su tutar."
const GRAINS = [
  [-120, -100],
  [25, -130],
  [140, -50],
  [-160, 30],
  [-20, 10],
  [115, 85],
  [-70, 140],
];
const TartiSu: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const id = svgId(useId());
  const L = { x: 720, y: 760, r: 250 };
  const person = { x: 270, y: PY, s: 0.84 };
  const B = { x: person.x + 47 * person.s, y: person.y - 262 * person.s };
  const open = tw(f, 0, 16);
  const v = [L.x - B.x, L.y - B.y];
  const len = Math.hypot(v[0], v[1]);
  const nrm = [-v[1] / len, v[0] / len];
  const gStart = w(4) - 4;
  const gStep = Math.max(3, (w(6) - gStart) / GRAINS.length);
  const wStart = w(7) - 4;
  const wStep = Math.max(2, (w(10) - wStart) / GRAINS.length);
  const big = pop(f, w(2) - 3, 14);
  return (
    <>
      <Person x={person.x} y={person.y} s={person.s} belly={0.42} armL={[10, 0]} armR={[14, 0]} tilt={8} lookY={6} mouth="o" />
      <g opacity={open}>
        <circle cx={B.x} cy={B.y} r={40} fill="none" stroke={C.ink} strokeWidth={6} strokeDasharray="12 9" />
        {[1, -1].map((k) => (
          <path
            key={k}
            d={`M${B.x + nrm[0] * 40 * k} ${B.y + nrm[1] * 40 * k} L${L.x + nrm[0] * L.r * k} ${L.y + nrm[1] * L.r * k}`}
            stroke={C.ink}
            strokeWidth={5}
            strokeDasharray="14 10"
            opacity={0.55}
          />
        ))}
      </g>
      <g transform={`translate(${L.x} ${L.y}) scale(${open}) translate(${-L.x} ${-L.y})`}>
        <clipPath id={`lens${id}`}>
          <circle cx={L.x} cy={L.y} r={L.r} />
        </clipPath>
        <circle cx={L.x} cy={L.y} r={L.r} fill="#eab0a2" />
        <g clipPath={`url(#lens${id})`}>
          {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => {
            const y = L.y + i * 56 + Math.sin(f / 30 + i) * 3;
            return (
              <g key={i}>
                <path d={`M${L.x - 280} ${y} Q${L.x} ${y + 14} ${L.x + 280} ${y}`} stroke="#c9685b" strokeWidth={34} fill="none" opacity={0.55} />
                <path d={`M${L.x - 280} ${y + 22} Q${L.x} ${y + 36} ${L.x + 280} ${y + 22}`} stroke={C.ink} strokeWidth={3} fill="none" opacity={0.35} />
              </g>
            );
          })}
          {GRAINS.map(([gx, gy], i) => {
            const p = tw(f, gStart + i * gStep, gStart + i * gStep + 18);
            if (p <= 0) return null;
            const X = L.x + gx - 320 * (1 - p);
            const Y = L.y + gy;
            const wp = tw(f, wStart + i * wStep, wStart + i * wStep + 12);
            return (
              <g key={i}>
                {[0, 1, 2].map((k) => {
                  const a = ((k * 120 + i * 37) * Math.PI) / 180;
                  const r = 30 + 30 * wp;
                  return wp > 0 ? <Drop key={k} x={X + Math.cos(a) * r} y={Y + Math.sin(a) * r + 6} s={0.85 * wp} /> : null;
                })}
                <circle cx={X} cy={Y} r={20} fill="#c98a3a" stroke={C.ink} strokeWidth={4} />
                <ellipse cx={X - 6} cy={Y - 7} rx={6} ry={4} fill="#f6d8a0" opacity={0.8} />
              </g>
            );
          })}
        </g>
        <circle cx={L.x} cy={L.y} r={L.r} fill="none" stroke={C.ink} strokeWidth={16} />
        <circle cx={L.x} cy={L.y} r={L.r - 14} fill="none" stroke="#fff6dc" strokeWidth={5} opacity={0.6} />
        <path d={`M${L.x - 150} ${L.y - 150} A210 210 0 0 1 ${L.x + 20} ${L.y - 210}`} stroke="#fff" strokeWidth={10} fill="none" opacity={0.5} strokeLinecap="round" />
      </g>
      {/* "asıl sebep" kutusu: sallanarak bekler, "su" denince açılır ve içinden damla çıkar */}
      <MysteryBox x={240} y={560} s={0.95} p={pop(f, 0, 12)} open={big > 0 ? tw(f, w(2) - 3, w(2) + 9) : 0} shake={f < w(2) - 3 ? Math.sin(f / 2.4) * 6 : 0}>
        <Drop x={0} y={0} s={3.2} />
      </MysteryBox>
      <HandText x={720} y={1150} text="×3 su" size={130} p={tw(f, w(7), w(9) + 6)} color={C.water} />
    </>
  );
};

// "Tuzlu bir akşam yemeği yedin mi, vücudun o suyu bırakmaz."
const TartiTuz: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const s = 0.9;
  const px = PX - 120;
  const lower = tw(f, w(5) + 4, w(6) + 6);
  const shake = lower < 1 ? Math.sin(f / 2.2) * 9 * (1 - lower) : 0;
  const armR: Arm = [interpolate(lower, [0, 1], [100, 14]) + shake, interpolate(lower, [0, 1], [-45, 0])];
  const hand = armPoints(1, armR)[2];
  const plate = { x: px + armPoints(1, [100, -45])[2][0] * s, y: 1010 };
  const level = tw(f, w(6) - 2, d - 6);
  return (
    <>
      {/* masa */}
      <g stroke={C.ink} strokeWidth={8} strokeLinejoin="round">
        <rect x={plate.x - 200} y={1040} width={400} height={30} rx={8} fill="#b07b4a" />
        <rect x={plate.x - 170} y={1068} width={24} height={PY - 1060} fill="#8a5c35" />
        <rect x={plate.x + 146} y={1068} width={24} height={PY - 1060} fill="#8a5c35" />
      </g>
      <ellipse cx={plate.x} cy={plate.y + 18} rx={120} ry={26} fill={C.cream} stroke={C.ink} strokeWidth={6} />
      <ellipse cx={plate.x - 20} cy={plate.y + 6} rx={55} ry={20} fill="#8a5a2b" stroke={C.ink} strokeWidth={4} />
      <ellipse cx={plate.x + 40} cy={plate.y + 10} rx={34} ry={14} fill={C.cream} stroke={C.ink} strokeWidth={4} />
      {[-40, 0, 30].map((gx, i) => (
        <circle key={i} cx={plate.x + gx} cy={plate.y - 4 + (i % 2) * 8} r={7} fill="#5e9a3c" />
      ))}
      <Person
        x={px}
        y={PY}
        s={s}
        belly={interpolate(level, [0, 1], [0.42, 0.62])}
        armL={[12, 0]}
        armR={armR}
        mouth={level > 0.3 ? "worry" : "smile"}
        eyes={level > 0.6 ? "wide" : "open"}
        blush={0.4 + 0.4 * level}
      >
        {level > 0 ? (
          <ellipse cx={0} cy={-450} rx={70 + 30 * level} ry={30 + 45 * level} fill={C.water} opacity={0.35 * level} stroke={C.water} strokeWidth={4} />
        ) : null}
        {lower < 1 ? (
          <g transform={`translate(${hand[0]} ${hand[1]}) rotate(${160 + shake * 2})`} opacity={1 - lower}>
            <path d="M-26 -10 L26 -10 L22 70 Q0 78 -22 70 Z" fill={C.cream} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
            <path d="M-26 -10 Q0 -40 26 -10 Z" fill="#9a9a9a" stroke={C.ink} strokeWidth={6} />
            <text x={0} y={42} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={34} fill={C.ink} transform="rotate(180 0 32)">
              T
            </text>
          </g>
        ) : null}
        {lower < 1
          ? cycles(f, 4, 2, 16).map(({ k, p }) => (
              <circle
                key={k}
                cx={hand[0] + ((k * 7) % 20) - 10}
                cy={hand[1] + 50 + 170 * p}
                r={4}
                fill="#fffaf0"
                stroke={C.ink}
                strokeWidth={1.5}
                opacity={(1 - lower) * (1 - p * 0.5)}
              />
            ))
          : null}
        {/* su, dışarıdan vücuda çekilir ve orada kalır */}
        {cycles(f, w(6) - 2, 6, 30).map(({ k, p }) => {
          const a = random(`ts${k}`) * Math.PI * 2;
          const r0 = 380;
          const e = Easing.in(Easing.quad)(p);
          return (
            <Drop key={k} x={Math.cos(a) * r0 * (1 - e)} y={-450 + Math.sin(a) * r0 * (1 - e)} s={1} o={interpolate(p, [0, 0.15, 0.85, 1], [0, 1, 1, 0])} />
          );
        })}
      </Person>
    </>
  );
};

// "Regl dönemi, midendeki yemek, hatta dünkü antrenman bile tartıyı oynatır."
const TartiDiger: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const jolt = f >= w(8);
  const bounce = (i: number) => (jolt ? Math.abs(Math.sin((f - w(8)) / 4 + i)) * 18 : 0);
  const values = ["80.0", "81.2", "79.6", "80.9", "79.9", "81.4"];
  const val = jolt ? values[Math.floor((f - w(8)) / 6) % values.length] : "80.0";
  const shake = jolt ? Math.sin(f / 1.8) * 3 : 0;
  const c = pop(f, w(0) - 2, 14);
  const st = pop(f, w(2) - 2, 14);
  const db = pop(f, w(5) - 2, 14);
  return (
    <>
      {c > 0 ? (
        <g transform={`translate(210 ${560 - bounce(0)}) scale(${c})`}>
          <Calendar x={0} y={0} mark={tw(f, w(0) + 4, w(1) + 10)} />
        </g>
      ) : null}
      {st > 0 ? (
        <g transform={`translate(540 ${520 - bounce(1)}) scale(${st})`}>
          <Stomach x={0} y={0} s={1.15} fill={tw(f, w(2) + 2, w(3) + 12)} />
        </g>
      ) : null}
      {db > 0 ? (
        <g transform={`translate(870 ${560 - bounce(2)}) scale(${db})`}>
          <Dumbbell x={0} y={0} s={0.95} rot={-20 + (f > w(5) && f < w(7) + 10 ? Math.sin(f / 4) * 14 : 0)} />
        </g>
      ) : null}
      <g transform={`rotate(${shake} ${PX} ${PY})`}>
        <Bathroom x={PX} y={PY + 6} value={`${val} kg`} />
        <Person
          x={PX}
          y={PY - 58}
          s={0.9}
          belly={0.42}
          armL={[16, 0]}
          armR={[16, 0]}
          mouth={jolt ? "worry" : "flat"}
          eyes={jolt ? "wide" : "open"}
          lookY={jolt ? 10 : -6}
          tilt={jolt ? 8 : f < w(2) ? -6 : f < w(5) ? 0 : 6}
        />
      </g>
      {jolt
        ? [-1, 1].map((k) => (
            <g key={k} stroke={C.ink} strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.6 + 0.3 * Math.sin(f / 3)}>
              <path d={`M${PX + k * 230} ${PY - 40} q${k * 20} 20 0 40 q${-k * 20} 20 0 40`} />
              <path d={`M${PX + k * 265} ${PY - 50} q${k * 20} 25 0 50 q${-k * 20} 25 0 50`} />
            </g>
          ))
        : null}
    </>
  );
};

// "O yüzden tek bir güne değil, haftalık ortalamaya bak."
const DAILY = [520, 410, 575, 495, 605, 525, 640];
const DAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const TartiOrtalama: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const x = (i: number) => 190 + i * 118;
  const board = tw(f, 0, 14);
  const line = tw(f, 2, w(2) + 6);
  const spike = pop(f, w(2), 14);
  const avg = tw(f, w(6) - 2, w(7) + 12);
  const pts = DAILY.map((y, i) => `${i ? "L" : "M"}${x(i)} ${y}`).join(" ");
  return (
    <>
      <g opacity={board} transform="rotate(-1.5 540 600)">
        <rect x={110} y={300} width={860} height={560} rx={20} fill={C.cream} stroke={C.ink} strokeWidth={8} />
        <path d={`M150 760 L930 760`} stroke={C.ink} strokeWidth={5} opacity={0.5} />
        {DAYS.map((t, i) => (
          <text key={t} x={x(i)} y={820} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={46} fill={C.ink}>
            {t}
          </text>
        ))}
        <Arrow d={pts} p={line} w={6} color={C.ink} />
        {DAILY.map((y, i) => {
          const p = pop(f, 2 + i * ((w(2) + 4) / 7), 10);
          return p > 0 ? <circle key={i} cx={x(i)} cy={y} r={14 * p} fill={C.ink} /> : null;
        })}
        {spike > 0 ? <circle cx={x(1)} cy={DAILY[1]} r={44 * spike} fill="none" stroke={C.red} strokeWidth={7} /> : null}
        <Cross x={x(1)} y={DAILY[1]} size={34} p={tw(f, w(5) - 2, w(5) + 10)} />
        <Arrow d={`M${x(0)} 500 L${x(6)} 610`} p={avg} w={16} color="#3f7d4f" />
      </g>
      <Person
        x={820}
        y={PY + 40}
        s={0.68}
        belly={0.42}
        armL={[interpolate(avg, [0, 1], [150, 140]), -10]}
        armR={[14, 0]}
        mouth={avg > 0.5 ? "grin" : "smile"}
        lookY={-6}
        tilt={-6}
      />
    </>
  );
};

// "Tartı yalan söylemez ama abartır. Kaydet, sonra lazım olur."
const TartiKapanis: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const grow = tw(f, w(3) - 2, w(4) + 16);
  const laugh = f >= w(4) && f < w(5) + 6;
  const thumbs = tw(f, w(6) - 3, w(6) + 8);
  const save = pop(f, w(5), 14);
  const sx = 740;
  const disp = { x: sx, y: PY - 20 };
  const bx = interpolate(grow, [0, 1], [disp.x, 470]);
  const by = interpolate(grow, [0, 1], [disp.y, 560]);
  const wob = Math.sin(f / 6) * 4 * grow;
  return (
    <>
      <Bathroom x={sx} y={PY + 6} value="81.0 kg" />
      <Person
        x={sx}
        y={PY - 58 - (laugh ? Math.abs(Math.sin(f / 3)) * 10 : 0)}
        s={0.88}
        belly={0.42}
        armL={[14, 0]}
        armR={[14 + 130 * thumbs, -60 * thumbs]}
        mouth={laugh || thumbs > 0.5 ? "grin" : "smile"}
        eyes={laugh ? "closed" : "open"}
      />
      {grow > 0 ? (
        <g transform={`translate(${bx} ${by}) scale(${0.25 + 1.6 * grow}) rotate(${wob})`}>
          <ellipse cx={0} cy={-30} rx={150} ry={100} fill="#fbe3dc" stroke={C.red} strokeWidth={6} />
          <path d="M-10 70 L10 70 L0 88 Z" fill={C.red} />
          <text x={0} y={0} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={110} fill={C.red}>
            +1 kg
          </text>
        </g>
      ) : null}
      {save > 0 ? (
        <g transform={`translate(220 1060) scale(${save}) rotate(-6)`}>
          <path d="M-70 -95 L70 -95 L70 100 L0 50 L-70 100 Z" fill={C.yellow} stroke={C.ink} strokeWidth={10} strokeLinejoin="round" />
          <text x={0} y={175} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={80} fill={C.ink}>
            kaydet
          </text>
        </g>
      ) : null}
    </>
  );
};

/* ---------- 03 on bin adım: eşyalar ---------- */

// Yürüyüş döngüsü: bacaklar sırayla kalkar, kollar karşı yönde sallanır, gövde hafifçe yaylanır
const walk = (f: number, on: number, speed = 5.5) => {
  const t = f / speed;
  const l = Math.max(0, Math.sin(t)) * on;
  const r = Math.max(0, -Math.sin(t)) * on;
  return {
    legL: { lift: l * 0.7 },
    legR: { lift: r * 0.7 },
    armL: [10 + 26 * Math.sin(t) * on, -10 * on] as Arm,
    armR: [10 - 26 * Math.sin(t) * on, -10 * on] as Arm,
    bob: Math.abs(Math.sin(t)) * 10 * on,
  };
};

const Footprint: React.FC<{ x: number; y: number; s?: number; rot?: number; o?: number; color?: string }> = ({ x, y, s = 1, rot = 0, o = 1, color = C.ink }) =>
  o > 0 ? (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={o} fill={color}>
      <ellipse cx={0} cy={6} rx={13} ry={22} />
      {[-11, -4, 3, 9].map((tx, i) => (
        <circle key={i} cx={tx} cy={-22 - (i === 0 ? 0 : 3)} r={i === 0 ? 5.5 : 4} />
      ))}
    </g>
  ) : null;

// Bilekte/elde tutulan adımsayar ekranı
const StepScreen: React.FC<{ x: number; y: number; s?: number; children: React.ReactNode }> = ({ x, y, s = 1, children }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-230} y={-120} width={460} height={240} rx={48} fill="#2f3b33" stroke={C.ink} strokeWidth={10} />
    <rect x={-200} y={-92} width={400} height={184} rx={30} fill="#26332b" />
    <Footprint x={-150} y={-40} s={1.1} rot={-12} color="#b8f28a" />
    <Footprint x={-118} y={20} s={1.1} rot={12} color="#b8f28a" o={0.6} />
    {children}
  </g>
);

// Eski usul adımsayar: kadranlı, yuvarlak köşeli kutu
const Pedometer: React.FC<{ x: number; y: number; s?: number; needle: number }> = ({ x, y, s = 1, needle }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-95} y={-120} width={190} height={240} rx={44} fill="#d9d2c0" stroke={C.ink} strokeWidth={8} />
    <circle cx={0} cy={-18} r={70} fill={C.cream} stroke={C.ink} strokeWidth={7} />
    {Array.from({ length: 9 }, (_, i) => {
      const a = ((-120 + i * 30) * Math.PI) / 180;
      return <path key={i} d={`M${Math.sin(a) * 52} ${-18 - Math.cos(a) * 52} L${Math.sin(a) * 64} ${-18 - Math.cos(a) * 64}`} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />;
    })}
    <path
      d={`M0 -18 L${(Math.sin(((-120 + 240 * needle) * Math.PI) / 180) * 50).toFixed(1)} ${(-18 - Math.cos(((-120 + 240 * needle) * Math.PI) / 180) * 50).toFixed(1)}`}
      stroke={C.red}
      strokeWidth={7}
      strokeLinecap="round"
    />
    <circle cx={0} cy={-18} r={9} fill={C.ink} />
    <rect x={-40} y={70} width={80} height={22} rx={8} fill={C.ink} opacity={0.75} />
  </g>
);

const Globe: React.FC<{ x: number; y: number; r: number; spin: number }> = ({ x, y, r, spin }) => {
  const id = svgId(useId());
  const lands = [
    [-0.45, -0.35, 0.32, 0.22],
    [0.1, -0.45, 0.25, 0.16],
    [0.35, 0.05, 0.3, 0.26],
    [-0.3, 0.35, 0.22, 0.28],
    [0.75, -0.3, 0.18, 0.14],
  ];
  return (
    <g>
      <clipPath id={`g${id}`}>
        <circle cx={x} cy={y} r={r} />
      </clipPath>
      <circle cx={x} cy={y} r={r} fill="#8fc3dd" stroke={C.ink} strokeWidth={9} />
      <g clipPath={`url(#g${id})`}>
        {lands.map(([lx, ly, rx, ry], i) => {
          const px = ((((lx + spin) % 2) + 3) % 2) - 1;
          return <ellipse key={i} cx={x + px * r * 1.2} cy={y + ly * r} rx={rx * r} ry={ry * r} fill="#8bb36a" stroke={C.ink} strokeWidth={5} />;
        })}
      </g>
      <path d={`M${x - r * 0.6} ${y - r * 0.55} A${r} ${r} 0 0 1 ${x + r * 0.1} ${y - r * 0.85}`} stroke="#fff" strokeWidth={9} fill="none" opacity={0.5} strokeLinecap="round" />
    </g>
  );
};

// Kalabalıktaki küçük insan simgesi
const Mini: React.FC<{ x: number; y: number; s: number; c: string }> = ({ x, y, s, c }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cx={0} cy={-34} r={13} fill={C.skin} stroke={C.ink} strokeWidth={4} />
    <path d="M-18 0 Q-18 -20 0 -20 Q18 -20 18 0 Z" fill={c} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
  </g>
);

const SaveMark: React.FC<{ x: number; y: number; p: number }> = ({ x, y, p }) =>
  p > 0 ? (
    <g transform={`translate(${x} ${y}) scale(${p}) rotate(-6)`}>
      <path d="M-70 -95 L70 -95 L70 100 L0 50 L-70 100 Z" fill={C.yellow} stroke={C.ink} strokeWidth={10} strokeLinejoin="round" />
      <text x={0} y={175} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={80} fill={C.ink}>
        kaydet
      </text>
    </g>
  ) : null;

/* ---------- 03 on bin adım: sahneler ---------- */

// "Günde on bin adım atman gerektiğini kim söyledi? Bir doktor değil."
const AdimAcilis: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const stop = tw(f, w(6) - 4, w(6) + 6);
  const g = walk(f, tw(f, 2, 10) * (1 - stop));
  const think = tw(f, w(6), w(7) + 4);
  const screen = pop(f, w(0), 14);
  // "kim söyledi?" sorulurken doktor sağdan yürüyerek gelir (cevap o mu?); "değil" denince başını sallar, omuz silker
  const docIn = tw(f, w(6) - 6, w(8) + 2);
  const docWalk = walk(f, docIn > 0 && docIn < 1 ? 1 : 0, 4.5);
  const no = tw(f, w(10) - 2, w(10) + 6);
  const shake = no > 0 ? Math.sin((f - w(10)) / 2.2) * 12 * (1 - tw(f, w(10) + 14, w(10) + 26)) : 0;
  return (
    <>
      {cycles(f, 6, 11, 70).map(({ k, p }) => (
        <Footprint key={k} x={PX - 40 + (k % 2 ? 34 : -34) - 460 * p} y={PY + 20} rot={90} s={1.1} o={interpolate(p, [0, 0.1, 0.7, 1], [0, 0.35, 0.35, 0]) * (1 - stop)} />
      ))}
      <Person
        x={PX - 40}
        y={PY - g.bob}
        s={0.92}
        belly={0.4}
        legL={g.legL}
        legR={g.legR}
        armL={g.armL}
        armR={[g.armR[0] * (1 - think) + 150 * think, g.armR[1] * (1 - think) - 135 * think]}
        mouth={think > 0.5 ? "worry" : "smile"}
        eyes={think > 0.5 ? "wide" : "open"}
        tilt={-8 * think}
      />
      {screen > 0 ? (
        <StepScreen x={PX} y={420} s={screen}>
          <Counter x={40} y={30} to={10000} p={tw(f, w(0), w(3) + 4)} size={110} color="#b8f28a" rotate={0} />
        </StepScreen>
      ) : null}
      <HandText x={300} y={720} text="?" size={190} p={pop(f, w(6), 12)} rotate={-10} />
      {docIn > 0 ? (
        <Person
          x={interpolate(docIn, [0, 1], [1250, 860])}
          y={PY - docWalk.bob}
          s={0.74}
          belly={0.3}
          shirt="#f4f1ea"
          legL={docWalk.legL}
          legR={docWalk.legR}
          armL={no > 0 ? [10 + 70 * no, -60 * no] : docWalk.armL}
          armR={no > 0 ? [10 + 70 * no, -60 * no] : docWalk.armR}
          mouth={no > 0.5 ? "flat" : "smile"}
          tilt={shake}
          lookY={2}
        >
          {/* steteskop ve yaka kartı */}
          <path d="M-40 -596 Q-62 -500 -6 -470 Q50 -500 40 -596" stroke={C.ink} strokeWidth={9} fill="none" strokeLinecap="round" />
          <circle cx={-6} cy={-462} r={15} fill="#9a9a9a" stroke={C.ink} strokeWidth={6} />
          <rect x={30} y={-540} width={56} height={38} rx={6} fill={C.water} stroke={C.ink} strokeWidth={5} />
          <text x={58} y={-512} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={30} fill={C.cream}>
            Dr.
          </text>
        </Person>
      ) : null}
    </>
  );
};

// "Altmışlı yıllarda Japonya'da bir şirket adımsayar sattı. Adı: on bin adım ölçer."
const AdimReklam: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const poster = pop(f, 0, 16);
  const sun = pop(f, w(2) - 2, 14);
  const ped = pop(f, w(5) - 2, 14);
  const curtain = tw(f, w(7) + 2, w(8) + 6); // isim etiketi "Adı:" denince açılır
  const P = { x: 470, y: 720 };
  return (
    <>
      <g transform={`translate(${P.x} ${P.y}) scale(${poster}) rotate(-2)`}>
        <rect x={-300} y={-380} width={600} height={760} rx={14} fill="#f6ead0" stroke={C.ink} strokeWidth={10} />
        <rect x={-275} y={-355} width={550} height={710} fill="none" stroke={C.red} strokeWidth={8} />
        {sun > 0 ? <circle cx={150} cy={-230} r={85 * sun} fill={C.red} stroke={C.ink} strokeWidth={6} /> : null}
        <HandText x={-120} y={-240} text="1960'lar" size={84} p={tw(f, w(0), w(1) + 8)} />
        {ped > 0 ? (
          <g transform={`scale(${ped})`}>
            <Pedometer x={0} y={20} s={1.15} needle={tw(f, w(5), w(7) + 20) * 0.9 + 0.05 * Math.sin(f / 4)} />
          </g>
        ) : null}
        {/* isim bandı: "?" yazan örtü kalkar, altından isim çıkar */}
        <rect x={-240} y={200} width={480} height={120} rx={14} fill={C.cream} stroke={C.ink} strokeWidth={7} />
        <HandText x={0} y={285} text="10.000 adım ölçer" size={66} p={tw(f, w(8), w(11) + 4)} color={C.red} rotate={0} />
        {curtain < 1 ? (
          <g transform={`translate(0 ${-200 * curtain})`} opacity={1 - curtain}>
            <rect x={-250} y={190} width={500} height={140} rx={14} fill={C.shorts} stroke={C.ink} strokeWidth={7} />
            <text x={0} y={292} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={110} fill={C.cream}>
              ?
            </text>
          </g>
        ) : null}
      </g>
      <Person x={900} y={PY + 30} s={0.6} belly={0.4} armL={[150, -40]} armR={[12, 0]} mouth={curtain > 0.5 ? "o" : "smile"} eyes={curtain > 0.5 ? "wide" : "open"} lookY={-4} />
      {/* "sattı": adımsayardan karaktere doğru paralar uçar */}
      {[0, 1, 2, 3].map((i) => {
        const p = tw(f, w(6) - 2 + i * 4, w(6) + 14 + i * 4);
        if (p <= 0 || p >= 1) return null;
        const x = interpolate(p, [0, 1], [P.x + 60, 880 + i * 18]);
        const y = interpolate(p, [0, 1], [P.y + 20, 930]) - Math.sin(p * Math.PI) * 220;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${p * 540})`}>
            <ellipse rx={30} ry={30 * Math.max(0.15, Math.abs(Math.cos(p * 9)))} fill={C.yellow} stroke={C.ink} strokeWidth={5} />
          </g>
        );
      })}
    </>
  );
};

// "Sayı akılda kalıcıydı. Reklam tuttu ve bütün dünyaya yayıldı."
const AdimYayildi: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const bubble = pop(f, w(0) - 2, 16);
  const shrink = tw(f, w(5), w(6) + 6);
  const globe = pop(f, w(6) - 4, 18);
  const G = { x: 600, y: 760, r: 230 };
  const tags = 9;
  const step = Math.max(3, (d - 12 - w(7)) / tags);
  return (
    <>
      <Person x={220} y={PY} s={0.78} belly={0.4} armL={[12, 0]} armR={[150, -135]} mouth="grin" lookY={-6} />
      <g opacity={1 - shrink}>
        <Bubble x={330} y={560} rx={200} ry={140} p={bubble} tail={[260, 790]}>
          <text x={330} y={600} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={120} fill={C.red}>
            10.000
          </text>
        </Bubble>
        {cycles(f, w(1), 10, 30).map(({ k, p }) => (
          <Star key={k} x={180 + (k % 4) * 100} y={420 - 80 * p} r={16 * (1 - p)} rot={f * 5} />
        ))}
      </g>
      {/* reklam afişleri sağa doğru çoğalır */}
      {[0, 1, 2].map((i) => {
        const p = pop(f, w(3) + i * 5, 12) * (1 - shrink);
        return p > 0 ? (
          <g key={i} transform={`translate(${720 + i * 110} ${420 + i * 40}) scale(${p * 0.55}) rotate(${-6 + i * 6})`}>
            <rect x={-90} y={-120} width={180} height={240} rx={8} fill="#f6ead0" stroke={C.ink} strokeWidth={8} />
            <circle cx={0} cy={-40} r={40} fill={C.red} />
            <text x={0} y={80} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={54} fill={C.ink}>
              10.000
            </text>
          </g>
        ) : null;
      })}
      {globe > 0 ? (
        <g transform={`translate(${G.x} ${G.y}) scale(${globe}) translate(${-G.x} ${-G.y})`}>
          <Globe x={G.x} y={G.y} r={G.r} spin={f / 140} />
          {Array.from({ length: tags }, (_, i) => {
            const p = pop(f, w(7) + i * step, 12);
            const a = (i / tags) * Math.PI * 2 + f / 90;
            return p > 0 ? (
              <g key={i} transform={`translate(${G.x + Math.cos(a) * (G.r + 70)} ${G.y + Math.sin(a) * (G.r + 70)}) scale(${p})`}>
                <Footprint x={0} y={0} s={1.2} rot={(a * 180) / Math.PI + 90} color={C.red} />
              </g>
            ) : null;
          })}
        </g>
      ) : null}
    </>
  );
};

// "Peki bilim ne diyor? Kırk yedi bin kişiyi izleyen bir araştırmaya göre,"
const CROWD = Array.from({ length: 84 }, (_, i) => ({
  x: 150 + (i % 12) * 70 + (Math.floor(i / 12) % 2) * 35,
  y: 940 + Math.floor(i / 12) * 62,
  c: ["#5d8c87", "#b23a2a", "#4b3f5e", "#d79a4e", "#4f97c2"][Math.floor(random(`cr${i}`) * 5)],
}));
const AdimBilim: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const open = tw(f, w(4) - 3, w(4) + 9);
  const fill = tw(f, w(4), w(7) + 6);
  const lens = tw(f, w(8) - 2, d);
  const lx = 200 + 680 * lens;
  return (
    <>
      <MysteryBox x={300} y={560} s={1.05} p={pop(f, 0, 12)} open={open} shake={f < w(4) - 3 ? Math.sin(f / 2.4) * 6 : 0}>
        <g>
          <rect x={-70} y={-90} width={140} height={180} rx={10} fill={C.cream} stroke={C.ink} strokeWidth={7} />
          {[-50, -20, 10, 40].map((ly) => (
            <path key={ly} d={`M-45 ${ly} L45 ${ly}`} stroke={C.ink} strokeWidth={6} strokeLinecap="round" opacity={0.6} />
          ))}
        </g>
      </MysteryBox>
      <Counter x={730} y={600} to={47000} p={tw(f, w(4), w(7) + 4)} suffix=" kişi" size={110} color={C.red} />
      {CROWD.map((c, i) => {
        const p = tw(fill, i / CROWD.length, Math.min(1, i / CROWD.length + 0.08));
        return p > 0 ? <Mini key={i} x={c.x} y={c.y - 30 * (1 - p)} s={0.9 * p} c={c.c} /> : null;
      })}
      {lens > 0 ? (
        <g opacity={tw(f, w(8) - 2, w(8) + 6)}>
          <circle cx={lx} cy={1060} r={95} fill="#fff8e6" opacity={0.35} stroke={C.ink} strokeWidth={12} />
          <path d={`M${lx + 68} ${1128} L${lx + 140} ${1200}`} stroke={C.ink} strokeWidth={22} strokeLinecap="round" />
        </g>
      ) : null}
    </>
  );
};

// "altmış yaş üstünde fayda altı ile sekiz bin adımda doyuyor. Daha gençlerde sekiz ile on bin arasında."
const AdimEgri: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const B = { x0: 170, x1: 930, y0: 900, y1: 380 };
  const X = (steps: number) => B.x0 + (steps / 12000) * (B.x1 - B.x0);
  const Y = (v: number) => B.y0 - v * (B.y0 - B.y1);
  // fayda eğrisi: hızlı yükselir, eşikte düzleşir
  const curve = (plateau: number, top: number) =>
    Array.from({ length: 25 }, (_, i) => {
      const s = (i / 24) * 12000;
      const v = top * (1 - Math.exp(-s / (plateau / 2.6)));
      return `${i ? "L" : "M"}${X(s).toFixed(1)} ${Y(v).toFixed(1)}`;
    }).join(" ");
  const old = tw(f, w(0), w(8) + 4);
  const young = tw(f, w(10), w(15) + 4);
  const band1 = tw(f, w(4), w(7) + 4);
  const band2 = tw(f, w(12), w(15) + 2);
  const sat = f >= w(9) - 2;
  return (
    <>
      <g opacity={tw(f, 0, 12)} transform="rotate(-1.2 540 640)">
        <rect x={100} y={300} width={880} height={780} rx={20} fill={C.cream} stroke={C.ink} strokeWidth={8} />
        <rect x={X(6000)} y={B.y1 - 20} width={(X(8000) - X(6000)) * band1} height={B.y0 - B.y1 + 20} fill="#3f7d4f" opacity={0.18} />
        <rect x={X(8000)} y={B.y1 - 20} width={(X(10000) - X(8000)) * band2} height={B.y0 - B.y1 + 20} fill={C.water} opacity={0.18} />
        <path d={`M${B.x0} ${B.y1 - 30} L${B.x0} ${B.y0} L${B.x1} ${B.y0}`} stroke={C.ink} strokeWidth={6} fill="none" />
        {[0, 2, 4, 6, 8, 10, 12].map((k) => (
          <text key={k} x={X(k * 1000)} y={B.y0 + 56} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={44} fill={C.ink}>
            {k}
          </text>
        ))}
        <text x={(B.x0 + B.x1) / 2} y={B.y0 + 130} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={50} fill={C.ink}>
          bin adım
        </text>
        <text x={B.x0 + 14} y={B.y1 - 40} fontFamily={handFamily} fontWeight={700} fontSize={50} fill={C.ink}>
          fayda
        </text>
        <Arrow d={curve(7000, 0.82)} p={old} color="#3f7d4f" w={12} />
        <Arrow d={curve(9500, 0.95)} p={young} color={C.water} w={12} />
        <HandText x={X(11500)} y={Y(0.82) + 60} text="60+" size={60} p={tw(f, w(1), w(2) + 6)} color="#3f7d4f" anchor="end" rotate={0} />
        <HandText x={X(11500)} y={Y(0.95) - 18} text="genç" size={60} p={tw(f, w(11), w(11) + 10)} color={C.water} anchor="end" rotate={0} />
        {/* eğrinin ucu nereye varacak? "doyuyor" denince düz çizgi ve etiket */}
        {!sat && old > 0.2 ? (
          <text x={X(12000 * old) + 20} y={Y(0.82 * (1 - Math.exp(-(12000 * old) / 2700))) - 20} fontFamily={handFamily} fontWeight={700} fontSize={80} fill={C.ink} opacity={0.5 + 0.5 * Math.abs(Math.sin(f / 6))}>
            ?
          </text>
        ) : null}
        {old > 0.03 ? (() => {
          const st = 12000 * Math.min(old, 0.97);
          const k = 0.82;
          const v = k * (1 - Math.exp(-st / 2700));
          const g2 = walk(f, old < 1 || f < w(10) ? 1 : 0, 3.2);
          return (
            <Person
              x={X(st)}
              y={Y(v) - 8 - g2.bob * 0.3}
              s={0.17}
              belly={0.3}
              legL={g2.legL}
              legR={g2.legR}
              armL={g2.armL}
              armR={g2.armR}
              tilt={0}
              mouth={sat ? "grin" : "o"}
              blush={0.8}
            />
          );
        })() : null}
        <HandText x={X(7000)} y={Y(0.82) - 30} text="doyuyor" size={58} p={tw(f, w(9) - 2, w(9) + 12)} color="#3f7d4f" rotate={-4} />
      </g>
      <Person x={910} y={PY + 190} s={0.55} belly={0.4} armL={[150, -20]} armR={[12, 0]} mouth={sat ? "grin" : "o"} lookY={-6} tilt={-6} />
    </>
  );
};

// "Yani on bin sihirli bir sayı değil. Ulaşamadın diye o günü boşa sayma."
const AdimSihirli: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const magic = pop(f, w(1) - 2, 14);
  const fizzle = tw(f, w(6) - 2, w(6) + 10);
  const fall = tw(f, w(6) + 4, w(7) + 4);
  const card = pop(f, w(7), 14);
  const ok = tw(f, w(12) - 2, w(12) + 10);
  const bad = f >= w(11) - 2 && ok < 0.5;
  return (
    <>
      {magic > 0 && fall < 1 ? (
        <g transform={`translate(540 ${520 + 900 * fall * fall}) rotate(${40 * fall}) scale(${magic})`} opacity={1 - fall}>
          <text x={0} y={60} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={200} fill={fizzle > 0.5 ? "#9a9a9a" : C.red}>
            10.000
          </text>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = f / 12 + (i * Math.PI * 2) / 5;
            return <Star key={i} x={Math.cos(a) * 280} y={Math.sin(a) * 90 - 10} r={26 * (1 - fizzle)} rot={f * 4} />;
          })}
          {/* sihirli değnek */}
          <g transform={`rotate(${-30 + 10 * Math.sin(f / 6)} -300 120)`} opacity={1 - fizzle}>
            <path d="M-300 120 L-170 -10" stroke={C.ink} strokeWidth={16} strokeLinecap="round" />
            <Star x={-160} y={-20} r={30} rot={f * 3} />
          </g>
        </g>
      ) : null}
      {magic > 0 ? <Cross x={540} y={500} size={190} p={tw(f, w(6) - 2, w(6) + 12) * (1 - fall)} /> : null}
      {card > 0 ? (
        <g transform={`translate(330 640) scale(${card}) rotate(-4)`}>
          <rect x={-170} y={-130} width={340} height={260} rx={18} fill={C.cream} stroke={C.ink} strokeWidth={8} />
          <rect x={-170} y={-130} width={340} height={60} rx={18} fill={C.red} stroke={C.ink} strokeWidth={8} />
          <text x={0} y={-86} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={46} fill={C.cream}>
            bugün
          </text>
          <text x={0} y={20} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={72} fill={C.ink}>
            7.400
          </text>
          <text x={0} y={80} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={44} fill={C.ink} opacity={0.7}>
            adım
          </text>
          {bad ? <Cross x={0} y={0} size={110} p={tw(f, w(11) - 2, w(11) + 8)} /> : null}
          {ok > 0 ? (
            <path d="M-80 10 L-20 70 L100 -70" stroke="#3f7d4f" strokeWidth={26} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - ok} />
          ) : null}
        </g>
      ) : null}
      <Person
        x={780}
        y={PY}
        s={0.8}
        belly={0.4}
        armL={[12, 0]}
        armR={ok > 0.5 ? [140, -60] : [12, 0]}
        mouth={ok > 0.5 ? "grin" : bad ? "worry" : f >= w(6) ? "o" : "smile"}
        eyes={f >= w(6) && f < w(7) ? "wide" : "open"}
        lookY={card > 0 ? 0 : -6}
      />
    </>
  );
};

// "Asıl önemli olan, bugün dünden biraz daha fazla yürümek."
const AdimHerAdim: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const g = walk(f, tw(f, 0, 10));
  const yesterday = tw(f, w(3), w(4) + 8);
  const today = tw(f, w(5), w(7) + 10);
  const plus = pop(f, w(6), 14);
  const bar = (x: number, h: number, label: string, color: string) => (
    <g>
      <rect x={x - 70} y={1000 - h} width={140} height={h} rx={14} fill={color} stroke={C.ink} strokeWidth={7} />
      {Array.from({ length: Math.floor(h / 70) }, (_, i) => (
        <Footprint key={i} x={x + (i % 2 ? 22 : -22)} y={1000 - 40 - i * 70} s={0.9} color={C.cream} o={0.8} />
      ))}
      <text x={x} y={1070} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={58} fill={C.ink}>
        {label}
      </text>
    </g>
  );
  return (
    <>
      <g opacity={tw(f, 0, 10)}>
        {bar(220, 420 * yesterday, "dün", "#9a9a9a")}
        {bar(420, 500 * today, "bugün", "#3f7d4f")}
        {plus > 0 ? (
          <text x={420} y={1000 - 500 * today - 30} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={110 * plus} fill="#3f7d4f">
            +
          </text>
        ) : null}
      </g>
      {cycles(f, 6, 11, 70).map(({ k, p }) => (
        <Footprint key={k} x={780 + (k % 2 ? 34 : -34) - 300 * p} y={PY + 20} rot={90} s={1.1} o={interpolate(p, [0, 0.1, 0.7, 1], [0, 0.35, 0.35, 0])} />
      ))}
      <Person x={780} y={PY - g.bob} s={0.85} belly={0.36} legL={g.legL} legR={g.legR} armL={g.armL} armR={g.armR} mouth="grin" />
    </>
  );
};

// "Bunu kaydet, çünkü yarın biri yine soracak:"
const AdimKapanis: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const save = pop(f, w(1) - 2, 14);
  const friend = pop(f, w(3) - 2, 16);
  const ask = pop(f, w(5), 14);
  return (
    <>
      <Person x={PX - 40} y={PY} s={0.92} belly={0.4} armL={[12, 0]} armR={[14 + 120 * tw(f, w(1), w(1) + 8), -60 * tw(f, w(1), w(1) + 8)]} mouth="grin" />
      <SaveMark x={230} y={560} p={save} />
      {friend > 0 ? (
        <g opacity={friend}>
          <Person x={900} y={PY + 40} s={0.62} belly={0.55} armL={[12, 0]} armR={[12, 0]} mouth={ask > 0.5 ? "o" : "smile"} lookY={-4} tilt={-6} />
        </g>
      ) : null}
      <Bubble x={830} y={560} rx={150} ry={110} p={ask} tail={[880, 800]}>
        <text x={830} y={600} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={130} fill={C.ink}>
          ?
        </text>
      </Bubble>
    </>
  );
};

/* ---------- 04 kadın ve ağırlık: eşyalar ---------- */

// Spor salonu fonu: tüm sahneler aynı dünyada geçer (ayna, dambıl rafı, pencere, zemin)
const Gym: React.FC<{ o?: number }> = ({ o = 1 }) => (
  <g opacity={0.55 * o} stroke={C.ink} strokeLinejoin="round">
    <rect x={-20} y={1150} width={1120} height={800} fill="#d9c6a0" strokeWidth={0} />
    <path d="M-20 1150 L1100 1150" strokeWidth={6} />
    <rect x={640} y={420} width={330} height={640} rx={10} fill="#e9e2cf" strokeWidth={7} />
    <path d="M700 480 L760 420 M700 560 L840 420" stroke="#fff" strokeWidth={10} opacity={0.7} />
    <rect x={60} y={430} width={220} height={260} rx={8} fill="#f3e6c4" strokeWidth={7} />
    <path d="M170 430 L170 690 M60 560 L280 560" strokeWidth={6} />
    <g strokeWidth={6}>
      <rect x={50} y={900} width={260} height={18} rx={6} fill="#8a5c35" />
      <rect x={50} y={1000} width={260} height={18} rx={6} fill="#8a5c35" />
      <path d="M70 918 L70 1150 M290 918 L290 1150" />
    </g>
    {[0, 1, 2].map((i) => (
      <Dumbbell key={i} x={110 + i * 70} y={880} s={0.32} rot={90} />
    ))}
    {[0, 1, 2].map((i) => (
      <Dumbbell key={`b${i}`} x={110 + i * 70} y={980} s={0.36} rot={90} />
    ))}
  </g>
);

const Barbell: React.FC<{ x: number; y: number; s?: number; rot?: number }> = ({ x, y, s = 1, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} stroke={C.ink} strokeWidth={6} strokeLinejoin="round">
    <rect x={-250} y={-8} width={500} height={16} rx={8} fill="#9a9a9a" />
    {[-1, 1].map((k) => (
      <g key={k}>
        <rect x={k * 190 - 22} y={-80} width={44} height={160} rx={10} fill="#4b4b55" />
        <rect x={k * 230 - 14} y={-58} width={28} height={116} rx={8} fill="#4b4b55" />
      </g>
    ))}
  </g>
);

// Test tüpü: içindeki sıvı seviyesi 0..1
const Flask: React.FC<{ x: number; y: number; level: number; color: string; label: string }> = ({ x, y, level, color, label }) => {
  const id = svgId(useId());
  const h = 320;
  return (
    <g transform={`translate(${x} ${y})`}>
      <clipPath id={`fl${id}`}>
        <rect x={-55} y={-h / 2} width={110} height={h} rx={52} />
      </clipPath>
      <rect x={-55} y={-h / 2} width={110} height={h} rx={52} fill="#fbf6ea" />
      <g clipPath={`url(#fl${id})`}>
        <rect x={-60} y={h / 2 - h * level} width={120} height={h * level + 10} fill={color} />
        <path d={`M-60 ${h / 2 - h * level} Q-30 ${h / 2 - h * level - 8} 0 ${h / 2 - h * level} T60 ${h / 2 - h * level}`} stroke="#fff" strokeWidth={6} fill="none" opacity={0.6} />
      </g>
      <rect x={-55} y={-h / 2} width={110} height={h} rx={52} fill="none" stroke={C.ink} strokeWidth={8} />
      <rect x={-70} y={-h / 2 - 26} width={140} height={30} rx={8} fill="#9a9a9a" stroke={C.ink} strokeWidth={6} />
      <text x={0} y={h / 2 + 70} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={56} fill={C.ink}>
        {label}
      </text>
    </g>
  );
};

// Röntgen merceği içindeki omurga + leğen kemiği; porous = kemikteki boşluk oranı (0 sağlam … 1 çok boşluklu)
const HOLES = Array.from({ length: 34 }, (_, i) => ({
  x: (random(`hx${i}`) - 0.5) * 300,
  y: (random(`hy${i}`) - 0.5) * 360,
  r: 6 + random(`hr${i}`) * 9,
  t: random(`ht${i}`),
}));
const Bones: React.FC<{ x: number; y: number; r: number; porous: number; glow?: number }> = ({ x, y, r, porous, glow = 0 }) => {
  const id = svgId(useId());
  const bone = glow > 0 ? `rgb(250 ${242 - 8 * glow} ${222 - 70 * glow})` : "#f4efe2";
  // omurlar (5), leğen kemiği, iki uyluk kemiği; mercek merkezine göre
  const verts = [0, 1, 2, 3, 4].map((i) => ({ y: y - 250 + i * 50, w: 70 + i * 6 }));
  const pelvis = `M${x - 175} ${y + 10} C${x - 215} ${y + 90} ${x - 160} ${y + 165} ${x - 70} ${y + 150} C${x - 30} ${y + 110} ${x + 30} ${y + 110} ${x + 70} ${y + 150} C${x + 160} ${y + 165} ${x + 215} ${y + 90} ${x + 175} ${y + 10} C${x + 100} ${y + 40} ${x + 40} ${y + 20} ${x} ${y + 30} C${x - 40} ${y + 20} ${x - 100} ${y + 40} ${x - 175} ${y + 10} Z`;
  const shapes = (
    <>
      {verts.map((v, i) => (
        <rect key={i} x={x - v.w / 2} y={v.y} width={v.w} height={40} rx={12} />
      ))}
      <path d={pelvis} />
      {[-1, 1].map((k) => (
        <g key={k}>
          <circle cx={x + k * 120} cy={y + 165} r={34} />
          <path d={`M${x + k * 130} ${y + 180} L${x + k * 165} ${y + 360} L${x + k * 125} ${y + 365} L${x + k * 100} ${y + 190} Z`} />
        </g>
      ))}
    </>
  );
  return (
    <g>
      <clipPath id={`xr${id}`}>
        <circle cx={x} cy={y} r={r} />
      </clipPath>
      <circle cx={x} cy={y} r={r} fill="#24333f" />
      <g clipPath={`url(#xr${id})`}>
        <clipPath id={`bn${id}`}>{shapes}</clipPath>
        <g clipPath={`url(#bn${id})`}>
          <rect x={x - r} y={y - r} width={r * 2} height={r * 2} fill={bone} />
          {HOLES.map((h, i) =>
            h.t < porous ? <circle key={i} cx={x + h.x * 0.9} cy={y + h.y * 0.95 - 30} r={h.r * Math.min(1, (porous - h.t) * 4)} fill="#24333f" opacity={0.85} /> : null,
          )}
        </g>
        <g fill="none" stroke="#9fb6c4" strokeWidth={4} opacity={0.9}>
          {shapes}
        </g>
        {glow > 0 ? <circle cx={x} cy={y} r={r * 0.85} fill={C.yellow} opacity={0.12 * glow} /> : null}
      </g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={C.ink} strokeWidth={16} />
      <circle cx={x} cy={y} r={r - 14} fill="none" stroke="#9fd0e8" strokeWidth={4} opacity={0.5} />
    </g>
  );
};

// Dambıl kaldırma (biseps): c = 0 kol aşağıda … 1 yukarıda
const curlArm = (c: number): Arm => [12 + 22 * c, -150 * c];

/* ---------- 04 kadın ve ağırlık: sahneler ---------- */

// "Bir kadın, bilerek iri olmak için ağırlık kaldırsa bile... bu yıllar sürer."
// Kadın kararlılıkla çalışır; düşünce balonunda hedefi (iri vücut). "Yıllar" denince takvim yaprakları uçuşur,
// aynadaki yansıma neredeyse hiç değişmez; avatar gülümser.
const KadinAcilis: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const avatarArm = tw(f, 0, 10);
  const goal = pop(f, w(3) - 2, 16);
  const work = f >= w(6) - 2;
  const c = work ? (1 - Math.cos((f - w(6) + 2) / 4.5)) / 2 : 0;
  const years = tw(f, w(10) - 2, d - 4);
  const tone = 1 + 0.1 * years;
  const arm = curlArm(c);
  const hand = armPoints(1, arm)[2];
  return (
    <>
      <Gym />
      <Barbell x={480} y={PY - 60} s={0.45} />
      {/* aynadaki yansıma: yıllar geçse de neredeyse aynı */}
      <g opacity={0.35}>
        <Person x={810} y={1010} s={0.42} female belly={0.2} limbW={tone} armL={[12, 0]} armR={arm} mouth="flat" />
      </g>
      <Person
        x={250}
        y={PY + 20}
        s={0.82}
        belly={0.4}
        armL={[12, 0]}
        armR={[interpolate(avatarArm, [0, 1], [40, 12]), interpolate(avatarArm, [0, 1], [-150, 0])]}
        mouth={years > 0.4 ? "grin" : "smile"}
      >
        {avatarArm < 1 ? <g opacity={1 - avatarArm}><PhoneInHand arm={[interpolate(avatarArm, [0, 1], [40, 12]), interpolate(avatarArm, [0, 1], [-150, 0])]} /></g> : null}
      </Person>
      <Person x={720} y={PY} s={0.9} female belly={0.2} limbW={tone} armL={[12, 0]} armR={arm} mouth={work ? "flat" : "smile"} eyes={c > 0.85 ? "closed" : "open"} blush={work ? 0.7 : 0.4}>
        <g transform={`translate(${hand[0]} ${hand[1]}) rotate(${-20 + 60 * c})`}>
          <Dumbbell x={0} y={0} s={0.55} rot={90} />
        </g>
        {work
          ? cycles(f, w(6), 14, 30).map(({ k, p }) => <Drop key={k} x={(k % 2 ? 1 : -1) * (95 + 40 * p)} y={-740 + 160 * p * p} s={0.8} o={1 - p} />)
          : null}
      </Person>
      {/* hedef: iri vücut */}
      {goal > 0 ? (
        <Bubble x={720} y={430} rx={180} ry={140} p={goal} tail={[730, 720]}>
          <Person x={720} y={530} s={0.24} female belly={0.15} limbW={2.3} armL={[60, -120]} armR={[60, -120]} mouth="grin" />
        </Bubble>
      ) : null}
      {/* yıllar: takvim yaprakları hızla uçuşur */}
      {years > 0 ? (
        <g transform="translate(200 520)">
          <Calendar x={0} y={0} s={0.85} mark={1} />
          {Array.from({ length: 10 }, (_, i) => {
            const p = tw(years, i / 10, (i + 1) / 10);
            return p > 0 && p < 1 ? (
              <rect key={i} x={-80} y={-75 - 280 * p} width={160} height={150} rx={10} fill={C.cream} stroke={C.ink} strokeWidth={5} opacity={1 - p} transform={`rotate(${-35 * p})`} />
            ) : null;
          })}
        </g>
      ) : null}
    </>
  );
};

// "Kası iri yapan en önemli hormonlardan biri testosteron. Kadınlarda bu hormon, erkeklerin yaklaşık onda biri kadar."
const KadinHormon: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const flasks = pop(f, w(5) - 2, 16);
  const man = tw(f, w(7) - 2, w(8) + 4) * 0.9;
  // kadının tüpü yavaşça dolar… ve erken durur (izleyici "ne kadar dolacak?" diye bekler)
  const woman = tw(f, w(8), w(13), 0, 0.09);
  const frac = pop(f, w(13) - 2, 14);
  return (
    <>
      <Gym o={0.6} />
      {/* tüp doldukça kas büyür: erkekte belirgin, kadında çok az */}
      <Person x={290} y={PY} s={0.78} belly={0.35} limbW={1 + 0.45 * (man / 0.9)} armL={[12 + 60 * (man / 0.9), -100 * (man / 0.9)]} armR={[12 + 60 * (man / 0.9), -100 * (man / 0.9)]} mouth={man > 0.5 ? "grin" : "smile"} lookY={-6} />
      <Person x={790} y={PY} s={0.78} female belly={0.2} limbW={1 + 0.1 * (woman / 0.09)} armL={[12, 0]} armR={frac > 0.5 ? [140, -60] : [12, 0]} mouth={frac > 0.5 ? "grin" : "o"} lookY={-6} />
      {/* testosteron parçacıkları yukarıdan tüplere akar; kadının tüpüne çok daha seyrek */}
      {flasks > 0
        ? [
            ...cycles(f, w(7) - 2, 3, 18).filter(({ k }) => f < w(8) + 4 || k < 0).map(({ k, p }) => ({ k, p, x: 290, c: C.water })),
            ...cycles(f, w(8), 12, 18).filter(() => f < w(13)).map(({ k, p }) => ({ k: k + 1000, p, x: 790, c: C.lung })),
          ].map(({ k, p, x, c }) => (
            <g key={k} opacity={interpolate(p, [0, 0.15, 0.85, 1], [0, 1, 1, 0])}>
              <circle cx={x + ((k * 37) % 50) - 25} cy={110 + 140 * p} r={16} fill={c} stroke={C.ink} strokeWidth={4} />
              <text x={x + ((k * 37) % 50) - 25} y={110 + 140 * p + 9} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={24} fill={C.cream}>
                T
              </text>
            </g>
          ))
        : null}
      {flasks > 0 ? (
        <g opacity={flasks}>
          <g transform={`translate(290 420) scale(${flasks}) translate(-290 -420)`}>
            <Flask x={290} y={420} level={man} color={C.water} label="erkek" />
          </g>
          <g transform={`translate(790 420) scale(${flasks}) translate(-790 -420)`}>
            <Flask x={790} y={420} level={woman} color={C.lung} label="kadın" />
          </g>
        </g>
      ) : null}
      <HandText x={540} y={200} text="testosteron" size={86} p={tw(f, w(7) - 2, w(7) + 12)} rotate={-3} />
      {frac > 0 ? (
        <text x={940} y={560} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={130 * frac} fill={C.red} transform="rotate(-8 940 560)">
          1/10
        </text>
      ) : null}
    </>
  );
};

// "Yani kasların yine güçlenir, yine büyür. Ama ortaya çıkan şey iri değil, sıkı ve şekilli bir vücut."
const KadinKas: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const c = (1 - Math.cos(f / 6.5)) / 2;
  const grow = 1 + 0.12 * tw(f, w(2), w(5) + 6);
  const ghost = tw(f, w(10) - 2, w(10) + 8) * (1 - tw(f, w(11) + 8, w(12) + 4));
  const tone = tw(f, w(12), w(14) + 6);
  const arm = curlArm(c);
  const hand = armPoints(1, arm)[2];
  const s = 0.95;
  return (
    <>
      <Gym />
      {ghost > 0 ? (
        <g opacity={0.45 * ghost}>
          <Person x={895} y={PY} s={0.56} female belly={0.15} limbW={2.2} armL={[40, -120]} armR={[40, -120]} mouth="flat" />
        </g>
      ) : null}
      <Person x={190} y={PY + 30} s={0.7} belly={0.4} armL={[12, 0]} armR={[95, -25]} mouth={tone > 0.5 ? "grin" : "smile"} lookY={0} />
      <Person x={560} y={PY} s={s * 0.92} female belly={0.15} limbW={grow} armL={[12, 0]} armR={arm} mouth={tone > 0.5 ? "grin" : "flat"} eyes={c > 0.8 ? "closed" : "open"}>
        <g transform={`translate(${hand[0]} ${hand[1]}) rotate(${-20 + 60 * c})`}>
          <Dumbbell x={0} y={0} s={0.55} rot={90} />
        </g>
        {/* "sıkı ve şekilli": kol ve bacaklarda kas hatları belirir */}
        {tone > 0
          ? [armPoints(1, arm), armPoints(-1, [12, 0]), legPoints(-1, {}), legPoints(1, {})].map((pts, i) => {
              const m = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
              return (
                <path
                  key={i}
                  d={`M${m[0] - 14} ${m[1] - 28} Q${m[0] + 10} ${m[1]} ${m[0] - 14} ${m[1] + 28}`}
                  stroke={C.ink}
                  strokeWidth={5}
                  fill="none"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="1"
                  strokeDashoffset={1 - tone}
                  opacity={0.7}
                />
              );
            })
          : null}
        {/* kas çalışırken kolda sıcak bir parıltı */}
        <ellipse cx={100 + 20 * c} cy={-500} rx={40} ry={60} fill={C.glow} opacity={0.18 * c * grow} filter="url(#glow)" />
        {tone > 0
          ? [0, 1, 2, 3, 4].map((i) => {
              const a = (i / 5) * Math.PI * 2 + f / 20;
              return <Star key={i} x={Math.cos(a) * 230} y={-480 + Math.sin(a) * 300} r={22 * tone} rot={f * 4} />;
            })
          : null}
      </Person>
      {ghost > 0 ? <Cross x={895} y={PY - 240} size={140} p={tw(f, w(11) - 2, w(11) + 12)} /> : null}
    </>
  );
};

// "Sahnedeki o kaslı kadınlar mı? Arkalarında yıllar süren özel program ve çok sıkı bir diyet var."
const KadinSahne: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const light = tw(f, 0, 12);
  const pages = tw(f, w(6) - 2, w(7) + 10);
  const plan = pop(f, w(8) - 2, 14);
  const diet = tw(f, w(11) - 2, w(14) + 6);
  return (
    <>
      <rect x={0} y={0} width={1080} height={1920} fill="#2a2018" opacity={0.55 * light} />
      <path d="M540 120 L250 1250 L830 1250 Z" fill="#fff3c8" opacity={0.28 * light} />
      <ellipse cx={540} cy={1260} rx={320} ry={50} fill="#fff3c8" opacity={0.35 * light} />
      <rect x={180} y={1260} width={720} height={70} rx={10} fill="#6b4a2e" stroke={C.ink} strokeWidth={8} opacity={light} />
      <Person x={540} y={1262} s={0.8} female belly={0} limbW={1.8} shirt="#c9566b" armL={[95, -150]} armR={[95, -150]} mouth="grin" />
      {/* avatar seyircilerin arasında, sahneye bakıyor */}
      <Person x={150} y={1560} s={0.62} belly={0.4} armL={[12, 0]} armR={[12, 0]} mouth={f >= w(5) ? "smile" : "o"} eyes={f < w(5) ? "wide" : "open"} lookY={-8} tilt={-8} />
      {/* arka planda: yıllar (takvim yaprakları), program, diyet */}
      {pages > 0 ? (
        <g transform="translate(180 470)">
          <Calendar x={0} y={0} s={0.9} mark={1} />
          {Array.from({ length: 6 }, (_, i) => {
            const p = tw(pages, i / 6, (i + 1) / 6);
            return p > 0 && p < 1 ? (
              <rect key={i} x={-85} y={-80 - 300 * p} width={170} height={160} rx={10} fill={C.cream} stroke={C.ink} strokeWidth={5} opacity={1 - p} transform={`rotate(${-30 * p})`} />
            ) : null;
          })}
        </g>
      ) : null}
      {plan > 0 ? (
        <g transform={`translate(880 460) scale(${plan}) rotate(5)`}>
          <rect x={-90} y={-120} width={180} height={240} rx={12} fill={C.cream} stroke={C.ink} strokeWidth={7} />
          <rect x={-35} y={-136} width={70} height={30} rx={8} fill="#9a9a9a" stroke={C.ink} strokeWidth={5} />
          {[-60, -15, 30, 75].map((ly, i) => (
            <g key={ly}>
              <path d={`M-60 ${ly} l14 14 l26 -30`} stroke="#3f7d4f" strokeWidth={8} fill="none" strokeLinecap="round" opacity={tw(f, w(8) + i * 4, w(8) + i * 4 + 6)} />
              <path d={`M-10 ${ly} L60 ${ly}`} stroke={C.ink} strokeWidth={6} strokeLinecap="round" opacity={0.6} />
            </g>
          ))}
        </g>
      ) : null}
      {[0, 1, 2].map((i) => {
        const p = pop(f, w(11) - 2 + i * 6, 12);
        return p > 0 ? (
          <g key={i} transform={`translate(${i === 1 ? 175 : 880} ${i === 1 ? 760 : 700 + i * 60}) scale(${p})`} opacity={diet > 0 ? 1 : 0}>
            <rect x={-85} y={-50} width={170} height={100} rx={14} fill="#e8f1f0" stroke={C.ink} strokeWidth={6} />
            <path d="M-85 -10 L85 -10" stroke={C.ink} strokeWidth={4} opacity={0.5} />
            <ellipse cx={-35} cy={20} rx={30} ry={18} fill="#f3e3c3" stroke={C.ink} strokeWidth={3} />
            <ellipse cx={30} cy={18} rx={34} ry={16} fill="#d7a26a" stroke={C.ink} strokeWidth={3} />
            <circle cx={50} cy={-30} r={14} fill="#5e9a3c" stroke={C.ink} strokeWidth={3} />
          </g>
        ) : null;
      })}
    </>
  );
};

// "Asıl sürpriz kemiklerde. Menopozdan sonra kemik kaybı hızlanır."
const KadinKemik: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const L = { x: 690, y: 820, r: 270 };
  const person = { x: 330, y: PY, s: 0.78 };
  const open = tw(f, w(1) - 2, w(1) + 12);
  const porous = tw(f, w(3), d - 6, 0.05, 0.85);
  const H = { x: person.x, y: person.y - 330 * person.s };
  return (
    <>
      <Person x={110} y={PY + 40} s={0.6} belly={0.4} armL={[12, 0]} armR={[100, -30]} mouth={porous > 0.4 ? "worry" : "o"} eyes={porous > 0.4 ? "wide" : "open"} />
      <Person x={person.x} y={person.y} s={person.s} female belly={0.2} armL={[12, 0]} armR={[12, 0]} mouth={porous > 0.4 ? "worry" : "o"} lookY={4} />
      <g opacity={1 - tw(f, w(1) + 2, w(1) + 12)}>
        <MysteryBox x={L.x} y={L.y + 60} s={1.2} p={pop(f, 0, 12)} open={tw(f, w(1) - 2, w(1) + 8)} rays={false} shake={f < w(1) - 2 ? Math.sin(f / 2.4) * 6 : 0} />
      </g>
      {open > 0 ? (
        <g opacity={open}>
          <circle cx={H.x} cy={H.y} r={44} fill="none" stroke={C.ink} strokeWidth={6} strokeDasharray="12 9" />
          <path d={`M${H.x + 40} ${H.y - 20} L${L.x - L.r + 20} ${L.y - 120}`} stroke={C.ink} strokeWidth={5} strokeDasharray="14 10" opacity={0.55} />
          <path d={`M${H.x + 40} ${H.y + 20} L${L.x - L.r + 40} ${L.y + 160}`} stroke={C.ink} strokeWidth={5} strokeDasharray="14 10" opacity={0.55} />
          <g transform={`translate(${L.x} ${L.y}) scale(${open}) translate(${-L.x} ${-L.y})`}>
            <Bones x={L.x} y={L.y} r={L.r} porous={porous} />
          </g>
        </g>
      ) : null}
      {/* yıllar geçer: kum saati */}
      {f >= w(3) - 2 ? (
        <g transform={`translate(830 420) scale(${pop(f, w(3) - 2, 14)}) rotate(${tw(f, w(3), d, 0, 180)})`}>
          <path d="M-50 -70 L50 -70 L8 0 L50 70 L-50 70 L-8 0 Z" fill={C.cream} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
          <path d={`M-30 ${-50 + 40 * porous} L30 ${-50 + 40 * porous} L4 -6 L-4 -6 Z`} fill="#d79a4e" />
        </g>
      ) : null}
    </>
  );
};

// "Bir araştırmada ağır kaldıran kadınların omurga ve kalça kemik yoğunluğu sekiz ayda arttı."
const KadinArastirma: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const L = { x: 770, y: 760, r: 240 };
  const lift = (1 - Math.cos(f / 9)) / 2;
  const porous = tw(f, w(4), w(12), 0.85, 0.05);
  const glow = tw(f, w(9), w(12) + 6);
  const s = 0.82;
  const px = 380;
  const barY = PY - 250 * s - 120 * s * lift;
  const lens = tw(f, w(4) - 4, w(4) + 10);
  return (
    <>
      <Gym o={0.7} />
      <Person x={110} y={PY + 40} s={0.6} belly={0.4} armL={glow > 0.3 ? [160, -10] : [12, 0]} armR={glow > 0.3 ? [160, -10] : [12, 0]} mouth={glow > 0.3 ? "grin" : "smile"} />
      <Person x={px} y={PY + 6 * (1 - lift)} s={s} female belly={0.15} armL={[6, 0]} armR={[6, 0]} mouth={lift > 0.6 ? "flat" : "o"} eyes={lift > 0.7 ? "closed" : "open"} />
      <Barbell x={px} y={barY} s={0.55} />
      {lens > 0 ? (
        <g transform={`translate(${L.x} ${L.y}) scale(${lens}) translate(${-L.x} ${-L.y})`}>
          <Bones x={L.x} y={L.y} r={L.r} porous={porous} glow={glow} />
        </g>
      ) : null}
      <HandText x={760} y={1130} text="8 ay" size={130} p={tw(f, w(10) - 2, w(11) + 6)} color={C.red} rotate={-4} />
      <Arrow d="M880 1100 L880 940" p={tw(f, w(12) - 2, w(12) + 8)} color="#3f7d4f" w={14} />
      <Arrow d="M850 975 L880 935 L910 975" p={tw(f, w(12) + 4, w(12) + 10)} color="#3f7d4f" w={14} />
      {cycles(f, w(9), 12, 30).map(({ k, p }) => (
        <Star key={k} x={L.x + Math.cos(k * 2.1) * 200 * p} y={L.y - 40 + Math.sin(k * 2.1) * 200 * p} r={14 * (1 - p)} rot={f * 5} />
      ))}
    </>
  );
};

// "Yani ağırlık seni iri yapmaz. Seni güçlü yapar."
const KadinSonuc: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const ghost = pop(f, w(3) - 2, 12) * (1 - tw(f, w(4) + 6, w(5)));
  const up = tw(f, w(5) - 2, w(6) + 4);
  const s = 0.95;
  const armUp: Arm = [12 + 160 * up, -10 * up];
  const hand = armPoints(1, armUp)[2];
  return (
    <>
      <Gym />
      {ghost > 0 ? (
        <g opacity={0.4 * ghost}>
          <Person x={860} y={PY} s={0.55} female belly={0.15} limbW={2.2} armL={[40, -120]} armR={[40, -120]} mouth="flat" />
        </g>
      ) : null}
      {ghost > 0 ? <Cross x={860} y={PY - 240} size={130} p={tw(f, w(4) - 2, w(4) + 10)} /> : null}
      <Person x={130} y={PY + 40} s={0.58} belly={0.4} armL={up > 0.5 ? [140, -60] : [12, 0]} armR={[12, 0]} mouth={up > 0.5 ? "grin" : "smile"} />
      {up > 0.3 ? <ellipse cx={PX - 60} cy={PY - 420} rx={260 * up} ry={420 * up} fill={C.yellow} opacity={0.18 * up} filter="url(#glow)" /> : null}
      <Person x={PX - 60} y={PY - 10 * up} s={s} female belly={0.15} armL={[12 + 160 * up, -10 * up]} armR={armUp} mouth={up > 0.5 ? "grin" : "smile"}>
        {up > 0 ? (
          <g transform={`translate(0 ${hand[1] - 10})`}>
            <Barbell x={0} y={0} s={0.62} />
          </g>
        ) : null}
      </Person>
    </>
  );
};

// "Bunu, \"iri olurum\" diyen arkadaşına gönder. Çünkü..."
// Arkadaş "iri olurum" diye düşünür; avatar videoyu telefondan gönderir (kâğıt uçak); "Çünkü..." denince
// balon patlar ve arkadaş dambılı eline alır — açılış karesiyle aynı an (döngü).
const KadinKapanis: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const phone = tw(f, w(0) - 4, w(0) + 6);
  const plane = tw(f, w(4), w(5) + 6);
  const burst = tw(f, w(6) - 2, w(6) + 6);
  const grab = tw(f, w(6), d - 4);
  const bubble = pop(f, 0, 14) * (1 - burst);
  const avArm: Arm = [interpolate(phone, [0, 1], [12, 40]) , interpolate(phone, [0, 1], [0, -150])];
  const ph = armPoints(1, avArm)[2];
  return (
    <>
      <Gym />
      <Barbell x={480} y={PY - 60} s={0.45} />
      {/* aynadaki yansıma (açılış karesiyle aynı, döngü) */}
      <g opacity={0.35}>
        <Person x={810} y={1010} s={0.42} female belly={0.2} armL={[12, 0]} armR={curlArm(0)} mouth="flat" />
      </g>
      <Person x={250} y={PY + 20} s={0.82} belly={0.4} armL={[12, 0]} armR={avArm} mouth="grin">
        {phone > 0 ? <PhoneInHand arm={avArm} /> : null}
      </Person>
      <Person x={720} y={PY} s={0.9} female belly={0.2} armL={[12, 0]} armR={curlArm(0)} mouth={burst > 0.5 ? "smile" : "worry"} eyes={plane >= 1 && burst < 0.5 ? "wide" : "open"}>
        {grab > 0 ? (
          <g transform={`translate(${armPoints(1, curlArm(0))[2][0]} ${armPoints(1, curlArm(0))[2][1] + 60 * (1 - grab)}) rotate(-20)`} opacity={Math.min(1, grab * 3)}>
            <Dumbbell x={0} y={0} s={0.55} rot={90} />
          </g>
        ) : null}
      </Person>
      {bubble > 0 ? (
        <Bubble x={760} y={520} rx={200} ry={160} p={bubble} tail={[730, 760]}>
          <Person x={760} y={640} s={0.27} female belly={0.15} limbW={2.3} armL={[60, -120]} armR={[60, -120]} mouth="flat" />
        </Bubble>
      ) : null}
      {burst > 0 && burst < 1
        ? Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return <circle key={i} cx={760 + Math.cos(a) * (180 + 150 * burst)} cy={520 + Math.sin(a) * (140 + 130 * burst)} r={14 * (1 - burst)} fill={C.cream} stroke={C.ink} strokeWidth={4} />;
          })
        : null}
      {/* kâğıt uçak: avatarın telefonundan arkadaşa */}
      {plane > 0 && plane < 1 ? (
        <g transform={`translate(${interpolate(plane, [0, 1], [250 + ph[0] * 0.82, 690])} ${interpolate(plane, [0, 1], [PY + 20 + ph[1] * 0.82, 760]) - Math.sin(plane * Math.PI) * 260}) rotate(${-20 + 40 * plane})`}>
          <path d="M-40 0 L40 -18 L-10 22 Z" fill="#fff" stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
          <path d="M-10 22 L0 4 L40 -18" fill="#dcd6c8" stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
        </g>
      ) : null}
    </>
  );
};

/* ---------- 04 (yeni hikâye): 104 yıl bekleyen kadınlar ---------- */

// Eski fotoğraf katmanı: koyu sepya ton, kenar kararması, çizikler ve hafif titreşim (1896)
const OldPhoto: React.FC<{ o: number }> = ({ o }) => {
  const f = useCurrentFrame();
  if (o <= 0) return null;
  const flick = 0.92 + 0.08 * random(`fl${Math.floor(f / 2)}`);
  return (
    <g opacity={o} pointerEvents="none">
      <rect x={-50} y={-50} width={1180} height={2020} fill="#7a5426" opacity={0.28 * flick} />
      <rect x={-50} y={-50} width={1180} height={2020} fill="none" stroke="#3a2716" strokeWidth={90} opacity={0.35} />
      {[0, 1, 2].map((i) => {
        const x = random(`sc${i}${Math.floor(f / 3)}`) * 1080;
        return <path key={i} d={`M${x} 0 L${x + 6} 1920`} stroke="#fff6dc" strokeWidth={2 + i} opacity={0.35 * random(`so${i}${Math.floor(f / 3)}`)} />;
      })}
    </g>
  );
};

// Antik Yunan tapınağı (1896 Atina)
const Temple: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} stroke={C.ink} strokeWidth={7} strokeLinejoin="round">
    <path d="M-330 -420 L0 -560 L330 -420 Z" fill="#e8dcc0" />
    <rect x={-340} y={-420} width={680} height={50} fill="#e1d3b2" />
    {[-260, -130, 0, 130, 260].map((cx) => (
      <g key={cx}>
        <rect x={cx - 34} y={-370} width={68} height={350} fill="#efe5cd" />
        <rect x={cx - 46} y={-382} width={92} height={22} fill="#e1d3b2" />
        {[-14, 0, 14].map((g) => (
          <path key={g} d={`M${cx + g} -355 L${cx + g} -35`} strokeWidth={3} opacity={0.5} />
        ))}
      </g>
    ))}
    <rect x={-360} y={-20} width={720} height={40} fill="#e1d3b2" />
  </g>
);

// Eski tip yuvarlak uçlu halter
const GlobeBarbell: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} stroke={C.ink} strokeWidth={6}>
    <rect x={-200} y={-8} width={400} height={16} rx={8} fill="#9a9a9a" />
    {[-1, 1].map((k) => (
      <g key={k}>
        <circle cx={k * 200} cy={0} r={62} fill="#3a3a40" />
        <ellipse cx={k * 200 - 18} cy={-20} rx={18} ry={10} fill="#fff" opacity={0.25} stroke="none" />
      </g>
    ))}
  </g>
);

const Rope: React.FC<{ x1: number; x2: number; y: number }> = ({ x1, x2, y }) => (
  <g stroke={C.ink} strokeWidth={6}>
    {[x1, x2].map((x) => (
      <g key={x}>
        <rect x={x - 10} y={y - 120} width={20} height={150} rx={6} fill="#c9a74a" />
        <circle cx={x} cy={y - 126} r={16} fill="#c9a74a" />
      </g>
    ))}
    <path d={`M${x1} ${y - 100} Q${(x1 + x2) / 2} ${y - 40} ${x2} ${y - 100}`} stroke="#b23a2a" strokeWidth={14} fill="none" />
  </g>
);

const GoldMedal: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-30 -90 L0 -20 L30 -90" stroke="#4f97c2" strokeWidth={16} fill="none" />
    <circle cx={0} cy={10} r={40} fill="#f2c94c" stroke={C.ink} strokeWidth={6} />
    <Star x={0} y={10} r={20} rot={0} />
  </g>
);

const OperaHouse: React.FC<{ x: number; y: number; s?: number; o?: number }> = ({ x, y, s = 1, o = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o} stroke={C.ink} strokeWidth={6} strokeLinejoin="round">
    <rect x={-260} y={-10} width={520} height={40} fill="#d9c6a0" />
    {[
      [-200, 150],
      [-80, 190],
      [50, 170],
      [170, 120],
    ].map(([cx, h], i) => (
      <path key={i} d={`M${cx - 70} -10 Q${cx - 40} ${-h} ${cx + 40} ${-h - 10} Q${cx + 10} ${-h * 0.5} ${cx + 30} -10 Z`} fill="#fbf3e2" />
    ))}
  </g>
);

const Confetti: React.FC<{ start: number; n?: number }> = ({ start, n = 40 }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const t = f - start;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x = random(`cfx${i}`) * 1080 + Math.sin(t / 8 + i) * 30;
        const y = -40 + ((random(`cfy${i}`) * 300 + t * (6 + 4 * random(`cfv${i}`))) % 1500);
        const c = [C.red, C.yellow, C.water, "#5e9a3c", "#c9566b"][i % 5];
        return <rect key={i} x={x} y={y} width={18} height={10} fill={c} transform={`rotate(${t * 9 + i * 40} ${x} ${y})`} />;
      })}
    </g>
  );
};

// "Bin sekiz yüz doksan altı. İlk modern olimpiyatlarda erkekler ağırlık kaldırdı. Kadınlar mı? Tam yüz dört yıl bekledi."
const Kadin1896: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const lift = tw(f, w(8) - 4, w(10) + 4);
  const arms: Arm = [interpolate(lift, [0, 1], [20, 168]), interpolate(lift, [0, 1], [-20, -8])];
  const hand = armPoints(1, arms)[2];
  const focus = tw(f, w(11) - 2, w(12) + 6);
  const years = tw(f, w(13), w(17) + 4);
  const A = { x: 360, y: 1300, s: 0.82 };
  return (
    <>
      <Temple x={540} y={1080} s={1.05} />
      <path d="M-20 1080 L1100 1080" stroke={C.ink} strokeWidth={6} />
      <rect x={-20} y={1080} width={1120} height={900} fill="#d6c39b" opacity={0.6} />
      <HandText x={540} y={330} text="1896" size={170} p={tw(f, 2, w(4) + 4)} rotate={-3} />
      {/* serinin avatarı 1896'da halter kaldırıyor */}
      <Person x={A.x} y={A.y} s={A.s} belly={0.35} armL={arms} armR={arms} mouth={lift > 0.5 ? "grin" : "flat"} eyes={lift > 0.3 && lift < 0.9 ? "closed" : "open"}>
        <GlobeBarbell x={0} y={lift > 0 ? hand[1] : -40} s={0.7} />
      </Person>
      {/* ipin arkasında bekleyen kadınlar */}
      <g opacity={0.55 + 0.45 * focus}>
        {[0, 1, 2].map((i) => (
          <Person key={i} x={760 + i * 120} y={1250} s={0.52} female belly={0.2} shirt={["#9a7bb0", "#d9705f", "#6e8fb3"][i]} armL={[12, 0]} armR={[12, 0]} mouth={years > 0.3 ? "flat" : "smile"} lookY={-4} tilt={i === 1 ? -4 : 4} />
        ))}
        <Rope x1={700} x2={1040} y={1290} />
      </g>
      {focus > 0 ? <ellipse cx={880} cy={1050} rx={250 * focus} ry={330 * focus} fill="none" stroke={C.yellow} strokeWidth={10} opacity={0.8 * (1 - years)} /> : null}
      {/* yıllar geçer: 0 → 104 yıl */}
      {years > 0 ? (
        <g>
          <g transform="translate(880 620)">
            <circle r={90} fill={C.cream} stroke={C.ink} strokeWidth={8} />
            <path d={`M0 0 L${Math.sin(years * 60) * 65} ${-Math.cos(years * 60) * 65}`} stroke={C.ink} strokeWidth={8} strokeLinecap="round" />
            <path d={`M0 0 L${Math.sin(years * 5) * 45} ${-Math.cos(years * 5) * 45}`} stroke={C.red} strokeWidth={10} strokeLinecap="round" />
          </g>
          <Counter x={880} y={830} to={104} suffix=" yıl" p={years} size={110} color={C.red} rotate={-3} />
        </g>
      ) : null}
      <OldPhoto o={1 - tw(f, d - 8, d)} />
    </>
  );
};

// "İki bin yılında Sydney'de ilk altını kazanan kadın, kırk sekiz kilo sınıfında yarışıyordu."
const Kadin2000: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const color = tw(f, 0, 10); // eski fotoğraftan renge geçiş
  const opera = tw(f, w(3) - 2, w(3) + 10);
  const lift = tw(f, w(4) - 2, w(6) + 4);
  const arms: Arm = [interpolate(lift, [0, 1], [20, 168]), interpolate(lift, [0, 1], [-20, -8])];
  const hand = armPoints(1, arms)[2];
  const medal = pop(f, w(6), 16);
  const kg = tw(f, w(8), w(10) + 4);
  return (
    <>
      <path d="M540 120 L230 1250 L850 1250 Z" fill="#fff3c8" opacity={0.3} />
      <OperaHouse x={540} y={900} s={1.4} o={opera * 0.6} />
      <HandText x={540} y={330} text="2000" size={170} p={tw(f, 2, w(2) + 4)} rotate={-3} />
      <rect x={250} y={1240} width={580} height={70} rx={10} fill="#6b4a2e" stroke={C.ink} strokeWidth={8} />
      <Bathroom x={540} y={1236} value={`${Math.round(48 * kg)}.0 kg`} />
      <Person x={540} y={1180} s={0.8} female belly={0.1} armL={arms} armR={arms} mouth={lift > 0.6 ? "grin" : "flat"} eyes={lift > 0.3 && lift < 0.9 ? "closed" : "open"}>
        <Barbell x={0} y={lift > 0 ? hand[1] : -60} s={0.6} />
        {medal > 0 ? <GoldMedal x={0} y={-500} s={medal * 1.1} /> : null}
      </Person>
      {/* seyircide avatar alkışlıyor */}
      <Person x={140} y={1560} s={0.6} belly={0.4} armL={medal > 0.5 ? [150, -40 + 30 * Math.sin(f / 3)] : [12, 0]} armR={medal > 0.5 ? [150, -40 - 30 * Math.sin(f / 3)] : [12, 0]} mouth={medal > 0.5 ? "grin" : "o"} lookY={-8} />
      <Counter x={860} y={1100} to={48} suffix=" kg" p={kg} size={110} color={C.red} rotate={-4} />
      <Confetti start={w(6)} />
      <OldPhoto o={1 - color} />
    </>
  );
};

// "Yani ağırlık onu iri yapmamıştı. Ama bir korku hâlâ yaşıyor: \"Kaldırırsam iri olurum.\""
const KadinKorku: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const poster = pop(f, 0, 14);
  const ghost = pop(f, w(3) - 2, 12) * (1 - tw(f, w(4) + 6, w(5)));
  const dark = tw(f, w(5), w(7) + 6);
  const bubble = pop(f, w(10) - 2, 16);
  const shake = bubble > 0.9 ? Math.sin(f / 1.8) * 4 : 0;
  return (
    <>
      <Gym />
      {/* duvarda şampiyonun fotoğrafı: ince, güçlü, madalyalı */}
      {poster > 0 ? (
        <g transform={`translate(800 600) scale(${poster}) rotate(3)`}>
          <rect x={-170} y={-230} width={340} height={440} rx={10} fill="#f6ead0" stroke={C.ink} strokeWidth={8} />
          <Person x={0} y={150} s={0.42} female belly={0.1} armL={[150, -30]} armR={[150, -30]} mouth="grin">
            <GoldMedal x={0} y={-500} s={1.1} />
          </Person>
          <text x={0} y={190} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={50} fill={C.ink}>
            2000
          </text>
        </g>
      ) : null}
      {ghost > 0 ? (
        <g opacity={0.45 * ghost}>
          <Person x={1000} y={980} s={0.35} female belly={0.15} limbW={2.2} armL={[40, -120]} armR={[40, -120]} mouth="flat" />
          <Cross x={1000} y={830} size={80} p={tw(f, w(4) - 2, w(4) + 8)} />
        </g>
      ) : null}
      {dark > 0 ? <rect x={0} y={0} width={1080} height={1920} fill="#2a2018" opacity={0.3 * dark} /> : null}
      <Person x={250} y={PY + 20} s={0.78} belly={0.4} armL={[12, 0]} armR={[12, 0]} mouth={dark > 0.5 ? "worry" : "smile"} lookY={0} />
      <Person x={600} y={PY} s={0.9} female belly={0.2} armL={[12, 0]} armR={curlArm(0)} mouth={bubble > 0.5 ? "worry" : "flat"} eyes={bubble > 0.5 ? "wide" : "open"}>
        <g transform={`translate(${armPoints(1, curlArm(0))[2][0]} ${armPoints(1, curlArm(0))[2][1]}) rotate(-20)`}>
          <Dumbbell x={0} y={0} s={0.55} rot={90} />
        </g>
      </Person>
      {bubble > 0 ? (
        <g transform={`rotate(${shake} 560 500)`}>
          <Bubble x={560} y={500} rx={200} ry={160} p={bubble} tail={[600, 760]}>
            <Person x={560} y={620} s={0.27} female belly={0.15} limbW={2.3} armL={[60, -120]} armR={[60, -120]} mouth="flat" />
          </Bubble>
        </g>
      ) : null}
    </>
  );
};

// "Yani kasların güçlenir, sıkılaşır, şekillenir. Ama iri olmaz."
const KadinKas2: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const c = (1 - Math.cos(f / 6.5)) / 2;
  const grow = 1 + 0.12 * tw(f, w(1), w(2) + 6);
  const tone = tw(f, w(3), w(4) + 6);
  const ghost = pop(f, w(6) - 2, 12) * (1 - tw(f, w(7) + 8, w(7) + 20));
  const arm = curlArm(c);
  const hand = armPoints(1, arm)[2];
  return (
    <>
      <Gym />
      {ghost > 0 ? (
        <g opacity={0.45 * ghost}>
          <Person x={895} y={PY} s={0.56} female belly={0.15} limbW={2.2} armL={[40, -120]} armR={[40, -120]} mouth="flat" />
        </g>
      ) : null}
      {ghost > 0 ? <Cross x={895} y={PY - 240} size={140} p={tw(f, w(7) - 2, w(7) + 10)} /> : null}
      <Person x={190} y={PY + 30} s={0.7} belly={0.4} armL={[12, 0]} armR={[95, -25]} mouth={tone > 0.5 ? "grin" : "smile"} />
      <Person x={560} y={PY} s={0.88} female belly={0.15} limbW={grow} armL={[12, 0]} armR={arm} mouth={tone > 0.5 ? "grin" : "flat"} eyes={c > 0.85 ? "closed" : "open"}>
        <g transform={`translate(${hand[0]} ${hand[1]}) rotate(${-20 + 60 * c})`}>
          <Dumbbell x={0} y={0} s={0.55} rot={90} />
        </g>
        {tone > 0
          ? [armPoints(1, arm), armPoints(-1, [12, 0]), legPoints(-1, {}), legPoints(1, {})].map((pts, i) => {
              const m = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
              return <path key={i} d={`M${m[0] - 14} ${m[1] - 28} Q${m[0] + 10} ${m[1]} ${m[0] - 14} ${m[1] + 28}`} stroke={C.ink} strokeWidth={5} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - tone} opacity={0.7} />;
            })
          : null}
        {tone > 0
          ? [0, 1, 2, 3].map((i) => {
              const a = (i / 4) * Math.PI * 2 + f / 20;
              return <Star key={i} x={Math.cos(a) * 230} y={-480 + Math.sin(a) * 300} r={20 * tone} rot={f * 4} />;
            })
          : null}
      </Person>
    </>
  );
};

// "Asıl sürpriz kemiklerde. Bir araştırmada ağır kaldıran kadınların omurga ve kalça kemik yoğunluğu sekiz ayda arttı."
const KadinKemik2: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const L = { x: 770, y: 760, r: 240 };
  const open = tw(f, w(1) - 2, w(1) + 10);
  const lift = (1 - Math.cos(f / 9)) / 2;
  const porous = tw(f, w(5), w(15), 0.85, 0.05);
  const glow = tw(f, w(12), w(15) + 6);
  const px = 380;
  const s = 0.82;
  return (
    <>
      <Gym o={0.7} />
      <Person x={110} y={PY + 40} s={0.6} belly={0.4} armL={glow > 0.3 ? [160, -10] : [12, 0]} armR={glow > 0.3 ? [160, -10] : [12, 0]} mouth={glow > 0.3 ? "grin" : "o"} />
      <Person x={px} y={PY + 6 * (1 - lift)} s={s} female belly={0.15} armL={[6, 0]} armR={[6, 0]} mouth={lift > 0.6 ? "flat" : "o"} eyes={lift > 0.7 ? "closed" : "open"} />
      <Barbell x={px} y={PY - 250 * s - 120 * s * lift} s={0.55} />
      <g opacity={1 - tw(f, w(1) + 2, w(1) + 12)}>
        <MysteryBox x={L.x} y={L.y + 60} s={1.1} p={pop(f, 0, 12)} open={tw(f, w(1) - 2, w(1) + 8)} rays={false} shake={f < w(1) - 2 ? Math.sin(f / 2.4) * 5 : 0} />
      </g>
      {open > 0 ? (
        <g transform={`translate(${L.x} ${L.y}) scale(${open}) translate(${-L.x} ${-L.y})`}>
          <Bones x={L.x} y={L.y} r={L.r} porous={porous} glow={glow} />
        </g>
      ) : null}
      <HandText x={760} y={1130} text="8 ay" size={130} p={tw(f, w(13) - 2, w(14) + 6)} color={C.red} rotate={-4} />
      <Arrow d="M900 1100 L900 940" p={tw(f, w(15) - 2, w(15) + 8)} color="#3f7d4f" w={14} />
      <Arrow d="M870 975 L900 935 L930 975" p={tw(f, w(15) + 4, w(15) + 10)} color="#3f7d4f" w={14} />
    </>
  );
};

// "Yüz dört yıl beklediler. Sen bir gün daha bekleme."
const KadinMesaj: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const stack = pop(f, 0, 14);
  const today = pop(f, w(4) - 2, 14);
  const tear = tw(f, w(6), w(8) + 4);
  const lift = tw(f, w(8) - 2, d - 6);
  const arms: Arm = [interpolate(lift, [0, 1], [20, 168]), interpolate(lift, [0, 1], [-20, -8])];
  const hand = armPoints(1, arms)[2];
  return (
    <>
      <Gym />
      {/* 104 yıllık takvim yığını */}
      {stack > 0 ? (
        <g transform={`translate(220 640) scale(${stack})`}>
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={-90 + i * 3} y={-80 - i * 14} width={180} height={160} rx={10} fill={C.cream} stroke={C.ink} strokeWidth={5} />
          ))}
          <text x={10} y={20} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={70} fill={C.red}>
            104
          </text>
        </g>
      ) : null}
      {/* bugün: tek yaprak, koparılır */}
      {today > 0 ? (
        <g transform={`translate(860 560) scale(${today})`}>
          <rect x={-90} y={-80} width={180} height={160} rx={10} fill={C.cream} stroke={C.ink} strokeWidth={6} />
          <rect x={-90} y={-80} width={180} height={44} rx={10} fill={C.red} stroke={C.ink} strokeWidth={6} />
          <text x={0} y={-48} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={36} fill={C.cream}>
            bugün
          </text>
          {tear > 0 ? <rect x={-90} y={-36} width={180} height={116} rx={8} fill={C.cream} stroke={C.ink} strokeWidth={5} transform={`translate(${180 * tear} ${260 * tear * tear}) rotate(${40 * tear})`} opacity={1 - tear} /> : null}
        </g>
      ) : null}
      <Person x={150} y={PY + 40} s={0.6} belly={0.4} armL={lift > 0.6 ? [150, -40] : [12, 0]} armR={lift > 0.6 ? [150, -40] : [12, 0]} mouth={lift > 0.6 ? "grin" : "smile"} />
      <Person x={560} y={PY} s={0.92} female belly={0.15} armL={arms} armR={arms} mouth={lift > 0.5 ? "grin" : "flat"}>
        <Barbell x={0} y={lift > 0 ? hand[1] : -60} s={0.62} />
      </Person>
    </>
  );
};

// "Çünkü bu hikâye nasıl başladı, biliyor musun?" — avatar eski bir fotoğrafa bakar; kamera fotoğrafın içine dalar,
// fotoğraf ekranı kaplar ve 1896 sahnesi başlar (döngü)
const KadinDongu: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const photo = pop(f, w(1) - 2, 14);
  const dive = tw(f, w(3), d - 2, 0, 1);
  const sc = interpolate(dive, [0, 1], [0.45, 3.4]);
  return (
    <>
      <Gym o={1 - dive} />
      <Person x={250} y={PY + 20} s={0.82} belly={0.4} armL={[12, 0]} armR={[60, -110]} mouth="o" eyes="open" lookY={4} />
      {photo > 0 ? (
        <g transform={`translate(640 760) scale(${photo * sc})`}>
          <rect x={-280} y={-360} width={560} height={720} rx={10} fill="#efe2c4" stroke={C.ink} strokeWidth={8 / Math.max(1, sc)} />
          <g transform="translate(0 40) scale(0.48)">
            <Temple x={0} y={200} s={0.9} />
            <Person x={-220} y={420} s={0.62} belly={0.35} armL={[20, -20]} armR={[20, -20]}>
              <GlobeBarbell x={0} y={-40} s={0.7} />
            </Person>
            <Rope x1={180} x2={460} y={430} />
          </g>
          <rect x={-280} y={-360} width={560} height={720} rx={10} fill="#7a5426" opacity={0.28} />
        </g>
      ) : null}
      {photo > 0 ? <HandText x={640} y={330} text="?" size={150} p={pop(f, w(5), 12) * (1 - dive)} rotate={8} /> : null}
    </>
  );
};

/* ---------- 04 (güçlü giriş) ---------- */

// "Ağırlık kaldırırsan iri olur musun? Olimpiyatta halter altını alan ilk kadına bak: kırk sekiz kilo sınıfı."
// Önce korku (iri vücut balonu), sonra sert geçiş: spot ışığında madalyalı şampiyon, tartı 48 kg.
const KadinHook: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const bubble = pop(f, 3, 14);
  const cut = tw(f, w(5) - 3, w(5) + 5); // sahneye geçiş
  const lift = tw(f, w(6), w(8) + 4);
  const arms: Arm = [interpolate(lift, [0, 1], [20, 168]), interpolate(lift, [0, 1], [-20, -8])];
  const hand = armPoints(1, arms)[2];
  const medal = pop(f, w(8), 14);
  const kg = tw(f, w(12), w(15) + 2);
  const point = tw(f, w(10) - 2, w(11) + 4);
  return (
    <>
      {/* 1. korku: salonda dambıllı kadın, balonda iri vücut */}
      <g opacity={1 - cut}>
        <Gym />
        <Person x={250} y={PY + 20} s={0.82} belly={0.4} armL={[12, 0]} armR={[12, 0]} mouth="smile" />
        <Person x={720} y={PY} s={0.9} female belly={0.2} armL={[12, 0]} armR={curlArm(0)} mouth={bubble > 0.5 ? "worry" : "flat"} eyes={bubble > 0.5 ? "wide" : "open"}>
          <g transform={`translate(${armPoints(1, curlArm(0))[2][0]} ${armPoints(1, curlArm(0))[2][1]}) rotate(-20)`}>
            <Dumbbell x={0} y={0} s={0.55} rot={90} />
          </g>
        </Person>
        {bubble > 0 ? (
          <Bubble x={700} y={500} rx={200} ry={160} p={bubble} tail={[720, 760]}>
            <Person x={700} y={620} s={0.27} female belly={0.15} limbW={2.3} armL={[60, -120]} armR={[60, -120]} mouth="flat" />
            <text x={820} y={470} fontFamily={handFamily} fontWeight={700} fontSize={90} fill={C.red}>
              ?
            </text>
          </Bubble>
        ) : null}
      </g>
      {/* 2. cevap: spot ışığında ilk kadın halter şampiyonu */}
      {cut > 0 ? (
        <g opacity={cut}>
          <rect x={0} y={0} width={1080} height={1920} fill="#2a2018" opacity={0.55} />
          <path d="M540 80 L220 1290 L860 1290 Z" fill="#fff3c8" opacity={0.32} />
          <ellipse cx={540} cy={1300} rx={330} ry={50} fill="#fff3c8" opacity={0.35} />
          <rect x={250} y={1290} width={580} height={70} rx={10} fill="#6b4a2e" stroke={C.ink} strokeWidth={8} />
          <Bathroom x={540} y={1286} value={`${Math.round(48 * kg)}.0 kg`} />
          <Person x={540} y={1230} s={0.8} female belly={0.1} shirt="#4f97c2" armL={arms} armR={arms} mouth={lift > 0.6 ? "grin" : "flat"} eyes={lift > 0.3 && lift < 0.9 ? "closed" : "open"}>
            <Barbell x={0} y={hand[1]} s={0.6} />
            {medal > 0 ? <GoldMedal x={0} y={-500} s={medal * 1.1} /> : null}
          </Person>
          <Person x={150} y={1600} s={0.6} belly={0.4} armL={[12, 0]} armR={[interpolate(point, [0, 1], [12, 80]), interpolate(point, [0, 1], [0, -40])]} mouth={kg > 0.5 ? "o" : "smile"} eyes={kg > 0.5 ? "wide" : "open"} lookY={-8} />
          <Counter x={850} y={1150} to={48} suffix=" kg" p={kg} size={120} color={C.yellow} rotate={-4} />
        </g>
      ) : null}
    </>
  );
};

// "Ve kadınlar o sahneye çıkmak için yüz dört yıl bekledi. Erkekler bin sekiz yüz doksan altıdan beri kaldırıyordu."
const Kadin104: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const years = tw(f, w(6) - 2, w(9) + 4);
  const lift = tw(f, w(15), w(17) + 4);
  const arms: Arm = [interpolate(lift, [0, 1], [20, 168]), interpolate(lift, [0, 1], [-20, -8])];
  const hand = armPoints(1, arms)[2];
  return (
    <>
      <Temple x={540} y={1080} s={1.05} />
      <path d="M-20 1080 L1100 1080" stroke={C.ink} strokeWidth={6} />
      <rect x={-20} y={1080} width={1120} height={900} fill="#d6c39b" opacity={0.6} />
      <Person x={360} y={1300} s={0.82} belly={0.35} armL={arms} armR={arms} mouth={lift > 0.5 ? "grin" : "flat"}>
        <GlobeBarbell x={0} y={lift > 0 ? hand[1] : -40} s={0.7} />
      </Person>
      {[0, 1, 2].map((i) => (
        <Person key={i} x={760 + i * 120} y={1250} s={0.52} female belly={0.2} shirt={["#9a7bb0", "#d9705f", "#6e8fb3"][i]} armL={[12, 0]} armR={[12, 0]} mouth={years > 0.3 ? "flat" : "smile"} lookY={-4} tilt={i === 1 ? -4 : 4} />
      ))}
      <Rope x1={700} x2={1040} y={1290} />
      {/* yıllar akıp geçer: saat + 104 yıl */}
      <g transform="translate(880 600)">
        <circle r={90} fill={C.cream} stroke={C.ink} strokeWidth={8} />
        <path d={`M0 0 L${Math.sin(years * 60) * 65} ${-Math.cos(years * 60) * 65}`} stroke={C.ink} strokeWidth={8} strokeLinecap="round" />
        <path d={`M0 0 L${Math.sin(years * 5) * 45} ${-Math.cos(years * 5) * 45}`} stroke={C.red} strokeWidth={10} strokeLinecap="round" />
      </g>
      <Counter x={880} y={810} to={104} suffix=" yıl" p={years} size={110} color={C.red} rotate={-3} />
      <HandText x={330} y={360} text="1896" size={150} p={tw(f, w(11) - 2, w(16))} rotate={-4} />
      <OldPhoto o={1} />
    </>
  );
};

// "Ve bir dahaki sefere biri sana şunu sorarsa:" — arkadaş dambılla gelir, soracak; son kare = kanca sahnesinin ilk karesi
const KadinDongu2: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const come = tw(f, 0, w(4));
  const fw = walk(f, come > 0 && come < 1 ? 1 : 0, 4.5);
  const ask = pop(f, w(6), 12) * (1 - tw(f, d - 12, d - 4));
  return (
    <>
      <Gym />
      <Person x={250} y={PY + 20} s={0.82} belly={0.4} armL={[12, 0]} armR={[12, 0]} mouth="smile" lookY={0} />
      <Person x={interpolate(come, [0, 1], [1250, 720])} y={PY - fw.bob} s={0.9} female belly={0.2} legL={fw.legL} legR={fw.legR} armL={come < 1 ? fw.armL : [12, 0]} armR={curlArm(0)} mouth="flat">
        <g transform={`translate(${armPoints(1, curlArm(0))[2][0]} ${armPoints(1, curlArm(0))[2][1]}) rotate(-20)`}>
          <Dumbbell x={0} y={0} s={0.55} rot={90} />
        </g>
      </Person>
      {ask > 0 ? (
        <g transform={`translate(560 640) scale(${ask})`}>
          <ellipse rx={90} ry={70} fill={C.cream} stroke={C.ink} strokeWidth={6} />
          <path d="M40 55 L70 110 L10 62 Z" fill={C.cream} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
          <text x={0} y={30} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={90} fill={C.ink}>
            ?
          </text>
        </g>
      ) : null}
    </>
  );
};

/* ---------- 05 boyun: eşyalar ---------- */

const Phone: React.FC<{ x: number; y: number; s?: number; rot?: number; glow?: number }> = ({ x, y, s = 1, rot = 0, glow = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <rect x={-34} y={-60} width={68} height={120} rx={12} fill="#2f2f36" stroke={C.ink} strokeWidth={6} />
    <rect x={-26} y={-50} width={52} height={96} rx={6} fill="#9fd0e8" opacity={0.6 + 0.4 * glow} />
    <path d="M-18 -30 L18 -30 M-18 -14 L10 -14 M-18 2 L18 2" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.8} />
  </g>
);

const Kettlebell: React.FC<{ x: number; y: number; s?: number; label?: string }> = ({ x, y, s = 1, label }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-48 -70 Q-50 -130 0 -130 Q50 -130 48 -70" stroke={C.ink} strokeWidth={26} fill="none" strokeLinecap="round" />
    <path d="M-48 -70 Q-50 -130 0 -130 Q50 -130 48 -70" stroke="#4b4b55" strokeWidth={14} fill="none" strokeLinecap="round" />
    <path d="M-95 10 Q-100 -80 0 -80 Q100 -80 95 10 Q90 80 0 85 Q-90 80 -95 10 Z" fill="#4b4b55" stroke={C.ink} strokeWidth={8} />
    <ellipse cx={-40} cy={-30} rx={18} ry={10} fill="#fff" opacity={0.25} />
    {label ? (
      <text x={0} y={30} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={56} fill={C.cream}>
        {label}
      </text>
    ) : null}
  </g>
);

// Yandan boyun röntgeni: baş ve boyun omurları `angle` derece öne eğilir; yük oku ve kas gerilimi açıyla büyür
const NeckLens: React.FC<{ x: number; y: number; r: number; angle: number; kg: number; strain: number; rest?: number }> = ({ x, y, r, angle, kg, strain, rest = 0 }) => {
  const id = svgId(useId());
  const base = { x: x - 40, y: y + 170 };
  // boyun omurları: tabandan yukarı, eğilme açısı omurlara kademeli dağılır
  const verts: { x: number; y: number; a: number }[] = [];
  let px = base.x;
  let py = base.y;
  for (let i = 0; i < 7; i++) {
    const a = ((angle * (i + 1)) / 7) * (Math.PI / 180);
    px += Math.sin(a) * 30;
    py -= Math.cos(a) * 30;
    verts.push({ x: px, y: py, a: (angle * (i + 1)) / 7 });
  }
  const top = verts[6];
  const A = (angle * Math.PI) / 180;
  const head = { x: top.x + Math.sin(A) * 95 + Math.cos(A) * 35, y: top.y - Math.cos(A) * 95 + Math.sin(A) * 35 };
  const muscle = verts.map((v) => `${(v.x - Math.cos((v.a * Math.PI) / 180) * 38).toFixed(1)},${(v.y - Math.sin((v.a * Math.PI) / 180) * 38).toFixed(1)}`).join(" ");
  const tense = interpolate(strain, [0, 1], [0, 1]);
  const mColor = `rgb(${200 + 40 * tense} ${120 - 70 * tense} ${110 - 70 * tense})`;
  return (
    <g>
      <clipPath id={`nk${id}`}>
        <circle cx={x} cy={y} r={r} />
      </clipPath>
      <circle cx={x} cy={y} r={r} fill="#24333f" />
      <g clipPath={`url(#nk${id})`}>
        {/* omuzlar ve sırt */}
        <path d={`M${base.x - 160} ${base.y + 120} Q${base.x - 60} ${base.y + 10} ${base.x} ${base.y} Q${base.x + 90} ${base.y + 20} ${base.x + 200} ${base.y + 130}`} stroke="#53606b" strokeWidth={50} fill="none" strokeLinecap="round" />
        {/* boyun kası: gerildikçe kızarır ve kalınlaşır */}
        <polyline points={muscle} stroke={mColor} strokeWidth={16 + 10 * tense} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
        {rest > 0 ? <polyline points={muscle} stroke="#6fd08c" strokeWidth={20} fill="none" strokeLinecap="round" opacity={0.6 * rest} /> : null}
        {verts.map((v, i) => (
          <rect key={i} x={v.x - 22} y={v.y - 11} width={44} height={22} rx={7} fill="#f4efe2" stroke="#9fb6c4" strokeWidth={3} transform={`rotate(${v.a} ${v.x} ${v.y})`} />
        ))}
        {/* kafatası: yandan, yüzü sağa bakar */}
        <g transform={`rotate(${angle} ${top.x} ${top.y})`}>
          <path
            d={`M${top.x - 20} ${top.y - 10} C${top.x - 110} ${top.y - 60} ${top.x - 90} ${top.y - 230} ${top.x + 20} ${top.y - 220} C${top.x + 120} ${top.y - 215} ${top.x + 135} ${top.y - 120} ${top.x + 120} ${top.y - 70} L${top.x + 132} ${top.y - 48} L${top.x + 110} ${top.y - 40} C${top.x + 105} ${top.y - 10} ${top.x + 60} ${top.y + 15} ${top.x + 20} ${top.y + 5} Z`}
            fill="#f4efe2"
            stroke="#9fb6c4"
            strokeWidth={4}
          />
          <circle cx={top.x + 70} cy={top.y - 120} r={20} fill="#24333f" />
        </g>
      </g>
      {/* yer çekimi: başın ağırlık merkezinden aşağı ok, uzunluğu yükle büyür */}
      {kg > 0 ? (
        <g>
          <path d={`M${head.x} ${head.y} L${head.x} ${head.y + 40 + kg * 6}`} stroke={C.red} strokeWidth={12} strokeLinecap="round" />
          <path d={`M${head.x - 22} ${head.y + 18 + kg * 6} L${head.x} ${head.y + 46 + kg * 6} L${head.x + 22} ${head.y + 18 + kg * 6}`} stroke={C.red} strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : null}
      {/* açı yayı */}
      {angle > 1 ? (
        <g>
          <path d={`M${base.x} ${base.y} L${base.x} ${base.y - 230}`} stroke="#fff" strokeWidth={4} strokeDasharray="10 8" opacity={0.6} />
          <path d={`M${base.x} ${base.y - 120} A120 120 0 0 1 ${base.x + Math.sin(A) * 120} ${base.y - Math.cos(A) * 120}`} stroke={C.yellow} strokeWidth={6} fill="none" />
          <text x={base.x + Math.sin(A / 2) * 160 - 10} y={base.y - Math.cos(A / 2) * 160} fontFamily={handFamily} fontWeight={700} fontSize={54} fill={C.yellow}>
            {Math.round(angle)}°
          </text>
        </g>
      ) : null}
      <circle cx={x} cy={y} r={r} fill="none" stroke={C.ink} strokeWidth={16} />
      <circle cx={x} cy={y} r={r - 14} fill="none" stroke="#9fd0e8" strokeWidth={4} opacity={0.5} />
    </g>
  );
};

// Avatar telefona bakarken: sağ el telefonu göğüs/yüz hizasında tutar
const PHONE_ARM: Arm = [40, -150];
const PhoneInHand: React.FC<{ arm: Arm; glow?: number }> = ({ arm, glow = 1 }) => {
  const h = armPoints(1, arm)[2];
  return <Phone x={h[0] - 10} y={h[1] - 40} s={1} rot={-10} glow={glow} />;
};

/* ---------- 05 boyun: hikâye — "boynunda bir çocuk taşıyorsun" ---------- */

// Ense dambılı: omuzların üstünde, başın arkasında (yandaki plakalar görünür); üstünde "27 kg" etiketi
const neckSeat = (ax: number, ay: number, as: number) => ({ x: ax, y: ay - 640 * as, s: 2.1 * as });
const NeckDumbbell: React.FC<{ x: number; y: number; s: number; label?: number; rot?: number }> = ({ x, y, s, label = 0, rot = 0 }) => (
  <g>
    <Dumbbell x={x} y={y} s={s} rot={rot} />
    {label > 0 ? (
      <g transform={`translate(${x + 115 * s} ${y - 95 * s}) scale(${label * 1.5})`}>
        <rect x={-62} y={-34} width={124} height={56} rx={10} fill={C.cream} stroke={C.ink} strokeWidth={5} />
        <text x={0} y={8} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={40} fill={C.red}>
          27 kg
        </text>
      </g>
    ) : null}
  </g>
);

// Avatar + ensesindeki dambıl (dambıl önce çizilir, avatarın başı önde kalır)
const AvatarWithDumbbell: React.FC<{ x: number; y: number; s: number; kid: number; arm?: Arm; mouth?: Mouth; eyes?: Eyes; lookY?: number; blush?: number; badge?: number; phone?: boolean }> = ({
  x,
  y,
  s,
  kid,
  arm = PHONE_ARM,
  mouth = "flat",
  eyes = "open",
  lookY = 12,
  blush = 0.5,
  badge = 0,
  phone = true,
}) => {
  const seat = neckSeat(x, y, s);
  return (
    <>
      {kid > 0 ? (
        <g opacity={kid}>
          <NeckDumbbell x={seat.x} y={seat.y} s={seat.s} label={badge} />
        </g>
      ) : null}
      <Person x={x} y={y} s={s} belly={0.4} armL={[12, 0]} armR={arm} mouth={mouth} eyes={eyes} lookY={lookY} blush={blush}>
        {phone ? <PhoneInHand arm={arm} /> : null}
      </Person>
    </>
  );
};

const BELL_START = { x: PX + 210, y: PY - 40 }; // açılış ve kapanış: dambıl avatarın yanında yerde durur (döngü karesi)

// "Telefona her baktığında, boynunda yirmi yedi kiloluk bir dambıl taşıyor gibisin."
const BoyunAcilis: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const A = { x: PX - 60, y: PY, s: 0.95 };
  const wobble = f < w(2) ? Math.sin(f / 1.5) * 4 * tw(f, 2, w(1)) : 0; // yerdeki dambıl titrer: geliyor…
  const fly = tw(f, w(2), w(3) + 2);
  const landed = fly >= 1;
  const squash = landed ? 1 - 0.06 * Math.exp(-(f - w(3) - 2) / 6) - 0.02 : 1;
  const seat = neckSeat(A.x, A.y, A.s * squash);
  const dx = interpolate(fly, [0, 1], [BELL_START.x, seat.x]);
  const dy = interpolate(fly, [0, 1], [BELL_START.y, seat.y]) - Math.sin(fly * Math.PI) * 300;
  const label = pop(f, w(4) - 2, 14);
  const sweat = tw(f, w(9) - 2, w(9) + 8);
  return (
    <>
      {landed ? (
        <AvatarWithDumbbell x={A.x} y={A.y} s={A.s * squash} kid={1} mouth="worry" eyes={sweat > 0.5 ? "wide" : "open"} badge={label} blush={0.5 + 0.4 * sweat} />
      ) : (
        <>
          <Person x={A.x} y={A.y} s={A.s} belly={0.4} armL={[12, 0]} armR={PHONE_ARM} mouth="smile" lookY={12}>
            <PhoneInHand arm={PHONE_ARM} />
          </Person>
          <g transform={`rotate(${wobble + 200 * fly} ${dx} ${dy})`}>
            <NeckDumbbell x={dx} y={dy} s={interpolate(fly, [0, 1], [1.1, seat.s])} />
          </g>
        </>
      )}
      {sweat > 0
        ? cycles(f, w(9), 10, 26).map(({ k, p }) => <Drop key={k} x={A.x + (k % 2 ? 1 : -1) * (95 + 40 * p) * A.s} y={A.y - 740 * A.s + 160 * p * p} s={0.8} o={(1 - p) * sweat} />)
        : null}
    </>
  );
};

// "Sabah uyanınca, otobüste, işte, gece yatakta... O dambıl hep orada."
const BoyunGun: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  // her mekân kendi kelimesinde belirir
  const seg = f < w(2) - 2 ? 0 : f < w(3) - 2 ? 1 : f < w(4) - 2 ? 2 : 3;
  const starts = [0, w(2) - 2, w(3) - 2, w(4) - 2];
  const fade = tw(f, starts[seg], starts[seg] + 6);
  const A = { x: 560, y: PY, s: 0.9 };
  const kidLook = f >= w(6) ? 1 : 0;
  return (
    <>
      <g opacity={fade}>
        {seg === 0 || seg === 3 ? (
          <g>
            {/* yatak odası: sabah güneş, gece ay */}
            <rect x={60} y={360} width={320} height={300} rx={12} fill={seg === 0 ? "#cfe6f2" : "#3b3f5c"} stroke={C.ink} strokeWidth={8} />
            {seg === 0 ? <Sun x={220} y={480} s={0.6} rot={f} /> : <Moon x={220} y={500} s={0.6} />}
            <rect x={640} y={1150} width={400} height={110} rx={20} fill={seg === 0 ? "#f3e6c4" : "#6b6f8c"} stroke={C.ink} strokeWidth={8} />
            <rect x={640} y={1080} width={120} height={90} rx={20} fill={C.cream} stroke={C.ink} strokeWidth={7} />
            <rect x={660} y={1260} width={30} height={70} fill="#8a5c35" stroke={C.ink} strokeWidth={6} />
            <rect x={990} y={1260} width={30} height={70} fill="#8a5c35" stroke={C.ink} strokeWidth={6} />
            {seg === 0 ? (
              <g transform={`translate(170 1240) rotate(${Math.sin(f / 1.5) * 8})`}>
                <circle r={60} fill={C.red} stroke={C.ink} strokeWidth={7} />
                <circle r={44} fill={C.cream} />
                <path d="M0 0 L0 -30 M0 0 L22 10" stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
                <path d="M-46 -52 l-14 -14 M46 -52 l14 -14" stroke={C.ink} strokeWidth={7} strokeLinecap="round" />
              </g>
            ) : null}
            {seg === 3 ? <rect x={0} y={0} width={1080} height={1920} fill="#1d2235" opacity={0.25} /> : null}
          </g>
        ) : seg === 1 ? (
          <g>
            {/* otobüs: pencereler kayar, tutunma direği */}
            <rect x={-20} y={300} width={1120} height={420} fill="#e3d9c3" stroke={C.ink} strokeWidth={8} />
            {[0, 1, 2].map((i) => {
              const x = ((i * 380 - (f - starts[1]) * 9) % 1140 + 1140) % 1140 - 60;
              return (
                <g key={i}>
                  <rect x={x} y={360} width={300} height={260} rx={16} fill="#cfe6f2" stroke={C.ink} strokeWidth={7} />
                  <circle cx={x + 80 + ((i * 50) % 120)} cy={540} r={40} fill="#8bb36a" opacity={0.7} />
                </g>
              );
            })}
            <path d="M880 280 L880 1330" stroke="#9a9a9a" strokeWidth={22} />
            <path d="M-20 300 L1100 300" stroke={C.ink} strokeWidth={10} />
          </g>
        ) : (
          <g>
            {/* iş: masa ve ekran */}
            <rect x={600} y={1020} width={440} height={34} rx={8} fill="#b07b4a" stroke={C.ink} strokeWidth={8} />
            <rect x={640} y={1054} width={26} height={280} fill="#8a5c35" stroke={C.ink} strokeWidth={6} />
            <rect x={980} y={1054} width={26} height={280} fill="#8a5c35" stroke={C.ink} strokeWidth={6} />
            <rect x={700} y={760} width={300} height={200} rx={12} fill="#2f3b4a" stroke={C.ink} strokeWidth={8} />
            <rect x={725} y={785} width={250} height={150} fill="#9fd0e8" opacity={0.7} />
            <path d="M850 960 L850 1020 M800 1020 L900 1020" stroke={C.ink} strokeWidth={10} />
          </g>
        )}
      </g>
      <AvatarWithDumbbell x={A.x - (seg === 2 ? 120 : 0)} y={A.y} s={A.s} kid={1} mouth={seg === 3 ? "flat" : "worry"} eyes={seg === 0 ? (f < 8 ? "closed" : "open") : "open"} badge={kidLook} blush={0.6} />
    </>
  );
};

// "Başın aslında beş kilo civarında. Ama öne eğildikçe yer çekimi bir kaldıraç gibi çalışır."
const BoyunKaldirac: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const lens = tw(f, 0, 12);
  const kg = tw(f, w(1), w(3) + 4) * 5;
  const angle = tw(f, w(6), w(13) + 6, 0, 15);
  const lever = pop(f, w(11) - 2, 14);
  return (
    <>
      <g transform={`translate(540 760) scale(${lens}) translate(-540 -760)`}>
        <NeckLens x={540} y={760} r={330} angle={angle} kg={angle > 0 ? interpolate(angle, [0, 15], [5, 12]) : kg} strain={angle / 60} />
      </g>
      <Counter x={540} y={1250} to={5} suffix=" kg" p={tw(f, w(1), w(3) + 4)} size={100} color={C.red} rotate={0} />
      {lever > 0 ? (
        <g transform={`translate(830 1300) scale(${lever}) rotate(${-10 + 20 * tw(f, w(11), w(13) + 6)})`}>
          <path d="M-150 0 L150 0" stroke={C.ink} strokeWidth={14} strokeLinecap="round" />
          <path d="M-20 40 L0 4 L20 40 Z" fill={C.ink} />
          <circle cx={130} cy={-30} r={28} fill={C.red} stroke={C.ink} strokeWidth={5} />
        </g>
      ) : null}
      <g transform="translate(200 1330) scale(0.5) translate(-200 -1330)">
        <AvatarWithDumbbell x={200} y={1330} s={1} kid={1} badge={1} />
      </g>
    </>
  );
};

// "On beş derecede on iki kilo. Altmış derecede, yani tam telefona bakarken: yirmi yedi kilo."
const BoyunAltmis: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const a1 = tw(f, 0, w(2), 15, 15);
  const angle = f < w(6) ? a1 : tw(f, w(6), w(11) + 4, 15, 60);
  const kg = f < w(6) ? 12 : f < w(12) - 2 ? interpolate(angle, [15, 60], [12, 20]) : interpolate(tw(f, w(12) - 2, w(14) + 4), [0, 1], [20, 27]);
  const reveal = f >= w(12) - 2;
  const shake = reveal ? Math.sin(f / 1.6) * 4 * (1 - tw(f, w(14), w(14) + 16)) : 0;
  const kidUp = tw(f, w(12), w(14) + 2);
  return (
    <g transform={`translate(${shake} 0)`}>
      <NeckLens x={540} y={700} r={320} angle={angle} kg={kg} strain={Math.min(1, kg / 27)} />
      <Counter x={250} y={1170} to={12} suffix=" kg" p={tw(f, w(3), w(5) + 4)} size={90} color={C.red} rotate={-4} />
      {/* 27 kilo = o dambıl: tartıya düşer, tartı 27 kg gösterir */}
      {reveal ? (
        <g>
          <Bathroom x={780} y={1330} value={`${Math.round(interpolate(kidUp, [0, 1], [0, 27]))}.0 kg`} />
          <NeckDumbbell x={780} y={1330 - 110 - 400 * (1 - kidUp) * (1 - kidUp)} s={1.1} label={kidUp} />
        </g>
      ) : (
        <HandText x={780} y={1250} text="?" size={160} p={pop(f, w(8), 12)} />
      )}
    </g>
  );
};

// "Ama işin ilginç tarafı şu: araştırmalar bu duruşun tek başına boyun ağrısı yaptığını net olarak göstermedi."
const BoyunSurpriz: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const box = tw(f, w(5) - 3, w(5) + 9);
  const left = pop(f, w(7) - 2, 14);
  const right = pop(f, w(10) - 2, 14);
  const chain = tw(f, w(11), w(12) + 6);
  const snap = tw(f, w(15) - 2, w(15) + 8);
  const links = 6;
  return (
    <>
      <MysteryBox x={540} y={560} s={1.05} p={pop(f, 0, 12)} open={box} shake={f < w(5) - 3 ? Math.sin(f / 2.4) * 6 : 0}>
        {[0, 1, 2].map((i) => (
          <rect key={i} x={-70 + i * 12} y={-90 + i * 10} width={140} height={170} rx={8} fill={C.cream} stroke={C.ink} strokeWidth={6} />
        ))}
      </MysteryBox>
      {/* duruş (eğik baş) ↔ ağrı (şimşek): arada zincir, "göstermedi" denince kopar */}
      {left > 0 ? (
        <g transform={`translate(230 1000) scale(${left})`}>
          <circle r={110} fill={C.cream} stroke={C.ink} strokeWidth={8} />
          <Person x={0} y={95} s={0.22} belly={0.4} armL={[12, 0]} armR={PHONE_ARM} mouth="flat" lookY={12}>
            <PhoneInHand arm={PHONE_ARM} />
          </Person>
        </g>
      ) : null}
      {right > 0 ? (
        <g transform={`translate(850 1000) scale(${right})`}>
          <circle r={110} fill={C.cream} stroke={C.ink} strokeWidth={8} />
          <path d="M10 -70 L-30 5 L5 5 L-15 75 L40 -15 L5 -15 Z" fill={C.yellow} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
        </g>
      ) : null}
      {chain > 0
        ? Array.from({ length: links }, (_, i) => {
            const p = tw(chain, i / links, (i + 1) / links);
            const mid = i < links / 2 ? -1 : 1;
            const fall = snap * (Math.abs(i - (links - 1) / 2) < 1 ? 1 : 0.3);
            return p > 0 ? (
              <ellipse
                key={i}
                cx={360 + i * 72 + mid * 30 * snap}
                cy={1000 + 140 * fall * fall}
                rx={34}
                ry={20}
                fill="none"
                stroke={C.ink}
                strokeWidth={9}
                opacity={p * (1 - 0.6 * fall)}
                transform={`rotate(${(i % 2 ? 90 : 0) + 50 * fall * mid} ${360 + i * 72} ${1000})`}
              />
            ) : null;
          })
        : null}
      <Person x={540} y={PY + 220} s={0.45} belly={0.4} armL={[12, 0]} armR={snap > 0.5 ? [150, -140] : [12, 0]} mouth={snap > 0.5 ? "o" : "flat"} eyes={snap > 0.5 ? "wide" : "open"} lookY={-6} />
    </>
  );
};

// "Asıl yorucu olan, o çocuğu saatlerce hiç indirmemek. Boyun kasların dinlenemez."
const BoyunAsil: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const spin = tw(f, w(5) - 2, w(7) + 8);
  const strain = tw(f, w(8), d - 6, 0.4, 1);
  const sun = tw(f, w(5), w(7) + 8);
  const sleepy = f >= w(6);
  return (
    <>
      <rect x={70} y={300} width={300} height={300} rx={12} fill={sun > 0.5 ? "#3b3f5c" : "#cfe6f2"} stroke={C.ink} strokeWidth={8} />
      <Sun x={220} y={380 + 260 * sun} s={0.6} o={1 - sun} />
      <Moon x={220} y={600 - 200 * sun} s={0.6} o={sun} />
      <g transform="translate(830 430)">
        <circle r={110} fill={C.cream} stroke={C.ink} strokeWidth={9} />
        <path d={`M0 0 L${Math.sin(spin * 40) * 80} ${-Math.cos(spin * 40) * 80}`} stroke={C.ink} strokeWidth={9} strokeLinecap="round" />
        <path d={`M0 0 L${Math.sin(spin * 3.3) * 55} ${-Math.cos(spin * 3.3) * 55}`} stroke={C.red} strokeWidth={12} strokeLinecap="round" />
        <circle r={10} fill={C.ink} />
      </g>
      {/* dambıl saatlerce ensede kalır; avatar giderek çöker, ter damlaları */}
      <AvatarWithDumbbell x={330} y={PY + 40} s={0.85 * (1 - 0.04 * strain)} kid={1} mouth={sleepy ? "worry" : "flat"} badge={1} blush={0.4 + 0.4 * strain} />
      {sleepy
        ? cycles(f, w(6), 12, 30).map(({ k, p }) => <Drop key={k} x={330 + (k % 2 ? 1 : -1) * (90 + 40 * p) * 0.85} y={PY + 40 - 700 * 0.85 + 150 * p * p} s={0.75} o={1 - p} />)
        : null}
      <g transform="translate(790 1060) scale(0.6) translate(-540 -780)">
        <NeckLens x={540} y={780} r={330} angle={55} kg={0} strain={strain} />
      </g>
      {f >= w(8) ? (
        <g opacity={0.5 + 0.5 * Math.abs(Math.sin(f / 5))}>
          <path d="M790 780 L830 710 L870 780 Z" fill={C.yellow} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
          <path d="M830 732 L830 755 M830 766 L830 768" stroke={C.ink} strokeWidth={7} strokeLinecap="round" />
        </g>
      ) : null}
    </>
  );
};

// "Telefonu göz hizasına kaldır, ara ara başını çevir. Çocuk iner, boynun rahatlar."
const BoyunCozum: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const A = { x: 400, y: PY, s: 0.9 };
  const raise = tw(f, w(0), w(3) + 6);
  const arm: Arm = [interpolate(raise, [0, 1], [40, 120]), -150];
  const turn = f >= w(4) - 2 && f < w(8) ? Math.sin((f - w(4)) / 5) * 12 : 0;
  const hop = tw(f, w(8) - 2, w(9) + 6);
  const relief = tw(f, w(10), w(11) + 8);
  const seat = neckSeat(A.x, A.y, A.s);
  const kx = interpolate(hop, [0, 1], [seat.x, 820]);
  const ky = interpolate(hop, [0, 1], [seat.y, PY - 40]) - Math.sin(hop * Math.PI) * 200;
  return (
    <>
      {hop > 0 ? (
        <g transform={`rotate(${-120 * hop} ${kx} ${ky})`}>
          <NeckDumbbell x={kx} y={ky} s={interpolate(hop, [0, 1], [seat.s, 1.1])} />
        </g>
      ) : null}
      <AvatarWithDumbbell x={A.x} y={A.y} s={A.s} kid={hop > 0 ? 0 : 1} arm={arm} mouth={relief > 0.5 ? "grin" : raise > 0.5 ? "smile" : "flat"} lookY={interpolate(raise, [0, 1], [12, 0])} blush={0.4} />
      {/* baş çevirme: avatarın başına küçük dönme okları */}
      {turn !== 0 ? (
        <g opacity={0.8}>
          <Arrow d={`M${A.x - 120} ${A.y - 760} q-40 30 0 60`} p={1} w={7} />
          <Arrow d={`M${A.x + 120} ${A.y - 760} q40 30 0 60`} p={1} w={7} />
        </g>
      ) : null}
      {relief > 0
        ? [0, 1, 2].map((i) => {
            const a = f / 14 + (i * Math.PI * 2) / 3;
            return <Star key={i} x={A.x + Math.cos(a) * 140} y={A.y - 690 + Math.sin(a) * 30} r={18 * relief} rot={f * 4} />;
          })
        : null}
      <Counter x={760} y={560} to={5} suffix=" kg" p={relief} size={100} color="#3f7d4f" rotate={0} />
    </>
  );
};

// "Ama telefona tekrar baktığın an, o dambıl geri gelir. Çünkü..."
// Dambıl yerde durur; avatar yeniden telefona bakınca dambıl titremeye başlar = açılış karesi (döngü)
const BoyunKapanis: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const A = { x: PX - 60, y: PY, s: 0.95 };
  const look = tw(f, w(1), w(4));
  const arm: Arm = [interpolate(look, [0, 1], [120, 40]), -150];
  const wob = f >= w(6) && f < w(9) - 2 ? Math.sin(f / 1.5) * 5 : 0;
  return (
    <>
      <Person x={A.x} y={A.y} s={A.s} belly={0.4} armL={[12, 0]} armR={arm} mouth={look > 0.5 ? "smile" : "grin"} lookY={interpolate(look, [0, 1], [0, 12])}>
        <PhoneInHand arm={arm} />
      </Person>
      <g transform={`rotate(${wob} ${BELL_START.x} ${BELL_START.y})`}>
        <NeckDumbbell x={BELL_START.x} y={BELL_START.y} s={1.1} />
      </g>
      {f >= w(6) && f < w(9) ? <HandText x={900} y={1000} text="!" size={130} p={pop(f, w(6), 12)} color={C.red} rotate={8} /> : null}
    </>
  );
};

/* ---------- 04 kısa sürüm: güçlü kemik sahnesi ve kapanış ---------- */

// "Asıl sürpriz kemiklerde: bir araştırmada kemik yoğunluğu sekiz ayda arttı."
// Kadın halteri kaldırdıkça röntgendeki kemik her tekrarda biraz daha dolar ve parlar; takvim 8 aya döner.
const KadinKemik3: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const L = { x: 720, y: 720, r: 270 };
  const open = tw(f, w(2) - 2, w(2) + 10);
  const period = 26;
  const lift = (1 - Math.cos((f / period) * Math.PI * 2)) / 2;
  const fill = tw(f, w(2) + 6, w(9) + 6);
  const porous = interpolate(fill, [0, 1], [0.85, 0.04]);
  const glow = tw(f, w(8), w(9) + 8);
  // her tekrarın tepesinde (kol yukarıda) kemikte bir dalga
  const repPhase = ((f + period / 2) % period) / period;
  const pulse = open > 0.9 && f > w(2) + 6 && f < d - 10 ? 1 - repPhase : 0;
  const px = 300;
  const s = 0.86;
  return (
    <>
      <Gym o={0.7} />
      <Person x={110} y={PY + 40} s={0.6} belly={0.4} armL={glow > 0.3 ? [160, -10] : [12, 0]} armR={glow > 0.3 ? [160, -10] : [12, 0]} mouth={glow > 0.3 ? "grin" : "o"} eyes={open > 0.5 ? "wide" : "open"} />
      <Person x={px} y={PY + 6 * (1 - lift)} s={s} female belly={0.15} armL={[6, 0]} armR={[6, 0]} mouth={lift > 0.6 ? "flat" : "o"} eyes={lift > 0.7 ? "closed" : "open"} />
      <Barbell x={px} y={PY - 250 * s - 120 * s * lift} s={0.55} />
      <g opacity={1 - tw(f, w(2), w(2) + 10)}>
        <MysteryBox x={L.x} y={L.y + 60} s={1.15} p={pop(f, 0, 10)} open={tw(f, w(2) - 2, w(2) + 8)} rays={false} shake={f < w(2) - 2 ? Math.sin(f / 2.4) * 6 : 0} />
      </g>
      {open > 0 ? (
        <g transform={`translate(${L.x} ${L.y}) scale(${open}) translate(${-L.x} ${-L.y})`}>
          <Bones x={L.x} y={L.y} r={L.r} porous={porous} glow={glow} />
          {pulse > 0 ? <circle cx={L.x} cy={L.y} r={L.r * (0.35 + 0.6 * (1 - pulse))} fill="none" stroke={C.yellow} strokeWidth={10} opacity={0.6 * pulse} /> : null}
        </g>
      ) : null}
      {/* yükselen dolgu çubuğu: kemik yoğunluğu */}
      {open > 0 ? (
        <g opacity={open}>
          <rect x={1005} y={470} width={44} height={500} rx={20} fill={C.cream} stroke={C.ink} strokeWidth={6} />
          <rect x={1011} y={476 + 488 * (1 - fill)} width={32} height={488 * fill} rx={14} fill="#3f7d4f" />
        </g>
      ) : null}
      <Counter x={720} y={1170} to={8} suffix=" ay" p={tw(f, w(7) - 2, w(8) + 4)} size={130} color={C.red} rotate={-4} />
      <Arrow d="M1027 1060 L1027 1000" p={tw(f, w(9) - 2, w(9) + 8)} color="#3f7d4f" w={14} />
      {glow > 0
        ? [0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2 + f / 18;
            return <Star key={i} x={L.x + Math.cos(a) * (L.r + 40)} y={L.y + Math.sin(a) * (L.r + 40)} r={22 * glow} rot={f * 4} />;
          })
        : null}
    </>
  );
};

// "Ve biri sana bunu yine sorarsa, sadece kırk sekiz kiloyu hatırla."
// Arkadaş dambılla gelir, "?" belirir; "kırk sekiz"de şampiyonun fotoğrafı (48 kg, madalya) avatarın yanında parlar.
// Son karede fotoğraf kaybolur: sahne kancanın ilk karesine döner (döngü).
const KadinDongu3: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const come = tw(f, 0, w(3));
  const fw = walk(f, come > 0 && come < 1 ? 1 : 0, 4.5);
  const end = 1 - tw(f, d - 16, d - 6);
  const ask = pop(f, w(5) - 2, 12) * end;
  const photo = pop(f, w(7) - 2, 14) * end;
  const kg = tw(f, w(7), w(9));
  return (
    <>
      <Gym />
      <Person x={250} y={PY + 20} s={0.82} belly={0.4} armL={[12, 0]} armR={photo > 0.5 ? [100, -40] : [12, 0]} mouth={photo > 0.5 ? "grin" : "smile"} lookY={0} />
      <Person x={interpolate(come, [0, 1], [1250, 720])} y={PY - fw.bob} s={0.9} female belly={0.2} legL={fw.legL} legR={fw.legR} armL={come < 1 ? fw.armL : [12, 0]} armR={curlArm(0)} mouth={photo > 0.5 ? "o" : "flat"} eyes={photo > 0.5 ? "wide" : "open"}>
        <g transform={`translate(${armPoints(1, curlArm(0))[2][0]} ${armPoints(1, curlArm(0))[2][1]}) rotate(-20)`}>
          <Dumbbell x={0} y={0} s={0.55} rot={90} />
        </g>
      </Person>
      {ask > 0 ? (
        <g transform={`translate(720 600) scale(${ask})`}>
          <ellipse rx={90} ry={70} fill={C.cream} stroke={C.ink} strokeWidth={6} />
          <path d="M10 62 L-10 120 L-40 58 Z" fill={C.cream} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
          <text x={0} y={30} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={90} fill={C.ink}>
            ?
          </text>
        </g>
      ) : null}
      {photo > 0 ? (
        <g transform={`translate(400 470) scale(${photo * 0.9}) rotate(-5)`}>
          <circle r={260} fill={C.yellow} opacity={0.18} />
          <rect x={-170} y={-230} width={340} height={440} rx={10} fill="#2a2018" stroke={C.ink} strokeWidth={8} />
          <path d="M0 -220 L-130 160 L130 160 Z" fill="#fff3c8" opacity={0.3} />
          <Person x={0} y={150} s={0.42} female belly={0.1} shirt="#4f97c2" armL={[168, -8]} armR={[168, -8]} mouth="grin">
            <Barbell x={0} y={armPoints(1, [168, -8])[2][1]} s={0.5} />
            <GoldMedal x={0} y={-500} s={1.1} />
          </Person>
          <Counter x={0} y={200} to={48} suffix=" kg" p={kg} size={70} color={C.yellow} rotate={0} />
        </g>
      ) : null}
    </>
  );
};

/* ---------- 04 v5: "104 yıl" hikâyesi, her sahnede ortada tek büyük olay ---------- */

// Yeniden kullanılır: büyük, kalın kırmızı "yasak" tabelası
const SignBoard: React.FC<{ x: number; y: number; p: number; lines: string[]; rot?: number }> = ({ x, y, p, lines, rot = -6 }) =>
  p > 0 ? (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${p})`}>
      <rect x={-250} y={-40 - 60 * lines.length} width={500} height={120 * lines.length + 20} rx={18} fill={C.red} stroke={C.ink} strokeWidth={10} />
      {lines.map((t, i) => (
        <text key={i} x={0} y={-60 * lines.length + 50 + i * 120} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={96} fill={C.cream}>
          {t}
        </text>
      ))}
    </g>
  ) : null;

// Uçuşan takvim yaprakları: zaman akıyor
const FlyingPages: React.FC<{ start: number; end: number; y?: number }> = ({ start, end, y = 700 }) => {
  const f = useCurrentFrame();
  return (
    <g>
      {cycles(f, start, 4, 34)
        .filter(({ k }) => start + k * 4 < end)
        .map(({ k, p }) => {
          const yy = y + ((k * 97) % 260) - 130 + 60 * Math.sin(p * 6 + k);
          const xx = interpolate(p, [0, 1], [1160, -80]);
          return (
            <g key={k} transform={`translate(${xx} ${yy}) rotate(${p * 300 + k * 40})`} opacity={interpolate(p, [0, 0.1, 0.9, 1], [0, 1, 1, 0])}>
              <rect x={-38} y={-34} width={76} height={68} rx={6} fill={C.cream} stroke={C.ink} strokeWidth={4} />
              <rect x={-38} y={-34} width={76} height={18} rx={6} fill={C.red} stroke={C.ink} strokeWidth={4} />
            </g>
          );
        })}
    </g>
  );
};

// "Ağırlık kaldırırsan iri olur musun? Bu soru yüzünden kadınlar yüz dört yıl bekletildi."
// Kadın dambıl çalışırken kolları balon gibi şişer (korku) → "Bu soru"da söner, önüne ip iner, 104 yıl sayacı, takvimler uçuşur.
const Kadin5Hook: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const c = (1 - Math.cos(f / 7)) / 2;
  const deflate = tw(f, w(5) - 2, w(5) + 6);
  const swell = tw(f, w(2) - 2, w(4) + 2) * (1 - deflate);
  const wob = swell > 0.05 ? Math.sin(f / 2.2) * 0.08 * swell : 0;
  const rope = tw(f, w(6) - 2, w(7) + 2);
  const years = tw(f, w(9) - 2, w(12) + 2);
  const arm = curlArm(c * (1 - rope));
  const hand = armPoints(1, arm)[2];
  return (
    <>
      <Gym />
      <FlyingPages start={w(9)} end={w(12) + 20} y={760} />
      <Person x={250} y={PY + 20} s={0.82} belly={0.4} armL={[12, 0]} armR={[12, 0]} mouth={swell > 0.4 ? "o" : "smile"} eyes={swell > 0.4 ? "wide" : "open"} />
      <Person x={720} y={PY} s={0.9} female belly={0.2} limbW={1 + 1.6 * swell + wob} armL={swell > 0.2 ? [40 * swell, -60 * swell] : [12, 0]} armR={arm} mouth={swell > 0.4 ? "worry" : rope > 0.5 ? "flat" : "smile"} eyes={swell > 0.4 ? "wide" : "open"}>
        <g transform={`translate(${hand[0]} ${hand[1]}) rotate(${-20 + 60 * c * (1 - rope)})`}>
          <Dumbbell x={0} y={0} s={0.55} rot={90} />
        </g>
      </Person>
      {swell > 0.3 ? <HandText x={900} y={520} text="?" size={170} p={swell} color={C.red} rotate={10} /> : null}
      {rope > 0 ? (
        <g transform={`translate(0 ${interpolate(rope, [0, 1], [-900, 0])})`}>
          <Rope x1={520} x2={920} y={PY + 30} />
        </g>
      ) : null}
      <Counter x={540} y={420} to={104} suffix=" yıl" p={years} size={190} color={C.red} rotate={-3} />
    </>
  );
};

// "Erkekler bin sekiz yüz doksan altıda olimpiyatta halter kaldırdı. Kadınlara ise iri olursunuz dendi."
const Kadin5_1896: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const lift = tw(f, w(6), w(8) + 4);
  const arms: Arm = [interpolate(lift, [0, 1], [20, 168]), interpolate(lift, [0, 1], [-20, -8])];
  const hand = armPoints(1, arms)[2];
  const turn = tw(f, w(9) - 2, w(9) + 8);
  const sign = pop(f, w(11) - 2, 12);
  const back = tw(f, w(11), w(12) + 4);
  const shake = sign > 0 && f < w(11) + 14 ? Math.sin(f * 1.7) * 6 : 0;
  return (
    <>
      <Temple x={540} y={1080} s={1.05} />
      <path d="M-20 1080 L1100 1080" stroke={C.ink} strokeWidth={6} />
      <rect x={-20} y={1080} width={1120} height={900} fill="#d6c39b" opacity={0.6} />
      <HandText x={540} y={330} text="1896" size={190} p={tw(f, w(1) - 2, w(5))} rotate={-4} />
      <Person x={330} y={1300} s={0.82} belly={0.35} armL={arms} armR={arms} mouth={lift > 0.5 ? "grin" : "flat"}>
        <GlobeBarbell x={0} y={lift > 0 ? hand[1] : -40} s={0.7} />
      </Person>
      {lift > 0.9 ? <Confetti start={w(8)} n={18} /> : null}
      {[0, 1, 2].map((i) => (
        <Person key={i} x={760 + i * 120 + 40 * back} y={1250} s={0.52} female belly={0.2} shirt={["#9a7bb0", "#d9705f", "#6e8fb3"][i]} armL={[12, 0]} armR={turn > 0.5 && i === 1 ? [70, -40] : [12, 0]} mouth={back > 0.3 ? "worry" : turn > 0.5 ? "smile" : "flat"} eyes={back > 0.3 ? "wide" : "open"} lookY={-4} tilt={i === 1 ? -4 : 4} />
      ))}
      <Rope x1={700} x2={1040} y={1290} />
      <g transform={`rotate(${shake} 780 860)`}>
        <SignBoard x={780} y={880} p={sign * 0.85} lines={["İRİ", "OLURSUNUZ!"]} rot={-6} />
      </g>
      <OldPhoto o={0.85} />
    </>
  );
};

// "İki binde sonunda sahneye çıktılar. İlk final kaç kiloydu, biliyor musun? Kırk sekiz."
// Yıl sayacı 1896 → 2000, ip kopar; spot ışığında tartı: rakamlar titrer ("?"), "kırk sekiz"de 48'e kilitlenir.
const Kadin5_2000: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const yr = Math.round(1896 + 104 * Easing.out(Easing.quad)(tw(f, 0, w(1) + 6)));
  const snap = tw(f, w(2), w(2) + 10);
  const cut = tw(f, w(3) - 2, w(4) + 2);
  const guess = f >= w(7) - 2 && f < w(11);
  const kg = tw(f, w(11), w(12) + 2);
  const val = guess ? `${10 + Math.floor(random(`kg${Math.floor(f / 3)}`) * 89)}.${Math.floor(random(`kd${Math.floor(f / 3)}`) * 10)} kg` : f >= w(11) ? `${Math.round(48 * kg)}.0 kg` : "0.0 kg";
  const lift = tw(f, w(11), w(12) + 6);
  const arms: Arm = [interpolate(lift, [0, 1], [20, 168]), interpolate(lift, [0, 1], [-20, -8])];
  const hand = armPoints(1, arms)[2];
  const medal = pop(f, w(12), 14);
  const ask = pop(f, w(7) - 2, 12) * (1 - tw(f, w(11), w(11) + 6));
  return (
    <>
      {/* A: bekleyiş biter, ip kopar */}
      <g opacity={1 - cut}>
        <Gym o={0.5} />
        <text x={540} y={430} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={200} fill={yr >= 2000 ? C.red : C.ink} transform="rotate(-3 540 430)">
          {yr}
        </text>
        <Person x={540} y={PY} s={0.9} female belly={0.2} armL={[12, 0]} armR={[12, 0]} mouth={snap > 0.3 ? "grin" : "flat"} eyes={snap > 0.3 ? "wide" : "open"} />
        <g stroke={C.ink} strokeWidth={6}>
          {[300, 780].map((x) => (
            <g key={x}>
              <rect x={x - 10} y={PY - 90} width={20} height={150} rx={6} fill="#c9a74a" />
              <circle cx={x} cy={PY - 96} r={16} fill="#c9a74a" />
            </g>
          ))}
          <path d={`M300 ${PY - 70} Q${420 - 40 * snap} ${PY - 10 + 120 * snap} ${540 - 30 * snap} ${PY - 40 + 200 * snap}`} stroke={C.red} strokeWidth={14} fill="none" />
          <path d={`M780 ${PY - 70} Q${660 + 40 * snap} ${PY - 10 + 120 * snap} ${540 + 30 * snap} ${PY - 40 + 200 * snap}`} stroke={C.red} strokeWidth={14} fill="none" />
        </g>
        {snap > 0 && snap < 1 ? <Star x={540} y={PY - 40} r={50 * (1 - snap)} rot={f * 8} /> : null}
      </g>
      {/* B: sahne, spot ışığı, tartı */}
      {cut > 0 ? (
        <g opacity={cut}>
          <rect x={0} y={0} width={1080} height={1920} fill="#2a2018" opacity={0.55} />
          <path d="M540 80 L220 1290 L860 1290 Z" fill="#fff3c8" opacity={0.32} />
          <ellipse cx={540} cy={1300} rx={330} ry={50} fill="#fff3c8" opacity={0.35} />
          <rect x={250} y={1290} width={580} height={70} rx={10} fill="#6b4a2e" stroke={C.ink} strokeWidth={8} />
          <g transform="translate(540 1286) scale(1.35) translate(-540 -1286)">
            <Bathroom x={540} y={1286} value={val} />
          </g>
          <Person x={540} y={1230} s={0.8} female belly={0.1} shirt="#4f97c2" armL={arms} armR={arms} mouth={lift > 0.6 ? "grin" : "flat"} eyes={lift > 0.3 && lift < 0.9 ? "closed" : "open"}>
            <Barbell x={0} y={lift > 0 ? hand[1] : -60} s={0.6} />
            {medal > 0 ? <GoldMedal x={0} y={-500} s={medal * 1.1} /> : null}
          </Person>
          <Person x={150} y={1620} s={0.6} belly={0.4} armL={[12, 0]} armR={[12, 0]} mouth={kg > 0.5 ? "o" : "flat"} eyes={kg > 0.5 ? "wide" : "open"} lookY={-8} />
          {ask > 0 ? (
            <g transform={`translate(220 1120) scale(${ask})`}>
              <ellipse rx={80} ry={64} fill={C.cream} stroke={C.ink} strokeWidth={6} />
              <text x={0} y={28} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={84} fill={C.ink}>
                ?
              </text>
            </g>
          ) : null}
          <Counter x={830} y={1120} to={48} suffix=" kg" p={kg} size={150} color={C.yellow} rotate={-5} />
          <Confetti start={w(12)} n={30} />
        </g>
      ) : null}
    </>
  );
};

// Büyüteç altında kas lifleri: thick = lif kalınlığı, glow = güçlenme parıltısı
const MuscleLens: React.FC<{ x: number; y: number; r: number; p: number; thick: number; glow?: number; label: string }> = ({ x, y, r, p, thick, glow = 0, label }) => {
  const id = svgId(useId());
  if (p <= 0) return null;
  const n = 5;
  const gap = (r * 1.5) / n;
  return (
    <g transform={`translate(${x} ${y}) scale(${p}) translate(${-x} ${-y})`}>
      <clipPath id={`ml${id}`}>
        <circle cx={x} cy={y} r={r} />
      </clipPath>
      <circle cx={x} cy={y} r={r} fill="#3a2430" />
      <g clipPath={`url(#ml${id})`}>
        {Array.from({ length: n }, (_, i) => {
          const cy = y - r * 0.75 + gap * (i + 0.5);
          const h = gap * 0.55 * thick;
          return (
            <g key={i}>
              <rect x={x - r - 20} y={cy - h / 2} width={r * 2 + 40} height={h} rx={h / 2} fill="#c9566b" stroke={C.ink} strokeWidth={4} />
              <path d={`M${x - r} ${cy - h * 0.15} L${x + r} ${cy - h * 0.15}`} stroke="#f2a3b0" strokeWidth={4} opacity={0.7} />
            </g>
          );
        })}
        {glow > 0 ? <circle cx={x} cy={y} r={r} fill={C.yellow} opacity={0.22 * glow} /> : null}
      </g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={C.ink} strokeWidth={14} />
      <text x={x} y={y - r - 24} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={80} fill={C.ink}>
        {label}
      </text>
    </g>
  );
};

// "Peki neden iri olmadılar? Çünkü kası iri yapan testosteron, kadınlarda erkeklerin onda biri kadar. Kas güçlenir ama iri olmaz."
// Kamera iki kolun içine girer: erkeğin kasına testosteron yağar, lifler şişer; kadınınkine birkaç damla, lifler güçlenir ama şişmez.
const Kadin5Hormon: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const q = pop(f, 0, 12) * (1 - tw(f, w(4) - 4, w(4) + 2));
  const lens = pop(f, w(4) - 2, 14);
  const rainM = tw(f, w(8) - 2, w(13));
  const thickM = 1 + 0.75 * rainM;
  const thickF = 1 + 0.08 * tw(f, w(9), w(13));
  const ratio = pop(f, w(11) - 2, 14);
  const strong = tw(f, w(14), w(15) + 6);
  const ghost = tw(f, w(16), w(17) + 4) * (1 - tw(f, w(18) + 10, w(18) + 22));
  const L = { m: [290, 640], fm: [790, 640] };
  const drops = [
    ...cycles(f, w(8) - 2, 3, 16).filter(({ k }) => w(8) - 2 + k * 3 < w(13)).map(({ k, p }) => ({ k, p, x: L.m[0] })),
    ...cycles(f, w(9), 28, 16).filter(({ k }) => w(9) + k * 28 < w(13)).map(({ k, p }) => ({ k: k + 1000, p, x: L.fm[0] })),
  ];
  return (
    <>
      <Gym o={0.5} />
      <Person x={290} y={PY + 180} s={0.62} belly={0.35} limbW={1 + 0.5 * rainM} armL={[12 + 60 * rainM, -100 * rainM]} armR={[12 + 60 * rainM, -100 * rainM]} mouth={rainM > 0.5 ? "grin" : "smile"} lookY={-6} />
      <Person x={790} y={PY + 180} s={0.62} female belly={0.2} armL={[12, 0]} armR={strong > 0.3 ? [140, -60] : [12, 0]} mouth={strong > 0.5 ? "grin" : q > 0.3 ? "worry" : "o"} lookY={-6} />
      {q > 0 ? <HandText x={540} y={560} text="?" size={360} p={q} color={C.red} rotate={6} /> : null}
      <MuscleLens x={L.m[0]} y={L.m[1]} r={220} p={lens} thick={thickM} label="erkek" />
      <MuscleLens x={L.fm[0]} y={L.fm[1]} r={220} p={lens} thick={thickF} glow={strong} label="kadın" />
      {drops.map(({ k, p, x }) => (
        <g key={k} opacity={interpolate(p, [0, 0.15, 0.85, 1], [0, 1, 1, 0])}>
          <circle cx={x + ((k * 53) % 160) - 80} cy={250 + 340 * p} r={22} fill={C.water} stroke={C.ink} strokeWidth={4} />
          <text x={x + ((k * 53) % 160) - 80} y={250 + 340 * p + 10} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={30} fill={C.cream}>
            T
          </text>
        </g>
      ))}
      <HandText x={540} y={230} text="testosteron" size={96} p={tw(f, w(8) - 2, w(8) + 12)} rotate={-3} />
      {ratio > 0 ? (
        <g transform={`translate(540 960) scale(${ratio})`}>
          <rect x={-190} y={-90} width={380} height={130} rx={20} fill={C.cream} stroke={C.ink} strokeWidth={8} />
          <text x={0} y={20} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={110} fill={C.red}>
            10 : 1
          </text>
        </g>
      ) : null}
      {strong > 0
        ? [0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2 + f / 18;
            return <Star key={i} x={L.fm[0] + Math.cos(a) * 260} y={L.fm[1] + Math.sin(a) * 260} r={22 * strong} rot={f * 4} />;
          })
        : null}
      {ghost > 0 ? (
        <g>
          <circle cx={L.fm[0]} cy={L.fm[1]} r={220 + 70 * ghost} fill="none" stroke={C.red} strokeWidth={8} strokeDasharray="22 18" opacity={0.8 * ghost} />
          <Cross x={L.fm[0]} y={L.fm[1]} size={200} p={tw(f, w(18) - 2, w(18) + 10)} />
        </g>
      ) : null}
    </>
  );
};

// "Yüz dört yıl beklediler. Sen bekleme."
// Kadının arkasında takvim kulesi yükselir; "Sen"de avatar öne, izleyiciye gelir ve dambılı uzatır.
const Kadin5Mesaj: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const grow = tw(f, 0, w(2) + 6);
  const pages = Math.floor(24 * grow);
  const come = tw(f, w(3), w(4) + 4);
  const reach = tw(f, w(4) + 2, w(5) + 6);
  const arm: Arm = [interpolate(reach, [0, 1], [12, 70]), interpolate(reach, [0, 1], [0, -30])];
  const hand = armPoints(1, arm)[2];
  return (
    <>
      <Gym />
      <g opacity={1 - 0.6 * come}>
        {Array.from({ length: pages }, (_, k) => (
          <g key={k} transform={`translate(${800 + ((k * 37) % 30) - 15} ${1080 - k * 30}) rotate(${((k * 53) % 14) - 7})`}>
            <rect x={-90} y={-30} width={180} height={60} rx={8} fill={C.cream} stroke={C.ink} strokeWidth={5} />
            <rect x={-90} y={-30} width={180} height={16} rx={6} fill={C.red} stroke={C.ink} strokeWidth={4} />
          </g>
        ))}
        <Counter x={360} y={420} to={104} suffix=" yıl" p={grow} size={170} color={C.red} rotate={-4} />
        <Person x={620} y={PY} s={0.85} female belly={0.2} armL={[12, 0]} armR={[12, 0]} mouth="flat" lookY={-6} />
      </g>
      <Person x={interpolate(come, [0, 1], [230, 460])} y={PY + 20 + 300 * come} s={0.8 + 0.5 * come} belly={0.4} armL={[12, 0]} armR={arm} mouth={reach > 0.5 ? "grin" : "smile"}>
        <g transform={`translate(${hand[0]} ${hand[1]}) rotate(${-20 + 20 * reach}) scale(${1 + 0.6 * reach})`}>
          <Dumbbell x={0} y={0} s={0.55} rot={90} />
        </g>
        {reach > 0.6 ? <Star x={hand[0] + 50} y={hand[1] - 60} r={26 * reach} rot={f * 5} /> : null}
      </Person>
    </>
  );
};

const SCENES: Record<string, React.FC<SceneProps>> = {
  "kadin5-hook": Kadin5Hook,
  "kadin5-1896": Kadin5_1896,
  "kadin5-2000": Kadin5_2000,
  "kadin5-hormon": Kadin5Hormon,
  "kadin5-mesaj": Kadin5Mesaj,
  "kadin-kemik3": KadinKemik3,
  "kadin-dongu3": KadinDongu3,
  "kadin-hook": KadinHook,
  "kadin-104": Kadin104,
  "kadin-dongu2": KadinDongu2,
  "kadin-1896": Kadin1896,
  "kadin-2000": Kadin2000,
  "kadin-korku": KadinKorku,
  "kadin-kas2": KadinKas2,
  "kadin-kemik2": KadinKemik2,
  "kadin-mesaj": KadinMesaj,
  "kadin-dongu": KadinDongu,
  "boyun-acilis": BoyunAcilis,
  "boyun-gun": BoyunGun,
  "boyun-kaldirac": BoyunKaldirac,
  "boyun-altmis": BoyunAltmis,
  "boyun-surpriz": BoyunSurpriz,
  "boyun-asil": BoyunAsil,
  "boyun-cozum": BoyunCozum,
  "boyun-kapanis": BoyunKapanis,
  "kadin-acilis": KadinAcilis,
  "kadin-hormon": KadinHormon,
  "kadin-kas": KadinKas,
  "kadin-sahne": KadinSahne,
  "kadin-kemik": KadinKemik,
  "kadin-arastirma": KadinArastirma,
  "kadin-sonuc": KadinSonuc,
  "kadin-kapanis": KadinKapanis,
  "adim-acilis": AdimAcilis,
  "adim-reklam": AdimReklam,
  "adim-yayildi": AdimYayildi,
  "adim-bilim": AdimBilim,
  "adim-egri": AdimEgri,
  "adim-sihirli": AdimSihirli,
  "adim-her-adim": AdimHerAdim,
  "adim-kapanis": AdimKapanis,
  "tarti-acilis": TartiAcilis,
  "tarti-panik": TartiPanik,
  "tarti-kalori": TartiKalori,
  "tarti-su": TartiSu,
  "tarti-tuz": TartiTuz,
  "tarti-diger": TartiDiger,
  "tarti-ortalama": TartiOrtalama,
  "tarti-kapanis": TartiKapanis,
  tarti: Tarti,
  "yanlis-fikir": YanlisFikir,
  "yag-hucresi": YagHucresi,
  nefes: Nefes,
  su: Su,
  "hizli-nefes": HizliNefes,
  hareket: Hareket,
  kapanis: Kapanis,
};

// Kısa sürümler (04 kısaltıldı, ekip: "izlerken sıkıldık"): aynı sahne, kısaltılmış metin.
// Eşleme: eski metindeki kelime sırası → yeni metindeki kelime sırası (animasyon ve efektler yeni kelimelere oturur).
const KISA: Record<string, [string, Record<number, number>]> = {
  // "Kadınlar o sahneye çıkmak için yüz dört yıl bekledi."
  "kadin-104k": ["kadin-104", { 6: 5, 9: 8, 11: 0, 15: 0, 16: 3, 17: 2 }],
  // "Çünkü kası iri yapan testosteron, kadınlarda erkeklerin onda biri kadar." (tüpler hemen çıkar, hızlı dolar)
  "kadin-hormon-k": ["kadin-hormon", { 5: 0, 7: 3, 8: 5, 13: 7 }],
  // "Yüz dört yıl beklediler. Sen bekleme."
  "kadin-mesaj-k": ["kadin-mesaj", { 4: 4, 6: 5, 8: 5 }],
  // "Üstelik kemik de güçlenir: bir araştırmada kemik yoğunluğu sekiz ayda arttı."
  "kadin5-kemik": ["kadin-kemik3", { 2: 1, 7: 8, 8: 9, 9: 10 }],
  // "Kasların güçlenir, sıkılaşır, şekillenir. Ama iri olmaz."
  "kadin-kas-k": ["kadin-kas2", { 1: 0, 2: 1, 3: 2, 4: 3, 6: 5, 7: 6 }],
  // "Asıl sürpriz kemiklerde: bir araştırmada kemik yoğunluğu sekiz ayda arttı."
  "kadin-kemik-k": ["kadin-kemik2", { 1: 2, 5: 2, 12: 6, 13: 7, 14: 8, 15: 9 }],
  // "Ve biri sana bunu bir daha sorarsa, cevabı artık biliyorsun."
  "kadin-dongu-k": ["kadin-dongu2", { 4: 3, 6: 6 }],
};
for (const [id, [base, map]] of Object.entries(KISA)) {
  const remap = (w: (i: number) => number) => (i: number) => w(map[i] ?? i);
  const Base = SCENES[base];
  SCENES[id] = ({ w, d }) => <Base d={d} w={remap(w)} />;
  const sfx = SFX[base];
  if (sfx) SFX[id] = (w, d) => sfx(remap(w), d).map(([at, file, vol]): Sfx => [Math.max(0, at), file, vol]);
  if (ZOOM[base]) ZOOM[id] = ZOOM[base];
}
