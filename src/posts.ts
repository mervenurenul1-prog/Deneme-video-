import type { Cizim, Explainer, Post, Promo, Story } from "./types";

// content/posts/, content/stories/ ve content/promos/ klasörlerindeki tüm JSON dosyaları otomatik olarak video olur.
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
export const promos = load<Promo>(require.context("../content/promos", false, /\.json$/));
export const explainers = load<Explainer>(require.context("../content/explainers", false, /\.json$/));
export const cizimler = load<Cizim>(require.context("../content/cizim", false, /\.json$/));
