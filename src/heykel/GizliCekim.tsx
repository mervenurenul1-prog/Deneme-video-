// VOOM spor programı tanıtımı — "Gizli çekim": gece salonda telefonla gizlice çekilen heykel tanrıça.
// Telefon vizörü (REC, odak köşeleri, zaman kodu) + elde titreyen kamera + hızlı savrulma (whip). Heykeller kameranın
// önünde hiç kıpırdamaz; hareket hep "göz kaçınca" olur (donma şakası). Sahneler `gc-*`; kelime zamanı w(i).
// Görseller: public/heykel/khiton/kaide-v1.png (khitonlu tanrıça kaidede), public/heykel/{fitness,erkek,pilates}/pozNN.jpg.
import React, { useEffect, useId, useState } from "react";
import { continueRender, delayRender, Easing, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { fontFamily } from "../fonts";

type SceneProps = { d: number; w: (i: number) => number };

const RED = "#e2382f";
const LIME = "#c8e85a";
const YEL = "#ffd23f";
const CREAM = "#fbf6ee";
const INK = "#141212";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ease = Easing.inOut(Easing.cubic);
const prog = (f: number, a: number, b: number) => interpolate(f, [a, Math.max(a + 1, b)], [0, 1], { ...clamp, easing: ease });
const pop = (f: number, a: number, len = 10) => interpolate(f, [a, a + len], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.2)) });

const useImgReady = (src: string) => {
  const [handle] = useState(() => delayRender(`img ${src}`));
  useEffect(() => {
    const im = new Image();
    im.onload = () => continueRender(handle);
    im.onerror = () => continueRender(handle);
    im.src = src;
  }, [handle, src]);
};

/* ---------- kamera ---------- */

// [kare, merkezX, merkezY, yakınlık]
type Key = [number, number, number, number];
const camAt = (f: number, keys: Key[]): Key => {
  if (f <= keys[0][0]) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (f <= b[0]) {
      const t = ease((f - a[0]) / Math.max(1, b[0] - a[0]));
      return [f, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
    }
  }
  return keys[keys.length - 1];
};

// Elde tutulan telefon titremesi (düzensiz, birkaç sinüsün toplamı)
const hand = (f: number, amp: number) => ({
  x: amp * (Math.sin(f * 0.21) * 6 + Math.sin(f * 0.53 + 1.3) * 3 + Math.sin(f * 1.7 + 0.4) * 1.2),
  y: amp * (Math.sin(f * 0.17 + 2.1) * 5 + Math.sin(f * 0.61 + 0.2) * 2.5 + Math.sin(f * 1.9) * 1),
  r: amp * (Math.sin(f * 0.13 + 0.7) * 0.5 + Math.sin(f * 0.47) * 0.25),
});

// Kamera: görsel dışına taşmaz; amp = el titremesi şiddeti
const Cam: React.FC<{ f: number; keys: Key[]; amp?: number; children: React.ReactNode }> = ({ f, keys, amp = 1, children }) => {
  const [, cx0, cy0, z0] = camAt(f, keys);
  const z = Math.max(1.06, z0);
  const h = hand(f, amp);
  const cx = Math.min(1080 - 540 / z, Math.max(540 / z, cx0 - h.x / z));
  const cy = Math.min(1920 - 960 / z, Math.max(960 / z, cy0 - h.y / z));
  return <g transform={`rotate(${h.r} 540 960) translate(540 960) scale(${z}) translate(${-cx} ${-cy})`}>{children}</g>;
};

// Tam ekran görsel (9:16 → 1080x1920). night: gri stüdyo fonunu karanlık salona yaklaştırır (soğuk, karanlık)
const Img: React.FC<{ src: string; night?: boolean }> = ({ src, night }) => {
  const id = useId().replace(/:/g, "");
  const url = staticFile(src);
  useImgReady(url);
  return (
    <g>
      {night ? (
        <filter id={`n${id}`}>
          <feColorMatrix type="matrix" values="0.42 0.06 0.02 0 0  0.04 0.44 0.04 0 0  0.04 0.08 0.56 0 0  0 0 0 1 0" />
        </filter>
      ) : null}
      <image href={url} x={0} y={0} width={1080} height={1920} preserveAspectRatio="xMidYMid slice" filter={night ? `url(#n${id})` : undefined} />
    </g>
  );
};

