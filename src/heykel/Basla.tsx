// VOOM spor programı tanıtımı — "Bugün başla": spora başlamak istiyor ama ne yapacağını bilmediği için başlayamıyor.
// Spor salonu fonu (public/heykel/salon/*) + dekupe tanrıça. İlk karede dambıl yere çarpar (kanca: ses + sarsıntı); hiçbir an
// durağan değil (kamera hep hareketli, sahne içi savrulmalar). Sahneler `bs-*`; kelime zamanı w(i).
import React, { useId } from "react";
import { Easing, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { fontFamily } from "../fonts";
import { CHOC, Cut } from "./Arama";
import { CREAM, LIME, Logo, pop, prog, RED, Screen, Stamp, T, useImgReady } from "./GizliCekim";

type SceneProps = { d: number; w: (i: number) => number };

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

// Salon fonları (kullanıcının üreteceği görseller gelince değişecek)
const GYM = ["heykel/salon/bokeh1.jpg", "heykel/salon/bokeh1.jpg", "heykel/salon/bokeh1.jpg"];

// Sarsıntı: at karesinde başlar, söner
const quake = (f: number, at: number, amp = 26, len = 14) => {
  const t = f - at;
  if (t < 0 || t > len) return { x: 0, y: 0 };
  const k = amp * (1 - t / len);
  return { x: Math.sin(t * 2.7) * k, y: Math.cos(t * 3.3) * k };
};

// Salon zemini: yavaş kayan (paralaks) fon + ruh hâli ışığı. mood "cold" = dert, "warm" = VOOM
const Gym: React.FC<{ f: number; i?: number; pan?: number; z?: number; mood?: "cold" | "warm" }> = ({ f, i = 0, pan = 0, z = 1.12, mood = "cold" }) => {
  const id = useId().replace(/:/g, "");
  const url = staticFile(GYM[i % GYM.length]);
  useImgReady(url);
  const warm = mood === "warm";
  return (
    <g>
      <rect width={1080} height={1920} fill="#0b0b0d" />
      <g transform={`translate(${540 + pan} 960) scale(${z + 0.02 * Math.sin(f / 40)}) translate(-540 -960)`}>
        <image href={url} x={0} y={0} width={1080} height={1920} preserveAspectRatio="xMidYMid slice" />
      </g>
      <linearGradient id={`gv${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity={0.35} />
        <stop offset="0.5" stopColor="#000" stopOpacity={0} />
        <stop offset="1" stopColor="#000" stopOpacity={0.55} />
      </linearGradient>
      <rect width={1080} height={1920} fill={warm ? "#3a2412" : "#0d1e3a"} opacity={warm ? 0.22 : 0.3} />
      <radialGradient id={`gl${id}`} cx="0.5" cy="0.45" r="0.5">
        <stop offset="0" stopColor={warm ? LIME : "#9fb6e8"} stopOpacity={warm ? 0.25 : 0.14} />
        <stop offset="1" stopColor={warm ? LIME : "#9fb6e8"} stopOpacity={0} />
      </radialGradient>
      <ellipse cx={540} cy={860} rx={640} ry={900} fill={`url(#gl${id})`} />
      <rect width={1080} height={1920} fill={`url(#gv${id})`} />
    </g>
  );
};

// Altıgen dambıl (çizim): genişlik ~ 460*s
const Dumbbell: React.FC<{ x: number; y: number; s?: number; r?: number; kg?: string }> = ({ x, y, s = 1, r = 0, kg }) => {
  const hex = (cx: number) => {
    const pts = [...Array(6)].map((_, i) => {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      return `${cx + Math.cos(a) * 62},${Math.sin(a) * 110}`;
    });
    return pts.join(" ");
  };
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <ellipse cx={0} cy={130} rx={240} ry={22} fill="#000" opacity={0.45} />
      <rect x={-150} y={-16} width={300} height={32} rx={14} fill="#b9bfc6" stroke="#5c6168" strokeWidth={4} />
      {[-30, 0, 30].map((dx) => (
        <path key={dx} d={`M${dx - 8} -16 L${dx + 8} 16`} stroke="#8a9097" strokeWidth={3} />
      ))}
      {[-180, 180].map((cx) => (
        <g key={cx}>
          <polygon points={hex(cx)} fill="#1c1d20" stroke="#3a3c40" strokeWidth={5} />
          <polygon points={hex(cx)} fill="#fff" opacity={0.06} transform={`translate(${-cx * 0.04} -10) scale(0.85) translate(${cx * 0.15} 0)`} />
        </g>
      ))}
      {kg ? (
        <text x={180} y={14} fontFamily={fontFamily} fontWeight={900} fontSize={40} fill={CREAM} textAnchor="middle">
          {kg}
        </text>
      ) : null}
    </g>
  );
};

// Soru balonu (dert): beyaz, kuyruklu
const Ask: React.FC<{ x: number; y: number; p: number; t: string; c?: string; tail?: "l" | "r" }> = ({ x, y, p, t, c = CHOC, tail = "l" }) => {
  if (p <= 0) return null;
  const wd = t.length * 26 + 90;
  return (
    <g transform={`translate(${x} ${y}) scale(${p})`} opacity={Math.min(1, p * 1.5)}>
      <rect x={-wd / 2} y={-62} width={wd} height={116} rx={40} fill={CREAM} />
      <path d={tail === "l" ? `M${-wd / 2 + 60} 50 l-30 50 l70 -50 Z` : `M${wd / 2 - 60} 50 l30 50 l-70 -50 Z`} fill={CREAM} />
      <text x={0} y={14} fontFamily={fontFamily} fontWeight={900} fontSize={46} fill={c} textAnchor="middle">
        {t}
      </text>
    </g>
  );
};

// Savrulma (whip): at[i] karesinde shots[i] → shots[i+1]
const Whip: React.FC<{ f: number; at: number[]; dir?: number[]; shots: React.ReactNode[] }> = ({ f, at, dir = [], shots }) => {
  const id = useId().replace(/:/g, "");
  const L = 5;
  let i = 0;
  while (i < at.length && f >= at[i]) i++;
  let k = -1;
  for (let j = 0; j < at.length; j++) if (Math.abs(f - at[j]) < L) k = j;
  let off = 0;
  let blur = 0;
  if (k >= 0) {
    const s = dir[k] ?? 1;
    const t = f - at[k];
    off = t < 0 ? -s * 900 * ((t + L) / L) ** 2 : s * 900 * (1 - t / L) ** 2;
    blur = 55 * (1 - Math.abs(t) / L);
  }
  return (
    <g>
      <filter id={`w${id}`} x="-20%" y="-5%" width="140%" height="110%">
        <feGaussianBlur stdDeviation={`${blur} ${blur * 0.08}`} />
      </filter>
      <rect width={1080} height={1920} fill="#050506" />
      <g transform={`translate(${off} 0)`} filter={blur > 0.5 ? `url(#w${id})` : undefined}>
        {shots[i]}
      </g>
    </g>
  );
};

/* ---------- sahneler ---------- */

// 1) "Spora başlamak istiyorsun ama nereden başlayacağını bilmiyorsun."
// Kling klibi (public/heykel/klip/kapi/NNN.jpg, 30 fps, 151 kare): salonun kapısından girer, duraksar, makinelere bakar,
// dönüp çıkar. Üstte yavaş yakınlaşma; "nereden"de başının yanında kırmızı "?" belirir.
const KAPI_N = 151;
const ClipFrame: React.FC<{ dir: string; i: number }> = ({ dir, i }) => {
  const url = staticFile(`heykel/klip/${dir}/${String(i).padStart(3, "0")}.jpg`);
  useImgReady(url);
  return <image href={url} x={0} y={0} width={1080} height={1920} preserveAspectRatio="xMidYMid slice" />;
};
const BsKanca: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const i = Math.min(KAPI_N, f + 1);
  const q = pop(f, w(4), 10) * (1 - prog(f, w(6) + 6, w(6) + 14));
  return (
    <g>
      <g transform={`translate(540 900) scale(${1.02 + 0.08 * prog(f, 0, d)}) translate(-540 -900)`}>
        <ClipFrame dir="kapi" i={i} />
      </g>
      {q > 0 ? (
        <text x={930 + Math.sin(f / 6) * 6} y={330} fontFamily={fontFamily} fontWeight={900} fontSize={200 * q} fill={RED} textAnchor="middle" opacity={Math.min(1, q)}>
          ?
        </text>
      ) : null}
    </g>
  );
};

// Dambıl rafı: kilolar ve üstlerinde "?"
const Rack: React.FC<{ f: number; a: number }> = ({ f, a }) => (
  <g>
    {[2, 4, 6, 8, 10, 12].map((kg, i) => {
      const p = pop(f, a + i * 2, 8);
      const x = 110 + (i % 3) * 210;
      const y = 1080 + Math.floor(i / 3) * 230;
      return p > 0 ? (
        <g key={kg} transform={`translate(${x + 40} ${y}) scale(${p * 0.42})`}>
          <Dumbbell x={0} y={0} kg={`${kg}`} />
          <text x={0} y={-140 + Math.sin(f / 6 + i) * 8} fontFamily={fontFamily} fontWeight={900} fontSize={110} fill={RED} textAnchor="middle">
            ?
          </text>
        </g>
      ) : null;
    })}
  </g>
);

// 2) "Bu makine ne işe yarar? Kaç kilo alayım? Ya yanlış yaparsam?" — üç soru, üç savrulma
const BsSorular: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const t1 = w(5) - 2;
  const t2 = w(8) - 2;
  const warn = prog(f, w(9), w(10));
  return (
    <g>
      <Whip
        f={f}
        at={[t1, t2]}
        dir={[1, -1]}
        shots={[
          <g key="a">
            <Gym f={f} i={0} pan={-120 + 60 * prog(f, 0, t1)} />
            <Cut n="04" x={420} y={1640} h={1460} />
            <Ask x={640} y={360} p={pop(f, 2, 10)} t="Bu makine ne işe yarar?" tail="l" />
          </g>,
          <g key="b">
            <Gym f={f} i={1} pan={100 - 60 * prog(f, t1, t2)} />
            <Cut n="03" x={720} y={1660} h={1420} />
            <Rack f={f} a={t1 + 2} />
            <Ask x={460} y={360} p={pop(f, t1 + 4, 10)} t="Kaç kilo alayım?" tail="r" />
          </g>,
          <g key="c" transform={`translate(${Math.sin(f * 1.3) * 6 * warn} 0)`}>
            <Gym f={f} i={2} pan={0} z={1.25} />
            <Cut n="06" x={540} y={1700} h={1600} />
            <rect width={1080} height={1920} fill={RED} opacity={0.18 * warn * (0.6 + 0.4 * Math.sin(f / 3))} />
            <Ask x={540} y={330} p={pop(f, t2 + 4, 10)} t="Ya yanlış yaparsam?" c={RED} />
          </g>,
        ]}
      />
    </g>
  );
};

