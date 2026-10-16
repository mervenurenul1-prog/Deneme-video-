# VOOM Instagram video projesi — çalışma notları

Bu dosya yeni oturumların kaldığı yerden devam etmesi içindir. Her oturum başında okuyun.

## Proje
VOOM (antrenman + beslenme + kişisel koç uygulaması) için Instagram Reels üretimi.
Remotion (React) ile video, ElevenLabs ile Türkçe seslendirme. Güncel hâl **main** dalında (16 Ekim'de
birleştirildi); çalışma dalı `claude/elevenlabs-voom-turkish-voiceover-4jqxsc`. Her işten sonra hem çalışma
dalına hem main'e push et ki yeni oturumlar güncel hâli görsün.

## >>> YENİ OTURUM: BURADAN BAŞLA <<<
**Geçerli yöntem:** çizim v1 stili (`src/cizim1/Cizim1.tsx`, içerik `content/cizim1/*.json`): sade erkek
karakter, düz sepya kâğıt, YAVAŞ animasyonlar (Zack kurgusu, oda, 3D YOK). Ses: **Yunus**, **eleven_v4**
(kullanıcı V4'ü seçti; v3'ten daha akıcı, aynı kredi),
sohbet tarzı `say` (+ dolgular), `maxPause: 0.3`, arka plan müziği `music` = `music/merak-gerilim.mp3`
(ElevenLabs Music, bize ait, künye yok; `public/music/KAYNAK.txt`) ve olaylara bağlı efekt sesleri (`SFX` haritası, `public/sfx/`). Pilot: `cizim1-01-yag-nereye` → video
`ornek-videolar/cizim1-pilot/01-yag-nereye.mp4` (kullanıcı onayı bekleniyor).
Sonraki işler (onaydan sonra): 2 tartı, 3 takip (bırakma), 4 mekik, 5 kas ağrısı, 6 duruş, 7 ter, 8 kas hafızası
→ sonra eleme listesindeki diğerleri. Her biri: `content/cizim1/cizim1-NN-<konu>.json` (voice + say + visual)
+ Cizim1.tsx'e o videoya özel sahne bileşenleri (SCENES'e benzersiz adla) → sessiz önizleme gönder → onay →
`npm run voiceover -- <id>` → `npm run render -- <id>` (çizim ~10 dk) → `ornek-videolar/` + commit + push.
Tartı ve takip metinleri `content/uc/uc-02-tarti.json`, `uc-03-takip.json` içinde hazır (hikâye tonu; yeni
stile taşınırken `say`'e dolgu eklenip ses Yunus yapılmalı). Gönderilen dosya 30 MB'ı geçerse ffmpeg ile
sıkıştır (crf 23-24). Kısa, Türkçe, telefondan okunacak şekilde yaz. "Her zaman daha iyisi olabilir."

**16 Ekim (gece):** 02 tartı yeni stile taşındı: `content/cizim1/cizim1-02-tarti.json` (Yunus, dolgulu `say`) +
Cizim1.tsx'e `tarti-*` sahneleri (ay/güneş, yemek kulesi, kas içi glikojen+su merceği, tuzluk, takvim/mide/dambıl,
haftalık grafik, şişen "+1 kg" balonu). O oturumda npm deposuna erişim yoktu: kod **typecheck/render edilmedi**,
yalnız çalışma dalında. Sıradaki oturum: `npm ci` → `npx tsc --noEmit` → sessiz önizleme render → gönder → main'e
birleştir. Pilot (01) için ekip geri bildirimi bekleniyor; revize gelirse önce o.

