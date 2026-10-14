import type { Post } from "./types";

// content/posts/ klasöründeki tüm JSON dosyaları otomatik olarak video olur.
const ctx = require.context("../content/posts", false, /\.json$/);

const byId = new Map<string, Post>();
for (const key of ctx.keys()) {
  const post = ctx(key) as Post;
  byId.set(post.id, post);
}

export const posts = [...byId.values()];