/* ---------- savrulma (whip pan) ---------- */

// Çekim listesi: at[i] karesinde shots[i] → shots[i+1]. Geçişte görüntü yatay kayar ve bulanıklaşır.
const Whip: React.FC<{ f: number; at: number[]; dir?: number[]; shots: React.ReactNode[] }> = ({ f, at, dir = [], shots }) => {
  const id = useId().replace(/:/g, "");
  const L = 5;
  let i = 0;
  while (i < at.length && f >= at[i]) i++;
  // en yakın geçiş
  let k = -1;
  for (let j = 0; j < at.length; j++) if (Math.abs(f - at[j]) < L) k = j;
  let off = 0;
  let blur = 0;
  if (k >= 0) {
    const s = dir[k] ?? 1;
    const t = f - at[k];
    off = t < 0 ? -s * 900 * ((t + L) / L) ** 2 : s * 900 * (1 - t / L) ** 2;
    blur = 60 * (1 - Math.abs(t) / L);
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

/* ---------- telefon vizörü ---------- */

const pad2 = (n: number) => String(Math.floor(n)).padStart(2, "0");
type Focus = { x: number; y: number; s: number; lock: number; c?: string };

// Odak köşeleri: kilitlenmemişken (lock 0) beyaz ve titrek, kilitlenince sarı ve sabit
const FocusBox: React.FC<{ f: number; fo: Focus }> = ({ f, fo }) => {
  const hunt = 1 - fo.lock;
  const x = fo.x + hunt * Math.sin(f * 0.9) * 40;
  const y = fo.y + hunt * Math.cos(f * 0.7) * 30;
  const s = fo.s * (1 + hunt * 0.25 * Math.sin(f * 1.3)) * (1 + 0.18 * Math.max(0, 1 - Math.abs(fo.lock - 0.5) * 2));
  const c = fo.c ?? (fo.lock > 0.95 ? YEL : "#fff");
  const a = s / 2;
  const k = s * 0.22;
  return (
    <g stroke={c} strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.95}>
      <path d={`M${x - a} ${y - a + k} V${y - a} H${x - a + k}`} />
      <path d={`M${x + a - k} ${y - a} H${x + a} V${y - a + k}`} />
      <path d={`M${x - a} ${y + a - k} V${y + a} H${x - a + k}`} />
      <path d={`M${x + a - k} ${y + a} H${x + a} V${y + a - k}`} />
      <path d={`M${x - 14} ${y} H${x + 14} M${x} ${y - 14} V${y + 14}`} strokeWidth={4} />
    </g>
  );
};

// Vizör: köşeler, REC, zaman kodu, 4K, pil, tarih. frozen: her şey durur (REC grileşir).
const Viewfinder: React.FC<{ f: number; base: number; frozen?: number; date?: string; focus?: Focus; o?: number }> = ({ f, base, frozen, date, focus, o = 1 }) => {
  const ff = frozen !== undefined ? Math.min(f, frozen) : f;
  const sec = base + ff / 30;
  const on = frozen !== undefined && f >= frozen ? false : Math.floor(f / 15) % 2 === 0;
  const C = 70;
  const m = 60;
  const top = 200;
  const bot = 1460;
  return (
    <g opacity={o} fontFamily={fontFamily}>
      <g stroke="#fff" strokeWidth={5} fill="none" opacity={0.9}>
        <path d={`M${m} ${top + C} V${top} H${m + C}`} />
        <path d={`M${1080 - m - C} ${top} H${1080 - m} V${top + C}`} />
        <path d={`M${m} ${bot - C} V${bot} H${m + C}`} />
        <path d={`M${1080 - m - C} ${bot} H${1080 - m} V${bot - C}`} />
      </g>
      <circle cx={m + 40} cy={top + 46} r={13} fill={frozen !== undefined && f >= frozen ? "#8a8a8a" : RED} opacity={on || (frozen !== undefined && f >= frozen) ? 1 : 0.15} />
      <text x={m + 64} y={top + 57} fontSize={34} fontWeight={800} fill="#fff">
        REC
      </text>
      <text x={540} y={top + 57} fontSize={34} fontWeight={600} fill="#fff" textAnchor="middle" style={{ fontVariantNumeric: "tabular-nums" }}>
        {`00:${pad2(sec / 60)}:${pad2(sec % 60)}`}
      </text>
      {/* pil */}
      <g transform={`translate(${1080 - m - 110} ${top + 28})`}>
        <rect x={0} y={0} width={70} height={34} rx={6} fill="none" stroke="#fff" strokeWidth={4} />
        <rect x={72} y={10} width={7} height={14} rx={2} fill="#fff" />
        <rect x={6} y={6} width={38} height={22} rx={3} fill={LIME} />
      </g>
      <text x={m + 30} y={bot - 30} fontSize={28} fontWeight={700} fill="#fff" opacity={0.9}>
        4K · 60
      </text>
      {date ? (
        <text x={1080 - m - 30} y={bot - 30} fontSize={30} fontWeight={700} fill={YEL} textAnchor="end" style={{ fontVariantNumeric: "tabular-nums" }}>
          {date}
        </text>
      ) : null}
      {focus ? <FocusBox f={ff} fo={focus} /> : null}
    </g>
  );
};

// Gece çekimi: gren + koyu kenarlar
const Grain: React.FC<{ f: number; amt?: number }> = ({ f, amt = 0.09 }) => {
  const id = useId().replace(/:/g, "");
  return (
    <g pointerEvents="none">
      <filter id={`g${id}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={1} seed={f % 12} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={1080} height={1920} filter={`url(#g${id})`} opacity={amt} />
      <radialGradient id={`v${id}`} cx="0.5" cy="0.45" r="0.75">
        <stop offset="0.55" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.6" />
      </radialGradient>
      <rect width={1080} height={1920} fill={`url(#v${id})`} />
    </g>
  );
};

/* ---------- küçük parçalar ---------- */

const T: React.FC<{ x: number; y: number; s: number; c?: string; w?: number; a?: "start" | "middle" | "end"; children: React.ReactNode }> = ({ x, y, s, c = "#fff", w = 800, a = "middle", children }) => (
  <text x={x} y={y} fontFamily={fontFamily} fontWeight={w} fontSize={s} fill={c} textAnchor={a}>
    {children}
  </text>
);

// Ekrana yapışan etiket (vizörün üstünde, gece çekiminde okunur: koyu zemin)
const Tag: React.FC<{ x: number; y: number; p: number; children: React.ReactNode; c?: string; r?: number; wd?: number }> = ({ x, y, p, children, c = "#fff", r = 0, wd = 420 }) => {
  if (p <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${p})`} opacity={Math.min(1, p * 1.5)}>
      <rect x={-wd / 2} y={-52} width={wd} height={92} rx={20} fill="#0c0c0d" opacity={0.82} stroke={c} strokeWidth={3} />
      <T x={0} y={10} s={42} c={c} w={800}>
        {children}
      </T>
    </g>
  );
};

const Stamp: React.FC<{ x: number; y: number; p: number; t: string; c?: string; s?: number; r?: number }> = ({ x, y, p, t, c = RED, s = 70, r = -7 }) => {
  if (p <= 0) return null;
  const k = 1.7 - 0.7 * p;
  const wd = t.length * s * 0.62 + 60;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`} opacity={Math.min(1, p * 1.4)}>
      <rect x={-wd / 2} y={-s * 0.85} width={wd} height={s * 1.35} rx={14} fill="#0c0c0d" opacity={0.55} />
      <rect x={-wd / 2} y={-s * 0.85} width={wd} height={s * 1.35} rx={14} fill="none" stroke={c} strokeWidth={9} />
      <T x={0} y={s * 0.3} s={s} c={c} w={900}>
        {t}
      </T>
    </g>
  );
};

// "voom." logosu: beyaz küçük harf + fıstık yeşili nokta
const Logo: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <g transform={`translate(${x} ${y})`}>
    <T x={-s * 0.12} y={0} s={s} w={800}>
      voom
    </T>
    <circle cx={s * 1.08} cy={-s * 0.08} r={s * 0.1} fill={LIME} />
  </g>
);

