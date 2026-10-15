# VOOM Instagram video projesi — çalışma notları

Bu dosya yeni oturumların kaldığı yerden devam etmesi içindir. Her oturum başında okuyun.

## Proje
VOOM (antrenman + beslenme + kişisel koç uygulaması) için Instagram Reels üretimi.
Remotion (React) ile video, ElevenLabs ile Türkçe seslendirme. Çalışma dalı:
`claude/elevenlabs-voom-turkish-voiceover-4jqxsc`.

## Kullanıcıyla anlaşılan çalışma kuralları
- **Önce sessiz önizleme, onaydan sonra seslendirme.** Kredi boşa gitmesin.
- **Adım adım, yavaş:** önce 1 pilot, onay gelince kalanlar. Yarım iş bırakma.
- Her işin sonunda commit + push.
- Kullanıcı Türkçe konuşuyor, telefondan takip ediyor; kısa ve net anlat.

## Ekip geri bildirimi (en güncel, buna uy)
1. **Konu dar tutulacak: sadece ANTRENMAN ve SAĞLIK.** Basketbol, voleybol, yüzme gibi spor dalları YOK.
2. **Görsel, söylenen şeyi birebir göstermeli.** Ses "karın yağların erir" derken ekranda karın yağı eriyen
   bir insan olmalı. Grafik/kart/ikon ağırlıklı anlatım "zayıf" bulundu.
3. **Masal/hikâye değil.** Örnek video (gergedan hikâyesi, sepya illüstrasyonlar) sadece görsel kalite ve tempo
   için referans; içerik masal gibi anlatılmayacak.
4. **Dil:** argo yok ("kanka", "bi" gibi kelimeler çok "keko"). Düzgün, akıcı, merak uyandıran Türkçe.
   Kitap gibi ağır da değil. Örnek videodaki tempo: ~3 kelime/sn.

## Kararlar (kullanıcı onayladı)
1. **Eleme listesi onaylandı** (aşağıda, kalp ve şeker dahil).
2. **Görsel yöntemi: B — ücretsiz, kodla çizilmiş illüstrasyonlar.** Kullanıcı: "Ücretsiz yapabildiğin her şey;
   daha az maliyet, daha fazla kâr, başlangıç bu." Ücretli API önerme. (Ücretsiz Pollinations denendi: kalite
   çok kötü + filigran, kullanılmaz.)
   Hedef: söylenen şeyi birebir gösteren sahneler. Ör. "karın yağların erir" → karnındaki yağ eriyen bir
   karakter. Örnek videonun havası: sıcak sepya kâğıt dokusu, ışık huzmeleri, elle çizilmiş görünüm,
   yumuşak geçişler, yavaş kamera hareketi, ortada küçük altyazı (o anki kelime sarı).
   Önerilen yapı: yeniden kullanılabilir bir karakter (poz verilebilen, ifadeli), sahne/eşya kütüphanesi
   (tartı, dambıl, yatak, su şişesi, masa, sandalye…), SVG "el çizimi" filtresi (feTurbulence +
   feDisplacementMap), kâğıt dokusu, ışık huzmeleri.

## Eleme sonucu (onaylandı)
Kalan 22 bilgi videosu:
- Antrenman: bilgi-kas, reels-03-kas-agrisi, reels-04-kas-hafizasi, reels-07-isinma, reels-10-mekik,
  bilgi-takip, bilgi-6-hafta, bilgi-koc, seri2-03-diz-agrisi, seri2-06-kosu-nefes,
  seri3-02-kadin-agirlik, seri3-06-kemik
- Sağlık: reels-01-yag-nereye, reels-02-tarti, reels-05-ter, reels-06-uyku, reels-09-su,
  reels-08-gunluk-hareket, bilgi-durus, bilgi-takviye, seri3-01-10bin-adim, seri3-03-kalp, seri3-04-seker
Elenen 7: yuzme-suda-kalmak, seri2-02-voleybol, seri2-05-basketbol, seri2-04-catlak,
seri2-01-sabah-uzun, bilgi-hobi, seri3-05-kahve.
VOOM tanıtım videoları (content/promos/voom-*) kalıyor.

## Sıradaki adım
1 pilot (reels-01-yag-nereye) → yeni metin (dar, düzgün dil) + söyleneni birebir gösteren
görseller → sessiz önizleme → onay → seslendirme → kalan videolar sırayla. Öncelik ekibe giden 11 video
(`ornek-videolar/ekip-11/OKU.md`), sonra diğerleri.

## Teknik özet
- İçerik: `content/explainers/*.json` (bilgi videoları), `content/promos/*.json` (VOOM tanıtım, uygulama
  ekran görüntüleri `public/app/`). Şablonlar: `src/explainer/Explainer.tsx`, `src/promo/Promo.tsx`.
- Efekt katmanı (geçiş, sarsıntı, patlama, `stamp`, emoji `sticker`, konfeti, ses efektleri `public/sfx/`)
  `Explainer.tsx` içinde; Promo da aynısını kullanıyor.
- `npm run voiceover -- <id>`: ElevenLabs. Videoya özel `voiceId`/`modelId` (eleven_v3, Türkçe).
  Sesler: erkek `iP95p4xoKVk53GoZ742B` (Chris), kadın `hpp4J3VqNfWAUOO0d1Us` (Bella). Kütüphane
  (ana dili Türkçe) sesler ücretli planda kullanılabilir — Starter plan alındı (aylık ~30k karakter).
  Metni değişmeyen sahne yeniden seslendirilmez; her sahneden sonra manifest kaydedilir.
- Bulut ortamında anahtar `xi-api-key` başlığıyla Network secrets'ta; Node fetch için
  `NODE_USE_ENV_PROXY=1` (package.json'da hazır).
- `npm run render -- <id>`: çıktı `out/<id>/` (video.mp4, kapak.jpg, aciklama.txt). Ses −14 LUFS'a
  normalize edilir (Instagram standardı).
- Render ortamında: `REMOTION_BROWSER_EXECUTABLE` gerekmez, Remotion kendi Chrome'unu indirir.
- Dosya gönderme sınırı 30 MB: büyük paketleri parçalara böl.

## Teslim edilenler
- `ornek-videolar/ekip-11/`: ekibe gönderilen 11 video (8 bilgi + 3 VOOM), açıklama `OKU.md`.
- `ornek-videolar/secilen-8/`, `voom-secilen-3/`: aynı videoların ilk hâlleri.
