// hook: ilk 1-2 saniyede izleyiciyi yakalayan cümle
// point: numaralı madde (ipucu, adım, hata...)
// myth / fact: "Mit / Gerçek" kalıbı
// cta: kapanış — uygulamaya yönlendirme
export type SceneType = "hook" | "point" | "myth" | "fact" | "cta";

export type Scene = {
  type: SceneType;
  // ElevenLabs'in seslendireceği metin
  voice: string;
  // Ekranda büyük yazılacak kısa metin. Boşsa seslendirme metni kelime kelime gösterilir.
  display?: string;
};

export type Post = {
  id: string;
  title: string;
  scenes: Scene[];
  // Instagram açıklaması ve etiketler (render sırasında aciklama.txt'ye yazılır)
  caption: string;
  hashtags: string[];
};

// Hikâye videosu: her sahnenin kendine özel bir animasyonu (visual) var
export type StoryScene = { visual: string; voice: string };

export type Story = {
  id: string;
  title: string;
  scenes: StoryScene[];
  caption: string;
  hashtags: string[];
};

// Uygulama tanıtım videosu: sahneler ekran görüntülerini telefon çerçevesinde gösterir
export type PromoScene = {
  voice: string;
  // Üstte küçük etiket (ör. "BESLENME") ve büyük başlık
  kicker?: string;
  // Başlık. *yıldız* içindeki kelimeler vurgu rengiyle yazılır: "Günün antrenmanı *hazır*"
  display?: string;
  // public/ altındaki ekran görüntüsü, ör. "app/beslenme.jpg". Yoksa sadece yazı gösterilir.
  screen?: string;
  // Kameranın yaklaşacağı bölge (ekran görüntüsü 923 px genişliğe ölçeklenmiş koordinatlarla)
  focus?: { x: number; y: number; w: number; h: number };
};

export type Promo = {
  id: string;
  title: string;
  scenes: PromoScene[];
  caption: string;
  hashtags: string[];
};

// Bilgi videosu: üstte numaralı etiket + vurgulu başlık, ortada animasyon (visual), altta altyazı
export type ExplainerScene = {
  visual: string;
  voice: string;
  // Ör. "1 · MOTİVASYON"
  kicker?: string;
  // *yıldız* içindeki kelimeler vurgu rengiyle yazılır
  title?: string;
  // Animasyona özel veriler (grafik noktaları, takvim günleri, mesajlar...)
  data?: Record<string, unknown>;
  // Sahnenin ortasında patlamayla inen damga yazısı, ör. "KOPTU!"
  stamp?: string;
  // Kenarlarda zıplayan emoji çıkartmalar, ör. "🦴💧"
  sticker?: string;
};

export type Explainer = {
  id: string;
  title: string;
  // Sol üstte "VOOM · <tag>" olarak görünen kısa konu adı, ör. "YAĞ YAKIMI"
  tag?: string;
  // İsteğe bağlı: bu videoya özel ElevenLabs ses ve model
  voiceId?: string;
  modelId?: string;
  scenes: ExplainerScene[];
  caption: string;
  hashtags: string[];
};

export type WordTiming = { word: string; start: number; end: number };

export type SceneAudio = {
  voice: string;
  voiceId: string;
  file: string;
  durationInSeconds: number;
  words: WordTiming[];
};

// public/voiceover/<post-id>/manifest.json
export type PostVoiceover = { scenes: (SceneAudio | null)[] };