// Telefon kartı: gerçek uygulama ekranı (görselin bir bölümü), koyu çerçeve
const Screen: React.FC<{ src: string; iw: number; ih: number; crop: [number, number, number, number]; x: number; y: number; wd: number; p: number; r?: number; children?: React.ReactNode }> = ({ src, iw, ih, crop, x, y, wd, p, r = 0, children }) => {
  const url = staticFile(src);
  useImgReady(url);
  const id = useId().replace(/:/g, "");
  if (p <= 0) return null;
  const [cx, cy, cw, ch] = crop;
  const k = wd / cw;
  const ht = ch * k;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${p}) translate(${-wd / 2} ${-ht / 2})`} opacity={Math.min(1, p * 1.4)}>
      <rect x={10} y={18} width={wd} height={ht} rx={36} fill="#000" opacity={0.45} />
      <clipPath id={`c${id}`}>
        <rect x={0} y={0} width={wd} height={ht} rx={36} />
      </clipPath>
      <rect x={0} y={0} width={wd} height={ht} rx={36} fill="#0b0b0b" />
      <g clipPath={`url(#c${id})`}>
        <image href={url} x={-cx * k} y={-cy * k} width={iw * k} height={ih * k} />
        {/* çocuk koordinatları: kırpılmış görselin piksel koordinatı */}
        <g transform={`scale(${k}) translate(${-cx} ${-cy})`}>{children}</g>
      </g>
      <rect x={0} y={0} width={wd} height={ht} rx={36} fill="none" stroke="#2c2a28" strokeWidth={5} />
    </g>
  );
};

