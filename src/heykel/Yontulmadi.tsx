// VOOM spor programı tanıtımı — "Bu vücut bir günde yontulmadı". Anlatıcı kullanıcının sesi; tek kahraman fitness tanrıçası.
// "Sen" = buğulu aynadaki bulanık yansıma; "olabilirdin" = buğu silinir, tanrıça netleşir. Sahneler `yn-*`; kelime zamanı w(i).
// HERO: kahraman görseli (renkli tanrıça görseli gelince değişecek; şimdilik fitness poz01).
import React, { useId } from "react";
import { staticFile, useCurrentFrame } from "remotion";
import { BUGUN, Cam, CREAM, dateAt, DOTS, FocusBox, Img, LIME, Logo, pop, prog, RED, Screen, Stamp, T, Tag, Weeks, useImgReady } from "./GizliCekim";

type SceneProps = { d: number; w: (i: number) => number };

const HERO = "heykel/fitness/poz01.jpg";
// "böyle olabilirdin": aynı yüz, üç Yunan tanrıçası (Artemis, Athena, Amphitrite)
const GODS = ["heykel/khiton/artemis.png", "heykel/khiton/athena.png", "heykel/khiton/amphitrite.png"];
const godAt = (f: number, a: number, step: number) => GODS[Math.max(0, Math.floor((f - a) / step)) % GODS.length];
const WALL = "#191514";
const GOLD = "#c9a24a";

// Ayna: oymalı altın çerçeve; içi kırpılır. fog 1 = tam buğulu (bulanık, soluk), wipe = buğunun silindiği oran (soldan sağa)
const MX = 130;
const MY = 250;
const MW = 820;
const MH = 1180;
const Mirror: React.FC<{ fog: number; wipe?: number; fogged?: React.ReactNode; children: React.ReactNode }> = ({ fog, wipe = 0, fogged, children }) => {
  const id = useId().replace(/:/g, "");
  const wx = MX - 120 + (MW + 240) * wipe;
  return (
    <g>
      <rect width={1080} height={1920} fill={WALL} />
      <clipPath id={`mc${id}`}>
        <rect x={MX} y={MY} width={MW} height={MH} rx={MW / 2} ry={160} />
      </clipPath>
      <filter id={`mf${id}`}>
        <feGaussianBlur stdDeviation={16} />
        <feColorMatrix type="saturate" values="0.25" />
      </filter>
      <linearGradient id={`mg${id}`} x1="0" x2="1">
        <stop offset="0" stopColor="#000" />
        <stop offset="0.85" stopColor="#000" />
        <stop offset="1" stopColor="#fff" />
      </linearGradient>
      <mask id={`mm${id}`}>
        <rect width={1080} height={1920} fill="#fff" />
        <rect x={wx - 1300} y={0} width={1300} height={1920} fill={`url(#mg${id})`} />
      </mask>
      <g clipPath={`url(#mc${id})`}>
        {children}
        {fog > 0 ? (
          <g mask={`url(#mm${id})`} opacity={fog}>
            <g filter={`url(#mf${id})`}>{fogged ?? children}</g>
            <rect width={1080} height={1920} fill="#d6dadc" opacity={0.5} />
          </g>
        ) : null}
      </g>
      <rect x={MX - 14} y={MY - 14} width={MW + 28} height={MH + 28} rx={MW / 2 + 14} ry={174} fill="none" stroke={GOLD} strokeWidth={28} />
      <rect x={MX - 30} y={MY - 30} width={MW + 60} height={MH + 60} rx={MW / 2 + 30} ry={190} fill="none" stroke="#7d6128" strokeWidth={6} />
    </g>
  );
};

// Aynanın içinde görsel: top = görselin aynanın üst kenarına gelen satırı, z = yavaş yakınlaşma
const InMirror: React.FC<{ src: string; top: number; z?: number }> = ({ src, top, z = 1 }) => (
  <g transform={`translate(540 ${MY + MH / 2}) scale(${z}) translate(-540 ${-(top + MH / 2)})`}>
    <Img src={src} />
  </g>
);

