import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Post } from "../src/types";

export const ROOT = process.cwd();
export const POSTS_DIR = path.join(ROOT, "content", "posts");

const TYPES = new Set(["hook", "point", "myth", "fact", "cta"]);

// Komut satırında id verilirse sadece o gönderileri, verilmezse hepsini döndürür.
export async function loadPosts(onlyIds: string[] = []): Promise<Post[]> {
  const files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith(".json")).sort();
  const posts: Post[] = [];
  for (const f of files) {
    const post = JSON.parse(await readFile(path.join(POSTS_DIR, f), "utf8")) as Post;
    validate(post, f);
    posts.push(post);
  }
  if (onlyIds.length === 0) return posts;
  const missing = onlyIds.filter((id) => !posts.some((p) => p.id === id));
  if (missing.length) throw new Error(`Bulunamayan gönderi: ${missing.join(", ")}`);
  return posts.filter((p) => onlyIds.includes(p.id));
}

function validate(post: Post, file: string) {
  const fail = (msg: string) => {
    throw new Error(`${file}: ${msg}`);
  };
  if (!/^[a-z0-9-]+$/.test(post.id ?? "")) fail("id sadece küçük harf, rakam ve '-' içermeli");
  if (!Array.isArray(post.scenes) || post.scenes.length === 0) fail("scenes boş olamaz");
  post.scenes.forEach((s, i) => {
    if (!TYPES.has(s.type)) fail(`sahne ${i + 1}: geçersiz type "${s.type}"`);
    if (!s.voice?.trim()) fail(`sahne ${i + 1}: voice boş`);
  });
}
