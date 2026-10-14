# Fitness Reels Fabrikası — Remotion + ElevenLabs

Fitness uygulamasının Instagram hesabı için düzenli Reels üretim altyapısı. Her gönderi `content/posts/` altında
bir JSON dosyasıdır. ElevenLabs seslendirir, Remotion dikey (1080×1920) video, kapak görseli ve
Instagram açıklamasını üretir.

## Kurulum

```bash
npm install
cp .env.example .env   # ELEVENLABS_API_KEY değerini girin
```

## Günlük akış

```bash
npm run new -- protein-ne-kadar   # 1. Şablondan yeni gönderi oluştur, metinleri düzenle
npm run voiceover                 # 2. Seslendir (sadece yeni/değişen sahneler, kredi harcamaz)
npm run dev                       # 3. Remotion Studio'da önizle
npm run render -- protein-ne-kadar  # 4. out/protein-ne-kadar/ → video.mp4, kapak.jpg, aciklama.txt
```

`npm run voiceover` ve `npm run render` id verilmezse tüm gönderileri işler. `npm run build` ikisini birden çalıştırır.

## Gönderi formatı

```jsonc
{
  "id": "mekik-mit",                    // dosya adı ile aynı; küçük harf, rakam, '-'
  "title": "Mekik göbek yağını eritir mi?",
  "scenes": [
    { "type": "hook", "voice": "Seslendirilecek metin", "display": "Ekranda büyük yazı" },
    { "type": "myth", "voice": "..." , "display": "..." },
    { "type": "fact", "voice": "..." , "display": "..." },
    { "type": "point", "voice": "..." },   // display yoksa seslendirme kelime kelime ekranda vurgulanır
    { "type": "cta", "voice": "...", "display": "..." }
  ],
  "caption": "Instagram açıklaması",
  "hashtags": ["fitness", "spor"]
}
```

| Sahne tipi | Görünüm |
| --- | --- |
| `hook` | Büyük açılış başlığı — ilk 2 saniye izleyiciyi tutar |
| `point` | Numaralı madde (1, 2, 3…) |
| `myth` / `fact` | Kırmızı **MİT** (üstü çizili) / yeşil **GERÇEK** etiketi |
| `cta` | Uygulama adı, "link profilde" ve hesap adı |

`display` verilen sahnelerde seslendirme ayrıca alt yazı olarak gösterilir (Reels'lerin çoğu sessiz izlenir).
Tüm metinler Instagram arayüzünün kapatmadığı güvenli alanda kalır, üstte bir ilerleme çubuğu bulunur.

## Hikâye videoları

`content/stories/` altındaki dosyalar, her sahnesi özel çizilmiş animasyonlu hikâye videolarıdır
(örnek: `penisilin.json` — penisilinin kazara keşfi). Her sahnenin `visual` alanı, `src/stories/Story.tsx`
içindeki bir animasyonu seçer; `voice` alanı seslendirilecek metindir. Seslendirme ve render komutları aynıdır:

```bash
npm run voiceover -- penisilin
npm run render -- penisilin
```

Ses henüz üretilmemişse video sessiz oluşturulur; alt yazılar okuma hızına göre tahmini zamanlanır.

## Uygulama tanıtım videoları

`content/promos/` altındaki dosyalar, uygulamanın ekran görüntülerini telefon çerçevesinde gösteren
tanıtım videolarıdır (örnek: `voom-tanitim.json`). Ekran görüntüleri `public/app/` altındadır.
Her sahnede `screen` (ekran görüntüsü), `kicker` (küçük etiket), `display` (başlık) ve `focus`
(kameranın yaklaşacağı bölge, 923 px genişliğe göre koordinatlar) verilebilir; `screen` olmayan
sahneler yalnızca yazıdan oluşur, son sahne kapanış kartıdır.

## Özelleştirme

- **Marka (uygulama adı, hesap, renkler, müzik):** `src/brand.ts`
- **Ses:** `.env` → `ELEVENLABS_VOICE_ID` ([Voice Library](https://elevenlabs.io/app/voice-library)),
  `ELEVENLABS_MODEL_ID` (`eleven_multilingual_v2` varsayılan; `eleven_flash_v2_5` daha ucuz)
- **ElevenLabs anahtarı yoksa (ücretsiz yedek ses):** `pip install edge-tts` ardından
  `python3 scripts/generate-voiceover-edge.py voom-tanitim` — Microsoft Edge'in Türkçe sesiyle
  (`--voice tr-TR-AhmetNeural` varsayılan, `tr-TR-EmelNeural` kadın sesi) aynı manifest biçimini üretir.
  Anahtar gelince `npm run voiceover -- voom-tanitim` bu sesleri ElevenLabs ile değiştirir.
- **Arka plan müziği:** dosyayı `public/music/` altına koyup `brand.music` alanına yolunu yazın
  (telifsiz müzik kullanın).
- **Görünüm / animasyonlar:** `src/Reel.tsx`
- **Font:** Montserrat projeye gömülüdür (`public/fonts`, SIL OFL lisansı).