// Takvim: üç yıl akar
const Calendar: React.FC<{ f: number; a: number; b: number; p: number }> = ({ f, a, b, p }) => {
  if (p <= 0) return null;
  return (
    <g transform={`translate(540 150) scale(${p})`}>
      <rect x={-230} y={-62} width={460} height={110} rx={22} fill="#0c0c0d" opacity={0.85} stroke={RED} strokeWidth={3} />
      <T x={0} y={14} s={50} c={CREAM} w={800}>
        {dateAt(prog(f, a, b))}
      </T>
    </g>
  );
};

// 1) "Üç yıldır spor yapıyorsun ama aynada hâlâ aynı kişi." — buğulu ayna, bulanık yansıma; takvim 3 yıl akar
const YnKanca: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const lock = prog(f, 4, 12);
  return (
    <g>
      <Mirror fog={1}>
        <InMirror src={HERO} top={40} z={1 + 0.05 * prog(f, 0, d)} />
      </Mirror>
      {/* açılışta odak bir an aynaya kilitlenir, sonra kaybolur */}
      {f < w(3) ? (
        <g opacity={1 - prog(f, w(3) - 8, w(3))}>
          <FocusBox f={f} fo={{ x: 540, y: 560, s: 300, lock }} />
        </g>
      ) : null}
      <Calendar f={f} a={w(0)} b={w(4)} p={pop(f, w(0))} />
      <Tag x={540} y={1370} p={pop(f, w(7))} c={RED} wd={320}>
        hâlâ aynı
      </Tag>
    </g>
  );
};

// 2) "Oysa doğru programla bugün böyle olabilirdin." — el aynayı siler: buğu kalkar, tanrıça netleşir ve parlar
const YnOlabilir: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const wipe = prog(f, w(1), w(4));
  const glow = prog(f, w(4), w(5) + 6);
  return (
    <g>
      <Mirror fog={1} wipe={wipe} fogged={<InMirror src={HERO} top={40} z={1.05} />}>
        <InMirror src={f < w(4) ? GODS[0] : godAt(f, w(4), 12)} top={40} z={1.05 - 0.05 * prog(f, w(1), w(4))} />
        <rect width={1080} height={1920} fill="#fff4cf" opacity={0.18 * glow} />
      </Mirror>
      {/* silen el: yumuşak beyaz iz */}
      {wipe > 0 && wipe < 1 ? <ellipse cx={MX - 120 + (MW + 240) * wipe} cy={760 + Math.sin(f * 0.5) * 160} rx={80} ry={240} fill="#fff" opacity={0.22} /> : null}
      {glow > 0
        ? [...Array(9)].map((_, i) => {
            const a = (i / 9) * Math.PI * 2 + f * 0.02;
            const r = 470 + 30 * Math.sin(f * 0.2 + i);
            return <circle key={i} cx={540 + Math.cos(a) * r * 0.85} cy={840 + Math.sin(a) * r * 1.2} r={6 + (i % 3) * 3} fill={LIME} opacity={glow * (0.5 + 0.5 * Math.sin(f * 0.3 + i))} />;
          })
        : null}
    </g>
  );
};

// Keski + çekiç: vuruş anında keski taşa değer, kıvılcım ve mermer kırıntısı saçılır
const Chisel: React.FC<{ f: number; hits: number[]; x: number; y: number }> = ({ f, hits, x, y }) => {
  const last = hits.filter((h) => f >= h).pop();
  const since = last === undefined ? 99 : f - last;
  const pull = last === undefined ? 1 : Math.min(1, since / 8);
  return (
    <g>
      <g transform={`translate(${x + 40 * pull} ${y - 20 * pull}) rotate(-35)`}>
        <rect x={0} y={-12} width={170} height={24} rx={6} fill="#b8bec4" stroke="#55595e" strokeWidth={3} />
        <path d="M0 -12 L-34 0 L0 12 Z" fill="#dfe3e6" stroke="#55595e" strokeWidth={3} />
        <rect x={170} y={-16} width={70} height={32} rx={8} fill="#6b4a2b" />
      </g>
      {/* çekiç */}
      <g transform={`translate(${x + 260 + 60 * pull} ${y - 130 - 70 * pull}) rotate(${-30 - 40 * pull})`}>
        <rect x={-10} y={0} width={20} height={190} rx={8} fill="#6b4a2b" />
        <rect x={-55} y={-40} width={110} height={56} rx={10} fill="#4a4d52" />
      </g>
      {since < 12
        ? [...Array(8)].map((_, i) => {
            const a = -2.4 + i * 0.32;
            const r = since * (14 + (i % 3) * 6);
            return <circle key={i} cx={x + Math.cos(a) * r} cy={y + Math.sin(a) * r + since * since * 0.6} r={i % 2 ? 6 : 4} fill={i % 3 ? "#f1ede6" : "#ffd23f"} opacity={1 - since / 12} />;
          })
        : null}
    </g>
  );
};