/* ---------- sahneler ---------- */

const KAIDE = "heykel/khiton/kaide-v1.png";
const FACE: Key = [0, 540, 340, 2.2];
// açılış karesi: sağdaki makinenin arkasından, geniş
const OPEN: Key = [0, 700, 980, 1.18];

// 1) "Üç yıldır beni gizlice çekiyorsun." — makinenin arkasından gizli çekim; odak arar, "beni"de yüzüne kilitlenir
const GcKanca: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const lockAt = w(2);
  const lock = prog(f, lockAt - 4, lockAt);
  const blurId = useId().replace(/:/g, "");
  const blur = 9 * (1 - lock);
  const cam = camAt(f, [OPEN, [lockAt, 560, 700, 1.4], [d, 540, 520, 1.75]]);
  // yüzün ekrandaki yeri (odak kutusu kamerayı izler)
  const z = cam[3];
  const fx = 540 + (540 - cam[1]) * z;
  const fy = 960 + (340 - cam[2]) * z;
  return (
    <g>
      <filter id={`b${blurId}`}>
        <feGaussianBlur stdDeviation={blur} />
      </filter>
      <g filter={blur > 0.3 ? `url(#b${blurId})` : undefined}>
        <Cam f={f} keys={[OPEN, [lockAt, 560, 700, 1.4], [d, 540, 520, 1.75]]} amp={1.1}>
          <Img src={KAIDE} />
        </Cam>
      </g>
      <Grain f={f} />
      <Viewfinder f={f} base={754} focus={{ x: f < lockAt - 4 ? 540 : fx, y: f < lockAt - 4 ? 900 : fy, s: 230, lock }} />
    </g>
  );
};

// Mermer damarları (vizörü kaplayan taş): sabit rastgele çizgiler
const VEINS = [...Array(14)].map((_, i) => {
  const x0 = random(`vx${i}`) * 1080;
  const y0 = random(`vy${i}`) * 1920;
  const pts = [...Array(5)].map((__, j) => `${(x0 + (random(`a${i}${j}`) - 0.5) * 260 * (j + 1)).toFixed(0)} ${(y0 + (random(`b${i}${j}`) - 0.3) * 200 * (j + 1)).toFixed(0)}`);
  return `M${x0.toFixed(0)} ${y0.toFixed(0)} L${pts.join(" L")}`;
});

