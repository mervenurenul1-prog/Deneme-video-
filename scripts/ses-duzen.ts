import { spawnSync } from "node:child_process";
import type { WordTiming } from "../src/types";

// Seslendirmeyi Instagram temposuna uydurur ve altyazıyı metinle eşler.

// Dolgu sesleri ("ıı", "hmm"...) konuşmada kalır ama altyazıya girmez
export const FILLERS = new Set(["ı", "ıı", "ııı", "ıııı", "e", "ee", "eee", "eeee", "hmm", "hımm", "hım", "hmmm", "mm", "hani", "şey", "yani"]);

const norm = (w: string) =>
  w
    .toLocaleLowerCase("tr")
    .replace(/[^\p{L}\p{N}']/gu, "")
    .replace(/'/g, "");

// Sesteki kelimeleri altyazı metninin kelimeleriyle sırayla eşler: fazladan söylenen dolgular atlanır,
// altyazıda metindeki yazım kullanılır. Eşleşmeyen kelimeye komşularından zaman verilir.
export function matchWords(audio: WordTiming[], voice: string): WordTiming[] {
  const target = voice.split(/\s+/).filter(Boolean);
  const out: (WordTiming | null)[] = target.map(() => null);
  let j = 0;
  for (const a of audio) {
    if (j >= target.length) break;
    const n = norm(a.word);
    if (n === norm(target[j])) {
      out[j] = { word: target[j], start: a.start, end: a.end };
      j++;
    } else if (!FILLERS.has(n) && j + 1 < target.length && n === norm(target[j + 1])) {
      // TTS bir kelimeyi farklı söylediyse (ör. "değil mi" → "he") onu atla
      out[j + 1] = { word: target[j + 1], start: a.start, end: a.end };
      j += 2;
    }
  }
  const last = audio.at(-1)?.end ?? 1;
  return out.map((w, i) => {
    if (w) return w;
    const prev = out.slice(0, i).findLast(Boolean);
    const next = out.slice(i + 1).find(Boolean);
    const start = prev ? prev.end : 0;
    const end = next ? next.start : last;
    return { word: target[i], start, end: Math.max(start + 0.05, end) };
  });
}

// maxPause saniyeden uzun sessizlikleri kısaltır (izleyici beklemeden geçmesin) ve
// kelime zamanlarını buna göre kaydırır. Çıktı: yeni süre ve kelimeler.
export function tightenPauses(input: string, output: string, words: WordTiming[], maxPause = 0.3) {
  const det = spawnSync("ffmpeg", ["-hide_banner", "-i", input, "-af", "silencedetect=noise=-38dB:d=0.25", "-f", "null", "-"], {
    encoding: "utf8",
  });
  const starts = [...det.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...det.stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const keep = maxPause / 2;
  // kesilecek aralıklar: sessizliğin ortası, iki yanında yarım duraklama kalır
  const cuts = starts
    .map((s, i) => [s + keep, (ends[i] ?? s) - keep] as const)
    .filter(([a, b]) => b - a > 0.02 && a > 0.05);
  if (cuts.length === 0) {
    spawnSync("cp", [input, output]);
  } else {
    const expr = cuts.map(([a, b]) => `between(t,${a.toFixed(3)},${b.toFixed(3)})`).join("+");
    const r = spawnSync(
      "ffmpeg",
      ["-y", "-v", "error", "-i", input, "-af", `aselect='not(${expr})',asetpts=N/SR/TB`, "-c:a", "libmp3lame", "-b:a", "128k", output],
      { encoding: "utf8" },
    );
    if (r.status !== 0) throw new Error(`Sessizlik kısaltılamadı: ${r.stderr}`);
  }
  const shift = (t: number) => t - cuts.reduce((acc, [a, b]) => acc + (t >= b ? b - a : t > a ? t - a : 0), 0);
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", output], { encoding: "utf8" });
  return {
    duration: Number(probe.stdout.trim()),
    words: words.map((w) => ({ ...w, start: shift(w.start), end: shift(w.end) })),
    removed: cuts.reduce((acc, [a, b]) => acc + b - a, 0),
  };
}
