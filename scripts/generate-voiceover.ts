import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { PostVoiceover, SceneAudio, WordTiming } from "../src/types";
import { loadVideos, ROOT } from "./lib";

// Kullanım: npm run voiceover            → tüm gönderiler
//           npm run voiceover -- <id>... → sadece belirtilenler
// Metni değişmeyen sahneler yeniden seslendirilmez (kredi harcanmaz).

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("ELEVENLABS_API_KEY eksik. .env.example dosyasını .env olarak kopyalayıp doldurun.");
  process.exit(1);
}
const voiceId = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const client = new ElevenLabsClient({ apiKey });

// Karakter bazlı zamanlamaları kelime bazlıya çevirir (altyazılar için).
// [whispers] gibi ton etiketleri (eleven_v3) altyazıya girmez.
function toWords(chars: string[], starts: number[], ends: number[]): WordTiming[] {
  const words: WordTiming[] = [];
  let current: WordTiming | null = null;
  let inTag = false;
  chars.forEach((ch, i) => {
    if (ch === "[") inTag = true;
    if (inTag) {
      if (ch === "]") inTag = false;
      return;
    }
    if (/\s/.test(ch)) {
      if (current) words.push(current);
      current = null;
      return;
    }
    if (!current) current = { word: "", start: starts[i], end: ends[i] };
    current.word += ch;
    current.end = ends[i];
  });
  if (current) words.push(current);
  return words;
}

async function readManifest(file: string): Promise<PostVoiceover | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as PostVoiceover;
  } catch {
    return null;
  }
}

const videos = await loadVideos(process.argv.slice(2));
let generated = 0;

for (const post of videos) {
  const dir = path.join(ROOT, "public", "voiceover", post.id);
  const manifestPath = path.join(dir, "manifest.json");
  await mkdir(dir, { recursive: true });
  const old = await readManifest(manifestPath);
  const scenes: SceneAudio[] = [];

  for (const [i, scene] of post.scenes.entries()) {
    const vId = ("voiceId" in post && post.voiceId) || voiceId;
    const mId = ("modelId" in post && post.modelId) || modelId;
    // Seslendirilen metin: varsa ton etiketli `say`, yoksa altyazı metni `voice`
    const say: string = ("say" in scene && typeof scene.say === "string" && scene.say) || scene.voice;
    const cached = old?.scenes.find((s) => s && s.voice === scene.voice && s.voiceId === vId && (s.say ?? s.voice) === say);
    if (cached) {
      scenes.push(cached);
      continue;
    }
    console.log(`[${post.id}] sahne ${i + 1}: "${scene.voice}"`);
    const res = await client.textToSpeech.convertWithTimestamps(vId, {
      text: say,
      modelId: mId,
      // v3 modeli dili metinden tahmin etmeye çalışır; Türkçe olduğunu açıkça söyle
      ...(mId === "eleven_v3" ? { languageCode: "tr" } : {}),
      // İsteğe bağlı videoya özel ses ayarları (doğallık için: düşük stability, biraz style)
      ...("voiceSettings" in post && post.voiceSettings ? { voiceSettings: post.voiceSettings } : {}),
      outputFormat: "mp3_44100_128",
    });
    // Dosya adı benzersiz olsun ki tarayıcı önbelleği eski sesi çalmasın
    const name = `${i + 1}-${Date.now().toString(36)}.mp3`;
    await writeFile(path.join(dir, name), Buffer.from(res.audioBase64, "base64"));
    const a = res.alignment;
    scenes.push({
      voice: scene.voice,
      ...(say !== scene.voice ? { say } : {}),
      voiceId: vId,
      file: `voiceover/${post.id}/${name}`,
      durationInSeconds: a?.characterEndTimesSeconds.at(-1) ?? 3,
      words: a ? toWords(a.characters, a.characterStartTimesSeconds, a.characterEndTimesSeconds) : [],
    });
    generated++;
    // Her sahneden sonra kaydet: kota yarıda biterse üretilen sesler kaybolmaz, tekrar çalıştırınca kaldığı yerden devam eder
    await writeFile(manifestPath, JSON.stringify({ scenes } satisfies PostVoiceover, null, 2));
  }

  await writeFile(manifestPath, JSON.stringify({ scenes } satisfies PostVoiceover, null, 2));
}

console.log(`Tamamlandı: ${generated} yeni ses üretildi, ${videos.length} video güncel.`);