// 2) "Ama asıl donup kalan sensin." — yüze sert yakınlaşma; "sensin"de vizör donar, kenarlardan mermer sarar (sen taş oluyorsun)
const GcDon: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const id = useId().replace(/:/g, "");
  const freezeAt = w(4);
  const stone = prog(f, freezeAt, d + 6);
  // donunca kamera da durur
  const camF = Math.min(f, freezeAt);
  return (
    <g>
      <Cam f={camF} keys={[[0, 540, 420, 1.9], [4, 540, 350, 2.3], [w(2), 540, 345, 2.45], [freezeAt, 540, 340, 2.6]]} amp={f >= freezeAt ? 0 : 1.2}>
        <Img src={KAIDE} />
      </Cam>
      <Grain f={camF} />
      {/* odak kutusu yüzden ayrılıp ekranın ortasına, yani kameranın arkasındakine döner */}
      <Viewfinder
        f={f}
        base={756.5}
        frozen={freezeAt}
        focus={{ x: 540, y: interpolate(f, [w(2), w(3) + 4], [345, 960], { ...clamp, easing: ease }), s: interpolate(f, [w(2), w(3) + 4], [260, 820], { ...clamp, easing: ease }), lock: 1, c: f >= w(2) ? RED : undefined }}
      />
      {f >= w(3) ? (
        <g opacity={prog(f, w(3), w(3) + 6)}>
          <Tag x={540} y={1250} p={pop(f, w(4) - 2)} c={RED} wd={260}>
            SEN
          </Tag>
        </g>
      ) : null}
      {/* mermer: kenarlardan içe */}
      {stone > 0 ? (
        <g>
          <mask id={`m${id}`}>
            <rect width={1080} height={1920} fill="#fff" />
            <ellipse cx={540} cy={900} rx={1000 * (1 - 0.62 * stone)} ry={1500 * (1 - 0.62 * stone)} fill="#000" filter={`url(#mb${id})`} />
          </mask>
          <filter id={`mb${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={60} />
          </filter>
          <g mask={`url(#m${id})`} opacity={Math.min(1, stone * 2)}>
            <rect width={1080} height={1920} fill="#e9e5de" />
            {VEINS.map((p, i) => (
              <path key={i} d={p} stroke="#9b958c" strokeWidth={2 + (i % 3)} fill="none" opacity={0.55} />
            ))}
          </g>
        </g>
      ) : null}
    </g>
  );
};

// Tarih damgası: 3 yıl hızla akar (aynı hareket, aynı ağırlık)
const dateAt = (t: number) => {
  // t 0..1: 30.10.2023 → 30.10.2026
  const days = Math.floor(t * 1096);
  const dt = new Date(Date.UTC(2023, 9, 30) + days * 86400000);
  return `${pad2(dt.getUTCDate())}.${pad2(dt.getUTCMonth() + 1)}.${dt.getUTCFullYear()}`;
};

// 3) "Her gün aynı hareket, aynı ağırlık, aklına gelen yemek. Vücut alıştığı yükte değişmez."
// Taş çatlar → kamera sarsılır → savrulur: tanrıça artık bordo spor kıyafetinde, aynı squatı yapıyor. Tarih 3 yıl akar, 10 kg sabit.
const GcYuk: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const crack = 1 - prog(f, 0, 7);
  const t1 = 8;
  const t2 = w(9);
  const years = prog(f, w(0), w(9));
  return (
    <g>
      <Whip
        f={f}
        at={[t1, t2]}
        dir={[1, -1]}
        shots={[
          <Cam key="a" f={f} keys={[[0, 540, 340, 2.6]]} amp={3}>
            <Img src={KAIDE} />
          </Cam>,
          <Cam key="b" f={f} keys={[[t1, 560, 1150, 1.25], [t2, 560, 1080, 1.35]]} amp={1.1}>
            <Img src="heykel/fitness/poz07.jpg" night />
          </Cam>,
          <Cam key="c" f={f} keys={[[t2, 540, 760, 1.25], [d, 540, 700, 1.4]]} amp={1}>
            <Img src="heykel/fitness/poz01.jpg" night />
          </Cam>,
        ]}
      />
      {/* çatlayan taş parçaları dağılır */}
      {crack > 0 ? (
        <g opacity={crack}>
          <rect width={1080} height={1920} fill="#e9e5de" opacity={0.6 * crack} />
          {VEINS.map((p, i) => (
            <path key={i} d={p} stroke="#fff" strokeWidth={6} fill="none" transform={`translate(${(i % 2 ? 1 : -1) * (1 - crack) * 300} ${(1 - crack) * 400})`} />
          ))}
        </g>
      ) : null}
      <Grain f={f} />
      <Viewfinder f={f} base={758} date={f >= w(0) ? dateAt(years) : undefined} focus={f > t1 + 4 && f < t2 - 4 ? { x: 560, y: 1000, s: 300, lock: prog(f, t1 + 4, t1 + 10) } : undefined} />
      {f < t2 + 2 ? (
        <g>
          <Tag x={300} y={430} p={pop(f, w(2))} r={-3} wd={440}>
            ↻ aynı hareket
          </Tag>
          <Tag x={790} y={560} p={pop(f, w(4))} r={3} wd={330}>
            hep 10 kg
          </Tag>
          <Tag x={330} y={700} p={pop(f, w(6))} r={-2} wd={500}>
            aklına gelen yemek
          </Tag>
        </g>
      ) : null}
      <Stamp x={540} y={1180} p={pop(f, w(12), 12)} t="DEĞİŞİM YOK" />
    </g>
  );
};