// 3) "Bu vücut bir günde yontulmadı. Her hafta biraz daha." — yan profil; keski her vuruşta, hafta sayacı ilerler
const YnYont: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const hits = [w(1), w(3), w(5), w(6), w(7), w(8)];
  return (
    <g>
      <rect width={1080} height={1920} fill={WALL} />
      <Cam f={f} keys={[[0, 520, 700, 1.5], [w(5), 540, 820, 1.25], [d, 540, 840, 1.2]]} amp={0.3}>
        <Img src="heykel/fitness/poz02.jpg" />
      </Cam>
      <Chisel f={f} hits={hits} x={600} y={470} />
      <Weeks f={f} a={w(5)} b={w(8) + 4} />
    </g>
  );
};

// 4) "Sen ise üç yıldır aynı hareketi, aynı ağırlıkla yapıyorsun. Vücut alıştığı yükte değişmez." — yine buğulu ayna;
// aynı squat, hep 10 kg; "değişmez"de kırmızı damga
const YnAyni: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  // aynı hareket: yansıma ritimle hafif iner kalkar (tekrar)
  const rep = Math.sin((f / 30) * Math.PI * 1.4) * 14;
  return (
    <g>
      <Mirror fog={0.9}>
        <g transform={`translate(0 ${rep})`}>
          <InMirror src="heykel/fitness/poz07.jpg" top={560} z={1 + 0.04 * prog(f, 0, d)} />
        </g>
      </Mirror>
      <Calendar f={f} a={w(2)} b={w(8)} p={pop(f, w(2))} />
      <Tag x={330} y={480} p={pop(f, w(4))} r={-3} wd={380}>
        ↻ aynı hareket
      </Tag>
      <Tag x={760} y={620} p={pop(f, w(6))} r={3} wd={300}>
        hep 10 kg
      </Tag>
      <Stamp x={540} y={1150} p={pop(f, w(12), 12)} t="DEĞİŞİM YOK" />
    </g>
  );
};

// fitness poz05'te telefon ekranı (1080 koordinatı)
const PH = { x: 641, y: 342, w: 67, h: 128 };

// 5) "VOOM her gün antrenmanını hazırlar, yükünü haftadan haftaya artırır." — telefon → Bugün ekranı → 6 haftalık yolculuk
const YnVoom: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const url = staticFile(BUGUN);
  useImgReady(url);
  const id = useId().replace(/:/g, "");
  const today = pop(f, w(2), 14) * (1 - prog(f, w(5) - 4, w(5) + 2));
  const prg = pop(f, w(5), 14);
  return (
    <g>
      <rect width={1080} height={1920} fill={WALL} />
      <Cam f={f} keys={[[0, 640, 420, 2.4], [w(2), 610, 540, 1.7], [d, 600, 560, 1.6]]} amp={0.3}>
        <Img src="heykel/fitness/poz05.jpg" />
        <clipPath id={`p${id}`}>
          <rect x={PH.x} y={PH.y} width={PH.w} height={PH.h} rx={7} />
        </clipPath>
        <rect x={PH.x} y={PH.y} width={PH.w} height={PH.h} rx={7} fill="#0b0b0b" />
        <image href={url} x={PH.x} y={PH.y + 4} width={PH.w} height={PH.w * (848 / 384)} clipPath={`url(#p${id})`} opacity={prog(f, 4, 12)} />
      </Cam>
      <Screen src={BUGUN} iw={384} ih={848} crop={[0, 30, 384, 340]} x={540} y={880} wd={760} p={today} r={-1}>
        <rect x={14} y={252} width={356} height={72} rx={10} fill="none" stroke={LIME} strokeWidth={4} opacity={prog(f, w(3), w(4))} />
      </Screen>
      <Screen src="app/program-6hafta.jpg" iw={1290} ih={2152} crop={[40, 0, 1210, 1900]} x={540} y={860} wd={640} p={prg} r={-2}>
        {DOTS.map((y, i) => {
          const on = prog(f, w(6) + i * 3, w(6) + i * 3 + 4);
          return <circle key={i} cx={122} cy={y} r={34 + 10 * on} fill={LIME} opacity={on} />;
        })}
        <path d={`M122 165 V${165 + (1659 - 165) * prog(f, w(6), w(8) + 6)}`} stroke={LIME} strokeWidth={12} />
      </Screen>
    </g>
  );
};

