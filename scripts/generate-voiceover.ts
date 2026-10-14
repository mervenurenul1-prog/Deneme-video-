import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { scenes, type VoiceoverManifest, type WordTiming } from "../src/scenes";

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("ELEVENLABS_API_KEY eksik. .env.example dosyasını .env olarak kopyalayıp doldurun.");
  process.exit(1);
}
const voiceId = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
const outDir = path.join(process.cwd(), "public", "voiceover");

const client = new ElevenLabsClient({ apiKey });

// Karakter bazlı zamanlamaları kelime bazlıya çevirir (altyazılar için).
function toWords(chars: string[], starts: number[], ends: number[]): WordTiming[] {
  const words: WordTiming[] = [];
  let current: WordTiming | null = null;
  chars.forEach((ch, i) => {
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

await mkdir(outDir, { recursive: true });
const manifest: VoiceoverManifest = {};

for (const scene of scenes) {
  console.log(`Seslendiriliyor: ${scene.id}`);
  const res = await client.textToSpeech.convertWithTimestamps(voiceId, {
    text: scene.text,
    modelId: "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
  });

  const file = `${scene.id}.mp3`;
  await writeFile(path.join(outDir, file), Buffer.from(res.audioBase64, "base64"));

  const a = res.alignment;
  const words = a ? toWords(a.characters, a.characterStartTimesSeconds, a.characterEndTimesSeconds) : [];
  const durationInSeconds = a?.characterEndTimesSeconds.at(-1) ?? 3;
  manifest[scene.id] = { file: `voiceover/${file}`, durationInSeconds, words };
}

await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Tamamlandı → ${outDir}`);