// Kilo sayacı (her hafta biraz daha)
const Weeks: React.FC<{ f: number; a: number; b: number }> = ({ f, a, b }) => {
  const n = Math.min(6, Math.floor(prog(f, a, b) * 6 + (f >= a ? 1 : 0)));
  if (f < a) return null;
  return (
    <g transform="translate(540 300)">
      <rect x={-430} y={-70} width={860} height={150} rx={30} fill="#0c0c0d" opacity={0.8} />
      {[...Array(6)].map((_, i) => {
        const on = i < n;
        return (
          <g key={i} transform={`translate(${(i - 2.5) * 136} 0)`}>
            <rect x={-56} y={-50 - i * 5} width={112} height={100 + i * 10} rx={16} fill={on ? LIME : "none"} stroke={LIME} strokeWidth={4} opacity={on ? 1 : 0.4} />
            <T x={0} y={14} s={34} c={on ? INK : LIME} w={900}>
              {`${8 + i * 2}`}
            </T>
          </g>
        );
      })}
      <T x={0} y={-90} s={34} c="#fff" w={700}>
        {`${n}. hafta · kg`}
      </T>
    </g>
  );
};

// 4) "Biz bir günde yontulmadık. Her hafta biraz daha."
// Donma şakası: kamera sağa savrulur — erkek tanrı yakalanmış, ellerini başına koymuş donmuş; sola — pilates tanrıçası da.
// "Her hafta"da erkek tanrı goblet squat; ağırlık her hafta biraz artar.
const GcDonma: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const t1 = 3;
  const t2 = w(2);
  const t3 = w(4) - 2;
  const caught = (at: number) => Math.max(0, 1 - (f - at - 5) / 10);
  return (
    <g>
      <Whip
        f={f}
        at={[t1, t2, t3]}
        dir={[1, -1, 1]}
        shots={[
          <Cam key="a" f={f} keys={[[0, 540, 760, 1.4]]} amp={1}>
            <Img src="heykel/fitness/poz01.jpg" night />
          </Cam>,
          <Cam key="b" f={f} keys={[[t1, 560, 420, 1.9], [t2, 560, 400, 2.0]]} amp={f < t1 + 8 ? 2.2 : 0.8}>
            <Img src="heykel/erkek/poz06.jpg" night />
          </Cam>,
          <Cam key="c" f={f} keys={[[t2, 540, 360, 2.0], [t3, 540, 340, 2.1]]} amp={f < t2 + 8 ? 2.2 : 0.8}>
            <Img src="heykel/pilates/poz06.jpg" night />
          </Cam>,
          <Cam key="d" f={f} keys={[[t3, 580, 1150, 1.3], [d, 580, 1120, 1.4]]} amp={1}>
            <Img src="heykel/erkek/poz07.jpg" night />
          </Cam>,
        ]}
      />
      <Grain f={f} />
      <Viewfinder
        f={f}
        base={763}
        focus={f >= t1 + 4 && f < t2 - 3 ? { x: 560, y: 520, s: 330, lock: 1 } : f >= t2 + 4 && f < t3 - 3 ? { x: 540, y: 480, s: 330, lock: 1 } : undefined}
      />
      {/* yakalandı: kısa beyaz parlama */}
      <rect width={1080} height={1920} fill="#fff" opacity={0.35 * Math.max(f >= t1 + 4 ? caught(t1) : 0, f >= t2 + 4 ? caught(t2) : 0) * (f < t3 ? 1 : 0)} />
      <Weeks f={f} a={t3 + 4} b={d - 6} />
    </g>
  );
};

