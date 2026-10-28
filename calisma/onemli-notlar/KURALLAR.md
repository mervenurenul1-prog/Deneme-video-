# Değişmez kurallar (kullanıcı)

## !!! HER VİDEONUN FORMÜLÜ (kullanıcı, 23 Ekim — bir daha söyletme) !!!
1. **KANCA = ACIYA VUR:** bir kadının / erkeğin bizzat yaşadığı, utandığı, sinirlendiği anı yüzüne vur ("tam ben").
   Giriş çok güçlü olmalı; ilk 2 sn kaydırtmamalı.
2. **ASIL SEBEP:** "Sorun sen değilsin, asıl sebep bu" — ters köşe.
3. **TARİH + BİLİM:** gerçek, doğrulanmış olay/deney (selülit videosundaki dergi tarihi gibi), vücuttaki/beyindeki yeri.
4. **TAVSİYE:** kısa, hemen uygulanır.
5. **VOOM + KAPANIŞ:** doğal bağ (koç senin istediğini yapar, program hayalindeki vücuda göre) + döngü.
Hedef: beğensin, arkadaşına göndersin, yeniden paylaşsın (selülit videosu örnek). Konu önerisi bu 5 adımla gelir.
- **12 madde kontrol tablosu görseli: `kontrol-tablosu.png`** (izlesin/yorum/paylaş). Her metin ve her önizlemede tabloyu
  DÜRÜSTÇE doldurup kullanıcıya göster. Göndermeden önce kendine sor: "Bu videoyu ben izler miyim, yoksa geçer miyim?"
  Duran, uzak plan, küçük figürlü kare yok; her 1-1,5 sn kamera/olay değişsin, yakın planlar.
- Çıplaklık, müstehcenlik, kimseyi suçlama YOK (23 Ekim: "neye özendiriyorsun").
- **Marka/dergi/kişi adı ekrana YAZILMAZ** (telif/şikâyet riski, hesap yeni): "bir moda dergisi", "bir podcast" de.


## Çalışma
- Konuyu kullanıcı seçer; Claude öneri getirir. Tek tek video, toplu yok.
- Sıra: metin (12 madde tablosuyla) onayı → sessiz önizleme → onay → TEK SEFERDE seslendirme → müzikle render.
- Emin değilsen SOR. Instagram açıklaması YAZMA. Her işten sonra commit + push (çalışma dalı + main).
- Kullanıcının örnek cümlelerini birebir koyma; kendi doğal cümleni yaz.
- **ANLATIM DERS GİBİ, AÇIK (kullanıcı, 25 Ekim):** ucu açık kelime oyunu, muğlak mecaz YOK ("cevabın öbür yarısı ekranda görünmüyor" gibi). Birinci, ikinci diye sırala; izleyici ilk dinleyişte anlasın.

- **25-26 Ekim dersleri (kullanıcı):**
  - Kullanıcı "sadece metni at" derse ÖNİZLEME/KOD YAPMA, yalnız metni yaz. Beğenilmiş hâli "çok değiştirme"; geri al dediğinde eski hâle dön.
  - Gündem haberi kullanılabilir ama gerçek kişinin adı söylenmez (takımdan/rolden bahset); tanınması için görsel ipucu +
    "Bu adamı tanıdın mı? Yorumlara yaz" (yorum çeker). Doğrulanmamış sebep iddiası yok ("örnek verdik").
  - VOOM sesle söylenmez; arka planda (tahta, telefon, küçük bulut) görünür, göze sokulmaz.
  - Döngü kusursuz ve HIZLI olsun (ör. kâğıt uçak kameraya uçup ekranı kaplar → ilk kare). Sonda bekleme (`hold`) koyma.
  - Hareket ölçülü: aşırı hareket göz yorar; her sahnede yumuşak kamera + küçük canlılık yeter.
  - Seste baştaki sessizliği kırp (ilk kelime hemen başlasın). Ekrandaki yazılar seslendirmeye eklenmez.
  - Kullanıcının istediği ekran yazısını da birebir koyma, geliştir (ör. "tek tuşla cebinde" → "VOOM'la bir dokunuş uzakta").
  - Gerçek kişi çizilirken kıyafet haberdeki gibi (ör. şapka, kapüşon); emin olmadığın fiziksel ayrıntıyı (gençlikte sakal) ekleme.

