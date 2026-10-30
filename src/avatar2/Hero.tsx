// Yeni seri avatarı (Yunus v2) — referans: kullanıcının gönderdiği karakter sayfasındaki erkek
// (siyah şapka, kıvırcık koyu saç, kirli sakal, gri kapüşonlu + siyah ceket, kot).
// Koordinatlar: ayak tabanı (0,0), yukarı eksi. Boy ≈ 850 birim (eski Person ile aynı ölçek).
import React, { useId } from "react";
import { AbsoluteFill, interpolate, Easing, useCurrentFrame } from "remotion";
import { handFamily } from "../fonts";

const H = {
  ink: "#24170f",
  skinL: "#f1c6a1",
  skin: "#dfa57c",
  skinD: "#b9805b",
  lip: "#b9705e",
  hair: "#2a1a11",
  hairL: "#4a3222",
  cap: "#1f1d1d",
  capL: "#3a3736",
  hood: "#8d8b87",
  hoodL: "#b3b1ab",
  hoodD: "#64625f",
  jacket: "#221e1c",
  jacketL: "#3d3632",
  jeans: "#2f3b52",
  jeansL: "#45567a",
  shoe: "#1c1a19",
  sole: "#e9e3d6",
  iris: "#5a3a22",
  rim: "#ffcf8a",
  tee: "#1f1f22",
  shorts: "#6d6f73",
};

export type HeroMouth = "neutral" | "smile" | "grin" | "smirk" | "talk";
export type HeroBrow = "calm" | "up" | "down" | "skeptic";
export type HeroOutfit = "sokak" | "salon";
type Arm = [number, number]; // [omuz açısı (0 = aşağı, + = dışa), dirsek bükümü]

export type HeroProps = {
  x: number;
  y: number;
  s?: number;
  mouth?: HeroMouth;
  talk?: number; // 0..1 ağız açıklığı (talk)
  brow?: HeroBrow;
  look?: [number, number]; // göz bebeği -1..1
  turn?: number; // baş dönüşü -1 (sola) .. 1 (sağa)
  tilt?: number; // baş eğimi (derece)
  armL?: Arm;
  armR?: Arm;
  pockets?: boolean; // eller ceplerde
  outfit?: HeroOutfit;
  rim?: number; // arka ışık parlaklığı 0..1
  live?: boolean; // nefes, ağırlık aktarma, göz kırpma, mikro baş hareketi
  seed?: number;
};