// Bugün ekranı (01-bugun, 384x848): "BUGÜN NEDEN BU?" kutusu y≈268..318
const BUGUN = "app/bugun-neden.jpg";

// fitness poz05'te telefon ekranı (1080 koordinatı)
const PH = { x: 641, y: 342, w: 67, h: 128 };

// 5) "VOOM her sabah o günün antrenmanını hazırlar. Neden o hareketi seçtiğini de yazar."
// Telefon elden alınır: vizör savrulup kaybolur, ışık açılır. Tanrıça telefonu tutuyor; ekranda VOOM'un Bugün ekranı büyür.
const GcBugun: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const grab = prog(f, 0, 10);
  const url = staticFile(BUGUN);
  useImgReady(url);
  const big = pop(f, w(3), 14);
  const why = prog(f, w(7), w(8) + 4);
  return (
    <g>
      <Cam f={f} keys={[[0, 640, 420, 2.6], [w(1), 620, 520, 1.8], [d, 600, 560, 1.6]]} amp={0.4}>
        <Img src="heykel/fitness/poz05.jpg" />
        <clipPath id="gcPhone">
          <rect x={PH.x} y={PH.y} width={PH.w} height={PH.h} rx={7} />
        </clipPath>
        <rect x={PH.x} y={PH.y} width={PH.w} height={PH.h} rx={7} fill="#0b0b0b" />
        <image href={url} x={PH.x} y={PH.y + 4} width={PH.w} height={PH.w * (848 / 384)} clipPath="url(#gcPhone)" opacity={prog(f, 4, 12)} />
      </Cam>
      {/* elden alınış: vizör dönerek uçar */}
      {grab < 1 ? (
        <g transform={`rotate(${grab * 35} 540 960) translate(${grab * 700} ${-grab * 300})`} opacity={1 - grab}>
          <Viewfinder f={f} base={767} />
        </g>
      ) : null}
      <rect width={1080} height={1920} fill="#000" opacity={0.7 * (1 - grab)} />
      <Screen src={BUGUN} iw={384} ih={848} crop={[0, 40, 384, 330]} x={540} y={900} wd={780} p={big} r={-1}>
        <rect x={14} y={252} width={356} height={72} rx={10} fill="none" stroke={LIME} strokeWidth={4} opacity={why} />
      </Screen>
      {why > 0 ? (
        <g opacity={why}>
          <Tag x={540} y={1300} p={pop(f, w(7) + 2)} c={LIME} wd={560}>
            neden bu hareket?
          </Tag>
        </g>
      ) : null}
    </g>
  );
};