- **28 Ekim dersleri (korse):**
  - Konu önerisi: klişe/herkesin yaptığı konular YOK; önce `konular/ONERILER.md` reddedilenlere bak.
  - Onaylanmış metni DEĞİŞTİRME; şikâyet görüntüdeyse yalnız görüntüyü düzelt. Metin değişikliğini sor.
  - Giriş KISA (tek cümle), hemen TARİHE geç (izleyiciyi tarih tutar), sonra sebep/tavsiye; düzeni bozma.
  - Görüntü kalitesi = selülit seviyesi: dolu, yaşanmış mekân (oda, ayna, müze), kadın konusunda kadın ana karakter,
    nesneler GERÇEKÇİ (korse göğüs altından kalçaya, belde daralır; referans görsel gelirse birebir uy). Avatarın belini/
    vücudunu açma.
  - Tarih HASSAS: kesin olmayanı kesin söyleme; efsaneleri (Girit, Medici) kullanma; her ifadenin dayanağını yaz.
  - Seslendirmede tahmin süresi gerçek sesten kısa çıkabiliyor (korse: tahmin ~37, gerçek 40,5) → payı hesaba kat.
  - Kullanıcının reddettiği (durdurduğu) komut bazen yine de çalışmış oluyor → `git diff` ile kontrol et ve kullanıcıya SÖYLE.

## Hangi videolar tuttu (kullanıcı, 23 Ekim)
- EN BEĞENİLEN: 10 selülit. EN AZ SEVİLEN: 03 on bin adım ve 06 diz/koşu. Selülit tarzında ilerle.

## Hikâye formülü
1) İzleyicinin YARISINA dokun ("tam ben" dert, zaten inandığı yanlış) 2) "Sence neden?" 3) kısa cevap
4) gerçek, DOĞRULANMIŞ tarihçe + vücuttaki yeri (hücre/kas içi) 5) bağla + döngü (`"loop": true`, son kare = ilk kare).
- İlk cümle tarihle başlamaz; soru + şaşırtıcı cevap. Tek kahraman, tek zaman çizgisi, her cümle öncekinin sonucu.
- Bilinmeyen iddiayı "duydun" diye varsayma. Tek ana fikir. Teknik terim/derece yok. "Antrenör" değil **KOÇ**.
- Kadın-erkek çatışması çıkaran konular iyi izlendi (04, 09). AMA her seferinde yalnız kadınlara hitap etme (24 Ekim):
  hem erkeğe hem kadına hitap eden konular/cümleler de olsun. Konu dar: antrenman + sağlık.
- 12 madde tablosu: izlesin (hook/merak/tempo/his) · yorum (taraf/tartışma/söylenecek/kendini görmek) ·
  paylaş ("ona atmalıyım"/replik/"tam ben"/kısa-net). Acıya dokunsun, tarih içersin, VOOM'a bağlansın.

## Süre ve tempo
- **MAX 30-32 sn** (kullanıcı, 23 Ekim). İlk 3 sn HİÇ durmasın: boşluk/düşünme yok, her saniye görsel olay
  (yakın çekim → pat diye geri çekilme gibi). Hedef: ilk saniyelerde %90+ izleyici kalsın. JSON `"speed": 1.2`
  (sessiz önizleme de 1.2x akar), `maxPause` 0.15.
- (eski) Hedef 25-40 sn. `"padding": 0.02`, son `hold` ≤ 0.6. Ses 1.2x (atempo, manifest /1.2). Dolgu: ilk ve son sahnede YOK; orta sahnelerde ıı/hani/[chuckles] VAR (kullanıcı seviyor).
- Kısaltırken cümle yarıda kesilmez; video tam cümleyle biter.

## Görsel
- Görsel sözler kadar önemli: söylenen birebir görünsün, hareket gerçek hayattaki gibi. Göndermeden önce kare kontrolü.
- Doğru = lacivert, yanlış = kırmızı. Sade, büyük, net; yüzlü hücreler, hap etiketler.
