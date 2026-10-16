# VOOM Instagram video projesi — çalışma notları

Bu dosya yeni oturumların kaldığı yerden devam etmesi içindir. Her oturum başında okuyun.

## Proje
VOOM (antrenman + beslenme + kişisel koç uygulaması) için Instagram Reels üretimi.
Remotion (React) ile video, ElevenLabs ile Türkçe seslendirme. Çalışma dalı:
`claude/elevenlabs-voom-turkish-voiceover-4jqxsc`.

## >>> YENİ OTURUM: BURADAN BAŞLA <<<
**Geçerli yöntem:** çizim v1 stili (`src/cizim1/Cizim1.tsx`, içerik `content/cizim1/*.json`): sade erkek
karakter, düz sepya kâğıt, YAVAŞ animasyonlar (Zack kurgusu, oda, 3D YOK). Ses: **Yunus**, eleven_v3,
sohbet tarzı `say` (+ dolgular), `maxPause: 0.3`. Pilot: `cizim1-01-yag-nereye` → video
`ornek-videolar/cizim1-pilot/01-yag-nereye.mp4` (kullanıcı onayı bekleniyor).
Sonraki işler (onaydan sonra): 2 tartı, 3 takip (bırakma), 4 mekik, 5 kas ağrısı, 6 duruş, 7 ter, 8 kas hafızası
→ sonra eleme listesindeki diğerleri. Her biri: `content/cizim1/cizim1-NN-<konu>.json` (voice + say + visual)
+ Cizim1.tsx'e o videoya özel sahne bileşenleri (SCENES'e benzersiz adla) → sessiz önizleme gönder → onay →
`npm run voiceover -- <id>` → `npm run render -- <id>` (çizim ~10 dk) → `ornek-videolar/` + commit + push.
Tartı ve takip metinleri `content/uc/uc-02-tarti.json`, `uc-03-takip.json` içinde hazır (hikâye tonu; yeni
stile taşınırken `say`'e dolgu eklenip ses Yunus yapılmalı). Gönderilen dosya 30 MB'ı geçerse ffmpeg ile
sıkıştır (crf 23-24). Kısa, Türkçe, telefondan okunacak şekilde yaz. "Her zaman daha iyisi olabilir."

## Geçmiş (özet)
Çizim v1 → v2 (gerçekçi karakter) → v3 (Zack kurgusu) → 3D kadın (ekip görüntüyü beğendi, sesten emin
değildi) → kullanıcı en sonunda **çizim v1'i seçti, 3D kız iptal**. Eski şablonlar yedek: `src/cizim` (v3),
`src/uc` (3D). Eski notlar aşağıda.

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

## KARAR (EN GÜNCEL): 1. sürüm çizim stili, 3D kız İPTAL
Kullanıcı ilk gönderilen çizimli pilotu (v1, commit c610079: sade karakter, yavaş animasyonlar, düz arka plan)
geri gönderdi: "bu beğeni aldı, artık bununla ilerleyeceğiz, kız iptal; bunu seslendir; bunun gibi yavaş
animasyonlarla ilerle". v1 şablonu geri getirildi: `src/cizim1/Cizim1.tsx`, içerik `content/cizim1/`
(id `cizim1-01-yag-nereye`).
**Ses: Yunus** (`Q5n6GDIjpN0pLOlycRFT`, genç erkek, sohbet tarzı) — karakter erkek olduğu için erkek ses.
Kullanıcı: "ChatGPT gibi, karşısında insan varmış gibi, düşünerek konuşsun; ıı/hmm olabilir; yapay tonlama
olmasın". `say` metnine yalnız dolgular eklenir (ıı, hmm, hani, yani, şey) + [curious]/[chuckles]; dolgular
altyazıya girmez (`scripts/ses-duzen.ts` matchWords). Uzun bekleme YOK: JSON'da `maxPause: 0.3` →
0.3 sn'den uzun sessizlikler otomatik kısaltılır (kullanıcı: "o kadar beklersen insanlar geçer").
Yeni videolar bu stilde (`content/cizim1/` + Cizim1.tsx sahneleri), yavaş animasyon, Zack kurgusu YOK.
3D (`src/uc`) ve çizim v3 (`src/cizim`) yedek olarak duruyor; tartı/takip 3D sessiz önizlemeleri iptal sayılır
(metinleri `content/uc/` içinde, yeni stile taşınabilir).

## Kullanıcının kendi sesi (izinli)
Kullanıcı kendi videosunu gönderip "benim sesimi kullanabilirsin, tiz olmasın, daha cool" dedi. Instant klon:
`MalkCL6Ms3mHRGDVY6vZ` ("VOOM Kullanıcı"). Örnekler `ses-ornekleri/kullanici-sesi/` (1 doğal = v3; 2 cool = v3 +
1.5 yarım ton kalın + sıcak EQ; 3 cool-sakin = multilingual_v2 + aynı işlem). Ham kayıt (.wav) repoya konmaz.
"Cool" işlemi (ffmpeg): `rubberband=pitch=0.917:formant=preserved,bass=g=2.5:f=170,treble=g=-2.5:f=6000,
deesser=i=0.4,acompressor=threshold=-20dB:ratio=2.5,loudnorm=I=-16:TP=-1.5`. Seçilirse seslendirmeye eklenecek.
Kullanıcı: "Böyle devam edebilirsin ama her zaman daha iyisi olabileceğini unutma."

## DURUM (en güncel)
- Ekip 3D pilotu (yağ nereye) **çok beğendi**; sadece ses konusunda kararsızlar, cevap bekleniyor.
  Kullanıcı: "diğerlerine tek tek başla". Ses kararı netleşene kadar yeni videolar **sessiz önizleme** olarak
  gönderiliyor (JSON'da `say` + `voiceId` hazır).
- 3D şablon: ortak parçalar `src/uc/kit.tsx`, videoya özel sahneler `src/uc/sahneler/<video>.tsx`
  (`DEFS` + `OVERLAYS`), `src/uc/Uc.tsx` bunları birleştirir. `visual` adları benzersiz olmalı (ör. `tarti-*`).
  Uygulama ekran görüntüsü gibi dokular `Uc.tsx` içinde `useTextures([...])` ile tuvalden ÖNCE yüklenir
  (tuval içinde yüklenen doku karede görünmez), sahnede `TEXTURES.get(file)`.
  Oturma/çömelme: UpLeg x+ (uyluğu öne) + Leg x− (dizi bük). Oturma bob ≈ −0.47.
- Sıra (ekip-11 sırası): 01 yağ nereye ✅ → 02 tartı (uc-02-tarti, Sultan) → 03 takip (uc-03-takip, Gamze) →
  03 takip/2. hafta → 04 mekik → 05 kas ağrısı → 06 duruş → 07 ter → 08 kas hafızası → sonra diğerleri.
  Sesleri 6 anlatıcı arasında dönüşümlü dağıt.

## KARAR: ses = Hürrem, hikâye anlatır gibi
Ekip: "Instagram'da ekranda tutacak, ritmik, gerçek insan sesi; hikâye anlatır gibi (örnek videolardaki gibi)".
Model **eleven_v3** + sahne başına `say` alanı: ton etiketli seslendirme metni ([curious], [whispers],
[short pause], [laughs], [excited], "..."). `voice` altyazı metni olarak kalır; `say` ile kelimeleri aynı
olmalı (yalnız etiket/noktalama farkı) yoksa animasyon kelime indeksleri kayar. Etiketler altyazıya girmez.
Pilot sesi: **Hürrem** (`TASY7VCrU29rEMoYFTGG`). Kullanıcı: 6 anlatıcı sesin hepsi farklı videolarda
kullanılabilir — Derya `NNn9dv8zq2kUo7d3JSGG`, Sultan `gyxPK6bLXQAkBSCeAKvk`, Gamze `Hvrobr8BhLPfiaSv2cHi`,
Mimoza `J2f0yzAg5MILTXuHmQvk`, Hürrem `TASY7VCrU29rEMoYFTGG`, Dilek `vWs6DV3PkGKMP80V1Hv6`
(örnekler `ses-ornekleri/anlatici-adaylar/`). Kütüphane slotu sınırı 10.

## Önceki: kadın sesi = Derya
Kullanıcı "gerçekçi, yapay zeka olduğu belli olmasın" dedi; 10 Türkçe kütüphane sesinden **6 - Derya**
(`NNn9dv8zq2kUo7d3JSGG`, profesyonel klon) seçildi. Model `eleven_multilingual_v2`, ayarlar JSON'da
`voiceSettings` (stability 0.45, similarityBoost 0.8, style 0.25). Adaylar: `ses-ornekleri/kadin-adaylar/`.
3D pilot sessiz önizlemesi onaylandı, Derya ile seslendirildi (38 sn).

## KARAR: 3D kadın karakter
Kullanıcı yan yana denemede **3D kadın versiyonunu** seçti ("kız versiyonunu beğendim"). Kullanıcıyla
**Türkçe** konuş. Pilot 3D olarak yeniden kuruldu: `content/uc/uc-01-yag-nereye.json`,
şablon `src/uc/Uc.tsx`. Sessiz önizleme render edilip gönderilecek → onay → `npm run voiceover --
uc-01-yag-nereye` → `npm run render -- uc-01-yag-nereye` (render.ts `uc-*` için `gl: swangle` kullanır;
yaklaşık 30-40 dk sürer). Çizimli şablon (`src/cizim`) yedek olarak duruyor.
3D şablon notları:
- Model `public/3d/kadin.glb` (Mixamo Michelle). Kemik dönüşleri modelin kendi duruşuna EKLENİR (`applyPose`);
  sıfırlamak duruşu bozar. Eksenler: Kol x+ = aşağı, z+ = öne (sağ kolda z işareti ters); Önkol z = dirsek
  bükme; UpLeg x+ = bacağı öne kaldır; Leg x+ = diz bük; Head x+ = başı eğ, y = çevir; Spine x+ = öne eğil.
- Sahne = `DEFS[visual]`: `pose`, `cam` (planlar), `fx` (3D efektler), isteğe bağlı `shake`; 2D katman
  `OVERLAYS[visual]` (sadece önemli sayılar). Vücut içi yakın çekim için odadan uzakta `MICRO` seti var.
- Erkek karakter için aynı kalitede ücretsiz model henüz bulunamadı (Xbot/Soldier insan gibi değil).

## Kullanıcı cevapları (3. sürümden sonra)
- Referans: "benzesin, kopya olmasın".
- Karakter: **bir kadın bir erkek** (iki sabit karakter).
- Ekran yazısı: **sadece önemli sayılar** (%84, CO₂ gibi); gerisini çizim anlatır.
- Yöntem: **ikisini de 1 sahne dene** → açılış sahnesi hem çizim hem 3D olarak denendi, kullanıcı seçecek.
  3D deneme: `src/deneme3d/Deneme3D.tsx` (composition `deneme-3d`), model `public/3d/kadin.glb`
  (Mixamo "Michelle", three.js örnek deposundan; tek animasyonu dans, kemikler kodla pozlanıyor).
  Render: `npx remotion render src/index.ts deneme-3d out/deneme/3d.mp4 --gl=swangle` (sunucuda GPU yok;
  `angle` çalışmıyor). Model yüklenmeden `ThreeCanvas` kurulmamalı (yoksa kare boş çekilir).

## Çizimli şablon (yeni yöntem)
- İçerik: `content/cizim/*.json` (sahne başına `visual` + `voice`). Şablon: `src/cizim/Cizim.tsx`.
- Kodla çizilmiş, poz verilebilen karakter `Person` (göbek `belly`, kol/bacak açıları, ağız/göz ifadesi,
  akciğer, kas parlaması), eşyalar (tartı, düşünce balonu, damla, nefes bulutu, büyüteç, yıldız, el yazısı).
- Kâğıt dokusu + ışık huzmeleri + toz; "el çizimi" titreşim filtresi; sahne başına yavaş kamera yakınlaşması.
- Kamera: `Cam` + `plans` (her plan bir kelimede sert kesmeyle başlar, a → b yavaş kayar); arka plan `Room`
  paralaksla. Karakter `back` ile arkadan çizilir.
- Animasyonlar kelime zamanlamasına bağlı (`w(i)` = i. kelimenin karesi): seslendirmeden sonra otomatik oturur.
- Yeni video = yeni sahne bileşenleri (`SCENES`) + JSON. El yazısı fontu Caveat (`public/fonts`).

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
- `ornek-videolar/cizim-pilot/`: çizimli pilot, seslendirilmiş son hâli + sessiz önizleme.
- `ornek-videolar/ekip-11/`: ekibe gönderilen 11 video (8 bilgi + 3 VOOM), açıklama `OKU.md`.
- `ornek-videolar/secilen-8/`, `voom-secilen-3/`: aynı videoların ilk hâlleri.
