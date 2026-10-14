// Videodaki sahneler. Metni değiştirdikten sonra `npm run voiceover` çalıştırın.
export type Scene = {
  id: string;
  text: string;
  background: string;
};

export const scenes: Scene[] = [
  {
    id: "giris",
    text: "Merhaba! Bu video Remotion ve ElevenLabs ile otomatik olarak üretildi.",
    background: "#1e3a8a",
  },
  {
    id: "remotion",
    text: "Remotion, videoları React bileşenleri olarak yazmamızı sağlıyor.",
    background: "#7c2d12",
  },
  {
    id: "elevenlabs",
    text: "ElevenLabs ise bu metinleri doğal bir sesle seslendiriyor.",
    background: "#14532d",
  },
];

export type WordTiming = { word: string; start: number; end: number };

// scripts/generate-voiceover.ts tarafından public/voiceover/manifest.json'a yazılır.
export type VoiceoverManifest = Record<
  string,
  { file: string; durationInSeconds: number; words: WordTiming[] }
>;
