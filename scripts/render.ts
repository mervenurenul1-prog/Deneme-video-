import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { loadPosts, ROOT } from "./lib";

// Kullanım: npm run render            → tüm gönderiler
//           npm run render -- <id>... → sadece belirtilenler
// Çıktı: out/<id>/video.mp4, kapak.jpg, aciklama.txt

const posts = await loadPosts(process.argv.slice(2));
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

console.log("Proje paketleniyor...");
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src", "index.ts") });

for (const post of posts) {
  const outDir = path.join(ROOT, "out", post.id);
  await mkdir(outDir, { recursive: true });

  const composition = await selectComposition({ serveUrl, id: post.id, browserExecutable });
  console.log(`[${post.id}] ${(composition.durationInFrames / composition.fps).toFixed(1)} sn render ediliyor...`);

  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    outputLocation: path.join(outDir, "video.mp4"),
    browserExecutable,
  });

  // Kapak: hook sahnesinin animasyonu oturduktan sonraki kare
  await renderStill({
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
