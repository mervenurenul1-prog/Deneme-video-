# Deneme Video — Remotion + ElevenLabs

Sahne metinlerini ElevenLabs ile seslendirip Remotion ile kelime kelime vurgulanan altyazılı bir videoya dönüştürür.

## Kurulum

```bash
npm install
cp .env.example .env   # ELEVENLABS_API_KEY değerini girin
```

## Kullanım

| Komut | Açıklama |
| --- | --- |
| `npm run voiceover` | `src/scenes.ts` içindeki her sahne için ElevenLabs'ten ses + kelime zamanlamaları üretir (`public/voiceover/`) |
| `npm run dev` | Remotion Studio'yu açar (canlı önizleme) |
| `npm run render` | Videoyu `out/video.mp4` olarak dışa aktarır |
| `npm run build` | Seslendirme + render, tek adımda |

Seslendirme üretilmeden de Studio açılır; sahneler sessiz ve 3'er saniye olarak gösterilir.

## Özelleştirme

- **Metinler / renkler:** `src/scenes.ts` — değiştirdikten sonra `npm run voiceover` çalıştırın.
- **Ses:** `.env` içindeki `ELEVENLABS_VOICE_ID` ([Voice Library](https://elevenlabs.io/app/voice-library)).
- **Model:** `scripts/generate-voiceover.ts` içinde `eleven_multilingual_v2` (Türkçe destekler).
- **Görünüm:** `src/Main.tsx`.

Video süresi, ses dosyalarının uzunluğuna göre otomatik hesaplanır (`src/Root.tsx` → `calculateMetadata`).
