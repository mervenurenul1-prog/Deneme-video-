// 1930'lar çizgi film stili ("rubber hose"): lastik gibi bükülen kollar/bacaklar, beyaz eldiven, pasta dilimi gözler,
// ritimle zıplama, eski film efekti (gren, titreşim, çizik, "ikişer kare" hareket, iris geçişi).
// Karakterler kullanıcının gönderdiği sayfadaki ikiliye benzer: Yunus (şapka, kıvırcık saç, kirli sakal, kapüşonlu + ceket)
// ve Merve (uzun dalgalı saç, kâkül, halka küpe, kırmızı bere).
import React, { useId } from "react";
import { AbsoluteFill, interpolate, Easing, useCurrentFrame } from "remotion";
import { fontFamily, handFamily } from "../fonts";

const K = {
  ink: "#141010",
  paper: "#efe3c8",
  skin: "#f4c9a0",
  skinD: "#d9a27a",
  white: "#fbf7ee",
  cap: "#1b1918",
  hair: "#2c1b12",
  hood: "#9b9890",
  jacket: "#1f1c1b",
  jeans: "#3d5a80",
  shoe: "#1b1918",
  red: "#c0302b",
  tongue: "#d9534f",
  mHair: "#5a321f",
  tee: "#fbf7ee",
};

type HoseArm = [number, number, number]; // el hedefi (omuza göre x, y) + büküm
export type HoseFace = "smile" | "grin" | "o" | "smirk" | "kiss";

const noodle = (s: number[], e: number[], bend: number) => {
  const dx = e[0] - s[0];
  const dy = e[1] - s[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const c1 = [s[0] + dx * 0.3 + nx * bend, s[1] + dy * 0.3 + ny * bend];
  const c2 = [s[0] + dx * 0.7 + nx * bend, s[1] + dy * 0.7 + ny * bend];
  return `M${s[0]} ${s[1]} C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${e[0].toFixed(1)} ${e[1].toFixed(1)}`;
};

const Hose: React.FC<{ s: number[]; e: number[]; bend: number; w: number; color: string }> = ({ s, e, bend, w, color }) => {
  const d = noodle(s, e, bend);
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={K.ink} strokeWidth={w + 11} />
      <path d={d} stroke={color} strokeWidth={w} />
    </g>
  );
};

