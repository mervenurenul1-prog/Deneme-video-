# Sesler
- Anlatıcı: **Yunus** `Q5n6GDIjpN0pLOlycRFT`, model `eleven_v4`. Sonra hızlandır (atempo + manifest kelime zamanları /hız): eskiden 1.2x,
  **21 tenyadan itibaren 1.3x** (kullanıcı, 29 Ekim).
- **Duru** (yeni seri kız karakteri, 28 Ekim) = kullanıcının kendi sesi, klon v2 `kd6P2yodCccO2OzNoqOD`.
- Anne: **Sibel** `qLdPxFtPuffoxx5gieBJ` (yalnız anne). Genç kadın: **Aslı** `HZh2tWL1clJO95e2qMt2`.
  Kız klonu `kUOROTx2GgiPee3eXWoa`. Kullanıcı klonu v2 `kd6P2yodCccO2OzNoqOD` (yalnız kadın replikleri; anlatıcı Yunus kalır).
- `npm run voiceover -- <id>`; sahne başına `voiceId`/`voiceSettings`. Önbellek metne göre: değişmeyen sahne yeniden üretilmez.
- Kredi: seslendirmeden önce `GET /v1/user/subscription`, kullanıcıya söyle. Son bilinen 10.936 (29 Ekim, tenya sonrası).
- Müzik: `music/merak-gerilim.mp3` (eski seri). **1930'lar stili (Yunus + Duru) için `music/1930-kovalamaca.mp3`** (29 Ekim, 21 tenya;
  adaylar `ses-ornekleri/muzik-1930/`, üretici `scripts/muzik-1930.py`, FluidSynth + FluidR3 GM, ücretsiz).
- **MÜZİK SESİ GEÇMESİN (kullanıcı, 29 Ekim: "fon müziği seslendirmeyi geçmiş, yarışıyor"):** seslendirme dosyaları ~−24 LUFS;
  eski ayarla müzik de ~−24'te çalıyordu. Dolu müzikte JSON `"musicVolume": 0.55, "musicDuck": 0.55` (konuşurken kısılır) +
  müzik dosyasında konuşma frekansları oyulur (`equalizer=f=1800:g=-6, f=3200:g=-4`, −22 LUFS). Hedef: konuşmada müzik sesin
  ~13 dB altında, aralarda ~8 dB altında. Efektler az ve kısık (`SFX_GAIN`, `tidySfx`).
  Yeni müzik/efekt ÜCRETSİZ (Python/numpy, CC0) — ElevenLabs Music/SFX KULLANMA.
- **DOLGU KURALI (kullanıcı, 23 Ekim, SON):** Yunus hızlı konuşsun (1.2x). İlk ve SON sahnede dolgu YOK (izleyiciyi tutmak için).
  ORTA sahnelerde dolgular (ıı, hani, [chuckles] gülme) KALSIN — kullanıcı seviyor, izlenme oranını açıyor; çok kesme.
- Dolgu YERİ (24 Ekim): yalnız doğal duraklama yerlerine; cümle sonuna/çağrının önüne "Hani…" gibi saçma dolgu KOYMA.
- Kas adları: kullanıcı sonra "pazı" (veya biceps) olabilir dedi (24 Ekim); çok teknik terim yine yok.
