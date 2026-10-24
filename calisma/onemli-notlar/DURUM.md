# Şu anki durum (en güncel üstte, kısa tut)

## >>> YENİ SOHBET BURADAN (24 Ekim) <<<
- **24 Ekim: 14 BEDEN ALGISI** (`cizim1-14-beden`, sahneler `ba-*`, VOOM'SUZ, kaynak `arastirma/14-beden-algisi.md`): metin v4
  onaylandı (oyuncak asker kolu 30→68 cm, Pope 1999; güzellik kraliçeleri JAMA 2000; "Bunu sevgiline gönder ve sor: kim daha
  çok kandırıldı?"). Sessiz önizleme `14-beden-sessiz.mp4` → onay → seslendirme (~520 kr) → 1.2x → render.
- Cepteki adaylar (`konular/ONERILER.md`): 8 (1990, 90 yaşında halter), 2 (1953 Londra otobüsü), 7 (2017 hafta sonu
  sporcusu — VOOM'lu sıraya bekliyor, notları ONERILER'de), 5 (kahvaltı reklamı — VOOM bağı yok, beslenme planı YOK).
- **24 Ekim: 13 KARDİYO KIZ İŞİ BİTTİ** (`cizim1-13-kardiyo`, sahneler `kd-*`, VOOM'suz, kaynak `arastirma/13-kardiyo.md`):
  merdivende nefes nefese → "kardiyo kız işi" → aerobik bir askeri doktordan (1968) → Brezilya 70, en iyi futbolcu "çok iyi"
  alamadı (not cetveli) → kupa işi (vurgulu) → kalp de kas, haftada 2 gün +15 dk ("kaydet" ÇIKTI, dolgu yok) → "…gönder. Çünkü o da:" (döngü).
  Modern salon `KdGym` (kullanıcının salon fotoğraflarından). Yunus 1.2x, 29,0 sn → `ornek-videolar/cizim1-pilot/13-kardiyo.mp4`.
  Kullanıcı: hiçbir sahne durağan olmasın (her sahnede kamera hareketi).
- Kalan ElevenLabs kredisi 12.422 (24 Ekim).

## 23 Ekim'de bitenler
- **12 SPOT IŞIĞI BİTTİ** (`cizim1-12-spot`, sahneler `sp3-*`; eski denemeler `sp-*`, `sp2-*` arşiv): "Salonda kırk kişi var.
  Sence kaçı şu an seni düşünüyor?" → balonlar (göbek/set/mesaj) → ev + apartman pencereleri → 2006 "Salona gitmemek için
  para ödemek" (DellaVigna & Malmendier) → "Planı olan kişi kaybolmaz…" → VOOM + "yıllık üyelik yaptırıp hiç gitmeyen
  arkadaşına gönder ve sor:" (döngü). Yunus 1.2x, 31,6 sn → `ornek-videolar/cizim1-pilot/12-spot.mp4`.
  Süreç dersi: ~10 metin turu sürdü; kullanıcı onayı için önce kısa SEÇENEKLER (kanca/yön), sonra metin, sonra önizleme.
- Mayışma ve Victoria's Secret defilesi İPTAL. Ekim teorisi zamanı geçti.

## 1.2x hızlandırma (seslendirmeden sonra, elle)
`npm run voiceover -- <id>` → manifestteki her mp3'e `ffmpeg -filter:a atempo=1.2`, `durationInSeconds` ve kelime
start/end /1.2, manifeste `"speed": 1.2` → `npm run render -- <id>` → `out/<id>/video.mp4`'ü `ornek-videolar/`a kopyala.

## Biten videolar (`ornek-videolar/cizim1-pilot/`)
01 yağ nereye · 02 tartı · 03 on bin adım · 04 kadın-ağırlık · 05 boyun(-b) · 06 diz · 07 yaş · 09 kilo-hangimiz ·
10 selülit (EN BEĞENİLEN) · 12 spot ışığı · 13 kardiyo. Beklemede: 08 sauna.
