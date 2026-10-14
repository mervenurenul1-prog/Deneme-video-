import type { Post, Story } from "./types";

// content/posts/ ve content/stories/ klasörlerindeki tüm JSON dosyaları otomatik olarak video olur.
const load = <T extends { id: string }>(ctx: __WebpackModuleApi.RequireContext): T[] => {
  const byId = new Map<string, T>();
  for (const key of ctx.keys()) {
    const item = ctx(key) as T;
    byId.set(item.id, item);
  }
  return [...byId.values()];
};

export const posts = load<Post>(require.context("../content/posts", false, /\.json$/));
export const stories = load<Story>(require.context("../content/stories", false, /\.json$/));