// dört parmaklı beyaz eldiven (manşetli); open = açık el / el sallama, fist = yumruk, point = işaret
const Glove: React.FC<{ x: number; y: number; r?: number; side: number; kind?: "open" | "fist" | "point" }> = ({ x, y, r = 0, side, kind = "open" }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${side} 1)`} stroke={K.ink} strokeWidth={5} strokeLinejoin="round">
    <path d="M-16 18 Q-22 30 -14 38 L14 38 Q22 30 16 18 Z" fill={K.white} />
    {kind === "fist" ? (
      <path d="M-26 -4 Q-30 -32 0 -34 Q30 -32 26 -4 Q26 18 0 20 Q-26 18 -26 -4 Z" fill={K.white} />
    ) : (
      <>
        {(kind === "point" ? [[-6, -66, 9]] : [[-22, -52, 8], [-8, -62, 8], [6, -62, 8], [20, -52, 8]]).map(([fx, fy, fw], i) => (
          <path key={i} d={`M${fx} -10 L${fx} ${fy + fw} Q${fx} ${fy} ${fx + fw} ${fy} Q${fx + fw * 2} ${fy} ${fx + fw * 2} ${fy + fw} L${fx + fw * 2} -10 Z`} fill={K.white} transform={`translate(${-fw} 0)`} />
        ))}
        <path d="M-30 -10 Q-32 18 0 20 Q32 18 30 -10 Q30 -22 0 -22 Q-30 -22 -30 -10 Z" fill={K.white} />
        <path d="M28 -2 Q46 -8 44 -24 Q40 -30 30 -22" fill={K.white} />
      </>
    )}
    <path d="M-8 -2 l0 12 M4 -2 l0 12" stroke={K.ink} strokeWidth={3} />
  </g>
);

// pasta dilimi göz: beyaz oval + kesik dilimli siyah bebek
const PieEye: React.FC<{ x: number; y: number; look: [number, number]; closed?: boolean; happy?: boolean; lashes?: boolean; side: number }> = ({ x, y, look, closed, happy, lashes, side }) => {
  if (closed || happy) {
    return (
      <g stroke={K.ink} strokeWidth={6} fill="none" strokeLinecap="round">
        <path d={happy ? `M${x - 16} ${y + 4} Q${x} ${y - 16} ${x + 16} ${y + 4}` : `M${x - 16} ${y} Q${x} ${y + 12} ${x + 16} ${y}`} />
        {lashes ? <path d={`M${x + side * 14} ${y - 2} l${side * 10} -8 M${x + side * 6} ${y - 8} l${side * 6} -10`} strokeWidth={4} /> : null}
      </g>
    );
  }
  const px = x + look[0] * 6;
  const py = y + 4 + look[1] * 6;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={17} ry={27} fill={K.white} stroke={K.ink} strokeWidth={5} />
      <ellipse cx={px} cy={py} rx={9} ry={16} fill={K.ink} />
      <path d={`M${px} ${py - 4} L${px + 5} ${py - 17} L${px + 10} ${py - 9} Z`} fill={K.white} />
      {lashes ? (
        <path d={`M${x + side * 10} ${y - 22} l${side * 10} -12 M${x + side * 16} ${y - 12} l${side * 13} -7 M${x + side * 2} ${y - 27} l${side * 4} -13`} stroke={K.ink} strokeWidth={5} strokeLinecap="round" />
      ) : null}
    </g>
  );
};

const Mouth: React.FC<{ y: number; face: HoseFace; w?: number; girl?: boolean }> = ({ y, face, w = 44, girl }) => {
  if (face === "kiss") {
    return (
      <g stroke={K.ink} strokeWidth={4}>
        <path d={`M-12 ${y} Q-14 ${y - 12} -2 ${y - 9} Q0 ${y - 12} 2 ${y - 9} Q14 ${y - 12} 12 ${y} Q0 ${y + 12} -12 ${y} Z`} fill={K.red} />
      </g>
    );
  }
  if (face === "o") {
    return <ellipse cx={0} cy={y + 4} rx={13} ry={17} fill="#4a1512" stroke={K.ink} strokeWidth={5} />;
  }
  if (face === "smirk") {
    return <path d={`M${-w * 0.5} ${y} Q${w * 0.1} ${y + 10} ${w * 0.55} ${y - 12}`} stroke={K.ink} strokeWidth={6} fill="none" strokeLinecap="round" />;
  }
  if (face === "smile" && girl) {
    // kalp biçimli kırmızı dudak + gülümseme
    return (
      <g stroke={K.ink} strokeWidth={4}>
        <path d={`M-22 ${y - 4} Q0 ${y + 18} 22 ${y - 4}`} fill="none" strokeWidth={5} strokeLinecap="round" />
        <path d={`M-12 ${y + 2} Q-12 ${y - 8} -2 ${y - 4} Q0 ${y - 8} 2 ${y - 4} Q12 ${y - 8} 12 ${y + 2} Q0 ${y + 12} -12 ${y + 2} Z`} fill={K.red} />
      </g>
    );
  }
  // açık geniş gülüş (dil görünür); grin = daha geniş
  const ww = face === "grin" ? w * 1.2 : w;
  const dd = face === "grin" ? 40 : 28;
  return (
    <g stroke={K.ink} strokeWidth={5} strokeLinejoin="round">
      <path d={`M${-ww / 2} ${y - 6} Q0 ${y + dd + 8} ${ww / 2} ${y - 6} Q0 ${y + 4} ${-ww / 2} ${y - 6} Z`} fill="#4a1512" />
      <path d={`M${-ww * 0.25} ${y + dd * 0.55} Q0 ${y + dd * 0.2} ${ww * 0.25} ${y + dd * 0.55} Q0 ${y + dd + 2} ${-ww * 0.25} ${y + dd * 0.55} Z`} fill={K.tongue} strokeWidth={3} />
      {girl ? <path d={`M${-ww / 2} ${y - 6} Q0 ${y + 2} ${ww / 2} ${y - 6}`} stroke={K.red} strokeWidth={6} fill="none" /> : null}
      <path d={`M${-ww / 2 - 6} ${y - 12} q4 6 0 12 M${ww / 2 + 6} ${y - 12} q-4 6 0 12`} fill="none" strokeWidth={4} strokeLinecap="round" />
    </g>
  );
};

export type HoseCharProps = {
  x: number;
  y: number;
  s?: number;
  who: "yunus" | "merve";
  face?: HoseFace;
  look?: [number, number];
  wink?: boolean;
  happyEyes?: boolean;
  armL?: HoseArm;
  armR?: HoseArm;
  handL?: "open" | "fist" | "point";
  handR?: "open" | "fist" | "point";
  bounce?: number; // 0..1 (zıplama evresi; 0 = yere değer)
  tilt?: number;
  blink?: boolean;
  beret?: boolean;
};

export const HoseChar: React.FC<HoseCharProps> = ({
  x,
  y,
  s = 1,
  who,
  face = "smile",
  look = [0, 0],
  wink = false,
  happyEyes = false,
  armL = [-70, 150, 40],
  armR = [70, 150, -40],
  handL = "open",
  handR = "open",
  bounce = 0,
  tilt = 0,
  blink = false,
  beret = false,
}) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const girl = who === "merve";
  // ezilip-uzama: yere değerken basık ve geniş, havadayken ince ve uzun
  const lift = bounce * 26;
  const sq = 1 - (1 - bounce) * 0.06 + bounce * 0.04;
  const sx = 2 - sq;
  const shY = -390;
  const shL = [-62, shY + 14];
  const shR = [62, shY + 14];
  const hipY = -196;
  const knee = (1 - bounce) * 26; // basınca dizler dışa kıvrılır
  const headY = -496;

  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={4} rx={120 - bounce * 30} ry={16} fill={K.ink} opacity={0.3} />
      <g transform={`translate(0 ${-lift}) scale(${sx} ${sq})`}>
        {/* bacaklar */}
        {[-1, 1].map((sd) => (
          <g key={sd}>
            <Hose s={[sd * 34, hipY]} e={[sd * 46, -26]} bend={-sd * (knee + 6)} w={30} color={K.jeans} />
            {/* koca ayakkabı */}
            <path
              d={`M${sd * 20} -34 Q${sd * 20} -60 ${sd * 52} -58 Q${sd * 100} -54 ${sd * 104} -18 Q${sd * 106} 2 ${sd * 70} 2 L${sd * 26} 2 Q${sd * 14} 2 ${sd * 20} -34 Z`}
              fill={girl ? K.white : K.shoe}
              stroke={K.ink}
              strokeWidth={6}
            />
            <ellipse cx={sd * 72} cy={-36} rx={14} ry={7} fill={girl ? "#fff" : "#6a6462"} opacity={0.8} />
          </g>
        ))}
        {/* gövde: armut biçimi */}
        {girl ? (
          <g stroke={K.ink} strokeWidth={6} strokeLinejoin="round">
            <path d={`M-58 ${shY} Q-84 -260 -60 ${hipY} Q0 ${hipY + 26} 60 ${hipY} Q84 -260 58 ${shY} Q0 ${shY - 20} -58 ${shY} Z`} fill={K.tee} />
            <path d={`M-58 ${shY} Q-84 -260 -60 ${hipY} L-26 ${hipY + 6} Q-36 -300 -20 ${shY - 8} Z`} fill={K.jacket} />
            <path d={`M58 ${shY} Q84 -260 60 ${hipY} L26 ${hipY + 6} Q36 -300 20 ${shY - 8} Z`} fill={K.jacket} />
            <path d={`M-60 ${hipY - 6} Q0 ${hipY + 16} 60 ${hipY - 6}`} fill="none" stroke={K.ink} strokeWidth={8} />
          </g>
        ) : (
          <g stroke={K.ink} strokeWidth={6} strokeLinejoin="round">
            <path d={`M-62 ${shY} Q-92 -260 -66 ${hipY} Q0 ${hipY + 26} 66 ${hipY} Q92 -260 62 ${shY} Q0 ${shY - 20} -62 ${shY} Z`} fill={K.hood} />
            <path d={`M-62 ${shY} Q-92 -260 -66 ${hipY} L-28 ${hipY + 8} Q-40 -300 -24 ${shY - 8} Z`} fill={K.jacket} />
            <path d={`M62 ${shY} Q92 -260 66 ${hipY} L28 ${hipY + 8} Q40 -300 24 ${shY - 8} Z`} fill={K.jacket} />
            {/* kapüşon ipleri */}
            <path d={`M-10 ${shY + 4} q-3 40 0 70 M10 ${shY + 4} q3 40 0 66`} stroke={K.white} strokeWidth={5} fill="none" strokeLinecap="round" />
            <path d={`M-10 ${shY + 4} q-3 40 0 70 M10 ${shY + 4} q3 40 0 66`} stroke={K.ink} strokeWidth={1.5} fill="none" />
          </g>
        )}
        {/* kollar + eldivenler */}
        {[
          [shL, armL, handL, -1],
          [shR, armR, handR, 1],
        ].map(([sh, a, hk, sd], i) => {
          const shp = sh as number[];
          const ar = a as HoseArm;
          const side = sd as number;
          const e = [shp[0] + ar[0], shp[1] + ar[1]];
          const ang = (Math.atan2(ar[1], ar[0]) * 180) / Math.PI - 90;
          return (
            <g key={i}>
              <Hose s={shp} e={e} bend={ar[2]} w={26} color={K.jacket} />
              <Glove x={e[0]} y={e[1]} r={ang} side={-side} kind={hk as "open" | "fist" | "point"} />
            </g>
          );
        })}
      </g>

      {/* baş (gövdeden biraz gecikmeli zıplar) */}
      <g transform={`translate(0 ${-lift * 1.15}) rotate(${tilt} 0 ${headY + 90})`}>
        {girl ? (
          // arka saç: uzun, uçları kıvrık
          <path
            d={`M-96 ${headY - 20} Q-120 ${headY + 120} -96 ${headY + 200} Q-70 ${headY + 230} -60 ${headY + 196} Q-40 ${headY + 230} -16 ${headY + 200} L16 ${headY + 200} Q40 ${headY + 230} 60 ${headY + 196} Q70 ${headY + 230} 96 ${headY + 200} Q120 ${headY + 120} 96 ${headY - 20} Z`}
            fill={K.mHair}
            stroke={K.ink}
            strokeWidth={6}
          />
        ) : (
          // kıvırcık saç: şapkanın altından iki yana taşan bukleler
          <g fill={K.hair} stroke={K.ink} strokeWidth={5}>
            {[-1, 1].map((sd) =>
              [
                [96, headY - 40, 22],
                [104, headY - 4, 20],
                [92, headY + 30, 17],
              ].map(([cx, cy, r], k) => (
                <g key={`${sd}${k}`}>
                  <circle cx={sd * cx} cy={cy} r={r} />
                  <path d={`M${sd * cx} ${cy} m${-r * 0.4} 0 a${r * 0.4} ${r * 0.4} 0 1 1 ${r * 0.4} ${r * 0.4}`} fill="none" stroke={K.ink} strokeWidth={3} />
                </g>
              )),
            )}
          </g>
        )}
        {/* kulaklar */}
        {[-1, 1].map((sd) => (
          <g key={sd}>
            <circle cx={sd * 96} cy={headY + 16} r={20} fill={K.skin} stroke={K.ink} strokeWidth={6} />
            {girl ? <circle cx={sd * 98} cy={headY + 46} r={14} fill="none" stroke={K.ink} strokeWidth={9} /> : null}
            {girl ? <circle cx={sd * 98} cy={headY + 46} r={14} fill="none" stroke="#e8e2d0" strokeWidth={4} /> : null}
          </g>
        ))}
        {/* kafa */}
        <ellipse cx={0} cy={headY} rx={100} ry={96} fill={K.skin} stroke={K.ink} strokeWidth={7} />
        {/* yanaklar */}
        <circle cx={-56} cy={headY + 34} r={16} fill={girl ? "#ee7d76" : "#e79a83"} opacity={0.55} />
        <circle cx={56} cy={headY + 34} r={16} fill={girl ? "#ee7d76" : "#e79a83"} opacity={0.55} />
        {/* kirli sakal: çenede nokta hilali */}
        {!girl ? (
          <g fill={K.ink} opacity={0.55}>
            {[...Array(26)].map((_, i) => {
              const t = i / 25;
              const a = Math.PI * (0.12 + 0.76 * t);
              const rr = 74 + ((i * 7) % 3) * 6;
              return <circle key={i} cx={Math.cos(a) * rr} cy={headY + 22 + Math.sin(a) * rr * 0.8} r={2.6} />;
            })}
          </g>
        ) : null}
        {/* gözler */}
        <PieEye x={-32} y={headY - 18} look={look} closed={blink} happy={happyEyes} lashes={girl} side={-1} />
        <PieEye x={32} y={headY - 18} look={look} closed={blink || wink} happy={happyEyes} lashes={girl} side={1} />
        {/* kaşlar */}
        {!girl ? <path d={`M-52 ${headY - 58} q20 -12 36 -2 M16 ${headY - 60} q20 -10 36 2`} stroke={K.ink} strokeWidth={9} fill="none" strokeLinecap="round" /> : null}
        {/* burun */}
        <ellipse cx={0} cy={headY + 14} rx={girl ? 9 : 14} ry={girl ? 7 : 11} fill={girl ? K.skinD : "#c98b66"} stroke={K.ink} strokeWidth={4} />
        <ellipse cx={-3} cy={headY + 10} rx={4} ry={3} fill="#fff" opacity={0.7} />
        <Mouth y={headY + 46} face={face} girl={girl} />
        {/* üst saç / şapka */}
        {girl ? (
          <g stroke={K.ink} strokeWidth={6} strokeLinejoin="round">
            {/* tepe + perdeli kâkül (dalgalı kenar) */}
            <path d={`M-104 ${headY - 6} Q-110 ${headY - 112} 0 ${headY - 112} Q110 ${headY - 112} 104 ${headY - 6} Q92 ${headY - 40} 70 ${headY - 52} Q58 ${headY - 40} 40 ${headY - 58} Q22 ${headY - 46} 4 ${headY - 70} Q-16 ${headY - 46} -36 ${headY - 58} Q-56 ${headY - 40} -70 ${headY - 52} Q-92 ${headY - 40} -104 ${headY - 6} Z`} fill={K.mHair} />
            <path d={`M-40 ${headY - 96} Q-60 ${headY - 70} -64 ${headY - 56} M40 ${headY - 96} Q60 ${headY - 70} 64 ${headY - 56}`} stroke="#8a5a3a" strokeWidth={5} fill="none" />
            {beret ? (
              <g transform={`rotate(-12 0 ${headY - 110})`}>
                <ellipse cx={-10} cy={headY - 112} rx={92} ry={34} fill={K.red} />
                <path d={`M-96 ${headY - 104} Q-10 ${headY - 80} 76 ${headY - 104}`} fill="none" stroke="#7a1414" strokeWidth={6} />
                <path d={`M-12 ${headY - 146} l0 -16`} strokeWidth={8} strokeLinecap="round" />
                <path d={`M-60 ${headY - 128} Q-30 ${headY - 140} 10 ${headY - 136}`} stroke="#e56a5f" strokeWidth={6} fill="none" strokeLinecap="round" />
              </g>
            ) : null}
          </g>
        ) : (
          <g stroke={K.ink} strokeWidth={6} strokeLinejoin="round">
            <path d={`M-98 ${headY - 44} Q-102 ${headY - 136} 0 ${headY - 138} Q102 ${headY - 136} 98 ${headY - 44} Z`} fill={K.cap} />
            <path d={`M0 ${headY - 138} L0 ${headY - 46} M-48 ${headY - 128} Q-60 ${headY - 90} -56 ${headY - 46} M48 ${headY - 128} Q60 ${headY - 90} 56 ${headY - 46}`} stroke="#3a3634" strokeWidth={3} fill="none" />
            <circle cx={0} cy={headY - 138} r={8} fill={K.cap} />
            <path d={`M-84 ${headY - 120} Q-60 ${headY - 140} -24 ${headY - 136}`} stroke="#6a6462" strokeWidth={6} fill="none" strokeLinecap="round" />
            {/* siperlik */}
            <path d={`M-110 ${headY - 46} Q0 ${headY - 74} 110 ${headY - 46} Q100 ${headY - 16} 0 ${headY - 20} Q-100 ${headY - 16} -110 ${headY - 46} Z`} fill={K.cap} />
          </g>
        )}
      </g>
      <defs>
        <filter id={`n${id}`}>
          <feGaussianBlur stdDeviation="0" />
        </filter>
      </defs>
    </g>
  );
};

/* ---------- eski film katmanı ---------- */

const rnd = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

export const OldFilm: React.FC<{ f: number; children: React.ReactNode; iris?: number }> = ({ f, children, iris = 1 }) => {
  const q = Math.floor(f / 2); // "ikişer kare" titreşim
  const flick = 0.92 + rnd(q) * 0.1;
  const jx = (rnd(q + 3) - 0.5) * 4;
  const jy = (rnd(q + 7) - 0.5) * 4;
  const scratches = [0, 1].filter((k) => rnd(q * 3 + k) > 0.55).map((k) => 80 + rnd(q * 5 + k) * 920);
  return (
    <AbsoluteFill style={{ background: "#0b0907" }}>
      <svg viewBox="0 0 1080 1920" width="100%" height="100%">
        <defs>
          <filter id="boil" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed={Math.floor(f / 3) % 6} />
            <feDisplacementMap in="SourceGraphic" scale="5" />
          </filter>
          <filter id="grain2">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={q % 40} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <radialGradient id="vig2" cx="0.5" cy="0.5" r="0.72">
            <stop offset="0.6" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#1a0f05" stopOpacity="0.85" />
          </radialGradient>
          <mask id="iris">
            <rect width={1080} height={1920} fill="#000" />
            <circle cx={540} cy={960} r={Math.max(0.01, iris) * 1150} fill="#fff" />
          </mask>
        </defs>
        <g mask="url(#iris)">
          <g transform={`translate(${jx} ${jy})`} filter="url(#boil)">
            {children}
          </g>
          {/* sepya renk + titreşen ışık */}
          <rect width={1080} height={1920} fill="#a8742e" opacity={0.16} style={{ mixBlendMode: "multiply" }} />
          <rect width={1080} height={1920} fill="#fff6dc" opacity={(flick - 0.92) * 1.2} />
          <rect width={1080} height={1920} filter="url(#grain2)" opacity={0.13} />
          {scratches.map((sx, k) => (
            <path key={k} d={`M${sx} 0 q${(rnd(q + k) - 0.5) * 30} 960 ${(rnd(q + k + 9) - 0.5) * 20} 1920`} stroke="#fff8e6" strokeWidth={1.6} opacity={0.35} fill="none" />
          ))}
          {rnd(q * 11) > 0.7 ? <circle cx={rnd(q * 13) * 1080} cy={rnd(q * 17) * 1920} r={2 + rnd(q) * 5} fill="#120c06" opacity={0.6} /> : null}
          <rect width={1080} height={1920} fill="url(#vig2)" />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/* ---------- sahne: 1930'lar sahne perdesi ---------- */

const Stage: React.FC<{ f: number }> = ({ f }) => (
  <g>
    <rect width={1080} height={1920} fill={K.paper} />
    {/* arka plandan yayılan ışın deseni (dönemin klasik fonu) */}
    <g transform={`rotate(${f * 0.15} 540 900)`} opacity={0.22}>
      {[...Array(16)].map((_, i) => (
        <path key={i} d="M540 900 L540 -900 L760 -900 Z" fill="#c99a52" transform={`rotate(${i * 22.5} 540 900)`} />
      ))}
    </g>
    <circle cx={540} cy={900} r={330} fill="#f6ecd4" stroke={K.ink} strokeWidth={6} />
    <circle cx={540} cy={900} r={300} fill="none" stroke={K.ink} strokeWidth={3} strokeDasharray="10 12" />
    {/* perdeler */}
    {[-1, 1].map((sd) => (
      <g key={sd} transform={sd > 0 ? "translate(1080 0) scale(-1 1)" : undefined}>
        <path d="M0 0 L260 0 Q170 420 200 900 Q120 1300 170 1920 L0 1920 Z" fill="#8e2a22" stroke={K.ink} strokeWidth={7} />
        {[60, 120, 180].map((px) => (
          <path key={px} d={`M${px} 0 Q${px - 40} 600 ${px - 10} 1100 Q${px - 30} 1500 ${px - 20} 1920`} stroke="#5e1914" strokeWidth={8} fill="none" />
        ))}
        <path d="M150 820 Q230 860 210 940" stroke="#e0b04a" strokeWidth={14} fill="none" strokeLinecap="round" />
      </g>
    ))}
    <path d="M0 0 L1080 0 L1080 120 Q900 190 720 130 Q540 200 360 130 Q180 190 0 120 Z" fill="#8e2a22" stroke={K.ink} strokeWidth={7} />
    {/* sahne tahtası */}
    <path d="M0 1560 L1080 1560 L1080 1920 L0 1920 Z" fill="#b07a44" stroke={K.ink} strokeWidth={7} />
    {[1620, 1700, 1800].map((yy) => (
      <path key={yy} d={`M0 ${yy} L1080 ${yy}`} stroke="#7a4e26" strokeWidth={4} />
    ))}
  </g>
);

/* ---------- 1) karakter sayfası ---------- */

const Lbl: React.FC<{ x: number; y: number; t: string; s?: number }> = ({ x, y, t, s = 44 }) => (
  <text x={x} y={y} fontFamily={handFamily} fontSize={s} fill={K.ink} transform={`rotate(-3 ${x} ${y})`}>
    {t}
  </text>
);

export const HoseSheet: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <OldFilm f={f}>
      <rect width={1080} height={1920} fill={K.paper} />
      <Lbl x={60} y={120} t="Yunus & Merve · 1930'lar stili" s={70} />
      {/* yüzler */}
      {(
        [
          ["yunus", "grin", false, false, "güler"],
          ["yunus", "smirk", false, false, "şüpheci"],
          ["merve", "smile", true, false, "göz kırpar"],
          ["merve", "kiss", false, true, "öpücük"],
        ] as const
      ).map(([w, fc, wk, hp, n], i) => (
        <g key={i}>
          <rect x={30 + i * 258} y={170} width={246} height={300} rx={18} fill="#f6ecd4" stroke={K.ink} strokeWidth={5} />
          <svg x={30 + i * 258} y={170} width={246} height={300} viewBox="-150 -656 300 366">
            <HoseChar x={0} y={0} who={w} face={fc} wink={wk} happyEyes={hp} look={fc === "smirk" ? [0.8, 0] : [0, 0]} tilt={fc === "smirk" ? -6 : 0} beret={w === "merve"} />
          </svg>
          <Lbl x={56 + i * 258} y={515} t={n} s={40} />
        </g>
      ))}
      {/* tam boy */}
      <HoseChar x={300} y={1500} s={1.35} who="yunus" face="grin" armL={[-90, 120, 50]} armR={[120, -120, -70]} handR="open" />
      <HoseChar x={780} y={1500} s={1.35} who="merve" face="smile" wink beret armL={[-110, -110, 70]} armR={[70, 140, -40]} handL="point" />
      <Lbl x={210} y={1640} t="Yunus" s={56} />
      <Lbl x={700} y={1640} t="Merve" s={56} />
      <Lbl x={70} y={1760} t="lastik kollar · beyaz eldiven · pasta dilimi göz" s={40} />
      <Lbl x={70} y={1820} t="ritimle zıplar · eski film greni" s={40} />
    </OldFilm>
  );
};

/* ---------- 2) klip: perde açılır, ikisi ritimle zıplar, el sallar, göz kırpar ---------- */

export const HoseClip: React.FC = () => {
  const f = useCurrentFrame();
  const q = Math.floor(f / 2) * 2; // animasyon "ikişer kare" (12 fps hissi)
  const beat = 16; // ~112 vuruş/dk
  const bounce = Math.abs(Math.sin((q * Math.PI) / beat));
  const bounce2 = Math.abs(Math.sin(((q + 4) * Math.PI) / beat));
  const iris = interpolate(f, [0, 18, 220, 240], [0, 1, 1, 0.06], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  // oyunculuk
  const wave = q >= 30 && q < 100 ? Math.sin(q / 3) : 0;
  const lookEach = q >= 120 && q < 160;
  const wink = q >= 100 && q < 118;
  const blinkY = (q >= 70 && q < 74) || (q >= 176 && q < 180);
  const banner = interpolate(f, [170, 186, 192, 198], [-900, 40, -10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cheer = q >= 186;
  return (
    <OldFilm f={f} iris={iris}>
      <Stage f={q} />
      <HoseChar
        x={290}
        y={1650}
        s={1.55}
        who="yunus"
        bounce={bounce}
        face={cheer ? "grin" : lookEach ? "smirk" : "smile"}
        look={lookEach ? [1, 0] : [0, 0]}
        blink={blinkY}
        armL={cheer ? [-70, -170, 30] : wave ? [-120 - wave * 25, -120 - wave * 10, 60 + wave * 30] : [-90, 130, 50]}
        armR={[70, 150, -40]}
        handL={cheer ? "fist" : "open"}
        tilt={lookEach ? 6 : wave * 4}
      />
      <HoseChar
        x={790}
        y={1650}
        s={1.55}
        who="merve"
        beret
        bounce={bounce2}
        face={cheer ? "grin" : wink ? "smile" : lookEach ? "smile" : "smile"}
        wink={wink}
        look={lookEach ? [-1, 0] : [0, 0]}
        happyEyes={cheer}
        armL={[-70, 150, 40]}
        armR={cheer ? [70, -170, -30] : wink ? [100, -100, -70] : [80, 120, -50]}
        handR={wink ? "point" : cheer ? "fist" : "open"}
        tilt={lookEach ? -6 : 0}
      />
      {/* tabela iner: "VOOM sunar" */}
      <g transform={`translate(540 ${banner - 120}) scale(1.35) translate(-540 0)`}>
        <path d="M540 0 L540 230" stroke={K.ink} strokeWidth={5} />
        <rect x={250} y={230} width={580} height={170} rx={30} fill="#f6ecd4" stroke={K.ink} strokeWidth={8} />
        <rect x={266} y={246} width={548} height={138} rx={22} fill="none" stroke={K.ink} strokeWidth={3} />
        <text x={540} y={345} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={96} fill={K.red} stroke={K.ink} strokeWidth={4} letterSpacing={6}>
          VOOM
        </text>
        <text x={540} y={380} textAnchor="middle" fontFamily={handFamily} fontSize={34} fill={K.ink}>
          sunar
        </text>
      </g>
    </OldFilm>
  );
};
