import "dotenv/config";
import { spawnSync } from "node:child_process";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { loadVideos, ROOT } from "./lib";

// Kullanım: npm run render            → tüm gönderiler
//           npm run render -- <id>... → sadece belirtilenler
// Çıktı: out/<id>/video.mp4, kapak.jpg, aciklama.txt

const videos = await loadVideos(process.argv.slice(2));
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

console.log("Proje paketleniyor...");
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src", "index.ts") });

for (const post of videos) {
  const outDir = path.join(ROOT, "out", post.id);
  await mkdir(outDir, { recursive: true });

  // 3D videolar (uc-*) WebGL ister; sunucuda ekran kartı olmadığı için yazılımla çizilir
  const chromiumOptions = post.id.startsWith("uc-") ? { gl: "swangle" as const } : {};
  const composition = await selectComposition({ serveUrl, id: post.id, browserExecutable, chromiumOptions });
  console.log(`[${post.id}] ${(composition.durationInFrames / composition.fps).toFixed(1)} sn render ediliyor...`);

  const raw = path.join(outDir, "video-ham.mp4");
  const final = path.join(outDir, "video.mp4");
  await renderMedia({
    chromiumOptions,
    serveUrl,
    composition,
    codec: "h264",
    audioBitrate: "192k",
    outputLocation: raw,
    browserExecutable,
  });
  await instagramAudio(raw, final);

  // Kapak: hook sahnesinin animasyonu oturduktan sonraki kare
  await renderStill({
    chromiumOptions,
    serveUrl,
    composition,
    frame: Math.min(composition.durationInFrames - 1, Math.round(composition.fps * 1)),
    imageFormat: "jpeg",
    output: path.join(outDir, "kapak.jpg"),
    browserExecutable,
  });

  const caption = `${post.caption.trim()}\n\n${post.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}\n`;
  await writeFile(path.join(outDir, "aciklama.txt"), caption);
  console.log(`[${post.id}] hazır → out/${post.id}/`);
}

// Instagram için ses: -14 LUFS ses yüksekliği, AAC 44.1 kHz 192k, hızlı başlama (faststart).
// Görüntüye dokunmaz. Remotion'ın kendi ffmpeg'i kullanılır, ayrıca kurulum gerekmez.
function instagramAudio(input: string, output: string) {
  const args = [
    "remotion", "ffmpeg", "-y", "-v", "error", "-i", input,
    "-c:v", "copy",
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
    "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2",
    "-movflags", "+faststart", output,
  ];
  const res = spawnSync("npx", args, { stdio: "inherit" });
  if (res.status !== 0) {
    console.warn("Ses ayarı yapılamadı, ham video kullanılıyor.");
    return rename(input, output);
  }
  return rm(input);
}
