# VOOM Instagram video projesi — çalışma notları

Bu dosya yeni oturumların kaldığı yerden devam etmesi içindir. Her oturum başında okuyun.

## Proje
VOOM (antrenman + beslenme + kişisel koç uygulaması) için Instagram Reels üretimi.
Remotion (React) ile video, ElevenLabs ile Türkçe seslendirme. Güncel hâl **main** dalında (16 Ekim'de
birleştirildi); çalışma dalı `claude/elevenlabs-voom-turkish-voiceover-4jqxsc`. Her işten sonra hem çalışma
dalına hem main'e push et ki yeni oturumlar güncel hâli görsün.

## >>> YENİ SOHBET: ÖNCE BUNU OKU (17 Ekim devir notu — EN GÜNCEL) <<<
Çalışma dalı `claude/claude-md-continuation-e39del` (main ile aynı; her işten sonra ikisine de push). `npm ci` → işe başla.
Kalan ElevenLabs kredisi ≈ 15.095 karakter. Ses kitaplığı: Yunus (anlatıcı) + **Sibel** (`qLdPxFtPuffoxx5gieBJ`, anne sesi).
**ŞU ANKİ İŞ: 06 diz (`cizim1-06-diz`)** — sessiz önizleme gönderildi, **kullanıcı onayı → seslendirme** (Yunus ~520 +
Sibel ~85 karakter, tek seferde). Max 45 sn (gerçek sesle ~45; aşarsa `padding`'i kısalt, cümle kesmeden önce SOR).
Metin (kullanıcı onayladı, sahneler):
1. `diz4-pist`: "Üçüncü tur… ve birden dizine bir sızı giriyor. Eğilip dizini tutuyor, yere oturuyorsun." (ilk ~0,6 sn hızlı sarma 1-2-3. TUR; kullanıcı: "3 tur koşmasını beklemem")
   (YAN PROFİL koşu `SideRunner`/`SideTrack`, kısa koşu → ani ağrı → eğilip dizini tutar → yere oturur; kırmızı karalama YOK)
2. `diz4-anne`: "Kulağında annenin sesi:" (Yunus) 3. `diz4-annesoz` (**Sibel**, sahne `voiceId`): "Koşma, dizin biter! Çok
   çömelme, dizine yazık! Benim gibi mi olmak istiyorsun?" (anne düşünce balonunda, sonda kendi dizini ovuşturur)
4. `diz3-stanford`: 1984 Stanford, koşucuların dizlerini 18 yıl röntgenlediler 5. `diz3-sonuc`: dizleri daha kötü çıkmadı;
   kireçlenme evde oturan %10, hobi koşucu %3,5 6. `diz3-squat`: "Derin squatın sağlıklı dizi bozduğu da hiç kanıtlanmadı."
7. `diz4-doz`: sızı çoğu zaman yükü birden artırmaktan (2,2,2,10 km → 2,3,4,5) 8. `diz4-soru`: "Peki sen yarın o piste
   dönecek misin?" (kalkıp koşar = açılış karesi). Ağrıdan sonraki tüm sahnelerde avatarın dizi **bandajlı** (`KneeBandage`).
Seslendirme betiği artık sahne başına `voiceId`/`voiceSettings` destekliyor (`scripts/generate-voiceover.ts`).
**YAPILDI (17 Ekim, sonraki oturum):** (a) hızlı sarma kaldırıldı; sahneye JSON `"lead": 1` (ses başlamadan 1 sn
  sessiz normal koşu; `CizimScene.lead`, `sceneDurations` + Cizim1'de kelime/ses kaydırma) → "birden"e kadar ~2,4 sn koşu,
  "Üçüncü tur"da kırmızı "3. TUR" etiketi. (b) `SittingOnTrack`'ten bandaj kaldırıldı; bandaj yalnız `diz3-squat`,
  `diz4-doz`, `diz4-soru`'da. (c) Kullanıcı: başta "2. TUR" sonra "3. TUR" etiketi (yapıldı; ses metni aynı).
  (d) Anne "benim gibi mi" derken dizini değil ayağını tutuyor gibiydi → anne balonda YANDAN (`SideRunner` `female`
  `shirt`) eğilip iki eliyle dizini tutar, dizi kızarır. (e) Squat "araya atılmış gibi" (spor salonu, farklı çöp adam)
  → yeni `diz4-squat` (`Diz5Squat`): aynı pist + aynı avatar, bandajlı derin squat, "sağlıklı diz" yeşil parıltı,
  annenin "dizine yazık!" balonu "hiç kanıtlanmadı"da çizilip söner.
  (f) Kullanıcı: "squatı gerekirse çıkar, koşu olayını daha iyi betimle, dikkat çekici yap" → metin onaylandı ("yap
  bakalım"): squat sahnesi ve annenin "Çok çömelme, dizine yazık!" cümlesi ÇIKTI; doz: "O sızı çoğu zaman yükü birden
  artırmaktan gelir: haftalarca iki kilometre, sonra bir günde on. Dizin bitmiyor, dozunu bekliyor." Görsel: açılışta
  "birden"den önce ağır çekim + ekran kararır, dizde röntgen merceği (`KneeLens`) kızarır; `diz4-stanford`/`diz4-sonuc`
  aynı pistte üç koşucu (`StanfordRunners`, saçları yıllarla ağarır `grayHair`), yıl sayacı 1984→2002, röntgen panosu
  (`XrayBoard`, hepsi temiz + yeşil tik), "dizleri bitecek" tabelası çizilir; doz kartları büyüdü. 7 sahne.
  (g) Kullanıcı "seslendir" dedi, iki değişiklikle: anne "Koşma, dizlerin aşınır! Benim gibi mi olmak istiyorsun?"
  ("bitmek" yüklemi olmasın; tabela "dizleri aşınacak"); doz "…gelir: iki, iki, iki, sonra bir günde on. Oysa her hafta
  biraz artırırsan, dizin yüke alışır." (kırmızı 10 km kartı kalsın, kullanıcı sevdi). SESLENDİRİLDİ (ses 43,0 sn,
  `padding` 0.1 → video ~44,8 sn), müzikle render → `ornek-videolar/cizim1-pilot/06-diz.mp4`.
  (h) Giriş yenilendi (kullanıcı: "giriş çok kötü, zorlanma sesi olsun, son tur hadi desin"): avatar nefes nefese
  "Hadi… yapabilirsin… son tur!" (say'de `[out of breath] Hah... hah...`; "hah" artık `FILLERS`'ta, altyazıya girmez),
  "2. TUR" tabelası → dama desenli bitiş çizgisi geçilince kırmızı "3. TUR". Kamera: uzak plan (`SideTrack wide`: karlı
  dağlar + çam ormanı + pist) → "yapabilirsin"de bir kademe yakın → "birden"de (ağrı) beyaz parlama + dize yakınlaşma +
  röntgen merceği → geri çekilip eğilir/oturur. Ses başındaki 1,6 sn soluma kırpıldı (manifest güncellendi), `lead` 0.5,
  `padding` 0.05 → ~46,9 sn (45'i ~2 sn aşıyor; kullanıcıya söylendi). Doz kartları başın üstünden yukarı alındı.
  (i) 17 Ekim akşam — CEFF: "konu yine anlaşılmıyor, 3-4 sn'den sonra yakalıyor" → kanca arayışı. Denenip reddedilenler:
  diz5 (röntgende aşınan diz + başlık), diz6 (70 yaşında koşan / 45 yaşında oturan bölünmüş ekran; kullanıcı "beyni
  almadı"), "Bu adamın dizi yedi saniye sonra kilitlenecek" + geri sayım (sayaç ve "Hadi… son tur" istenmedi; asma kilit
  koyma, "kilitlenmek" mecaz). Kullanıcı yan profil koşucuyu ve anneyi istiyor. SON SEÇİM (kullanıcı onayladı, yalnız
  kod/JSON, SESLENDİRİLMEDİ, önizleme render edilmedi): kanca "Koşmak dizini aşındırmıyor. Bunu kanıtlamak on sekiz yıl
  sürdü." (`diz7-hook`: uzak plan koşu, yandaki canlı röntgen merceği, yeşil tik, "18 yıl") → "Ama annen hep şöyle derdi:"
  (`diz7-anne`, koşarken balonda anne) → Sibel (hazır, `diz7-annesoz`) → Stanford/sonuç (hazır) → doz "Peki koşunca dizin
  neden sızlar? Çünkü çoğu zaman yükü birden artırırsın: iki, iki, iki, sonra bir günde on. Oysa her hafta biraz
  artırırsan, dizin yüke alışır." → soru (hazır; avatar ayakta, bandaj yok). Sızı/oturma sahnesi çıktı. Altyazı artık
  cümle sonunda bölünür ve biten satır ekranda asılı kalmaz. Sahne başına `intro` sesi desteği eklendi (şu an kullanılmıyor).
  **Kullanıcı 17 Ekim akşam "her şeyi durduruyorum" dedi** — devam etmeden önce sor. Sıradaki: sessiz önizleme → onay →
  seslendirme (kanca + "Ama annen…" + doz ≈ 260 karakter; kalan kredi ≈ 14.730).
**GÜNCEL (17 Ekim gece, v8):** Kullanıcı v7'yi bıraktı; hazır seslendirilmiş sahnelere (sızı → "Kulağında annenin
  sesi:" → anne → Stanford → sonuç → eski doz → soru; manifest hazır) yalnız yeni KANCA (`diz4-pist` `intro`) eklendi:
  "Koşuya yeni başladıysan, bu an bir gün senin de başına gelecek." (kullanıcı 4 öneriden 2'yi seçti). Görsel: üstte kırmızı
  "KOŞUYA YENİ BAŞLADIYSAN" tabelası → bitiş çizgisinde "3. TUR". `Diz4Doz`/`Diz4Soru` eski (seslendirilmiş metne uyan)
  hâline döndü. `lead` 0.2. Sessiz giriş önizlemesi `06-diz-giris-sessiz.mp4` gönderildi → onay → YALNIZ kanca seslendirilir
  (~65 karakter), müzikle render → `06-diz.mp4`. Süre ~46-47 sn (45'i aşıyor).
**05 boyun:** iki giriş Reels testi için hazır: `05-boyun.mp4` (Dikkat!) ve `05-boyun-b.mp4` (Giriş B, kullanıcı seçti).
**Kullanıcının bu oturumdaki dersleri (UY):** betimle/canlandır — izleyici sahneyi gözünde canlandırmalı (ör. turuncu
pistte koşan, ağrıyla eğilen, oturan biri; yan profil); tarihe dayan (dikkat çeker), sonda soru bırak; iki hikâyeyi
"yer vermek için" değil anlamlı harmanla; bilinmeyen iddiayı varsayma; teknik terim yok; max 40-45 sn; önce METNİ onaylat,
sonra sessiz önizleme, sonra tek seferde seslendirme (kredi!). Render ~10-15 dk; `pkill` kendi kabuğunu da öldürebilir →
PID ile durdur (`ps -eo pid,args | awk ...`). Hızlı kontrol: `npx remotion render src/index.ts <id> out.mp4 --frames=0-250 --scale=0.4`.

## (eski) 16 Ekim akşam devir notu
Çalışma dalı `claude/claude-md-continuation-e39del` (main ile aynı; eski dal `claude/elevenlabs-voom-turkish-voiceover-4jqxsc`). `npm ci` → işe başla.
Kalan ElevenLabs kredisi ≈ 15.250 karakter (yalnız Yunus seslendirmesi için kullan).
**Videoların durumu (ornek-videolar/cizim1-pilot/):**
- **05 boyun TEKRAR AKTİF (17 Ekim):** ekipten CEFF videoyu beğendi ("çok güzel, paylaşalım"); yalnız "Dikkat!" girişi
  "çok bağırıyor, insanları kaçırabilir" → Reels'te 2 giriş test edilecek. Kullanıcı **Giriş B**'yi seçti:
  `cizim1-05-boyun-b` ("Şu an bu videoyu başın öne eğik izliyorsun, değil mi? Bunun için dünyaya yayılmış bir hesap var.
  Ama hikâyenin yarısı eksik."; `boyun5-sen`, kapanış `boyun5-gonder` = telefona dalış yok, avatar ortaya gelir).
  Seslendirildi, son video `05-boyun-b.mp4` (48,9 sn). Diğer sahne sesleri `cizim1-05-boyun` manifestinden kopyalandı
  (yeni id için ses dizinini/manifesti kopyala → yalnız değişen sahne seslendirilir). Kalan kredi ≈ 15.095.
- **05 boyun İPTAL (kullanıcı, 17 Ekim).** Üzerinde çalışma, kredi harcama.
- **06 diz (ŞU AN):** `cizim1-06-diz` — iki yanlış kural harmanı: "koşu dizi bitirir" (2017 meta-analiz: koşmayan %10,
  hobi koşucu %3,5; kıkırdak sünger) + "squatta diz parmak ucunu geçmesin" (Fry 2003, küçük deney: diz geride → kalça
  yükü ~10 kat). Kapanış "Peki sen bu iki kuraldan hangisine inanıyordun?" (döngü). Bileşenler `diz-*` (yandan
  `SideSquat`, `Crowd`, `KneeLens`, `DoseMeter`). Max 40 sn. Sessiz önizleme → onay → seslendirme (tek sefer).
- **!!! DERS (17 Ekim, ekip geri bildirimi 05 için): "videodan hiçbir şey anlamadım."** Video "27 kilo"yu herkes
  duymuş gibi anlattı; Türkiye'de kimse duymamış. KURAL: efsane çürüten video yalnız izleyicinin ZATEN İNANDIĞI bir
  şey için yapılır (ör. "koşu dizi bitirir"). Bilinmeyen bir iddiayı önce kendisi anlatmalı; "bunu sen de duydun"
  gibi varsayım yok. Az kavram: bir videoda tek ana fikir. Kredi: bu oturumda 05'e ~436, önceki sürümlere ~700
  karakter gitti → büyük yeniden yazımlarda önce metni onaylat, seslendirmeyi en sona bırak. Süre üst sınırı 40 sn.
  Kalan kredi ≈ 15.149.
- **05 boyun v4 (EN GÜNCEL, v2/v3'ün yerine):** Kullanıcı v3 ve nesne benzetmelerini (bowling, karpuz, bidon, bagaj,
  dambıl) BEĞENMEDİ: "daha yaratıcı ol, fark yarat, insansı düşün, ALGIYI YANILT; bu hook'ta durup izler misin?"
  Fikir: video bir KORKU VİDEOSU gibi açılır (kırmızı UYARI ekranı, "Dikkat! … 27 kilo!"), cızırt + donma, kamera geri
  çekilir: o video avatarın telefonunda oynuyordu ("Bunu sen de duydun, değil mi? Peki ya yarım bir bilgiyse?",
  27 KG kartı yırtılır) → 2008 text neck + cerrahın hesabı + haber dünyayı dolaştı (telefon ızgarası) →
  araştırma: eğik ve dik sıralarda ağrı eşit, "fark yok" → iki heykel (eğik + dik), ikisi de yorulur →
  "boynunu suçlama, hareket ettir; biri 27 kiloyu anlatırsa bu videoyu gönder" → kâğıt uçak, kamera arkadaşın
  telefonuna dalar = açılış ekranı (döngü). `BigPhone`, `diveTo`, `AlarmScreen`; bileşenler `boyun4-*`. **ONAYLANDI ve seslendirildi** (Yunus V4; kalan kredi ≈ 15.250): `ornek-videolar/cizim1-pilot/05-boyun.mp4`
  (41,4 sn, SON HÂLİ). Sıradaki yeni konu: 30 dk protein penceresi. **DERS:** nesne benzetmesi değil, izleyicinin algısıyla oynayan
  fikirler (ters köşe, video içinde video, izleyiciye hitap).
- **05 boyun v3 (EN GÜNCEL, v2'nin yerine):** Kullanıcı v2 için: "kareler stabil, dikkat çekici yap, genelden kaçın;
  60 derece gibi şeyler kafa karıştırır, izleyiciye SAMİMİ yaklaş"; "karpuz olmaz"; "aşırı hareketli olmasın ama hareket
  ekle". v3: izleyiciye hitap ("Şu an bu videoyu nasıl izliyorsun? Başın öne eğik, değil mi?") → text neck adı (2008,
  omurga terapisti) → bowling topu benzetmesi (göğüste kolay, kol uzanınca ağır) → havalimanı: 27 kg "FAZLA BAGAJ"
  (sınır 23) → "bu yüzden mi ağrıyor?" + zincir kopar → heykel gibi donup kalmak (taş filtre, kaide, güvercin, çatlar)
  → "Hadi başını kaldır. Ama videoyu tekrar izlerken yine eğileceksin, değil mi?" (döngü). Ölçülü kamera `CamK`
  (anahtar karelerde yakınlaşma + `hit()` kısa sarsıntı). Bileşenler `boyun3-*`, 50,6 sn sessiz önizleme gönderildi →
  onay → seslendirme. **KURALLAR:** teknik terim/derece yok, gündelik benzetme; izleyiciye doğrudan hitap; kamera
  hareketi ölçülü ama her sahnede var.
- **05 boyun v2 (16 Ekim gece, EN GÜNCEL):** kullanıcı metni onayladı ("olur"). Kanca "Telefona baktığında başın kaç
  kilo? Beş mi? Bir hesaba göre yirmi yedi." → 2008 kayropraktör (Dean Fishman) "text neck" adını verdi (röntgen +
  damga) → 2014 cerrah (Hansraj, model) 60° = 27 kg (NeckLens açı 0→60, kilo ekranı 5→27) → "bu yüzden mi ağrıyor?
  İşte sürpriz" (? kutusu) → araştırmalar net bağ bulamadı (Damasceno 2018, Spine 2021; zincir kopar) → "sorun
  eğilmek değil, saatlerce kıpırdamamak; en iyi duruş bir sonraki duruşun" (örümcek ağı, saat, poz değişimi) →
  döngü "…başın kaç kilo, artık biliyorsun". Bileşenler `boyun2-*`, 41,1 sn sessiz önizleme
  `05-boyun-sessiz.mp4` gönderildi → **onay → seslendirme**. `05-boyun.mp4` ESKİ sürüm.
- **04 v5 (16 Ekim akşam, EN GÜNCEL):** Kullanıcı: "anlatıyorsun ama görsele kötü döküyorsun" + "104 nereden çıktı?" +
  "40 sn olsun, kısaltacağım diye bilgileri saçma sapan koyma". Hikâye 104'ü açıklıyor: kanca "Ağırlık kaldırırsan iri
  olur musun? Bu soru yüzünden kadınlar yüz dört yıl bekletildi." → 1896 erkekler kaldırdı, kadınlara "iri olursunuz"
  dendi (kırmızı tabela) → 2000 ip kopar, tartı titrer "ilk final kaç kiloydu?" → 48 → testosteron (iki kas
  büyüteci, 10:1) → kemik (8 ay) → "Sen bekleme" (avatar öne gelip dambıl uzatır) → "kırk sekiz kiloyu hatırla" (döngü).
  Bileşenler `kadin5-*` (Cizim1.tsx). **ONAYLANDI ve seslendirildi** (Yunus V4, 172 karakter düştü; kalan ≈ 15.585):
  `ornek-videolar/cizim1-pilot/04-kadin-agirlik.mp4` (41,3 sn, SON HÂLİ). Sıradaki: 05 boyun baştan (önce sessiz önizleme).
  **KURALLAR:** her sahnede ortada tek büyük olay, karakterin vücudunda; sayı/olay havada kalmasın (nereden çıktığı
  anlatılsın); her cümle bir merak açsın; süre için bilgi kırpma (~40 sn olur).
- **04 KISALTILDI (16 Ekim 17:30, ekip: "izlerken sıkıldık"):** 52 sn → **35 sn**, 7 sahne: kanca (aynı) → 104 yıl
  (1896 cümlesi atıldı) → testosteron 1/10 ("korku" sahnesi atıldı) → kas → kemik (8 ay) → "104 yıl beklediler" →
  kapanış "Ve biri sana bunu bir daha sorarsa, cevabı artık biliyorsun." (36 sn). **KURAL (kullanıcı kızdı):
  kısaltırken cümleyi yarıda kesme; video tam bir cümleyle bitsin, döngü yarım cümleye dayanmasın.**
  **04 iyileştirme (kullanıcı "hepsini yap"):** (1) kapanış "Yüz dört yıl beklediler. Sen bekleme." → "Ve biri sana bunu
  yine sorarsa, sadece kırk sekiz kiloyu hatırla." (`kadin-dongu3`: şampiyon fotoğrafı + 48 kg belirir, son karede
  kaybolur = kanca karesi); (2) testosteron tüpleri sahne başında çıkar, dolgu sözcüğü yok; (3) yeni kemik sahnesi
  `kadin-kemik3` (her halter tekrarında kemik dolar/parlar, yoğunluk çubuğu, "8 ay" sayacı); (4) tempo: JSON
  `"padding": 0.15` (sahne sonu boşluğu; varsayılan 0.35). 34,6 sn sessiz önizleme gönderildi → onay → seslendirme. Kısa sahneler `KISA` haritasıyla eski bileşenleri yeni kelime sırasına bağlıyor
  (Cizim1.tsx sonu). Yeni sessiz önizleme `04-kadin-agirlik-sessiz.mp4` gönderildi → **onay → seslendirme**
  (~420 karakter). KURAL: yeni videolar da kısa olsun (~30-35 sn).
- 03 on bin adım ✅ BEĞENİLDİ — serinin örnek videosu (formül: kanca → kısa tarihçe → görsel anlatım → loop).
- 04 kadın ve ağırlık (`cizim1-04-kadin-agirlik`, "104 yıl bekleyen kadınlar"): YENİ hâli sessiz önizleme
  (`04-kadin-agirlik-sessiz.mp4`). Kanca "Ağırlık kaldırırsan iri olur musun? … 48 kilo sınıfı" → 104 yıl tarihçe →
  korku → testosteron → kas → kemik → "Sen bir gün daha bekleme" → döngü. Kullanıcı "güzel" dedi; **seslendirmeden önce
  yine onay iste** (~600 karakter; testosteron sahnesinin sesi önbellekte). `04-kadin-agirlik.mp4` ESKİ sürüm.
- 05 boyun (`cizim1-05-boyun`, ensede 27 kg dambıl): seslendirilmiş hâli var (`05-boyun.mp4`) AMA kullanıcı
  "anlatım ve animasyon olmadı, baştan hikâyeleştir" dedi → 04 gibi formülle BAŞTAN yap (kanca → kısa tarihçe →
  görsel → loop). Tarihçe adayı: "text neck" terimi (doğrula!). Önce sessiz önizleme.
- Sıradaki yeni konu (kullanıcı seçti): "Antrenman sonrası 30 dakikalık protein penceresi bir efsane".
**Sesler:** müzik `merak-gerilim` (seri müziği, değişmez). Efektler kısık/seyrek (`SFX_GAIN`, `tidySfx`).
Yeni müzik/efekt gerekiyorsa ÜCRETSİZ üret (Python/numpy, açık kaynak, CC0) — ElevenLabs Music/SFX KULLANMA.
**Kullanıcıyla:** Türkçe, kısa; kendi kafana göre iş yapma, sor; Instagram açıklaması yazma; konuyu kullanıcı seçer.

## !!! SERİ KURALLARI (kullanıcı, 16 Ekim — her videoda uy) !!!
- Bu bir **SERİ**: aynı avatar, aynı çizim stili, aynı kalite. **Avatarı değiştirme** ("bu avatarı seviyorum").
- **Her yeni video döngülü** (`"loop": true`, kapanış cümlesi açılışa bağlanır).
- **Konuyu kullanıcı seçer:** Claude konu önerir, kullanıcı seçer, sonra video hazırlanır. Kendi başına konu seçme.
- Fazla betimleme, ince düşünülmüş, kaliteli içerik; her görsel olayın kendi efekt sesi; referans yapı (aşağıda).
- Kendi kafana göre iş yapma; emin değilsen sor. Önce sessiz önizleme, onaydan sonra seslendirme.
- **MÜZİK VE EFEKT ÜCRETSİZ OLACAK (kullanıcı: "müziği ücretsiz senden istemiştim, gerekirse kurulum yapalım"):**
  ElevenLabs Music / Sound Effects ile ÜRETİM YAPMA (kredi harcıyor). Gerekirse ücretsiz araç kur ve yerelde üret
  (Python/numpy sentez, açık kaynak araçlar, CC0 ses paketleri). Mevcut `merak-gerilim` ve üretilmiş efektler kullanılabilir.
  ElevenLabs kredisi yalnız seslendirme (Yunus) için.
- Kullanıcının söylediklerini dikkate al; her isteğini not et.
- **BEĞENİLEN FORMÜL (10 bin adım, kullanıcı tarif etti): başta TARİHÇE (gerçek bir köken/olay), ortada GÖRSEL
  ögeler, sonda LOOP, baştan sona DİKKAT ÇEKİCİ / algısı yüksek cümleler.** Her yeni videoyu bu formülle hikâyeleştir.
  **AMA ilk cümle tarihle BAŞLAMAZ** (kullanıcı: "çok tarihçe olur, dikkat çekici olmaz"): önce soru + şaşırtıcı cevap
  (kanca), tarihçe hemen ardından kısa. Ör. 04: "Ağırlık kaldırırsan iri olur musun? Olimpiyatta halter altını alan ilk
  kadına bak: kırk sekiz kilo sınıfı." → "Ve kadınlar o sahneye çıkmak için 104 yıl bekledi…" → … → döngü "Ve bir dahaki
  sefere biri sana şunu sorarsa:" → kanca sorusu.
- **EFEKTLER AZ VE KISIK (kullanıcı: "efektler Yunus'un ve müziğin önüne geçmiş, çok tik-tak var"):** kodda
  `SFX_GAIN = 0.45` ve `tidySfx` (küçük tekrar eden sesler 20 kareden yakınsa yalnız ilki). Yeni videolarda efekt
  yalnız önemli anlarda; sayaç/tik-tak dizileri koyma. Öncelik: Yunus > müzik > efekt.
- **Instagram açıklaması YAZMA** — kullanıcı kendisi hallediyor ("sen videolarla ilgilen"). JSON `caption` alanı kalabilir.
- Kanca (ilk cümle) durdurucu ve **hikâyesel** olsun; döngü hem görüntüde hem cümlede hissedilsin (son kare = ilk kare, son cümle "Çünkü..." gibi açılışa akar).

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

**!!! KURAL (kullanıcı tekrar uyardı): ÖNCE SESSİZ ÖNİZLEME, ONAYDAN SONRA SESLENDİRME. Asla bozma. !!!**
Kullanıcı "seslendirme önce" gibi bir şey derse bile bu kuralı kastediyor olabilir; emin değilsen SOR, seslendirme yapma.
(16 Ekim: 03 on bin adım yanlış anlaşılıp onaysız seslendirildi, ~600 karakter. Kullanıcıya yalnız sesi
çıkarılmış önizleme gönderildi; onay gelirse bu ses kullanılır.)

**DÖNGÜ (loop):** Kullanıcı döngülü video istedi. JSON'da `"loop": true` → son 14 karede ilk sahnenin ilk karesi
belirir (son kare = ilk kare), müzik ve toz kesintisiz. Kapanış cümlesi açılışa akmalı (ör. "...çünkü biri sana
soracak:" → "Beş kilo verdin..."). 01, 02, 03 döngülü.

**SEÇİLEN YENİ KONULAR (kullanıcı, 16 Ekim):** 1) 10 bin adım bir reklam sloganıydı (`cizim1-03-on-bin-adim`),
5) ağırlık kaldıran kadın iri olmaz, 7) ertesi gün ağrımıyorsa antrenman boşa mı gitti? Sırayla, tek tek.

**16 Ekim 12:30 — SON DURUM:** 03 on bin adım **BEĞENİLDİ** (tam hâli `ornek-videolar/cizim1-pilot/03-on-bin-adim.mp4`).
04 kadın ve ağırlık (`cizim1-04-kadin-agirlik`) yazıldı: kadın karakter (`Person female`, `limbW`), spor salonu fonu
(`Gym`), röntgen kemik merceği (`Bones`), test tüpü (`Flask`). Sessiz önizleme gönderildi
(`ornek-videolar/cizim1-pilot/04-kadin-agirlik-sessiz.mp4`), **onay bekleniyor → sonra kredi kontrol + seslendirme**.
Sıradaki konu: 7) ertesi gün ağrımıyorsa antrenman boşa mı gitti?
**04 güncellendi (kullanıcı 4A):** serinin ERKEK avatarı her sahnede ana karakter, kadınlar yan karakter (kadın konuları
için de avatar sahnede olur). Müzik için 2 alternatif gönderildi (`muzik-uretim/13-belgesel-sicak`, `14-modern-merak`),
kullanıcı dinleyip seçecek.
**Kullanıcı yeni konulardan 5 ve 3'ü seçti, önce 5:** `cizim1-05-boyun` ("telefona bakarken boynun 27 kilo taşıyor";
Hansraj 2014 model tahmini + dürüst sürpriz: araştırmalar duruşun tek başına ağrı yaptığını net göstermedi). Yandan
boyun röntgeni (`NeckLens`), telefon (`Phone`, `PHONE_ARM`), kettlebell. Sessiz önizleme gönderildi, onay bekleniyor.
Sıradaki: 3) "30 dakikalık protein penceresi bir efsane".
**05 boyun yeniden kuruldu (kullanıcı: "daha ilgi çekici, hook durdurucu ve hikâyesel, loop"):** kanca "Telefona her
baktığında, boynunda aşağı yukarı sekiz yaşında bir çocuk taşıyorsun" — çocuk (`Kid`, sarı tişört, "8") avatarın
omzuna tırmanır (`AvatarWithKid`, `neckSeat`); gün boyu (sabah/otobüs/iş/gece) hep orada; 27 kg = çocuk tartıda;
telefonu kaldırınca zıplayıp iner; kapanış "o çocuk geri gelmeyi çok sever. Çünkü..." → çocuk geri gelir (döngü).
**Kullanıcı: "çocuk değil dambıl daha mantıklı"** → çocuk yerine ensede 27 kg'lık dambıl (`NeckDumbbell`,
`AvatarWithDumbbell`): yerden havalanıp enseye oturur, tartıya düşer, telefonu kaldırınca yere iner; kapanış
"Ama telefona tekrar baktığın an, o dambıl geri gelir. Çünkü..." (dambıl yerde titrer = açılış karesi).
**05 ONAYLANDI ve seslendirildi** (Yunus V4, ~700 karakter, 51,9 sn): `ornek-videolar/cizim1-pilot/05-boyun.mp4`.
Kullanıcı "çarpıcı ses efektleri" istedi → ElevenLabs Sound Effects (`POST /v1/sound-generation` {text, duration_seconds,
prompt_influence}) ile gerçekçi efektler üretildi, −16 LUFS: `agir-dusme`, `havalanma`, `alarm`, `otobus`, `klavye`,
`zincir` (public/sfx). Anahtar anlarda bunları kullan. Not: müzik/efekt üretimi kredi düşürebiliyor, kontrol et.
**04 BAŞTAN HİKÂYELEŞTİRİLDİ (kullanıcı: "anlatım ve animasyon olmadı, ikisi de baştan"):** "1896'da erkekler
ağırlık kaldırdı, kadınlar 104 yıl bekledi (Olimpiyat 2000 Sydney); ilk altını 48 kg sınıfında yarışan kadın kazandı"
→ korku → testosteron → kas → kemik (LIFTMOR) → "104 yıl beklediler, sen bir gün daha bekleme" → döngü: "Çünkü bu hikâye
nasıl başladı, biliyor musun?" (avatar eski fotoğrafa dalar → 1896). Eski fotoğraf katmanı `OldPhoto`, `Temple`,
`GlobeBarbell`, `Rope`, `GoldMedal`, `OperaHouse`, `Confetti`. Sessiz önizleme gönderildi → onay → seslendirme
(testosteron sahnesinin sesi önbellekte). Sonra 05 boyun da aynı formülle baştan.
(eski) **04 ONAYLANDI ve seslendirildi** (~709 karakter, 51,9 sn): `ornek-videolar/cizim1-pilot/04-kadin-agirlik.mp4`.
Sıradaki: yeni konu 3) "30 dakikalık protein penceresi bir efsane" (önce sessiz önizleme). Müzik/efekt ÜCRETSİZ.
**04 revize (kullanıcı: "beğendim ama daha iyi giriş, loop etkisi, daha kuvvetli betimleme"):** yeni açılış "Ağırlık
kaldıran bir kadının iri olması, sandığından çok daha zor" + kadının kolları balon gibi şişip "izin vermez"de söner;
kapanış "...arkadaşına gönder. Çünkü..." (avatar kâğıt uçakla gönderir, arkadaş dambılı alır = açılış karesi).
Testosteron parçacıkları + tüp doldukça kol büyür; kas hatları. **Müzik: 10 bin adımdaki merak-gerilim kalıyor (seri).**
Sessiz önizleme gönderildi → onay → seslendirme. Sonra 05 boyun, sonra yeni konu.
**Kullanıcı: "Kendi kafana göre iş yapma, sor."** Yapılacak işi söyle, onay al.
**Referans analiz (kullanıcının gönderdiği tutan 2 Instagram videosu):** ters köşe açılış (ilk 3 sn) → neden-sonuç
zinciri → sonda sürpriz bilgi → başa bağlanan döngü; tek tutarlı dünya (kart/grafik az); mekanizmada vücudun içine
gir; müzik kelime aralarında açıkça duyulur (bizimkinden ~5 dB yüksek); kedi videosu ~65-70 BPM sıcak, yavaş fon.
Yeni efekt sesleri (Python ile üretildi): adim, kacing, sihir, sonme, kagit, yuksel (+ tik, tak). `steps()` ayak sesi.

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
