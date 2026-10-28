# Şu anki durum (en güncel üstte, kısa tut)

## >>> YENİ SOHBET BURADAN (28 Ekim gece — EN GÜNCEL) <<<
- **21 TENYA HAPI — YENİ STİLDE İLK VİDEO** (`cizim1-21-tenya`, JSON `"style": "hose"`, sahneler `src/hose/Tenya.tsx` `tn-*`).
  Metin v4 kullanıcı onaylı ("önizleme oluştur"): Yunus "Zayıflamak için kurt yutar mıydın?" → Duru "Asla!" → "Yüz yıl önce bunu
  hap diye sattılar." → tarih (tenya hapı; kurt var mıydı tartışmalı) → 2014 İngiliz doktor Kenya'da ineğin dilinden kist yuttu,
  6 hafta → Duru "Kaç kilo verdi?" → "Bir kilo aldı." (+ ekranda "Sen yutar mıydın? Yorumlara yaz") → "Kurt da iğne de aynı
  şeyi vaat ediyor…haftada iki gün ağırlık" (VOOM yalnız arka planda telefon) → MOTİVASYON (kullanıcı istedi): "Ve acele etme.
  Seni sevenler tartıya bakmaz, sana bakar." → "Bunu, aynaya bakıp kendine kızan arkadaşına gönder. Ve ona da sor:" (döngü).
  Duru replikleri KULLANICININ SESİ (sahne `voiceId` kd6P2…, stability 0.45 / similarity 0.95). Yan karakterler `doktor`
  (safari şapkası, gözlük, bıyık; gerçek kişi değil, ad yok) ve `arkadas` (sarı saç). Sessiz önizleme
  `ornek-videolar/cizim1-pilot/21-tenya-sessiz.mp4` (~38 sn tahmin; gerçek sesle değişir) → ONAY → seslendirme (~560 karakter).
  Altyapı: `Cizim1Video` `style: "hose"` → kâğıt/toz yerine `OldFilm`, sert kesme; JSON `minEstimate` (kısa repliklerin
  sessiz önizleme süresi). Efekt sesi (SFX) henüz yok; müzik merak-gerilim (1930'lar müziği ücretsiz üretilebilir — sor).
- **YENİ SERİ AVATARLARI ONAYLANDI (kullanıcı: "çok iyi, yeni avatar bu"): 1930'lar "rubber hose" stili YUNUS + DURU.**
  (Kullanıcı "yurtdışında olan ama Türkiye'ye gelmemiş bir avatar" istedi; 5 stil önerildi, 1'i seçti, "bize de benzet".)
  - **Yunus** (erkek, anlatıcı): siyah şapka, iki yana kıvırcık bukle, çenede noktalı kirli sakal, gri kapüşonlu + siyah ceket,
    kot, siyah ayakkabı. Ses: Yunus `Q5n6GDIjpN0pLOlycRFT`.
  - **Duru** (kız; eski taslakta adı "Merve" idi): kâküllü uzun kahverengi saç, halka küpe, kırmızı bere, kırmızı dudak, beyaz
    tişört + siyah ceket, kot, beyaz ayakkabı. **Sesi = kullanıcının kendi sesi** (klon v2 `kd6P2yodCccO2OzNoqOD`).
  - **Sibel** yalnız ANNE sesi olarak kalır (Duru değil).
  - Kod `src/avatar2/Hose.tsx`: `HoseChar` (who "yunus" | "duru"), `OldFilm` (sepya, gren, titreşim, çizik, kaynayan çizgi,
    iris), `Stage`. **İnsansı davranışlar (kullanıcı: "hareket ve insansı davranışlar sende")**: `live` (düzensiz/çift göz
    kırpma, kendiliğinden bakış kayması, nefes, ağırlık aktarma, saç gecikmesi), `talk` (hece ritminde ağız, vurguda baş, kaş),
    `nod` (dinlerken onay), `surprise` (göz büyür, O ağız, şapka/bere havalanır, sıçrar), `laugh` (sarsılır, gözler kapanır),
    `lid` (yarım kapak), jestler `gesture` + `gT = gestureT(f, başla, bitir)` (hazırlık → taşmalı çıkış → dönüş): wave, point,
    explain, think, hips, shrug, thumbs, cheer, facepalm; `gSide` tek kollu jestin kolu. Hareket "ikişer kare" (12 fps hissi).
  - Kompozisyonlar: `hose-sayfa` (karakter sayfası), `hose-klip` (8 sn perde + "VOOM sunar"), `hose-davranis` (12 sn sessiz
    sohbet: anlatır/dinler, şaşırır, güler, omuz silker, düşünür, işaret, başparmak, el sallar). Çıktılar `ornek-videolar/avatar2/hose-*`.
  - SIRADAKİ: kullanıcı davranış klibine bakar → bu stili bir konunun ilk 2-3 sahnesinde sessiz önizleme olarak dene
    (Cizim1 sahneleri yerine `HoseChar`; konuşma `talk` kelime zamanlarından). Müzik gerekiyorsa ücretsiz 1930'lar müziği üret.
- (eski) **Yunus v2 yarı gerçekçi taslak — kullanılmayacak, rubber hose seçildi.** **YENİ AVATAR (Yunus v2) TASLAĞI** — kullanıcı karakter sayfası attı (Merve + erkek "Ekip"): Yunus o erkeğe benzesin
  (siyah şapka, kıvırcık koyu saç, kirli sakal, gri kapüşonlu + siyah ceket, kot) + taslaktaki ışık, kamera açıları,
  doğal hareket. "Gerçek insan" İSTEMİYOR (yalnız örnek taslak verdi), çizim kalır. Kod `src/avatar2/Hero.tsx`
  (`Hero`: ifade `mouth/brow/look/turn/talk`, `outfit` sokak/salon, `pockets`, `rim`, `live` = nefes, ağırlık aktarma,
  düzensiz göz kırpma, mikro baş hareketi). Kompozisyonlar `avatar2-sayfa` (karakter sayfası) ve `avatar2-sinema`
  (10 sn: gece sokak, lamba ışığı, genel → bel → yakın plan, alan derinliği, renk derecelendirme, film greni).
  Kız karakter **Merve** de eklendi (`src/avatar2/Merve.tsx`, `avatar2-merve`: uzun dalgalı saç, perdeli kâkül, halka küpe,
  beyaz tişört + deri ceket + kot, `beret`, salon = topuz + spor üstü + tayt; ifadeler soft/smile/grin/kiss/talk + `wink`).
  Çıktılar `ornek-videolar/avatar2/`. **Kullanıcı onayı bekleniyor**; onaylanırsa Cizim1'deki `Person` yerine
  geçecek (eski videolara dokunma). Avatar kuralı ("yüz değişmez") kullanıcı isteğiyle değişiyor.

## >>> YENİ SOHBET BURADAN (28 Ekim — EN GÜNCEL) <<<
- **20 BEL KORSESİ BİTTİ** (`cizim1-20-korse`, sahneler `kr-*`; kaynaklar `arastirma/20-korse.md`). Son video
  `ornek-videolar/cizim1-pilot/20-korse.mp4` (Yunus 1.2x + müzik + efekt, 40,8 sn). Onay bekliyor; kullanıcıya kredisiz
  kısaltma önerildi: sesi 1.3x yap (≈37,5 sn; manifestteki mp3'lere ek atempo, süre/kelime zamanları buna göre).
  Son metin (sırası kullanıcı onaylı: KISA KANCA → hemen TARİH → sebep → ters köşe → tavsiye → VOOM → döngü):
  1 `kr-kanca2` "Korse takıyorsun ama sabah aynaya bakınca bel yine aynı."
  2 `kr-tarih` "1995'te Kraliçe Elizabeth'in balmumu heykeli onarılırken altından 1603'ten kalma bir korse çıktı. Daha eskisi
    1598'de bir mezardan çıktı. Korseli kadınların iskeletlerinde kaburgalar içe bükülmüş: yağ gitmemiş, kemik yer değiştirmiş."
  3 `kr-sebep` "Çünkü korse yağ eritmez, sadece sıkıştırır; giden şey ter, ilk bardak suyla geri gelir."
  4 `kr-terskose` "Tek faydası: mideni sıkar, az yersin." (kullanıcı: ters köşe KALSIN ama kısa)
  5 `kr-tavsiye` "Senin zaten doğuştan bir korsen var: karnının derin kası. Nefesini ver, göbeğini içe çek, on saniye tut.
    Salonda buna vakum diyoruz." (kullanıcı: hareketin salondaki adı VAKUM söylensin; ekranda büyük lacivert VAKUM)
  6 `kr-son` "İnce bel hedefini VOOM'daki koçuna söyle, vakumu programına eklesin. Bunu korse takan arkadaşına gönder ve
    şunu söyle:" (VOOM SESLE — kullanıcı istedi; telefonda "+ Vakum · 10 sn" satırı + tik) → ilk kareye döngü.
  Görsel: selülit dünyası (SelRoom/SelMirror), KADIN ana karakter (`KrWoman`, kıyafet üstünde gerçek bel korsesi `KrCorset`:
  göğüs altı → kalça, belde daralır, ön kopça sırası, dikey doku; kullanıcının attığı mağaza fotoğrafı referans). Müze: zengin
  kostümlü Elizabeth balmumu heykeli (`KrQueen`: bordo kadife, altın brokar, inci, mücevherli göğüslük, dantel yaka, taç),
  beyaz eldivenli el göğüslüğü kaldırır → 1603 korsesi; `KrTomb` mum ışığında taş tabut "1598 · en eski korse"; iskelet vitrini
  `KrRibs` (alt kaburgalar içe büküp kırmızı). Eski/kullanılmayan sahneler kodda duruyor (`kr-sabah`, `kr-ertesi`, `kr-ic`).
  Elizabeth adı SESTE ve EKRANDA (kullanıcı onayı; 400 yıllık tarihî kişi — kural istisnası).
- Kalan ElevenLabs kredisi ≈ 10.785 (28 Ekim, korse sonrası).
- **SIRADAKİ:** 21 TENYA (metin onay bekliyor, `arastirma/21-tenya.md`), sonra 22 KREATİN SAÇ DÖKER Mİ (`konular/ONERILER.md`).
- Kullanıcının attığı haber (BPT/Kafa TV): "Elon Musk: Hiçbir kız karın kaslarını 6 arabaya tercih etmez, salonu bırak işe git"
  + bir TV sunucusu "katılıyorum". Söz hiçbir kaynakta BULUNAMADI (uydurma olabilir) → korseye konmadı. İleride ayrı video
  olabilir: "Salonu bırak işe git" diyenlere cevap — Kosteas 2012 (J Labor Res 33(2):225-250, NLSY79): haftada 3+ gün spor
  yapanlar %6-10 daha çok kazanıyor (isim vermeden).

## >>> YENİ SOHBET BURADAN (27 Ekim — EN GÜNCEL) <<<
- **19 TÜP MİDE** (`cizim1-19-tup-mide`, `tm-*`): ekip arkadaşının "tartı her şeyi söylemiyor" videosundan uyarlama
  (referans olarak gidecek). Onaylı metin: "Tüp mide oldun, kırk kilo verdin ama el sallarken kolunun altı hâlâ
  sallanıyor." → tuzluk akımı ("Yoksa sana da mı biri 'Tuzu uzatır mısın?' dedi?") → tarih 1988 (ilk adım, ikinci adıma
  gerek kalmadı) → bilim 2022 (iki bin hasta, kilonun sekizi yağ değil) → deney + kola/karna/bacağa ağırlık ("deriyi
  tamamen toplamaz") → VOOM SESLE (kullanıcı istedi: "VOOM'daki koçun sarkan bölgene göre planlar") → gönder, döngü.
  Kol altı sarkma `TmFlap`, kol kesiti `TmArmLens`. Sessiz önizleme `19-tup-mide-sessiz.mp4` (~37 sn) gönderildi.
  Dersler: kullanıcı "protein/yemek herkes biliyor, asıl dert sarkma"; tarih + BİLİMSEL KANIT (rakamlı çalışma) ikisi de şart.
- **18 SALONUN EN SADIK MÜŞTERİSİ** (`cizim1-18-fark`, sahneler `fk-*`): ekipten bir arkadaşın "3 hırsız" videosu
  (sesi + avatarı onun) bizim formülle yeniden kuruldu; bu önizleme arkadaşın Claude'una REFERANS olarak gidecek.
  Kanca KULLANICININ CÜMLESİ, birebir: "Salonun en sadık müşterisi kim biliyor musun? Hiç değişmeyenler. Çünkü hep geri
  gelirler." → "Ama bu senin suçun değil… üç şey eksik" → 1 yük (Selye 1936, sepya defter grafiği) → 2 protein (Morton 2018,
  49 deney) → 3 uyku (Nedeltcheva 2010, aynı kişiler, yağ 1,4 → 0,6 kg) → tavsiye → "Yoksa şu sorunun cevabı sen olursun:"
  (döngü). Görsel: turnike + giriş sayacı, AYIN ÜYESİ panosu (6 aynı fotoğraf, "HEP AYNI"). Sessiz önizleme v2 gönderildi
  (`18-fark-sessiz.mp4`, 34,5 sn). Dersler: aynı hareketi tekrarlama (durağan), çizgi film fare beğenilmedi, kanca
  arayışında kullanıcı "acıya dokun, ilk 3 sn durdursun" dedi; hırsız/buzağı/1945 asker örneği reddedildi.

## >>> YENİ SOHBET BURADAN (26 Ekim — EN GÜNCEL) <<<
- **17 ZAYIFLAMA İĞNESİ BİTTİ (v6, 26 Ekim)** (`cizim1-17-igne`, sahneler `ig2-*`; eski kertenkeleli `ig-*` kodda duruyor,
  kullanılmıyor; kaynak `arastirma/17-igne.md`). Yunus 1.2x (orta sahnelerde "ıı", "hani"), efektler bu videoda %40 kısık
  (kullanıcı: "sesle yarışmasın"), 35,7 sn → `ornek-videolar/cizim1-pilot/17-igne.mp4`. Ekip incelemesi kullanıcıda.
  Dersler: kertenkele (yandan/tepeden) beğenilmedi; iğneye YÖNLENDİRME yok ("Yine de iğneyi tercih edeceksen"); bilgi
  listesi değil "tam ben" hikâyesi; deneyin adını kısaca söyle ("ilacın onay aldığı iki bin kişilik deneyde").
- Kalan ElevenLabs kredisi **11.531** (26 Ekim akşam, ölçüldü).
- **16 HAFTA SONU BİTTİ** (`cizim1-16-hafta-sonu`, `hs-*`, 33,1 sn → `ornek-videolar/cizim1-pilot/16-hafta-sonu.mp4`).
  Gündem (Bayern hocası 23 Ekim antrenmanda fenalaştı; BILD: az uyku, çok kahve, düzensiz yemek, neredeyse hiç spor) +
  2017 O'Donovan (63.591 kişi; hafta sonu −%30, düzenli −%35). KİŞİ ADI YOK (yalnız "Bayern Münih'in hocası"), ekranda
  "Bu adamı tanıdın mı? Yorumlara yaz" (izleyici adı yoruma yazsın). Sebep iddiası yok, 4 madde "örnek". Döngü: kâğıt uçak
  kameraya uçup ekranı kaplar → kupa yakın planı (kullanıcı beğendi). VOOM: bankta telefon + küçük bulut "Hayalindeki
  vücut / VOOM'la bir dokunuş uzakta" (sesle yok).
- **15 DOĞUM BİTTİ** (`cizim1-15-dogum`, `dg-*`, 38,8 sn → `15-dogum.mp4`). Eşin/dostların yeni anneye atacağı DESTEK
  videosu ("Bunu kimse alkışlamıyor ama yaptığın iş o podyumdan çok daha zor" / "Bu video sana gönderildiyse, biri seni
  görüyor demektir"). Manken: gür dalgalı saç, dantel pembe elbise, kanat (`DgModel`). VOOM: yeşil tahta + gerçek koç
  ekranı (`DgVoomPhone`, `app/koc.jpg`) + aletli/aletsiz kartları. Ayrıntı `arastirma/15-dogum.md`.
- 08 sauna paylaşıldı (dosyaları silindi). 90 yaşında halter ve 1953 otobüs/biletçi REDDEDİLDİ.

## >>> YENİ SOHBET BURADAN (24 Ekim) <<<
- **14 BEDEN İPTAL (24 Ekim)** — acıya dokunmadı. Eski not:
  14 BEDEN ALGISI (`cizim1-14-beden`, sahneler `ba-*`, VOOM'SUZ, kaynak `arastirma/14-beden-algisi.md`): metin v4
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
10 selülit (EN BEĞENİLEN) · 12 spot ışığı · 13 kardiyo · 15 doğum · 16 hafta sonu · 17 iğne · 20 korse. 08 sauna paylaşıldı (dosyaları silindi, 25 Ekim).
