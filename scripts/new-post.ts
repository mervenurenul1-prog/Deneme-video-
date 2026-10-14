import { access, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Post } from "../src/types";
import { POSTS_DIR } from "./lib";

// Kullanım: npm run new -- <id>   (ör. npm run new -- karin-kasi-hatalari)
const id = process.argv[2];
if (!id || !/^[a-z0-9-]+$/.test(id)) {
  console.error("Kullanım: npm run new -- <id>  (küçük harf, rakam ve '-')");
  process.exit(1);
}
const file = path.join(POSTS_DIR, `${id}.json`);
if (await access(file).then(() => true, () => false)) {
  console.error(`${file} zaten var.`);
  process.exit(1);
}

const template: Post = {
  id,
  title: "Başlık",
  scenes: [
    { type: "hook", voice: "İzleyiciyi ilk iki saniyede yakalayan cümle." },
    { type: "point", voice: "Birinci maddenin seslendirmesi.", display: "Kısa ekran metni" },
    { type: "point", voice: "İkinci maddenin seslendirmesi.", display: "Kısa ekran metni" },
    { type: "cta", voice: "Daha fazlası için uygulamamızı indir.", display: "Kaydet ve paylaş" },
  ],
  caption: "Instagram açıklaması",
  hashtags: ["fitness", "spor"],
};
await writeFile(file, JSON.stringify(template, null, 2) + "\n");
console.log(`Oluşturuldu: content/posts/${id}.json`);
