# Animasyon
- **YENİ SERİ STİLİ (28 Ekim): 1930'lar "rubber hose" Yunus + Duru** → `src/avatar2/Hose.tsx` (`HoseChar`, `OldFilm`, `Stage`,
  jestler `gesture`/`gestureT`, `talk`, `nod`, `surprise`, `laugh`, `lid`, `live`). Ayrıntı `onemli-notlar/DURUM.md`.
  Aşağıdaki Cizim1 notları eski stil için.
- Şablon `src/cizim1/Cizim1.tsx`, içerik `content/cizim1/cizim1-NN-<konu>.json` (sahne: `visual`, `voice`, `say`,
  isteğe bağlı `voiceId`, `lead`, `hold`, `keys`). Sahne bileşen adları videoya özel ön ekli (`kilo-*`, `ekim3-*`…).
- Animasyonlar kelime zamanına bağlı: `w(i)`. Altyazıda `"keys"` → önemli kelimeler turuncu.
- Avatar aynı (seri), kıyafet konuya göre → `avatar-kiyafet/OKU.md`. Önizlemeden önce kıyafeti kullanıcıya söyle.
- Hazır parçalar (arşivde grep ile ayrıntı): `MysteryBox`, `Counter`, `KneeLens`, `CellLens`, `Lab`, `CloudFrame`,
  `KiloStamp`, `PillLabel`, `SideRunner`, `Fridge`, `Forest`, `Gym`, `useImgReady` (gerçek VOOM ekranı).
- Render: `npm run render -- <id>` (~10-15 dk). Hızlı kontrol: `npx remotion render src/index.ts <id> out.mp4 --frames=0-250 --scale=0.4`.
  Sessiz önizleme `ornek-videolar/cizim1-pilot/NN-<konu>-sessiz.mp4`. 30 MB üstü → ffmpeg crf 23-24.
- Süreç durdurma: `pkill` kullanma, PID ile öldür.
- Gerçek poz referansları: `referans/` (kullanıcının gönderdiği ekran görüntüleri, yalnız poz için).