// program-6hafta.jpg (1290x2152): hafta noktaları x≈122, y = 165, 464, 763, 1061, 1360, 1659
const DOTS = [165, 464, 763, 1061, 1360, 1659];

// 6) "Yükü altı haftada adım adım artırır. Tabağını da hesaplar."
const GcProgram: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const p1 = pop(f, 0, 12);
  const plate = pop(f, w(6), 12);
  return (
    <g>
      <Cam f={f} keys={[[0, 600, 500, 1.6], [d, 580, 560, 1.45]]} amp={0.4}>
        <Img src="heykel/erkek/poz05.jpg" />
      </Cam>
      <rect width={1080} height={1920} fill="#000" opacity={0.35} />
      <Screen src="app/program-6hafta.jpg" iw={1290} ih={2152} crop={[40, 0, 1210, 1900]} x={540 - 120 * plate} y={860} wd={640} p={p1} r={-2}>
        {DOTS.map((y, i) => {
          const on = prog(f, w(1) + i * 3, w(1) + i * 3 + 4);
          return <circle key={i} cx={122} cy={y} r={34 + 10 * on} fill={LIME} opacity={on} />;
        })}
        {/* basamak çizgisi */}
        <path d={`M122 165 V${165 + (1659 - 165) * prog(f, w(1), w(5) + 4)}`} stroke={LIME} strokeWidth={12} />
      </Screen>
      <Screen src="app/beslenme.jpg" iw={1290} ih={2622} crop={[30, 880, 1240, 660]} x={600} y={1150} wd={720} p={plate} r={2} />
    </g>
  );
};

// 7) "Ara verirsen, koçun seni bulur." — pilates tanrıçası oturmuş dinleniyor; koçun bildirimi düşer
const GcKoc: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const n = pop(f, w(2) - 2, 12);
  return (
    <g>
      <Cam f={f} keys={[[0, 540, 1200, 1.2], [d, 540, 1100, 1.5]]} amp={0.5}>
        <Img src="heykel/pilates/poz08.jpg" />
      </Cam>
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

// 8) "VOOM yakında sizlerle. Linki profilde." — telefon geri verildi: vizör geri gelir, tanrıça yeniden kaidesinde.
// Logo belirir ve döngü öncesi söner; kamera açılış karesine (OPEN) döner.
const GcSon: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const back = prog(f, 0, 10);
  const logo = pop(f, w(0) + 2, 14) * (1 - prog(f, d - 22, d - 12));
  return (
    <g>
      <Cam f={f} keys={[[0, 560, 640, 1.5], [w(3), 620, 860, 1.3], [d - 12, OPEN[1], OPEN[2], OPEN[3]]]} amp={1}>
        <Img src={KAIDE} />
      </Cam>
      <Grain f={f} />
      <g transform={`rotate(${(1 - back) * -30} 540 960) translate(${(1 - back) * -600} 0)`} opacity={back}>
        <Viewfinder f={f} base={780} focus={{ x: 540, y: 900, s: 230, lock: 0 }} />
      </g>
      {logo > 0 ? (
        <g opacity={Math.min(1, logo * 1.3)}>
          <rect x={150} y={560} width={780} height={420} rx={40} fill="#0c0c0d" opacity={0.78} />
          <g transform={`translate(540 760) scale(${logo})`}>
            <Logo x={0} y={0} s={150} />
          </g>
          <T x={540} y={860} s={50} c={CREAM} w={700}>
            yakında
          </T>
          <g opacity={prog(f, w(3), w(3) + 6)}>
            <T x={540} y={940} s={40} c={LIME} w={800}>
              link profilde ↗
            </T>
          </g>
        </g>
      ) : null}
    </g>
  );
};

export const GIZLI_SCENES: Record<string, React.FC<SceneProps>> = {
  "gc-kanca": GcKanca,
  "gc-don": GcDon,
  "gc-yuk": GcYuk,
  "gc-donma": GcDonma,
  "gc-bugun": GcBugun,
  "gc-program": GcProgram,
  "gc-koc": GcKoc,
  "gc-son": GcSon,
};
