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
Pilot (yağ nereye gidiyor) çizimli 3. sürüm **onaylandı ve seslendirildi** (erkek ses, 36 sn ses / 39 sn video):
`ornek-videolar/cizim-pilot/01-yag-nereye.mp4`. Yöntem denemesi (çizim mi 3D mi) kullanıcıya gönderildi, cevap bekleniyor:
`ornek-videolar/yontem-denemesi/karsilastirma.mp4`. Önceki notlar:
`ornek-videolar/cizim-pilot/01-yag-nereye-sessiz.mp4` (id `cizim-01-yag-nereye`, 8 sahne, ~45 sn). 2. sürüm: gerçekçi oranlı gölgeli karakter, kamera hareketleri, yeni metin (kullanıcı ilk sürüm için "karakter basit, hareket az, metin zayıf" dedi).
3. sürüm: kullanıcı ikinci örnek olarak Zack D. Films videosu gönderdi ("harmanla"): sepya çizim stili
korundu, kurgu Zack gibi yapıldı — her cümle 2-4 kamera planına bölünür (geniş, yakın, arkadan, nesne yakın
çekimi), sert kesmeler, karakter çizilmiş bir odada (pencere, güneş, parke, bitki, dambıl), ekran yazısı en aza
indirildi. Referans: "örneğe yakın olsun, aynısı/kopyası değil".
Onay gelince: `npm run voiceover -- cizim-01-yag-nereye` → `npm run render -- cizim-01-yag-nereye`.
Sonra kalan videolar sırayla aynı yöntemle (öncelik `ornek-videolar/ekip-11/OKU.md`'deki 11 video).

## KARAR: 3D kadın karakter (en güncel)
Kullanıcı yan yana denemede **3D kadın versiyonunu** seçti ("kız versiyonunu beğendim"). Kullanıcıyla
**Türkçe** konuş. Pilot 3D olarak yeniden kuruldu: `content/uc/uc-01-yag-nereye.json` (ses: kadın, Bella),
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