// 6) "Tabağını hesaplar. Ara verirsen, koçun seni bulur." — beslenme kartı; şaşkın tanrıça + koçun bildirimi
const YnKoc: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const plate = pop(f, 0, 12) * (1 - prog(f, w(2) - 4, w(2) + 2));
  const n = pop(f, w(4) - 2, 12);
  return (
    <g>
      <rect width={1080} height={1920} fill={WALL} />
      <Cam f={f} keys={[[0, 540, 700, 1.35], [w(2), 540, 520, 1.6], [d, 540, 480, 1.7]]} amp={0.3}>
        <Img src={f < w(2) ? "heykel/fitness/poz03.jpg" : "heykel/fitness/poz06.jpg"} />
      </Cam>
      <Screen src="app/beslenme.jpg" iw={1290} ih={2622} crop={[30, 880, 1240, 660]} x={540} y={1100} wd={800} p={plate} r={2} />
      <g transform={`translate(0 ${-260 + 560 * n})`}>
        <rect x={50} y={0} width={980} height={250} rx={40} fill="#141212" opacity={0.96} />
        <circle cx={130} cy={78} r={44} fill="#000" stroke="#3a3735" strokeWidth={3} />
        <T x={124} y={90} s={30} w={800}>
          voom
        </T>
        <circle cx={168} cy={84} r={5} fill={LIME} />
        <T x={196} y={66} s={30} c={LIME} w={800} a="start">
          KOÇUNUN NOTU
        </T>
        <T x={196} y={110} s={30} c="#cfc9c0" w={500} a="start">
          şimdi
        </T>
        <T x={90} y={170} s={36} w={600} a="start">
          16 gündür antrenman yok.
        </T>
        <T x={90} y={218} s={36} w={600} a="start">
          Kısa bir seansla ritme dönelim mi?
        </T>
      </g>
    </g>
  );
};

// 7) "VOOM yakında. Linki profilde." — kahraman tanrıça + logo; sonda ayna buğulanır (açılış karesine döngü)
const YnSon: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const logo = pop(f, w(0), 14) * (1 - prog(f, d - 24, d - 14));
  const fog = prog(f, d - 20, d - 4);
  return (
    <g>
      <Mirror fog={fog} fogged={<InMirror src={HERO} top={40} z={1.05} />}>
        <InMirror src={godAt(f, 0, 16)} top={40} z={1 + 0.05 * prog(f, d - 20, d)} />
      </Mirror>
      {logo > 0 ? (
        <g opacity={Math.min(1, logo * 1.3)}>
          <rect x={170} y={1080} width={740} height={330} rx={40} fill="#0c0c0d" opacity={0.82} />
          <g transform={`translate(540 1230) scale(${logo})`}>
            <Logo x={0} y={0} s={130} />
          </g>
          <T x={540} y={1310} s={46} c={CREAM} w={700}>
            yakında
          </T>
          <g opacity={prog(f, w(2), w(2) + 6)}>
            <T x={540} y={1380} s={38} c={LIME} w={800}>
              link profilde ↗
            </T>
          </g>
        </g>
      ) : null}
    </g>
  );
};

export const YONT_SCENES: Record<string, React.FC<SceneProps>> = {
  "yn-kanca": YnKanca,
  "yn-olabilir": YnOlabilir,
  "yn-yont": YnYont,
  "yn-ayni": YnAyni,
  "yn-voom": YnVoom,
  "yn-koc": YnKoc,
  "yn-son": YnSon,
};