// Bakan göz (yan karakter yok; "herkes bakıyor" hissi): badem göz, kırpar
const Eye: React.FC<{ x: number; y: number; s: number; f: number; seed: number; p: number }> = ({ x, y, s, f, seed, p }) => {
  if (p <= 0) return null;
  const blink = (f + seed * 13) % 70 < 4 ? 0.1 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${s * p} ${s * p * blink})`}>
      <path d="M-60 0 Q0 -46 60 0 Q0 46 -60 0 Z" fill="#f4f1ea" opacity={0.92} />
      <circle cx={-12 + 10 * Math.sin(seed)} cy={0} r={22} fill="#2a1912" />
      <circle cx={-18 + 10 * Math.sin(seed)} cy={-6} r={6} fill="#fff" />
    </g>
  );
};

// 3) "Sonra herkes sana bakıyormuş gibi gelir, 'yarın başlarım' dersin."
// Karanlıkta tanrıçanın çevresinde gözler açılır; "yarın"da kırmızı YARIN damgaları üst üste
const BsYarin: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const dark = prog(f, w(1) - 4, w(2));
  const eyes = [...Array(9)].map((_, i) => ({ x: 120 + random(`ex${i}`) * 840, y: 300 + random(`ey${i}`) * 900, s: 0.7 + random(`es${i}`) * 0.6 }));
  return (
    <g>
      <g transform={`translate(540 960) scale(${1.05 + 0.08 * prog(f, 0, d)}) translate(-540 -960)`}>
        <Gym f={f} i={1} pan={-40} />
      </g>
      <rect width={1080} height={1920} fill="#000" opacity={0.6 * dark} />
      {eyes.map((e, i) => (
        <Eye key={i} x={e.x} y={e.y} s={e.s} f={f} seed={i} p={pop(f, w(1) + i * 2, 8) * (1 - prog(f, w(6) - 4, w(6) + 4))} />
      ))}
      <g transform={`translate(0 ${-20 * prog(f, w(5), w(7))})`}>
        <Cut n="08" x={540} y={1640} h={1150} />
      </g>
      {[0, 1, 2].map((k) => (
        <Stamp key={k} x={540 + (k - 1) * 60} y={330 + k * 140} p={pop(f, w(6) + k * 5, 10)} t="YARIN" s={110} r={-8 + k * 7} />
      ))}
    </g>
  );
};

// program-6hafta.jpg: H1 "Oryantasyon" bloğu y≈110..340
// 4) "VOOM'da ilk hafta tanışma haftası: hareketleri öğrenirsin, sana uygun ağırlığı birlikte bulursunuz."
const BsTanis: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const logo = pop(f, 0, 12) * (1 - prog(f, w(1) - 4, w(1) + 2));
  const card = pop(f, w(1), 14) * (1 - prog(f, w(8) - 4, w(8) + 2));
  const kgT = prog(f, w(8), w(10) + 6);
  const kg = [4, 6, 8][Math.min(2, Math.floor(kgT * 3))];
  return (
    <g>
      <g transform={`translate(540 960) scale(${1.04 + 0.06 * prog(f, 0, d)}) translate(-540 -960)`}>
        <Gym f={f} i={0} pan={60 - 120 * prog(f, 0, d)} mood="warm" />
      </g>
      <g transform={`translate(540 760) scale(${logo})`} opacity={Math.min(1, logo * 1.4)}>
        <Logo x={0} y={0} s={190} />
      </g>
      <Screen src="app/program-6hafta.jpg" iw={1290} ih={2152} crop={[40, 0, 1210, 880]} x={540} y={760} wd={880} p={card} r={-1}>
        <rect x={80} y={100} width={1150} height={250} rx={24} fill="none" stroke={LIME} strokeWidth={10} opacity={prog(f, w(3), w(4))} />
      </Screen>
      {card <= 0.01 && f >= w(8) - 2 ? (
        <g>
          <Cut n="07" x={540} y={1640} h={1380} />
          <g transform={`translate(820 520) scale(${pop(f, w(8), 10)})`}>
            <circle r={150} fill="#120a07" opacity={0.85} stroke={LIME} strokeWidth={8} />
            <text x={0} y={30} fontFamily={fontFamily} fontWeight={900} fontSize={110} fill={CREAM} textAnchor="middle">
              {kg}
            </text>
            <text x={0} y={90} fontFamily={fontFamily} fontWeight={800} fontSize={36} fill={LIME} textAnchor="middle">
              kg
            </text>
          </g>
          {kgT >= 1 ? (
            <path d="M720 690 l40 44 l80 -100" transform="translate(40 -40)" stroke={LIME} strokeWidth={22} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={240} strokeDashoffset={240 * (1 - prog(f, w(10) + 6, w(10) + 14))} />
          ) : null}
        </g>
      ) : null}
    </g>
  );
};

// 5) "Her sabah o günün antrenmanı hazır: hangi hareket, kaç set, neden." — telefona bakan tanrıça + gerçek hareket listesi
const LISTE = "app/voom-hareketler.jpg";
const BsBugun: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const list = pop(f, w(3), 14) * (1 - prog(f, w(10) - 4, w(10) + 2));
  const why = pop(f, w(10), 12);
  return (
    <g>
      <g transform={`translate(540 960) scale(${1.06 + 0.05 * prog(f, 0, d)}) translate(-540 -960)`}>
        <Gym f={f} i={2} pan={-60} mood="warm" />
      </g>
      <g transform={`translate(${-80 * prog(f, w(2), w(4))} 0)`}>
        <Cut n="05" x={460} y={1660} h={1440} />
      </g>
      <Screen src={LISTE} iw={384} ih={848} crop={[20, 330, 364, 360]} x={700} y={860} wd={620} p={list} r={2}>
        <rect x={55} y={372} width={205} height={310} rx={12} fill="none" stroke={LIME} strokeWidth={4} opacity={prog(f, w(6), w(7))} />
        <rect x={283} y={372} width={95} height={310} rx={12} fill="none" stroke={LIME} strokeWidth={4} opacity={prog(f, w(8), w(9))} />
      </Screen>
      <Screen src="app/bugun-neden.jpg" iw={384} ih={848} crop={[0, 200, 384, 150]} x={700} y={900} wd={660} p={why} r={-2}>
        <rect x={14} y={252} width={356} height={72} rx={10} fill="none" stroke={LIME} strokeWidth={4} />
      </Screen>
      {[
        [w(6), "hareket", 1100],
        [w(8), "set", 1190],
        [w(10), "neden", 1280],
      ].map(([at, t, y], i) => {
        const p = pop(f, at as number, 10);
        return p > 0 ? (
          <g key={i} transform={`translate(880 ${y as number}) scale(${p})`}>
            <rect x={-110} y={-44} width={220} height={74} rx={37} fill={LIME} />
            <text x={0} y={8} fontFamily={fontFamily} fontWeight={900} fontSize={38} fill={CHOC} textAnchor="middle">
              {t as string}
            </text>
          </g>
        ) : null;
      })}
    </g>
  );
};

// 6) "Takıldığın yerde koçuna sorarsın." — işaret eden tanrıça; soru balonu → "yazıyor…" → koçun gerçek cevabı
const BsKoc: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const msg = pop(f, w(2), 14);
  return (
    <g>
      <g transform={`translate(540 960) scale(${1.05 + 0.05 * prog(f, 0, d)}) translate(-540 -960)`}>
        <Gym f={f} i={0} pan={80} mood="warm" />
      </g>
      <Cut n="04" x={330} y={1660} h={1400} />
      <g transform={`translate(640 500) scale(${pop(f, 0, 10)})`}>
        <rect x={-380} y={-70} width={760} height={130} rx={40} fill={CREAM} />
        <text x={0} y={14} fontFamily={fontFamily} fontWeight={800} fontSize={38} fill={CHOC} textAnchor="middle">
          Bu hareketi doğru mu yapıyorum?
        </text>
      </g>
      {f >= w(1) - 4 && f < w(2) + 4 ? (
        <g transform="translate(760 680)">
          <rect x={-90} y={-40} width={180} height={80} rx={40} fill="#141212" />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={-40 + i * 40} cy={0} r={12} fill={LIME} opacity={0.4 + 0.6 * Math.max(0, Math.sin(f / 4 - i))} />
          ))}
        </g>
      ) : null}
      <Screen src="app/koc.jpg" iw={1290} ih={2622} crop={[30, 1560, 1240, 640]} x={720} y={900} wd={640} p={msg} r={2} />
    </g>
  );
};

// 7) "Yarın değil, bugün başla. VOOM yakında, linki profilde." — YARIN üstü çizilir, BUGÜN damgası; tanrıça dambılı kaldırır
// (açılışta düşen dambıl); logo; sonda dambıl bırakılır = açılış karesi
const BsSon: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const strike = prog(f, w(1) - 2, w(1) + 6);
  const logo = pop(f, w(4), 14) * (1 - prog(f, d - 22, d - 12));
  return (
    <g>
      <g transform={`translate(540 960) scale(${1.04 + 0.08 * prog(f, 0, d)}) translate(-540 -960)`}>
        <Gym f={f} i={0} pan={-40 + 80 * prog(f, 0, d)} mood="warm" />
      </g>
      <Cut n={f < w(3) ? "07" : "01"} x={540} y={1660} h={1440} />
      {f < w(4) ? (
        <g>
          <g transform={`translate(540 520) scale(${pop(f, 0, 10)})`} opacity={1 - 0.5 * strike}>
            <T x={0} y={40} s={140} c={CREAM} w={900}>
              YARIN
            </T>
            <path d={`M-230 0 L${-230 + 460 * strike} 0`} stroke={RED} strokeWidth={22} strokeLinecap="round" />
          </g>
          <Stamp x={540} y={760} p={pop(f, w(2), 12)} t="BUGÜN" c={LIME} s={120} r={-6} />
        </g>
      ) : null}
      {logo > 0 ? (
        <g opacity={Math.min(1, logo * 1.3)}>
          <rect x={170} y={420} width={740} height={360} rx={44} fill="#0c0c0d" opacity={0.84} />
          <g transform={`translate(540 580) scale(${logo})`}>
            <Logo x={0} y={0} s={150} />
          </g>
          <T x={540} y={670} s={50} c={CREAM} w={700}>
            yakında
          </T>
          <g opacity={prog(f, w(6), w(6) + 6)}>
            <T x={540} y={740} s={40} c={LIME} w={800}>
              link profilde ↗
            </T>
          </g>
        </g>
      ) : null}
    </g>
  );
};

export const BASLA_SCENES: Record<string, React.FC<SceneProps>> = {
  "bs-kanca": BsKanca,
  "bs-sorular": BsSorular,
  "bs-yarin": BsYarin,
  "bs-tanis": BsTanis,
  "bs-bugun": BsBugun,
  "bs-koc": BsKoc,
  "bs-son": BsSon,
};