const pt = (p: number[]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
const dir = (side: number, deg: number) => {
  const r = (deg * Math.PI) / 180;
  return [side * Math.sin(r), Math.cos(r)];
};
const arm = (side: number, [a1, a2]: Arm, sh: number[]) => {
  const e1 = dir(side, a1);
  const e = [sh[0] + e1[0] * 150, sh[1] + e1[1] * 150];
  const h1 = dir(side, a1 + a2);
  return [sh, e, [e[0] + h1[0] * 138, e[1] + h1[1] * 138]];
};

// Düzensiz ama belirlenimli göz kırpma: 2,3–4,6 sn aralıklarla, 4 karelik
const blinkAt = (f: number, seed: number) => {
  let t = 20 + (seed % 17);
  let i = 0;
  while (t < f + 10) {
    if (f >= t && f < t + 4) return true;
    i++;
    t += 70 + ((i * 37 + seed * 13) % 68);
  }
  return false;
};

export const Hero: React.FC<HeroProps> = ({
  x,
  y,
  s = 1,
  mouth = "neutral",
  talk = 0,
  brow = "calm",
  look = [0, 0],
  turn = 0,
  tilt = 0,
  armL = [12, -8],
  armR = [12, -8],
  pockets = false,
  outfit = "sokak",
  rim = 0.6,
  live = true,
  seed = 3,
}) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const f = useCurrentFrame();
  // doğal hareket: nefes (göğüs), ağırlık aktarma (kalça), mikro baş hareketi, bakış titremesi
  const breath = live ? Math.sin(f / 26) : 0;
  const sway = live ? Math.sin(f / 61 + seed) : 0;
  const headX = live ? 1.6 * Math.sin(f / 47 + seed) + 0.8 * Math.sin(f / 19) : 0;
  const headR = live ? 1.1 * Math.sin(f / 53 + seed * 2) : 0;
  const blink = live && blinkAt(f, seed);
  const jitter = live ? [0.06 * Math.sin(f / 7.3), 0.04 * Math.sin(f / 9.1)] : [0, 0];
  const lx = (look[0] + jitter[0]) * 5;
  const ly = (look[1] + jitter[1]) * 3;
  const tx = turn * 14; // yüz hatları dönüş yönüne kayar

  const sokak = outfit === "sokak";
  const shY = -598 - breath * 2;
  const shL = [-112, shY + 10];
  const shR = [112, shY + 10];
  const aL = pockets ? [shL, [-140, -480], [-94, -446]] : arm(-1, armL, shL);
  const aR = pockets ? [shR, [140, -480], [94, -446]] : arm(1, armR, shR);
  const hip = -395;
  const lean = sway * 6;
  const legs = [
    [[-42, hip], [-50 + lean * 0.4, -205], [-52, -32]],
    [[42, hip], [50 + lean * 0.4 - sway * 4, -205], [52, -32]],
  ];

  const g = (n: string) => `url(#${n}${id})`;
  const faceD = `M-50 -790 C-55 -770 -56 -760 -55 -742 C-56 -730 -56 -714 -52 -692 C-48 -664 -34 -642 -15 -633 Q${tx * 0.3} -627 15 -633 C34 -642 48 -664 52 -692 C56 -714 56 -730 55 -742 C56 -760 55 -770 50 -790 Z`;

  const limb = (p: number[][], w: number, color: string, light: string) => {
    const d = `M${pt(p[0])} L${pt(p[1])} L${pt(p[2])}`;
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} stroke={H.ink} strokeWidth={w + 7} />
        <path d={d} stroke={color} strokeWidth={w} />
        <path d={d} stroke={light} strokeWidth={w * 0.28} opacity={0.35} transform="translate(-9 0)" />
      </g>
    );
  };

  const hand = (p: number[][], side: number) => {
    const [hx, hy] = p[2];
    if (pockets) return null;
    return (
      <g>
        <ellipse cx={hx} cy={hy + 4} rx={19} ry={25} fill={g("sk")} stroke={H.ink} strokeWidth={3.5} />
        <path d={`M${hx + side * 14} ${hy - 6} q${side * 10} 10 ${side * 4} 22`} stroke={H.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
        <path d={`M${hx - 8} ${hy + 18} l0 10 M${hx} ${hy + 20} l0 10 M${hx + 8} ${hy + 18} l0 9`} stroke={H.skinD} strokeWidth={2.5} strokeLinecap="round" />
      </g>
    );
  };

  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <linearGradient id={`sk${id}`} x1="0" x2="1">
          <stop offset="0" stopColor={H.skinL} />
          <stop offset="0.55" stopColor={H.skin} />
          <stop offset="1" stopColor={H.skinD} />
        </linearGradient>
        <linearGradient id={`jk${id}`} x1="0" x2="1">
          <stop offset="0" stopColor={H.jacketL} />
          <stop offset="0.5" stopColor={H.jacket} />
          <stop offset="1" stopColor="#141110" />
        </linearGradient>
        <linearGradient id={`hd${id}`} x1="0" x2="1">
          <stop offset="0" stopColor={H.hoodL} />
          <stop offset="0.6" stopColor={H.hood} />
          <stop offset="1" stopColor={H.hoodD} />
        </linearGradient>
        <linearGradient id={`cp${id}`} x1="0" x2="1" y1="0" y2="0.4">
          <stop offset="0" stopColor={H.capL} />
          <stop offset="0.55" stopColor={H.cap} />
          <stop offset="1" stopColor="#0e0d0d" />
        </linearGradient>
        <linearGradient id={`bs${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2a160c" stopOpacity="0.55" />
          <stop offset="1" stopColor="#2a160c" stopOpacity="0" />
        </linearGradient>
        <pattern id={`st${id}`} width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.4" r="0.9" fill="#3a2418" />
          <circle cx="3.6" cy="3.5" r="0.8" fill="#3a2418" />
        </pattern>
        <clipPath id={`fc${id}`}>
          <path d={faceD} />
        </clipPath>
        <filter id={`sf${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* yer gölgesi */}
      <ellipse cx={sway * 6} cy={6} rx={150} ry={18} fill="#000" opacity={0.28} filter={g("sf")} />

      {/* bacaklar: kot / şort */}
      {legs.map((p, i) => (
        <g key={i}>
          {sokak ? (
            limb(p, 58, H.jeans, H.jeansL)
          ) : (
            <>
              {limb(p, 46, H.skin, H.skinL)}
              {limb([p[0], [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2 + 30], [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2 + 30]], 66, H.shorts, "#9a9ca0")}
            </>
          )}
          {/* spor ayakkabı */}
          <path
            d={`M${p[2][0] - 34} ${p[2][1] + 6} Q${p[2][0] - 30} ${p[2][1] - 22} ${p[2][0] + 4} ${p[2][1] - 18} Q${p[2][0] + 46 * (i ? 1 : -1) * 0 + 40} ${p[2][1] - 6} ${p[2][0] + 44} ${p[2][1] + 14} L${p[2][0] - 36} ${p[2][1] + 14} Z`}
            transform={i ? undefined : `scale(-1 1) translate(${-2 * p[2][0]} 0)`}
            fill={H.shoe}
            stroke={H.ink}
            strokeWidth={3.5}
          />
          <rect x={p[2][0] - (i ? 36 : 44)} y={p[2][1] + 12} width={80} height={9} rx={4} fill={H.sole} stroke={H.ink} strokeWidth={3} />
        </g>
      ))}

      {/* kapüşon başlığı: boynun arkasında, omuzlara yayılır */}
      {sokak ? (
        <path d={`M-78 ${shY + 8} C-80 -628 -48 -640 0 -638 C48 -640 80 -628 78 ${shY + 8} Z`} fill={g("hd")} stroke={H.ink} strokeWidth={3.5} />
      ) : null}

      {/* gövde */}
      <g transform={`translate(0 ${-breath * 1.5})`}>
        {sokak ? (
          <>
            {/* kapüşonlu (ceketin altında) */}
            <path d={`M-70 ${shY} L70 ${shY} L76 -372 Q0 -362 -76 -372 Z`} fill={g("hd")} stroke={H.ink} strokeWidth={3.5} />
            <path d="M-74 -386 Q0 -376 74 -386" stroke={H.hoodD} strokeWidth={5} fill="none" />
            <path d="M-48 -470 Q0 -462 48 -470 L52 -420 Q0 -414 -52 -420 Z" fill="none" stroke={H.hoodD} strokeWidth={3} />
            {/* ip */}
            <path d={`M-16 ${shY + 18} q-4 70 -2 120 M16 ${shY + 18} q4 66 2 112`} stroke={H.hoodL} strokeWidth={5} fill="none" strokeLinecap="round" />
            <rect x={-22} y={shY + 134} width={7} height={14} rx={2} fill="#d9d6cf" stroke={H.ink} strokeWidth={2} />
            <rect x={14} y={shY + 128} width={7} height={14} rx={2} fill="#d9d6cf" stroke={H.ink} strokeWidth={2} />
            {/* ceket: açık önlü, yakalı */}
            <path
              d={`M-118 ${shY + 8} Q-120 -500 -108 -380 L-44 -380 Q-50 -500 -40 ${shY - 4} Z`}
              fill={g("jk")}
              stroke={H.ink}
              strokeWidth={4}
              strokeLinejoin="round"
            />
            <path
              d={`M118 ${shY + 8} Q120 -500 108 -380 L44 -380 Q50 -500 40 ${shY - 4} Z`}
              fill={g("jk")}
              stroke={H.ink}
              strokeWidth={4}
              strokeLinejoin="round"
            />
            <path d={`M-40 ${shY - 4} L-70 ${shY + 50} L-50 ${shY + 64} L-58 ${shY + 120}`} stroke={H.ink} strokeWidth={3.5} fill="none" strokeLinejoin="round" />
            <path d={`M40 ${shY - 4} L70 ${shY + 50} L50 ${shY + 64} L58 ${shY + 120}`} stroke={H.ink} strokeWidth={3.5} fill="none" strokeLinejoin="round" />
            <path d="M-102 -450 l34 0 M102 -450 l-34 0" stroke="#0b0a09" strokeWidth={4} strokeLinecap="round" />
            <path d="M-46 -540 Q-50 -460 -45 -384 M46 -540 Q50 -460 45 -384" stroke="#55504a" strokeWidth={2} fill="none" strokeDasharray="5 5" />
            {/* kumaş kırışıkları */}
            <path d="M-96 -520 q14 10 30 6 M92 -505 q-14 10 -28 4" stroke="#0b0a09" strokeWidth={2.5} fill="none" opacity={0.7} />
            {/* sağ kenarda arka ışık */}
            <path d={`M118 ${shY + 8} Q120 -500 108 -380`} stroke={H.rim} strokeWidth={3} fill="none" opacity={rim * 0.8} />
          </>
        ) : (
          <>
            <path d={`M-108 ${shY + 4} Q-110 -480 -88 -382 Q0 -372 88 -382 Q110 -480 108 ${shY + 4} Q0 ${shY - 16} -108 ${shY + 4} Z`} fill={H.tee} stroke={H.ink} strokeWidth={4} />
            <path d={`M-28 ${shY - 8} Q0 ${shY + 22} 28 ${shY - 8}`} stroke="#3a3a3e" strokeWidth={5} fill="none" />
            <path d="M-50 -540 q22 16 44 6 M50 -540 q-22 16 -44 6" stroke="#333338" strokeWidth={3} fill="none" />
            <path d={`M108 ${shY + 4} Q110 -480 88 -382`} stroke={H.rim} strokeWidth={3} fill="none" opacity={rim * 0.8} />
          </>
        )}
      </g>

      {/* kollar */}
      {[aL, aR].map((p, i) => {
        const side = i ? 1 : -1;
        const sleeve = sokak ? H.jacket : H.tee;
        return (
          <g key={i}>
            {sokak ? (
              limb(p, 54, sleeve, H.jacketL)
            ) : (
              <>
                {limb(p, 44, H.skin, H.skinL)}
                {limb([p[0], [p[0][0] + (p[1][0] - p[0][0]) * 0.55, p[0][1] + (p[1][1] - p[0][1]) * 0.55], [p[0][0] + (p[1][0] - p[0][0]) * 0.55, p[0][1] + (p[1][1] - p[0][1]) * 0.55]], 62, sleeve, "#3a3a3e")}
              </>
            )}
            {sokak && !pockets ? (
              // kapüşonlunun manşeti ceket kolundan taşar
              <circle cx={p[1][0] + (p[2][0] - p[1][0]) * 0.86} cy={p[1][1] + (p[2][1] - p[1][1]) * 0.86} r={22} fill={H.hood} stroke={H.ink} strokeWidth={3} />
            ) : null}
            {hand(p, side)}
          </g>
        );
      })}

      {/* boyun */}
      <path d="M-27 -664 L-29 -604 Q0 -596 29 -604 L27 -664 Z" fill={g("sk")} stroke={H.ink} strokeWidth={3.5} />
      <path d="M-27 -652 Q0 -628 27 -652 L27 -640 Q0 -618 -27 -640 Z" fill="#7a4a30" opacity={0.35} />
      {sokak ? (
        <path d={`M-40 ${shY - 6} Q0 ${shY + 26} 40 ${shY - 6}`} stroke={H.hoodD} strokeWidth={6} fill="none" />
      ) : null}

      {/* baş */}
      <g transform={`translate(${headX} ${-breath * 1.5}) rotate(${tilt + headR} 0 -650)`}>
        {/* kıvırcık saç: şapkanın altından kulak üstüne ve enseye taşar */}
        {[-1, 1].map((sd) => (
          <g key={sd} fill={H.hair} stroke={H.ink} strokeWidth={2.2}>
            {[
              [60, -772, 12],
              [68, -758, 11],
              [64, -744, 10],
              [70, -732, 9],
              [52, -778, 10],
              [46, -690, 10],
              [38, -676, 9],
            ].map(([cx, cy, r], k) => (
              <g key={k}>
                <circle cx={sd * cx} cy={cy} r={r} />
                <path d={`M${sd * cx - 4} ${cy - 2} q4 -5 8 0`} stroke={H.hairL} strokeWidth={2} fill="none" />
              </g>
            ))}
          </g>
        ))}
        {/* kulaklar */}
        {[-1, 1].map((sd) => {
          const vis = 1 - Math.max(0, sd * -turn) * 0.8;
          return (
            <g key={sd} opacity={vis} transform={`translate(${sd * -turn * 6} 0)`}>
              <ellipse cx={sd * 57} cy={-720} rx={10} ry={18} fill={g("sk")} stroke={H.ink} strokeWidth={3} />
              <path d={`M${sd * 58} -730 q${sd * 4} 8 0 18`} stroke={H.skinD} strokeWidth={2.5} fill="none" />
            </g>
          );
        })}
        {/* yüz */}
        <path d={faceD} fill={g("sk")} stroke={H.ink} strokeWidth={3.8} />
        <g clipPath={g("fc")}>
          {/* elmacık / şakak gölgesi (ışık soldan) */}
          <ellipse cx={46 + tx * 0.3} cy={-712} rx={18} ry={40} fill={H.skinD} opacity={0.45} filter={g("sf")} />
          <ellipse cx={-34 + tx} cy={-706} rx={12} ry={8} fill="#e98b78" opacity={0.25} filter={g("sf")} />
          {/* kirli sakal */}
          <path
            d={`M-56 -716 C-53 -682 -40 -652 -16 -640 Q0 -635 16 -640 C40 -652 53 -682 56 -716 C48 -702 40 -694 30 -692 Q${16 + tx} -694 ${tx} -692 Q${-16 + tx} -694 -30 -692 C-40 -694 -48 -702 -56 -716 Z`}
            fill="#4a2e1f"
            opacity={0.26}
            filter={g("sf")}
          />
          <ellipse cx={tx * 0.5} cy={-648} rx={30} ry={16} fill="#3a2418" opacity={0.25} filter={g("sf")} />
          <path
            d={`M-56 -716 C-53 -682 -40 -652 -16 -640 Q0 -635 16 -640 C40 -652 53 -682 56 -716 C48 -702 40 -694 30 -692 Q${16 + tx} -694 ${tx} -692 Q${-16 + tx} -694 -30 -692 C-40 -694 -48 -702 -56 -716 Z`}
            fill={g("st")}
            opacity={0.3}
          />
          <path d={`M${-22 + tx} -686 Q${tx} -695 ${22 + tx} -686 Q${12 + tx} -682 ${tx} -684 Q${-12 + tx} -682 ${-22 + tx} -686 Z`} fill="#3a2418" opacity={0.3} filter={g("sf")} />
          {/* şapka siperliğinin gölgesi */}
          <rect x={-70} y={-790} width={140} height={34} fill={g("bs")} />
        </g>
        {/* kaşlar: iç uç / tepe / dış uç ayrı oynar (şüpheci: biri kavisli havada, diğeri çatık) */}
        {[-1, 1].map((sd) => {
          const B: Record<HeroBrow, [number, number, number][]> = {
            calm: [[0, 0, 0], [0, 0, 0]],
            up: [[-5, -7, -4], [-5, -7, -4]],
            down: [[6, 2, -1], [6, 2, -1]],
            skeptic: [[5, 3, 2], [-2, -10, -3]],
          };
          const [di, dp, dout] = B[brow][sd > 0 ? 1 : 0];
          const cx = sd * 25 + tx;
          const xi = cx - sd * 15;
          const xo = cx + sd * 17;
          return (
            <g key={sd}>
              <path
                d={`M${xi} ${-741 + di} Q${cx - sd * 2} ${-752 + dp} ${xo} ${-746 + dout} Q${xo - sd * 1} ${-742 + dout} ${xo - sd * 3} ${-741 + dout} Q${cx} ${-745 + dp} ${xi + sd * 1} ${-735 + di} Z`}
                fill={H.hair}
                stroke={H.ink}
                strokeWidth={1.6}
              />
              {/* kıl dokusu */}
              <path d={`M${xi + sd * 4} ${-739 + di} l${sd * 3} -5 M${xi + sd * 9} ${-741 + (di + dp) / 2} l${sd * 4} -5`} stroke={H.hairL} strokeWidth={1.4} />
              {di > 3 ? <path d={`M${sd * 8 + tx} ${-742 + di * 0.4} q${sd * -2} 6 0 11`} stroke={H.skinD} strokeWidth={2} fill="none" /> : null}
            </g>
          );
        })}
        {/* gözler: üst kapak (lid) ve alt kapak (low) ifadeye göre; şüpheci: çatık kaşın altındaki göz kısılır */}
        {[-1, 1].map((sd) => {
          const cx = sd * 24 + tx;
          const cy = -727;
          const w = 13 * (1 - Math.max(0, sd * -turn) * 0.25);
          if (blink) {
            return <path key={sd} d={`M${cx - w} ${cy} Q${cx} ${cy + 5} ${cx + w} ${cy}`} stroke={H.ink} strokeWidth={3.2} fill="none" strokeLinecap="round" />;
          }
          const L: Record<HeroBrow, [number, number][]> = {
            calm: [[0.15, 0], [0.15, 0]],
            up: [[0, 0], [0, 0]],
            down: [[0.35, 0.2], [0.35, 0.2]],
            skeptic: [[0.38, 0.3], [0, 0]],
          };
          const [lid, low] = L[brow][sd > 0 ? 1 : 0];
          const top = cy - 11 + lid * 13;
          const bot = cy + 7 - low * 5;
          const almond = `M${cx - w} ${cy} Q${cx} ${cy - 10} ${cx + w} ${cy - 1} Q${cx} ${cy + 7} ${cx - w} ${cy} Z`;
          const cid = `e${sd > 0 ? "r" : "l"}${id}`;
          return (
            <g key={sd}>
              <clipPath id={cid}>
                <path d={almond} />
              </clipPath>
              <path d={almond} fill="#f2e9dc" />
              <g clipPath={`url(#${cid})`}>
                <circle cx={cx + lx} cy={cy - 1 + ly} r={6.2} fill={H.iris} />
                <circle cx={cx + lx} cy={cy - 1 + ly} r={6.2} fill="none" stroke="#2c1a0e" strokeWidth={1.4} />
                <circle cx={cx + lx} cy={cy - 1 + ly} r={2.8} fill="#120a06" />
                <circle cx={cx + lx - 2.2} cy={cy - 3 + ly} r={1.5} fill="#fff" />
                {/* kapaklar */}
                <path d={`M${cx - w - 2} ${cy - 14} L${cx + w + 2} ${cy - 14} L${cx + w + 2} ${cy - 1} Q${cx} ${top} ${cx - w - 2} ${cy} Z`} fill={g("sk")} />
                <path d={`M${cx - w - 2} ${cy + 10} L${cx + w + 2} ${cy + 10} L${cx + w + 2} ${cy - 1} Q${cx} ${bot} ${cx - w - 2} ${cy} Z`} fill={g("sk")} />
                <path d={`M${cx - w} ${cy - 1} Q${cx} ${top + 1} ${cx + w} ${cy - 2}`} stroke="#5b3a28" strokeWidth={4} fill="none" opacity={0.45} />
              </g>
              {/* kirpik çizgisi + kapak kıvrımı */}
              <path d={`M${cx - w - 1} ${cy + 0.5} Q${cx} ${top} ${cx + w + 1} ${cy - 1.5}`} stroke={H.ink} strokeWidth={3.6} fill="none" strokeLinecap="round" />
              <path d={`M${cx + sd * (w - 1)} ${cy - 1.5} l${sd * 4} -2`} stroke={H.ink} strokeWidth={2.4} strokeLinecap="round" />
              <path d={`M${cx - w + 2} ${top - 4} Q${cx} ${top - 9} ${cx + w - 1} ${top - 3}`} stroke={H.skinD} strokeWidth={1.8} fill="none" />
              <path d={`M${cx - w + 3} ${bot - 3} Q${cx} ${bot + 1} ${cx + w - 2} ${bot - 4}`} stroke={H.skinD} strokeWidth={1.6} fill="none" opacity={0.85} />
              {low > 0.3 ? <path d={`M${cx - w + 4} ${bot + 2} Q${cx} ${bot + 6} ${cx + w - 3} ${bot + 1}`} stroke={H.skinD} strokeWidth={1.4} fill="none" opacity={0.6} /> : null}
            </g>
          );
        })}
        {/* burun */}
        <g transform={`translate(${tx * 1.25} 0)`}>
          <path d="M6 -736 Q12 -718 11 -704" stroke={H.skinD} strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d="M-11 -701 Q-5 -694 0 -697 Q5 -694 11 -701" stroke={H.ink} strokeWidth={2.8} fill="none" strokeLinecap="round" />
          <ellipse cx={-5} cy={-699} rx={2.3} ry={1.4} fill="#5a3320" />
          <ellipse cx={5} cy={-699} rx={2.3} ry={1.4} fill="#5a3320" />
          <ellipse cx={-2} cy={-707} rx={4} ry={3} fill="#fff" opacity={0.22} />
        </g>
        {/* ağız */}
        <g transform={`translate(${tx} 0)`}>
          {mouth === "neutral" ? (
            <>
              <path d="M-16 -675 Q-6 -678 0 -676 Q6 -678 16 -675" stroke={H.ink} strokeWidth={2.8} fill="none" strokeLinecap="round" />
              <path d="M-11 -671 Q0 -664 11 -671" stroke={H.lip} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.7} />
            </>
          ) : mouth === "smile" ? (
            <>
              <path d="M-19 -679 Q0 -667 19 -679" stroke={H.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
              <path d="M-12 -670 Q0 -664 12 -670" stroke={H.lip} strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={0.6} />
              <path d="M-22 -683 q-3 4 -1 8 M22 -683 q3 4 1 8" stroke={H.skinD} strokeWidth={2} fill="none" />
            </>
          ) : mouth === "smirk" ? (
            <>
              <ellipse cx={30} cy={-694} rx={13} ry={8} fill={H.skinL} opacity={0.55} filter={g("sf")} />
              <path d="M13 -699 Q25 -690 25 -679" stroke={H.skinD} strokeWidth={2.4} fill="none" strokeLinecap="round" />
              <path d="M-15 -675 Q-4 -677 4 -677 Q14 -678 21 -686" stroke={H.ink} strokeWidth={3.1} fill="none" strokeLinecap="round" />
              <path d="M21 -686 q4 2 3 7" stroke={H.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />
              <path d="M-10 -670 Q2 -665 13 -673" stroke={H.lip} strokeWidth={3.6} fill="none" strokeLinecap="round" opacity={0.6} />
              <path d="M-6 -663 Q2 -660 10 -664" stroke={H.skinD} strokeWidth={1.8} fill="none" opacity={0.7} />
            </>
          ) : mouth === "grin" ? (
            <>
              <path d="M-21 -681 Q0 -684 21 -681 Q12 -656 0 -656 Q-12 -656 -21 -681 Z" fill="#5a1f18" stroke={H.ink} strokeWidth={3} />
              <path d="M-18 -680 Q0 -683 18 -680 L16 -673 Q0 -675 -16 -673 Z" fill="#f6f1e6" />
              <path d="M-25 -686 q-3 5 0 10 M25 -686 q3 5 0 10" stroke={H.skinD} strokeWidth={2} fill="none" />
            </>
          ) : (
            (() => {
              const o = 2 + talk * 12;
              return (
                <>
                  <path d={`M-14 -676 Q0 -679 14 -676 Q8 ${-676 + o} 0 ${-676 + o} Q-8 ${-676 + o} -14 -676 Z`} fill="#5a1f18" stroke={H.ink} strokeWidth={2.8} />
                  {talk > 0.3 ? <path d="M-10 -676 Q0 -678 10 -676 L9 -673 Q0 -674 -9 -673 Z" fill="#f6f1e6" /> : null}
                </>
              );
            })()
          )}
        </g>
        {/* yan favoriler + alından taşan kıvırcık */}
        {[-1, 1].map((sd) => (
          <path key={sd} d={`M${sd * 55} -770 L${sd * 56} -722 L${sd * 49} -728 L${sd * 48} -768 Z`} fill={H.hair} opacity={0.9} />
        ))}

        {/* şapka */}
        <g transform={`translate(${tx * 0.5} -25)`}>
          <path d="M-64 -760 C-68 -812 -36 -836 0 -836 C36 -836 68 -812 64 -760 Z" fill={g("cp")} stroke={H.ink} strokeWidth={3.8} />
          <path d="M0 -836 L0 -762 M-32 -830 Q-42 -796 -38 -762 M32 -830 Q42 -796 38 -762" stroke="#0c0b0b" strokeWidth={2} fill="none" />
          <circle cx={0} cy={-835} r={5} fill={H.cap} stroke={H.ink} strokeWidth={2} />
          <path d="M-54 -814 Q-38 -832 -14 -832" stroke="#5a5654" strokeWidth={3} fill="none" opacity={0.6} strokeLinecap="round" />
          {/* siperlik: öne ve aşağı kıvrılır, ortası kalın */}
          <path
            d={`M-70 -762 Q${tx * 0.8} -780 70 -762 Q62 -730 ${tx * 0.8} -726 Q-62 -730 -70 -762 Z`}
            fill={H.cap}
            stroke={H.ink}
            strokeWidth={3.8}
          />
          <path d={`M-62 -752 Q${tx * 0.8} -744 62 -752`} stroke="#3e3a38" strokeWidth={2.5} fill="none" />
          <path d={`M-50 -742 Q${tx * 0.8} -732 50 -742`} stroke="#0a0909" strokeWidth={2} fill="none" opacity={0.7} />
          <path d={`M54 -806 C62 -786 64 -772 64 -762`} stroke={H.rim} strokeWidth={2.5} fill="none" opacity={rim} />
        </g>
        {/* yüzün sağ kenarında arka ışık */}
        <path d="M54 -730 C57 -710 54 -690 49 -672" stroke={H.rim} strokeWidth={3} fill="none" opacity={rim * 0.55} strokeLinecap="round" filter={g("sf")} />
      </g>
    </g>
  );
};

/* ---------- 1) Karakter sayfası (tek kare) ---------- */

const Label: React.FC<{ x: number; y: number; t: string; s?: number; r?: number }> = ({ x, y, t, s = 46, r = -3 }) => (
  <text x={x} y={y} fontFamily={handFamily} fontSize={s} fill={H.ink} transform={`rotate(${r} ${x} ${y})`}>
    {t}
  </text>
);

export const HeroSheet: React.FC = () => {
  const faces: { m: HeroMouth; b: HeroBrow; l: [number, number]; t: number; n: string }[] = [
    { m: "neutral", b: "calm", l: [0, 0], t: 0, n: "sakin" },
    { m: "smirk", b: "skeptic", l: [0.75, 0.1], t: 0.2, n: "şüpheci" },
    { m: "grin", b: "up", l: [0, 0], t: 0, n: "güler" },
    { m: "talk", b: "down", l: [-0.7, 0.2], t: -0.4, n: "anlatır" },
  ];
  return (
    <AbsoluteFill style={{ background: "#e8dcc6" }}>
      <svg viewBox="0 0 1080 1920" width="100%" height="100%">
        <Label x={60} y={130} t="Yunus" s={110} />
        <Label x={64} y={190} t="yeni seri avatarı · taslak" s={44} r={-2} />
        <Label x={720} y={110} t="sakin · gözlemci" s={38} r={2} />
        <Label x={720} y={160} t="esprili · koruyucu" s={38} r={2} />
        {[H.cap, H.hood, H.jacket, H.jeans, H.skin, H.hair].map((c, i) => (
          <circle key={i} cx={740 + i * 50} cy={205} r={18} fill={c} stroke={H.ink} strokeWidth={2} />
        ))}
        {/* ifadeler: yakın plan baş */}
        {faces.map((fc, i) => (
          <g key={i}>
            <rect x={40 + i * 255} y={260} width={235} height={300} fill="#2b2420" stroke={H.ink} strokeWidth={4} />
            <svg x={40 + i * 255} y={260} width={235} height={300} viewBox="-120 -880 240 306">
              <Hero x={0} y={0} mouth={fc.m} brow={fc.b} look={fc.l} turn={fc.t} tilt={fc.b === "skeptic" ? -5 : 0} talk={0.7} live={false} />
            </svg>
            <Label x={60 + i * 255} y={605} t={fc.n} s={40} />
          </g>
        ))}
        <Label x={60} y={680} t="kıyafet konuya göre değişir →" s={42} />
        {/* tam boy: sokak + salon + ceplerde */}
        <Hero x={210} y={1700} s={1.15} outfit="sokak" armL={[14, -10]} armR={[10, -6]} mouth="smile" look={[0.3, 0]} live={false} />
        <Hero x={560} y={1700} s={1.15} outfit="sokak" pockets mouth="smirk" brow="skeptic" turn={0.35} look={[0.6, 0]} live={false} />
        <Hero x={900} y={1700} s={1.15} outfit="salon" armL={[20, -20]} armR={[150, -110]} mouth="grin" brow="up" live={false} />
        <Label x={120} y={1800} t="sokak" s={44} />
        <Label x={460} y={1800} t="eller cepte" s={44} />
        <Label x={830} y={1800} t="salon" s={44} />
      </svg>
    </AbsoluteFill>
  );
};

/* ---------- 2) Sinematik deneme: ışık, kamera açıları, doğal hareket ---------- */

const NightStreet: React.FC<{ f: number; blur: number }> = ({ f, blur }) => {
  const flick = 0.9 + 0.1 * Math.sin(f * 1.7) * Math.sin(f * 0.31);
  return (
    <g filter={blur > 0.2 ? `url(#dof${Math.round(blur)})` : undefined}>
      <defs>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0b1220" />
          <stop offset="1" stopColor="#1c2232" />
        </linearGradient>
        <radialGradient id="lamp">
          <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#ffb060" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ff9a40" stopOpacity="0" />
        </radialGradient>
        <pattern id="brick" width="90" height="44" patternUnits="userSpaceOnUse">
          <rect width="90" height="44" fill="#2a221e" />
          <path d="M0 0 H90 M0 22 H90 M45 0 V22 M0 22 V44 M90 22 V44" stroke="#17120f" strokeWidth="3" />
        </pattern>
      </defs>
      <rect x={-600} y={-200} width={2400} height={2400} fill="url(#sky)" />
      {[...Array(40)].map((_, i) => (
        <circle key={i} cx={(i * 211) % 2000 - 400} cy={(i * 97) % 500 - 100} r={1.6} fill="#fff" opacity={0.3 + 0.3 * Math.sin(f / 20 + i)} />
      ))}
      {/* sol duvar + kemerli geçit */}
      <path d="M-600 300 L260 380 L260 1800 L-600 1900 Z" fill="url(#brick)" />
      <path d="M-600 300 L260 380 L260 1800 L-600 1900 Z" fill="#000" opacity={0.35} />
      <path d="M820 1800 L820 600 Q980 420 1140 600 L1140 1800 Z" fill="#0d0c10" />
      <path d="M760 1800 L760 520 Q980 300 1200 520 L1200 1800 Z" fill="none" stroke="#2a221e" strokeWidth={60} />
      {/* sokak lambaları */}
      {[
        [300, 560, 1],
        [1020, 700, 0.7],
      ].map(([lx, ly, k], i) => (
        <g key={i}>
          <circle cx={lx} cy={ly} r={260 * k} fill="url(#lamp)" opacity={flick} />
          <rect x={lx - 14 * k} y={ly - 18 * k} width={28 * k} height={36 * k} rx={6} fill="#ffe2b0" />
          <path d={`M${lx} ${ly - 18 * k} L${lx} ${ly - 60 * k} L${lx - 70 * k} ${ly - 60 * k}`} stroke="#141012" strokeWidth={10 * k} fill="none" />
        </g>
      ))}
      {/* ıslak zemin, ışık yansıması */}
      <rect x={-600} y={1680} width={2400} height={600} fill="#15161c" />
      <ellipse cx={320} cy={1760} rx={200} ry={24} fill="#ffb060" opacity={0.18 * flick} />
      <ellipse cx={1000} cy={1780} rx={140} ry={16} fill="#ffb060" opacity={0.12 * flick} />
    </g>
  );
};

type Shot = { from: number; to: number; cx: number; cy: number; z0: number; z1: number; rot: number; blur: number };
const SHOTS: Shot[] = [
  { from: 0, to: 100, cx: 560, cy: 1220, z0: 1.05, z1: 1.18, rot: 0, blur: 0 }, // genel plan, yavaş yaklaşma
  { from: 100, to: 200, cx: 620, cy: 930, z0: 1.9, z1: 2.05, rot: -2.5, blur: 4 }, // bel plan, hafif yatık açı
  { from: 200, to: 300, cx: 600, cy: 790, z0: 3.4, z1: 3.75, rot: 0, blur: 8 }, // yakın plan, arka bulanık
];

export const HeroCinema: React.FC = () => {
  const f = useCurrentFrame();
  const shot = SHOTS.find((s) => f >= s.from && f < s.to) ?? SHOTS[SHOTS.length - 1];
  const p = interpolate(f, [shot.from, shot.to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
  const z = shot.z0 + (shot.z1 - shot.z0) * p;
  // elde kamera titremesi (çok hafif)
  const hx = 3 * Math.sin(f / 13) + 2 * Math.sin(f / 7.7);
  const hy = 2.5 * Math.sin(f / 11.3);
  const cut = f - shot.from < 3 ? 1 - (f - shot.from) / 3 : 0;

  // oyunculuk
  const s1 = f < 100;
  const s2 = f >= 100 && f < 200;
  const lookUp = interpolate(f, [40, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const turnIn = interpolate(f, [120, 150], [-0.5, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const talking = f >= 222 && f < 268;
  const talk = talking ? 0.5 + 0.5 * Math.abs(Math.sin(f / 2.6)) * Math.abs(Math.sin(f / 5.1)) : 0;
  const mouth: HeroMouth = s1 ? "neutral" : s2 ? (f > 160 ? "smirk" : "neutral") : talking ? "talk" : f >= 268 ? "grin" : "smile";
  const brow: HeroBrow = s1 ? (f > 70 ? "down" : "calm") : s2 ? (f > 160 ? "skeptic" : "calm") : f >= 268 ? "up" : "calm";
  const look: [number, number] = s1 ? [-0.6 + 0.6 * lookUp, 0.6 - 0.6 * lookUp] : s2 ? [turnIn * 1.2, 0] : [0, 0];
  const turn = s1 ? -0.45 + 0.25 * lookUp : s2 ? turnIn : 0;
  const tilt = s1 ? 6 - 6 * lookUp : 0;
  // fener ışığı yakın planda yüzden geçer
  const beam = interpolate(f, [205, 245], [-400, 1400], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#05070c" }}>
      <svg viewBox="0 0 1080 1920" width="100%" height="100%">
        <defs>
          {[4, 8].map((b) => (
            <filter key={b} id={`dof${b}`} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation={b} />
            </filter>
          ))}
          <radialGradient id="vig" cx="0.5" cy="0.48" r="0.75">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.78" />
          </radialGradient>
          <linearGradient id="ray" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#ffcf8a" stopOpacity="0.28" />
            <stop offset="1" stopColor="#ffcf8a" stopOpacity="0" />
          </linearGradient>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 30} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <radialGradient id="beam">
            <stop offset="0" stopColor="#fff3d8" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff3d8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={`translate(540 960) rotate(${shot.rot}) scale(${z}) translate(${-shot.cx + hx / z} ${-shot.cy + hy / z})`}>
          <NightStreet f={f} blur={shot.blur} />
          {/* lambadan süzülen ışık huzmesi */}
          <path d="M300 560 L120 1700 L760 1700 Z" fill="url(#ray)" opacity={0.6} />
          <Hero x={600} y={1700} s={1.25} mouth={mouth} brow={brow} look={look} turn={turn} tilt={tilt} talk={talk} pockets={s1} armL={[14, -8]} armR={[16, -10]} rim={0.9} seed={5} />
          {/* sıcak ışık yüzün sol tarafına vurur */}
          <ellipse cx={540} cy={800} rx={90} ry={130} fill="#ffb060" opacity={0.12} filter="url(#dof8)" />
        </g>
        {f >= 200 ? <ellipse cx={beam} cy={900} rx={260} ry={200} fill="url(#beam)" style={{ mixBlendMode: "screen" }} /> : null}
        {/* renk derecelendirme: gölgeler soğuk, ışıklar sıcak */}
        <rect width={1080} height={1920} fill="#1a3a55" opacity={0.18} style={{ mixBlendMode: "soft-light" }} />
        <rect width={1080} height={1920} fill="#ff9a40" opacity={0.1} style={{ mixBlendMode: "overlay" }} />
        <rect width={1080} height={1920} fill="url(#vig)" />
        <rect width={1080} height={1920} filter="url(#grain)" opacity={0.07} />
        {/* sinema şeritleri */}
        <rect width={1080} height={70} fill="#000" />
        <rect y={1850} width={1080} height={70} fill="#000" />
        {cut > 0 ? <rect width={1080} height={1920} fill="#000" opacity={cut * 0.6} /> : null}
      </svg>
    </AbsoluteFill>
  );
};