**16 Ekim (sonraki oturum):** 02 tartı typecheck'ten geçti, sessiz önizleme render edildi (41 sn, ~4 dk render):
`ornek-videolar/cizim1-pilot/02-tarti-sessiz.mp4`, main'e birleştirildi. **Kullanıcı onayı bekleniyor** → onaydan
sonra kredi kontrol → `npm run voiceover -- cizim1-02-tarti` → render. Pilot (01) geri bildirimini kullanıcı
kendisi hallediyor. Not: oturum eski `claude/remotion-eleven-labs-integration-za21fe` dalında açılabiliyor —
o dal eski; her zaman bu dosyadaki çalışma dalına geç.
**Tartı için karar (kullanıcı):** tartı da pilotun aynısı olacak — Yunus **eleven_v4**, olaylara bağlı efekt
sesleri (`SFX`'e `tarti-*` girdileri) + arka plan müziği (`music`). **AMA ŞİMDİ DEĞİL: önce pilotun sonucunu
bekle**, kullanıcı "başla" demeden seslendirme/render yapma.

**16 Ekim (SON DURUM, bunu oku):** Pilot 01 son hâli kullanıcıya gönderildi: Yunus + **eleven_v4** + arka plan
müziği + olaylara bağlı efekt sesleri → `ornek-videolar/cizim1-pilot/01-yag-nereye.mp4` (onay bekleniyor).
02 tartı'ya geçerken: `content/cizim1/cizim1-02-tarti.json` içinde `"modelId": "eleven_v4"` yap, `"music":
"music/merak-gerilim.mp3"` ekle (künye gerekmez), Cizim1.tsx
`SFX` haritasına `tarti-*` sahneleri için efektler ekle (pop/kalem/bip/damla/nefes/cizik/pirilti/ding/boom/whoosh).
Sessiz önizleme zaten gönderildiyse onay sonrası: kredi kontrol → voiceover → render → gönder.

**REVİZE (kullanıcı, 16 Ekim):** (1) Animasyonlar anlatıma birebir uysun ve **izleyiciyi merakta bıraksın**:
cevabı hemen gösterme, önce soruyu/gizemi göster (ör. "?" ile kapalı kutu, yarım kalan hareket, sayaç),
cevap kelimesi söylenirken aç; her sahnede "bakalım ne olacak" hissi (bekleten ama sıkmayan ipucu, hafif gerilim).
(2) "Cacık" = kullanıcının deyimi: **arka plan müziği (Investigations) kötü**. Yeni müzik adayları
`ses-ornekleri/muzik-adaylar/` (clean-soul, lobby-time, dreamy-flashback, easy-lemon) — kullanıcı seçecek, seçilen
parçayı JSON `music` alanına yaz, künyeyi açıklamada güncelle. (Gülmeler de çıkarıldı.)
(3) İzleyici ekrana kilitlensin: görsel anlatım konuyu tek başına net anlatabilmeli (sessiz izleyen de anlamalı).

**MÜZİK ARAYIŞI (açık iş, 16 Ekim):** Pilotun müziği "Investigations" BEĞENİLMEDİ ("cacık" = kötü). Kullanıcı:
"merak uyandırıcı olsun; arka plan sesi gibi ama duyulsun (kısık olunca 'var ile yok arası'); sadece piyano gibi
sönük olmasın". Denenenler ve sonuç (`ses-ornekleri/`): incompetech Clean Soul/Lobby Time/Dreamy Flashback/Easy Lemon
(sönük), Hypnothis/Unanswered Questions/**Spy Glass (en yakın ama oturmadı)**/Mesmerize; ElevenLabs Music üretimleri
(`muzik-uretim/`): 1 gizem-nabız, 2 belgesel-merak → "çok hareketli"; 3 dedektif-caz, 4 modern-casus → beğenilmedi;
5 sakin-merak, 6 yumuşak-gizem → "ikisi de değil". Hedef: Spy Glass ile 1-2 arası (orta enerji, meraklı, modern).
ElevenLabs Music: `POST /v1/music` {prompt, music_length_ms, force_instrumental:true} — şimdiye kadar kredi
düşmedi. Önizleme: Yunus sesi + müzik `volume=0.62` (kodda Music bileşeni 0.62). Seçilen müzik → JSON `music`.
Pilot (01) son hâli: V4 ses + müzik (eski) + efektler; müzik seçilince yeniden render (seslendirme hazır, kredi yok).
Yeni adaylar (16 Ekim 02:05): `muzik-uretim/` 7 merak-pizzicato, 8 merak-lofi, 9 merak-dedektif-modern (+ `-sesli`
karışımları, istemler `ISTEMLER.md`). **Kullanıcı 7-merak-pizzicato'yu SEÇTİ** → `public/music/merak-pizzicato.mp3`
(−20 LUFS, bize ait, künye yok). Pilot bu müzikle yeniden render edildi (40,8 sn), `ornek-videolar/cizim1-pilot/` güncel.
Kullanıcı "7 yakın, son kez en iyisini yap" dedi → 10 akılda, 11 gerilim, 12 modern üretildi; **Kullanıcı 11-pizzicato-gerilim'i SEÇTİ (son karar)** → `public/music/merak-gerilim.mp3` (−20 LUFS, künye yok);
pilot bununla yeniden render edildi. **Tartı ve sonraki tüm videolar `"music": "music/merak-gerilim.mp3"` kullanacak.** Not: Music API eşzamanlı istekte 429 veriyor, sırayla üret.

**16 Ekim 02:35 — SON DURUM (en güncel):** Kullanıcı "her şeyi geliştir, bitir, at" dedi →
- Merak bırakan animasyonlar eklendi (REVİZE 1): `MysteryBox` (sallanan "?" kutusu, cevap kelimesinde açılır),
  `Counter` (hedefe dönen sayaç: %84, %16, 7.700 kcal), `Gauge` (yağ yakımı ibresi, "Hayır"da düşer), tartıda titreyen
  rakamlar, adı söylenene kadar "?" görünen parçacıklar. Saat tiklemesi efektleri `public/sfx/tik.mp3`, `tak.mp3`
  (Python ile üretildi), `ticks()` yardımcısı. Yeni videolarda da bu parçaları kullan.
- Pilot 01 bu animasyonlarla yeniden render edildi; **02 tartı Yunus eleven_v4 ile seslendirildi** (~600 karakter),
  efektler + `merak-gerilim` müziği ile render edildi (44,4 sn): `ornek-videolar/cizim1-pilot/02-tarti.mp4`.
- Sıradaki: kullanıcı onayı → 03 takip (`content/uc/uc-03-takip.json` metni yeni stile taşınacak).

**EKİP GERİ BİLDİRİMİ (16 Ekim, 01+02 sonrası):** "Animasyonlar ve konular daha iyi olmalı; konu da animasyon
kadar önemli." → Konu seçimi ve açılış cümlesi (hook) güçlendirilecek; animasyonlar daha canlı olacak. Claude yeni
konu açıları + animasyon iyileştirme önerisi sundu, kullanıcının seçimi bekleniyor. Seçim gelmeden 03'e geçme.

## Geçmiş (özet)
Çizim v1 → v2 (gerçekçi karakter) → v3 (Zack kurgusu) → 3D kadın (ekip görüntüyü beğendi, sesten emin
değildi) → kullanıcı en sonunda **çizim v1'i seçti, 3D kız iptal**. Eski şablonlar yedek: `src/cizim` (v3),
`src/uc` (3D). Eski notlar aşağıda.

## Kullanıcıyla anlaşılan çalışma kuralları
- **Toplu video YOK: tek tek ilerle.** Bir video bitip onaylanmadan sonrakine geçme (kredi tasarrufu).
  Her seslendirmeden önce kalan krediyi kontrol et ve kullanıcıya söyle (`/v1/user/subscription`).
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
