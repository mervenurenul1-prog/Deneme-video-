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
import { audioFor, introFor, introWords, leadSeconds, SAFE, sceneDurations, useSeconds, wordsFor } from "../shared";
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
  // Sahnenin sessiz açılışı (lead): kelimeler ve ses o kadar kaydırılır
  const leadOf = (i: number) => leadSeconds(cizim, voiceover, i);
  const mainWords = (i: number) =>
    wordsFor(cizim.scenes[i].voice, audioFor(cizim, voiceover, i)).map((x) => ({ ...x, start: x.start + leadOf(i), end: x.end + leadOf(i) }));
  // altyazı: varsa kanca (intro) kelimeleri + asıl kelimeler; w(i) yalnız asıl kelimeleri sayar
  const wordsAt = (i: number) => [...introWords(cizim, voiceover, i), ...mainWords(i)];
  const wOf = (i: number) => {
    const words = mainWords(i);
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
        const intro = introFor(cizim, voiceover, i);
        const words = wordsAt(i);
        const w = wOf(i);
        const Visual = SCENES[scene.visual] ?? Missing;
        return (
          <Sequence key={i} from={start} durationInFrames={durations[i]} name={`${i + 1}-${scene.visual}`}>
            <Shot d={durations[i]} zoom={ZOOM[scene.visual]} noIn={loop && i === 0} noOut={loop && i === last}>
              <Visual d={durations[i]} w={w} />
            </Shot>
            <Captions words={words} hideFrom={loop && i === last ? durations[i] - LOOP_FRAMES : undefined} />
            {intro ? <Audio src={staticFile(intro.file)} /> : null}
            {audio ? (
              <Sequence from={Math.round(leadOf(i) * fps)} layout="none">
                <Audio src={staticFile(audio.file)} />
              </Sequence>
            ) : null}
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
  // 08 sauna eşofmanı
  "sauna-hook": (w) => [[0, "adim", 0.25], [w(3) - 4, "whoosh", 0.25], [w(5), "bip", 0.3], [w(12) - 2, "cizik", 0.3], [w(14) - 2, "damla", 0.4]],
  "sauna-tarih1": (w) => [[2, "kagit", 0.3], [w(11) - 2, "bip", 0.3]],
  "sauna-tarih2": (w) => [[w(12), "agir-dusme", 0.25], [w(14), "sonme", 0.25]],
  "sauna-tarih3": (w) => [[w(1), "kagit", 0.25], [w(14) - 2, "boom", 0.18]],
  "sauna-su": (w) => [[w(1), "damla", 0.35], [w(3), "cizik", 0.3], [w(9), "damla", 0.3], [w(11), "bip", 0.3]],
  "sauna-yag": (w) => [[w(5), "tik", 0.25], [w(12) - 2, "cizik", 0.3]],
  "sauna-tehlike": (w) => [[w(3), "sihir", 0.25], [w(6), "agir-dusme", 0.25]],
  "sauna-dongu": (w) => [[0, "bip", 0.25], [w(4), "pop", 0.25]],
  // 07 spora kaç yaşında: yalnız önemli anlar
  "yas-hook": (w) => [[w(7), "cizik", 0.3], [w(10), "cizik", 0.3], [w(10) + 4, "yuksel", 0.25], [w(15), "pop", 0.3]],
  "yas-rapor": (w) => [[2, "kagit", 0.3], [w(11) - 2, "boom", 0.18], [w(13), "kalem", 0.3]],
  "yas-bant1": (w) => [[0, "pop", 0.25], [w(7) - 2, "pop", 0.25], [w(10) - 2, "pirilti", 0.3]],
  "yas-sporlar": (w) => [[w(1) - 2, "pop", 0.25], [w(4), "cizik", 0.3], [w(6) - 2, "pop", 0.25], [w(10) - 2, "pop", 0.25], [w(13), "pirilti", 0.35]],
  "yas-bant2": (w) => [[0, "pop", 0.25], [w(5), "cizik", 0.3], [w(13), "yuksel", 0.25]],
  "yas-bant3": (w) => [[w(6), "yuksel", 0.25], [w(11) - 4, "adim", 0.25], [w(14) - 2, "pop", 0.25]],
  "yas-bant4": (w) => [[0, "pop", 0.25], [w(3), "kalem", 0.25], [w(8) - 2, "ding", 0.3]],
  "yas-oyun": (w) => [[w(2) - 6, "pop", 0.25], [w(4) - 4, "pop", 0.25], [w(6) - 4, "pop", 0.25]],
  "yas-hazir": (w) => [[0, "pop", 0.25], [w(2), "ding", 0.3], [w(4), "cizik", 0.3]],
  "yas-squat": () => [[0, "pop", 0.25]],
  "yas-sinav": (w) => [[0, "pop", 0.25], [w(6) - 2, "pop", 0.25]],
  "yas-plank": (w) => [[0, "pop", 0.25], [w(5), "cizik", 0.3], [w(7), "cizik", 0.3], [w(8) + 14, "ding", 0.3]],
  "yas-dambil": (w) => [[w(2) - 2, "pop", 0.25], [w(5) - 2, "pop", 0.25], [w(9), "kalem", 0.3]],
  "yas-sinir": (w) => [[w(7) - 2, "yuksel", 0.3], [w(11), "kagit", 0.25]],
  "yas-terazi": (w) => [[w(3), "tak", 0.3], [w(6) - 2, "cizik", 0.3], [w(7) - 2, "whoosh", 0.25], [w(8), "ding", 0.35]],
  "yas-guvenlik": (w) => [[w(2) - 2, "pop", 0.3], [w(5) - 4, "adim", 0.25], [w(9) - 48, "pop", 0.25], [w(9) - 16, "agir-dusme", 0.3], [w(9) - 14, "ah", 0.9]],
  "yas-bugun": (w) => [[w(2) - 2, "pop", 0.3], [w(5) - 2, "pirilti", 0.35]],
  "yas7-soru": (w) => [[w(1) - 2, "bip", 0.3], [w(6) - 2, "bip", 0.35], [w(10) - 2, "bip", 0.35], [w(14) - 2, "bip", 0.35]],
  "yas7-pasta": (w) => [[w(4) + 2, "nefes", 0.35], [w(6) - 2, "pop", 0.3], [w(10) - 2, "pirilti", 0.25]],
  "yas7-korku": (w) => [[w(1) - 2, "agir-dusme", 0.4], [w(8) - 4, "sonme", 0.3], ...y7Years(w).map((t): Sfx => [t, "pop", 0.25])],
  "yas7-rapor": (w) => [[2, "kagit", 0.3], [w(13) - 2, "boom", 0.18]],
  "yas7-salon": (w) => [[w(3) - 2, "pop", 0.25], [w(6) - 2, "cizik", 0.3], [w(9) - 2, "pop", 0.25], [w(12) - 2, "pop", 0.25], [w(14) - 2, "pop", 0.25], [w(15), "ding", 0.3]],
  "yas7-bekle": (w) => [[w(3) - 2, "kalem", 0.25], [w(5), "cizik", 0.3], [w(6), "yuksel", 0.25]],
  "yas7-bugun": (w) => [[0, "whoosh", 0.25], [w(5) - 2, "pirilti", 0.35]],
  "diz7-hook": (w) => [[0, "adim", 0.25], [w(2) - 2, "ding", 0.35], [w(5) - 2, "kalem", 0.3]],
  "diz7-anne": (w) => [[w(1) - 2, "pop", 0.3]],
  "diz7-annesoz": (w) => [[w(1), "cizik", 0.3]],
  "diz6-hook": (w) => [[0, "adim", 0.2], [w(7), "whoosh", 0.25], [w(15) - 2, "pop", 0.3], [w(17), "cizik", 0.3]],
  "diz6-annesoz": (w) => [[0, "pop", 0.25], [w(1), "cizik", 0.3]],
  "diz6-son": (w) => [[0, "pop", 0.25], [w(2), "pirilti", 0.35]],
  "diz5-hook": (w) => [[0, "adim", 0.25], [w(6), "cizik", 0.35], [w(7) - 2, "pop", 0.3]],
  "diz5-pist": (w) => [[w(3), "boom", 0.2], [w(3) + 1, "cizik", 0.45], [w(3) + 3, "sonme", 0.25], [w(7), "agir-dusme", 0.2], [w(9) - 2, "pop", 0.3]],
  "diz4-pist": (w) => [[0, "adim", 0.25], [4, "nefes", 0.3], [Math.max(15, w(2) - 40), "pop", 0.3], [w(2), "boom", 0.2], [w(2) + 1, "cizik", 0.45], [w(2) + 3, "sonme", 0.25], [w(9), "agir-dusme", 0.2]],
  "diz4-anne": (w) => [[w(0), "pop", 0.3]],
  "diz4-annesoz": (w) => [[w(1), "cizik", 0.3]],
  "diz4-doz": (w) => [[w(8), "pop", 0.25], [w(13) - 2, "boom", 0.18], [w(14), "cizik", 0.35], [w(16), "pop", 0.25], [w(20), "pirilti", 0.35]],
  "diz4-stanford": (w, d) => [[2, "kalem", 0.3], [w(6) - 2, "pop", 0.3], [w(12), "whoosh", 0.25], [d - 14, "kagit", 0.3]],
  "diz4-sonuc": (w) => [[w(1) - 2, "ding", 0.35], [w(4), "cizik", 0.35], [w(9), "pop", 0.3], [w(13), "pirilti", 0.35]],
  "diz4-soru": (w) => [[w(5) - 2, "pop", 0.3]],
  "diz3-pist": (w) => [[0, "adim", 0.25], [w(9) - 2, "cizik", 0.45], [w(11), "sonme", 0.3]],
  "diz3-anne": (w) => [[w(0), "pop", 0.3]],
  "diz3-annesoz": (w) => [[w(1), "cizik", 0.3], [w(5), "cizik", 0.3], [w(7), "sonme", 0.25]],
  "diz3-stanford": (w) => [[2, "kalem", 0.3], [w(8) - 2, "pop", 0.3], [w(10), "pop", 0.25], [w(14), "kagit", 0.3], [w(17), "kagit", 0.3]],
  "diz3-sonuc": (w) => [[w(1) - 2, "ding", 0.35], [w(4), "cizik", 0.35], [w(9), "pop", 0.3], [w(13), "pirilti", 0.35]],
  "diz3-squat": (w) => [[w(2), "sihir", 0.35], [w(6), "sonme", 0.3]],
  "diz4-squat": (w) => [[0, "pop", 0.25], [w(2), "sihir", 0.35], [w(6), "cizik", 0.35], [w(7) + 6, "sonme", 0.3]],
  "diz3-doz": (w) => [[w(3), "pop", 0.25], [w(5) - 2, "boom", 0.18], [w(5), "cizik", 0.35], [w(9), "pop", 0.25], [w(10), "pirilti", 0.35]],
  "diz3-soru": (w) => [[w(5) - 2, "pop", 0.3]],
  "diz-hook": (w) => [[w(4) - 2, "pop", 0.35], [w(5) - 2, "pop", 0.35], [w(9) - 2, "cizik", 0.5]],
  "diz-kosu": (w) => [[w(1) - 2, "pop", 0.3], [w(7) - 2, "whoosh", 0.25], [w(9), "pop", 0.3], [w(13) - 2, "pop", 0.25], [w(14), "ding", 0.35]],
  "diz-sunger": (w) => [[w(1), "pirilti", 0.3], [w(6), "damla", 0.3], [w(7), "sihir", 0.3], [w(9), "whoosh", 0.2], [w(10), "sonme", 0.35]],
  "diz-squat": (w) => [[2, "pop", 0.3], [w(8), "agir-dusme", 0.3], [w(11), "yuksel", 0.35], [w(14) - 2, "boom", 0.18], [w(14), "pop", 0.4]],
  "diz-doz": (w) => [[w(5), "sonme", 0.3], [w(7), "pirilti", 0.4]],
  "diz-kapanis": (w) => [[w(2) - 2, "pop", 0.3], [w(5) - 2, "pop", 0.3]],
  "kosu-hook": (w) => [[w(6) - 2, "pop", 0.3], [w(11), "pirilti", 0.3], [w(12), "cizik", 0.4]],
  "kosu-arastirma": (w) => [[2, "kalem", 0.3], [w(5), "kagit", 0.35], [w(9), "whoosh", 0.25]],
  "kosu-oran": (w) => [[w(2), "pop", 0.3], [w(8) - 2, "pop", 0.3], [w(9), "ding", 0.35]],
  "kosu-sunger": (w) => [[w(3), "cizik", 0.3], [w(7), "damla", 0.3], [w(10), "sihir", 0.3], [w(13), "adim", 0.3], [w(18), "sonme", 0.35]],
  "kosu-doz": (w) => [[w(1), "adim", 0.3], [w(6), "ding", 0.3], [w(9), "whoosh", 0.3], [w(13), "pirilti", 0.4]],
  "kosu-kapanis": (w) => [[w(8), "pop", 0.3]],
  "boyun5-sen": (w) => [[w(10) - 2, "pop", 0.3], [w(12), "pirilti", 0.25], [w(19) - 2, "kagit", 0.45]],
  "boyun5-gonder": (w) => [[w(2), "kacing", 0.3], [w(11), "havalanma", 0.3], [w(13), "pop", 0.35]],
  "boyun4-alarm": (w) => [[0, "alarm", 0.35], [w(4) - 2, "boom", 0.25], [w(8) - 3, "cizik", 0.7], [w(9), "whoosh", 0.25], [w(16) - 2, "pop", 0.3], [w(18) - 2, "kagit", 0.5]],
  "boyun4-viral": (w) => [[2, "kalem", 0.3], [w(12) - 2, "boom", 0.18], [w(12), "pop", 0.4], [w(17), "kalem", 0.35], [w(21), "pop", 0.3], [w(22), "pirilti", 0.3]],
  "boyun4-isim": (w) => [[2, "kalem", 0.3], [w(6) - 2, "pirilti", 0.3], [w(12) - 2, "boom", 0.18], [w(12), "pop", 0.4]],
  "boyun4-hesap": (w) => [[2, "kalem", 0.3], [w(4) - 2, "bip", 0.3], [w(10), "yuksel", 0.3], [w(21) - 2, "agir-dusme", 0.3], [w(22), "bip", 0.35], [w(25), "pop", 0.3], [w(26), "pirilti", 0.3]],
  "boyun4-arastirma": (w) => [[w(1), "whoosh", 0.25], [w(5) - 2, "pop", 0.3], [w(8) - 2, "pop", 0.3], [w(11), "cizik", 0.3], [w(13), "ding", 0.35]],
  "boyun4-heykel": (w) => [[w(5), "yuksel", 0.3], [w(8), "sonme", 0.3], [w(13) - 2, "cizik", 0.35]],
  "boyun4-gonder": (w) => [[w(2), "kacing", 0.3], [w(11), "havalanma", 0.3], [w(13), "pop", 0.35], [w(14), "whoosh", 0.35]],
  "boyun3-sen": (w) => [[w(6), "whoosh", 0.25], [w(16), "havalanma", 0.5], [w(18) + 2, "agir-dusme", 0.6], [w(19) - 2, "pop", 0.3]],
  "boyun3-isim": (w) => [[w(5) - 2, "boom", 0.2], [w(5), "pop", 0.4], [w(7), "whoosh", 0.3], [w(14) - 2, "pirilti", 0.35]],
  "boyun3-bowling": (w) => [[w(2) - 2, "pop", 0.35], [w(7), "tak", 0.3], [w(11), "yuksel", 0.35], [w(13), "whoosh", 0.25]],
  "boyun3-bagaj": (w) => [[w(3) - 2, "bip", 0.3], [w(5) + 2, "bip", 0.35], [w(7) - 2, "kagit", 0.35], [w(9) - 2, "boom", 0.2], [w(9), "pop", 0.4]],
  "boyun3-surpriz": (w) => [[w(6) - 2, "pop", 0.35], [w(9) - 4, "zincir", 0.35], [w(14), "cizik", 0.4], [w(14) + 4, "zincir", 0.4]],
  "boyun3-heykel": (w) => [[w(2) - 2, "yuksel", 0.3], [w(5), "havalanma", 0.25], [w(7), "cizik", 0.4], [w(9) - 2, "kacing", 0.35], [w(12), "pirilti", 0.4]],
  "boyun3-kapanis": (w) => [[w(0), "yuksel", 0.3], [w(7), "whoosh", 0.2]],
  "boyun2-hook": (w) => [[w(2) - 2, "pop", 0.35], [w(5), "bip", 0.3], [w(10) - 2, "havalanma", 0.5], [w(11) + 4, "agir-dusme", 0.6]],
  "boyun2-2008": (w) => [[2, "kalem", 0.35], [w(9) - 2, "pop", 0.3], [w(14) - 2, "boom", 0.18], [w(14), "pop", 0.4]],
  "boyun2-hesap": (w) => [[2, "kalem", 0.3], [w(7), "tak", 0.25], [w(8), "tak", 0.25], [w(9), "tak", 0.25], [w(10), "agir-dusme", 0.3], [w(13), "ding", 0.35]],
  "boyun2-soru": (w) => [[w(2) - 2, "pop", 0.35], [w(7) - 2, "sihir", 0.4]],
  "boyun2-bag": (w) => [[w(5) - 4, "zincir", 0.35], [w(8), "cizik", 0.4], [w(8) + 4, "zincir", 0.4], [w(9), "pop", 0.3]],
  "boyun2-hareket": (w) => [[w(3) - 4, "yuksel", 0.3], [w(5) - 2, "sihir", 0.4], [w(7), "whoosh", 0.3], [w(9), "whoosh", 0.3], [w(10), "pirilti", 0.4]],
  "boyun2-kapanis": (w) => [[w(1), "havalanma", 0.3], [w(2) - 2, "pop", 0.3], [w(10) - 2, "pop", 0.3]],
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
  "boyun2-hook": { to: 1.04, x: 480, y: 800 },
  "boyun2-2008": { to: 1.04, x: 600, y: 800 },
  "boyun2-hesap": { to: 1.04, x: 560, y: 800 },
  "boyun2-soru": { to: 1.05, x: 540, y: 900 },
  "boyun2-bag": { to: 1.05, x: 540, y: 800 },
  "boyun2-hareket": { to: 1.04, x: 540, y: 900 },
  "boyun2-kapanis": { to: 1.0, x: 540, y: 960 },
  "boyun3-sen": { to: 1.0, x: 540, y: 960 },
  "boyun4-alarm": { to: 1.0, x: 540, y: 960 },
  "boyun5-sen": { to: 1.0, x: 540, y: 960 },
  "boyun5-gonder": { to: 1.0, x: 540, y: 960 },
  "kosu-hook": { to: 1.0, x: 540, y: 960 },
  "diz-hook": { to: 1.0, x: 540, y: 960 },
  "diz3-pist": { to: 1.0, x: 540, y: 960 },
  "diz4-pist": { to: 1.0, x: 540, y: 960 },
  "diz5-hook": { to: 1.0, x: 540, y: 960 },
  "diz6-hook": { to: 1.0, x: 540, y: 960 },
  "diz7-hook": { to: 1.0, x: 540, y: 960 },
  "diz7-anne": { to: 1.0, x: 540, y: 960 },
  "diz7-annesoz": { to: 1.0, x: 540, y: 960 },
  "diz6-annesoz": { to: 1.0, x: 540, y: 960 },
  "diz6-son": { to: 1.0, x: 540, y: 960 },
  "diz5-pist": { to: 1.0, x: 540, y: 960 },
  "diz4-anne": { to: 1.0, x: 540, y: 960 },
  "diz4-annesoz": { to: 1.0, x: 540, y: 960 },
  "diz4-doz": { to: 1.0, x: 540, y: 960 },
  "diz4-stanford": { to: 1.0, x: 540, y: 960 },
  "diz4-sonuc": { to: 1.0, x: 540, y: 960 },
  "diz4-soru": { to: 1.0, x: 540, y: 960 },
  "diz3-anne": { to: 1.0, x: 540, y: 960 },
  "diz3-annesoz": { to: 1.0, x: 540, y: 960 },
  "diz3-stanford": { to: 1.03, x: 540, y: 900 },
  "diz3-sonuc": { to: 1.03, x: 540, y: 900 },
  "diz3-squat": { to: 1.03, x: 540, y: 1000 },
  "diz4-squat": { to: 1.0, x: 540, y: 960 },
  "diz3-doz": { to: 1.0, x: 540, y: 960 },
  "diz3-soru": { to: 1.0, x: 540, y: 960 },
  "diz-kosu": { to: 1.03, x: 540, y: 900 },
  "diz-sunger": { to: 1.03, x: 540, y: 800 },
  "diz-squat": { to: 1.03, x: 540, y: 1000 },
  "diz-doz": { to: 1.03, x: 540, y: 900 },
  "diz-kapanis": { to: 1.0, x: 540, y: 960 },
  "kosu-arastirma": { to: 1.04, x: 540, y: 900 },
  "kosu-oran": { to: 1.03, x: 540, y: 900 },
  "kosu-sunger": { to: 1.03, x: 540, y: 800 },
  "kosu-doz": { to: 1.03, x: 540, y: 900 },
  "kosu-kapanis": { to: 1.0, x: 540, y: 960 },
  "boyun4-viral": { to: 1.03, x: 540, y: 900 },
  "boyun4-isim": { to: 1.03, x: 540, y: 900 },
  "boyun4-hesap": { to: 1.02, x: 540, y: 900 },
  "boyun4-arastirma": { to: 1.03, x: 540, y: 900 },
  "boyun4-heykel": { to: 1.0, x: 540, y: 960 },
  "boyun4-gonder": { to: 1.0, x: 540, y: 960 },
  "boyun3-isim": { to: 1.0, x: 540, y: 960 },
  "boyun3-bowling": { to: 1.0, x: 540, y: 960 },
  "boyun3-bagaj": { to: 1.0, x: 540, y: 960 },
  "boyun3-surpriz": { to: 1.0, x: 540, y: 960 },
  "boyun3-heykel": { to: 1.0, x: 540, y: 960 },
  "boyun3-kapanis": { to: 1.0, x: 540, y: 960 },
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
  // 3'erli gruplar; cümle sonunda (. ! ? :) grup kapanır ki iki cümle aynı satıra binmesin
  const chunks: WordTiming[][] = [];
  let cur: WordTiming[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length === 3 || /[.!?:…]$/.test(w.word)) {
      chunks.push(cur);
      cur = [];
    }
  }
  if (cur.length) chunks.push(cur);
  const idx = chunks.findLastIndex((c) => t >= c[0].start);
  const current = chunks[Math.max(0, idx)];
  if (!current) return null;
  // söylenip biten satır, sıradaki başlamadan uzun süre ekranda asılı kalmasın
  const next = chunks[idx + 1];
  if (idx >= 0 && t > current[current.length - 1].end + 0.5 && (!next || t < next[0].start)) return null;
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
  suit?: string; // baştan ayağa tek parça giysi (ör. sauna eşofmanı): kollar, bacaklar ve gövde bu renkte
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
  suit,
  children,
}) => {
  const top = suit ?? shirt ?? (female ? "#d9705f" : C.shirt);
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
      <Limb p={lL} w={52 * limbW} color={suit ?? C.skin} />
      <Limb p={lR} w={52 * limbW} color={suit ?? C.skin} />
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
        fill={suit ?? C.shorts}
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
      <Limb p={aL} w={44 * limbW} color={suit ?? C.skin} sleeve={suit ? undefined : top} />
      <Limb p={aR} w={44 * limbW} color={suit ?? C.skin} sleeve={suit ? undefined : top} />
      {suit ? <path d="M-60 -560 Q-40 -500 -50 -430 M50 -575 Q66 -520 58 -470" stroke="#fff" strokeWidth={10} fill="none" opacity={0.55} strokeLinecap="round" /> : null}
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
const NeckLens: React.FC<{ x: number; y: number; r: number; angle: number; kg: number; strain: number; rest?: number; hideAngle?: boolean }> = ({ x, y, r, angle, kg, strain, rest = 0, hideAngle = false }) => {
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
      {angle > 1 && !hideAngle ? (
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

/* ---------- 05 v2: "başın kaç kilo?" — text neck hikâyesi ---------- */

const B2A = { x: PX - 60, y: PY, s: 0.95 }; // açılış ve kapanış: avatar telefona bakar, dambıl yanında yerde (döngü karesi)

// Başın üstünde dijital kilo ekranı
const KgDisplay: React.FC<{ x: number; y: number; p: number; value: string; color?: string }> = ({ x, y, p, value, color = "#9fe0a8" }) =>
  p > 0 ? (
    <g transform={`translate(${x} ${y}) scale(${p})`}>
      <path d="M0 70 L0 120" stroke={C.ink} strokeWidth={8} strokeDasharray="10 8" />
      <rect x={-190} y={-80} width={380} height={150} rx={22} fill="#dcd6c8" stroke={C.ink} strokeWidth={9} />
      <rect x={-150} y={-56} width={300} height={104} rx={12} fill="#26332b" stroke={C.ink} strokeWidth={6} />
      <text x={0} y={22} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={84} fill={color}>
        {value}
      </text>
    </g>
  ) : null;

// Hansraj (2014) modeline göre açıya bağlı yük (kg): 0° 5, 15° 12, 30° 18, 45° 22, 60° 27
const neckKg = (deg: number) => interpolate(deg, [0, 15, 30, 45, 60], [5, 12, 18, 22, 27], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// "Telefona baktığında başın kaç kilo? Beş mi? Bir hesaba göre yirmi yedi."
const Boyun2Hook: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const A = B2A;
  const disp = pop(f, w(2) - 2, 12);
  const guess = f >= w(7) - 2 && f < w(10);
  const value = f < w(5) - 1 ? "?? kg" : f < w(7) - 2 ? "5 kg" : guess ? `${5 + Math.floor(random(`b2${Math.floor(f / 3)}`) * 30)} kg` : "27 kg";
  const red = f >= w(10);
  const wobble = f < w(10) ? Math.sin(f / 1.5) * 4 * tw(f, w(7), w(9)) : 0;
  const fly = tw(f, w(10), w(11) + 4);
  const landed = fly >= 1;
  const squash = landed ? 1 - 0.06 * Math.exp(-(f - w(11) - 4) / 6) - 0.02 : 1;
  const seat = neckSeat(A.x, A.y, A.s * squash);
  const dx = interpolate(fly, [0, 1], [BELL_START.x, seat.x]);
  const dy = interpolate(fly, [0, 1], [BELL_START.y, seat.y]) - Math.sin(fly * Math.PI) * 300;
  return (
    <>
      {landed ? (
        <AvatarWithDumbbell x={A.x} y={A.y} s={A.s * squash} kid={1} mouth="worry" eyes="wide" blush={0.8} />
      ) : (
        <>
          <Person x={A.x} y={A.y} s={A.s} belly={0.4} armL={[12, 0]} armR={PHONE_ARM} mouth={f >= w(5) - 1 && f < w(7) ? "o" : "smile"} lookY={12}>
            <PhoneInHand arm={PHONE_ARM} />
          </Person>
          <g transform={`rotate(${wobble + 200 * fly} ${dx} ${dy})`}>
            <NeckDumbbell x={dx} y={dy} s={interpolate(fly, [0, 1], [1.1, seat.s])} />
          </g>
        </>
      )}
      <KgDisplay x={A.x} y={A.y - 900 * A.s} p={disp} value={value} color={red ? "#ff8a7a" : "#9fe0a8"} />
    </>
  );
};

// "İki bin sekizde bir kayropraktör, telefona eğilen bir gencin boyun röntgenine bu adı verdi: text neck."
const Boyun2_2008: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const bend = tw(f, w(5), w(6) + 8);
  const lens = pop(f, w(9) - 2, 14);
  const stamp = pop(f, w(14) - 2, 10);
  const shake = stamp > 0 && f < w(14) + 12 ? Math.sin(f * 1.7) * 5 : 0;
  return (
    <>
      <Gym o={0.4} />
      <HandText x={540} y={250} text="2008" size={170} p={tw(f, 0, w(2) + 4)} rotate={-4} />
      {/* telefona eğilen genç */}
      <Person x={250} y={PY + 60} s={0.72} belly={0.25} shirt="#c9566b" armL={[12, 0]} armR={PHONE_ARM} mouth="flat" lookY={4 + 12 * bend} tilt={8 * bend}>
        <PhoneInHand arm={PHONE_ARM} />
      </Person>
      {/* röntgen: gencin boynu */}
      {lens > 0 ? (
        <g transform={`translate(700 760) scale(${lens}) translate(-700 -760)`}>
          <NeckLens x={700} y={760} r={290} angle={45 * bend} kg={0} strain={0.3 * bend} />
        </g>
      ) : null}
      {/* avatar izliyor */}
      <Person x={830} y={PY + 330} s={0.55} belly={0.4} armL={[12, 0]} armR={[12, 0]} mouth={stamp > 0.5 ? "o" : "smile"} eyes={stamp > 0.5 ? "wide" : "open"} lookY={-8} />
      <g transform={`rotate(${shake} 700 1100)`}>
        <SignBoard x={700} y={1130} p={stamp * 0.85} lines={["TEXT NECK"]} rot={-5} />
      </g>
    </>
  );
};

// "Altı yıl sonra bir cerrah hesapladı: baş altmış derece eğilince boyna binen yük yirmi yedi kilo."
const Boyun2Hesap: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const angle = interpolate(f, [w(6) - 4, w(7), w(8), w(9), w(10)], [0, 15, 30, 45, 60], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const kg = neckKg(angle);
  const big = pop(f, w(13) - 2, 14);
  const A = { x: 230, y: PY + 250, s: 0.62 };
  const seat = neckSeat(A.x, A.y, A.s);
  return (
    <>
      <Gym o={0.4} />
      <HandText x={540} y={200} text="2014" size={130} p={tw(f, 0, w(1) + 4)} rotate={-4} color={C.red} />
      <NeckLens x={560} y={720} r={330} angle={angle} kg={kg} strain={(kg - 5) / 22} />
      <KgDisplay x={820} y={1180} p={pop(f, w(6) - 6, 12) * 0.9} value={`${Math.round(kg)} kg`} color={kg > 20 ? "#ff8a7a" : "#9fe0a8"} />
      {/* avatar: ensesindeki dambıl yükle büyür */}
      <g>
        <NeckDumbbell x={seat.x} y={seat.y} s={seat.s * (0.35 + 0.65 * ((kg - 5) / 22))} />
        <Person x={A.x} y={A.y} s={A.s} belly={0.4} armL={[12, 0]} armR={PHONE_ARM} mouth={kg > 20 ? "worry" : "flat"} lookY={6 + angle / 6} blush={0.4 + kg / 50}>
          <PhoneInHand arm={PHONE_ARM} />
        </Person>
      </g>
      {big > 0 ? <Counter x={760} y={1500} to={27} suffix=" kg" p={tw(f, w(13) - 2, w(15) + 2)} size={180} color={C.red} rotate={-5} /> : null}
    </>
  );
};

// "Peki boynun bu yüzden mi ağrıyor? İşte sürpriz:"
const Boyun2Soru: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const A = { x: 330, y: PY, s: 0.9 };
  const pain = tw(f, w(1), w(5));
  const open = tw(f, w(7) - 2, w(7) + 10);
  const arm: Arm = [interpolate(pain, [0, 1], [40, 150]), interpolate(pain, [0, 1], [-150, -120])];
  return (
    <>
      <Gym />
      <AvatarWithDumbbell x={A.x} y={A.y} s={A.s} kid={1} arm={arm} phone={pain < 0.3} mouth="worry" eyes={pain > 0.5 ? "closed" : "open"} lookY={6} />
      {pain > 0
        ? [0, 1, 2].map((i) => (
            <path key={i} d={`M${A.x + 100 + i * 10} ${A.y - 610 + i * 40} l40 -20 l-20 30 l40 -20`} stroke={C.red} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={pain * (0.6 + 0.4 * Math.sin(f / 3 + i))} />
          ))
        : null}
      <MysteryBox x={800} y={900} s={1.4} p={pop(f, w(2) - 2, 12)} open={open} shake={f < w(7) - 2 ? Math.sin(f / 2.2) * 6 : 0} />
    </>
  );
};

// Duruş ↔ ağrı arasındaki zincir; snap 0..1 koparır
const Chain: React.FC<{ x1: number; x2: number; y: number; snap: number; p: number }> = ({ x1, x2, y, snap, p }) => {
  const n = 9;
  return (
    <g opacity={p}>
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n;
        const cx = x1 + (x2 - x1) * t;
        const side = t < 0.5 ? -1 : 1;
        const mid = 1 - Math.abs(t - 0.5) * 2;
        const fall = snap * mid;
        return (
          <ellipse
            key={i}
            cx={cx + side * 60 * fall}
            cy={y + 400 * fall * fall}
            rx={34}
            ry={20}
            fill="none"
            stroke="#8a8f99"
            strokeWidth={10}
            transform={`rotate(${(i % 2 ? 90 : 0) + side * 120 * fall} ${cx + side * 60 * fall} ${y + 400 * fall * fall})`}
            opacity={1 - 0.7 * fall}
          />
        );
      })}
    </g>
  );
};

// "Araştırmalar bu duruşla boyun ağrısı arasında net bir bağ bulamadı."
const Boyun2Bag: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const cards = pop(f, 0, 12);
  const chain = tw(f, w(5) - 4, w(5) + 6);
  const scan = tw(f, w(0), w(8));
  const snap = tw(f, w(8), w(9) + 10);
  const L = { x: 230, y: 760 };
  const R = { x: 850, y: 760 };
  return (
    <>
      <Gym o={0.4} />
      {/* duruş: telefona eğilen baş */}
      <g transform={`translate(${L.x} ${L.y}) scale(${cards})`}>
        <circle r={150} fill={C.cream} stroke={C.ink} strokeWidth={9} />
        <Person x={0} y={120} s={0.32} belly={0.4} armL={[12, 0]} armR={PHONE_ARM} mouth="flat" lookY={14} tilt={10}>
          <PhoneInHand arm={PHONE_ARM} />
        </Person>
        <text x={0} y={210} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={60} fill={C.ink}>
          duruş
        </text>
      </g>
      {/* ağrı: kırmızı şimşek */}
      <g transform={`translate(${R.x} ${R.y}) scale(${cards})`}>
        <circle r={150} fill={C.cream} stroke={C.ink} strokeWidth={9} />
        <path d="M-20 -90 L40 -10 L0 -10 L30 90 L-50 0 L-10 0 Z" fill={C.red} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
        <text x={0} y={210} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={60} fill={C.ink}>
          ağrı
        </text>
      </g>
      <Chain x1={L.x + 150} x2={R.x - 150} y={L.y} snap={snap} p={chain} />
      {/* araştırmalar: büyüteç zinciri tarar */}
      {snap < 1 ? (
        <g transform={`translate(${interpolate(scan, [0, 1], [250, 830])} ${L.y - 230}) rotate(-20)`} opacity={1 - snap}>
          <circle r={70} fill="#cfe6f2" fillOpacity={0.35} stroke={C.ink} strokeWidth={10} />
          <path d="M50 50 L120 120" stroke={C.ink} strokeWidth={18} strokeLinecap="round" />
        </g>
      ) : null}
      {snap > 0.3 ? <HandText x={540} y={1120} text="net bağ yok" size={110} p={tw(f, w(9) - 2, w(9) + 14)} color={C.red} rotate={-4} /> : null}
      <Person x={540} y={PY + 330} s={0.6} belly={0.4} armL={snap > 0.5 ? [150, -30] : [12, 0]} armR={snap > 0.5 ? [150, -30] : [12, 0]} mouth={snap > 0.5 ? "o" : "flat"} eyes={snap > 0.5 ? "wide" : "open"} lookY={-8} />
    </>
  );
};

// Örümcek ağı (köşeden yayılır), p: büyüme
const Cobweb: React.FC<{ x: number; y: number; r: number; p: number; flip?: boolean }> = ({ x, y, r, p, flip }) => {
  if (p <= 0) return null;
  const k = flip ? -1 : 1;
  const rays = [0, 22, 45, 68, 90].map((a) => (a * Math.PI) / 180);
  return (
    <g stroke="#f4efe2" strokeWidth={4} fill="none" opacity={0.85 * p}>
      {rays.map((a, i) => (
        <path key={i} d={`M${x} ${y} L${x + k * Math.cos(a) * r * p} ${y + Math.sin(a) * r * p}`} />
      ))}
      {[0.35, 0.6, 0.85].map((t, j) => (
        <path key={j} d={rays.map((a, i) => `${i ? "L" : "M"}${x + k * Math.cos(a) * r * t * p} ${y + Math.sin(a) * r * t * p}`).join(" ")} />
      ))}
    </g>
  );
};

// "Sorun eğilmek değil, saatlerce kıpırdamamak. En iyi duruş, bir sonraki duruşun."
const Boyun2Hareket: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const A = { x: 520, y: PY, s: 0.95 };
  const freeze = tw(f, w(3) - 2, w(4) + 6);
  const free = tw(f, w(5) - 2, w(5) + 8);
  const web = freeze * (1 - free);
  const gray = web;
  // duruş sırası: telefonu göz hizasına kaldır → başı çevir → gerin
  const pose = f < w(7) ? 0 : f < w(9) ? 1 : 2;
  const arm: Arm = pose === 0 ? PHONE_ARM : pose === 1 ? [150, -70] : [170, -10];
  const armL: Arm = pose === 2 ? [170, -10] : [12, 0];
  const load = 1 - tw(f, w(5), w(10) + 6);
  const seat = neckSeat(A.x, A.y, A.s);
  const clock = tw(f, w(3) - 4, w(4) + 6);
  return (
    <>
      <Gym />
      <g transform="translate(860 420)">
        <circle r={110} fill={C.cream} stroke={C.ink} strokeWidth={9} />
        <path d={`M0 0 L${Math.sin(clock * 40) * 80} ${-Math.cos(clock * 40) * 80}`} stroke={C.ink} strokeWidth={9} strokeLinecap="round" />
        <path d={`M0 0 L${Math.sin(clock * 4) * 55} ${-Math.cos(clock * 4) * 55}`} stroke={C.red} strokeWidth={11} strokeLinecap="round" />
      </g>
      {load > 0.02 ? <NeckDumbbell x={seat.x} y={seat.y} s={seat.s * (0.3 + 0.7 * load)} /> : null}
      <Person x={A.x} y={A.y} s={A.s} belly={0.4} armL={armL} armR={arm} mouth={pose === 2 ? "grin" : free > 0.5 ? "smile" : "flat"} eyes={web > 0.5 ? "closed" : "open"} lookY={pose === 0 ? 12 : pose === 1 ? -6 : -10} tilt={pose === 1 ? Math.sin((f - w(7)) / 6) * 10 : 0}>
        {pose < 2 ? <PhoneInHand arm={arm} /> : null}
      </Person>
      {gray > 0 ? <rect x={0} y={0} width={1080} height={1920} fill="#6d6a66" opacity={0.18 * gray} /> : null}
      <Cobweb x={A.x - 300} y={A.y - 820} r={260} p={web} />
      <Cobweb x={A.x + 300} y={A.y - 820} r={220} p={web} flip />
      {free > 0 && free < 1 ? <Star x={A.x} y={A.y - 900} r={50 * free} rot={f * 8} /> : null}
      {pose === 2 ? [0, 1, 2].map((i) => <Star key={i} x={A.x + (i - 1) * 220} y={A.y - 1000 + (i % 2) * 60} r={24} rot={f * 5} />) : null}
      <HandText x={540} y={1660} text="bir sonraki duruş" size={96} p={tw(f, w(8) - 2, w(10) + 4)} color={C.red} rotate={-3} />
    </>
  );
};

// "Yani o yirmi yedi kilo seni korkutmasın. Ama telefona bakarken başın kaç kilo, artık biliyorsun."
// Dambıl yere iner (açılıştaki yerine), avatar gülümser; "Ama telefona"da yine telefona bakar → son kare = açılış karesi
const Boyun2Kapanis: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const A = B2A;
  const label = pop(f, w(2) - 2, 12) * (1 - tw(f, w(6), w(6) + 8));
  const look = tw(f, w(7) - 2, w(8) + 4);
  const arm: Arm = [interpolate(look, [0, 1], [12, PHONE_ARM[0]]), interpolate(look, [0, 1], [0, PHONE_ARM[1]])];
  const disp = pop(f, w(10) - 2, 12) * (1 - tw(f, d - 18, d - 8));
  return (
    <>
      <Person x={A.x} y={A.y} s={A.s} belly={0.4} armL={[12, 0]} armR={arm} mouth={f < w(6) + 8 ? "grin" : "smile"} lookY={12 * look}>
        {look > 0.5 ? <PhoneInHand arm={arm} /> : null}
      </Person>
      <NeckDumbbell x={BELL_START.x} y={BELL_START.y} s={1.1} />
      {label > 0 ? (
        <g transform={`translate(${BELL_START.x} ${BELL_START.y - 150}) scale(${label})`}>
          <rect x={-90} y={-46} width={180} height={78} rx={12} fill={C.cream} stroke={C.ink} strokeWidth={6} />
          <text x={0} y={14} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={56} fill={C.red}>
            27 kg
          </text>
        </g>
      ) : null}
      <KgDisplay x={A.x} y={A.y - 900 * A.s} p={disp} value="?? kg" />
    </>
  );
};

/* ---------- 05 v3: samimi anlatım, ölçülü kamera hareketi ---------- */

// Ölçülü kamera: anahtar karelerde [kare, ölçek, odak x, odak y] arasında yumuşak geçiş; shake = kısa sarsıntı
// CamK'nın f karesindeki kamerası [ölçek, merkez x, merkez y] (sahne dışı katmanları kameraya göre yerleştirmek için)
const camAt = (k: [number, number, number, number][], f: number): [number, number, number] => {
  // kelime zamanları yakın düşerse anahtar kareler artan sırada kalsın
  const fr = k.map((x) => x[0]).reduce<number[]>((acc, t, i) => [...acc, i ? Math.max(t, acc[i - 1] + 1) : t], []);
  const at = (j: number) => (k.length === 1 ? k[0][j] : interpolate(f, fr, k.map((x) => x[j]), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }));
  return [at(1), at(2), at(3)];
};
const CamK: React.FC<{ k: [number, number, number, number][]; shake?: number; children: React.ReactNode }> = ({ k, shake = 0, children }) => {
  const f = useCurrentFrame();
  const [s, cx, cy] = camAt(k, f);
  const sx = shake > 0 ? Math.sin(f * 2.3) * 14 * shake : 0;
  const sy = shake > 0 ? Math.cos(f * 1.9) * 10 * shake : 0;
  return <g transform={`translate(${cx + sx} ${cy + sy}) scale(${s}) translate(${-cx} ${-cy})`}>{children}</g>;
};
// t karesinde başlayan, len karede sönen sarsıntı
const hit = (f: number, t: number, len = 12) => (f >= t && f < t + len ? 1 - (f - t) / len : 0);

const BowlingBall: React.FC<{ x: number; y: number; r?: number; label?: string; labelColor?: string }> = ({ x, y, r = 70, label, labelColor = C.cream }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#3d4a7a" stroke={C.ink} strokeWidth={7} />
    <ellipse cx={x - r * 0.35} cy={y - r * 0.4} rx={r * 0.25} ry={r * 0.14} fill="#fff" opacity={0.3} />
    {[
      [0.15, -0.35],
      [0.42, -0.2],
      [0.3, 0.12],
    ].map(([dx, dy], i) => (
      <circle key={i} cx={x + dx * r} cy={y + dy * r} r={r * 0.11} fill="#1c2238" />
    ))}
    {label ? (
      <text x={x} y={y + r * 0.62} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={r * 0.55} fill={labelColor}>
        {label}
      </text>
    ) : null}
  </g>
);

const Pigeon: React.FC<{ x: number; y: number; s?: number; flap?: number }> = ({ x, y, s = 1, flap = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} stroke={C.ink} strokeWidth={5} strokeLinejoin="round">
    <ellipse cx={0} cy={0} rx={46} ry={30} fill="#9aa0ab" />
    <circle cx={38} cy={-28} r={20} fill="#9aa0ab" />
    <path d="M56 -28 L72 -22 L56 -18 Z" fill="#e0a43a" />
    <circle cx={42} cy={-32} r={4} fill={C.ink} />
    <path d={`M-10 -10 Q-40 ${-50 - 40 * flap} -70 ${-20 - 30 * flap} Q-40 -5 -10 -10 Z`} fill="#7f8692" />
    <path d="M-44 6 L-70 16 L-44 18 Z" fill="#7f8692" />
    <path d="M-6 28 L-6 42 M10 28 L10 42" />
  </g>
);

// "Şu an bu videoyu nasıl izliyorsun? Başın öne eğik, değil mi? Bir hesaba göre boynuna şu an yirmi yedi kilo biniyor."
// Avatar telefondan başını kaldırıp İZLEYİCİYE bakar; "Başın öne eğik"te tekrar eğilir; dambıl ensesine iner.
const Boyun3Sen: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const A = B2A;
  const up = tw(f, w(0) - 2, w(1) + 4) * (1 - tw(f, w(6), w(8)));
  const wink = f >= w(9) && f < w(10) + 6;
  const fly = tw(f, w(16), w(18) + 2);
  const landed = fly >= 1;
  const squash = landed ? 1 - 0.06 * Math.exp(-(f - w(18) - 2) / 6) - 0.02 : 1;
  const seat = neckSeat(A.x, A.y, A.s * squash);
  const dx = interpolate(fly, [0, 1], [BELL_START.x, seat.x]);
  const dy = interpolate(fly, [0, 1], [BELL_START.y, seat.y]) - Math.sin(fly * Math.PI) * 300;
  const badge = pop(f, w(19) - 2, 12);
  const face = { x: A.x, y: A.y - 700 * A.s };
  return (
    <CamK
      k={[
        [0, 1, face.x, face.y],
        [w(1) + 6, 1.22, face.x, face.y],
        [w(6), 1.22, face.x, face.y],
        [w(8) + 6, 1, face.x, face.y],
        [w(16), 1, face.x, face.y],
        [w(19), 1.08, A.x, A.y - 500],
      ]}
      shake={hit(f, Math.round(w(18) + 2), 14)}
    >
      {landed ? (
        <AvatarWithDumbbell x={A.x} y={A.y} s={A.s * squash} kid={1} mouth="worry" eyes="wide" blush={0.8} badge={badge} />
      ) : (
        <>
          <Person x={A.x} y={A.y} s={A.s} belly={0.4} armL={[12, 0]} armR={PHONE_ARM} mouth={up > 0.5 ? "grin" : "smile"} eyes={wink ? "closed" : "open"} lookY={12 * (1 - up)}>
            <PhoneInHand arm={PHONE_ARM} />
          </Person>
          <g transform={`rotate(${200 * fly} ${dx} ${dy})`}>
            <NeckDumbbell x={dx} y={dy} s={interpolate(fly, [0, 1], [1.1, seat.s])} />
          </g>
        </>
      )}
    </CamK>
  );
};

// "Bunun bir adı bile var: text neck. İki bin sekizde, telefona gömülü bir gencin röntgenini gören bir omurga terapisti koymuş."
const Boyun3Isim: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const stamp = pop(f, w(5) - 2, 10) * (1 - tw(f, w(7) - 2, w(7) + 6));
  const scene = tw(f, w(7) - 4, w(7) + 6);
  const bend = tw(f, w(10), w(11) + 8);
  const lens = pop(f, w(14) - 2, 14);
  const point = tw(f, w(17), w(18) + 6);
  return (
    <CamK k={[[0, 1.06, 540, 900], [w(7), 1, 540, 900], [w(14), 1, 700, 760], [w(19) + 10, 1.08, 700, 760]]} shake={hit(f, Math.round(w(5)), 10) * 0.6}>
      <Gym o={0.4} />
      {/* önce: ensesinde dambılla telefona gömülü avatar; damga onun üstüne basılır */}
      <g opacity={1 - scene}>
        <AvatarWithDumbbell x={540} y={PY} s={0.95} kid={1} mouth="flat" lookY={12} blush={0.6} />
      </g>
      <g transform={`translate(540 760) rotate(${-5 + 3 * Math.sin(f / 10)})`} opacity={stamp > 0 ? 1 : 0}>
        <SignBoard x={0} y={0} p={stamp * 1.35} lines={["TEXT NECK"]} rot={0} />
      </g>
      <g opacity={scene}>
        <HandText x={540} y={250} text="2008" size={160} p={tw(f, w(7) - 2, w(9) + 4)} rotate={-4} />
        <Person x={230} y={PY + 60} s={0.72} belly={0.25} shirt="#c9566b" armL={[12, 0]} armR={PHONE_ARM} mouth="flat" lookY={4 + 12 * bend} tilt={8 * bend}>
          <PhoneInHand arm={PHONE_ARM} />
        </Person>
        {lens > 0 ? (
          <g transform={`translate(700 760) scale(${lens}) translate(-700 -760)`}>
            <NeckLens x={700} y={760} r={290} angle={42 * bend} kg={0} strain={0.3 * bend} hideAngle />
          </g>
        ) : null}
        <Person x={830} y={PY + 330} s={0.6} belly={0.4} armL={[12, 0]} armR={[interpolate(point, [0, 1], [12, 150]), interpolate(point, [0, 1], [0, -30])]} mouth={point > 0.5 ? "grin" : "smile"} lookY={-8} />
      </g>
    </CamK>
  );
};

// "Başın bir bowling topu kadar, beş kilo. Göğsünde tutmak kolay, kolunu uzatınca ağırlaşır. Başını eğmek de böyle."
const Boyun3Bowling: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const A = { x: 440, y: PY, s: 0.95 };
  const ball = pop(f, w(2) - 2, 12);
  const hold = tw(f, w(7) - 2, w(8) + 4);
  const ext = tw(f, w(10), w(11) + 6);
  const bendT = tw(f, w(13), w(14) + 8);
  const trem = ext > 0.6 && bendT < 0.5 ? Math.sin(f * 1.6) * 3 : 0;
  // kollar: önce yanda, sonra göğüste top, sonra sağ kol yana uzanır
  const armR: Arm = ext > 0 ? [interpolate(ext, [0, 1], [25, 92]) + trem, interpolate(ext, [0, 1], [-120, 0])] : [interpolate(hold, [0, 1], [12, 25]), interpolate(hold, [0, 1], [0, -120])];
  const armL: Arm = [interpolate(hold * (1 - ext), [0, 1], [12, 25]), interpolate(hold * (1 - ext), [0, 1], [0, -120])];
  const hand = armPoints(1, armR)[2];
  const chest = { x: 0, y: -440 };
  const bx = ext > 0 ? interpolate(ext, [0, 1], [chest.x, hand[0]]) : chest.x;
  const by = ext > 0 ? interpolate(ext, [0, 1], [chest.y, hand[1] - 40]) : chest.y;
  const kg = Math.round(interpolate(ext, [0, 1], [5, 27]));
  const inHands = hold > 0.3;
  const head = { x: A.x, y: A.y - 700 * A.s };
  return (
    <CamK k={[[0, 1.12, head.x, head.y], [w(6), 1.12, head.x, head.y], [w(8), 1, A.x, A.y - 400], [w(13), 1, A.x, A.y - 400], [w(16) + 10, 1.1, head.x, head.y]]}>
      <Gym />
      {/* tanıtım: başın yanında top, "=" */}
      {!inHands && ball > 0 ? (
        <g opacity={1 - hold * 2}>
          <HandText x={head.x + 190} y={head.y + 20} text="=" size={110} p={ball} rotate={0} />
          <g transform={`translate(${head.x + 330} ${head.y}) scale(${ball})`}>
            <BowlingBall x={0} y={0} r={90} label="5 kg" />
          </g>
        </g>
      ) : null}
      <Person x={A.x} y={A.y} s={A.s} belly={0.4} armL={armL} armR={armR} mouth={ext > 0.6 ? "worry" : "smile"} eyes={ext > 0.8 ? "closed" : "open"} blush={0.4 + 0.5 * ext} lookY={12 * bendT} tilt={6 * bendT}>
        {inHands && bendT < 1 ? (
          <g opacity={1 - bendT}>
            <BowlingBall x={bx} y={by} r={78} label={`${kg} kg`} labelColor={ext > 0.5 ? "#ffb3a7" : C.cream} />
          </g>
        ) : null}
      </Person>
      {ext > 0.6 && bendT < 0.5
        ? cycles(f, w(11), 10, 24).map(({ k, p }) => <Drop key={k} x={A.x + (k % 2 ? 1 : -1) * (90 + 30 * p)} y={A.y - 700 + 140 * p * p} s={0.7} o={1 - p} />)
        : null}
      {/* "başını eğmek de böyle": baştan uzanan kola ok */}
      {bendT > 0 ? <Arrow d={`M${A.x + 60} ${A.y - 740} Q${A.x + 260} ${A.y - 900} ${A.x + 330} ${A.y - 640}`} p={bendT} color={C.red} w={10} /> : null}
    </CamK>
  );
};

// "Telefona gömülünce yük yirmi yedi kiloya çıkar. Bavul olsa, fazla bagaja girerdi."
const Boyun3Bagaj: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const A = { x: 420, y: PY - 40, s: 0.9 };
  const kgv = tw(f, w(3) - 2, w(5) + 2);
  const tag = pop(f, w(7) - 2, 12);
  const stamp = pop(f, w(9) - 2, 10);
  return (
    <CamK k={[[0, 1, 540, 900], [w(5), 1.06, 540, 800], [w(9), 1.06, 540, 800], [w(11) + 8, 1.1, 540, 900]]} shake={hit(f, Math.round(w(9)), 12) * 0.7}>
      {/* havalimanı: büyük pencere, uçak */}
      <rect x={60} y={220} width={960} height={520} rx={16} fill="#cfe6f2" stroke={C.ink} strokeWidth={8} />
      <g transform={`translate(${interpolate(f, [0, 300], [200, 760])} 470) rotate(-8)`} stroke={C.ink} strokeWidth={6} strokeLinejoin="round">
        <path d="M-160 0 Q-150 -26 -100 -26 L150 -26 Q190 -26 190 0 Q190 26 150 26 L-100 26 Q-150 26 -160 0 Z" fill="#fbf3e2" />
        <path d="M0 -20 L-60 -110 L-20 -110 L60 -20 Z M0 20 L-60 110 L-20 110 L60 20 Z" fill="#e1d3b2" />
        <path d="M-140 -10 L-170 -70 L-145 -70 L-115 -20 Z" fill="#e1d3b2" />
      </g>
      <path d="M60 480 L1020 480" stroke={C.ink} strokeWidth={4} opacity={0.4} />
      <rect x={-20} y={1150} width={1120} height={800} fill="#d9c6a0" opacity={0.55} />
      <path d="M-20 1150 L1100 1150" stroke={C.ink} strokeWidth={6} opacity={0.55} />
      {/* bagaj sınırı tabelası */}
      <g transform="translate(840 860) rotate(3)">
        <rect x={-150} y={-70} width={300} height={140} rx={14} fill={C.cream} stroke={C.ink} strokeWidth={7} />
        <text x={0} y={-12} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={40} fill={C.ink}>
          bagaj sınırı
        </text>
        <text x={0} y={46} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={60} fill={C.ink}>
          23 kg
        </text>
      </g>
      {/* bagaj tartısı ve avatar */}
      <rect x={A.x - 230} y={A.y - 10} width={460} height={60} rx={12} fill="#9a9a9a" stroke={C.ink} strokeWidth={8} />
      <AvatarWithDumbbell x={A.x} y={A.y} s={A.s} kid={1} mouth={stamp > 0.5 ? "o" : "worry"} eyes={stamp > 0.5 ? "wide" : "open"} lookY={12} blush={0.7} />
      <KgDisplay x={820} y={1180} p={pop(f, 0, 12) * 0.9} value={`${Math.round(27 * kgv)} kg`} color={kgv > 0.85 ? "#ff8a7a" : "#9fe0a8"} />
      {/* bagaj etiketi dambılda */}
      {tag > 0 ? (
        <g transform={`translate(${neckSeat(A.x, A.y, A.s).x - 200} ${neckSeat(A.x, A.y, A.s).y + 40}) rotate(${-10 + 6 * Math.sin(f / 6)}) scale(${tag})`}>
          <path d="M60 -40 L0 0" stroke={C.ink} strokeWidth={5} />
          <rect x={-90} y={0} width={110} height={70} rx={10} fill="#f2c94c" stroke={C.ink} strokeWidth={6} />
          <text x={-35} y={48} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={40} fill={C.ink}>
            27
          </text>
        </g>
      ) : null}
      <g transform="translate(540 600)">
        <SignBoard x={0} y={0} p={stamp} lines={["FAZLA BAGAJ!"]} rot={-6} />
      </g>
    </CamK>
  );
};

// "Peki boynun bu yüzden mi ağrıyor? İlginç ama araştırmalar, ikisi arasında net bir bağ bulamamış."
const Boyun3Surpriz: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const A = { x: 540, y: PY + 260, s: 0.72 };
  const pain = tw(f, w(1), w(5));
  const cards = pop(f, w(6) - 2, 12);
  const chain = tw(f, w(9) - 4, w(10) + 4);
  const scan = tw(f, w(8), w(13));
  const snap = tw(f, w(14), w(14) + 14);
  const arm: Arm = snap > 0.5 ? [150, -30] : [interpolate(pain, [0, 1], [12, 95]), interpolate(pain, [0, 1], [0, -168])];
  const L = { x: 230, y: 640 };
  const R = { x: 850, y: 640 };
  return (
    <CamK k={[[0, 1.4, A.x, A.y - 450], [w(5), 1.4, A.x, A.y - 450], [w(7), 1, 540, 900]]} shake={hit(f, Math.round(w(14)), 12) * 0.6}>
      <Gym o={0.45} />
      <Person x={A.x} y={A.y} s={A.s} belly={0.4} armL={snap > 0.5 ? [150, -30] : [12, 0]} armR={arm} mouth={snap > 0.5 ? "o" : "worry"} eyes={snap > 0.5 ? "wide" : pain > 0.6 ? "closed" : "open"} lookY={-4} />
      {pain > 0 && snap < 0.5
        ? [0, 1, 2].map((i) => (
            <path key={i} d={`M${A.x + 80 + i * 8} ${A.y - 470 + i * 30} l30 -15 l-15 22 l30 -15`} stroke={C.red} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={pain * (0.6 + 0.4 * Math.sin(f / 3 + i))} />
          ))
        : null}
      <g transform={`translate(${L.x} ${L.y}) scale(${cards})`}>
        <circle r={150} fill={C.cream} stroke={C.ink} strokeWidth={9} />
        <Person x={0} y={120} s={0.32} belly={0.4} armL={[12, 0]} armR={PHONE_ARM} mouth="flat" lookY={14} tilt={10}>
          <PhoneInHand arm={PHONE_ARM} />
        </Person>
        <text x={0} y={210} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={60} fill={C.ink}>
          eğilmek
        </text>
      </g>
      <g transform={`translate(${R.x} ${R.y}) scale(${cards})`}>
        <circle r={150} fill={C.cream} stroke={C.ink} strokeWidth={9} />
        <path d="M-20 -90 L40 -10 L0 -10 L30 90 L-50 0 L-10 0 Z" fill={C.red} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
        <text x={0} y={210} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={60} fill={C.ink}>
          ağrı
        </text>
      </g>
      <Chain x1={L.x + 150} x2={R.x - 150} y={L.y} snap={snap} p={chain} />
      {cards > 0 && snap < 1 ? (
        <g transform={`translate(${interpolate(scan, [0, 1], [250, 830])} ${L.y - 230}) rotate(-20)`} opacity={(1 - snap) * cards}>
          <circle r={70} fill="#cfe6f2" fillOpacity={0.35} stroke={C.ink} strokeWidth={10} />
          <path d="M50 50 L120 120" stroke={C.ink} strokeWidth={18} strokeLinecap="round" />
        </g>
      ) : null}
      {snap > 0.3 ? <HandText x={540} y={1010} text="net bağ yok" size={110} p={tw(f, w(14), w(14) + 14)} color={C.red} rotate={-4} /> : null}
    </CamK>
  );
};

// "Asıl dert, saatlerce heykel gibi donup kalmak. Arada bir kıpırda, başını kaldır, gerin."
const Boyun3Heykel: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const id = svgId(useId());
  const A = { x: 540, y: PY - 60, s: 0.92 };
  const clock = tw(f, w(2) - 2, w(3) + 8);
  const stone = tw(f, w(3), w(6) + 4) * (1 - tw(f, w(9) - 2, w(9) + 6));
  const bird = tw(f, w(5), w(6) + 4);
  const away = tw(f, w(9) - 2, w(10));
  const crack = tw(f, w(7), w(9));
  const head = tw(f, w(10), w(11) + 4);
  const str = tw(f, w(12) - 2, w(12) + 10);
  const armR: Arm = str > 0 ? [interpolate(str, [0, 1], [40, 172]), interpolate(str, [0, 1], [-150, -5])] : PHONE_ARM;
  const armL: Arm = str > 0 ? [interpolate(str, [0, 1], [12, 172]), interpolate(str, [0, 1], [0, -5])] : [12, 0];
  const lookY = 12 * (1 - head);
  const avatar = (filtered: boolean) => (
    <g filter={filtered ? `url(#st${id})` : undefined}>
      <Person x={A.x} y={A.y} s={A.s} belly={0.4} armL={armL} armR={armR} mouth={str > 0.5 ? "grin" : head > 0.5 ? "smile" : "flat"} eyes={str > 0.5 ? "closed" : "open"} lookY={lookY}>
        {str < 0.5 ? <PhoneInHand arm={armR} /> : null}
      </Person>
    </g>
  );
  const top = { x: A.x + 10, y: A.y - 760 * A.s };
  return (
    <CamK k={[[0, 1, 540, 900], [w(6), 1.1, A.x, A.y - 500], [w(9), 1.1, A.x, A.y - 500], [w(12) + 10, 1, 540, 900]]} shake={hit(f, Math.round(w(9)), 10) * 0.6}>
      <defs>
        <filter id={`st${id}`}>
          <feColorMatrix type="matrix" values="0.3 0.45 0.12 0 0.04  0.3 0.45 0.12 0 0.04  0.3 0.45 0.12 0 0.04  0 0 0 1 0" />
        </filter>
      </defs>
      <Gym />
      <g transform="translate(860 400)">
        <circle r={100} fill={C.cream} stroke={C.ink} strokeWidth={9} />
        <path d={`M0 0 L${Math.sin(clock * 40) * 72} ${-Math.cos(clock * 40) * 72}`} stroke={C.ink} strokeWidth={9} strokeLinecap="round" />
        <path d={`M0 0 L${Math.sin(clock * 4) * 50} ${-Math.cos(clock * 4) * 50}`} stroke={C.red} strokeWidth={11} strokeLinecap="round" />
      </g>
      {/* kaide: heykelleşince yükselir */}
      <rect x={A.x - 200} y={A.y} width={400} height={120 * stone} fill="#b9b2a6" stroke={C.ink} strokeWidth={stone > 0.05 ? 8 : 0} transform={`translate(0 ${-120 * stone})`} />
      <g transform={`translate(0 ${-120 * stone})`}>
        {avatar(false)}
        {stone > 0 ? <g opacity={stone}>{avatar(true)}</g> : null}
        {crack > 0 && stone > 0.1 ? (
          <path d={`M${A.x - 40} ${A.y - 640} l30 60 l-25 50 l35 70 l-20 60`} stroke={C.ink} strokeWidth={6} fill="none" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - crack} />
        ) : null}
      </g>
      {bird > 0 ? (
        <Pigeon
          x={interpolate(bird, [0, 1], [1150, top.x]) + interpolate(away, [0, 1], [0, 700])}
          y={interpolate(bird, [0, 1], [300, top.y - 120 * stone - 30]) - 500 * away * away}
          s={0.9}
          flap={bird < 1 || away > 0 ? (Math.sin(f / 1.5) + 1) / 2 : 0}
        />
      ) : null}
      {str > 0.5 ? [0, 1, 2].map((i) => <Star key={i} x={A.x + (i - 1) * 250} y={A.y - 960 + (i % 2) * 60} r={24} rot={f * 5} />) : null}
    </CamK>
  );
};

// "Hadi, başını kaldır. Ama videoyu tekrar izlerken yine eğileceksin, değil mi?"
// Avatar izleyiciye "kaldır" der; sonra kendisi yine telefona eğilir, yerdeki dambıl kıpırdar → açılış karesi
const Boyun3Kapanis: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const A = B2A;
  const up = tw(f, w(0), w(2) + 4);
  const down = tw(f, w(6), w(8) + 4);
  const armR: Arm = [interpolate(up * (1 - down), [0, 1], [PHONE_ARM[0], 160]), interpolate(up * (1 - down), [0, 1], [PHONE_ARM[1], -20])];
  const arrow = up * (1 - tw(f, w(3), w(4) + 4));
  const face = { x: A.x, y: A.y - 700 * A.s };
  return (
    <CamK k={[[0, 1, face.x, face.y], [w(2), 1.15, face.x, face.y], [w(5), 1.15, face.x, face.y], [d - 16, 1, face.x, face.y]]}>
      <Person x={A.x} y={A.y} s={A.s} belly={0.4} armL={[12, 0]} armR={armR} mouth={down > 0.5 ? "smile" : f > w(3) ? "grin" : "smile"} eyes={f >= w(9) && f < w(10) + 4 ? "closed" : "open"} lookY={12 * down}>
        {up * (1 - down) < 0.3 ? <PhoneInHand arm={armR} /> : null}
      </Person>
      <Arrow d={`M${A.x + 230} ${A.y - 520} L${A.x + 230} ${A.y - 900}`} p={arrow} color="#3f7d4f" w={16} />
      <Arrow d={`M${A.x + 195} ${A.y - 860} L${A.x + 230} ${A.y - 905} L${A.x + 265} ${A.y - 860}`} p={arrow} color="#3f7d4f" w={16} />
      <NeckDumbbell x={BELL_START.x} y={BELL_START.y} s={1.1} />
    </CamK>
  );
};

/* ---------- 05 v4: "korku videosu" ters köşesi ---------- */

// Ekranı 108x192 (9:16) olan telefon; içerik 1080x1920 tuvalde çizilir ve ekrana 0.1 ölçekle sığar
const SCREEN = { w: 108, h: 192 };
const BigPhone: React.FC<{ cx: number; cy: number; children?: React.ReactNode }> = ({ cx, cy, children }) => {
  const id = svgId(useId());
  return (
    <g>
      <rect x={cx - 66} y={cy - 116} width={132} height={232} rx={20} fill="#2f2f36" stroke={C.ink} strokeWidth={6} />
      <clipPath id={`ph${id}`}>
        <rect x={cx - SCREEN.w / 2} y={cy - SCREEN.h / 2} width={SCREEN.w} height={SCREEN.h} />
      </clipPath>
      <g clipPath={`url(#ph${id})`}>
        <rect x={cx - SCREEN.w / 2} y={cy - SCREEN.h / 2} width={SCREEN.w} height={SCREEN.h} fill="#9fd0e8" />
        <g transform={`translate(${cx - SCREEN.w / 2} ${cy - SCREEN.h / 2}) scale(0.1)`}>{children}</g>
      </g>
    </g>
  );
};

// Kamerayı telefon ekranına daldırır: p=0 normal görünüm, p=1 ekran tüm kareyi kaplar (10x)
const diveTo = (p: number, sx: number, sy: number) => {
  const z = Math.pow(10, p);
  const X = interpolate(p, [0, 1], [sx, 540]);
  const Y = interpolate(p, [0, 1], [sy, 960]);
  const cx = sx - (X - 540) / z;
  const cy = sy - (Y - 960) / z;
  return `translate(540 960) scale(${z}) translate(${-cx} ${-cy})`;
};

// Korku videosu: kırmızı uyarı ekranı, "UYARI" bandı, başı eğik adam, "27 KG!" (t: kare, slam 0..1, gray: donma)
const AlarmScreen: React.FC<{ t: number; slam: number; gray?: number }> = ({ t, slam, gray = 0 }) => {
  const pulse = 0.5 + 0.5 * Math.sin(t / 3);
  const shake = slam > 0 && slam < 1 ? Math.sin(t * 2.1) * 12 : 0;
  return (
    <g>
      <rect x={0} y={0} width={1080} height={1920} fill="#5a1414" />
      <rect x={0} y={0} width={1080} height={1920} fill="#d1271b" opacity={0.25 + 0.3 * pulse * (1 - gray)} />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={540} cy={1060} r={260 + i * 150 + ((t * 6) % 150)} fill="none" stroke="#ffcf3f" strokeWidth={10} opacity={0.35 * (1 - gray)} />
      ))}
      <g transform="translate(0 150)">
        <rect x={0} y={0} width={1080} height={170} fill="#ffcf3f" />
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} d={`M${i * 90 - 40} 0 l50 0 l-60 170 l-50 0 Z`} fill={C.ink} opacity={0.85} transform={i > 2 && i < 11 ? "translate(0 -400)" : ""} />
        ))}
        <text x={540} y={125} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={130} fill={C.ink}>
          UYARI!
        </text>
      </g>
      <Person x={540} y={1650} s={1.05} belly={0.4} armL={[12, 0]} armR={PHONE_ARM} mouth="worry" eyes="wide" lookY={14} tilt={10} blush={0.9}>
        <PhoneInHand arm={PHONE_ARM} />
      </Person>
      {slam > 0 ? (
        <text x={540 + shake} y={720} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={270 * (2 - slam)} fill="#ffcf3f" stroke={C.ink} strokeWidth={10} paintOrder="stroke" opacity={Math.min(1, slam * 3)} transform="rotate(-5 540 720)">
          27 KG!
        </text>
      ) : null}
      {gray > 0 ? <rect x={0} y={0} width={1080} height={1920} fill="#8a8170" opacity={0.55 * gray} /> : null}
    </g>
  );
};

// "Dikkat! Telefona eğildiğinde boynun yirmi yedi kilo taşıyor! Bunu sen de duydun, değil mi? Peki ya bu korku, yarım bir bilgiyse?"
// Ekran bir korku videosu gibi açılır; cızırt → donar → kamera geri çekilir: video aslında avatarın telefonunda oynuyordu.
const Boyun4Alarm: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const stop = w(8) - 3;
  const fa = Math.min(f, stop);
  const slam = tw(fa, w(4) - 2, w(5) + 4);
  const gray = tw(f, stop, stop + 4);
  const back = tw(f, stop + 4, w(10) + 4);
  const A = { x: 400, y: PY, s: 0.95 };
  const P = { x: A.x + 200, y: A.y - 430 }; // göğüs hizası, yüzü kapatmaz
  const look = tw(f, w(9) - 2, w(9) + 6);
  const card = pop(f, w(16) - 2, 12);
  const tear = tw(f, w(18) - 2, w(18) + 10);
  return (
    <g transform={diveTo(1 - back, P.x, P.y)}>
      <Gym />
      <Person x={A.x} y={A.y} s={A.s} belly={0.4} armL={[12, 0]} armR={[45, -70]} mouth={look > 0.5 ? "smile" : "flat"} lookY={12 * (1 - look)} />
      <BigPhone cx={P.x} cy={P.y}>
        <AlarmScreen t={fa} slam={slam} gray={gray} />
      </BigPhone>
      {/* "yarım bir bilgi": 27 KG kartı ikiye yırtılır */}
      {card > 0 ? (
        <g transform={`translate(800 650) scale(${card}) rotate(-6)`}>
          {[-1, 1].map((k) => (
            <g key={k} transform={`translate(${k * 60 * tear} ${120 * tear * tear}) rotate(${k * 18 * tear})`}>
              <clipPath id={`tr${k}`}>
                <path d={k < 0 ? "M-200 -110 L10 -110 L-15 -40 L12 20 L-10 110 L-200 110 Z" : "M200 -110 L10 -110 L-15 -40 L12 20 L-10 110 L200 110 Z"} />
              </clipPath>
              <g clipPath={`url(#tr${k})`}>
                <rect x={-190} y={-100} width={380} height={200} rx={16} fill="#d1271b" stroke={C.ink} strokeWidth={9} />
                <text x={0} y={45} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={130} fill="#ffcf3f">
                  27 KG!
                </text>
              </g>
            </g>
          ))}
        </g>
      ) : null}
    </g>
  );
};

// "İki bin sekizde bir terapist, bir gencin röntgenine bakıp buna isim verdi: text neck. Sonra bir cerrah hesapladı: yirmi yedi kilo. Haber dünyayı dolaştı."
const Boyun4Viral: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const p2 = tw(f, w(14) - 4, w(14) + 4);
  const p3 = tw(f, w(21), w(21) + 8);
  const bend = tw(f, w(5), w(7) + 6);
  const stamp = pop(f, w(12) - 2, 10);
  // haberin yayıldığı telefonlar: merkezden dışa sırayla
  const spots: [number, number][] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) spots.push([200 + c * 340, 520 + r * 330]);
  const order = spots.map(([x, y]) => Math.hypot(x - 540, y - 1000)).map((dd) => dd / 900);
  return (
    <>
      <Gym o={0.4} />
      {/* 1: 2008 — röntgen ve isim */}
      <g opacity={1 - p2}>
        <HandText x={540} y={250} text="2008" size={160} p={tw(f, 0, w(2) + 4)} rotate={-4} />
        <Person x={230} y={PY + 60} s={0.72} belly={0.25} shirt="#c9566b" armL={[12, 0]} armR={PHONE_ARM} mouth="flat" lookY={4 + 12 * bend} tilt={8 * bend}>
          <PhoneInHand arm={PHONE_ARM} />
        </Person>
        <g transform={`translate(700 760) scale(${pop(f, w(6) - 2, 14)}) translate(-700 -760)`}>
          <NeckLens x={700} y={760} r={290} angle={42 * bend} kg={0} strain={0.3 * bend} hideAngle />
        </g>
        <Person x={840} y={PY + 330} s={0.6} belly={0.4} armL={[12, 0]} armR={[interpolate(bend, [0, 1], [12, 150]), interpolate(bend, [0, 1], [0, -30])]} mouth="smile" lookY={-8} />
        <g transform="translate(600 1150)">
          <SignBoard x={0} y={0} p={stamp} lines={["TEXT NECK"]} rot={-5} />
        </g>
      </g>
      {/* 2: cerrahın hesabı */}
      {p2 > 0 && p3 < 1 ? (
        <g opacity={p2 * (1 - p3)}>
          <rect x={150} y={420} width={780} height={760} rx={14} fill={C.cream} stroke={C.ink} strokeWidth={8} />
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M190 ${520 + i * 75} L890 ${520 + i * 75}`} stroke="#9fb6c4" strokeWidth={3} />
          ))}
          <HandText x={540} y={580} text="baş = 5 kg" size={96} p={tw(f, w(14), w(15) + 4)} rotate={-2} />
          <HandText x={540} y={760} text="eğilince 5 katı" size={96} p={tw(f, w(16), w(17) + 4)} rotate={-2} />
          <HandText x={540} y={990} text="= 27 kg" size={150} p={tw(f, w(18) - 2, w(19) + 4)} color={C.red} rotate={-4} />
          <Person x={150} y={PY + 330} s={0.6} belly={0.4} armL={[12, 0]} armR={[150, -60]} mouth="o" eyes="wide" lookY={-8} />
        </g>
      ) : null}
      {/* 3: haber dünyayı dolaşır */}
      {p3 > 0 ? (
        <g opacity={p3}>
          {spots.map(([x, y], i) => {
            const on = pop(f, w(21) + order[i] * (w(23) - w(21) + 6), 10);
            return on > 0 ? (
              <g key={i} transform={`translate(${x} ${y}) scale(${on})`}>
                <Person x={0} y={0} s={0.3} belly={0.3} shirt={["#c9566b", "#6e8fb3", "#9a7bb0", C.shirt][i % 4]} armL={[12, 0]} armR={PHONE_ARM} mouth="worry" lookY={14} tilt={8}>
                  <PhoneInHand arm={PHONE_ARM} />
                </Person>
                <g transform="translate(70 -250)">
                  <rect x={-50} y={-30} width={100} height={52} rx={10} fill="#d1271b" stroke={C.ink} strokeWidth={4} />
                  <text x={0} y={10} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={36} fill="#ffcf3f">
                    27!
                  </text>
                </g>
              </g>
            ) : null;
          })}
        </g>
      ) : null}
    </>
  );
};

// "Ama araştırmacılar gerçek insanlara baktı. Başı eğik olanlarla dik duranlar arasında, boyun ağrısında net bir fark bulamadılar."
const Boyun4Arastirma: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const row1 = tw(f, w(5) - 2, w(6) + 4);
  const row2 = tw(f, w(8) - 2, w(9) + 4);
  const pain = tw(f, w(11) - 2, w(12) + 4);
  const verdict = tw(f, w(13), w(16) + 4);
  const scan = tw(f, w(1), w(4) + 6);
  const X = [190, 420, 650, 880];
  const Y1 = 840;
  const Y2 = 1330;
  const hurt = [1, 3];
  const zig = (x: number, y: number, k: number) => (
    <path key={k} d={`M${x + 40} ${y} l28 -14 l-14 20 l28 -14`} stroke={C.red} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={pain * (0.6 + 0.4 * Math.sin(f / 3 + k))} />
  );
  return (
    <>
      <Gym o={0.35} />
      <HandText x={140} y={430} text="eğik" size={80} p={row1} anchor="start" rotate={-3} />
      {X.map((x, i) => (
        <g key={i} opacity={row1}>
          <Person x={x} y={Y1} s={0.45} belly={0.35} shirt={["#c9566b", "#6e8fb3", "#9a7bb0", "#d9705f"][i]} armL={[12, 0]} armR={PHONE_ARM} mouth={pain > 0.5 && hurt.includes(i) ? "worry" : "flat"} lookY={14} tilt={8}>
            <PhoneInHand arm={PHONE_ARM} />
          </Person>
          {hurt.includes(i) ? zig(x, Y1 - 270, i) : null}
        </g>
      ))}
      <HandText x={140} y={920} text="dik" size={80} p={row2} anchor="start" rotate={-3} />
      {X.map((x, i) => (
        <g key={i} opacity={row2}>
          <Person x={x} y={Y2} s={0.45} belly={0.35} shirt={["#6e8fb3", "#d9705f", "#c9566b", "#9a7bb0"][i]} armL={[12, 0]} armR={[12, 0]} mouth={pain > 0.5 && hurt.includes(i) ? "worry" : "smile"} lookY={-2} />
          {hurt.includes(i) ? zig(x, Y2 - 270, i + 10) : null}
        </g>
      ))}
      {/* araştırmacı avatar büyüteçle sıraları dolaşır */}
      <g transform={`translate(${interpolate(scan, [0, 1], [-200, 0])} 0)`}>
        <Person x={540} y={1840} s={0.55} belly={0.4} armL={[12, 0]} armR={[150, -40]} mouth={verdict > 0.5 ? "o" : "flat"} eyes={verdict > 0.5 ? "wide" : "open"} lookY={-8}>
          <g transform={`translate(${armPoints(1, [150, -40])[2][0]} ${armPoints(1, [150, -40])[2][1] - 60}) rotate(-20)`}>
            <circle r={70} fill="#cfe6f2" fillOpacity={0.35} stroke={C.ink} strokeWidth={12} />
            <path d="M50 50 L120 120" stroke={C.ink} strokeWidth={20} strokeLinecap="round" />
          </g>
        </Person>
      </g>
      {verdict > 0 ? (
        <g transform={`translate(780 1500) scale(${pop(f, w(13), 12)}) rotate(-5)`}>
          <rect x={-200} y={-70} width={400} height={130} rx={18} fill={C.cream} stroke={C.ink} strokeWidth={8} />
          <text x={0} y={25} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={84} fill={C.red}>
            fark yok
          </text>
        </g>
      ) : null}
    </>
  );
};

// "Çünkü asıl yorgunluk duruştan değil, kıpırdamamaktan. Saatlerce donup kalan boyun, dik de dursa yorulur."
// İki heykel: başı eğik avatar ve dimdik duran genç; ikisinin üstünde de ağ örülür.
const Boyun4Heykel: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const id = svgId(useId());
  const stone = tw(f, w(5) - 2, w(8));
  const clock = tw(f, w(6) - 2, w(8) + 8);
  const web = tw(f, w(7), w(9) + 6);
  const pain = tw(f, w(13) - 2, w(13) + 6);
  const L = { x: 300, y: PY - 60 };
  const R = { x: 790, y: PY - 60 };
  const figs = (filtered: boolean) => (
    <g filter={filtered ? `url(#st${id})` : undefined}>
      <Person x={L.x} y={L.y} s={0.8} belly={0.4} armL={[12, 0]} armR={PHONE_ARM} mouth="flat" lookY={12} tilt={6}>
        <PhoneInHand arm={PHONE_ARM} />
      </Person>
      <Person x={R.x} y={R.y} s={0.8} belly={0.25} shirt="#c9566b" armL={[12, 0]} armR={[12, 0]} mouth={pain > 0.5 ? "worry" : "flat"} lookY={-2} />
    </g>
  );
  return (
    <CamK k={[[0, 1, 540, 900], [w(9), 1, 540, 900], [w(11), 1.25, R.x, R.y - 450], [w(13) + 12, 1.25, R.x, R.y - 450]]}>
      <defs>
        <filter id={`st${id}`}>
          <feColorMatrix type="matrix" values="0.3 0.45 0.12 0 0.04  0.3 0.45 0.12 0 0.04  0.3 0.45 0.12 0 0.04  0 0 0 1 0" />
        </filter>
      </defs>
      <Gym />
      <g transform="translate(540 330)">
        <circle r={95} fill={C.cream} stroke={C.ink} strokeWidth={9} />
        <path d={`M0 0 L${Math.sin(clock * 40) * 70} ${-Math.cos(clock * 40) * 70}`} stroke={C.ink} strokeWidth={9} strokeLinecap="round" />
        <path d={`M0 0 L${Math.sin(clock * 4) * 48} ${-Math.cos(clock * 4) * 48}`} stroke={C.red} strokeWidth={11} strokeLinecap="round" />
      </g>
      {[L, R].map((p, i) => (
        <rect key={i} x={p.x - 170} y={p.y} width={340} height={110 * stone} fill="#b9b2a6" stroke={C.ink} strokeWidth={stone > 0.05 ? 8 : 0} transform={`translate(0 ${-110 * stone})`} />
      ))}
      <g transform={`translate(0 ${-110 * stone})`}>
        {figs(false)}
        {stone > 0 ? <g opacity={stone}>{figs(true)}</g> : null}
        <Cobweb x={L.x - 230} y={L.y - 700} r={200} p={web} />
        <Cobweb x={R.x + 230} y={R.y - 700} r={200} p={web} flip />
        {pain > 0 ? [0, 1, 2].map((i) => <path key={i} d={`M${R.x + 70 + i * 8} ${R.y - 560 + i * 26} l30 -15 l-15 22 l30 -15`} stroke={C.red} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={pain} />) : null}
      </g>
      <HandText x={R.x} y={R.y + 150} text="dik ama yorgun" size={70} p={tw(f, w(10), w(12) + 6)} color={C.red} rotate={-3} />
    </CamK>
  );
};

// "Yani boynunu suçlama, hareket ettir. Ve biri sana o yirmi yedi kiloyu anlatırsa, bu videoyu gönder."
// Avatar boynunu çevirir, gerinir; videoyu arkadaşına gönderir; kamera arkadaşın telefonuna dalar = açılıştaki uyarı ekranı (döngü).
const Boyun4Gonder: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const A = { x: 300, y: PY, s: 0.9 };
  const move = tw(f, w(2), w(4) + 6) * (1 - tw(f, w(5) - 2, w(5) + 6));
  const roll = Math.sin(f / 5) * 12 * move;
  const armUp: Arm = [interpolate(move, [0, 1], [12, 165]), interpolate(move, [0, 1], [0, -10])];
  const send = tw(f, w(11), w(13));
  const armR: Arm = move > 0.05 ? armUp : PHONE_ARM;
  const friendIn = tw(f, w(5) - 4, w(7) + 4);
  const fw = walk(f, friendIn > 0 && friendIn < 1 ? 1 : 0, 4.5);
  const F = { x: interpolate(friendIn, [0, 1], [1250, 800]), y: PY - fw.bob, s: 0.9 };
  const FP = { x: F.x - 200, y: F.y - 430 }; // arkadaş telefonu avatara dönük, göğüs hizasında
  const ah = armPoints(1, PHONE_ARM)[2];
  const AP = { x: A.x + ah[0] * A.s, y: A.y + ah[1] * A.s - 40 };
  const plane = { x: interpolate(send, [0, 1], [AP.x, FP.x]), y: interpolate(send, [0, 1], [AP.y, FP.y]) - Math.sin(send * Math.PI) * 260 };
  const dive = tw(f, w(14), d - 4);
  const lit = pop(f, w(13), 10);
  return (
    <g transform={diveTo(dive, FP.x, FP.y)}>
      <Gym />
      <Person x={A.x} y={A.y} s={A.s} belly={0.4} armL={move > 0.05 ? armUp : [12, 0]} armR={armR} mouth={move > 0.5 ? "grin" : "smile"} eyes={move > 0.5 ? "closed" : "open"} lookY={move > 0.05 ? -6 : 6} tilt={roll}>
        {move <= 0.05 ? <PhoneInHand arm={PHONE_ARM} /> : null}
      </Person>
      <Person x={F.x} y={F.y} s={F.s} belly={0.25} shirt="#c9566b" legL={fw.legL} legR={fw.legR} armL={friendIn < 1 ? fw.armL : [45, -70]} armR={[12, 0]} mouth={lit > 0.5 ? "o" : "flat"} lookY={10} />
      <BigPhone cx={FP.x} cy={FP.y}>{lit > 0 ? <AlarmScreen t={0} slam={0} /> : <rect x={0} y={0} width={1080} height={1920} fill="#26332b" />}</BigPhone>
      {send > 0 && send < 1 ? (
        <g transform={`translate(${plane.x} ${plane.y}) rotate(${-20 + 40 * send})`}>
          <path d="M-40 -10 L40 0 L-40 14 L-24 0 Z" fill={C.cream} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
        </g>
      ) : null}
    </g>
  );
};

// "İki bin sekizde bir terapist, bir gencin röntgenine bakıp buna isim verdi: text neck."
const Boyun4Isim: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const bend = tw(f, w(5), w(7) + 6);
  const stamp = pop(f, w(12) - 2, 10);
  return (
    <>
      <Gym o={0.4} />
      <HandText x={540} y={250} text="2008" size={160} p={tw(f, 0, w(2) + 4)} rotate={-4} />
      <Person x={230} y={PY + 60} s={0.72} belly={0.25} shirt="#c9566b" armL={[12, 0]} armR={PHONE_ARM} mouth="flat" lookY={4 + 12 * bend} tilt={8 * bend}>
        <PhoneInHand arm={PHONE_ARM} />
      </Person>
      <g transform={`translate(700 760) scale(${pop(f, w(6) - 2, 14)}) translate(-700 -760)`}>
        <NeckLens x={700} y={760} r={290} angle={42 * bend} kg={0} strain={0.3 * bend} hideAngle />
      </g>
      <Person x={840} y={PY + 330} s={0.6} belly={0.4} armL={[12, 0]} armR={[interpolate(bend, [0, 1], [12, 150]), interpolate(bend, [0, 1], [0, -30])]} mouth="smile" lookY={-8} />
      <g transform="translate(600 1150)">
        <SignBoard x={0} y={0} p={stamp} lines={["TEXT NECK"]} rot={-5} />
      </g>
    </>
  );
};

// "Sonra bir cerrah hesapladı: başın beş kilo, ama öne eğildikçe ensen onu düşürmemek için daha çok çeker.
//  Telefona bakarken bu yük yirmi yedi kiloyu bulur. Haber dünyayı dolaştı."
// Yandan boyun röntgeni: baş eğildikçe ense kası kızarır, geriden çeken oklar çoğalır, kilo 5 → 27.
const Boyun4Hesap: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const angle = interpolate(f, [w(8) - 2, w(16), w(17), w(22)], [0, 35, 35, 60], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const kg = neckKg(angle);
  const show = pop(f, w(4) - 2, 12);
  const pull = tw(f, w(10), w(16));
  const big = pop(f, w(21) - 2, 14);
  const grid = tw(f, w(25) - 2, w(25) + 8);
  const L = { x: 560, y: 700, r: 330 };
  const A = { x: 230, y: PY + 300, s: 0.6 };
  const spots: [number, number][] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) spots.push([200 + c * 340, 520 + r * 330]);
  const order = spots.map(([x, y]) => Math.hypot(x - 540, y - 1000) / 900);
  return (
    <>
      <Gym o={0.4} />
      <g opacity={1 - grid}>
        <HandText x={540} y={200} text="cerrahın hesabı" size={90} p={tw(f, 0, w(3) + 4)} rotate={-3} />
        <g transform={`translate(${L.x} ${L.y}) scale(${pop(f, 0, 12)}) translate(${-L.x} ${-L.y})`}>
          <NeckLens x={L.x} y={L.y} r={L.r} angle={angle} kg={kg} strain={(kg - 5) / 22} hideAngle />
        </g>
        {pull > 0
          ? (() => {
              // ensenin arkası boyunca (NeckLens geometrisiyle aynı) aşağı doğru akan çekiş oku
              const base = { x: L.x - 40, y: L.y + 170 };
              const pts: [number, number][] = [];
              let px = base.x;
              let py = base.y;
              for (let i = 0; i < 7; i++) {
                const a = ((angle * (i + 1)) / 7) * (Math.PI / 180);
                px += Math.sin(a) * 30;
                py -= Math.cos(a) * 30;
                pts.push([px - Math.cos(a) * 80, py - Math.sin(a) * 80]);
              }
              const d = pts.slice().reverse().map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
              const [ex, ey] = pts[0];
              const [bx, by] = pts[1];
              const ang = Math.atan2(ey - by, ex - bx);
              const wdt = 8 + 10 * ((kg - 5) / 22);
              const head = (k: number) => [ex + Math.cos(ang + k) * -34, ey + Math.sin(ang + k) * -34];
              return (
                <g opacity={pull}>
                  <path d={d} stroke={C.red} strokeWidth={wdt} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="18 14" strokeDashoffset={-f * 2.5} />
                  <path d={`M${head(0.6)[0]} ${head(0.6)[1]} L${ex} ${ey} L${head(-0.6)[0]} ${head(-0.6)[1]}`} stroke={C.red} strokeWidth={wdt} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              );
            })()
          : null}
        {pull > 0.3 ? <HandText x={250} y={1060} text="ense çeker" size={70} p={tw(f, w(10), w(12) + 4)} color={C.red} rotate={-4} /> : null}
        <KgDisplay x={830} y={1150} p={show * (0.9 + 0.35 * big)} value={`${Math.round(kg)} kg`} color={kg > 20 ? "#ff8a7a" : "#9fe0a8"} />
        <Person x={A.x} y={A.y} s={A.s} belly={0.4} armL={[12, 0]} armR={PHONE_ARM} mouth={kg > 20 ? "worry" : "flat"} lookY={14 * (angle / 60)} tilt={8 * (angle / 60)} blush={0.4 + kg / 50}>
          <PhoneInHand arm={PHONE_ARM} />
        </Person>
      </g>
      {/* haber dünyayı dolaşır */}
      {grid > 0
        ? spots.map(([x, y], i) => {
            const on = pop(f, w(25) + order[i] * (w(27) - w(25) + 8), 10);
            return on > 0 ? (
              <g key={i} transform={`translate(${x} ${y}) scale(${on})`}>
                <Person x={0} y={0} s={0.3} belly={0.3} shirt={["#c9566b", "#6e8fb3", "#9a7bb0", C.shirt][i % 4]} armL={[12, 0]} armR={PHONE_ARM} mouth="worry" lookY={14} tilt={8}>
                  <PhoneInHand arm={PHONE_ARM} />
                </Person>
                <g transform="translate(70 -250)">
                  <rect x={-50} y={-30} width={100} height={52} rx={10} fill="#d1271b" stroke={C.ink} strokeWidth={4} />
                  <text x={0} y={10} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={36} fill="#ffcf3f">
                    27!
                  </text>
                </g>
              </g>
            ) : null;
          })
        : null}
    </>
  );
};

/* ---------- 06 koşu: "komşun koşuyor, peki ya biten seninkiyse?" ---------- */

const ROOM_FLOOR = 1300;
// Oturma odası: duvar, büyük pencere (dışarıda koşan komşu), koltuk
const LivingRoom: React.FC<{ f: number; runner?: boolean; o?: number }> = ({ f, runner = true, o = 1 }) => {
  const id = svgId(useId());
  const W = { x: 90, y: 330, w: 560, h: 520 };
  const rx = W.x - 120 + ((f * 5 + 260) % (W.w + 240));
  const rw = walk(f, 1, 3.2);
  return (
    <g opacity={o}>
      <rect x={-20} y={ROOM_FLOOR} width={1120} height={700} fill="#d9c6a0" opacity={0.6} />
      <path d={`M-20 ${ROOM_FLOOR} L1100 ${ROOM_FLOOR}`} stroke={C.ink} strokeWidth={6} opacity={0.6} />
      <clipPath id={`win${id}`}>
        <rect x={W.x} y={W.y} width={W.w} height={W.h} />
      </clipPath>
      <rect x={W.x} y={W.y} width={W.w} height={W.h} fill="#cfe6f2" />
      <g clipPath={`url(#win${id})`}>
        <rect x={W.x} y={W.y + W.h - 110} width={W.w} height={110} fill="#b9c99a" />
        <circle cx={W.x + 450} cy={W.y + 110} r={50} fill="#ffe28a" opacity={0.9} />
        {runner ? (
          <Person x={rx} y={W.y + W.h - 30 - rw.bob} s={0.5} belly={0.2} female shirt="#d9705f" legL={rw.legL} legR={rw.legR} armL={[30 + 30 * Math.sin(f / 3.2), -80]} armR={[30 - 30 * Math.sin(f / 3.2), -80]} mouth="smile" />
        ) : null}
      </g>
      <rect x={W.x} y={W.y} width={W.w} height={W.h} fill="none" stroke={C.ink} strokeWidth={10} />
      <path d={`M${W.x + W.w / 2} ${W.y} L${W.x + W.w / 2} ${W.y + W.h} M${W.x} ${W.y + W.h / 2} L${W.x + W.w} ${W.y + W.h / 2}`} stroke={C.ink} strokeWidth={7} opacity={0.8} />
    </g>
  );
};

// Koltuk (önden): arkalık + kolçaklar; oturan kişi bunun önüne çizilir, ön minder kişiden sonra
const SOFA = { x: 700, w: 620, seat: 1090 };
const SofaBack: React.FC = () => (
  <g stroke={C.ink} strokeWidth={8} strokeLinejoin="round">
    <rect x={SOFA.x - SOFA.w / 2} y={SOFA.seat - 300} width={SOFA.w} height={320} rx={40} fill="#8a6d9e" />
    <rect x={SOFA.x - SOFA.w / 2 - 50} y={SOFA.seat - 120} width={110} height={300} rx={30} fill="#7a5d8e" />
    <rect x={SOFA.x + SOFA.w / 2 - 60} y={SOFA.seat - 120} width={110} height={300} rx={30} fill="#7a5d8e" />
  </g>
);
const SofaFront: React.FC = () => (
  <g stroke={C.ink} strokeWidth={8} strokeLinejoin="round">
    <rect x={SOFA.x - SOFA.w / 2 + 50} y={SOFA.seat + 20} width={SOFA.w - 100} height={90} rx={18} fill="#9a7dae" />
    <rect x={SOFA.x - SOFA.w / 2 + 20} y={SOFA.seat + 100} width={24} height={ROOM_FLOOR - SOFA.seat - 100} fill="#5a4030" />
    <rect x={SOFA.x + SOFA.w / 2 - 44} y={SOFA.seat + 100} width={24} height={ROOM_FLOOR - SOFA.seat - 100} fill="#5a4030" />
  </g>
);
// Koltukta oturan avatar: kalça oturağa, ayaklar yere (diz bükük, uyluk öne doğru kısalır)
const SITS = 0.9;
const sitY = SOFA.seat + 345 * SITS - 10;

// Diz kesiti: üstte uyluk kemiği, altta kaval kemiği, aralarında süngerimsi kıkırdak
// press: 0..1 (sıkışma), wet: 1 sağlıklı/nemli, 0 kuru; crack: 0..1 çatlaklar
const KneeLens: React.FC<{ x: number; y: number; r: number; press?: number; wet?: number; crack?: number }> = ({ x, y, r, press = 0, wet = 1, crack = 0 }) => {
  const id = svgId(useId());
  const gap = 70 - 34 * press;
  const cart = `rgb(${Math.round(150 + 100 * wet)} ${Math.round(130 + 100 * wet)} ${Math.round(100 + 80 * wet)})`;
  const th = 34 * (0.75 + 0.25 * wet) * (1 - 0.15 * press);
  const fy = y - gap / 2; // uyluk kemiği alt ucu
  const ty = y + gap / 2; // kaval kemiği üst yüzü
  const pores = Array.from({ length: 22 }, (_, i) => ({ px: x - 230 + ((i * 97) % 460), top: i % 2 === 0, rr: 5 + (i % 3) * 2 }));
  return (
    <g>
      <clipPath id={`kn${id}`}>
        <circle cx={x} cy={y} r={r} />
      </clipPath>
      <circle cx={x} cy={y} r={r} fill="#24333f" />
      <g clipPath={`url(#kn${id})`}>
        {/* uyluk kemiği: yuvarlak alt uç */}
        <path d={`M${x - 150} ${y - r - 20} L${x - 150} ${fy - 90} Q${x - 260} ${fy - 30} ${x - 200} ${fy} L${x + 200} ${fy} Q${x + 260} ${fy - 30} ${x + 150} ${fy - 90} L${x + 150} ${y - r - 20} Z`} fill="#f4efe2" stroke="#9fb6c4" strokeWidth={4} />
        {/* kaval kemiği: düz üst yüz */}
        <path d={`M${x - 240} ${ty} L${x + 240} ${ty} Q${x + 250} ${ty + 70} ${x + 140} ${ty + 110} L${x + 140} ${y + r + 20} L${x - 140} ${y + r + 20} L${x - 140} ${ty + 110} Q${x - 250} ${ty + 70} ${x - 240} ${ty} Z`} fill="#f4efe2" stroke="#9fb6c4" strokeWidth={4} />
        {/* kıkırdak katmanları (sünger) */}
        <rect x={x - 215} y={fy - th} width={430} height={th} rx={th / 2} fill={cart} stroke={C.ink} strokeWidth={3} />
        <rect x={x - 225} y={ty} width={450} height={th} rx={th / 2} fill={cart} stroke={C.ink} strokeWidth={3} />
        {pores.map((p, i) => (
          <circle key={i} cx={p.px} cy={p.top ? fy - th / 2 : ty + th / 2} r={p.rr * (0.6 + 0.4 * wet)} fill="#b8a36a" opacity={0.6} />
        ))}
        {crack > 0
          ? [-150, -40, 90, 180].map((cx, i) => (
              <path key={i} d={`M${x + cx} ${(i % 2 ? ty : fy - th) + (i % 2 ? 0 : 0)} l12 ${th * 0.5} l-10 ${th * 0.3} l14 ${th * 0.4}`} stroke={C.red} strokeWidth={5} fill="none" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - crack} />
            ))
          : null}
      </g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={C.ink} strokeWidth={16} />
      <circle cx={x} cy={y} r={r - 14} fill="none" stroke="#9fd0e8" strokeWidth={4} opacity={0.5} />
    </g>
  );
};

// "Komşun her sabah koşuyor, sen de koltuktan dizleri bitecek diyorsun. Peki ya biten seninkiyse?"
const Kosu1Hook: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const talk = pop(f, w(6) - 2, 12) * (1 - tw(f, w(10) - 2, w(10) + 6));
  const point = tw(f, w(6) - 2, w(7) + 2) * (1 - tw(f, w(10), w(11)));
  const lens = pop(f, w(11), 14);
  const crack = tw(f, w(12), w(13) + 8);
  const knee = { x: SOFA.x - 30, y: SOFA.seat + 40 };
  return (
    <CamK k={[[0, 1, 540, 960], [w(10), 1, 540, 960], [w(12), 1.12, knee.x, knee.y - 100], [w(13) + 20, 1.12, knee.x, knee.y - 100]]}>
      <LivingRoom f={f} />
      <SofaBack />
      <Person x={SOFA.x} y={sitY} s={SITS} belly={0.5} legL={{ lift: 1, spread: 10 }} legR={{ lift: 1, spread: 10 }} armL={[point * 70, -point * 60]} armR={[20, -60]} mouth={lens > 0.5 ? "worry" : talk > 0.5 ? "grin" : "smile"} eyes={lens > 0.5 ? "wide" : "open"} lookY={lens > 0.5 ? 10 : 0} />
      <SofaFront />
      {talk > 0 ? (
        <g transform={`translate(330 1000) scale(${talk})`}>
          <rect x={-200} y={-70} width={400} height={120} rx={30} fill={C.cream} stroke={C.ink} strokeWidth={7} />
          <path d="M120 45 L190 110 L60 48 Z" fill={C.cream} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
          <text x={0} y={18} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={64} fill={C.ink}>
            dizleri bitecek!
          </text>
        </g>
      ) : null}
      {lens > 0 ? (
        <g transform={`translate(${knee.x + 190} ${knee.y - 330}) scale(${lens * 0.55})`}>
          <KneeLens x={0} y={0} r={300} wet={1 - crack * 0.7} crack={crack} />
          <HandText x={0} y={-350} text="senin dizin" size={90} p={1} color={C.red} rotate={-3} />
        </g>
      ) : null}
    </CamK>
  );
};

// "İki bin on yedide araştırmacılar yirmiye yakın çalışmayı birleştirip diz ve kalçalara baktı."
const Kosu2Arastirma: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const pile = tw(f, w(5) - 2, w(8) + 6);
  const n = Math.floor(18 * pile);
  const scan = tw(f, w(9), w(12) + 6);
  return (
    <>
      <Gym o={0.35} />
      <HandText x={540} y={260} text="2017" size={170} p={tw(f, 0, w(3) + 4)} rotate={-4} />
      {/* yığılan araştırmalar */}
      {Array.from({ length: n }, (_, k) => (
        <g key={k} transform={`translate(${300 + ((k * 37) % 24) - 12} ${1150 - k * 26}) rotate(${((k * 53) % 12) - 6})`}>
          <rect x={-150} y={-20} width={300} height={40} rx={6} fill={C.cream} stroke={C.ink} strokeWidth={5} />
          <path d="M-120 -4 L80 -4 M-120 8 L40 8" stroke="#9fb6c4" strokeWidth={4} />
        </g>
      ))}
      {/* diz ve kalça röntgenleri: büyüteçle taranır */}
      <g opacity={tw(f, w(8), w(9) + 4)}>
        <g transform="translate(780 640) scale(0.5)">
          <KneeLens x={0} y={0} r={300} />
        </g>
        <g transform="translate(780 1030)">
          <circle r={150} fill="#24333f" stroke={C.ink} strokeWidth={10} />
          <circle cx={-20} cy={-20} r={60} fill="#f4efe2" stroke="#9fb6c4" strokeWidth={4} />
          <path d="M-60 40 Q-40 -10 -80 -60 M10 30 L60 120" stroke="#f4efe2" strokeWidth={34} strokeLinecap="round" fill="none" />
        </g>
        <text x={780} y={410} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={56} fill={C.ink}>
          diz
        </text>
        <text x={780} y={1230} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={56} fill={C.ink}>
          kalça
        </text>
      </g>
      <Person x={interpolate(scan, [0, 1], [430, 560])} y={PY + 380} s={0.6} belly={0.4} armL={[12, 0]} armR={[150, -40]} mouth="flat" lookY={-8}>
        <g transform={`translate(${armPoints(1, [150, -40])[2][0]} ${armPoints(1, [150, -40])[2][1] - 60}) rotate(-20)`}>
          <circle r={70} fill="#cfe6f2" fillOpacity={0.35} stroke={C.ink} strokeWidth={12} />
          <path d="M50 50 L120 120" stroke={C.ink} strokeWidth={20} strokeLinecap="round" />
        </g>
      </Person>
    </>
  );
};

// Küçük insan simgesi (100'lük kalabalık için): sitting=koltukta, runner=koşucu
const Mini2: React.FC<{ x: number; y: number; red: number; runner?: boolean }> = ({ x, y, red, runner }) => (
  <g transform={`translate(${x} ${y})`}>
    <circle cx={0} cy={-26} r={9} fill={C.skin} stroke={C.ink} strokeWidth={2.5} />
    <rect x={-9} y={-16} width={18} height={20} rx={5} fill={runner ? "#d9705f" : "#8a6d9e"} stroke={C.ink} strokeWidth={2.5} />
    <path d={runner ? "M-4 4 L-10 16 M4 4 L10 14" : "M-5 4 L-5 14 M5 4 L5 14"} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
    {red > 0 ? <circle cx={0} cy={-6} r={16 * red} fill={C.red} opacity={0.75} /> : null}
  </g>
);

// "Hiç koşmayanların yüzde onunda kireçlenme vardı. Hobi olarak koşanlarda? Yüzde üç buçuk."
const Kosu3Oran: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const left = pop(f, 0, 12);
  const right = pop(f, w(6) - 2, 12);
  const redL = tw(f, w(2), w(4) + 4);
  const redR = tw(f, w(9), w(11) + 4);
  const ask = pop(f, w(8) - 2, 10) * (1 - tw(f, w(9) - 2, w(9) + 4));
  const grid = (ox: number, oy: number, runner: boolean, nRed: number, p: number) =>
    Array.from({ length: 100 }, (_, i) => {
      const cx = ox + (i % 10) * 42;
      const cy = oy + Math.floor(i / 10) * 52;
      const idx = [12, 27, 35, 41, 58, 63, 76, 84, 90, 99];
      const k = idx.indexOf(i);
      const red = k >= 0 && k < Math.ceil(nRed) ? Math.min(1, Math.max(0, p * nRed - k)) * (k === Math.floor(nRed) ? nRed - Math.floor(nRed) : 1) : 0;
      return <Mini2 key={i} x={cx} y={cy} red={red} runner={runner} />;
    });
  return (
    <>
      <Gym o={0.3} />
      {/* sol: hiç koşmayanlar (koltuk) */}
      <g opacity={left}>
        <text x={290} y={430} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={66} fill={C.ink}>
          koltuk
        </text>
        {grid(100, 520, false, 10, redL)}
        <Counter x={290} y={1170} to={10} prefix="%" p={redL} size={130} color={C.red} rotate={-4} />
      </g>
      {/* sağ: hobi koşucuları */}
      <g opacity={right}>
        <text x={790} y={430} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={66} fill={C.ink}>
          koşu
        </text>
        {grid(600, 520, true, 3.5, redR)}
        {redR > 0 ? (
          <text x={790} y={1170} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={130} fill="#3f7d4f" transform="rotate(-4 790 1170)" opacity={Math.min(1, redR * 3)}>
            %3,5
          </text>
        ) : null}
        {ask > 0 ? <HandText x={790} y={780} text="?" size={260} p={ask} color={C.red} rotate={8} /> : null}
      </g>
      <Person x={540} y={PY + 400} s={0.55} belly={0.4} armL={[12, 0]} armR={redR > 0.5 ? [150, -30] : [12, 0]} mouth={redR > 0.5 ? "o" : "flat"} eyes={redR > 0.5 ? "wide" : "open"} lookY={-8} />
    </>
  );
};

// "Çünkü kıkırdağın kan damarı yok. Sünger gibi: basınca sıvı çıkar, bırakınca besin dolar. Her adım onu besler; koltukta duran sünger kurur."
const Kosu4Sunger: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const L = { x: 540, y: 720, r: 360 };
  const vessel = pop(f, w(1) - 2, 12) * (1 - tw(f, w(5) - 2, w(5) + 6));
  const pump = f >= w(5) - 2 && f < w(17) ? 1 : 0;
  const period = 22;
  const ph = ((f - w(5)) / period) * Math.PI * 2;
  const pressRaw = pump ? (1 - Math.cos(ph)) / 2 : 0;
  // anlatım: "basınca" sıkıştır, "bırakınca" bırak
  const press = f >= w(7) - 2 && f < w(10) - 2 ? Math.max(pressRaw, tw(f, w(7) - 2, w(7) + 6)) : f >= w(10) - 2 && f < w(13) ? pressRaw * 0.3 : pressRaw;
  const dry = tw(f, w(18), w(20) + 8);
  const out = f >= w(7) && f < w(13) + 30;
  const inflow = f >= w(10) - 2 && f < w(17);
  const runner = tw(f, w(13) - 4, w(13) + 6) * (1 - tw(f, w(17) - 4, w(17) + 4));
  const couch = tw(f, w(17) - 2, w(17) + 6);
  const rw = walk(f, 1, period / (2 * Math.PI));
  return (
    <>
      <Gym o={0.3} />
      <KneeLens x={L.x} y={L.y} r={L.r} press={press * (1 - dry)} wet={1 - dry * 0.85} crack={dry} />
      {/* kan damarı yok: kırmızı damar + çarpı */}
      {vessel > 0 ? (
        <g opacity={vessel}>
          <path d={`M${L.x + 260} ${L.y - 300} Q${L.x + 320} ${L.y - 120} ${L.x + 230} ${L.y}`} stroke={C.red} strokeWidth={22} fill="none" strokeLinecap="round" />
          <Cross x={L.x + 260} y={L.y - 150} size={120} p={tw(f, w(3) - 2, w(4) + 4)} />
        </g>
      ) : null}
      <HandText x={540} y={240} text="kıkırdak = sünger" size={90} p={tw(f, w(5) - 2, w(6) + 6)} rotate={-3} />
      {/* basınca: sıvı dışarı (mavi damlalar) */}
      {out && press > 0.4
        ? [-1, 1].map((k) =>
            [0, 1, 2].map((j) => (
              <circle key={`${k}${j}`} cx={L.x + k * (250 + 50 * j * press)} cy={L.y - 10 + j * 14} r={14 - j * 3} fill={C.water} stroke={C.ink} strokeWidth={3} opacity={press} />
            )),
          )
        : null}
      {/* bırakınca: besin içeri (yeşil noktalar) */}
      {inflow && press < 0.5
        ? cycles(f, w(10) - 2, 5, 20).map(({ k, p }) => (
            <circle key={k} cx={L.x + (k % 2 ? 1 : -1) * interpolate(p, [0, 1], [330, 120 + (k % 3) * 40])} cy={L.y + ((k * 13) % 30) - 15} r={11} fill="#6fd08c" stroke={C.ink} strokeWidth={3} opacity={1 - p * 0.5} />
          ))
        : null}
      {/* her adım: koşan avatar (her basışta bir adım) */}
      {runner > 0 ? (
        <g opacity={runner}>
          <Person x={540} y={PY + 420 - rw.bob} s={0.55} belly={0.4} legL={rw.legL} legR={rw.legR} armL={[30 + 30 * Math.sin(ph), -80]} armR={[30 - 30 * Math.sin(ph), -80]} mouth="grin" />
        </g>
      ) : null}
      {couch > 0 ? (
        <g opacity={couch} transform="translate(-160 400) scale(0.75) translate(0 0)">
          <SofaBack />
          <Person x={SOFA.x} y={sitY} s={SITS} belly={0.5} legL={{ lift: 1, spread: 10 }} legR={{ lift: 1, spread: 10 }} armL={[20, -60]} armR={[20, -60]} mouth="flat" eyes={dry > 0.5 ? "closed" : "open"} />
          <SofaFront />
        </g>
      ) : null}
      {dry > 0.3 ? <HandText x={540} y={1150} text="kurur" size={110} p={tw(f, w(19), w(20) + 6)} color={C.red} rotate={-4} /> : null}
    </>
  );
};

// Doz göstergesi: sol kırmızı (koltuk), orta yeşil (dozunda), sağ kırmızı (aşırı)
const DoseMeter: React.FC<{ x: number; y: number; p: number; v: number; right?: string }> = ({ x, y, p, v, right = "yarış" }) => {
  if (p <= 0) return null;
  const R = 220;
  const arc = (a0: number, a1: number) => {
    const P = (a: number) => [x + Math.cos(((180 + a) * Math.PI) / 180) * R, y + Math.sin(((180 + a) * Math.PI) / 180) * R];
    const [x1, y1] = P(a0);
    const [x2, y2] = P(a1);
    return `M${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2}`;
  };
  const ang = ((180 + v * 180) * Math.PI) / 180;
  return (
    <g opacity={p} transform={`translate(${x} ${y}) scale(${p}) translate(${-x} ${-y})`}>
      <path d={arc(0, 60)} stroke={C.red} strokeWidth={46} fill="none" />
      <path d={arc(60, 120)} stroke="#3f7d4f" strokeWidth={46} fill="none" />
      <path d={arc(120, 180)} stroke={C.red} strokeWidth={46} fill="none" />
      <path d={`M${x} ${y} L${x + Math.cos(ang) * (R - 30)} ${y + Math.sin(ang) * (R - 30)}`} stroke={C.ink} strokeWidth={14} strokeLinecap="round" />
      <circle cx={x} cy={y} r={22} fill={C.ink} />
      <text x={x - R} y={y + 70} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={48} fill={C.ink}>
        koltuk
      </text>
      <text x={x} y={y - R - 40} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={56} fill="#3f7d4f">
        dozunda
      </text>
      <text x={x + R} y={y + 70} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={48} fill={C.ink}>
        {right}
      </text>
    </g>
  );
};

// "Ama yarış yarış koşan profesyonellerde oran yüzde on üç. Yani mesele koşmak değil, dozunda koşmak."
const Kosu5Doz: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const race = 1 - tw(f, w(9) - 2, w(9) + 8);
  const meter = pop(f, w(9) - 2, 14);
  const v = interpolate(f, [w(9), w(11), w(12), w(13), w(14) + 6], [0.05, 0.05, 0.95, 0.95, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const rw = walk(f, 1, 2.2);
  const jw = walk(f, 1, 4);
  return (
    <>
      <rect x={-20} y={1080} width={1120} height={900} fill="#c9775a" opacity={0.35 * race + 0.1} />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M-20 ${1120 + i * 90} L1100 ${1120 + i * 90}`} stroke="#fbf3e2" strokeWidth={6} opacity={0.7 * race} />
      ))}
      {/* yarışan profesyoneller: hızlı, terli, numaralı */}
      <g opacity={race}>
        {[0, 1, 2].map((i) => {
          const x = ((f * 9 + i * 360) % 1500) - 200;
          return (
            <Person key={i} x={x} y={1240 + i * 60 - rw.bob} s={0.62} belly={0.15} shirt={["#4f97c2", "#d1271b", "#3f7d4f"][i]} legL={rw.legL} legR={rw.legR} armL={[40 + 40 * Math.sin(f / 2.2), -90]} armR={[40 - 40 * Math.sin(f / 2.2), -90]} mouth="open" eyes="closed" blush={0.9}>
              <rect x={-40} y={-470} width={80} height={56} rx={6} fill="#fff" stroke={C.ink} strokeWidth={4} />
              <text x={0} y={-430} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={36} fill={C.ink}>
                {7 + i * 31}
              </text>
            </Person>
          );
        })}
        <Counter x={540} y={500} to={13} prefix="%" p={tw(f, w(6) - 2, w(8) + 4)} size={210} color={C.red} rotate={-4} />
      </g>
      <DoseMeter x={540} y={760} p={meter} v={v} />
      {/* avatar sakin tempoda koşar */}
      <g opacity={meter}>
        <Person x={540} y={PY + 330 - jw.bob} s={0.7} belly={0.4} legL={jw.legL} legR={jw.legR} armL={[30 + 25 * Math.sin(f / 4), -80]} armR={[30 - 25 * Math.sin(f / 4), -80]} mouth="grin" />
      </g>
    </>
  );
};

// "Şimdi pencereden bak: komşun yine koşuyor. Sen hâlâ dizleri bitecek mi diyorsun?"
// Avatar koltukta; pencereye bakar, sonra izleyiciye; yanında koşu ayakkabıları belirir; son kare = açılış karesi
const Kosu6Kapanis: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const look = tw(f, w(0), w(2) + 4) * (1 - tw(f, w(6) - 2, w(6) + 6));
  const shoes = pop(f, w(8), 12) * (1 - tw(f, d - 18, d - 8));
  const smirk = f >= w(9) && f < d - 16;
  return (
    <CamK k={[[0, 1, 540, 960], [w(2), 1.06, 380, 600], [w(5), 1.06, 380, 600], [w(7), 1, 540, 960]]}>
      <LivingRoom f={f} />
      <SofaBack />
      <Person x={SOFA.x} y={sitY} s={SITS} belly={0.5} legL={{ lift: 1, spread: 10 }} legR={{ lift: 1, spread: 10 }} armL={[look * 70, -look * 60]} armR={[20, -60]} mouth={smirk ? "grin" : "smile"} lookY={0} />
      <SofaFront />
      {shoes > 0 ? (
        <g transform={`translate(${SOFA.x - 330} ${ROOM_FLOOR - 10}) scale(${shoes})`} stroke={C.ink} strokeWidth={6} strokeLinejoin="round">
          {[0, 1].map((k) => (
            <g key={k} transform={`translate(${k * 120} 0)`}>
              <path d="M-50 0 L-50 -40 Q-30 -60 0 -50 L40 -30 Q60 -20 60 0 Z" fill="#d1271b" />
              <path d="M-50 0 L60 0" stroke="#fbf3e2" strokeWidth={10} />
            </g>
          ))}
        </g>
      ) : null}
    </CamK>
  );
};

/* ---------- 06 diz: "dizlerini korumak için bildiğin iki kural" ---------- */

// Dize asılı kural tabelası (ip ile); crack: çatlak, p: beliriş
const RuleSign: React.FC<{ x: number; y: number; ax: number; ay: number; text: string; p: number; crack?: number; rot?: number }> = ({ x, y, ax, ay, text, p, crack = 0, rot = 0 }) =>
  p > 0 ? (
    <g>
      <path d={`M${ax} ${ay} L${x} ${y - 60 * p}`} stroke={C.ink} strokeWidth={5} opacity={p} />
      <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${p})`}>
        <rect x={-190} y={-62} width={380} height={124} rx={14} fill={C.cream} stroke={C.ink} strokeWidth={8} />
        <rect x={-176} y={-48} width={352} height={96} rx={8} fill="none" stroke={C.red} strokeWidth={6} />
        <text x={0} y={20} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={text.length > 10 ? 44 : 64} fill={C.red}>
          {text}
        </text>
        {crack > 0 ? (
          <path d="M-60 -62 L-30 -20 L-55 5 L-10 30 L-25 62 M40 -62 L55 -15 L30 10 L60 62" stroke={C.ink} strokeWidth={7} fill="none" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - crack} />
        ) : null}
      </g>
    </g>
  ) : null;

const D6A = { x: 540, y: PY, s: 0.95 }; // açılış/kapanış avatarı
const kneePos = (side: number) => {
  const k = legPoints(side, {})[1];
  return { x: D6A.x + k[0] * D6A.s, y: D6A.y + k[1] * D6A.s };
};

// "Dizlerini korumak için bildiğin iki kural var. İkisi de yanlış olabilir."
const Diz1Hook: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const s1 = pop(f, w(4) - 2, 14);
  const s2 = pop(f, w(5) - 2, 14);
  const crack = tw(f, w(9) - 2, w(10) + 4);
  const shake = crack > 0 && crack < 1 ? Math.sin(f * 1.9) * 5 : 0;
  const kL = kneePos(-1);
  const kR = kneePos(1);
  return (
    <CamK k={[[0, 1, 540, 1000], [w(6), 1.06, 540, 1000], [w(9), 1.06, 540, 1000], [w(10) + 10, 1.1, 540, 1050]]} shake={hit(f, Math.round(w(9)), 12) * 0.5}>
      <Gym />
      <Person x={D6A.x} y={D6A.y} s={D6A.s} belly={0.4} armL={[12, 0]} armR={[12, 0]} mouth={crack > 0.3 ? "o" : s2 > 0.5 ? "flat" : "smile"} eyes={crack > 0.3 ? "wide" : "open"} lookY={s1 > 0.5 && crack < 0.3 ? 8 : 0} />
      <RuleSign x={230 + shake} y={kL.y - 120} ax={kL.x} ay={kL.y} text="KOŞMA!" p={s1} crack={crack} rot={-4} />
      <RuleSign x={850 + shake} y={kR.y - 120} ax={kR.x} ay={kR.y} text="DİZ ÖNE GEÇMESİN!" p={s2} crack={crack} rot={4} />
    </CamK>
  );
};

// 100 kişilik kalabalık (koltuk / koşu); nRed: kırmızı yanan kişi sayısı (kesirli olabilir), p: ilerleme
const Crowd: React.FC<{ ox: number; oy: number; runner: boolean; nRed: number; p: number }> = ({ ox, oy, runner, nRed, p }) => {
  const idx = [12, 27, 35, 41, 58, 63, 76, 84, 90, 99];
  return (
    <g>
      {Array.from({ length: 100 }, (_, i) => {
        const k = idx.indexOf(i);
        const full = Math.floor(nRed);
        const amount = k < 0 ? 0 : k < full ? 1 : k === full ? nRed - full : 0;
        const red = Math.min(1, Math.max(0, p * Math.ceil(nRed) - k)) * amount;
        return <Mini2 key={i} x={ox + (i % 10) * 42} y={oy + Math.floor(i / 10) * 52} red={red} runner={runner} />;
      })}
    </g>
  );
};

// "Birincisi: koşu dizi bitirir. Oysa araştırmalarda kireçlenme, hiç koşmayanlarda yüzde on, hobi olarak koşanlarda yüzde üç buçuk çıktı."
const Diz2Kosu: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const rule = pop(f, 0, 12) * (1 - tw(f, w(4) - 2, w(4) + 6));
  const left = pop(f, w(4), 12);
  const right = pop(f, w(11) - 2, 12);
  const redL = tw(f, w(9), w(10) + 4);
  const redR = tw(f, w(14), w(16) + 4);
  const ask = pop(f, w(13) - 2, 10) * (1 - tw(f, w(14) - 2, w(14) + 4));
  const rw = walk(f, 1, 3.2);
  return (
    <>
      <Gym o={0.3} />
      {/* kural: "KOŞMA!" — koşan avatarın önüne düşer */}
      {rule > 0 ? (
        <g opacity={rule}>
          <HandText x={540} y={300} text="1" size={200} p={1} color={C.red} rotate={-4} />
          <Person x={540} y={PY - rw.bob} s={0.9} belly={0.4} legL={rw.legL} legR={rw.legR} armL={[30 + 30 * Math.sin(f / 3.2), -80]} armR={[30 - 30 * Math.sin(f / 3.2), -80]} mouth={f > w(3) ? "worry" : "grin"} />
          <g transform={`translate(540 760) rotate(-6) scale(${pop(f, w(1) - 2, 12) * 1.3})`}>
            <rect x={-190} y={-62} width={380} height={124} rx={14} fill={C.cream} stroke={C.ink} strokeWidth={8} />
            <text x={0} y={22} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={64} fill={C.red}>
              KOŞMA!
            </text>
          </g>
        </g>
      ) : null}
      <g opacity={left}>
        <text x={290} y={430} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={66} fill={C.ink}>
          koşmayan
        </text>
        <Crowd ox={100} oy={520} runner={false} nRed={10} p={redL} />
        <Counter x={290} y={1170} to={10} prefix="%" p={redL} size={130} color={C.red} rotate={-4} />
      </g>
      <g opacity={right}>
        <text x={790} y={430} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={66} fill={C.ink}>
          koşan
        </text>
        <Crowd ox={600} oy={520} runner nRed={3.5} p={redR} />
        {redR > 0 ? (
          <text x={790} y={1170} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={130} fill="#3f7d4f" transform="rotate(-4 790 1170)" opacity={Math.min(1, redR * 3)}>
            %3,5
          </text>
        ) : null}
        {ask > 0 ? <HandText x={790} y={780} text="?" size={260} p={ask} color={C.red} rotate={8} /> : null}
      </g>
      {left > 0 ? (
        <Person x={540} y={PY + 400} s={0.55} belly={0.4} armL={[12, 0]} armR={redR > 0.5 ? [150, -30] : [12, 0]} mouth={redR > 0.5 ? "o" : "flat"} eyes={redR > 0.5 ? "wide" : "open"} lookY={-8} />
      ) : null}
    </>
  );
};

// "Çünkü kıkırdak sünger gibi: her adımda sıkışır, besinle dolar. Koltukta ise kurur."
const Diz3Sunger: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const L = { x: 540, y: 700, r: 360 };
  const period = 20;
  const ph = ((f - w(4)) / period) * Math.PI * 2;
  const pumping = f >= w(4) - 2 && f < w(9);
  const press = pumping ? (1 - Math.cos(ph)) / 2 : 0;
  const dry = tw(f, w(10), w(11) + 8);
  const runner = tw(f, w(4) - 4, w(4) + 6) * (1 - tw(f, w(9) - 4, w(9) + 4));
  const couch = tw(f, w(9) - 2, w(9) + 6);
  const rw = walk(f, 1, period / (2 * Math.PI));
  return (
    <>
      <Gym o={0.3} />
      <KneeLens x={L.x} y={L.y} r={L.r} press={press} wet={1 - dry * 0.85} crack={dry} />
      <HandText x={540} y={240} text="kıkırdak = sünger" size={90} p={tw(f, w(1) - 2, w(3) + 4)} rotate={-3} />
      {pumping && press > 0.5
        ? [-1, 1].map((k) => [0, 1, 2].map((j) => <circle key={`${k}${j}`} cx={L.x + k * (250 + 50 * j * press)} cy={L.y - 10 + j * 14} r={14 - j * 3} fill={C.water} stroke={C.ink} strokeWidth={3} opacity={press} />))
        : null}
      {pumping && f >= w(7) - 4 && press < 0.5
        ? cycles(f, w(7) - 4, 4, 18).map(({ k, p }) => (
            <circle key={k} cx={L.x + (k % 2 ? 1 : -1) * interpolate(p, [0, 1], [330, 120 + (k % 3) * 40])} cy={L.y + ((k * 13) % 30) - 15} r={11} fill="#6fd08c" stroke={C.ink} strokeWidth={3} opacity={1 - p * 0.5} />
          ))
        : null}
      {runner > 0 ? (
        <g opacity={runner}>
          <Person x={540} y={PY + 420 - rw.bob} s={0.55} belly={0.4} legL={rw.legL} legR={rw.legR} armL={[30 + 30 * Math.sin(ph), -80]} armR={[30 - 30 * Math.sin(ph), -80]} mouth="grin" />
        </g>
      ) : null}
      {couch > 0 ? (
        <g opacity={couch} transform="translate(-160 400) scale(0.75)">
          <SofaBack />
          <Person x={SOFA.x} y={sitY} s={SITS} belly={0.5} legL={{ lift: 1, spread: 10 }} legR={{ lift: 1, spread: 10 }} armL={[20, -60]} armR={[20, -60]} mouth="flat" eyes={dry > 0.5 ? "closed" : "open"} />
          <SofaFront />
        </g>
      ) : null}
      {dry > 0.3 ? <HandText x={540} y={1150} text="kurur" size={110} p={tw(f, w(10), w(11) + 6)} color={C.red} rotate={-4} /> : null}
    </>
  );
};

// Yandan squat yapan avatar (sade, aynı renkler). d: derinlik 0..1, lock: diz duvara takılır (geride kalır)
// Diz bandajı: K dizde, a: bacak doğrultusu (derece, x eksenine göre), w: kalınlık
const KneeBandage: React.FC<{ x: number; y: number; a: number; w: number }> = ({ x, y, a, w }) => (
  <g transform={`translate(${x} ${y}) rotate(${a})`}>
    <rect x={-48} y={-w / 2 - 6} width={96} height={w + 12} rx={12} fill="#fbf7ee" stroke={C.ink} strokeWidth={5} />
    {[-30, -10, 10, 30].map((d) => (
      <path key={d} d={`M${d - 8} ${-w / 2 - 6} L${d + 8} ${w / 2 + 6}`} stroke="#d8cfbd" strokeWidth={4} />
    ))}
  </g>
);

const SideSquat: React.FC<{ x: number; floor: number; d: number; lock: number; kneeLoad: number; hipLoad: number; bandage?: boolean }> = ({ x, floor, d, lock, kneeLoad, hipLoad, bandage }) => {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const A = { x, y: floor - 24 }; // ayak bileği
  const shin = interpolate(lock, [0, 1], [38, 8]) * d; // kaval öne eğimi
  const K = { x: A.x + Math.sin(rad(shin)) * 170, y: A.y - Math.cos(rad(shin)) * 170 };
  const th = 82 * d; // uyluk eğimi (dikeyden geriye)
  const H = { x: K.x - Math.sin(rad(th)) * 175, y: K.y - Math.cos(rad(th)) * 175 };
  const lean = interpolate(lock, [0, 1], [28, 62]) * d; // gövde öne eğimi
  const S = { x: H.x + Math.sin(rad(lean)) * 230, y: H.y - Math.cos(rad(lean)) * 230 };
  const Hd = { x: S.x + Math.sin(rad(lean)) * 70, y: S.y - Math.cos(rad(lean)) * 70 };
  const hand = { x: S.x + 150, y: S.y + 20 };
  const line = (a: { x: number; y: number }, b: { x: number; y: number }, wd: number, col: string) => (
    <>
      <path d={`M${a.x} ${a.y} L${b.x} ${b.y}`} stroke={C.ink} strokeWidth={wd + 11} strokeLinecap="round" />
      <path d={`M${a.x} ${a.y} L${b.x} ${b.y}`} stroke={col} strokeWidth={wd} strokeLinecap="round" />
    </>
  );
  const torque = (c: { x: number; y: number }, v: number, col: string) =>
    v > 0.02 ? <circle cx={c.x} cy={c.y} r={30 + 90 * v} fill={col} opacity={0.18 + 0.25 * v} stroke={col} strokeWidth={6} /> : null;
  return (
    <g>
      {torque(K, kneeLoad, C.yellow)}
      {torque(H, hipLoad, C.red)}
      {line(A, K, 30, C.skin)}
      {line(K, H, 40, C.shorts)}
      {line(H, S, 58, C.shirt)}
      {line(S, hand, 26, C.skin)}
      <path d={`M${A.x - 20} ${A.y + 10} L${A.x + 75} ${A.y + 10}`} stroke={C.ink} strokeWidth={22} strokeLinecap="round" />
      {bandage ? <KneeBandage x={K.x} y={K.y} a={(Math.atan2(K.y - A.y, K.x - A.x) * 180) / Math.PI} w={34} /> : null}
      <circle cx={Hd.x} cy={Hd.y} r={52} fill={C.skin} stroke={C.ink} strokeWidth={7} />
      <path d={`M${Hd.x - 50} ${Hd.y - 12} Q${Hd.x - 20} ${Hd.y - 70} ${Hd.x + 40} ${Hd.y - 30}`} fill={C.hair} stroke={C.ink} strokeWidth={5} />
      <circle cx={Hd.x + 28} cy={Hd.y - 6} r={6} fill={C.ink} />
    </g>
  );
};

// "İkincisi: squatta diz parmak ucunu geçmesin. Bir deneyde diz geride tutulunca yük kalçaya kaydı, on kattan fazla."
const Diz4Squat: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const floor = 1350;
  const X = 380;
  const rule = pop(f, 0, 12);
  const wall = tw(f, w(8) - 2, w(9) + 4);
  const lock = tw(f, w(9), w(10) + 6);
  const d = f < w(11) - 2 ? (1 - Math.cos((f / 26) * Math.PI * 2)) / 2 : Math.max((1 - Math.cos((f / 26) * Math.PI * 2)) / 2, tw(f, w(11) - 2, w(11) + 8));
  const hipBoost = tw(f, w(11), w(13) + 6);
  const kneeLoad = d * (0.7 - 0.15 * lock);
  const hipLoad = d * (0.15 + 0.85 * hipBoost);
  const x10 = pop(f, w(14) - 2, 14);
  return (
    <>
      <Gym o={0.4} />
      <HandText x={540} y={230} text="2" size={180} p={rule} color={C.red} rotate={-4} />
      <g transform={`translate(540 420) rotate(-4) scale(${rule * (1 - 0.35 * tw(f, w(6) - 2, w(6) + 8))})`}>
        <rect x={-260} y={-62} width={520} height={124} rx={14} fill={C.cream} stroke={C.ink} strokeWidth={8} />
        <text x={0} y={20} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={56} fill={C.red}>
          DİZ ÖNE GEÇMESİN!
        </text>
      </g>
      {/* parmak ucu çizgisi */}
      <path d={`M${X + 75} ${floor - 10} L${X + 75} ${floor - 420}`} stroke={C.ink} strokeWidth={5} strokeDasharray="14 12" opacity={0.6 * (1 - wall)} />
      {/* duvar: dizi geride tutar */}
      {wall > 0 ? (
        <g transform={`translate(0 ${-400 * (1 - wall)})`} opacity={wall}>
          <rect x={X + 78} y={floor - 330} width={40} height={320} fill="#b9b2a6" stroke={C.ink} strokeWidth={7} />
          <text x={X + 98} y={floor - 345} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={44} fill={C.ink}>
            duvar
          </text>
        </g>
      ) : null}
      <SideSquat x={X} floor={floor} d={d} lock={lock} kneeLoad={kneeLoad} hipLoad={hipLoad} />
      <path d={`M60 ${floor} L1020 ${floor}`} stroke={C.ink} strokeWidth={6} />
      {/* yük etiketleri */}
      <text x={820} y={980} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={56} fill="#b8862a" opacity={tw(f, w(2), w(4))}>
        diz yükü
      </text>
      <text x={820} y={800} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={56} fill={C.red} opacity={tw(f, w(11), w(12) + 4)}>
        kalça yükü
      </text>
      {x10 > 0 ? <HandText x={820} y={700} text="×10" size={200} p={x10} color={C.red} rotate={-6} /> : null}
      <HandText x={540} y={1560} text="küçük bir deney (2003)" size={60} p={tw(f, w(6), w(7) + 6)} rotate={-2} />
    </>
  );
};

// "Yani dizini korumanın yolu onu saklamak değil, dozunda kullanmak."
const Diz5Doz: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const meter = pop(f, 0, 14);
  const v = interpolate(f, [0, w(4), w(5) + 4, w(6), w(7) + 8], [0.5, 0.5, 0.05, 0.05, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const jw = walk(f, 1, 4);
  const hide = tw(f, w(4), w(5) + 4) * (1 - tw(f, w(6), w(7) + 4));
  return (
    <>
      <Gym o={0.4} />
      <DoseMeter x={540} y={760} p={meter} v={v} right="aşırı" />
      {hide > 0.5 ? (
        <g opacity={hide}>
          <SofaBack />
          <Person x={SOFA.x} y={sitY} s={SITS} belly={0.5} legL={{ lift: 1, spread: 10 }} legR={{ lift: 1, spread: 10 }} armL={[20, -60]} armR={[20, -60]} mouth="flat" />
          <SofaFront />
        </g>
      ) : (
        <Person x={540} y={PY + 250 - jw.bob} s={0.8} belly={0.4} legL={jw.legL} legR={jw.legR} armL={[30 + 25 * Math.sin(f / 4), -80]} armR={[30 - 25 * Math.sin(f / 4), -80]} mouth="grin" />
      )}
    </>
  );
};

// "Peki sen bu iki kuraldan hangisine inanıyordun?" — iki tabela başının iki yanında, sonra söner; son kare = açılış
const Diz6Kapanis: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const signs = pop(f, w(2) - 2, 12) * (1 - tw(f, d - 20, d - 10));
  const q = pop(f, w(5) - 2, 12) * (1 - tw(f, d - 20, d - 10));
  return (
    <CamK k={[[0, 1.1, 540, 900], [w(4), 1.1, 540, 900], [d - 14, 1, 540, 1000]]}>
      <Gym />
      <Person x={D6A.x} y={D6A.y} s={D6A.s} belly={0.4} armL={[12, 0]} armR={[12, 0]} mouth="smile" lookY={0} />
      {signs > 0 ? (
        <>
          <g transform={`translate(250 520) rotate(-8) scale(${signs * 0.8})`}>
            <rect x={-190} y={-62} width={380} height={124} rx={14} fill={C.cream} stroke={C.ink} strokeWidth={8} />
            <text x={0} y={22} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={64} fill={C.red}>
              KOŞMA!
            </text>
          </g>
          <g transform={`translate(830 520) rotate(8) scale(${signs * 0.8})`}>
            <rect x={-190} y={-62} width={380} height={124} rx={14} fill={C.cream} stroke={C.ink} strokeWidth={8} />
            <text x={0} y={18} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={44} fill={C.red}>
              DİZ ÖNE GEÇMESİN!
            </text>
          </g>
        </>
      ) : null}
      {q > 0 ? <HandText x={540} y={330} text="?" size={220} p={q} color={C.red} rotate={8} /> : null}
    </CamK>
  );
};

/* ---------- 05 boyun, Giriş B: sakin, izleyiciye hitap ---------- */

const B5A = { x: 540, y: PY, s: 0.95 }; // açılış ve kapanış karesi: avatar telefona bakar

// "Şu an bu videoyu başın öne eğik izliyorsun, değil mi? Bunun için dünyaya yayılmış bir hesap var. Ama hikâyenin yarısı eksik."
const Boyun5Sen: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const id = svgId(useId());
  const A = B5A;
  const up = tw(f, w(0) - 2, w(1) + 4) * (1 - tw(f, w(4), w(6)));
  const wink = f >= w(8) && f < w(9) + 4;
  const disp = pop(f, w(10) - 2, 12);
  const tear = tw(f, w(19) - 2, w(19) + 12);
  const D = { x: A.x, y: A.y - 900 * A.s };
  const face = { x: A.x, y: A.y - 700 * A.s };
  const ring = [
    [170, 560],
    [910, 560],
    [120, 900],
    [960, 900],
    [190, 1240],
    [890, 1240],
  ];
  const half = (side: number) => (
    <g key={side}>
      <clipPath id={`hf${id}${side}`}>
        <rect x={side < 0 ? D.x - 260 : D.x} y={D.y - 160} width={260} height={320} />
      </clipPath>
      <g transform={side > 0 ? `translate(${60 * tear} ${260 * tear * tear}) rotate(${28 * tear} ${D.x} ${D.y})` : ""} opacity={side > 0 ? 1 - 0.6 * tear : 1}>
        <g clipPath={`url(#hf${id}${side})`}>
          <KgDisplay x={D.x} y={D.y} p={disp} value="?? kg" />
        </g>
      </g>
    </g>
  );
  return (
    <CamK k={[[0, 1, 540, 960], [w(1) + 4, 1.15, face.x, face.y], [w(6), 1.15, face.x, face.y], [w(9) + 4, 1, 540, 960]]}>
      <Gym />
      <Person x={A.x} y={A.y} s={A.s} belly={0.4} armL={[12, 0]} armR={PHONE_ARM} mouth={up > 0.5 ? "grin" : "smile"} eyes={wink ? "closed" : "open"} lookY={12 * (1 - up)}>
        <PhoneInHand arm={PHONE_ARM} />
      </Person>
      {disp > 0 ? (tear > 0 ? [-1, 1].map(half) : <KgDisplay x={D.x} y={D.y} p={disp} value="?? kg" />) : null}
      {/* hesap dünyaya yayılır: etrafta "27!" yazan telefonlar belirir */}
      {ring.map(([x, y], i) => {
        const on = pop(f, w(12) + i * 3, 10) * (1 - tw(f, w(17), w(18) + 4));
        return on > 0 ? (
          <g key={i} transform={`translate(${x} ${y}) scale(${on}) rotate(${i % 2 ? 8 : -8})`}>
            <rect x={-46} y={-80} width={92} height={160} rx={14} fill="#2f2f36" stroke={C.ink} strokeWidth={5} />
            <rect x={-36} y={-66} width={72} height={132} rx={6} fill="#d1271b" />
            <text x={0} y={16} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={44} fill="#ffcf3f">
              27!
            </text>
          </g>
        ) : null;
      })}
    </CamK>
  );
};

// "Yani boynunu suçlama, hareket ettir. Ve biri sana o yirmi yedi kiloyu anlatırsa, bu videoyu gönder."
// Kâğıt uçakla gönderir; arkadaş telefonuna bakıp çıkar; avatar ortaya gelip yine telefonuna bakar = açılış karesi.
const Boyun5Gonder: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const back = tw(f, w(14), d - 12);
  const A = { x: interpolate(back, [0, 1], [300, B5A.x]), y: PY, s: interpolate(back, [0, 1], [0.9, B5A.s]) };
  const move = tw(f, w(2), w(4) + 6) * (1 - tw(f, w(5) - 2, w(5) + 6));
  const roll = Math.sin(f / 5) * 12 * move;
  const armUp: Arm = [interpolate(move, [0, 1], [12, 165]), interpolate(move, [0, 1], [0, -10])];
  const send = tw(f, w(11), w(13));
  const armR: Arm = move > 0.05 ? armUp : PHONE_ARM;
  const friendIn = tw(f, w(5) - 4, w(7) + 4);
  const friendOut = tw(f, w(14), d - 14);
  const fw = walk(f, (friendIn > 0 && friendIn < 1) || (friendOut > 0 && friendOut < 1) ? 1 : 0, 4.5);
  const F = { x: interpolate(friendIn, [0, 1], [1250, 800]) + 500 * friendOut, y: PY - fw.bob, s: 0.9 };
  const FP = { x: F.x - 200, y: F.y - 430 };
  const ah = armPoints(1, PHONE_ARM)[2];
  const AP = { x: A.x + ah[0] * A.s, y: A.y + ah[1] * A.s - 40 };
  const plane = { x: interpolate(send, [0, 1], [AP.x, FP.x]), y: interpolate(send, [0, 1], [AP.y, FP.y]) - Math.sin(send * Math.PI) * 260 };
  const lit = pop(f, w(13), 10);
  return (
    <>
      <Gym />
      <Person x={A.x} y={A.y} s={A.s} belly={0.4} armL={move > 0.05 ? armUp : [12, 0]} armR={armR} mouth={move > 0.5 ? "grin" : "smile"} eyes={move > 0.5 ? "closed" : "open"} lookY={move > 0.05 ? -6 : 6 + 6 * back} tilt={roll}>
        {move <= 0.05 ? <PhoneInHand arm={PHONE_ARM} /> : null}
      </Person>
      <Person x={F.x} y={F.y} s={F.s} belly={0.25} shirt="#c9566b" legL={fw.legL} legR={fw.legR} armL={friendIn < 1 || friendOut > 0 ? fw.armL : [45, -70]} armR={[12, 0]} mouth={lit > 0.5 ? "o" : "flat"} lookY={10} />
      {friendOut < 0.3 ? (
        <BigPhone cx={FP.x} cy={FP.y}>
          <rect x={0} y={0} width={1080} height={1920} fill={lit > 0 ? "#cfe6f2" : "#26332b"} />
          {lit > 0 ? <path d="M300 900 L800 960 L300 1040 L380 960 Z" fill={C.cream} stroke={C.ink} strokeWidth={30} strokeLinejoin="round" /> : null}
        </BigPhone>
      ) : null}
      {send > 0 && send < 1 ? (
        <g transform={`translate(${plane.x} ${plane.y}) rotate(${-20 + 40 * send})`}>
          <path d="M-40 -10 L40 0 L-40 14 L-24 0 Z" fill={C.cream} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
        </g>
      ) : null}
    </>
  );
};

/* ---------- 06 diz v3: "Sabah koşusu… annenin sesi… Stanford 18 yıl" ---------- */

const HORIZON = 720;
// Sabah koşu pisti (perspektif): gökyüzü, alçak güneş, ağaçlar, ufka uzanan turuncu pist; şerit çizgileri akar (ileri koşu hissi)
const RunTrack: React.FC<{ f: number; speed?: number }> = ({ f, speed = 1 }) => {
  const lanes = [-3, -2, -1, 0, 1, 2, 3];
  const L = (k: number, y: number) => {
    const t = (y - HORIZON) / (1920 - HORIZON);
    return 540 + k * interpolate(t, [0, 1], [28, 300]);
  };
  return (
    <g>
      <rect x={0} y={0} width={1080} height={HORIZON} fill="#f6dcb6" />
      <rect x={0} y={HORIZON - 260} width={1080} height={260} fill="#f3c9a0" opacity={0.6} />
      <circle cx={250} cy={HORIZON - 120} r={90} fill="#ffd27a" opacity={0.95} />
      {Array.from({ length: 12 }, (_, i) => (
        <ellipse key={i} cx={40 + i * 95} cy={HORIZON - 30 - ((i * 37) % 40)} rx={70} ry={60 + ((i * 53) % 30)} fill={i % 2 ? "#7f9a5c" : "#6e8a50"} stroke={C.ink} strokeWidth={5} />
      ))}
      <rect x={0} y={HORIZON} width={1080} height={1920 - HORIZON} fill="#9fbf74" />
      <path d={`M${L(-3.6, HORIZON)} ${HORIZON} L${L(3.6, HORIZON)} ${HORIZON} L${L(3.6, 1920)} 1920 L${L(-3.6, 1920)} 1920 Z`} fill="#d9693a" stroke={C.ink} strokeWidth={6} />
      {lanes.map((k) => (
        <path key={k} d={`M${L(k, HORIZON)} ${HORIZON} L${L(k, 1920)} 1920`} stroke="#fbf3e2" strokeWidth={6} opacity={0.85} />
      ))}
      {/* akan enine çizgiler */}
      {Array.from({ length: 6 }, (_, i) => {
        const t = (((f * 0.012 * speed + i / 6) % 1) + 1) % 1;
        const y = HORIZON + (1920 - HORIZON) * t * t;
        return <path key={i} d={`M${L(-3.6, y)} ${y} L${L(3.6, y)} ${y}`} stroke="#fbf3e2" strokeWidth={2 + 8 * t} opacity={0.35} />;
      })}
    </g>
  );
};

// Koşan avatar (önden, bize doğru): run 0..1 koşu şiddeti; hold 0..1 eğilip dizini tutar; pain kırmızı şimşek
const Runner: React.FC<{ f: number; x: number; y: number; s: number; run: number; hold?: number; pain?: number; lookY?: number; mouth?: Mouth; eyes?: Eyes }> = ({ f, x, y, s, run, hold = 0, pain = 0, lookY, mouth, eyes }) => {
  const rw = walk(f, run, 3);
  const lift = 0.8 * hold;
  const drop = hold * 92 * s; // bükülen bacaklar kısaldığı için gövde yere oturur
  const armRun = (k: number): Arm => [30 + k * 32 * Math.sin(f / 3) * run, -90 * run];
  const armHold: Arm = [8, -6];
  const armL = hold > 0.05 ? armHold : armRun(1);
  const armR = hold > 0.05 ? armHold : armRun(-1);
  const knee = { x: x + 45 * s, y: y + drop - (345 - 99 * hold - 66 * (1 - hold)) * s };
  return (
    <g>
      <Person x={x} y={y + drop - rw.bob * (1 - hold)} s={s} belly={0.4} legL={hold > 0.05 ? { lift } : rw.legL} legR={hold > 0.05 ? { lift } : rw.legR} armL={armL} armR={armR} mouth={mouth ?? (pain > 0.3 ? "worry" : "smile")} eyes={eyes ?? (pain > 0.5 ? "closed" : "open")} lookY={lookY ?? 6 * hold} blush={0.4 + 0.4 * run} />
      {pain > 0
        ? [0, 1, 2].map((i) => (
            <path key={i} d={`M${knee.x + 30 + i * 6} ${knee.y - 20 + i * 22} l34 -16 l-16 24 l34 -16`} stroke={C.red} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={pain * (0.6 + 0.4 * Math.sin(f / 2 + i))} />
          ))
        : null}
    </g>
  );
};

// "Sabah koşusu. Turuncu pistte üçüncü turdasın ve dizine bir sızı giriyor. Duruyorsun, eğilip dizini tutuyorsun."
const Diz3Pist: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const pain = tw(f, w(9) - 2, w(9) + 4);
  const slow = tw(f, w(11) - 4, w(11) + 6);
  const hold = tw(f, w(12) - 2, w(13) + 4);
  const lap = pop(f, w(4) - 2, 12) * (1 - tw(f, w(7), w(8)));
  const speed = 1 - slow;
  return (
    <CamK k={[[0, 1, 540, 1100], [w(9), 1, 540, 1100], [w(12), 1.25, 560, 1350], [w(14) + 12, 1.3, 560, 1350]]} shake={hit(f, Math.round(w(9)), 10) * 0.5}>
      <RunTrack f={f} speed={speed} />
      <Runner f={f} x={540} y={1720} s={1.0} run={1 - slow} hold={hold} pain={pain} />
      {lap > 0 ? <HandText x={820} y={900} text="3. tur" size={110} p={lap} rotate={-6} /> : null}
    </CamK>
  );
};

// Anne figürü (düşünce balonunda): parmak sallar
const Mom: React.FC<{ f: number; x: number; y: number; s: number; wag: number }> = ({ f, x, y, s, wag }) => (
  <Person x={x} y={y} s={s} female belly={0.55} shirt="#9a7bb0" armL={[12, 0]} armR={[150 + 14 * Math.sin(f / 2.5) * wag, -70]} mouth="open" eyes="open" lookY={0} />
);
// Üstü çizilen küçük simge (koşan ya da çömelen figür)
const BanIcon: React.FC<{ x: number; y: number; p: number; cross: number; squat?: boolean; f: number }> = ({ x, y, p, cross, squat, f }) =>
  p > 0 ? (
    <g transform={`translate(${x} ${y}) scale(${p})`}>
      <circle r={110} fill={C.cream} stroke={C.ink} strokeWidth={8} />
      {squat ? (
        <g transform="translate(-60 95) scale(0.42)">
          <SideSquat x={0} floor={0} d={0.9} lock={0} kneeLoad={0} hipLoad={0} />
        </g>
      ) : (
        <Person x={0} y={85} s={0.24} belly={0.4} legL={walk(f, 1, 3).legL} legR={walk(f, 1, 3).legR} armL={[40, -90]} armR={[20, -90]} mouth="smile" />
      )}
      {cross > 0 ? <Cross x={0} y={0} size={170} p={cross} /> : null}
    </g>
  ) : null;

// Anlatıcı: "Kulağında annenin sesi:" — düşünce balonunda anne belirir
const Diz3Anne: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const bubble = pop(f, w(0) - 2, 14);
  return (
    <CamK k={[[0, 1.25, 560, 1350], [w(2) + 6, 1.0, 540, 1000]]}>
      <RunTrack f={0} speed={0} />
      <Runner f={f} x={540} y={1720} s={1.0} run={0} hold={1} pain={0.5} lookY={0} mouth="worry" eyes="open" />
      <Bubble x={540} y={520} rx={330} ry={250} p={bubble} tail={[600, 980]}>
        <Mom f={f} x={540} y={720} s={0.5} wag={0} />
      </Bubble>
    </CamK>
  );
};

// Annenin kendi sesi: "Koşma, dizin biter! Çok çömelme, dizine yazık! Benim gibi mi olmak istiyorsun?"
// Parmak sallar, koşu ve çömelme simgelerinin üstü çizilir; "Benim gibi"de kendi dizini ovuşturur.
const Diz3AnneSoz: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const i1 = pop(f, w(0) - 2, 12);
  const c1 = tw(f, w(1), w(2) + 4);
  const i2 = pop(f, w(3) - 2, 12);
  const c2 = tw(f, w(5), w(6) + 4);
  const own = tw(f, w(7) - 2, w(8) + 6);
  const zoom = tw(f, w(7) - 2, w(9) + 4);
  return (
    <CamK k={[[0, 1, 540, 1000], [w(7) - 2, 1, 540, 1000], [w(9) + 4, 1.3, 540, 640]]}>
      <RunTrack f={0} speed={0} />
      <Runner f={f} x={540} y={1720} s={1.0} run={0} hold={1} pain={0.3} lookY={0} mouth="worry" eyes={zoom > 0.5 ? "wide" : "open"} />
      <Bubble x={540} y={520} rx={330} ry={250} p={1} tail={[600, 980]}>
        {own > 0.05 ? (
          <g>
            <Person x={540} y={720} s={0.5} female belly={0.6} shirt="#9a7bb0" legL={{ lift: 0.5 }} legR={{ lift: 0.5 }} armL={[10, -5]} armR={[10, -5]} mouth="worry" eyes="closed" lookY={8} />
            {[0, 1, 2].map((i) => (
              <path key={i} d={`M${560 + i * 4} ${640 + i * 12} l18 -9 l-9 13 l18 -9`} stroke={C.red} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={own * (0.6 + 0.4 * Math.sin(f / 2 + i))} />
            ))}
          </g>
        ) : (
          <Mom f={f} x={540} y={720} s={0.5} wag={1} />
        )}
      </Bubble>
      <g opacity={1 - zoom}>
        <BanIcon x={200} y={980} p={i1} cross={c1} f={f} />
        <BanIcon x={880} y={980} p={i2} cross={c2} squat f={f} />
      </g>
    </CamK>
  );
};

// Röntgen karesi (küçük diz): bad 0..1 kıkırdak kızarır, aralık daralır
const XrayTile: React.FC<{ x: number; y: number; p: number; bad?: number; label?: string }> = ({ x, y, p, bad = 0, label }) =>
  p > 0 ? (
    <g transform={`translate(${x} ${y}) scale(${p})`}>
      <rect x={-90} y={-120} width={180} height={240} rx={10} fill="#24333f" stroke={C.ink} strokeWidth={7} />
      <path d="M-45 -120 L-45 -40 Q-70 -10 -40 -4 L40 -4 Q70 -10 45 -40 L45 -120 Z" fill="#f4efe2" opacity={0.9} />
      <path d={`M-62 ${16 - 10 * bad} L62 ${16 - 10 * bad} Q66 40 38 52 L38 120 L-38 120 L-38 52 Q-66 40 -62 ${16 - 10 * bad} Z`} fill="#f4efe2" opacity={0.9} />
      <rect x={-56} y={-4} width={112} height={8} rx={4} fill={bad > 0.5 ? C.red : "#ffe9a8"} />
      <rect x={-58} y={8 - 10 * bad} width={116} height={8} rx={4} fill={bad > 0.5 ? C.red : "#ffe9a8"} />
      {label ? (
        <text x={0} y={150} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={40} fill={C.ink}>
          {label}
        </text>
      ) : null}
    </g>
  ) : null;

// Beyaz önlüklü doktor
const Doctor: React.FC<{ x: number; y: number; s: number; arm?: Arm; mouth?: Mouth; eyes?: Eyes }> = ({ x, y, s, arm = [12, 0], mouth = "flat", eyes = "open" }) => (
  <Person x={x} y={y} s={s} belly={0.3} shirt="#f4f4f0" armL={[12, 0]} armR={arm} mouth={mouth} eyes={eyes} lookY={-2} />
);

// "Bin dokuz yüz seksen dörtte Stanford'daki doktorlar da bundan emindi. Kanıtlamak için koşucuların dizlerini on sekiz yıl boyunca röntgenlediler."
const YEARS = [1984, 1986, 1996, 2002];
const Diz3Stanford: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const file = pop(f, w(8) - 2, 12);
  const board = pop(f, w(10) - 2, 12);
  const yrsT = tw(f, w(14) - 2, w(18) + 4);
  const yi = Math.min(3, Math.floor(yrsT * 4));
  return (
    <>
      <Gym o={0.25} />
      <HandText x={300} y={250} text="1984" size={150} p={tw(f, 0, w(4) + 4)} rotate={-4} />
      <text x={760} y={250} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={70} fill={C.ink} opacity={tw(f, w(5) - 2, w(5) + 6)}>
        Stanford
      </text>
      {/* röntgen panosu: her yılda bir kare daha */}
      {board > 0 ? (
        <g opacity={board}>
          <rect x={100} y={380} width={880} height={400} rx={16} fill="#3a4a56" stroke={C.ink} strokeWidth={9} />
          {YEARS.map((yr, i) => (
            <XrayTile key={yr} x={210 + i * 220} y={560} p={i === 0 ? board : i <= yi ? pop(f, w(14) - 2 + i * ((w(18) - w(14)) / 3), 10) : 0} label={`${yr}`} />
          ))}
        </g>
      ) : null}
      {yrsT > 0 ? (
        <text x={800} y={900} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={110} fill={C.red} transform="rotate(-3 800 900)">
          {YEARS[yi]}
        </text>
      ) : null}
      <Doctor x={260} y={PY + 240} s={0.75} arm={[150, -40]} />
      <Doctor x={480} y={PY + 260} s={0.72} />
      {file > 0 ? (
        <g transform={`translate(330 880) rotate(-5) scale(${file})`}>
          <rect x={-170} y={-60} width={340} height={120} rx={10} fill={C.cream} stroke={C.ink} strokeWidth={7} />
          <text x={0} y={18} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={50} fill={C.red}>
            dizleri bitecek
          </text>
        </g>
      ) : null}
      <Runner f={f} x={820} y={PY + 280} s={0.75} run={1} />
    </>
  );
};

// "Sonuç: koşucuların dizleri daha kötü çıkmadı. Kireçlenme, evde oturanlarda yüzde on, hobi koşucularında yüzde üç buçuk."
const Diz3Sonuc: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const verdict = pop(f, w(1) - 2, 12);
  const strike = tw(f, w(4) - 2, w(5) + 4);
  const p2 = tw(f, w(6) - 4, w(6) + 6);
  const redL = tw(f, w(9), w(10) + 4);
  const redR = tw(f, w(13), w(15) + 4);
  return (
    <>
      <Gym o={0.25} />
      <g opacity={1 - p2}>
        <rect x={290} y={380} width={500} height={460} rx={16} fill="#3a4a56" stroke={C.ink} strokeWidth={9} />
        <XrayTile x={540} y={600} p={1} bad={0} label="2002" />
        {verdict > 0 ? (
          <g transform={`translate(780 470) scale(${verdict})`}>
            <circle r={60} fill="#3f7d4f" stroke={C.ink} strokeWidth={6} />
            <path d="M-26 0 L-6 22 L28 -20" stroke="#fff" strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ) : null}
        <g transform="translate(330 880) rotate(-5)">
          <rect x={-170} y={-60} width={340} height={120} rx={10} fill={C.cream} stroke={C.ink} strokeWidth={7} />
          <text x={0} y={18} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={50} fill={C.red}>
            dizleri bitecek
          </text>
          <path d="M-160 0 L160 0" stroke={C.ink} strokeWidth={10} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - strike} />
        </g>
        <Doctor x={260} y={PY + 240} s={0.75} mouth={strike > 0.5 ? "o" : "flat"} eyes={strike > 0.5 ? "wide" : "open"} />
        <Runner f={f} x={820} y={PY + 280} s={0.75} run={1} mouth="grin" />
      </g>
      {p2 > 0 ? (
        <g opacity={p2}>
          <text x={290} y={430} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={64} fill={C.ink}>
            evde oturan
          </text>
          <Crowd ox={100} oy={520} runner={false} nRed={10} p={redL} />
          <Counter x={290} y={1170} to={10} prefix="%" p={redL} size={130} color={C.red} rotate={-4} />
          <text x={790} y={430} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={64} fill={C.ink}>
            hobi koşucusu
          </text>
          <Crowd ox={600} oy={520} runner nRed={3.5} p={redR} />
          {redR > 0 ? (
            <text x={790} y={1170} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={130} fill="#3f7d4f" transform="rotate(-4 790 1170)" opacity={Math.min(1, redR * 3)}>
              %3,5
            </text>
          ) : null}
        </g>
      ) : null}
    </>
  );
};

// "Derin squatın sağlıklı dizi bozduğu da hiç kanıtlanmadı."
const Diz3Squat: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const floor = 1380;
  const X = 420;
  const d = (1 - Math.cos((f / 24) * Math.PI * 2)) / 2;
  const glow = tw(f, w(2), w(3) + 6);
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const shin = 38 * d;
  const K = { x: X + Math.sin(rad(shin)) * 170, y: floor - 24 - Math.cos(rad(shin)) * 170 };
  const ban = pop(f, 0, 12);
  const unban = tw(f, w(5), w(7) + 6);
  return (
    <>
      <Gym o={0.4} />
      {glow > 0 ? <circle cx={K.x} cy={K.y} r={60 + 20 * Math.sin(f / 4)} fill="#6fd08c" opacity={0.35 * glow} stroke="#3f7d4f" strokeWidth={6} /> : null}
      <SideSquat x={X} floor={floor} d={d} lock={0} kneeLoad={0} hipLoad={0} bandage />
      <path d={`M60 ${floor} L1020 ${floor}`} stroke={C.ink} strokeWidth={6} />
      {/* annenin yasağı: "çok çömelme!" — silinir */}
      <g opacity={ban * (1 - unban)}>
        <Bubble x={760} y={520} rx={240} ry={170} p={ban} tail={[700, 760]}>
          <Mom f={f} x={680} y={660} s={0.36} wag={1} />
          <text x={850} y={500} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={52} fill={C.red}>
            çömelme!
          </text>
        </Bubble>
      </g>
      {glow > 0.5 ? <HandText x={760} y={1560} text="sağlıklı diz" size={80} p={tw(f, w(2), w(3) + 8)} color="#3f7d4f" rotate={-3} /> : null}
    </>
  );
};

// Saç rengi yıllarla ağarır (koyu → gri)
const grayHair = (t: number) => {
  const a = [0x4a, 0x33, 0x28];
  const b = [0xb9, 0xb4, 0xad];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(" ")})`;
};
const STAN_TILES = [1984, 1990, 1996, 2002];
// Pistte üç koşucu (Stanford grubu); yıllar geçtikçe saçları ağarır
const StanfordRunners: React.FC<{ f: number; gray: number; face?: "smile" | "grin" }> = ({ f, gray, face = "smile" }) => {
  const { ph } = runIntegral(f, () => 1);
  return (
    <>
      {[0, 1, 2].map((k) => (
        <SideRunner key={k} f={f} x={240 + k * 300} y={TRACK_Y + (k % 2) * 30} s={0.78} pose={runPose(ph + k * 1.7, 1)} face={face} hair={grayHair(gray)} />
      ))}
    </>
  );
};
const XrayBoard: React.FC<{ f: number; p: number; at: (i: number) => number; check?: number }> = ({ f, p, at, check = 0 }) =>
  p > 0 ? (
    <g opacity={p}>
      <rect x={70} y={420} width={940} height={360} rx={16} fill="#3a4a56" stroke={C.ink} strokeWidth={9} />
      {STAN_TILES.map((yr, i) => (
        <XrayTile key={yr} x={185 + i * 237} y={600} p={pop(f, at(i), 10)} label={`${yr}`} />
      ))}
      {check > 0 ? (
        <g transform={`translate(960 440) scale(${check})`}>
          <circle r={64} fill="#3f7d4f" stroke={C.ink} strokeWidth={6} />
          <path d="M-28 0 L-6 24 L30 -22" stroke="#fff" strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : null}
    </g>
  ) : null;
const BiteSign: React.FC<{ p: number; strike?: number }> = ({ p, strike = 0 }) =>
  p > 0 ? (
    <g transform={`translate(540 960) rotate(-4) scale(${p})`}>
      <rect x={-230} y={-66} width={460} height={132} rx={12} fill={C.cream} stroke={C.ink} strokeWidth={7} />
      <text x={0} y={20} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={64} fill={C.red}>
        dizleri aşınacak
      </text>
      {strike > 0 ? <path d="M-210 0 L210 0" stroke={C.ink} strokeWidth={12} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - strike} /> : null}
    </g>
  ) : null;

// "1984'te Stanford'daki doktorlar da bundan emindi. Kanıtlamak için koşucuların dizlerini 18 yıl röntgenlediler."
// Aynı turuncu pistte koşucular; tabela "dizleri bitecek"; yıl sayacı 1984 → 2002 akar, röntgenler birer birer
// asılır (hepsi temiz), koşucuların saçı ağarır.
const Diz4Stanford: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const t0 = w(12);
  const t1 = Math.max(t0 + 24, d - 8);
  const yrsT = tw(f, t0, t1);
  const year = Math.round(1984 + 18 * yrsT);
  const at = (i: number) => (i === 0 ? t0 - 4 : t0 + ((t1 - t0) * (STAN_TILES[i] - 1984)) / 18);
  const sign = pop(f, w(6) - 2, 12) * (1 - tw(f, w(12) - 6, w(12) + 2));
  const board = tw(f, t0 - 8, t0);
  const { off } = runIntegral(f, () => 1);
  return (
    <CamK k={[[0, 1, 540, 1000], [t0, 1, 540, 1000], [d, 1.04, 540, 980]]}>
      <SideTrack off={off} />
      <StanfordRunners f={f} gray={yrsT * 0.9} />
      {yrsT <= 0 ? (
        <>
          <HandText x={300} y={260} text="1984" size={150} p={tw(f, 0, w(4) + 4)} rotate={-4} />
          <text x={760} y={260} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={76} fill={C.ink} opacity={tw(f, w(5) - 2, w(5) + 6)}>
            Stanford
          </text>
        </>
      ) : (
        <text x={540} y={300} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={170} fill={C.red} transform="rotate(-3 540 300)">
          {year}
        </text>
      )}
      <BiteSign p={sign} />
      <XrayBoard f={f} p={board} at={at} />
    </CamK>
  );
};

// "Sonuç: koşucuların dizleri daha kötü çıkmadı. Kireçlenme, evde oturanlarda yüzde on, hobi koşucularında yüzde üç buçuk."
const Diz4Sonuc: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const verdict = pop(f, w(1) - 2, 12);
  const strike = tw(f, w(4) - 2, w(5) + 4);
  const p2 = tw(f, w(6) - 4, w(6) + 6);
  const redL = tw(f, w(9), w(10) + 4);
  const redR = tw(f, w(13), w(15) + 4);
  const { off } = runIntegral(f, () => 1);
  return (
    <>
      <g opacity={1 - p2}>
        <SideTrack off={off} />
        <StanfordRunners f={f} gray={0.9} face={strike > 0.5 ? "grin" : "smile"} />
        <text x={540} y={300} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={170} fill={C.red} transform="rotate(-3 540 300)">
          2002
        </text>
        <XrayBoard f={f + 400} p={1} at={() => 0} check={verdict} />
        <BiteSign p={1} strike={strike} />
      </g>
      {p2 > 0 ? (
        <g opacity={p2}>
          <text x={290} y={430} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={64} fill={C.ink}>
            evde oturan
          </text>
          <Crowd ox={100} oy={520} runner={false} nRed={10} p={redL} />
          <Counter x={290} y={1170} to={10} prefix="%" p={redL} size={130} color={C.red} rotate={-4} />
          <text x={790} y={430} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={64} fill={C.ink}>
            hobi koşucusu
          </text>
          <Crowd ox={600} oy={520} runner nRed={3.5} p={redR} />
          {redR > 0 ? (
            <text x={790} y={1170} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={130} fill="#3f7d4f" transform="rotate(-4 790 1170)" opacity={Math.min(1, redR * 3)}>
              %3,5
            </text>
          ) : null}
        </g>
      ) : null}
    </>
  );
};

// "O sızı çoğu zaman yükü birden artırmaktan gelir. Dizin bitmiyor, dozunu bekliyor."
const Diz3Doz: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const row1 = [2, 2, 2, 10];
  const row2 = [2, 3, 4, 5];
  const r1 = (i: number) => pop(f, w(3) + i * 5, 10);
  const spike = tw(f, w(5) - 2, w(6) + 4);
  const r2on = tw(f, w(9) - 2, w(9) + 6);
  const pain = spike * (1 - tw(f, w(8), w(9)));
  const card = (x: number, y: number, v: number, p: number, red: boolean) =>
    p > 0 ? (
      <g key={`${x}${y}`} transform={`translate(${x} ${y}) scale(${p * (red ? 1 + 0.25 * spike : 1)})`}>
        <rect x={-85} y={-55} width={170} height={110} rx={14} fill={red ? C.red : C.cream} stroke={C.ink} strokeWidth={6} />
        <text x={0} y={18} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={56} fill={red ? C.cream : C.ink}>
          {v} km
        </text>
      </g>
    ) : null;
  return (
    <>
      <RunTrack f={f} speed={0.8} />
      <Runner f={f} x={540} y={1780} s={0.85} run={1} pain={pain} />
      <g opacity={1 - r2on * 0.75}>{row1.map((v, i) => card(165 + i * 250, 300, v, r1(i), i === 3))}</g>
      <g opacity={r2on}>
        {row2.map((v, i) => card(165 + i * 250, 470, v, pop(f, w(9) + i * 4, 10), false))}
        <HandText x={540} y={620} text="dozunda" size={90} p={tw(f, w(10), w(11) + 6)} color="#3f7d4f" rotate={-3} />
      </g>
    </>
  );
};

// "Peki sen yarın o piste dönecek misin?" — avatar pistte durur, bize bakar; sonda yeniden koşmaya başlar (= açılış karesi)
const Diz3Soru: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const q = pop(f, w(5) - 2, 12) * (1 - tw(f, d - 18, d - 8));
  const run = tw(f, d - 16, d - 4);
  return (
    <CamK k={[[0, 1.15, 540, 1300], [w(4), 1.15, 540, 1300], [d - 14, 1, 540, 1100]]}>
      <RunTrack f={f} speed={run} />
      <Runner f={f} x={540} y={1720} s={1.0} run={run} lookY={0} mouth={run > 0.5 ? "smile" : "grin"} />
      {q > 0 ? <HandText x={540} y={850} text="?" size={240} p={q} color={C.red} rotate={8} /> : null}
    </CamK>
  );
};

/* ---------- Yandan (profil) avatar: koşu, eğilip dizini tutma, yere oturma ---------- */

type P2 = { x: number; y: number };
const deg = (a: number) => (a * Math.PI) / 180;
const add = (p: P2, len: number, a: number): P2 => ({ x: p.x + Math.sin(deg(a)) * len, y: p.y + Math.cos(deg(a)) * len }); // a: aşağı dikeyden, + = ileri (sağa)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// İki kemikli ters kinematik: omuzdan hedefe, dirsek aşağı-arkaya bükülür
const ik2 = (S: P2, T: P2, l1: number, l2: number): [P2, P2] => {
  const dx = T.x - S.x;
  const dy = T.y - S.y;
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 1);
  const base = Math.atan2(dy, dx);
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const ang = base + a;
  const E = { x: S.x + Math.cos(ang) * l1, y: S.y + Math.sin(ang) * l1 };
  const H = { x: S.x + Math.cos(base) * d, y: S.y + Math.sin(base) * d };
  return [E, H];
};

type LegPose = { a: number; k: number }; // a: uyluk açısı, k: diz bükümü
type SidePose = { hipY: number; lean: number; back: LegPose; front: LegPose; armB: [number, number]; armF: [number, number] };
const L_T = 175;
const L_S = 175;
const T_LEN = 240;

const runPose = (t: number, amp: number): SidePose => {
  const leg = (ph: number): LegPose => ({ a: 32 * Math.sin(ph) * amp, k: (25 + 55 * Math.max(0, Math.sin(ph - 1.4))) * amp + 6 });
  const bob = Math.abs(Math.cos(t)) * 18 * amp;
  return {
    hipY: -362 + 14 * amp - bob,
    lean: 12 * amp,
    front: leg(t),
    back: leg(t + Math.PI),
    armF: [-40 * Math.sin(t) * amp, 105 * amp + 10],
    armB: [40 * Math.sin(t) * amp, 105 * amp + 10],
  };
};
const bendPose: SidePose = { hipY: -300, lean: 58, front: { a: 22, k: 48 }, back: { a: -8, k: 30 }, armF: [0, 0], armB: [0, 0] };
const sitPose: SidePose = { hipY: -58, lean: 14, front: { a: 150, k: 142 }, back: { a: 88, k: 4 }, armF: [0, 0], armB: [0, 0] };
const mixPose = (p: SidePose, q: SidePose, t: number): SidePose => ({
  hipY: lerp(p.hipY, q.hipY, t),
  lean: lerp(p.lean, q.lean, t),
  front: { a: lerp(p.front.a, q.front.a, t), k: lerp(p.front.k, q.front.k, t) },
  back: { a: lerp(p.back.a, q.back.a, t), k: lerp(p.back.k, q.back.k, t) },
  armF: [lerp(p.armF[0], q.armF[0], t), lerp(p.armF[1], q.armF[1], t)],
  armB: [lerp(p.armB[0], q.armB[0], t), lerp(p.armB[1], q.armB[1], t)],
});

// face: "smile" | "pain" | "worry" | "grin"; reach: 0..1 eller ön dize gider (eğilme/oturma)
const SideRunner: React.FC<{ x: number; y: number; s: number; pose: SidePose; reach?: number; face?: "smile" | "pain" | "worry" | "grin"; painGlow?: number; f: number; look?: number; bandage?: boolean; shirt?: string; female?: boolean; hair?: string; sweat?: boolean; suit?: string }> = ({
  x,
  y,
  s,
  pose,
  reach = 0,
  face = "smile",
  painGlow = 0,
  f,
  look = 0,
  bandage = false,
  shirt = C.shirt,
  female = false,
  hair = C.hair,
  sweat = false,
  suit,
}) => {
  if (suit) shirt = suit;
  const H: P2 = { x: 0, y: pose.hipY };
  const legPts = (lp: LegPose) => {
    const K = add(H, L_T, lp.a);
    const A = add(K, L_S, lp.a - lp.k);
    return { K, A };
  };
  const fl = legPts(pose.front);
  const bl = legPts(pose.back);
  const up = { x: Math.sin(deg(pose.lean)), y: -Math.cos(deg(pose.lean)) };
  const S: P2 = { x: H.x + up.x * T_LEN, y: H.y + up.y * T_LEN };
  const Hd: P2 = { x: S.x + up.x * 92 + 6, y: S.y + up.y * 92 };
  const armPts = (ar: [number, number], side: number): [P2, P2] => {
    if (reach > 0.02) {
      const target = { x: fl.K.x + 10 * side, y: fl.K.y - 10 };
      const [E, Hn] = ik2({ x: S.x + 4 * side, y: S.y + 10 }, target, 140, 135);
      const E0 = add(S, 140, ar[0]);
      const H0 = add(E0, 135, ar[0] + ar[1]);
      return [
        { x: lerp(E0.x, E.x, reach), y: lerp(E0.y, E.y, reach) },
        { x: lerp(H0.x, Hn.x, reach), y: lerp(H0.y, Hn.y, reach) },
      ];
    }
    const E = add(S, 140, ar[0]);
    return [E, add(E, 135, ar[0] + ar[1])];
  };
  const [eB, hB] = armPts(pose.armB, -1);
  const [eF, hF] = armPts(pose.armF, 1);
  const seg = (a: P2, b: P2, w: number, col: string) => (
    <>
      <path d={`M${a.x} ${a.y} L${b.x} ${b.y}`} stroke={C.ink} strokeWidth={w + 11} strokeLinecap="round" />
      <path d={`M${a.x} ${a.y} L${b.x} ${b.y}`} stroke={col} strokeWidth={w} strokeLinecap="round" />
    </>
  );
  const leg = (l: { K: P2; A: P2 }, shade: number) => {
    const footAng = Math.atan2(l.A.y - l.K.y, l.A.x - l.K.x) - Math.PI / 2;
    const toe = { x: l.A.x + Math.cos(footAng) * 62, y: l.A.y + Math.sin(footAng) * 62 };
    return (
      <g opacity={shade}>
        {seg(H, l.K, 50, suit ?? C.shorts)}
        {seg(l.K, l.A, 32, suit ?? C.skin)}
        {seg(l.A, toe, 26, "#e8e3d8")}
      </g>
    );
  };
  const arm = (e: P2, h: P2, shade: number) => (
    <g opacity={shade}>
      {seg(S, e, 34, shirt)}
      {seg(e, h, 24, suit ?? C.skin)}
    </g>
  );
  const torso = (() => {
    const n = { x: -up.y, y: up.x }; // ileri normal
    const mid = { x: (H.x + S.x) / 2, y: (H.y + S.y) / 2 };
    const belly = { x: mid.x + n.x * 78, y: mid.y + n.y * 78 };
    const backP = { x: mid.x - n.x * 58, y: mid.y - n.y * 58 };
    const p = (q: P2) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
    const sF = { x: S.x + n.x * 40, y: S.y + n.y * 40 };
    const sB = { x: S.x - n.x * 44, y: S.y - n.y * 44 };
    const hF = { x: H.x + n.x * 52, y: H.y + n.y * 52 };
    const hB = { x: H.x - n.x * 50, y: H.y - n.y * 50 };
    return `M${p(sB)} Q${p(backP)} ${p(hB)} L${p(hF)} Q${p(belly)} ${p(sF)} Z`;
  })();
  const pain = face === "pain";
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={20} cy={4} rx={150} ry={18} fill={C.ink} opacity={0.12} />
      {leg(bl, 1)}
      {arm(eB, hB, 1)}
      <path d={torso} fill={shirt} stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
      {/* baş: profil, sağa bakar */}
      <g transform={`rotate(${pose.lean * 0.4 + look} ${Hd.x} ${Hd.y})`}>
        {female ? (
          // at kuyruğu: başın arkasında
          <g transform={`rotate(${Math.sin(f / 9) * 6} ${Hd.x - 50} ${Hd.y - 40})`}>
            <path d={`M${Hd.x - 50} ${Hd.y - 52} C${Hd.x - 120} ${Hd.y - 44} ${Hd.x - 130} ${Hd.y + 30} ${Hd.x - 104} ${Hd.y + 80} C${Hd.x - 96} ${Hd.y + 40} ${Hd.x - 80} ${Hd.y} ${Hd.x - 44} ${Hd.y - 18} Z`} fill={hair} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
            <circle cx={Hd.x - 56} cy={Hd.y - 42} r={11} fill={C.red} stroke={C.ink} strokeWidth={4} />
          </g>
        ) : null}
        <circle cx={Hd.x} cy={Hd.y} r={66} fill={C.skin} stroke={C.ink} strokeWidth={8} />
        <path d={`M${Hd.x - 66} ${Hd.y + 6} Q${Hd.x - 72} ${Hd.y - 70} ${Hd.x + 6} ${Hd.y - 70} Q${Hd.x + 56} ${Hd.y - 66} ${Hd.x + 58} ${Hd.y - 34} Q${Hd.x + 10} ${Hd.y - 44} ${Hd.x - 14} ${Hd.y - 20} Q${Hd.x - 30} ${Hd.y + 10} ${Hd.x - 66} ${Hd.y + 6} Z`} fill={hair} stroke={C.ink} strokeWidth={6} />
        <ellipse cx={Hd.x - 14} cy={Hd.y + 4} rx={14} ry={18} fill={C.skin} stroke={C.ink} strokeWidth={5} />
        <path d={`M${Hd.x + 64} ${Hd.y - 4} Q${Hd.x + 82} ${Hd.y + 10} ${Hd.x + 62} ${Hd.y + 18}`} fill={C.skin} stroke={C.ink} strokeWidth={6} />
        {pain ? (
          <>
            <path d={`M${Hd.x + 24} ${Hd.y - 12} L${Hd.x + 42} ${Hd.y - 4} L${Hd.x + 24} ${Hd.y + 2}`} stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
            <path d={`M${Hd.x + 18} ${Hd.y - 28} L${Hd.x + 46} ${Hd.y - 20}`} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
            <path d={`M${Hd.x + 26} ${Hd.y + 34} L${Hd.x + 36} ${Hd.y + 28} L${Hd.x + 46} ${Hd.y + 36} L${Hd.x + 56} ${Hd.y + 30}`} stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <>
            <circle cx={Hd.x + 34} cy={Hd.y - 6} r={7} fill={C.ink} />
            <path d={`M${Hd.x + 20} ${Hd.y - 26} Q${Hd.x + 34} ${Hd.y - (face === "worry" ? 20 : 32)} ${Hd.x + 48} ${Hd.y - 26}`} stroke={C.ink} strokeWidth={5} fill="none" strokeLinecap="round" />
            {face === "worry" ? (
              <path d={`M${Hd.x + 30} ${Hd.y + 36} Q${Hd.x + 42} ${Hd.y + 28} ${Hd.x + 54} ${Hd.y + 36}`} stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
            ) : (
              <path d={`M${Hd.x + 28} ${Hd.y + 28} Q${Hd.x + 44} ${Hd.y + (face === "grin" ? 46 : 40)} ${Hd.x + 58} ${Hd.y + 26}`} stroke={C.ink} strokeWidth={6} fill={face === "grin" ? "#fff" : "none"} strokeLinecap="round" />
            )}
          </>
        )}
        <circle cx={Hd.x + 30} cy={Hd.y + 18} r={13} fill="#e98a7a" opacity={0.45} />
      </g>
      {painGlow > 0 ? <circle cx={fl.K.x + 6} cy={fl.K.y} r={40 + 22 * Math.sin(f / 3)} fill={C.red} opacity={0.28 * painGlow} /> : null}
      {leg(fl, 1)}
      {bandage ? <KneeBandage x={fl.K.x} y={fl.K.y} a={(Math.atan2(fl.A.y - fl.K.y, fl.A.x - fl.K.x) * 180) / Math.PI} w={40} /> : null}
      {arm(eF, hF, 1)}
      {/* ter damlaları: ağrıda */}
      {pain || sweat ? [0, 1].map((i) => <Drop key={i} x={Hd.x - 40 - i * 30} y={Hd.y - 50 + ((f * 3 + i * 40) % 80)} s={0.7} o={0.8} />) : null}
    </g>
  );
};

// Yandan koşu pisti: gökyüzü, güneş, ağaçlar, turuncu pist; off: kaydırma (koşu hissi)
const SideTrack: React.FC<{ off: number; wide?: boolean }> = ({ off, wide = false }) => {
  const g = 1440; // pistin üst kenarı
  // wide: uzak plan için pist her yöne uzar, ağaçların ardında tribün ve ışık direkleri görünür
  const X0 = wide ? -2400 : 0;
  const W = wide ? 5880 : 1080;
  const span = wide ? 5400 : 2160;
  const nTrees = wide ? 30 : 12;
  const trees = (k: number) => ((k * 180 - off * 0.35) % span + span) % span - 300 + (wide ? -2000 : 0);
  const dashSpan = wide ? 5280 : 1320;
  const dash = (k: number) => ((k * 220 - off) % dashSpan + dashSpan) % dashSpan - 200 + (wide ? -2000 : 0);
  return (
    <g>
      <rect x={X0} y={wide ? -2600 : 0} width={W} height={wide ? g + 2600 : g} fill="#f6dcb6" />
      <rect x={X0} y={g - 520} width={W} height={520} fill="#f3c9a0" opacity={0.6} />
      <circle cx={780} cy={g - 520} r={110} fill="#ffd27a" />
      {wide ? (
        <g>
          {/* uzakta karlı dağlar */}
          {[
            [-1900, 1300], [-900, 1550], [200, 1250], [1300, 1650], [2400, 1350],
          ].map(([x, h], i) => (
            <g key={i}>
              <path d={`M${x - h * 0.8} ${g - 60} L${x} ${g - 60 - h} L${x + h * 0.8} ${g - 60} Z`} fill={i % 2 ? "#8f9fb0" : "#a3b1bf"} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
              <path d={`M${x - h * 0.18} ${g - 60 - h * 0.78} L${x} ${g - 60 - h} L${x + h * 0.18} ${g - 60 - h * 0.78} L${x + h * 0.06} ${g - 60 - h * 0.72} L${x - h * 0.05} ${g - 60 - h * 0.8} Z`} fill="#fbf7ef" stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
            </g>
          ))}
          {/* dağ eteğinde orman: sık, koyu çam ağaçları */}
          {Array.from({ length: 70 }, (_, k) => {
            const x = -2400 + k * 84 + ((k * 37) % 40);
            const h = 170 + ((k * 53) % 90);
            return <path key={k} d={`M${x - h * 0.32} ${g - 70} L${x} ${g - 70 - h} L${x + h * 0.32} ${g - 70} Z`} fill={k % 3 ? "#4f6b45" : "#5d7a4f"} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />;
          })}
        </g>
      ) : null}
      {Array.from({ length: nTrees }, (_, k) => (
        <g key={k} transform={`translate(${trees(k)} ${g - 90})`}>
          <rect x={-14} y={-40} width={28} height={130} fill="#8a5c35" stroke={C.ink} strokeWidth={5} />
          <ellipse cx={0} cy={-120} rx={95} ry={110} fill={k % 2 ? "#7f9a5c" : "#6e8a50"} stroke={C.ink} strokeWidth={6} />
        </g>
      ))}
      <rect x={X0} y={g - 20} width={W} height={60} fill="#9fbf74" />
      <rect x={X0} y={g + 30} width={W} height={380} fill="#d9693a" stroke={C.ink} strokeWidth={6} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${X0} ${g + 120 + i * 110} L${X0 + W} ${g + 120 + i * 110}`} stroke="#fbf3e2" strokeWidth={6} opacity={0.8} />
      ))}
      {Array.from({ length: wide ? 24 : 6 }, (_, k) => (
        <path key={k} d={`M${dash(k)} ${g + 70} l60 0`} stroke="#fbf3e2" strokeWidth={8} opacity={0.6} />
      ))}
      <rect x={X0} y={g + 410} width={W} height={wide ? 2600 : 200} fill="#9fbf74" />
    </g>
  );
};
const TRACK_Y = 1640; // koşucunun ayak hizası

// Koşu hızına göre (0..1) birikmiş adım fazı ve kaydırma (kareden kareye toplanır: hız değişse de akış kesintisiz)
const runIntegral = (f: number, speedAt: (i: number) => number) => {
  let off = 0;
  let ph = 0;
  for (let i = 0; i < f; i++) {
    const v = speedAt(i);
    off += 17 * v;
    ph += 0.36 * Math.max(0.35, v) * (v > 0.02 ? 1 : 0);
  }
  return { off, ph };
};

// Kanca (intro sesi): "Koşarken dizin hiç sızladı mı?" → "Hani bir anda yürüyemeyecek gibi olursun… Eğilip dizini tutarsın, yere oturursun."
// Uzak planda zorlanarak koşu; dizin içi küçük röntgen merceğinde canlı görünür (her adımda kıkırdak ezilir, giderek kızarır);
// bitiş çizgisi geçilince kanca tabelası → "3. TUR"; "anda"da ağır çekim, parlama, dize yakınlaşma + büyük röntgen → eğilir, oturur.
const Diz4Pist: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const hitAt = w(2);
  const speedAt = (i: number) =>
    i < hitAt - 12 ? 1 : i < hitAt ? 0.4 : interpolate(i, [hitAt, w(5)], [0.45, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { off, ph } = runIntegral(f, speedAt);
  const amp = Math.min(1, speedAt(f));
  const limp = f >= hitAt && f < w(6) ? Math.max(0, Math.sin(ph * 2)) * 0.5 * amp : 0;
  const bend = tw(f, w(6) - 4, w(7) + 4);
  const sit = tw(f, w(9) - 4, w(10) + 8);
  const pose = mixPose(mixPose(runPose(ph, amp), bendPose, bend), sitPose, sit);
  pose.lean += limp * 12;
  const pain = f >= hitAt;
  const xr = pop(f, hitAt, 8) * (1 - tw(f, hitAt + 30, hitAt + 38));
  const kneeAt = (p: SidePose) => ({ x: 420 + Math.sin(deg(p.front.a)) * L_T * 1.45, y: TRACK_Y + (p.hipY + Math.cos(deg(p.front.a)) * L_T) * 1.45 });
  const hitK = kneeAt(runPose(runIntegral(hitAt, speedAt).ph, speedAt(hitAt)));
  const flash = hit(f, hitAt, 6);
  const glow = tw(f, hitAt, hitAt + 6);
  const crossF = Math.max(15, hitAt - 40);
  const lapN = f < crossF ? 2 : 3;
  // kanca boyunca üstte "DİZİN HİÇ SIZLADI MI?" tabelası; kanca bitince yerini kırmızı "3. TUR"a bırakır
  const banner = pop(f, 0, 10) * (1 - tw(f, w(0) - 6, w(0)));
  const lapP = (lapN === 2 || f < w(0) ? 0 : pop(f, Math.max(crossF, w(0)), 10)) * (1 - tw(f, w(2) + 4, w(3) + 4));
  const lineX = 420 + 17 * (crossF - f);
  const cam: [number, number, number, number][] = [
    // uzak plan (pist + orman + dağlar) → sızıdan az önce bir kademe yakın → "anda"da dize
    [0, 0.58, 540, 1000],
    [hitAt - 30, 0.64, 540, 1030],
    [hitAt - 22, 0.9, 520, 1250],
    [hitAt - 1, 0.95, 520, 1260],
    [hitAt + 2, 1.75, hitK.x, hitK.y],
    [hitAt + 32, 1.75, hitK.x, hitK.y],
    [hitAt + 46, 1.12, 520, 1300],
    [w(8), 1.12, 520, 1300],
    [w(10) + 10, 1.22, 520, 1420],
  ];
  // canlı röntgen: dizi ekranda izler; her adım vuruşunda kıkırdak ezilir, sızıya yaklaştıkça kızarır
  const [cs, ccx, ccy] = camAt(cam, f);
  const k = kneeAt(pose);
  const ks = { x: ccx + (k.x - ccx) * cs, y: ccy + (k.y - ccy) * cs };
  const strike = Math.pow(Math.max(0, Math.sin(ph * 2)), 6) * amp;
  const heat = tw(f, 0, hitAt);
  const live = 1 - tw(f, hitAt - 2, hitAt + 2);
  const lx = Math.min(925, ks.x + 380);
  const ly = Math.max(560, ks.y - 230);
  return (
    <>
      <CamK k={cam} shake={hit(f, Math.round(hitAt), 10) * 0.6}>
        <SideTrack off={off} wide />
        {lineX > -1400 && lineX < 2400 ? (
          <g>
            {Array.from({ length: 19 }, (_, r) =>
              [0, 1].map((c) => <rect key={`${r}${c}`} x={lineX - 20 + c * 20} y={1470 + r * 20} width={20} height={20} fill={(r + c) % 2 ? C.ink : C.cream} />),
            )}
          </g>
        ) : null}
        <SideRunner f={f} x={420} y={TRACK_Y} s={1.45} pose={pose} reach={Math.max(bend, sit)} face={pain ? "pain" : "worry"} painGlow={Math.max(glow, 0.5 * heat * strike)} sweat />
      </CamK>
      {live > 0 ? (
        <g opacity={live}>
          <path d={`M${ks.x} ${ks.y} L${lx} ${ly}`} stroke={C.ink} strokeWidth={7} strokeDasharray="16 12" />
          <circle cx={ks.x} cy={ks.y} r={40 * cs} fill="none" stroke={C.ink} strokeWidth={7} />
          <g transform={`translate(${lx} ${ly}) scale(${0.62 * (1 + 0.04 * strike)}) translate(${-lx} ${-ly})`}>
            <KneeLens x={lx} y={ly} r={230} press={0.2 + 0.8 * strike} wet={1 - 0.5 * heat} crack={heat * heat} />
            <circle cx={lx} cy={ly} r={60 + 70 * strike} fill={C.red} opacity={(0.1 + 0.35 * strike) * heat} />
          </g>
        </g>
      ) : null}
      {xr > 0 ? (
        <g>
          <rect x={-200} y={-200} width={1480} height={2400} fill={C.ink} opacity={0.4 * xr} />
          <path d={`M${hitK.x} ${hitK.y} L760 1000`} stroke={C.cream} strokeWidth={8} strokeDasharray="18 14" opacity={xr} />
          <circle cx={hitK.x} cy={hitK.y} r={90} fill="none" stroke={C.cream} strokeWidth={8} opacity={xr} />
          <g transform={`translate(760 780) scale(${xr}) translate(-760 -780)`}>
            <KneeLens x={760} y={780} r={220} press={1} crack={1} />
            <circle cx={760} cy={780} r={(90 + 20 * Math.sin(f / 2)) * xr} fill={C.red} opacity={0.35} />
          </g>
        </g>
      ) : null}
      {banner > 0 ? (
        <g transform={`translate(540 300) scale(${banner}) rotate(-3)`}>
          <rect x={-480} y={-95} width={960} height={170} rx={22} fill={C.red} stroke={C.ink} strokeWidth={9} />
          <text x={0} y={22} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={72} fill={C.cream}>
            DİZİN HİÇ SIZLADI MI?
          </text>
        </g>
      ) : null}
      {lapP > 0 ? (
        <g transform={`translate(540 300) scale(${lapP}) rotate(-5)`}>
          <rect x={-200} y={-80} width={400} height={150} rx={20} fill={lapN === 3 ? C.red : C.cream} stroke={C.ink} strokeWidth={8} />
          <text x={0} y={30} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={100} fill={lapN === 3 ? C.cream : C.ink}>
            {lapN}. TUR
          </text>
        </g>
      ) : null}
      {flash > 0 ? <rect x={0} y={0} width={1080} height={1920} fill="#fff" opacity={0.7 * flash} /> : null}
    </>
  );
};

// KANCA (ilk kare): "Koşarken dizin her adımda biraz daha aşınıyor mu?"
// Pistte koşan avatarın dizi röntgen merceğinde; her adım vuruşunda kıkırdak ezilir, incelir, kızarır; üstte başlık.
const Diz5Hook: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const { off, ph } = runIntegral(f, () => 1);
  const pose = runPose(ph, 1);
  const knee = { x: 420 + Math.sin(deg(pose.front.a)) * L_T * 1.45, y: TRACK_Y + (pose.hipY + Math.cos(deg(pose.front.a)) * L_T) * 1.45 };
  const strike = Math.pow(Math.max(0, Math.sin(ph * 2)), 6);
  const wear = tw(f, 0, w(6) + 6);
  const q = pop(f, w(7) - 2, 12);
  const steps = 1200 + Math.floor(f * 47);
  return (
    <>
      <CamK k={[[0, 1.08, 520, 1300], [w(7), 1.14, 520, 1340]]}>
        <SideTrack off={off} />
        <SideRunner f={f} x={420} y={TRACK_Y} s={1.45} pose={pose} face="worry" painGlow={0.25 + 0.6 * strike * wear} sweat />
      </CamK>
      <path d={`M${knee.x} ${knee.y} L700 1000`} stroke={C.ink} strokeWidth={8} strokeDasharray="18 14" />
      <circle cx={knee.x} cy={knee.y} r={60} fill="none" stroke={C.ink} strokeWidth={8} />
      <g transform={`translate(700 780) scale(${1 + 0.03 * strike}) translate(-700 -780)`}>
        <KneeLens x={700} y={780} r={240} press={0.3 + 0.7 * strike} wet={1 - 0.75 * wear} crack={wear} />
        <circle cx={700} cy={780} r={70 + 60 * strike} fill={C.red} opacity={(0.15 + 0.3 * strike) * wear} />
      </g>
      <text x={700} y={1090} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={64} fill={C.ink}>
        {`${steps.toLocaleString("tr-TR")} adım`}
      </text>
      <g transform="translate(540 250) rotate(-3)">
        <rect x={-470} y={-95} width={940} height={170} rx={22} fill={C.red} stroke={C.ink} strokeWidth={9} />
        <text x={0} y={22} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={92} fill={C.cream}>
          KOŞU DİZİ AŞINDIRIR MI?
        </text>
      </g>
      {q > 0 ? <HandText x={960} y={560} text="?" size={260} p={q} color={C.red} rotate={10} /> : null}
    </>
  );
};

// "Bir gün pistte dizine bir sızı giriyor ve kulağında annenin sesi:"
// Koşu → "dizine"de ağır çekim, parlama, dize yakınlaşma + röntgen → eğilir, oturur → annenin balonu belirir.
const Diz5Pist: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const hitAt = w(3);
  const speedAt = (i: number) =>
    i < hitAt - 10 ? 1 : i < hitAt ? 0.4 : interpolate(i, [hitAt, w(6)], [0.45, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { off, ph } = runIntegral(f, speedAt);
  const amp = Math.min(1, speedAt(f));
  const bend = tw(f, w(5) - 4, w(6) + 4);
  const sit = tw(f, w(7) - 4, w(8) + 6);
  const pose = mixPose(mixPose(runPose(ph, amp), bendPose, bend), sitPose, sit);
  const pain = f >= hitAt;
  const xr = pop(f, hitAt, 8) * (1 - tw(f, hitAt + 24, hitAt + 32));
  const kneeAt = (p: SidePose) => ({ x: 420 + Math.sin(deg(p.front.a)) * L_T * 1.45, y: TRACK_Y + (p.hipY + Math.cos(deg(p.front.a)) * L_T) * 1.45 });
  const hitK = kneeAt(runPose(runIntegral(hitAt, speedAt).ph, speedAt(hitAt)));
  const flash = hit(f, hitAt, 6);
  const glow = tw(f, hitAt, hitAt + 6);
  const bubble = pop(f, w(9) - 2, 14);
  return (
    <>
      <CamK
        k={[
          [0, 1.14, 520, 1340],
          [hitAt - 1, 1.0, 540, 1200],
          [hitAt + 2, 1.75, hitK.x, hitK.y],
          [hitAt + 26, 1.75, hitK.x, hitK.y],
          [hitAt + 40, 1.12, 520, 1300],
          [w(8), 1.12, 520, 1300],
          [w(9) + 8, 1.0, 540, 1000],
        ]}
        shake={hit(f, Math.round(hitAt), 10) * 0.6}
      >
        <SideTrack off={off} />
        <SideRunner f={f} x={420} y={TRACK_Y} s={1.45} pose={pose} reach={Math.max(bend, sit)} face={pain ? "pain" : "worry"} painGlow={glow} sweat />
        <Bubble x={560} y={560} rx={330} ry={250} p={bubble} tail={[560, 1060]}>
          <Mom f={f} x={560} y={760} s={0.5} wag={0} />
        </Bubble>
      </CamK>
      {xr > 0 ? (
        <g>
          <rect x={-200} y={-200} width={1480} height={2400} fill={C.ink} opacity={0.4 * xr} />
          <path d={`M${hitK.x} ${hitK.y} L760 1000`} stroke={C.cream} strokeWidth={8} strokeDasharray="18 14" opacity={xr} />
          <circle cx={hitK.x} cy={hitK.y} r={90} fill="none" stroke={C.cream} strokeWidth={8} opacity={xr} />
          <g transform={`translate(760 780) scale(${xr}) translate(-760 -780)`}>
            <KneeLens x={760} y={780} r={220} press={1} wet={0.3} crack={1} />
            <circle cx={760} cy={780} r={(90 + 20 * Math.sin(f / 2)) * xr} fill={C.red} opacity={0.35} />
          </g>
        </g>
      ) : null}
      {flash > 0 ? <rect x={0} y={0} width={1080} height={1920} fill="#fff" opacity={0.7 * flash} /> : null}
    </>
  );
};

// Pistte oturup dizini tutan avatar (anne sahneleri ve kapanış için)
const SittingOnTrack: React.FC<{ f: number; face?: "pain" | "worry" | "smile" | "grin"; glow?: number }> = ({ f, face = "worry", glow = 0.15 }) => (
  <>
    <SideTrack off={0} />
    <SideRunner f={f} x={420} y={TRACK_Y} s={1.45} pose={sitPose} reach={1} face={face} painGlow={glow} />
  </>
);

// Anlatıcı: "Kulağında annenin sesi:"
const Diz4Anne: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const bubble = pop(f, w(0) - 2, 14);
  return (
    <CamK k={[[0, 1.22, 520, 1420], [w(2) + 6, 1.0, 540, 1000]]}>
      <SittingOnTrack f={f} face="pain" />
      <Bubble x={560} y={560} rx={330} ry={250} p={bubble} tail={[560, 1060]}>
        <Mom f={f} x={560} y={760} s={0.5} wag={0} />
      </Bubble>
    </CamK>
  );
};

// Annenin sesi: "Koşma, dizin biter! Çok çömelme, dizine yazık! Benim gibi mi olmak istiyorsun?"
const Diz4AnneSoz: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const i1 = pop(f, w(0) - 2, 12);
  const c1 = tw(f, w(1), w(2) + 4);
  const own = tw(f, w(3) - 2, w(4) + 6);
  const zoom = tw(f, w(3) - 2, w(5) + 4);
  return (
    <CamK k={[[0, 1, 540, 1000], [w(3) - 2, 1, 540, 1000], [w(5) + 4, 1.3, 560, 680]]}>
      <SittingOnTrack f={f} face="worry" />
      <Bubble x={560} y={560} rx={330} ry={250} p={1} tail={[560, 1060]}>
        {own > 0.05 ? (
          // yandan: eğilip iki eliyle dizini tutar, dizi kızarır
          <SideRunner f={f} x={530} y={770} s={0.5} pose={bendPose} reach={1} face="pain" painGlow={own} shirt="#9a7bb0" female />
        ) : (
          <Mom f={f} x={560} y={760} s={0.5} wag={1} />
        )}
      </Bubble>
      <g opacity={1 - zoom}>
        <BanIcon x={170} y={1000} p={i1} cross={c1} f={f} />
      </g>
    </CamK>
  );
};

// "Derin squatın sağlıklı dizi bozduğu da hiç kanıtlanmadı." — aynı pistte, bandajlı dizle derin squat;
// annenin "dizine yazık!" balonu "hiç kanıtlanmadı"da çizilip söner, avatar gülümseyerek bir tekrar daha yapar
const squatUp: SidePose = { hipY: -358, lean: 4, front: { a: 4, k: 6 }, back: { a: -2, k: 4 }, armF: [18, 0], armB: [14, 0] };
const squatDown: SidePose = { hipY: -150, lean: 40, front: { a: 100, k: 122 }, back: { a: 96, k: 118 }, armF: [86, 4], armB: [82, 4] };
const Diz5Squat: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const dep = (i: number) =>
    tw(i, w(0) - 6, w(1) + 6) * (1 - tw(i, w(4) - 2, w(5) + 4)) + tw(i, w(6) - 4, w(7) + 4) * (1 - tw(i, d - 16, d - 2));
  const t = dep(f);
  const pose = mixPose(squatUp, squatDown, t);
  // ayaklar yerinde kalsın: ön bilek hizası kadar geri kaydır
  const ankleX = Math.sin(deg(pose.front.a)) * L_T + Math.sin(deg(pose.front.a - pose.front.k)) * L_S;
  const S_ = 1.45;
  const X = 470 - ankleX * S_;
  const knee = { x: X + Math.sin(deg(pose.front.a)) * L_T * S_, y: TRACK_Y + (pose.hipY + Math.cos(deg(pose.front.a)) * L_T) * S_ };
  const glow = tw(f, w(2) - 2, w(3) + 6) * (1 - tw(f, w(6), w(7)));
  const bubble = pop(f, 0, 12) * (1 - tw(f, w(7) + 4, w(7) + 14));
  const cross = tw(f, w(6) - 2, w(7) + 2);
  const happy = f > w(6) + 4;
  return (
    <CamK k={[[0, 1, 540, 1000], [w(2), 1, 540, 1000], [w(3) + 6, 1.08, 560, 1080], [w(6), 1.08, 560, 1080], [w(7) + 10, 1, 540, 1000]]}>
      <SideTrack off={0} />
      {glow > 0 ? <circle cx={knee.x} cy={knee.y} r={(70 + 18 * Math.sin(f / 4)) * glow} fill="#6fd08c" opacity={0.4} stroke="#3f7d4f" strokeWidth={6} /> : null}
      <SideRunner f={f} x={X} y={TRACK_Y} s={S_} pose={pose} face={happy ? "grin" : "smile"} bandage />
      {glow > 0.4 ? <HandText x={Math.min(840, knee.x + 250)} y={knee.y + 60} text="sağlıklı diz" size={78} p={glow} color="#3f7d4f" rotate={-4} /> : null}
      {bubble > 0 ? (
        <g opacity={Math.min(1, bubble * 1.5)}>
          <Bubble x={810} y={440} rx={240} ry={190} p={bubble} tail={[660, 720]}>
            <Mom f={f} x={730} y={580} s={0.34} wag={happy ? 0 : 1} />
            <text x={890} y={420} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={50} fill={C.red}>
              dizine
            </text>
            <text x={890} y={476} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={50} fill={C.red}>
              yazık!
            </text>
            {cross > 0 ? <Cross x={890} y={450} size={110} p={cross} /> : null}
          </Bubble>
        </g>
      ) : null}
    </CamK>
  );
};

// "O sızı çoğu zaman yükü birden artırmaktan gelir. Dizin bitmiyor, dozunu bekliyor."
const Diz4Doz: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const row1 = [2, 2, 2, 10];
  const row2 = [2, 3, 4, 5];
  // "iki, iki, iki" → 2·2·2, "sonra bir günde on" → dev 10 km ve sızı; "her hafta biraz artırırsan" → 2·3·4·5
  const spike = tw(f, w(13) - 2, w(14) + 4);
  const r2on = tw(f, w(16) - 2, w(16) + 6);
  const painT = Math.max(spike * (1 - tw(f, w(15), w(16))), 0.5 * tw(f, w(1) - 2, w(1) + 4) * (1 - tw(f, w(3), w(4))));
  const speedAt = (i: number) => 1 - 0.55 * (tw(i, w(13) - 2, w(14) + 4) * (1 - tw(i, w(15), w(16))));
  const { off, ph } = runIntegral(f, speedAt);
  const pose = runPose(ph, speedAt(f));
  const card = (x: number, y: number, v: number, p: number, red: boolean) =>
    p > 0 ? (
      <g key={`${x}${y}`} transform={`translate(${x} ${y}) scale(${p * 1.35 * (red ? 1 + 0.35 * spike : 1)})`}>
        <rect x={-85} y={-55} width={170} height={110} rx={14} fill={red ? C.red : C.cream} stroke={C.ink} strokeWidth={6} />
        <text x={0} y={18} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={56} fill={red ? C.cream : C.ink}>
          {v} km
        </text>
      </g>
    ) : null;
  return (
    <>
      <SideTrack off={off} />
      <SideRunner f={f} x={420} y={TRACK_Y} s={1.45} pose={pose} face={painT > 0.3 ? "pain" : "smile"} painGlow={painT} bandage />
      <g opacity={1 - r2on * 0.75}>{row1.map((v, i) => card(150 + i * 260, 250, v, pop(f, i < 3 ? w(8 + i) : w(13) - 2, 10), i === 3))}</g>
      <g opacity={r2on}>
        {row2.map((v, i) => card(150 + i * 260, 430, v, pop(f, w(16) + i * 5, 10), false))}
        <HandText x={790} y={640} text="dizin alışır" size={100} p={tw(f, w(20), w(20) + 8)} color="#3f7d4f" rotate={-3} />
      </g>
    </>
  );
};

// "Peki sen yarın o piste dönecek misin?" — pistte oturan avatar; soru; sonda kalkıp koşmaya başlar (= açılış karesi)
const Diz4Soru: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const q = pop(f, w(5) - 2, 12) * (1 - tw(f, d - 22, d - 12));
  const up = tw(f, d - 22, d - 2);
  const pose = mixPose(sitPose, runPose(0, 1), up);
  return (
    <CamK k={[[0, 1.15, 520, 1300], [w(4), 1.15, 520, 1300], [d - 4, 1, 540, 1200]]}>
      <SideTrack off={0} />
      <SideRunner f={f} x={420} y={TRACK_Y} s={1.45} pose={pose} reach={1 - up} face={up > 0.5 ? "smile" : "worry"} painGlow={0} bandage />
      {q > 0 ? <HandText x={760} y={760} text="?" size={240} p={q} color={C.red} rotate={8} /> : null}
    </CamK>
  );
};

// ---------- 06 diz v6: ters köşe kanca — "hangisinin dizi daha yıpranmış?" ----------
// Bölünmüş ekran: üstte her sabah koşan 70 yaşında amca (pist), altta hiç koşmayan 45 yaşında adam (kanepe).
// lens: dizler röntgende açılır (0 = kapalı, 1 = "?" ile gizli); reveal: cevap (üst temiz + tik, alt yıpranmış).
const SplitKnees: React.FC<{ f: number; top: number; bot: number; lens: number; reveal: number }> = ({ f, top, bot, lens, reveal }) => {
  const id = svgId(useId());
  const { off, ph } = runIntegral(f, () => 0.8);
  const pose = runPose(ph, 0.8);
  const TOPY = 790; // üst panelde gösterilen dünya kaydırması
  const BOTY = 450;
  const kTop = { x: 540 + Math.sin(deg(pose.front.a)) * L_T, y: TRACK_Y + pose.hipY + Math.cos(deg(pose.front.a)) * L_T - TOPY };
  const kBot = { x: SOFA.x + 60, y: sitY - 240 + BOTY };
  const lensAt = (x: number, y: number, k: { x: number; y: number }, good: boolean) =>
    lens > 0 ? (
      <g>
        <path d={`M${k.x} ${k.y} L${x} ${y}`} stroke={C.ink} strokeWidth={7} strokeDasharray="16 12" opacity={lens} />
        <circle cx={k.x} cy={k.y} r={42} fill="none" stroke={C.ink} strokeWidth={7} opacity={lens} />
        <g transform={`translate(${x} ${y}) scale(${lens * 0.55}) translate(${-x} ${-y})`}>
          <KneeLens x={x} y={y} r={230} press={good ? 0.2 : 0.7 * reveal} wet={good ? 1 : 1 - 0.6 * reveal} crack={good ? 0 : 0.7 * reveal} />
          {reveal < 1 ? (
            <g opacity={1 - reveal}>
              <circle cx={x} cy={y} r={222} fill="#24333f" />
              <text x={x} y={y + 80} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={260} fill={C.cream}>
                ?
              </text>
            </g>
          ) : null}
          {reveal > 0 && good ? (
            <g transform={`translate(${x + 180} ${y - 180}) scale(${reveal})`}>
              <circle r={64} fill="#3f7d4f" stroke={C.ink} strokeWidth={6} />
              <path d="M-28 0 L-6 24 L30 -22" stroke="#fff" strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ) : null}
          {reveal > 0 && !good ? <circle cx={x} cy={y} r={120} fill={C.red} opacity={0.3 * reveal} /> : null}
        </g>
      </g>
    ) : null;
  const badge = (x: number, y: number, t: string) => (
    <g transform={`translate(${x} ${y}) rotate(-4)`}>
      <rect x={-130} y={-62} width={260} height={110} rx={16} fill={C.cream} stroke={C.ink} strokeWidth={7} />
      <text x={0} y={22} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={70} fill={C.ink}>
        {t}
      </text>
    </g>
  );
  return (
    <g>
      <clipPath id={`st${id}`}>
        <rect x={0} y={0} width={1080} height={955} />
      </clipPath>
      <clipPath id={`sb${id}`}>
        <rect x={0} y={965} width={1080} height={955} />
      </clipPath>
      <g clipPath={`url(#st${id})`}>
        <g transform={`translate(0 ${-TOPY})`}>
          <SideTrack off={off} />
          <SideRunner f={f} x={540} y={TRACK_Y} s={1} pose={pose} face="smile" hair={grayHair(1)} />
        </g>
        <rect x={0} y={0} width={1080} height={955} fill={C.ink} opacity={0.45 * (1 - top)} />
      </g>
      <g clipPath={`url(#sb${id})`}>
        <rect x={0} y={965} width={1080} height={955} fill="#efe0c4" />
        <g transform={`translate(0 ${BOTY})`}>
          <LivingRoom f={f} runner={false} />
          <SofaBack />
          <Person x={SOFA.x} y={sitY} s={SITS} belly={0.8} legL={{ lift: 1, spread: 10 }} legR={{ lift: 1, spread: 10 }} armL={[20, -60]} armR={[20, -60]} mouth="flat" eyes="open" />
          <SofaFront />
        </g>
        <rect x={0} y={965} width={1080} height={955} fill={C.ink} opacity={0.45 * (1 - bot)} />
      </g>
      <path d="M0 960 L1080 960" stroke={C.ink} strokeWidth={12} />
      {badge(190, 110, "70 yaş")}
      {badge(190, 1080, "45 yaş")}
      {lensAt(840, 330, kTop, true)}
      {lensAt(250, 1360, kBot, false)}
    </g>
  );
};

// KANCA: "Biri yetmiş yaşında ve her sabah koşuyor. Diğeri kırk beş yaşında, hiç koşmuyor.
// Sence hangisinin dizi daha yıpranmış?"
const Diz6Hook: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const both = tw(f, w(13) - 2, w(13) + 6);
  const top = Math.max(1 - tw(f, w(7) - 4, w(7) + 4), both);
  const bot = Math.max(tw(f, w(7) - 4, w(7) + 4), both);
  const lens = pop(f, w(15) - 2, 12);
  const q = pop(f, w(17), 12);
  return (
    <>
      <SplitKnees f={f} top={f < 2 ? 1 : top} bot={f < 2 ? 1 : bot} lens={lens} reveal={0} />
      {q > 0 ? <HandText x={540} y={960} text="?" size={300} p={q} color={C.red} rotate={8} /> : null}
    </>
  );
};

// Kapanış: "Şimdi tekrar bak: hangisinin dizi daha yıpranmış?" — bölünmüş ekran döner, röntgenler açılır
const Diz6Son: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const lens = pop(f, 0, 12) * (1 - tw(f, d - 18, d - 8));
  const reveal = tw(f, w(2), w(4) + 6);
  return <SplitKnees f={f + 200} top={1} bot={1} lens={lens} reveal={reveal} />;
};

// Annenin sesi (v6): avatar pistte koşmaya hazırlanırken balonda anne
const Diz6AnneSoz: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const bubble = pop(f, 0, 12);
  const i1 = pop(f, w(0) - 2, 12);
  const c1 = tw(f, w(1), w(2) + 4);
  const own = tw(f, w(3) - 2, w(4) + 6);
  const zoom = tw(f, w(3) - 2, w(5) + 4);
  return (
    <CamK k={[[0, 1, 540, 1000], [w(3) - 2, 1, 540, 1000], [w(5) + 4, 1.3, 600, 560]]}>
      <SideTrack off={0} />
      <SideRunner f={f} x={420} y={TRACK_Y} s={1.1} pose={squatUp} face="worry" />
      <Bubble x={600} y={430} rx={330} ry={250} p={bubble} tail={[520, 820]}>
        {own > 0.05 ? (
          <SideRunner f={f} x={570} y={640} s={0.5} pose={bendPose} reach={1} face="pain" painGlow={own} shirt="#9a7bb0" female />
        ) : (
          <Mom f={f} x={600} y={630} s={0.5} wag={1} />
        )}
      </Bubble>
      <g opacity={1 - zoom}>
        <BanIcon x={170} y={1000} p={i1} cross={c1} f={f} />
      </g>
    </CamK>
  );
};

// ---------- 06 diz v7: kanca iddia ile başlar, anne "eski inanç" olarak gelir (sızı/oturma yok) ----------
// "Koşmak dizini aşındırmıyor. Bunu kanıtlamak on sekiz yıl sürdü."
// Uzak planda koşu; yandaki röntgen merceğinde dizin içi canlı (her adımda ezilir ama sağlam kalır), "aşındırmıyor"da yeşil tik;
// "on sekiz yıl"da el yazısı "18 yıl"; kamera bir kademe yaklaşır.
const Diz7Hook: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const { off, ph } = runIntegral(f, () => 1);
  const pose = runPose(ph, 1);
  const cam: [number, number, number, number][] = [
    [0, 0.58, 540, 1000],
    [w(3) - 4, 0.62, 540, 1020],
    [w(3) + 4, 0.9, 520, 1250],
    [d, 1.0, 540, 1200],
  ];
  const [cs, ccx, ccy] = camAt(cam, f);
  const kx = 420 + Math.sin(deg(pose.front.a)) * L_T * 1.45;
  const ky = TRACK_Y + (pose.hipY + Math.cos(deg(pose.front.a)) * L_T) * 1.45;
  const ks = { x: ccx + (kx - ccx) * cs, y: ccy + (ky - ccy) * cs };
  const strike = Math.pow(Math.max(0, Math.sin(ph * 2)), 6);
  const lx = Math.min(925, ks.x + 380);
  const ly = Math.max(560, ks.y - 230);
  const ok = pop(f, w(2) - 2, 12);
  const yrs = tw(f, w(5) - 2, w(7) + 6);
  return (
    <>
      <CamK k={cam}>
        <SideTrack off={off} wide />
        <SideRunner f={f} x={420} y={TRACK_Y} s={1.45} pose={pose} face="smile" />
      </CamK>
      <path d={`M${ks.x} ${ks.y} L${lx} ${ly}`} stroke={C.ink} strokeWidth={7} strokeDasharray="16 12" />
      <circle cx={ks.x} cy={ks.y} r={40 * cs} fill="none" stroke={C.ink} strokeWidth={7} />
      <g transform={`translate(${lx} ${ly}) scale(${0.62 * (1 + 0.04 * strike)}) translate(${-lx} ${-ly})`}>
        <KneeLens x={lx} y={ly} r={230} press={0.2 + 0.8 * strike} />
        {ok > 0 ? (
          <g transform={`translate(${lx + 190} ${ly - 190}) scale(${ok})`}>
            <circle r={70} fill="#3f7d4f" stroke={C.ink} strokeWidth={7} />
            <path d="M-30 0 L-6 26 L32 -24" stroke="#fff" strokeWidth={13} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ) : null}
      </g>
      {yrs > 0 ? <HandText x={540} y={330} text="18 yıl" size={170} p={yrs} color={C.red} rotate={-5} /> : null}
    </>
  );
};

// Koşarken düşünce balonunda anne (balon p ile açılır; children yoksa anne parmak sallar)
const RunWithMom: React.FC<{ f: number; bubble: number; children?: React.ReactNode }> = ({ f, bubble, children }) => {
  const { off, ph } = runIntegral(f + 400, () => 0.8);
  return (
    <>
      <SideTrack off={off} />
      <SideRunner f={f} x={420} y={TRACK_Y} s={1.1} pose={runPose(ph, 0.8)} face="worry" />
      <Bubble x={620} y={430} rx={330} ry={250} p={bubble} tail={[520, 820]}>
        {children ?? <Mom f={f} x={620} y={630} s={0.5} wag={1} />}
      </Bubble>
    </>
  );
};
// "Ama annen hep şöyle derdi:"
const Diz7Anne: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  return (
    <CamK k={[[0, 1.0, 540, 1200], [w(2) + 6, 1.0, 540, 1000]]}>
      <RunWithMom f={f} bubble={pop(f, w(1) - 2, 14)} />
    </CamK>
  );
};
// Anne (Sibel): "Koşma, dizlerin aşınır! Benim gibi mi olmak istiyorsun?"
const Diz7AnneSoz: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const i1 = pop(f, w(0) - 2, 12);
  const c1 = tw(f, w(1), w(2) + 4);
  const own = tw(f, w(3) - 2, w(4) + 6);
  const zoom = tw(f, w(3) - 2, w(5) + 4);
  return (
    <CamK k={[[0, 1, 540, 1000], [w(3) - 2, 1, 540, 1000], [w(5) + 4, 1.3, 620, 560]]}>
      <RunWithMom f={f + 60} bubble={1}>
        {own > 0.05 ? <SideRunner f={f} x={590} y={640} s={0.5} pose={bendPose} reach={1} face="pain" painGlow={own} shirt="#9a7bb0" female /> : undefined}
      </RunWithMom>
      <g opacity={1 - zoom}>
        <BanIcon x={170} y={1000} p={i1} cross={c1} f={f} />
      </g>
    </CamK>
  );
};

/* ---------- 07 spora kaç yaşında başlanır: sahneler ---------- */
// Avatar her sahnede bir basamak büyür: 5 yaşında oyun → kendi ağırlığı → hafif dambıl → ergenlik.
// Kaynak: AAP 2020 "Resistance Training for Children and Adolescents" (Pediatrics 145(6):e20201011).

const YAS_FLOOR = 1300;
// Bu videoda avatarın tişörtü kırmızı (kullanıcı isteği)
const YAS_SHIRT = "#c94a3d";
// Doğru/yardımcı işaretler lacivert (yeşil zeminde seçilsin), yanlışlar kırmızı
const YAS_OK = "#1f4e8c";
// Yaşa göre avatar ölçeği (ön görünüş Person): 5 yaş küçük, 18 yaş tam boy
const yasScale = (age: number) => 0.5 + ((Math.max(5, Math.min(18, age)) - 5) / 13) * 0.45;

// Yandan pozun ön bilek konumu (ayaklar yerinde kalsın diye gövde buna göre kaydırılır)
const ankleOf = (p: SidePose, lp: LegPose = p.front): P2 => ({
  x: Math.sin(deg(lp.a)) * L_T + Math.sin(deg(lp.a - lp.k)) * L_S,
  y: p.hipY + Math.cos(deg(lp.a)) * L_T + Math.cos(deg(lp.a - lp.k)) * L_S,
});
const shoulderOf = (p: SidePose): P2 => ({ x: Math.sin(deg(p.lean)) * T_LEN, y: p.hipY - Math.cos(deg(p.lean)) * T_LEN });
// Omuzdan hedef ele kol açıları (SideRunner: açı aşağı dikeyden, + ileri)
const armTo = (S: P2, T: P2): [number, number] => {
  const [E, Hn] = ik2(S, T, 140, 135);
  const a1 = (Math.atan2(E.x - S.x, E.y - S.y) * 180) / Math.PI;
  const a2 = (Math.atan2(Hn.x - E.x, Hn.y - E.y) * 180) / Math.PI - a1;
  return [a1, a2];
};
// Şınav: t = 0 kollar düz (plank), 1 aşağıda. Gövde düz bir çizgi, ayak uçları ve eller yerde sabit.
const pushPose = (t: number): SidePose => {
  const BODY = L_T + L_S + T_LEN;
  const sh = lerp(275, 125, t);
  const lean = 90 - (Math.asin(sh / BODY) * 180) / Math.PI;
  const p: SidePose = { hipY: -(L_T + L_S) * Math.cos(deg(lean)), lean, front: { a: -lean, k: 0 }, back: { a: -lean + 2, k: 2 }, armF: [0, 0], armB: [0, 0] };
  const topLean = 90 - (Math.asin(275 / BODY) * 180) / Math.PI;
  const handX = -(L_T + L_S) * Math.sin(deg(lean)) + BODY * Math.cos(deg(90 - topLean));
  const S = shoulderOf(p);
  const arm = armTo(S, { x: handX, y: -6 });
  return { ...p, armF: arm, armB: arm };
};
// Ayı yürüyüşü: eller ve ayaklar yerde, kalça yukarıda, çapraz adımlar
const bearPose = (ph: number): SidePose => {
  const s = Math.sin(ph);
  const p: SidePose = { hipY: -300 + 6 * Math.abs(s), lean: 100, front: { a: 14 + 16 * s, k: 44 }, back: { a: 14 - 16 * s, k: 44 }, armF: [0, 0], armB: [0, 0] };
  const S = shoulderOf(p);
  return { ...p, armF: armTo(S, { x: S.x + 40 - 40 * s, y: -4 }), armB: armTo(S, { x: S.x + 40 + 40 * s, y: -4 }) };
};
const ARMS_UP: [number, number] = [150, 0];

// Sabit ayakla yandan çizim: pozun ön bileği X'e oturur
const SideAt: React.FC<{ f: number; X: number; floor: number; s: number; pose: SidePose; lift?: number; face?: "smile" | "pain" | "worry" | "grin"; shirt?: string; female?: boolean; anchor?: "front" | "back" }> = ({ f, X, floor, s, pose, lift = 0, face = "smile", shirt = YAS_SHIRT, female, anchor = "front" }) => {
  const a = ankleOf(pose, anchor === "front" ? pose.front : pose.back);
  return <SideRunner f={f} x={X - a.x * s} y={floor - lift} s={s} pose={pose} face={face} shirt={shirt} female={female} />;
};

// Uçlu ok: from → to, p ile çizilir
const Pointer: React.FC<{ x1: number; y1: number; x2: number; y2: number; p: number; color?: string; w?: number }> = ({ x1, y1, x2, y2, p, color = C.ink, w = 12 }) => {
  if (p <= 0) return null;
  const x = lerp(x1, x2, p);
  const y = lerp(y1, y2, p);
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = w * 3.2;
  return (
    <g stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d={`M${x1} ${y1} L${x} ${y}`} />
      <path d={`M${x - Math.cos(a - 0.5) * h} ${y - Math.sin(a - 0.5) * h} L${x} ${y} L${x - Math.cos(a + 0.5) * h} ${y - Math.sin(a + 0.5) * h}`} />
    </g>
  );
};

// Diz üstü şınav: dizler yerde, dizden omza düz çizgi; t = 0 yukarı, 1 aşağı
const kneePushPose = (t: number): SidePose => {
  const BODY = L_T + T_LEN;
  const sh = lerp(255, 120, t);
  const lean = (Math.acos(sh / BODY) * 180) / Math.PI;
  const topLean = (Math.acos(255 / BODY) * 180) / Math.PI;
  const p: SidePose = { hipY: -L_T * Math.cos(deg(lean)), lean, front: { a: -lean, k: 90 - lean }, back: { a: -lean + 2, k: 92 - lean }, armF: [0, 0], armB: [0, 0] };
  const kneeX = -L_T * Math.sin(deg(lean));
  const handX = kneeX + BODY * Math.sin(deg(topLean));
  const arm = armTo(shoulderOf(p), { x: handX, y: -6 });
  return { ...p, armF: arm, armB: arm };
};
// Dirsek plankı: dirsekler omuz altında, ön kollar yerde; dh > 0 kalça düşer, dh < 0 kalça kalkar
const PLANK_LEAN = 90 - (Math.asin(150 / (L_T + L_S + T_LEN)) * 180) / Math.PI;
const plankPose = (dh: number): SidePose => {
  const S0 = { x: T_LEN * Math.sin(deg(PLANK_LEAN)), y: -(L_T + L_S + T_LEN) * Math.cos(deg(PLANK_LEAN)) };
  const A0 = { x: -(L_T + L_S) * Math.sin(deg(PLANK_LEAN)), y: 0 };
  const hy = -(L_T + L_S) * Math.cos(deg(PLANK_LEAN)) + dh;
  const lean = (Math.atan2(S0.x, -(S0.y - hy)) * 180) / Math.PI;
  const legA = (Math.atan2(A0.x, A0.y - hy) * 180) / Math.PI;
  const p: SidePose = { hipY: hy, lean, front: { a: legA, k: 0 }, back: { a: legA + 2, k: 2 }, armF: [0, 0], armB: [0, 0] };
  const S = shoulderOf(p);
  const a1 = (Math.atan2(S0.x - S.x, -10 - S.y) * 180) / Math.PI;
  return { ...p, armF: [a1, 90 - a1], armB: [a1 - 4, 94 - a1] };
};
// Yandan pozun dünya koordinatları (SideAt ile aynı yerleşim): omuz, kalça, diz, ayak bileği, ayak ucu
const sidePts = (pose: SidePose, X: number, floor: number, s: number, lift = 0) => {
  const an = ankleOf(pose);
  const ox = X - an.x * s;
  const W = (q: P2) => ({ x: ox + q.x * s, y: floor - lift + q.y * s });
  const H = { x: 0, y: pose.hipY };
  const K = { x: Math.sin(deg(pose.front.a)) * L_T, y: pose.hipY + Math.cos(deg(pose.front.a)) * L_T };
  return { S: W(shoulderOf(pose)), H: W(H), K: W(K), A: W(an), T: W({ x: an.x + 62, y: an.y }) };
};

// Orman (yandan): uzakta karlı dağlar, çam ormanı, kocaman ağaçlar, çimen, patika; mat: egzersiz minderi
const Forest: React.FC<{ mat?: boolean }> = ({ mat = false }) => {
  const g = YAS_FLOOR - 40;
  return (
    <g stroke={C.ink} strokeLinejoin="round">
      <rect x={-200} y={-200} width={1480} height={g + 200} fill="#f6dcb6" strokeWidth={0} />
      <rect x={-200} y={g - 700} width={1480} height={700} fill="#f3c9a0" opacity={0.55} strokeWidth={0} />
      <circle cx={760} cy={430} r={95} fill="#ffd27a" strokeWidth={0} />
      {[
        [-120, 640], [330, 820], [760, 700], [1180, 760],
      ].map(([x, h], i) => (
        <g key={i}>
          <path d={`M${x - h * 0.85} ${g - 300} L${x} ${g - 300 - h} L${x + h * 0.85} ${g - 300} Z`} fill={i % 2 ? "#8f9fb0" : "#a3b1bf"} strokeWidth={6} />
          <path d={`M${x - h * 0.2} ${g - 300 - h * 0.76} L${x} ${g - 300 - h} L${x + h * 0.2} ${g - 300 - h * 0.76} L${x + h * 0.06} ${g - 300 - h * 0.7} L${x - h * 0.06} ${g - 300 - h * 0.8} Z`} fill="#fbf7ef" strokeWidth={5} />
        </g>
      ))}
      {/* uzak çam ormanı */}
      {Array.from({ length: 26 }, (_, k) => {
        const x = -160 + k * 54 + ((k * 37) % 30);
        const h = 230 + ((k * 53) % 120);
        return <path key={k} d={`M${x - h * 0.3} ${g - 120} L${x} ${g - 120 - h} L${x + h * 0.3} ${g - 120} Z`} fill={k % 3 ? "#4f6b45" : "#5d7a4f"} strokeWidth={4} />;
      })}
      <rect x={-200} y={g - 130} width={1480} height={140} fill="#6f8c55" strokeWidth={0} />
      {/* yakın çamlar: kocaman, çerçeveyi sarar */}
      {[
        [-10, 980], [1070, 1060],
      ].map(([x, h], k) => (
        <g key={k}>
          <rect x={x - 22} y={g - 160} width={44} height={170} fill="#7a4f2c" strokeWidth={6} />
          {[0, 1, 2, 3].map((j) => {
            const w = h * (0.42 - j * 0.08);
            const y0 = g - 120 - j * h * 0.22;
            return <path key={j} d={`M${x - w} ${y0} L${x} ${y0 - h * 0.36} L${x + w} ${y0} Z`} fill={j % 2 ? "#4f6b45" : "#3f5a38"} strokeWidth={6} />;
          })}
        </g>
      ))}
      {/* çimen, patika, çalılar, çiçekler */}
      <rect x={-200} y={g} width={1480} height={900} fill="#9fbf74" strokeWidth={0} />
      <path d={`M-200 ${g} L1280 ${g}`} strokeWidth={6} />
      <path d={`M-200 ${g + 150} Q540 ${g + 60} 1280 ${g + 170} L1280 ${g + 260} Q540 ${g + 150} -200 ${g + 250} Z`} fill="#d9b98a" strokeWidth={4} opacity={0.9} />
      {[[180, g + 10], [700, g + 6]].map(([x, y], k) => (
        <g key={k}>
          <ellipse cx={x} cy={y - 20} rx={90} ry={50} fill="#5e7f45" strokeWidth={5} />
          <ellipse cx={x + 60} cy={y - 10} rx={60} ry={36} fill="#6f8c55" strokeWidth={5} />
        </g>
      ))}
      {Array.from({ length: 10 }, (_, k) => (
        <circle key={k} cx={60 + k * 110 + ((k * 31) % 40)} cy={g + 330 + ((k * 47) % 140)} r={10} fill={[C.yellow, "#fbf3e2", "#e58f8f"][k % 3]} strokeWidth={3} />
      ))}
      {mat ? <rect x={150} y={YAS_FLOOR - 8} width={820} height={18} rx={8} fill="#6e8fb3" strokeWidth={4} /> : null}
    </g>
  );
};

// "Önce oyun: kurbağa zıplaması, ayı yürüyüşü, tek ayakla sekmek."
// Ormanda küçük avatar: kurbağa gibi derin çömelip öne sıçrar → ayı gibi dört ayak (dizler havada) → tek ayak sekme.
const YasOyun: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const s = 0.85;
  const a = w(2) - 6;
  const b = w(4) - 4;
  const c = w(6) - 4;
  let pose: SidePose = squatUp;
  let X = 230;
  let lift = 0;
  let face: "smile" | "grin" = "smile";
  if (f >= a && f < b) {
    // kurbağa: derin çömel, kollar geride → kollar öne savrulur, sıçra → yumuşak in, yine çömel
    const P = 26;
    const q = ((f - a) % P) / P;
    const crouch = q < 0.25 ? 0.4 + 0.6 * (q / 0.25) : q < 0.35 ? 1 - (q - 0.25) / 0.1 : q > 0.85 ? (q - 0.85) / 0.15 : 0;
    const air = q >= 0.35 && q <= 0.85 ? Math.sin(((q - 0.35) / 0.5) * Math.PI) : 0;
    pose = mixPose(squatUp, { ...squatDown, armF: [-30, 10], armB: [-34, 10] }, crouch);
    if (air > 0) pose = { ...mixPose(squatUp, squatDown, 0.15 * (1 - air)), armF: [150, 0], armB: [146, 0], front: { a: 26, k: 40 }, back: { a: 8, k: 50 } };
    lift = air * 170;
    X = 150 + Math.min(620, Math.floor((f - a) / P) * 150 + (q > 0.35 ? Math.min(1, (q - 0.35) / 0.5) * 150 : 0));
    face = "grin";
  } else if (f >= b && f < c) {
    pose = bearPose((f - b) / 3.2);
    X = 220 + Math.min(520, (f - b) * 6.5);
  } else if (f >= c) {
    // tek ayak: arka ayak dizden bükülü havada, kollar dengede, ritmik küçük sekmeler
    const hop = Math.abs(Math.sin(((f - c) / 11) * Math.PI));
    pose = { ...mixPose(squatUp, squatDown, 0.18 * (1 - hop)), back: { a: -14, k: 105 }, armF: [55, 25], armB: [-40, 20] };
    lift = hop * 60;
    X = 250 + Math.min(420, (f - c) * 4);
    face = "grin";
  }
  const label = f < a ? "" : f < b ? "kurbağa zıplaması" : f < c ? "ayı yürüyüşü" : "tek ayakla sekme";
  const lp = f < a ? 0 : pop(f, f < b ? a : f < c ? b : c, 10);
  return (
    <>
      <Forest />
      <HandText x={540} y={300} text="önce oyun" size={110} p={tw(f, 0, w(1) + 6) * (1 - tw(f, a - 6, a))} rotate={-3} />
      {label ? <HandText x={540} y={300} text={label} size={label.length > 12 ? 90 : 110} p={lp} color={C.red} rotate={-3} /> : null}
      <SideAt f={f} X={X} floor={YAS_FLOOR - 40} s={s} pose={pose} lift={lift} face={face} anchor={f >= b && f < c ? "back" : "front"} />
    </>
  );
};

// "Söyleneni doğru yapabildiğin gün, kendi ağırlığınla:"
// Ormanda minderde avatar çömelir, sırtı kambur → balon "sırtın düz!" → düzeltir, yeşil tik; "kendi ağırlığınla"da dambıl çizilir, avatar parlar.
const YasHazir: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const s = 1.15;
  const tip = pop(f, 0, 12) * (1 - tw(f, w(4) - 6, w(4)));
  const fix = tw(f, w(1) - 2, w(2) + 4);
  const ok = pop(f, w(2), 10) * (1 - tw(f, w(4) - 6, w(4)));
  const stand = tw(f, w(3), w(4) + 4);
  const bad = { ...mixPose(squatUp, squatDown, 0.7), lean: 66 };
  const good = mixPose(squatUp, squatDown, 0.7);
  const pose = mixPose(mixPose(bad, good, fix), squatUp, stand);
  const own = tw(f, w(4) - 2, w(5) + 6);
  return (
    <>
      <Forest mat />
      <SideAt f={f} X={560} floor={YAS_FLOOR} s={s} pose={pose} face={fix > 0.8 ? "grin" : "worry"} />
      {tip > 0 ? (
        <Bubble x={330} y={520} rx={240} ry={120} p={tip} tail={[470, 780]}>
          <text x={330} y={545} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={80} fill={C.ink}>
            sırtın düz!
          </text>
        </Bubble>
      ) : null}
      {ok > 0 ? <HandText x={830} y={640} text="✓ doğru" size={100} p={ok} color={YAS_OK} rotate={-6} /> : null}
      {own > 0 ? (
        <g>
          <circle cx={560} cy={YAS_FLOOR - 330} r={330} fill={C.yellow} opacity={0.18 * own} />
          <g opacity={own} transform="translate(820 520)">
            <Dumbbell x={0} y={0} s={0.7} />
            <Cross x={0} y={0} size={90} p={tw(f, w(4), w(5))} />
          </g>
          <HandText x={540} y={330} text="kendi ağırlığın" size={100} p={own} color={C.red} rotate={-3} />
        </g>
      ) : null}
    </>
  );
};

// "Squat: kalçanı geriye ver, sandalyeye oturur gibi in. Dizlerin ayak uçlarına baksın."
// Yavaş, tam tekrarlar; kalçadan geriye yeşil ok, arkada kesikli hayalî sandalye, dizden ayak ucuna yardımcı çizgi.
const YasSquat: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const s = 1.2;
  const X = 600;
  const P = 56;
  const rep = (1 - Math.cos((Math.max(0, f - 6) / P) * Math.PI * 2)) / 2;
  const t = f < 6 ? 0 : rep * (1 - tw(f, d - 10, d - 2));
  const pose = mixPose(squatUp, squatDown, t);
  const pt0 = sidePts(pose, X, YAS_FLOOR, s);
  const hipArrow = tw(f, w(1) - 2, w(3) + 4) * (1 - tw(f, w(4), w(4) + 8));
  const chair = tw(f, w(4) - 2, w(6)) * (1 - tw(f, w(8) - 2, w(8) + 6));
  const knee = tw(f, w(8) - 2, w(10) + 4);
  const seatY = YAS_FLOOR - 175 * s;
  const reps = Math.min(9, Math.floor(Math.max(0, f - 6 + P / 2) / P));
  return (
    <>
      <Forest mat />
      {chair > 0 ? (
        <g opacity={chair} stroke={YAS_OK} strokeWidth={8} strokeDasharray="22 14" fill="none" strokeLinecap="round">
          <path d={`M${X - 300} ${seatY} L${X - 70} ${seatY} M${X - 280} ${seatY} L${X - 280} ${YAS_FLOOR} M${X - 90} ${seatY} L${X - 90} ${YAS_FLOOR} M${X - 290} ${seatY} L${X - 310} ${seatY - 300}`} />
        </g>
      ) : null}
      <SideAt f={f} X={X} floor={YAS_FLOOR} s={s} pose={pose} face="smile" />
      {hipArrow > 0 ? (
        <g opacity={hipArrow}>
          <Pointer x1={pt0.H.x + 30} y1={pt0.H.y} x2={pt0.H.x - 200} y2={pt0.H.y + 20} p={hipArrow} color={YAS_OK} />
          <HandText x={pt0.H.x - 120} y={pt0.H.y - 70} text="kalça geri" size={70} p={hipArrow} color={YAS_OK} rotate={-4} />
        </g>
      ) : null}
      {knee > 0 ? (
        <g opacity={knee}>
          <path d={`M${pt0.K.x} ${pt0.K.y} L${pt0.T.x + 20} ${pt0.T.y}`} stroke={YAS_OK} strokeWidth={8} strokeDasharray="18 12" />
          <circle cx={pt0.K.x} cy={pt0.K.y} r={34} fill="none" stroke={YAS_OK} strokeWidth={7} />
          <HandText x={860} y={760} text="diz → ayak ucu" size={68} p={knee} color={YAS_OK} rotate={-4} />
        </g>
      ) : null}
      <HandText x={540} y={300} text="squat" size={140} p={pop(f, 0, 10)} color={C.red} rotate={-3} />
      <text x={880} y={520} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={90} fill={C.ink} opacity={tw(f, 20, 30)}>
        {`${reps}`}
      </text>
    </>
  );
};

// "Şınav: vücudun dümdüz, göğsün yere yaklaşsın. Zorsa dizlerinin üstünde."
// Tam şınav tekrarları; topuktan omza yeşil cetvel, göğüs inince ok; "Zorsa"da diz üstü şınava geçer.
const YasSinav: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const s = 1.2;
  const knees = f >= w(6) - 2;
  const start = knees ? w(6) - 2 : 0;
  const P = 44;
  const t = ((1 - Math.cos((Math.max(0, f - start - 4) / P) * Math.PI * 2)) / 2) * (1 - tw(f, d - 8, d));
  const pose = knees ? kneePushPose(t) : pushPose(t);
  const X = knees ? 300 : 150;
  const pts = sidePts(pose, X, YAS_FLOOR, s);
  const ruler = tw(f, w(1) - 2, w(2) + 6) * (1 - tw(f, w(3), w(3) + 8));
  const chest = tw(f, w(3) - 2, w(5) + 4) * (1 - tw(f, w(6) - 6, w(6)));
  const from = knees ? pts.K : pts.A;
  return (
    <>
      <Forest mat />
      <SideAt f={f} X={X} floor={YAS_FLOOR} s={s} pose={pose} face={t > 0.6 ? "worry" : "smile"} />
      {ruler > 0 ? (
        <g opacity={ruler}>
          <path d={`M${from.x - 20} ${from.y - 50} L${pts.S.x + 30} ${pts.S.y - 60}`} stroke={YAS_OK} strokeWidth={10} strokeDasharray="26 12" strokeLinecap="round" />
          <HandText x={540} y={760} text="dümdüz" size={90} p={ruler} color={YAS_OK} rotate={-4} />
        </g>
      ) : null}
      {chest > 0 ? (
        <g opacity={chest}>
          <Pointer x1={pts.S.x + 40} y1={pts.S.y - 170} x2={pts.S.x + 40} y2={YAS_FLOOR - 70} p={chest} color={YAS_OK} />
          <HandText x={pts.S.x + 150} y={760} text="göğüs yere" size={70} p={chest} color={YAS_OK} rotate={-4} />
        </g>
      ) : null}
      <HandText x={540} y={300} text={knees ? "diz üstü şınav" : "şınav"} size={knees ? 110 : 140} p={pop(f, start, 10)} color={C.red} rotate={-3} />
    </>
  );
};

// "Plank: dirseklerin omuzlarının altında, kalçan ne düşsün ne kalksın."
// Dirsek plankı; omuzdan dirseğe dikey çizgi; "düşsün"de kalça sarkar (kırmızı çarpı), "kalksın"da kalkar, sonra düz + yeşil tik.
const YasPlank: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const s = 1.2;
  const X = 170;
  const sag = tw(f, w(5) - 4, w(6) + 2) * (1 - tw(f, w(7) - 6, w(7)));
  const pike = tw(f, w(7) - 2, w(8) + 2) * (1 - tw(f, w(8) + 10, w(8) + 20));
  const dh = 85 * sag - 120 * pike;
  const pose = plankPose(dh);
  const pts = sidePts(pose, X, YAS_FLOOR, s);
  const elbow = tw(f, w(1) - 2, w(3) + 4) * (1 - tw(f, w(4) - 4, w(4) + 4));
  const good = tw(f, w(8) + 14, w(8) + 24);
  const secs = Math.min(59, Math.floor(f / 30) * 1 + 10);
  const elbowX = pts.S.x;
  return (
    <>
      <Forest mat />
      <SideAt f={f} X={X} floor={YAS_FLOOR} s={s} pose={pose} face={sag > 0.5 || pike > 0.5 ? "worry" : "smile"} />
      {elbow > 0 ? (
        <g opacity={elbow}>
          <path d={`M${elbowX} ${pts.S.y - 40} L${elbowX} ${YAS_FLOOR + 20}`} stroke={YAS_OK} strokeWidth={9} strokeDasharray="18 12" />
          <HandText x={540} y={760} text="dirsek omuz altında" size={64} p={elbow} color={YAS_OK} rotate={-4} />
        </g>
      ) : null}
      {sag > 0.3 ? <Cross x={pts.H.x} y={pts.H.y - 10} size={60} p={tw(sag, 0.3, 1)} /> : null}
      {pike > 0.3 ? <Cross x={pts.H.x} y={pts.H.y - 30} size={60} p={tw(pike, 0.3, 1)} /> : null}
      {good > 0 ? (
        <g opacity={good}>
          <path d={`M${pts.A.x - 20} ${pts.A.y - 50} L${pts.S.x + 30} ${pts.S.y - 60}`} stroke={YAS_OK} strokeWidth={10} strokeDasharray="26 12" strokeLinecap="round" />
          <HandText x={540} y={760} text="✓ düz çizgi" size={90} p={good} color={YAS_OK} rotate={-4} />
        </g>
      ) : null}
      <HandText x={540} y={300} text="plank" size={140} p={pop(f, 0, 10)} color={C.red} rotate={-3} />
      <text x={880} y={520} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={90} fill={C.ink} opacity={tw(f, 6, 14) * (1 - tw(f, d - 6, d))}>
        {`0:${String(secs).padStart(2, "0")}`}
      </text>
    </>
  );
};

// Büyük yaş rakamı (el yazısı), üstü çizilebilir
const AgeTag: React.FC<{ x: number; y: number; text: string; p: number; size?: number; strike?: number; color?: string }> = ({ x, y, text, p, size = 220, strike = 0, color = C.ink }) =>
  p > 0 ? (
    <g transform={`translate(${x} ${y}) scale(${p}) rotate(-4)`}>
      <text x={0} y={0} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={size} fill={color}>
        {text}
      </text>
      {strike > 0 ? (
        <path d={`M${-size * 0.6} ${-size * 0.3} L${size * 0.6} ${-size * 0.38}`} stroke={C.red} strokeWidth={size * 0.09} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - strike} />
      ) : null}
    </g>
  ) : null;

// "Spora kaç yaşında başlanır? On sekiz mi? On altı mı? Çocuk doktorlarının cevabı seni şaşırtacak: zıplayabildiğin yaşta."
// Dev yaş sayacı 18 → 16 → … → 5 geri sarar, avatar her yaşta küçülür; 5'te minik avatar zıplar.
const YasHook: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const roll = tw(f, w(10), w(15));
  const age = f < w(7) ? 18 : f < w(10) ? 16 : Math.round(lerp(16, 5, roll));
  const sc = f < w(4) ? yasScale(18) : yasScale(lerp(age, f < w(10) ? age : lerp(16, 5, roll), 1));
  const q = pop(f, 0, 10) * (1 - tw(f, w(4) - 4, w(4)));
  const jump = f > w(15) ? Math.abs(Math.sin(((f - w(15)) / 9) * Math.PI)) * 110 : 0;
  const happy = f > w(15);
  return (
    <>
      <rect x={-200} y={PY} width={1480} height={800} fill="#d9c6a0" opacity={0.55} />
      <path d={`M-200 ${PY} L1280 ${PY}`} stroke={C.ink} strokeWidth={6} />
      <AgeTag x={180} y={330} text="18" p={pop(f, w(7), 10)} size={110} strike={tw(f, w(7) + 4, w(7) + 12)} />
      <AgeTag x={180} y={470} text="16" p={pop(f, w(10), 10)} size={110} strike={tw(f, w(10) + 4, w(10) + 12)} />
      {f >= w(4) ? <AgeTag x={600} y={430} text={`${age}`} p={pop(f, w(4), 12)} size={260} color={happy ? YAS_OK : C.ink} /> : null}
      {f >= w(4) ? <HandText x={850} y={430} text="yaş" size={90} p={1} rotate={-4} /> : null}
      {q > 0 ? <HandText x={560} y={420} text="?" size={300} p={q} color={C.red} rotate={8} /> : null}
      <Person x={PX} y={PY - jump} s={sc} shirt={YAS_SHIRT} belly={0.3} armL={happy ? ARMS_UP : [12, 0]} armR={happy ? ARMS_UP : [12, 0]} legL={jump > 20 ? { lift: 0.3, spread: 12 } : {}} legR={jump > 20 ? { lift: 0.3, spread: 12 } : {}} mouth={happy ? "grin" : roll > 0.05 ? "o" : "smile"} eyes={roll > 0.05 && !happy ? "wide" : "open"} lookY={-6} />
      {happy ? <HandText x={PX + 260} y={PY - 420} text="zıpla!" size={110} p={tw(f, w(15), w(15) + 10)} color={C.red} rotate={-3} /> : null}
    </>
  );
};

// Basamak: yaş grupları 5-7 → 8-12 → 13-15 → 16+
const Stairs: React.FC<{ p: number; f: number }> = ({ p, f }) => {
  const labels = ["5-7", "8-12", "13-15", "16+"];
  return (
    <g>
      {labels.map((t, i) => {
        const q = tw(p, i / 4, (i + 1) / 4);
        if (q <= 0) return null;
        const x = 100 + i * 220;
        const y = 1580 - (i + 1) * 110;
        return (
          <g key={i} opacity={q} transform={`translate(0 ${(1 - q) * 60})`}>
            <rect x={x} y={y} width={220} height={(i + 1) * 110} fill={["#e9d3a8", "#dcc08e", "#cfae78", "#c29c62"][i]} stroke={C.ink} strokeWidth={7} />
            <text x={x + 110} y={y - 24} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={64} fill={C.ink}>
              {t}
            </text>
          </g>
        );
      })}
      {p > 0.3 ? <Person x={210} shirt={YAS_SHIRT} y={1450 - Math.abs(Math.sin(f / 8)) * 30} s={0.28} belly={0.3} mouth="grin" armL={[40, 0]} armR={[40, 0]} /> : null}
    </g>
  );
};

// "Amerikan çocuk doktorları iki bin yirmide yazdı: belli bir başlama yaşı yok. Ama bir sıra var."
// Rapor açılır, "BAŞLAMA YAŞI" satırına kırmızı "YOK" damgası; rapor yukarı çekilir, yerine üç basamak çizilir.
const YasRapor: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const doc = pop(f, 0, 14);
  const up = tw(f, w(12) - 4, w(13) + 6);
  const line = tw(f, w(7) - 2, w(10) + 4);
  const stamp = pop(f, w(11) - 2, 10);
  const stairs = tw(f, w(13), w(15) + 12);
  return (
    <>
      <g transform={`translate(540 ${lerp(820, 470, up)}) scale(${doc * lerp(1, 0.62, up)}) rotate(-2)`}>
        <rect x={-360} y={-420} width={720} height={840} rx={16} fill={C.cream} stroke={C.ink} strokeWidth={9} />
        <rect x={-360} y={-420} width={720} height={150} rx={16} fill="#6e8fb3" stroke={C.ink} strokeWidth={9} />
        <text x={0} y={-345} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={64} fill={C.cream}>
          ÇOCUK DOKTORLARI
        </text>
        <text x={0} y={-290} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={52} fill={C.cream}>
          rapor · 2020
        </text>
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={-300} y={-220 + i * 60} width={[600, 520, 580, 460, 540][i] * tw(f, 6 + i * 4, 18 + i * 4)} height={18} rx={9} fill="#d8c8a6" />
        ))}
        <HandText x={-300} y={120} text="BAŞLAMA YAŞI:" size={76} p={line} anchor="start" rotate={0} />
        {stamp > 0 ? (
          <g transform={`translate(140 280) rotate(-12) scale(${stamp})`}>
            <rect x={-150} y={-80} width={300} height={140} rx={14} fill="none" stroke={C.red} strokeWidth={12} />
            <text x={0} y={30} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={110} fill={C.red}>
              YOK
            </text>
          </g>
        ) : null}
      </g>
      <Stairs p={stairs} f={f} />
    </>
  );
};



const WEEK = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
// Haftalık şerit: işaretlenen günler (aralıklı)
const WeekStrip: React.FC<{ x: number; y: number; p: number; marks: number[] }> = ({ x, y, p, marks }) =>
  p > 0 ? (
    <g transform={`translate(${x} ${y}) scale(${p})`}>
      {WEEK.map((t, i) => {
        const cx = (i - 3) * 118;
        const m = marks[[0, 2, 4].indexOf(i)] ?? 0;
        return (
          <g key={i}>
            <rect x={cx - 52} y={-60} width={104} height={120} rx={14} fill={C.cream} stroke={C.ink} strokeWidth={6} />
            <text x={cx} y={-12} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={46} fill={C.ink}>
              {t}
            </text>
            {m > 0 ? <circle cx={cx} cy={10} r={44} fill="none" stroke={i === 4 ? YAS_OK : C.red} strokeWidth={8} pathLength={1} strokeDasharray={i === 4 ? "0.08 0.05" : "1"} strokeDashoffset={1 - m} /> : null}
            {m > 0.9 ? <path d={`M${cx - 18} 26 l14 14 l26 -30`} stroke={i === 4 ? YAS_OK : C.red} strokeWidth={8} fill="none" strokeLinecap="round" /> : null}
          </g>
        );
      })}
    </g>
  ) : null;

// "Teknik oturunca önce lastik bant, sonra hafif dambıl. Haftada iki üç gün."
// Önce dizlerin üstünde turuncu mini bantla yana adımlar (bant gerilir) → sonra küçük dambılla çalışır → haftalık şerit.
const YasDambil: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const s = yasScale(13);
  const band = f < w(5) - 2;
  const st = (1 - Math.cos(f / 7)) / 2; // yana adım: bacaklar açılır-kapanır, bant gerilir
  const spread = band ? lerp(5, 19, st) : 4;
  const c = (1 - Math.cos(f / 6)) / 2;
  const armR: Arm = band ? [28, -95] : curlArm(c);
  const armL: Arm = band ? [28, -95] : [12, 0];
  const hand = armPoints(1, armR)[2];
  const legL = { spread };
  const legR = { spread };
  const kL = legPoints(-1, legL);
  const kR = legPoints(1, legR);
  // bant: uyluğun alt kısmında, dizin hemen üstünde
  const at = (q: number[][]) => [q[0][0] + (q[1][0] - q[0][0]) * 0.82, q[0][1] + (q[1][1] - q[0][1]) * 0.82];
  const bl = at(kL);
  const br = at(kR);
  const X = 540 + (band ? Math.sin(f / 14) * 60 : 0);
  const Y = PY + 60;
  const week = pop(f, w(8) - 2, 12);
  const showBand = band && f >= w(2) - 6;
  const label = f < w(2) - 2 ? "" : band ? "1. lastik bant" : "2. hafif dambıl";
  return (
    <>
      <rect x={-200} y={-200} width={1480} height={PY + 260} fill="#efe1c2" />
      <rect x={-200} y={PY + 60} width={1480} height={700} fill="#c9a06c" />
      <path d={`M-200 ${PY + 60} L1280 ${PY + 60}`} stroke={C.ink} strokeWidth={7} />
      <HandText x={540} y={300} text="teknik ✓" size={110} p={tw(f, 0, w(1) + 4) * (1 - tw(f, w(2) - 6, w(2) - 2))} color={YAS_OK} rotate={-3} />
      {label ? <HandText x={540} y={300} text={label} size={120} p={pop(f, band ? w(2) - 2 : w(5) - 2, 10)} color={C.red} rotate={-3} /> : null}
      <Person x={X} y={Y} s={s} shirt={YAS_SHIRT} belly={0.3} armL={armL} armR={armR} legL={legL} legR={legR} mouth="smile" lookY={4}>
        {showBand ? (
          <g strokeLinecap="round">
            <path d={`M${bl[0] - 34} ${bl[1] - 10} L${br[0] + 34} ${br[1] - 10} M${bl[0] - 34} ${bl[1] + 16} L${br[0] + 34} ${br[1] + 16}`} stroke={C.ink} strokeWidth={30} />
            <path d={`M${bl[0] - 34} ${bl[1] - 10} L${br[0] + 34} ${br[1] - 10} M${bl[0] - 34} ${bl[1] + 16} L${br[0] + 34} ${br[1] + 16}`} stroke="#f28c28" strokeWidth={18} />
          </g>
        ) : null}
        {!band ? (
          <g transform={`translate(${hand[0]} ${hand[1]}) rotate(${-20 + 60 * c})`}>
            <Dumbbell x={0} y={0} s={0.42} rot={90} />
          </g>
        ) : null}
      </Person>
      {showBand ? <HandText x={860} y={Y - 260} text="dizin üstüne" size={70} p={tw(f, w(3), w(4) + 6)} color={YAS_OK} rotate={-4} /> : null}
      {showBand ? <Pointer x1={760} y1={Y - 240} x2={X + 120} y2={Y - 200} p={tw(f, w(3), w(4) + 6)} color={YAS_OK} w={9} /> : null}
      <WeekStrip x={540} y={520} p={week} marks={[tw(f, w(9) - 2, w(9) + 6), tw(f, w(10) - 2, w(10) + 6), tw(f, w(11) - 2, w(11) + 8)]} />
    </>
  );
};


// Kas hücreleri merceği: act = sinir sinyaliyle çalışan hücre oranı (yanar), grow = hücrelerin büyümesi (ergenlik)
const CellLens: React.FC<{ x: number; y: number; r: number; p: number; act: number; grow: number; pulse: number }> = ({ x, y, r, p, act, grow, pulse }) => {
  const id = svgId(useId());
  if (p <= 0) return null;
  const rc = 30 * (1 + 0.75 * grow);
  const dx = rc * 2.12;
  const dy = dx * 0.87;
  const cells: { cx: number; cy: number; k: number }[] = [];
  for (let j = -6; j <= 6; j++) {
    for (let i = -6; i <= 6; i++) {
      const cx = x + i * dx + (j % 2 ? dx / 2 : 0);
      const cy = y + j * dy;
      if (Math.hypot(cx - x, cy - y) < r + rc) cells.push({ cx, cy, k: random(`cell${i}_${j}`) });
    }
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${p}) translate(${-x} ${-y})`}>
      <clipPath id={`cl${id}`}>
        <circle cx={x} cy={y} r={r} />
      </clipPath>
      <circle cx={x} cy={y} r={r} fill="#3a2430" />
      <g clipPath={`url(#cl${id})`}>
        {cells.map(({ cx, cy, k }, n) => {
          const on = k < act;
          return (
            <g key={n}>
              {on ? <circle cx={cx} cy={cy} r={rc * 1.15} fill={C.yellow} opacity={0.45 + 0.25 * Math.sin(pulse + n)} /> : null}
              <circle cx={cx} cy={cy} r={rc} fill={on ? "#f2a33a" : "#c9566b"} stroke={C.ink} strokeWidth={4} />
              <circle cx={cx - rc * 0.3} cy={cy - rc * 0.25} r={rc * 0.18} fill={C.ink} opacity={0.55} />
            </g>
          );
        })}
      </g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={C.ink} strokeWidth={14} />
    </g>
  );
};

// "Ergenlikten önce kasların pek büyümez ama güçlenirsin: beynin kaslarını kullanmayı öğrenir. Kaslar ergenlikte büyür."
// Kas hücreleri merceği: önce hücreler aynı boyda, sinyal geldikçe tek tek yanar (güç); ergenlikte hücreler büyür, kol dolgunlaşır.
const YasSinir: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const s = yasScale(12);
  const wire = tw(f, w(7) - 2, w(10) + 4);
  const grow = tw(f, w(11), w(13) + 6);
  const act = 0.15 + 0.85 * tw(f, w(8), w(10) + 6);
  const c = (1 - Math.cos(f / (8 - 3 * wire))) / 2;
  const arm = curlArm(c);
  const pts = armPoints(1, arm);
  const X = 260;
  const Y = PY + 40;
  const lens = pop(f, w(1), 12);
  const same = tw(f, w(3) - 2, w(4) + 6) * (1 - tw(f, w(5) - 4, w(5) + 2));
  const power = pop(f, w(5) - 2, 10) * (1 - tw(f, w(11) - 6, w(11)));
  const sc = lerp(s, yasScale(16), grow);
  const path = `M0 -700 C60 -700 90 -640 ${pts[0][0]} ${pts[0][1]} L${pts[1][0]} ${pts[1][1]} L${pts[2][0]} ${pts[2][1]}`;
  // kolun ortası (dünya) → merceğe giden kesikli çizgi
  const mid = { x: X + ((pts[0][0] + pts[1][0]) / 2) * sc, y: Y + ((pts[0][1] + pts[1][1]) / 2) * sc };
  const LX = 760;
  const LY = 720;
  return (
    <>
      <rect x={-200} y={Y} width={1480} height={700} fill="#d9c6a0" opacity={0.55} />
      <path d={`M-200 ${Y} L1280 ${Y}`} stroke={C.ink} strokeWidth={6} />
      <FlyingPages start={w(11)} end={w(13)} y={380} />
      <Person shirt={YAS_SHIRT} x={X} y={Y} s={sc} belly={0.3} limbW={1 + 0.45 * grow} armR={arm} armL={[12, 0]} mouth={wire > 0.5 ? "grin" : "flat"} lookY={6}>
        {wire > 0 ? (
          <g>
            <path d={path} stroke={C.yellow} strokeWidth={34} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.35 * wire} />
            <path d={path} stroke={C.glow} strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - wire} />
            <circle cx={0} cy={-700} r={56} fill={C.yellow} opacity={0.35 * wire * (0.7 + 0.3 * Math.sin(f / 3))} />
          </g>
        ) : null}
        <g transform={`translate(${pts[2][0]} ${pts[2][1]}) rotate(${-20 + 60 * c})`}>
          <Dumbbell x={0} y={0} s={0.42} rot={90} />
        </g>
      </Person>
      {lens > 0 ? <path d={`M${mid.x} ${mid.y} L${LX - 230} ${LY + 80}`} stroke={C.ink} strokeWidth={6} strokeDasharray="16 12" opacity={lens} /> : null}
      <CellLens x={LX} y={LY} r={240} p={lens} act={act} grow={grow} pulse={f / 4} />
      <HandText x={LX} y={LY - 280} text={grow > 0.3 ? "ergenlik: hücreler büyür" : "kas hücreleri"} size={grow > 0.3 ? 64 : 76} p={lens} color={grow > 0.3 ? YAS_OK : C.ink} rotate={-3} />
      {same > 0 ? <HandText x={LX} y={LY + 330} text="boyları aynı" size={80} p={same} color={YAS_OK} rotate={-4} /> : null}
      {power > 0 ? <HandText x={LX} y={LY + 330} text={wire > 0.3 ? "daha çok hücre çalışır = güç ↑" : "güç ↑"} size={wire > 0.3 ? 56 : 90} p={power} color={YAS_OK} rotate={-4} /> : null}
      {wire > 0.2 ? <HandText x={540} y={300} text="beyin → kas" size={96} p={tw(f, w(7), w(8) + 6) * (1 - grow)} color={C.glow} rotate={-3} /> : null}
    </>
  );
};


// "Yani önemli olan kaç yaşında olduğun değil, kaç yıldır doğru yaptığın."
// Terazi: 10 yaşındaki kız / 14 yaşındaki çocuk; önce yaş ağır basar, sonra kartlar "3 yıl" / "0 yıl"a döner, terazi kıza eğilir.
const YasTerazi: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const flip = tw(f, w(7) - 2, w(8) + 4);
  const ang = lerp(tw(f, w(3) - 2, w(4) + 6) * 10, -14, flip);
  const cross = tw(f, w(6) - 2, w(6) + 8) * (1 - flip);
  const cx = 540;
  const cy = 760;
  const L = 330;
  const end = (k: number) => ({ x: cx + k * L * Math.cos(deg(ang)), y: cy + k * L * Math.sin(deg(ang)) });
  const pan = (k: number, top: string, bottom: string, female: boolean) => {
    const e = end(k);
    const py = e.y + 300;
    const sx = Math.abs(Math.cos(Math.PI * flip));
    const txt = flip < 0.5 ? top : bottom;
    return (
      <g>
        <path d={`M${e.x} ${e.y} L${e.x - 130} ${py} M${e.x} ${e.y} L${e.x + 130} ${py}`} stroke={C.ink} strokeWidth={5} />
        <path d={`M${e.x - 160} ${py} Q${e.x} ${py + 70} ${e.x + 160} ${py} Z`} fill="#c9a24a" stroke={C.ink} strokeWidth={7} />
        <Person x={e.x} y={py} s={female ? 0.25 : 0.3} belly={0.25} female={female} mouth={flip > 0.5 && female ? "grin" : "smile"} armL={[12, 0]} armR={[12, 0]} />
        <g transform={`translate(${e.x} ${py + 170}) scale(${sx} 1)`}>
          <rect x={-150} y={-70} width={300} height={120} rx={14} fill={flip < 0.5 ? C.cream : female ? YAS_OK : C.cream} stroke={C.ink} strokeWidth={7} />
          <text x={0} y={22} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={70} fill={flip >= 0.5 && female ? C.cream : C.ink}>
            {txt}
          </text>
        </g>
        {cross > 0 ? <Cross x={e.x} y={py + 160} size={70} p={cross} /> : null}
      </g>
    );
  };
  return (
    <>
      <rect x={510} y={cy} width={60} height={780} fill="#8a5c35" stroke={C.ink} strokeWidth={7} />
      <path d="M380 1560 L700 1560" stroke={C.ink} strokeWidth={14} strokeLinecap="round" />
      <path d={`M${end(-1).x} ${end(-1).y} L${end(1).x} ${end(1).y}`} stroke={C.ink} strokeWidth={18} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={22} fill={C.yellow} stroke={C.ink} strokeWidth={6} />
      {pan(-1, "10 yaş", "3 yıl", true)}
      {pan(1, "14 yaş", "ilk gün", false)}
      <HandText x={540} y={330} text={flip > 0.5 ? "kaç yıldır?" : "kaç yaşında?"} size={110} p={pop(f, flip > 0.5 ? w(7) - 2 : w(3) - 2, 12)} color={flip > 0.5 ? YAS_OK : C.ink} rotate={-3} />
    </>
  );
};

// "Bir de önemli bir not: yanında bilen biri olsun; sakatlıkların çoğu evde, tek başına olur."
// Antrenör yanına gelip duruşunu düzeltir; düşünce balonunda evde tek başına 20 kg dambılı kaldırmaya çalışır, sendeler,
// dambıl elinden kayıp ayağına düşer (yıldız), ayağını tutup tek ayakla seker, ayağı kızarır → kırmızı çarpı.
const YasGuvenlik: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const note = pop(f, w(2) - 2, 12) * (1 - tw(f, w(5) - 4, w(5) + 4));
  // kaza cümlenin ortasında: "olsun"dan sonraki ~1,6 sn sessizlikte balon açılır, dambıl ayağa düşer, "ah!"; sonra cümle sürer
  const B = w(9) - 48;
  const I = B + 32;
  const inn = tw(f, w(5) - 4, w(7) + 4);
  const fix = tw(f, w(7), w(8) + 6);
  const bub = pop(f, B, 12);
  const wob = Math.sin(f / 2.6) * 16 * tw(f, B + 4, B + 14) * (1 - tw(f, I - 12, I - 8));
  const drop = tw(f, I - 10, I);
  const bam = pop(f, I, 10);
  const hurtT = f >= I ? 1 : 0;
  // balondaki çocuk (balon koordinatlarında)
  const KS = 0.44;
  const kidX = 470;
  const hopY = hurtT > 0 ? Math.abs(Math.sin((f - I) / 6)) * 40 : 0;
  const lift = tw(f, B + 2, B + 16);
  const kidArm: Arm = hurtT > 0 ? [60, -70] : [lerp(12, 34, lift) + wob * 0.6, lerp(0, -40, lift)];
  const kh = armPoints(1, kidArm)[2];
  const handW = { x: kidX + kh[0] * KS, y: 740 + kh[1] * KS };
  const footW = { x: kidX + 50 * KS, y: 740 };
  const footR = { x: kidX + legPoints(1, { lift: 0.75, spread: 18 })[2][0] * KS, y: 740 - hopY + legPoints(1, { lift: 0.75, spread: 18 })[2][1] * KS };
  const hurt = tw(f, w(14) - 2, w(14) + 8);
  const c = (1 - Math.cos(f / 7)) / 2;
  const s = yasScale(15);
  const X = 380;
  const hand = armPoints(1, curlArm(c))[2];
  return (
    <>
      <rect x={-200} y={-200} width={1480} height={PY + 260} fill="#efe1c2" />
      <rect x={-200} y={PY + 60} width={1480} height={700} fill="#c9a06c" />
      <path d={`M-200 ${PY + 60} L1280 ${PY + 60}`} stroke={C.ink} strokeWidth={7} />
      {note > 0 ? (
        <g transform={`translate(540 420) rotate(-4) scale(${note})`}>
          <rect x={-280} y={-80} width={560} height={140} rx={20} fill={C.red} stroke={C.ink} strokeWidth={9} />
          <text x={0} y={28} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={96} fill={C.cream}>
            ÖNEMLİ NOT
          </text>
        </g>
      ) : null}
      <Person x={X} y={PY + 60} s={s} shirt={YAS_SHIRT} belly={0.3} armR={curlArm(c)} armL={[12, 0]} tilt={lerp(-8, 0, fix)} mouth={fix > 0.5 ? "grin" : "flat"}>
        <g transform={`translate(${hand[0]} ${hand[1]}) rotate(${-20 + 60 * c})`}>
          <Dumbbell x={0} y={0} s={0.42} rot={90} />
        </g>
      </Person>
      <Person x={lerp(1250, 760, inn)} y={PY + 60} s={0.9} belly={0.45} shirt="#c98f3c" armL={[lerp(10, 70, fix), lerp(0, -30, fix)]} armR={[12, 0]} mouth="smile" lookY={4}>
        <path d="M-40 -600 Q0 -540 40 -600" stroke={C.ink} strokeWidth={5} fill="none" />
        <circle cx={0} cy={-540} r={14} fill="#c0c0c0" stroke={C.ink} strokeWidth={4} />
      </Person>
      {fix > 0.6 ? <HandText x={560} y={420} text="✓ böyle" size={100} p={tw(f, w(7) - 2, w(7) + 8) * (1 - bub)} color={YAS_OK} rotate={-5} /> : null}
      {bub > 0 ? (
        <Bubble x={540} y={520} rx={430} ry={300} p={bub} tail={[400, 880]}>
          {/* ev: pencere, kanepe, lamba */}
          <rect x={200} y={360} width={120} height={140} rx={6} fill="#cfe0ea" stroke={C.ink} strokeWidth={5} />
          <path d="M260 360 L260 500 M200 430 L320 430" stroke={C.ink} strokeWidth={4} />
          <rect x={720} y={640} width={170} height={70} rx={14} fill="#9a7bb0" stroke={C.ink} strokeWidth={5} />
          <rect x={720} y={600} width={40} height={110} rx={10} fill="#9a7bb0" stroke={C.ink} strokeWidth={5} />
          <path d="M840 470 L840 640 M815 470 L865 470 L850 430 L830 430 Z" stroke={C.ink} strokeWidth={5} fill={C.yellow} />
          <path d="M160 740 L920 740" stroke={C.ink} strokeWidth={6} />
          <text x={540} y={300} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={64} fill={C.red}>
            evde · tek başına
          </text>
          {/* çok ağır dambılı kaldırmaya çalışır, sendeler → dambıl elinden kayıp ayağına düşer → ayağını tutup tek ayakla seker */}
          <Person x={kidX} y={740 - hopY} s={KS} shirt={YAS_SHIRT} belly={0.3} tilt={hurtT > 0 ? 6 : wob * 0.5} armL={hurtT > 0 ? [60, -70] : [12, 0]} armR={kidArm} legL={hurtT > 0 ? { spread: 6 } : { spread: 8 + Math.abs(wob) * 0.5 }} legR={hurtT > 0 ? { lift: 0.75, spread: 18 } : { spread: 8 }} mouth={hurtT > 0 ? "open" : "worry"} eyes={hurtT > 0 ? "closed" : "wide"}>
            {drop <= 0 ? (
              <g transform={`translate(${kh[0]} ${kh[1] + 30}) rotate(${90 + wob * 2})`}>
                <Dumbbell x={0} y={0} s={1.1} />
              </g>
            ) : null}
          </Person>
          {drop > 0 ? (
            <g transform={`translate(${lerp(handW.x, footW.x + 40, drop)} ${lerp(handW.y + 14, 712, drop * drop)}) rotate(${lerp(90, 160, drop)})`}>
              <Dumbbell x={0} y={0} s={0.48} />
            </g>
          ) : null}
          {(drop > 0 ? drop < 1 : true) && wob !== 0 ? (
            <text x={720} y={470} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={56} fill={C.red} transform={`rotate(${wob * 0.4} 720 470)`}>
              20 kg!
            </text>
          ) : null}
          {bam > 0 ? (
            <g transform={`translate(${footW.x + 40} 700) scale(${bam})`}>
              <Star x={0} y={0} r={56} rot={f * 3} />
            </g>
          ) : null}
          {hurtT > 0 ? (
            <g>
              <circle cx={footR.x} cy={footR.y} r={30 + 10 * Math.sin(f / 3)} fill={C.red} opacity={0.5} />
              <text x={kidX + 180} y={480} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={70} fill={C.red}>
                ah!
              </text>
            </g>
          ) : null}
          {hurt > 0 ? <Cross x={540} y={560} size={170} p={hurt} /> : null}
        </Bubble>
      ) : null}
    </>
  );
};

// "O yüzden en doğru yaş: bugün."
// Takvim yaprakları uçar, kocaman "BUGÜN" sayfası belirir; avatar kollarını kaldırır, konfeti → döngü (açılıştaki "?").
const YasBugun: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const page = pop(f, w(2) - 2, 14);
  const yay = f > w(5) - 2;
  return (
    <>
      <rect x={-200} y={PY} width={1480} height={800} fill="#d9c6a0" opacity={0.55} />
      <path d={`M-200 ${PY} L1280 ${PY}`} stroke={C.ink} strokeWidth={6} />
      <FlyingPages start={0} end={w(2)} y={430} />
      {page > 0 ? (
        <g transform={`translate(540 430) scale(${page}) rotate(-4)`}>
          <rect x={-260} y={-190} width={520} height={330} rx={20} fill={C.cream} stroke={C.ink} strokeWidth={9} />
          <rect x={-260} y={-190} width={520} height={90} rx={20} fill={C.red} stroke={C.ink} strokeWidth={9} />
          <text x={0} y={90} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={yay ? 150 : 120} fill={yay ? C.red : C.ink}>
            {yay ? "BUGÜN" : "yaş: ?"}
          </text>
        </g>
      ) : null}
      <Person x={PX} y={PY} s={yasScale(18)} shirt={YAS_SHIRT} belly={0.3} armL={yay ? ARMS_UP : [12, 0]} armR={yay ? ARMS_UP : [12, 0]} mouth={yay ? "grin" : "smile"} lookY={-6} />
      {yay ? <Confetti start={w(5) - 2} n={24} /> : null}
    </>
  );
};

// Yaş şeridi: dört basamak (5-7, 8-12, 13-15, 16+); etkin olan kırmızı, geçilenler lacivert
const AGE_BANDS = ["5-7", "8-12", "13-15", "16+"];
const AgeRuler: React.FC<{ active: number; p: number }> = ({ active, p }) =>
  p > 0 ? (
    <g opacity={p}>
      {AGE_BANDS.map((t, i) => {
        const x = 150 + i * 260;
        const on = i === active;
        return (
          <g key={i} transform={`translate(${x} 250) scale(${on ? 1.15 : 0.9})`}>
            <rect x={-110} y={-60} width={220} height={110} rx={18} fill={on ? C.red : i < active ? YAS_OK : C.cream} stroke={C.ink} strokeWidth={7} />
            <text x={0} y={22} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={70} fill={on || i < active ? C.cream : C.ink}>
              {t}
            </text>
          </g>
        );
      })}
    </g>
  ) : null;

// Küçük bilgi kartı: başlık + simge (çizim fonksiyonu)
const TipCard: React.FC<{ x: number; y: number; p: number; text: string; color?: string; children?: React.ReactNode }> = ({ x, y, p, text, color = YAS_OK, children }) =>
  p > 0 ? (
    <g transform={`translate(${x} ${y}) scale(${p})`}>
      <rect x={-170} y={-150} width={340} height={300} rx={24} fill={C.cream} stroke={C.ink} strokeWidth={8} />
      <g transform="translate(0 -30)">{children}</g>
      <text x={0} y={120} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={text.length > 12 ? 48 : 60} fill={color}>
        {text}
      </text>
    </g>
  ) : null;

const Ball: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 50 }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#f2a33a" stroke={C.ink} strokeWidth={7} />
    <path d={`M${x - r} ${y} Q${x} ${y - r * 0.5} ${x + r} ${y} M${x} ${y - r} Q${x + r * 0.4} ${y} ${x} ${y + r}`} stroke={C.ink} strokeWidth={5} fill="none" />
  </g>
);

// "Beş ile yedi yaş arası: oyun zamanı. Koşmak, zıplamak, tırmanmak; hepsi antrenman."
// Ormanda küçük avatar top oynar, zıplar; kartlar: koşmak, zıplamak, tırmanmak (oyun parkı); "hepsi antrenman" yıldızı.
const YasBant1: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const hop = Math.abs(Math.sin(f / 8)) * 50;
  const ballX = 700 + Math.sin(f / 14) * 160;
  const ballY = YAS_FLOOR - 50 - Math.abs(Math.sin(f / 7)) * 220;
  const all = pop(f, w(10) - 2, 12);
  return (
    <>
      <Forest />
      <AgeRuler active={0} p={pop(f, 0, 10)} />
      <HandText x={540} y={410} text="oyun zamanı" size={120} p={tw(f, w(5) - 2, w(6) + 6)} color={C.red} rotate={-3} />
      <Person x={180} y={YAS_FLOOR - 40 - hop} s={yasScale(6)} shirt={YAS_SHIRT} belly={0.3} armL={ARMS_UP} armR={[60, -20]} legL={hop > 20 ? { lift: 0.3, spread: 10 } : {}} legR={hop > 20 ? { lift: 0.3, spread: 10 } : {}} mouth="grin" />
      <Ball x={ballX} y={ballY} r={46} />
      <TipCard x={190} y={610} p={pop(f, w(7) - 2, 10)} text="koşmak">
        <Footprint x={-40} y={10} s={1.4} rot={-20} />
        <Footprint x={40} y={-30} s={1.4} rot={-20} />
      </TipCard>
      <TipCard x={540} y={610} p={pop(f, w(8) - 2, 10)} text="zıplamak">
        <path d="M-60 40 Q0 -110 60 40" stroke={YAS_OK} strokeWidth={10} fill="none" strokeDasharray="18 12" />
        <circle cx={0} cy={-40} r={22} fill={YAS_SHIRT} stroke={C.ink} strokeWidth={5} />
      </TipCard>
      <TipCard x={890} y={610} p={pop(f, w(9) - 2, 10)} text="tırmanmak">
        <path d="M-50 60 L-50 -80 M50 60 L50 -80 M-50 30 L50 30 M-50 -10 L50 -10 M-50 -50 L50 -50" stroke={C.ink} strokeWidth={9} />
      </TipCard>
      {all > 0 ? (
        <g transform={`translate(640 900) scale(${all}) rotate(-3)`}>
          <rect x={-300} y={-70} width={600} height={120} rx={20} fill={YAS_OK} stroke={C.ink} strokeWidth={8} />
          <text x={0} y={22} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={70} fill={C.cream}>
            hepsi antrenman ✓
          </text>
        </g>
      ) : null}
    </>
  );
};




// Spor dalı simgeleri: basketbol, voleybol, hentbol, tenis (raket + top)
type SportKind = "basket" | "voleybol" | "hentbol" | "tenis";
const SPORTS: { k: SportKind; name: string }[] = [
  { k: "basket", name: "basketbol" },
  { k: "voleybol", name: "voleybol" },
  { k: "hentbol", name: "hentbol" },
  { k: "tenis", name: "tenis" },
];
const SportIcon: React.FC<{ k: SportKind; x: number; y: number; s?: number; rot?: number }> = ({ k, x, y, s = 1, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`} stroke={C.ink} strokeWidth={6} strokeLinecap="round">
    {k === "basket" ? (
      <g>
        <circle r={60} fill="#e07a2e" />
        <path d="M-60 0 L60 0 M0 -60 L0 60 M-42 -42 Q-10 0 -42 42 M42 -42 Q10 0 42 42" fill="none" />
      </g>
    ) : k === "voleybol" ? (
      <g>
        <circle r={60} fill="#fbf3e2" />
        <path d="M0 -60 Q-10 0 40 44 M-58 12 Q0 10 30 -52 M-30 52 Q20 10 58 -16" fill="none" stroke="#2f5fa8" strokeWidth={7} />
        <circle r={60} fill="none" />
      </g>
    ) : k === "hentbol" ? (
      <g>
        <circle r={50} fill="#f2c94c" />
        <path d="M-50 0 Q0 -26 50 0 M-24 -44 Q-10 0 -24 44 M24 -44 Q10 0 24 44" fill="none" stroke="#2f5fa8" strokeWidth={7} />
        <circle r={50} fill="none" />
      </g>
    ) : (
      <g>
        <ellipse cx={-14} cy={-24} rx={40} ry={52} fill="#fbf3e2" />
        <path d="M-40 -40 L12 -8 M-50 -20 L22 -30 M-34 4 L0 -66" stroke={C.ink} strokeWidth={3} opacity={0.6} />
        <path d="M6 18 L40 66" strokeWidth={14} />
        <circle cx={46} cy={-40} r={20} fill="#d7e64a" />
      </g>
    )}
  </g>
);
// Spor kartı: simge + ad
const SportCard: React.FC<{ k: SportKind; name: string; x: number; y: number; p: number; dim?: number }> = ({ k, name, x, y, p, dim = 0 }) =>
  p > 0 ? (
    <g transform={`translate(${x} ${y}) scale(${p})`} opacity={1 - 0.75 * dim}>
      <rect x={-130} y={-130} width={260} height={260} rx={24} fill={C.cream} stroke={C.ink} strokeWidth={8} />
      <SportIcon k={k} x={0} y={-25} />
      <text x={0} y={100} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={52} fill={YAS_OK}>
        {name}
      </text>
    </g>
  ) : null;
const Heart: React.FC<{ x: number; y: number; s?: number; o?: number }> = ({ x, y, s = 1, o = 1 }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 18 C-30 -6 -26 -30 -10 -30 C-3 -30 0 -24 0 -20 C0 -24 3 -30 10 -30 C26 -30 30 -6 0 18 Z" fill={C.red} stroke={C.ink} strokeWidth={4} opacity={o} />
);
const TEAM_SHIRTS = ["#2f5fa8", "#d9a441", "#5e9a3c"];

// "Sekiz ile on iki: kendi vücut ağırlığıyla çalışır, tekniği öğrenir. Kaslar pek büyümez ama güç artar."
// Biraz büyümüş avatar; kartlar "kendi ağırlığın" (dambıl üstü çizili) ve "teknik" (lacivert tik); kas hücresi merceği:
// hücreler büyümez ama tek tek yanar → "güç ↑".
const YasBant2: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const act = 0.15 + 0.85 * tw(f, w(13), w(15) + 8);
  const lens = pop(f, w(10) - 2, 12);
  return (
    <>
      <rect x={-200} y={PY} width={1480} height={800} fill="#d9c6a0" opacity={0.55} />
      <path d={`M-200 ${PY} L1280 ${PY}`} stroke={C.ink} strokeWidth={6} />
      <AgeRuler active={1} p={1} />
      <Person x={260} y={PY} s={yasScale(10)} shirt={YAS_SHIRT} belly={0.3} armL={[12, 0]} armR={[12, 0]} mouth="smile" />
      <TipCard x={620} y={560} p={pop(f, w(4) - 2, 10) * (1 - tw(f, w(10) - 6, w(10)))} text="kendi ağırlığın">
        <Dumbbell x={0} y={0} s={0.6} />
        <Cross x={0} y={0} size={70} p={tw(f, w(5), w(6) + 4)} />
      </TipCard>
      <TipCard x={900} y={560} p={pop(f, w(8) - 2, 10) * (1 - tw(f, w(10) - 6, w(10)))} text="teknik">
        <path d="M-60 0 L-15 45 L65 -55" stroke={YAS_OK} strokeWidth={18} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </TipCard>
      <CellLens x={760} y={720} r={230} p={lens} act={act} grow={0} pulse={f / 4} />
      {lens > 0 ? <HandText x={760} y={440} text="kas hücreleri" size={76} p={lens} rotate={-3} /> : null}
      {lens > 0 ? <HandText x={760} y={1020} text={f >= w(13) ? "büyümez · güç ↑" : "boyları aynı"} size={70} p={tw(f, w(11), w(12) + 6)} color={YAS_OK} rotate={-4} /> : null}
    </>
  );
};

// "On üç on beş: ergenlik başlar, kaslar büyümeye başlar. Sporunun yanına, bilen birinin eşliğinde hafif ağırlık eklenebilir."
// Ergen avatar; kas hücreleri büyür; yanına koç gelir; masada hafif dambıl.
const YasBant3: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const grow = tw(f, w(6) - 2, w(8) + 8);
  const lensOut = tw(f, w(11) - 6, w(11));
  const gear = pop(f, w(14) - 2, 12);
  const coach = tw(f, w(11) - 4, w(13) + 4);
  return (
    <>
      <rect x={-200} y={PY} width={1480} height={800} fill="#d9c6a0" opacity={0.55} />
      <path d={`M-200 ${PY} L1280 ${PY}`} stroke={C.ink} strokeWidth={6} />
      <AgeRuler active={2} p={1} />
      <Person x={260} y={PY} s={yasScale(14)} shirt={YAS_SHIRT} belly={0.3} limbW={1 + 0.2 * grow} mouth="smile" />
      <g opacity={1 - lensOut}>
        <CellLens x={760} y={700} r={230} p={pop(f, 0, 12)} act={1} grow={grow} pulse={f / 4} />
        <HandText x={760} y={420} text="ergenlik: hücreler büyür" size={60} p={tw(f, w(4) - 2, w(5) + 6)} color={YAS_OK} rotate={-3} />
      </g>
      {gear > 0 ? (
        <g transform={`translate(760 ${PY}) scale(${gear})`}>
          <path d="M-220 -220 L220 -220 M-190 -220 L-190 0 M190 -220 L190 0" stroke={C.ink} strokeWidth={12} strokeLinecap="round" />
          <Dumbbell x={0} y={-256} s={0.5} />
          <text x={0} y={-330} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={56} fill={C.ink}>
            hafif
          </text>
        </g>
      ) : null}
      {coach > 0 ? (
        <Person x={lerp(1250, 560, coach)} y={PY} s={0.9} belly={0.45} shirt="#c98f3c" armL={[lerp(10, 60, coach), lerp(0, -30, coach)]} armR={[12, 0]} mouth="smile" lookY={4}>
          <circle cx={0} cy={-540} r={14} fill="#c0c0c0" stroke={C.ink} strokeWidth={4} />
        </Person>
      ) : null}
      {coach > 0.8 ? <HandText x={560} y={520} text="koç eşliğinde ✓" size={90} p={tw(coach, 0.8, 1)} color={YAS_OK} rotate={-4} /> : null}
    </>
  );
};

// "On altıdan sonra: ağırlık yavaş yavaş artırılır; yine teknik önce gelir."
// Genç avatar; yanında dambıllar küçükten büyüğe sırayla belirir (yavaş yavaş), merdiven ok; "teknik önce" lacivert damga.
const YasBant4: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const steps = tw(f, w(3) - 2, w(6) + 8);
  const tech = pop(f, w(8) - 2, 12);
  return (
    <>
      <rect x={-200} y={PY} width={1480} height={800} fill="#d9c6a0" opacity={0.55} />
      <path d={`M-200 ${PY} L1280 ${PY}`} stroke={C.ink} strokeWidth={6} />
      <AgeRuler active={3} p={1} />
      <Person x={260} y={PY} s={yasScale(17)} shirt={YAS_SHIRT} belly={0.3} limbW={1.2} mouth="smile" />
      {[0, 1, 2, 3].map((i) => {
        const q = tw(steps, i / 4, (i + 1) / 4);
        return q > 0 ? (
          <g key={i} transform={`translate(${560 + i * 140} ${PY - 40 - i * 90}) scale(${q})`}>
            <rect x={-60} y={0} width={120} height={40 + i * 90} fill="#cfae78" stroke={C.ink} strokeWidth={6} />
            <Dumbbell x={0} y={-30} s={0.3 + i * 0.1} />
          </g>
        ) : null;
      })}
      {steps > 0.3 ? <Pointer x1={540} y1={PY - 180} x2={1000} y2={PY - 560} p={steps} color={YAS_OK} w={10} /> : null}
      {steps > 0.3 ? <HandText x={760} y={640} text="yavaş yavaş" size={90} p={steps} color={YAS_OK} rotate={-8} /> : null}
      {tech > 0 ? (
        <g transform={`translate(540 430) rotate(-6) scale(${tech})`}>
          <rect x={-260} y={-70} width={520} height={130} rx={18} fill="none" stroke={YAS_OK} strokeWidth={14} />
          <text x={0} y={30} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={90} fill={YAS_OK}>
            TEKNİK ÖNCE
          </text>
        </g>
      ) : null}
    </>
  );
};

// "Ve spor sadece salondan ibaret değil. Basketbol, voleybol, hentbol, tenis; bunların yaşı yok. Üstelik sana bir takım ve
// arkadaşlar kazandırır."
// Dambıl "sadece salon?" → çizilir; dört spor kartı açılır; "yaşı yok": üç pano 5 yaş (basket), 25 yaş (voleybol), 50 yaş (tenis);
// sonunda hepsi el sallar, kalpler.
const YasSporlar: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const gym = pop(f, w(1) - 2, 10) * (1 - tw(f, w(6) - 6, w(6)));
  const cards = (i: number) => pop(f, w(6 + i) - 2, 10);
  const panel = (i: number) => pop(f, [w(10), w(11), w(12)][i] - 2, 12);
  const friends = tw(f, w(13) - 2, w(16) + 6);
  const bounce = (k: number) => Math.abs(Math.sin(f / 7 + k)) * 40;
  const P = [
    { x: 190, age: "5 yaş", s: yasScale(6), belly: 0.3, k: "basket" as SportKind },
    { x: 540, age: "25 yaş", s: 0.68, belly: 0.3, k: "voleybol" as SportKind },
    { x: 890, age: "50 yaş", s: 0.68, belly: 0.65, k: "tenis" as SportKind },
  ];
  return (
    <>
      <rect x={-200} y={PY} width={1480} height={800} fill="#d9c6a0" opacity={0.55} />
      <path d={`M-200 ${PY} L1280 ${PY}`} stroke={C.ink} strokeWidth={6} />
      {gym > 0 ? (
        <g transform={`translate(540 620) scale(${gym})`}>
          <Dumbbell x={0} y={0} s={1.2} />
          <text x={0} y={-150} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={100} fill={C.ink}>
            sadece salon?
          </text>
          <Cross x={0} y={0} size={140} p={tw(f, w(4), w(5) + 6)} />
        </g>
      ) : null}
      {SPORTS.map((sp, i) => (
        <SportCard key={sp.k} k={sp.k} name={sp.name} x={150 + i * 260} y={300} p={cards(i) * 0.85} />
      ))}
      {P.map((q, i) => {
        const p = panel(i);
        if (p <= 0) return null;
        const up = friends > 0.3 ? ARMS_UP : ([70, -20] as Arm);
        return (
          <g key={i} opacity={Math.min(1, p)}>
            <rect x={q.x - 165} y={PY - 790} width={330} height={790} rx={20} fill={C.cream} opacity={0.55} stroke={C.ink} strokeWidth={6} />
            <text x={q.x} y={PY - 720} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={70} fill={C.red}>
              {q.age}
            </text>
            <Person x={q.x} y={PY} s={q.s * p} shirt={i === 0 ? YAS_SHIRT : TEAM_SHIRTS[i]} belly={q.belly} armL={friends > 0.3 ? up : [12, 0]} armR={up} mouth="grin" />
            <SportIcon k={q.k} x={q.x + 100} y={PY - 330 - bounce(i)} s={0.55} rot={q.k === "tenis" ? 0 : f * 4} />
          </g>
        );
      })}
      {friends > 0 ? [0, 1, 2, 3, 4].map((i) => <Heart key={i} x={160 + i * 190} y={PY - 700 - ((f * 3 + i * 37) % 140)} s={1.5} o={friends} />) : null}
      {friends > 0.5 ? <HandText x={540} y={500} text="+ takım + arkadaş" size={110} p={tw(friends, 0.5, 1)} color={YAS_OK} rotate={-3} /> : null}
    </>
  );
};

/* ---------- 08 sauna eşofmanı: sahneler ---------- */
// Avatar baştan ayağa parlak gümüş sauna eşofmanı giyer (Person/SideRunner `suit`). Terle giden su, yağ değil.

const SUIT = "#b9c2cc";
const SAUNA_OK = "#1f4e8c";

// Vücuttan damlayan ter: (x, y) çevresinde n damla, yukarıdan aşağı akar
const Sweat: React.FC<{ f: number; x: number; y: number; w: number; h: number; n?: number; o?: number }> = ({ f, x, y, w, h, n = 8, o = 1 }) => (
  <g opacity={o}>
    {Array.from({ length: n }, (_, i) => {
      const px = x + (random(`sw${i}`) - 0.5) * w;
      const t = ((f * (2.2 + random(`sv${i}`)) + random(`sp${i}`) * h) % h) / h;
      return <Drop key={i} x={px} y={y + t * h} s={0.8} o={0.85 * (1 - t * 0.6)} />;
    })}
  </g>
);

// Su şişesi: level 0..1
const Bottle: React.FC<{ x: number; y: number; s?: number; level: number; rot?: number; label?: string }> = ({ x, y, s = 1, level, rot = 0, label }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <clipPath id="btl">
      <rect x={-70} y={-190} width={140} height={260} rx={30} />
    </clipPath>
    <rect x={-70} y={-190} width={140} height={260} rx={30} fill="#eef5f8" stroke={C.ink} strokeWidth={8} />
    <rect x={-70} y={70 - 260 * level} width={140} height={260 * level} fill={C.water} opacity={0.85} clipPath="url(#btl)" />
    <rect x={-34} y={-236} width={68} height={50} rx={10} fill={SAUNA_OK} stroke={C.ink} strokeWidth={7} />
    {label ? (
      <text x={0} y={-40} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={64} fill={C.ink}>
        {label}
      </text>
    ) : null}
  </g>
);

// "Sauna eşofmanıyla koştun, tartıda bir kilo eksiksin. Peki o kilo yağ mıydı? Hayır. Sadece su."
// Gümüş eşofmanla pistte terleyerek koşu → tartıya çıkar, ekran 72,0 → 71,0 → "yağ?" çizilir → kocaman su damlası.
const SaunaHook: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const cut = w(3) - 4;
  if (f < cut) {
    const { off, ph } = runIntegral(f, () => 1);
    const pose = runPose(ph, 1);
    return (
      <>
        <SideTrack off={off} />
        <SideRunner f={f} x={430} y={TRACK_Y} s={1.4} pose={pose} suit={SUIT} face="worry" sweat />
        <Sweat f={f} x={470} y={1050} w={260} h={560} n={12} />
        <HandText x={540} y={330} text="sauna eşofmanı" size={110} p={tw(f, 0, w(1) + 6)} color={C.red} rotate={-3} />
      </>
    );
  }
  const drop = tw(f, w(5) - 2, w(6) + 6);
  const kg = lerp(72, 71, drop);
  const fat = pop(f, w(10) - 2, 10);
  const no = tw(f, w(12) - 2, w(12) + 8);
  const water = pop(f, w(14) - 2, 12);
  return (
    <>
      <rect x={-200} y={PY} width={1480} height={800} fill="#d9c6a0" opacity={0.55} />
      <path d={`M-200 ${PY} L1280 ${PY}`} stroke={C.ink} strokeWidth={6} />
      <Bathroom x={PX} y={PY + 6} value={`${kg.toFixed(1)} kg`} />
      <Person x={PX} y={PY - 48} s={0.82} suit={SUIT} belly={0.4} mouth={drop > 0.8 ? "grin" : "o"} eyes={drop > 0.2 && drop < 0.8 ? "wide" : "open"} lookY={10} />
      <Sweat f={f} x={PX} y={780} w={240} h={500} n={8} o={1 - water * 0.6} />
      <KgDisplay x={540} y={330} p={pop(f, cut, 12)} value={`${kg.toFixed(1)}`} color={drop > 0.95 ? "#9fe0a8" : "#e8f3d8"} />
      {drop > 0.95 ? <HandText x={850} y={520} text="−1 kg" size={100} p={tw(f, w(6), w(6) + 8)} color="#3f7d4f" rotate={-6} /> : null}
      {fat > 0 && water <= 0 ? (
        <g transform={`translate(240 640) scale(${1.35 * fat})`}>
          <ellipse cx={0} cy={0} rx={120} ry={90} fill={C.fat} stroke={C.ink} strokeWidth={8} />
          <text x={0} y={22} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={70} fill={C.ink}>
            yağ?
          </text>
          {no > 0 ? <Cross x={0} y={0} size={110} p={no} /> : null}
        </g>
      ) : null}
      {water > 0 ? (
        <g transform={`translate(240 640) scale(${1.35 * water})`}>
          <path d="M0 -150 C70 -40 110 10 110 60 C110 125 60 160 0 160 C-60 160 -110 125 -110 60 C-110 10 -70 -40 0 -150 Z" fill={C.water} stroke={C.ink} strokeWidth={9} />
          <text x={0} y={90} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={90} fill={C.cream}>
            su
          </text>
        </g>
      ) : null}
    </>
  );
};

// Kondisyon bisikleti (önden sade çizim): (x, y) zemin noktası
const ExBike: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} stroke={C.ink} strokeWidth={9} strokeLinecap="round" fill="none">
    <path d="M-150 0 L150 0" />
    <path d="M0 0 L0 -330 M-60 -330 L60 -330" />
    <path d="M0 -520 L0 -330 M-90 -540 L90 -540" />
    <circle cx={0} cy={-250} r={70} fill="#4b4b55" />
  </g>
);

// "Bin dokuz yüz doksan yedi, Amerika. Üniversiteli bir güreşçi, maçtan önce sekiz kilo vermek zorunda."
// Eski fotoğraf: mayolu genç güreşçi tartıda; üstte "1997", ekranda "hedef: −8 kg" yanıp söner.
const SaunaTarih1: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const goal = pop(f, w(11) - 2, 12);
  const blink = goal > 0.9 ? 0.75 + 0.25 * Math.sin(f / 3) : 1;
  return (
    <>
      <rect x={-200} y={-200} width={1480} height={PY + 200} fill="#e9d6b0" />
      <rect x={-200} y={PY} width={1480} height={800} fill="#c9a06c" />
      <path d={`M-200 ${PY} L1280 ${PY}`} stroke={C.ink} strokeWidth={6} />
      <HandText x={540} y={250} text="1997 · Amerika" size={130} p={tw(f, 0, w(5) + 4)} rotate={-4} />
      <Bathroom x={PX} y={PY + 6} value="--.- kg" />
      <Person x={PX} y={PY - 48} s={0.8} shirt="#2f4f7f" belly={0.15} armL={[18, 0]} armR={[18, 0]} mouth="flat" lookY={8} />
      <g opacity={blink}>
        <KgDisplay x={540} y={520} p={goal} value="−8 kg" color="#f2a3a3" />
      </g>
      {goal > 0.5 ? <HandText x={540} y={390} text="maçtan önce" size={80} p={tw(goal, 0.5, 1)} color={C.red} rotate={-3} /> : null}
      <OldPhoto o={0.85} />
    </>
  );
};

// "Eşofmanının altına plastik bir giysi giyiyor ve iki saat bisiklet çeviriyor. Sonra yere yığılıyor.
// Vücudu susuz kalmıştı; kurtarılamadı."
// Isıtılmış oda: plastik giysili güreşçi kondisyon bisikleti çevirir, ter akar, saat iki tur döner, termometre kırmızı →
// bisikletten yere yığılır, ekran yavaşça kararır; boş bir su damlası silueti.
const SaunaTarih2: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const suit = tw(f, w(1) - 2, w(4) + 4);
  const ride = f >= w(5) - 4 && f < w(12) - 2;
  const hours = tw(f, w(7) - 2, w(10) + 6);
  const fall = tw(f, w(12) - 4, w(13) + 6);
  const dark = tw(f, w(14), w(17) + 10);
  const empty = pop(f, w(15) - 2, 14);
  const pedal = ride ? Math.sin(f / 3) : 0;
  const X = 470;
  const seatY = PY - 251; // oturuş: kalça selede
  return (
    <>
      <rect x={-200} y={-200} width={1480} height={PY + 200} fill="#ead2b0" />
      <rect x={-200} y={-200} width={1480} height={PY + 200} fill={C.red} opacity={0.12 * hours} />
      <rect x={-200} y={PY} width={1480} height={800} fill="#c9a06c" />
      <path d={`M-200 ${PY} L1280 ${PY}`} stroke={C.ink} strokeWidth={6} />
      {/* ısıtıcı ve termometre */}
      <g transform="translate(130 1120)">
        <rect x={-70} y={-180} width={140} height={200} rx={12} fill="#9a7b6a" stroke={C.ink} strokeWidth={7} />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M${-50 + i * 33} -160 L${-50 + i * 33} 0`} stroke={C.glow} strokeWidth={10} opacity={0.6 + 0.4 * hours} />
        ))}
      </g>
      <g transform="translate(940 700)">
        <rect x={-30} y={-280} width={60} height={320} rx={30} fill={C.cream} stroke={C.ink} strokeWidth={7} />
        <rect x={-16} y={30 - 300 * (0.4 + 0.55 * hours)} width={32} height={300 * (0.4 + 0.55 * hours)} rx={16} fill={C.red} />
        <circle cx={0} cy={50} r={48} fill={C.red} stroke={C.ink} strokeWidth={7} />
      </g>
      {/* saat: iki tur */}
      <g transform="translate(780 330)" opacity={tw(f, w(7) - 4, w(7) + 4)}>
        <circle cx={0} cy={0} r={95} fill={C.cream} stroke={C.ink} strokeWidth={8} />
        <path d={`M0 0 L${Math.sin(hours * Math.PI * 4) * 72} ${-Math.cos(hours * Math.PI * 4) * 72}`} stroke={C.red} strokeWidth={8} strokeLinecap="round" />
        <path d={`M0 0 L${Math.sin(hours * 1.05) * 48} ${-Math.cos(hours * 1.05) * 48}`} stroke={C.ink} strokeWidth={11} strokeLinecap="round" />
        <text x={0} y={160} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={70} fill={C.ink}>
          2 saat
        </text>
      </g>
      <ExBike x={X} y={PY} s={1} />
      <g transform={`rotate(${80 * fall} ${X - 60} ${PY})`}>
        <Person x={X} y={lerp(seatY, PY, fall)} s={0.78} suit={suit > 0.5 ? SUIT : "#7d8796"} belly={0.15} armL={[24, -30]} armR={[24, -30]} legL={{ lift: 0.45 + 0.25 * pedal }} legR={{ lift: 0.45 - 0.25 * pedal }} mouth={fall > 0.5 ? "flat" : "worry"} eyes={fall > 0.5 ? "closed" : "open"} lookY={6} blush={0.4 + 0.5 * hours} />
      </g>
      {ride || (fall > 0 && fall < 0.3) ? <Sweat f={f} x={X} y={PY - 900} w={240} h={600} n={10} o={0.4 + 0.6 * hours} /> : null}
      {suit > 0 && suit < 1 ? <HandText x={760} y={560} text="plastik giysi" size={80} p={suit} color={C.red} rotate={-4} /> : null}
      <rect x={-200} y={-200} width={1480} height={2400} fill="#1a120b" opacity={0.55 * dark} />
      {empty > 0 ? (
        <g transform={`translate(540 560) scale(${empty})`}>
          <path d="M0 -150 C70 -40 110 10 110 60 C110 125 60 160 0 160 C-60 160 -110 125 -110 60 C-110 10 -70 -40 0 -150 Z" fill="none" stroke={C.cream} strokeWidth={10} strokeDasharray="22 14" />
        </g>
      ) : null}
      <OldPhoto o={0.8} />
    </>
  );
};

// "O, otuz üç gün içinde aynı yolla ölen üçüncü güreşçiydi. Ertesi ay bu giysiler yasaklandı."
// Takvim günleri akar (1 → 33), üç gri silüet tek tek belirir; askıdaki plastik giysiye kırmızı "YASAK" damgası, "1998".
const SaunaTarih3: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const days = tw(f, w(1) - 2, w(4) + 4);
  const ban = tw(f, w(10) - 4, w(11) + 6);
  const stamp = pop(f, w(14) - 2, 10);
  const appear = (k: number) => tw(f, [w(1), w(5), w(8)][k] - 2, [w(1), w(5), w(8)][k] + 8);
  return (
    <>
      <rect x={-200} y={-200} width={1480} height={PY + 200} fill="#e9d6b0" />
      <rect x={-200} y={PY} width={1480} height={800} fill="#c9a06c" />
      <path d={`M-200 ${PY} L1280 ${PY}`} stroke={C.ink} strokeWidth={6} />
      <g opacity={1 - ban}>
        <g transform="translate(540 430)">
          <rect x={-170} y={-150} width={340} height={300} rx={18} fill={C.cream} stroke={C.ink} strokeWidth={9} />
          <rect x={-170} y={-150} width={340} height={80} rx={18} fill={C.red} stroke={C.ink} strokeWidth={9} />
          <text x={0} y={90} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={140} fill={C.ink}>
            {Math.max(1, Math.round(33 * days))}
          </text>
          <text x={0} y={-90} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={50} fill={C.cream}>
            gün
          </text>
        </g>
        {[0, 1, 2].map((k) => (
          <g key={k} opacity={0.75 * appear(k)}>
            <Person x={260 + k * 280} y={PY} s={0.5} suit="#8f8f8f" belly={0.2} eyes="closed" mouth="flat" />
          </g>
        ))}
        {appear(2) > 0.5 ? <HandText x={540} y={760} text="3. güreşçi" size={90} p={tw(appear(2), 0.5, 1)} color={C.red} rotate={-3} /> : null}
      </g>
      {ban > 0 ? (
        <g opacity={ban}>
          <path d="M540 520 L540 470 M440 560 L540 470 L640 560" stroke={C.ink} strokeWidth={8} fill="none" strokeLinecap="round" />
          <Person x={540} y={1180} s={0.75} suit={SUIT} belly={0.3} eyes="closed" mouth="flat" />
          <HandText x={540} y={1300} text="1998" size={110} p={ban} rotate={-3} />
        </g>
      ) : null}
      {stamp > 0 ? (
        <g transform={`translate(540 860) rotate(-14) scale(${stamp})`}>
          <rect x={-250} y={-95} width={500} height={170} rx={16} fill="none" stroke={C.red} strokeWidth={16} />
          <text x={0} y={38} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={140} fill={C.red}>
            YASAK
          </text>
        </g>
      ) : null}
      <OldPhoto o={0.85} />
    </>
  );
};


// "Çünkü terle giden yağ değil, su. Bir şişe su içince o kilo geri gelir."
// Ter damlaları ölçü kabında toplanır (ter: 1 L); "yağ" çizilir; avatar masadaki TEMİZ şişeyi alıp içer, tartı 71,0 → 72,0.
const SaunaSu: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const fill = tw(f, w(1) - 4, w(5) + 4);
  const noFat = tw(f, w(3) - 2, w(4) + 6);
  const drink = tw(f, w(8) - 4, w(9) + 6);
  const level = 1 - 0.9 * tw(f, w(9), w(11) + 4);
  const back = tw(f, w(11) - 2, w(13) + 4);
  const X = 380;
  const Y = PY + 40;
  const arm: Arm = [lerp(12, 120, drink), lerp(0, -205, drink)];
  const hand = armPoints(1, arm)[2];
  return (
    <>
      <rect x={-200} y={Y} width={1480} height={800} fill="#d9c6a0" opacity={0.55} />
      <path d={`M-200 ${Y} L1280 ${Y}`} stroke={C.ink} strokeWidth={6} />
      <Person x={X} y={Y} s={0.82} suit={SUIT} belly={0.4} armR={arm} mouth={drink > 0.6 ? "o" : "flat"} eyes={drink > 0.6 ? "closed" : "open"} lookY={6}>
        {drink > 0.02 ? <Bottle x={hand[0]} y={hand[1] - 40} s={1.1} level={level} rot={lerp(0, -120, drink)} /> : null}
      </Person>
      {/* ter: vücuttan şişeye akan damlalar */}
      {fill > 0 && f < w(6) ? (
        <g>
          {Array.from({ length: 8 }, (_, i) => {
            const t = ((f * 2.5 + i * 13) % 34) / 34;
            const x0 = X + (i % 2 ? 80 : -60) * 0.82;
            const y0 = Y - 480 + (i % 3) * 60;
            return <Drop key={i} x={lerp(x0, 700, t)} y={lerp(y0, Y - 170, t) - Math.sin(t * Math.PI) * 120} s={0.9} o={1 - t * 0.3} />;
          })}
        </g>
      ) : null}
      {/* ter ölçü kabında kalır; içilen su masadaki temiz şişeden */}
      <g transform={`translate(700 ${Y})`}>
        <clipPath id="beaker">
          <path d="M-90 -180 L-75 0 L75 0 L90 -180 Z" />
        </clipPath>
        <rect x={-100} y={-180 * fill} width={200} height={180 * fill} fill="#b9d3df" opacity={0.9} clipPath="url(#beaker)" />
        <path d="M-90 -180 L-75 0 L75 0 L90 -180" fill="none" stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
        {[1, 2, 3].map((k) => <path key={k} d={`M-82 ${-k * 45} l26 0`} stroke={C.ink} strokeWidth={4} />)}
        <text x={0} y={-200} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={56} fill={C.ink} opacity={fill}>
          ter: 1 L
        </text>
      </g>
      <g transform={`translate(950 ${Y})`}>
        <path d="M-90 -200 L90 -200 M-70 -200 L-70 0 M70 -200 L70 0" stroke={C.ink} strokeWidth={10} strokeLinecap="round" />
        {drink < 0.02 ? <Bottle x={0} y={-280} s={0.55} level={1} /> : null}
      </g>
      {noFat > 0 ? (
        <g>
          <HandText x={760} y={520} text="yağ" size={130} p={1} color={C.fatDark} rotate={-4} />
          <Cross x={760} y={475} size={85} p={noFat} />
          <HandText x={760} y={680} text="su ✓" size={120} p={tw(f, w(5) - 2, w(5) + 6)} color={SAUNA_OK} rotate={-4} />
        </g>
      ) : null}
      <KgDisplay x={760} y={330} p={pop(f, w(11) - 4, 10)} value={lerp(71, 72, back).toFixed(1)} color={back > 0.95 ? "#e8b18a" : "#e8f3d8"} />
    </>
  );
};

// Yağ deposu: sarı, kabarık bir kütle (s = boyut)
const FatBlob: React.FC<{ x: number; y: number; s: number; label?: string }> = ({ x, y, s, label }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[[-60, -30, 90], [50, -40, 100], [0, 40, 110], [-80, 50, 70], [90, 50, 70]].map(([cx, cy, r], i) => (
      <circle key={i} cx={cx} cy={cy} r={r} fill={C.fat} stroke={C.ink} strokeWidth={7} />
    ))}
    {[[-60, -30, 90], [50, -40, 100], [0, 40, 110], [-80, 50, 70], [90, 50, 70]].map(([cx, cy, r], i) => (
      <circle key={`f${i}`} cx={cx} cy={cy} r={r - 4} fill={C.fat} />
    ))}
    {label ? (
      <text x={0} y={30} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={70} fill={C.ink}>
        {label}
      </text>
    ) : null}
  </g>
);

// "Bir kilo yağı eritmek için saatlerce hareket etmen gerekir. Ter eşofmanı bunu hızlandırmaz."
// Üstte "1 kg yağ" kütlesi, yanında hızla dönen saat; avatar (normal kıyafet) koşar, kütle yavaş yavaş küçülür.
// Sonra gümüş eşofmanla sırılsıklam koşar: kütle hiç değişmez, "ter ≠ yağ".
const SaunaYag: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const hours = tw(f, w(5) - 2, w(8) + 6);
  const suitOn = f >= w(9) - 4;
  const blob = lerp(1, 0.72, hours);
  const { off, ph } = runIntegral(f, () => 1);
  const pose = runPose(ph, 1);
  const neq = pop(f, w(12) - 2, 12);
  return (
    <>
      <SideTrack off={off} />
      <FatBlob x={400} y={560} s={blob} label="1 kg yağ" />
      <g transform="translate(820 520)">
        <circle cx={0} cy={0} r={130} fill={C.cream} stroke={C.ink} strokeWidth={9} />
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d={`M${Math.sin((i * Math.PI) / 6) * 105} ${-Math.cos((i * Math.PI) / 6) * 105} L${Math.sin((i * Math.PI) / 6) * 120} ${-Math.cos((i * Math.PI) / 6) * 120}`} stroke={C.ink} strokeWidth={6} />
        ))}
        <path d={`M0 0 L${Math.sin(hours * 50) * 60} ${-Math.cos(hours * 50) * 60}`} stroke={C.ink} strokeWidth={12} strokeLinecap="round" />
        <path d={`M0 0 L${Math.sin(hours * 600) * 95} ${-Math.cos(hours * 600) * 95}`} stroke={C.red} strokeWidth={8} strokeLinecap="round" />
        <circle cx={0} cy={0} r={12} fill={C.ink} />
      </g>
      {hours > 0.05 && !suitOn ? <HandText x={820} y={760} text="saatlerce" size={90} p={hours} color={SAUNA_OK} rotate={-4} /> : null}
      <SideRunner f={f} x={430} y={TRACK_Y} s={1.4} pose={pose} suit={suitOn ? SUIT : undefined} face={suitOn ? "worry" : "smile"} sweat={suitOn} />
      {suitOn ? <Sweat f={f} x={470} y={1050} w={280} h={560} n={16} /> : null}
      {neq > 0 ? (
        <g transform={`translate(540 330) scale(${neq}) rotate(-4)`}>
          <text x={0} y={0} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={130} fill={C.red}>
            ter ≠ yağ
          </text>
        </g>
      ) : null}
    </>
  );
};

// "Üstelik vücudun ısınır; baş dönmesi, hatta bayılma yapabilir."
// Termometre kırmızıya çıkar, avatarın çevresinde sıcak dalgalar; başının etrafında yıldızlar döner, sendeler ve yere yığılır.
const SaunaTehlike: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const heat = tw(f, 0, w(2) + 6);
  const dizzy = tw(f, w(3) - 2, w(4) + 4);
  const faint = tw(f, w(6) - 2, w(7) + 4);
  const sway = Math.sin(f / 5) * 8 * dizzy * (1 - faint);
  const X = 470;
  const Y = PY + 40;
  return (
    <>
      <rect x={-200} y={-200} width={1480} height={2400} fill={C.red} opacity={0.12 * heat} />
      <rect x={-200} y={Y} width={1480} height={800} fill="#d9c6a0" opacity={0.55} />
      <path d={`M-200 ${Y} L1280 ${Y}`} stroke={C.ink} strokeWidth={6} />
      {/* sıcak dalgaları */}
      {[0, 1, 2, 3].map((i) => {
        const t = ((f + i * 12) % 48) / 48;
        const x = X - 220 + i * 140;
        return <path key={i} d={`M${x} ${Y - 200 - t * 500} q20 -30 0 -60 q-20 -30 0 -60 q20 -30 0 -60`} stroke={C.red} strokeWidth={8} fill="none" opacity={heat * (1 - t) * 0.7} strokeLinecap="round" />;
      })}
      <g transform={`rotate(${sway + -84 * faint} ${X} ${Y})`}>
        <Person x={X} y={Y} s={0.82} suit={SUIT} belly={0.4} mouth={dizzy > 0.3 ? "open" : "worry"} eyes={dizzy > 0.3 ? "dizzy" : "wide"} blush={0.4 + 0.5 * heat} />
        {dizzy > 0 && faint < 0.9
          ? [0, 1, 2].map((i) => {
              const a = f / 6 + (i * Math.PI * 2) / 3;
              return (
                <g key={i} opacity={dizzy}>
                  <Star x={X + Math.cos(a) * 110} y={Y - 760 + Math.sin(a) * 30} r={26} rot={f * 5} />
                </g>
              );
            })
          : null}
      </g>
      <Sweat f={f} x={X} y={Y - 600} w={260} h={500} n={8} o={1 - faint} />
      {/* termometre */}
      <g transform="translate(900 700)">
        <rect x={-34} y={-330} width={68} height={380} rx={34} fill={C.cream} stroke={C.ink} strokeWidth={8} />
        <rect x={-18} y={40 - 360 * (0.3 + 0.7 * heat)} width={36} height={360 * (0.3 + 0.7 * heat)} rx={18} fill={C.red} />
        <circle cx={0} cy={60} r={56} fill={C.red} stroke={C.ink} strokeWidth={8} />
      </g>
      {faint > 0.5 ? <HandText x={540} y={360} text="bayılma!" size={120} p={tw(faint, 0.5, 1)} color={C.red} rotate={-4} /> : null}
      {dizzy > 0.3 && faint <= 0.5 ? <HandText x={540} y={360} text="baş dönmesi" size={110} p={tw(dizzy, 0.3, 1)} color={C.red} rotate={-4} /> : null}
    </>
  );
};

// "Yani tartı yalan söylemez, ama her şeyi de söylemez. Bir dahaki sefere o bir kiloya bakarken hatırla:"
// Avatar tartıda; ekran −1 kg, altında iki etiket: "su −1" (mavi) ve "yağ 0" (sarı); avatar tartıya bakar → döngü (koşu).
const SaunaDongu: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const tags = tw(f, w(4) - 2, w(8) + 6);
  const look = tw(f, w(9), w(15));
  return (
    <CamK k={[[0, 1, 540, 1000], [w(9), 1, 540, 1000], [w(16), 1.12, 540, 900]]}>
      <rect x={-200} y={PY} width={1480} height={800} fill="#d9c6a0" opacity={0.55} />
      <path d={`M-200 ${PY} L1280 ${PY}`} stroke={C.ink} strokeWidth={6} />
      <Bathroom x={PX} y={PY + 6} value="71.0 kg" />
      <Person x={PX} y={PY - 48} s={0.82} suit={SUIT} belly={0.4} mouth="flat" lookY={lerp(0, 14, look)} tilt={lerp(0, 6, look)} />
      <KgDisplay x={540} y={330} p={pop(f, 0, 12)} value="−1 kg" color="#e8f3d8" />
      {tags > 0 ? (
        <g opacity={tags}>
          <g transform={`translate(330 560) scale(${tw(tags, 0, 0.5)})`}>
            <rect x={-140} y={-60} width={280} height={110} rx={16} fill={C.water} stroke={C.ink} strokeWidth={7} />
            <text x={0} y={22} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={70} fill={C.cream}>
              su −1
            </text>
          </g>
          <g transform={`translate(750 560) scale(${tw(tags, 0.5, 1)})`}>
            <rect x={-140} y={-60} width={280} height={110} rx={16} fill={C.fat} stroke={C.ink} strokeWidth={7} />
            <text x={0} y={22} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={70} fill={C.ink}>
              yağ 0
            </text>
          </g>
        </g>
      ) : null}
    </CamK>
  );
};

/* ---------- 07 v7 kaç yaşında başlamalıyım: gelen kutusu + 13. yaş günü ---------- */
// Hareket gösterimi yok (CEFF/kullanıcı): bekleyiş yaş günü pastasıyla anlatılır, her yıl bir mum ve bir "seneye…" notu.
// Kaynak: AAP 2020 (Pediatrics 145(6):e20201011): belli bir başlama yaşı yok.

const Y7_TABLE = 1130;
const Y7_CAKE_X = 640;

// Doğum günü odası: duvar, bayrak süsü, pencere, zemin, masa
const BdayRoom: React.FC = () => (
  <g stroke={C.ink} strokeLinejoin="round">
    <rect x={-200} y={-200} width={1480} height={PY + 200} fill="#efe1c2" strokeWidth={0} />
    <rect x={-200} y={PY} width={1480} height={800} fill="#c9a06c" strokeWidth={0} />
    <path d={`M-200 ${PY} L1280 ${PY}`} strokeWidth={7} />
    <rect x={800} y={480} width={200} height={240} rx={8} fill="#cfe0ea" strokeWidth={7} />
    <path d="M900 480 L900 720 M800 600 L1000 600" strokeWidth={5} />
    <path d="M-20 300 Q540 420 1100 300" fill="none" strokeWidth={5} />
    {Array.from({ length: 11 }, (_, k) => {
      const t = (k + 0.5) / 11;
      const x = -20 + t * 1120;
      const y = 300 + 240 * t * (1 - t);
      return <path key={k} d={`M${x - 36} ${y} L${x + 36} ${y} L${x} ${y + 84} Z`} fill={[C.red, C.yellow, "#6e8fb3", "#7aa35a"][k % 4]} strokeWidth={5} />;
    })}
    <rect x={400} y={Y7_TABLE} width={480} height={26} rx={6} fill="#8a5c35" strokeWidth={6} />
    <path d={`M440 ${Y7_TABLE + 26} L440 ${PY} M840 ${Y7_TABLE + 26} L840 ${PY}`} strokeWidth={14} strokeLinecap="round" />
  </g>
);

// Büyük yaş günü pastası: n mum (en yenisi newest ile belirir), lit = alevler, top = üstteki kart (yaş ya da BUGÜN)
const BigCake: React.FC<{ x: number; y: number; n: number; lit: number; top?: string; topP?: number; topColor?: string; newest?: number }> = ({ x, y, n, lit, top, topP = 1, topColor = C.ink, newest = 1 }) => {
  const f = useCurrentFrame();
  return (
    <g transform={`translate(${x} ${y})`} stroke={C.ink} strokeLinejoin="round">
      <rect x={-230} y={-170} width={460} height={170} rx={16} fill="#f3d7a8" strokeWidth={7} />
      <rect x={-230} y={-110} width={460} height={22} fill="#c9566b" strokeWidth={0} />
      <rect x={-170} y={-290} width={340} height={120} rx={14} fill="#f6e2bf" strokeWidth={7} />
      <path d="M-172 -286 Q-150 -250 -128 -286 Q-106 -250 -84 -286 Q-62 -250 -40 -286 Q-18 -250 4 -286 Q26 -250 48 -286 Q70 -250 92 -286 Q114 -250 136 -286 Q156 -254 172 -286" fill={C.cream} strokeWidth={6} />
      {Array.from({ length: n }, (_, k) => {
        const cx = -150 + ((k + 0.5) * 300) / n;
        const q = k === n - 1 ? newest : 1;
        if (q <= 0) return null;
        const fl = 1 + 0.15 * Math.sin(f / 2.5 + k * 1.7);
        return (
          <g key={k} transform={`translate(${cx} -290) scale(${q})`}>
            <rect x={-7} y={-70} width={14} height={70} rx={4} fill={k % 2 ? "#6e8fb3" : C.cream} strokeWidth={4} />
            {lit > 0 ? (
              <g opacity={lit}>
                <ellipse cx={0} cy={-90} rx={18} ry={26 * fl} fill={C.glow} opacity={0.35} strokeWidth={0} />
                <path d={`M0 ${-108 * fl + 8} Q12 -88 0 -76 Q-12 -88 0 ${-108 * fl + 8} Z`} fill={C.yellow} strokeWidth={3} />
              </g>
            ) : null}
          </g>
        );
      })}
      {top && topP > 0 ? (
        <g transform={`translate(0 -440) scale(${topP})`}>
          <path d="M0 60 L0 150" strokeWidth={6} />
          <rect x={top.length > 3 ? -150 : -90} y={-60} width={top.length > 3 ? 300 : 180} height={120} rx={16} fill={C.cream} strokeWidth={7} />
          <text x={0} y={34} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={top.length > 3 ? 90 : 100} fill={topColor} stroke="none">
            {top}
          </text>
        </g>
      ) : null}
    </g>
  );
};

// Duvara yapışan "seneye…" notu
const LaterNote: React.FC<{ x: number; y: number; rot: number; p: number }> = ({ x, y, rot, p }) =>
  p > 0 ? (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${p})`}>
      <rect x={-95} y={-80} width={190} height={160} fill="#f7e27a" stroke={C.ink} strokeWidth={6} />
      <rect x={-40} y={-92} width={80} height={26} fill="#e9d9b5" opacity={0.9} />
      <text x={0} y={16} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={52} fill={C.ink}>
        seneye…
      </text>
    </g>
  ) : null;
const NOTES: [number, number, number][] = [
  [160, 520, -8], [400, 470, 6], [980, 860, -7], [180, 820, 4], [700, 830, -5], [520, 700, 9], [120, 680, -12], [930, 1010, 5], [330, 640, -3], [760, 640, 7],
];

// Gözde büyüyen salon: dev halter ve iki iri gölge (balon ya da kart içinde)
const ScaryGym: React.FC<{ cx: number; cy: number; s: number }> = ({ cx, cy, s }) => (
  <g transform={`translate(${cx} ${cy}) scale(${s})`}>
    <Person x={-200} y={270} s={0.62} belly={0.1} limbW={2.6} shirt="#3d3d45" mouth="flat" armL={[165, 0]} armR={[165, 0]} />
    <Barbell x={-200} y={-280} s={0.75} />
    <Person x={230} y={270} s={0.62} belly={0.1} limbW={2.6} shirt="#3d3d45" mouth="flat" armL={[85, -125]} armR={[85, -125]} />
  </g>
);

// Parti şapkası (Person koordinatlarında)
const PartyHat = () => (
  <g stroke={C.ink} strokeWidth={6} strokeLinejoin="round">
    <path d="M-50 -790 L0 -940 L50 -790 Z" fill="#6e8fb3" />
    <path d="M-34 -840 L34 -840 M-18 -890 L18 -890" stroke={C.yellow} strokeWidth={9} />
    <circle cx={0} cy={-946} r={16} fill={C.red} />
  </g>
);

// "Bu hafta en çok gelen soru: Spora kaç yaşında başlamalıyım? On üç erken mi? On altıyı mı bekleyeyim?"
// Dev telefona bildirimler yağar, her birinde telefon titrer, sayaç 99+'ya çıkar; yanda avatar şaşkın bakar.
const Y7Soru: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const id = svgId(useId());
  const cards = [
    { t: w(1) - 2, a: "yeni mesaj", b: "" },
    { t: w(3) - 2, a: "yeni mesaj", b: "" },
    { t: w(6) - 2, a: "Spora kaç yaşında", b: "başlamalıyım?" },
    { t: w(10) - 2, a: "13 yaşındayım,", b: "erken mi?" },
    { t: w(14) - 2, a: "16'yı mı", b: "bekleyeyim?" },
  ];
  const arrived = cards.filter((c) => f >= c.t).length;
  const lastT = arrived ? cards[arrived - 1].t : -99;
  const shake = f >= lastT ? Math.sin(f * 2.3) * 5 * (1 - tw(f, lastT, lastT + 14)) : 0;
  const badge = ["", "1", "2", "14", "37", "99+"][arrived];
  return (
    <>
      <rect x={-200} y={PY} width={1480} height={800} fill="#d9c6a0" opacity={0.55} />
      <path d={`M-200 ${PY} L1280 ${PY}`} stroke={C.ink} strokeWidth={6} />
      <g transform={`rotate(${shake} 420 780)`}>
        <rect x={150} y={300} width={540} height={960} rx={60} fill="#2f2f36" stroke={C.ink} strokeWidth={9} />
        <clipPath id={`s${id}`}>
          <rect x={180} y={340} width={480} height={880} rx={36} />
        </clipPath>
        <g clipPath={`url(#s${id})`}>
          <rect x={180} y={340} width={480} height={880} fill="#e8f1f4" />
          <text x={420} y={400} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={36} fill={C.ink}>
            Mesajlar
          </text>
          {cards.map((c, k) => {
            if (f < c.t) return null;
            const enter = tw(f, c.t, c.t + 8);
            const idx = cards.slice(k + 1).reduce((a, n) => a + tw(f, n.t, n.t + 8), 0);
            const y0 = 440 + idx * 160 - (1 - enter) * 120;
            const big = c.b !== "";
            return (
              <g key={k} opacity={enter}>
                <rect x={200} y={y0} width={440} height={140} rx={22} fill="#fff" stroke={k === arrived - 1 && big ? C.red : C.ink} strokeWidth={k === arrived - 1 && big ? 8 : 5} />
                <circle cx={248} cy={y0 + 70} r={28} fill={["#c98f3c", "#7aa35a", "#6e8fb3", "#c9566b", "#9a7bb0"][k]} stroke={C.ink} strokeWidth={4} />
                <text x={292} y={big ? y0 + 60 : y0 + 82} fontFamily={fontFamily} fontWeight={700} fontSize={big ? 34 : 32} fill={big ? C.ink : "#7a7a7a"}>
                  {c.a}
                </text>
                {big ? (
                  <text x={292} y={y0 + 104} fontFamily={fontFamily} fontWeight={700} fontSize={34} fill={C.ink}>
                    {c.b}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
        {badge ? (
          <g transform={`translate(668 318) scale(${pop(f, lastT, 8)})`}>
            <circle r={badge.length > 2 ? 58 : 44} fill={C.red} stroke={C.ink} strokeWidth={6} />
            <text y={16} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={badge.length > 2 ? 40 : 46} fill={C.cream}>
              {badge}
            </text>
          </g>
        ) : null}
      </g>
      <Person x={890} y={PY} s={0.55} shirt={YAS_SHIRT} belly={0.3} armL={[12, 0]} armR={[12, 0]} mouth={arrived >= 3 ? "o" : "smile"} eyes={arrived >= 3 ? "wide" : "open"} tilt={-6} />
    </>
  );
};

// "On üçüncü yaş günün. Mumları üflerken aklına spor salonu gelir: “Bugün mü başlasam?”"
// Parti odası, masada 13 mumlu pasta; avatar (13 yaş) üfler, mumlar söner; düşünce balonunda spor salonu kapısı, "bugün mü?".
const Y7Pasta: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const s = yasScale(13);
  const blow = tw(f, w(4), w(5) + 6);
  const lit = 1 - tw(f, w(5) + 2, w(6));
  const bub = pop(f, w(6) - 2, 14);
  const q = pop(f, w(10) - 2, 12);
  return (
    <>
      <BdayRoom />
      <HandText x={540} y={230} text="13. yaş günü" size={100} p={tw(f, w(0), w(3) + 4)} color={C.red} rotate={-3} />
      <Person x={290} y={PY} s={s} shirt={YAS_SHIRT} belly={0.3} tilt={8 * blow * (1 - bub)} armL={[12, 0]} armR={[12, 0]} mouth={blow > 0.2 && bub === 0 ? "o" : q > 0 ? "grin" : "smile"} lookY={bub > 0 ? -8 : 0}>
        <PartyHat />
      </Person>
      {blow > 0 && bub < 1 ? <Puff x={290 + 70 * s} y={PY - 660 * s} p={blow} dx={260} dy={60} s={1.2} /> : null}
      <BigCake x={Y7_CAKE_X} y={Y7_TABLE} n={13} lit={lit} top="13" topP={pop(f, 0, 12)} />
      {lit < 1 && lit > 0 ? <Puff x={Y7_CAKE_X} y={Y7_TABLE - 400} p={1 - lit} dx={40} dy={-140} s={0.8} /> : null}
      {bub > 0 ? (
        <Bubble x={560} y={540} rx={330} ry={200} p={bub} tail={[330, 700]}>
          <rect x={300} y={430} width={300} height={56} rx={10} fill={C.red} stroke={C.ink} strokeWidth={6} />
          <text x={450} y={472} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={42} fill={C.cream}>
            SPOR SALONU
          </text>
          <rect x={350} y={500} width={200} height={190} rx={6} fill="#8a5c35" stroke={C.ink} strokeWidth={6} />
          <circle cx={525} cy={600} r={9} fill={C.yellow} stroke={C.ink} strokeWidth={3} />
          <Dumbbell x={450} y={590} s={0.32} />
          {q > 0 ? <HandText x={740} y={590} text="bugün mü?" size={74} p={q} color={YAS_OK} rotate={-6} /> : null}
        </Bubble>
      ) : null}
    </>
  );
};

// Yıllar: "her yıl" sözlerinde pastaya bir mum eklenir (14, 15, 16), duvara bir "seneye…" notu yapışır, avatar biraz büyür
const y7Years = (w: (i: number) => number) => [w(10) - 2, w(13) - 2, w(16) - 2];

// "Sonra kocaman ağırlıklar, iri adamlar… “Ben daha küçüğüm” dersin. Ve her yıl pastaya bir mum daha eklenir."
// Balondaki salon gözünde büyür: dev halter, iri gölgeler; avatar geri çekilir, başını sallar, balon söner;
// sonra yıllar akar: mum 13 → 16, her yılda bir "seneye…" notu.
const Y7Korku: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const grow = tw(f, w(1) - 4, w(4) + 6);
  const gone = tw(f, w(8) - 6, w(8) + 2);
  const yrs = y7Years(w);
  const k = yrs.filter((t) => f >= t).length;
  const age = 13 + k;
  const s = lerp(yasScale(13), yasScale(16), tw(f, yrs[0], yrs[2] + 10));
  const back = tw(f, w(1), w(4)) * (1 - tw(f, yrs[0] - 10, yrs[0]));
  const shake = f >= w(5) && f < w(8) ? Math.sin((f - w(5)) / 2.5) * 7 : 0;
  const newest = k > 0 ? pop(f, yrs[k - 1], 10) : 1;
  return (
    <>
      <BdayRoom />
      {Array.from({ length: k }, (_, i) => (
        <LaterNote key={i} x={NOTES[i][0]} y={NOTES[i][1]} rot={NOTES[i][2]} p={pop(f, yrs[i] + 4, 12)} />
      ))}
      <Person x={290 - 50 * back} y={PY} s={s} shirt={YAS_SHIRT} belly={0.3} tilt={shake - 6 * back} armL={back > 0.5 ? [40, -60] : [12, 0]} armR={back > 0.5 ? [40, -60] : [12, 0]} mouth={k > 0 ? "flat" : back > 0.3 ? "worry" : "smile"} eyes={back > 0.3 && gone < 1 ? "wide" : "open"}>
        <PartyHat />
      </Person>
      <BigCake x={Y7_CAKE_X} y={Y7_TABLE} n={age} lit={k > 0 ? 1 : 0} top={`${age}`} topP={k > 0 ? pop(f, yrs[k - 1], 10) : 1} newest={newest} />
      {gone < 1 ? (
        <Bubble x={560} y={lerp(540, 600, grow)} rx={lerp(330, 430, grow)} ry={lerp(200, 330, grow)} p={1 - gone} tail={[330, 700]}>
          <g opacity={1 - grow}>
            <rect x={350} y={500} width={200} height={190} rx={6} fill="#8a5c35" stroke={C.ink} strokeWidth={6} />
          </g>
          {grow > 0 ? <ScaryGym cx={560} cy={lerp(620, 600, grow)} s={lerp(0.5, 1, grow)} /> : null}
          {f >= w(5) - 2 ? <HandText x={560} y={330} text="ben daha küçüğüm" size={64} p={tw(f, w(5) - 2, w(7) + 4)} color={C.red} rotate={-3} /> : null}
        </Bubble>
      ) : null}
    </>
  );
};

// "Oysa Amerikan çocuk doktorları iki bin yirmide yazdı: spora başlamanın belli bir yaşı yok."
// Oda soluklaşır, rapor açılır; "BAŞLAMA YAŞI:" satırına kırmızı "YOK" damgası.
const Y7Rapor: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const doc = pop(f, 0, 14);
  const line = tw(f, w(8) - 2, w(11) + 4);
  const stamp = pop(f, w(13) - 2, 10);
  return (
    <>
      <BdayRoom />
      {[0, 1, 2].map((i) => (
        <LaterNote key={i} x={NOTES[i][0]} y={NOTES[i][1]} rot={NOTES[i][2]} p={1} />
      ))}
      <BigCake x={Y7_CAKE_X} y={Y7_TABLE} n={16} lit={1} top="16" />
      <rect x={-200} y={-200} width={1480} height={2400} fill={C.paper} opacity={0.72} />
      <g transform={`translate(540 800) scale(${doc}) rotate(-2)`}>
        <rect x={-360} y={-420} width={720} height={840} rx={16} fill={C.cream} stroke={C.ink} strokeWidth={9} />
        <rect x={-360} y={-420} width={720} height={150} rx={16} fill="#6e8fb3" stroke={C.ink} strokeWidth={9} />
        <text x={0} y={-345} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={64} fill={C.cream}>
          ÇOCUK DOKTORLARI
        </text>
        <text x={0} y={-290} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={52} fill={C.cream}>
          rapor · 2020
        </text>
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={-300} y={-220 + i * 60} width={[600, 520, 580, 460, 540][i] * tw(f, 6 + i * 4, 18 + i * 4)} height={18} rx={9} fill="#d8c8a6" />
        ))}
        <HandText x={-300} y={120} text="BAŞLAMA YAŞI:" size={76} p={line} anchor="start" rotate={0} />
        {stamp > 0 ? (
          <g transform={`translate(140 280) rotate(-12) scale(${stamp})`}>
            <rect x={-150} y={-80} width={300} height={140} rx={14} fill="none" stroke={C.red} strokeWidth={12} />
            <text x={0} y={30} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={110} fill={C.red}>
              YOK
            </text>
          </g>
        ) : null}
      </g>
    </>
  );
};

// "Üstelik başlamak için o salon da şart değil. Küçükken oyunla başlanır, büyüdükçe yük yavaş yavaş artar."
// Gözdeki dev salon kartı çizilip kalkar; yerine üç basamak: top (oyun) → hafif dambıl → biraz daha ağır; avatar basamakları çıkar.
const Y7Salon: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const card = pop(f, w(3) - 2, 12) * (1 - tw(f, w(8) - 6, w(8) + 2));
  const cross = tw(f, w(6) - 2, w(7) + 6);
  const st = [w(9) - 2, w(12) - 2, w(14) - 2];
  const at = st.filter((t) => f >= t).length;
  const arrow = tw(f, w(13) - 2, w(15) + 6);
  const ok = tw(f, w(15) - 2, w(15) + 10);
  const steps = [
    { x: 230, h: 130, label: "oyun" },
    { x: 540, h: 260, label: "hafif" },
    { x: 850, h: 390, label: "biraz daha" },
  ];
  const cur = steps[Math.max(0, at - 1)];
  const hop = at > 0 ? Math.sin(Math.min(1, (f - st[at - 1]) / 14) * Math.PI) * 90 : 0;
  const prev = at > 1 ? steps[at - 2] : null;
  const mv = at > 1 ? tw(f, st[at - 1], st[at - 1] + 14) : 1;
  const ax = prev ? lerp(prev.x, cur.x, mv) : at > 0 ? cur.x : 230;
  const ay = PY - (at > 0 ? (prev ? lerp(prev.h, cur.h, mv) : cur.h * tw(f, st[0], st[0] + 14)) : 0) - hop;
  return (
    <>
      <rect x={-200} y={PY} width={1480} height={800} fill="#d9c6a0" opacity={0.55} />
      <path d={`M-200 ${PY} L1280 ${PY}`} stroke={C.ink} strokeWidth={6} />
      {card > 0 ? (
        <g transform={`translate(540 640) scale(${card}) rotate(-2)`}>
          <rect x={-380} y={-330} width={760} height={600} rx={24} fill={C.cream} stroke={C.ink} strokeWidth={9} />
          <ScaryGym cx={0} cy={-20} s={0.95} />
          {cross > 0 ? <Cross x={0} y={-20} size={220} p={cross} /> : null}
          {cross > 0.5 ? <HandText x={0} y={-250} text="şart değil" size={90} p={tw(cross, 0.5, 1)} color={C.red} rotate={-3} /> : null}
        </g>
      ) : null}
      {steps.map((b, i) => {
        const q = f >= st[i] ? pop(f, st[i], 12) : 0;
        if (q <= 0) return null;
        return (
          <g key={i}>
            <g transform={`translate(${b.x} ${PY}) scale(1 ${q}) translate(${-b.x} ${-PY})`}>
              <rect x={b.x - 140} y={PY - b.h} width={280} height={b.h} fill={["#e9d3a8", "#dcc08e", "#cfae78"][i]} stroke={C.ink} strokeWidth={7} />
            </g>
            <g transform={`translate(${b.x} ${PY - b.h - 470}) scale(${q})`}>
              {i === 0 ? <Ball x={0} y={0} r={60} /> : <Dumbbell x={0} y={0} s={i === 1 ? 1 : 1.5} />}
              <text x={0} y={-90} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={60} fill={YAS_OK}>
                {b.label}
              </text>
              {ok > 0 ? <path d="M-40 110 L-10 140 L50 70" stroke={YAS_OK} strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - ok} /> : null}
            </g>
          </g>
        );
      })}
      {arrow > 0 ? <HandText x={330} y={430} text="yavaş yavaş" size={84} p={arrow} color={YAS_OK} rotate={-10} /> : null}
      {at > 0 ? <Person x={ax} y={ay} s={0.42} shirt={YAS_SHIRT} belly={0.3} armL={hop > 30 ? ARMS_UP : [12, 0]} armR={hop > 30 ? ARMS_UP : [12, 0]} mouth="grin" /> : null}
    </>
  );
};

// "Yani asıl soru “kaç yaşındayım” değil. “Kaç senedir bekliyorum?”"
// Odada 16 mumlu pasta; "kaç yaşındayım?" yazılır, üstü çizilir; "kaç senedir bekliyorum?" kırmızı; duvar "seneye…" notlarıyla dolar.
const Y7Bekle: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const q1 = tw(f, w(3) - 2, w(4) + 6);
  const strike = tw(f, w(5) - 2, w(5) + 8);
  const q2 = tw(f, w(6) - 2, w(8) + 8);
  const more = (i: number) => (i < 3 ? 1 : pop(f, lerp(w(6), d - 10, (i - 3) / 7), 10));
  return (
    <>
      <BdayRoom />
      {NOTES.map((n, i) => (
        <LaterNote key={i} x={n[0]} y={n[1]} rot={n[2]} p={more(i)} />
      ))}
      <Person x={290} y={PY} s={yasScale(16)} shirt={YAS_SHIRT} belly={0.3} armL={[12, 0]} armR={[12, 0]} mouth={q2 > 0 ? "worry" : "flat"} eyes={q2 > 0.5 ? "wide" : "open"}>
        <PartyHat />
      </Person>
      <BigCake x={Y7_CAKE_X} y={Y7_TABLE} n={16} lit={1} top="16" />
      <g>
        <rect x={140} y={150} width={800} height={150} rx={20} fill={C.cream} stroke={C.ink} strokeWidth={7} opacity={q1 > 0 ? 1 : 0} />
        <HandText x={540} y={250} text="kaç yaşındayım?" size={90} p={q1} rotate={-2} />
        {strike > 0 ? <path d="M190 225 L890 210" stroke={C.red} strokeWidth={16} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - strike} /> : null}
      </g>
      {q2 > 0 ? (
        <g transform={`translate(540 420) rotate(-3) scale(${pop(f, w(6) - 2, 12)})`}>
          <rect x={-450} y={-80} width={900} height={150} rx={22} fill={C.red} stroke={C.ink} strokeWidth={9} />
          <text x={0} y={22} textAnchor="middle" fontFamily={handFamily} fontWeight={700} fontSize={76} fill={C.cream}>
            kaç senedir bekliyorum?
          </text>
        </g>
      ) : null}
    </>
  );
};

// "O yüzden en doğru yaş: bugün."
// Rüzgâr "seneye…" notlarını uçurur; pastanın üstündeki kart "BUGÜN" olur; avatar kollarını kaldırır, konfeti.
const Y7Bugun: React.FC<SceneProps> = ({ w }) => {
  const f = useCurrentFrame();
  const fly = tw(f, 0, w(4));
  const yay = f >= w(5) - 2;
  return (
    <>
      <BdayRoom />
      {NOTES.map((n, i) => {
        const p = tw(fly, i / 14, i / 14 + 0.45);
        return p < 1 ? (
          <g key={i} transform={`translate(${p * 1400} ${-p * 300}) rotate(${p * 200} ${n[0]} ${n[1]})`}>
            <LaterNote x={n[0]} y={n[1]} rot={n[2]} p={1} />
          </g>
        ) : null;
      })}
      <Person x={290} y={PY} s={yasScale(16)} shirt={YAS_SHIRT} belly={0.3} armL={yay ? ARMS_UP : [12, 0]} armR={yay ? ARMS_UP : [12, 0]} mouth={yay ? "grin" : "smile"}>
        <PartyHat />
      </Person>
      <BigCake x={Y7_CAKE_X} y={Y7_TABLE} n={16} lit={1} top={yay ? "BUGÜN" : "16"} topP={yay ? pop(f, w(5) - 2, 12) : 1} topColor={yay ? C.red : C.ink} />
      {yay ? <Confetti start={w(5) - 2} n={24} /> : null}
    </>
  );
};

const SCENES: Record<string, React.FC<SceneProps>> = {
  "yas7-soru": Y7Soru,
  "yas7-pasta": Y7Pasta,
  "yas7-korku": Y7Korku,
  "yas7-rapor": Y7Rapor,
  "yas7-salon": Y7Salon,
  "yas7-bekle": Y7Bekle,
  "yas7-bugun": Y7Bugun,
  "sauna-hook": SaunaHook,
  "sauna-tarih1": SaunaTarih1,
  "sauna-tarih2": SaunaTarih2,
  "sauna-tarih3": SaunaTarih3,
  "sauna-su": SaunaSu,
  "sauna-yag": SaunaYag,
  "sauna-tehlike": SaunaTehlike,
  "sauna-dongu": SaunaDongu,
  "yas-hook": YasHook,
  "yas-bant1": YasBant1,
  "yas-bant2": YasBant2,
  "yas-bant3": YasBant3,
  "yas-bant4": YasBant4,
  "yas-sporlar": YasSporlar,
  "yas-rapor": YasRapor,
  "yas-oyun": YasOyun,
  "yas-hazir": YasHazir,
  "yas-squat": YasSquat,
  "yas-sinav": YasSinav,
  "yas-plank": YasPlank,
  "yas-dambil": YasDambil,
  "yas-sinir": YasSinir,
  "yas-terazi": YasTerazi,
  "yas-guvenlik": YasGuvenlik,
  "yas-bugun": YasBugun,
  "diz7-hook": Diz7Hook,
  "diz7-anne": Diz7Anne,
  "diz7-annesoz": Diz7AnneSoz,
  "diz6-hook": Diz6Hook,
  "diz6-annesoz": Diz6AnneSoz,
  "diz6-son": Diz6Son,
  "diz5-hook": Diz5Hook,
  "diz5-pist": Diz5Pist,
  "diz4-pist": Diz4Pist,
  "diz4-anne": Diz4Anne,
  "diz4-annesoz": Diz4AnneSoz,
  "diz4-squat": Diz5Squat,
  "diz4-doz": Diz4Doz,
  "diz4-stanford": Diz4Stanford,
  "diz4-sonuc": Diz4Sonuc,
  "diz4-soru": Diz4Soru,
  "diz3-pist": Diz3Pist,
  "diz3-anne": Diz3Anne,
  "diz3-annesoz": Diz3AnneSoz,
  "diz3-stanford": Diz3Stanford,
  "diz3-sonuc": Diz3Sonuc,
  "diz3-squat": Diz3Squat,
  "diz3-doz": Diz3Doz,
  "diz3-soru": Diz3Soru,
  "boyun5-sen": Boyun5Sen,
  "boyun5-gonder": Boyun5Gonder,
  "diz-hook": Diz1Hook,
  "diz-kosu": Diz2Kosu,
  "diz-sunger": Diz3Sunger,
  "diz-squat": Diz4Squat,
  "diz-doz": Diz5Doz,
  "diz-kapanis": Diz6Kapanis,
  "kosu-hook": Kosu1Hook,
  "kosu-arastirma": Kosu2Arastirma,
  "kosu-oran": Kosu3Oran,
  "kosu-sunger": Kosu4Sunger,
  "kosu-doz": Kosu5Doz,
  "kosu-kapanis": Kosu6Kapanis,
  "boyun4-isim": Boyun4Isim,
  "boyun4-hesap": Boyun4Hesap,
  "boyun4-alarm": Boyun4Alarm,
  "boyun4-viral": Boyun4Viral,
  "boyun4-arastirma": Boyun4Arastirma,
  "boyun4-heykel": Boyun4Heykel,
  "boyun4-gonder": Boyun4Gonder,
  "boyun3-sen": Boyun3Sen,
  "boyun3-isim": Boyun3Isim,
  "boyun3-bowling": Boyun3Bowling,
  "boyun3-bagaj": Boyun3Bagaj,
  "boyun3-surpriz": Boyun3Surpriz,
  "boyun3-heykel": Boyun3Heykel,
  "boyun3-kapanis": Boyun3Kapanis,
  "boyun2-hook": Boyun2Hook,
  "boyun2-2008": Boyun2_2008,
  "boyun2-hesap": Boyun2Hesap,
  "boyun2-soru": Boyun2Soru,
  "boyun2-bag": Boyun2Bag,
  "boyun2-hareket": Boyun2Hareket,
  "boyun2-kapanis": Boyun2Kapanis,
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
