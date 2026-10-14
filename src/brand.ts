// Marka ayarları — uygulamanın adı, renkleri ve Instagram hesabıyla değiştirin.
export const brand = {
  appName: "VOOM",
  handle: "@voom", // TODO: gerçek Instagram kullanıcı adı
  ctaLine: "Uygulamayı indirmek için link profilde",
  colors: {
    bgFrom: "#000000",
    bgTo: "#0a0a0a",
    accent: "#c8e85a",
    text: "#ffffff",
    myth: "#f87171",
    fact: "#4ade80",
  },
  // public/ altına bir müzik dosyası koyup yolunu yazın, ör. "music/arka-plan.mp3"
  music: null as string | null,
  musicVolume: 0.12,
};

export const VIDEO = {
  fps: 30,
  width: 1080,
  height: 1920,
  // Her sahnede ses bittikten sonra bırakılan boşluk
  paddingSeconds: 0.35,
  // Seslendirme yokken sahne süresi
  fallbackSeconds: 3,
};
