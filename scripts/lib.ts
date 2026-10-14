import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Post, Promo, Story } from "../src/types";

export const ROOT = process.cwd();
export const POSTS_DIR = path.join(ROOT, "content", "posts");
export const STORIES_DIR = path.join(ROOT, "content", "stories");
export const PROMOS_DIR = path.join(ROOT, "content", "promos");

// Seslendirilip render edilebilen her şey: kısa Reels gönderileri, hikâye ve tanıtım videoları
export type Video = Post | Story | Promo;

const TYPES = new Set(["hook", "point", "myth", "fact", "cta"]);

async function readDir<T>(dir: string): Promise<{ item: T; file: string }[]> {
  const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".json")).sort();
  return Promise.all(
    files.map(async (file) => ({ file, item: JSON.parse(await readFile(path.join(dir, file), "utf8")) as T })),
  );
}

// Komut satırında id verilirse sadece onları, verilmezse hepsini döndürür.
export async function loadVideos(onlyIds: string[] = []): Promise<Video[]> {
  const videos: Video[] = [];
  for (const { item, file } of await readDir<Post>(POSTS_DIR)) {
    validate(item, file, (s, fail) => {
      if (!TYPES.has((s as Post["scenes"][number]).type)) fail(`geçersiz type`);
    });
    videos.push(item);
  }
  for (const { item, file } of await readDir<Story>(STORIES_DIR)) {
    validate(item, file, (s, fail) => {
      if (!(s as Story["scenes"][number]).visual) fail("visual boş");
    });
    videos.push(item);
  }
  for (const { item, file } of await readDir<Promo>(PROMOS_DIR)) {
    validate(item, file, (s, fail) => {
      const f = (s as Promo["scenes"][number]).focus;
      if (f && !(s as Promo["scenes"][number]).screen) fail("focus için screen gerekli");
    });
    videos.push(item);
  }
  const ids = new Set<string>();
  for (const v of videos) {
    if (ids.has(v.id)) throw new Error(`Aynı id iki kez kullanılmış: ${v.id}`);
    ids.add(v.id);
  }
  if (onlyIds.length === 0) return videos;
  const missing = onlyIds.filter((id) => !ids.has(id));
  if (missing.length) throw new Error(`Bulunamayan video: ${missing.join(", ")}`);
  return videos.filter((v) => onlyIds.includes(v.id));
}

function validate(
  v: Video,
  file: string,
  checkScene: (s: Video["scenes"][number], fail: (msg: string) => never) => void,
) {
  const fail = (msg: string): never => {
    throw new Error(`${file}: ${msg}`);
  };
  if (!/^[a-z0-9-]+$/.test(v.id ?? "")) fail("id sadece küçük harf, rakam ve '-' içermeli");
  if (!Array.isArray(v.scenes) || v.scenes.length === 0) fail("scenes boş olamaz");
  v.scenes.forEach((s, i) => {
    if (!s.voice?.trim()) fail(`sahne ${i + 1}: voice boş`);
    checkScene(s, (msg) => fail(`sahne ${i + 1}: ${msg}`));
  });
}
