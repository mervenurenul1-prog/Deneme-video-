// 1930'lar çizgi film stili ("rubber hose"): lastik gibi bükülen kollar/bacaklar, beyaz eldiven, pasta dilimi gözler,
// ritimle zıplama, eski film efekti (gren, titreşim, çizik, "ikişer kare" hareket, iris geçişi).
// Karakterler kullanıcının gönderdiği sayfadaki ikiliye benzer: Yunus (şapka, kıvırcık saç, kirli sakal, kapüşonlu + ceket)
// ve Duru (uzun dalgalı saç, kâkül, halka küpe, kırmızı bere).
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

type HoseArm = [number, number, number];
type HandKind = "open" | "fist" | "point" | "thumb"; // el hedefi (omuza göre x, y) + büküm
export type HoseFace = "smile" | "grin" | "o" | "smirk" | "kiss" | "talk" | "sad";

const rnd = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

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
const Glove: React.FC<{ x: number; y: number; r?: number; side: number; kind?: HandKind }> = ({ x, y, r = 0, side, kind = "open" }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${side} 1)`} stroke={K.ink} strokeWidth={5} strokeLinejoin="round">
    <path d="M-16 18 Q-22 30 -14 38 L14 38 Q22 30 16 18 Z" fill={K.white} />
    {kind === "fist" || kind === "thumb" ? (
      <>
        <path d="M-26 -4 Q-30 -32 0 -34 Q30 -32 26 -4 Q26 18 0 20 Q-26 18 -26 -4 Z" fill={K.white} />
        <path d="M-14 -30 q8 -6 14 0 M2 -32 q8 -6 14 0" fill="none" strokeWidth={3} />
        {kind === "thumb" ? <path d="M20 -24 Q22 -70 36 -68 Q48 -66 40 -24 Z" fill={K.white} /> : null}
      </>
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
const PieEye: React.FC<{ x: number; y: number; look: [number, number]; closed?: boolean; happy?: boolean; lashes?: boolean; side: number; lid?: number; big?: number; uid: string }> = ({ x, y, look, closed, happy, lashes, side, lid = 0, big = 1, uid }) => {
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
  const cid = `pe${uid}${side > 0 ? "r" : "l"}`;
  return (
    <g transform={`translate(${x} ${y}) scale(${big}) translate(${-x} ${-y})`}>
      <clipPath id={cid}>
        <ellipse cx={x} cy={y} rx={17} ry={27} />
      </clipPath>
      <ellipse cx={x} cy={y} rx={17} ry={27} fill={K.white} stroke={K.ink} strokeWidth={5} />
      <g clipPath={`url(#${cid})`}>
        <ellipse cx={px} cy={py} rx={9} ry={16} fill={K.ink} />
        <path d={`M${px} ${py - 4} L${px + 5} ${py - 17} L${px + 10} ${py - 9} Z`} fill={K.white} />
        {lid > 0 ? <rect x={x - 20} y={y - 30} width={40} height={lid * 40} fill={K.skin} /> : null}
      </g>
      {lid > 0 ? <path d={`M${x - 18} ${y - 27 + lid * 40} L${x + 18} ${y - 27 + lid * 40}`} stroke={K.ink} strokeWidth={6} strokeLinecap="round" /> : null}
      {lashes ? (
        <path d={`M${x + side * 10} ${y - 22} l${side * 10} -12 M${x + side * 16} ${y - 12} l${side * 13} -7 M${x + side * 2} ${y - 27} l${side * 4} -13`} stroke={K.ink} strokeWidth={5} strokeLinecap="round" />
      ) : null}
    </g>
  );
};

const Mouth: React.FC<{ y: number; face: HoseFace; w?: number; girl?: boolean; open?: number }> = ({ y, face, w = 44, girl, open = 0 }) => {
  if (face === "talk") {
    const o = 6 + open * 30;
    const ww = 30 + open * 10;
    return (
      <g stroke={K.ink} strokeWidth={5} strokeLinejoin="round">
        <path d={`M${-ww / 2} ${y - 4} Q0 ${y - 10} ${ww / 2} ${y - 4} Q${ww / 2} ${y + o} 0 ${y + o} Q${-ww / 2} ${y + o} ${-ww / 2} ${y - 4} Z`} fill="#4a1512" />
        {open > 0.35 ? <path d={`M${-ww * 0.25} ${y + o * 0.7} Q0 ${y + o * 0.4} ${ww * 0.25} ${y + o * 0.7} Q0 ${y + o + 1} ${-ww * 0.25} ${y + o * 0.7} Z`} fill={K.tongue} strokeWidth={3} /> : null}
        {girl ? <path d={`M${-ww / 2} ${y - 4} Q0 ${y - 12} ${ww / 2} ${y - 4}`} stroke={K.red} strokeWidth={6} fill="none" /> : null}
      </g>
    );
  }
  if (face === "kiss") {
    return (
      <g stroke={K.ink} strokeWidth={4}>
        <path d={`M-12 ${y} Q-14 ${y - 12} -2 ${y - 9} Q0 ${y - 12} 2 ${y - 9} Q14 ${y - 12} 12 ${y} Q0 ${y + 12} -12 ${y} Z`} fill={K.red} />
      </g>
    );
  }
  if (face === "sad") {
    return <path d={`M${-w * 0.4} ${y + 12} Q0 ${y - 8} ${w * 0.4} ${y + 12}`} stroke={K.ink} strokeWidth={6} fill="none" strokeLinecap="round" />;
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

export type HoseGesture = "rest" | "wave" | "point" | "explain" | "think" | "hips" | "shrug" | "thumbs" | "cheer" | "facepalm";

// Jest kütüphanesi (sağ kol için; "L" verilirse aynalanır). [x, y, büküm] omuza göre el hedefi.
const GEST: Record<HoseGesture, { a?: HoseArm; b?: HoseArm; ha?: HandKind; hb?: HandKind }> = {
  rest: {},
  wave: { a: [120, -120, -60], ha: "open" },
  point: { a: [165, -30, -20], ha: "point" },
  explain: { a: [110, 30, -60], ha: "open" },
  think: { a: [-40, -30, 90], ha: "fist" },
  hips: { a: [10, 170, -100], b: [10, 170, -100], ha: "fist", hb: "fist" },
  shrug: { a: [110, 30, 60], b: [110, 30, 60], ha: "open", hb: "open" },
  thumbs: { a: [80, -60, -70], ha: "thumb" },
  cheer: { a: [70, -170, -30], b: [70, -170, -30], ha: "fist", hb: "fist" },
  facepalm: { a: [-50, -90, 60], ha: "open" },
};
const REST: HoseArm = [70, 150, -40];
const mirror = (a: HoseArm): HoseArm => [-a[0], a[1], -a[2]];
const mix = (a: HoseArm, b: HoseArm, t: number): HoseArm => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Jest zamanlaması: hazırlık (hafif geri) → hızlı çıkış + taşma → tutma → yumuşak dönüş
export const gestureT = (f: number, start: number, end: number, rise = 9) => {
  if (f < start - 3 || f > end + rise) return 0;
  if (f < start) return -0.12 * ((f - (start - 3)) / 3); // hazırlık
  if (f < start + rise) return interpolate(f, [start, start + rise], [0, 1], { easing: Easing.out(Easing.back(2.2)) });
  if (f <= end) return 1;
  return interpolate(f, [end, end + rise], [1, 0], { easing: Easing.inOut(Easing.quad) });
};

const blinkAt = (f: number, seed: number) => {
  let t = 18 + (seed % 23);
  let i = 0;
  while (t < f + 12) {
    const dbl = (i * 7 + seed) % 5 === 0; // ara sıra çift kırpma
    if ((f >= t && f < t + 4) || (dbl && f >= t + 8 && f < t + 12)) return true;
    i++;
    t += 62 + ((i * 41 + seed * 17) % 80);
  }
  return false;
};
// gözler kendi kendine etrafa kayar (1,5–3 sn'de bir), yumuşak geçişle
const saccade = (f: number, seed: number): [number, number] => {
  const step = 48 + (seed % 5) * 9;
  const k = Math.floor(f / step);
  const t = Math.min(1, (f - k * step) / 4);
  const at = (n: number): [number, number] => [(rnd(n * 3.1 + seed) - 0.5) * 0.7, (rnd(n * 5.7 + seed) - 0.5) * 0.4];
  const p0 = at(k - 1);
  const p1 = at(k);
  return [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
};

export type HoseCharProps = {
  x: number;
  y: number;
  s?: number;
  who: "yunus" | "duru" | "doktor" | "arkadas";
  face?: HoseFace;
  look?: [number, number];
  wink?: boolean;
  happyEyes?: boolean;
  armL?: HoseArm;
  armR?: HoseArm;
  handL?: HandKind;
  handR?: HandKind;
  bounce?: number; // verilirse ritimle zıplar (0 = yere değer); verilmezse doğal duruş
  tilt?: number;
  blink?: boolean;
  beret?: boolean;
  // insansı davranışlar
  live?: boolean; // kendiliğinden göz kırpma, etrafa bakma, nefes, ağırlık aktarma, saç gecikmesi
  talk?: number; // 0..1 konuşma (ağız sesle oynar, vurguda baş sallanır, kaş kalkar)
  gesture?: HoseGesture;
  gT?: number; // jest ilerlemesi (gestureT)
  gSide?: "L" | "R"; // tek kollu jest hangi kolla
  lid?: number; // yarım kapak 0..1 (şüphe)
  surprise?: number; // 0..1: gözler büyür, ağız O, şapka/bere havalanır, sıçrar
  laugh?: number; // 0..1: kahkahayla sarsılır
  nod?: number; // 0..1: dinlerken onaylayarak baş sallama
  hairColor?: string;
  seed?: number;
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
  armL,
  armR,
  handL,
  handR,
  bounce: bounceIn,
  tilt = 0,
  blink: blinkIn = false,
  beret = false,
  live = true,
  talk = 0,
  gesture = "rest",
  gT = 0,
  gSide = "R",
  lid = 0,
  surprise = 0,
  laugh = 0,
  nod = 0,
  seed = 3,
  hairColor,
}) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fr = useCurrentFrame();
  const q = Math.floor(fr / 2) * 2; // ikişer kare
  const girl = who === "duru" || who === "arkadas";
  const doc = who === "doktor"; // safari şapkalı, gözlüklü, bıyıklı yan karakter (gerçek kişi değil)
  const hairC = hairColor ?? (who === "arkadas" ? "#c98f3a" : K.mHair);
  const teeC = who === "arkadas" ? "#e8a0ae" : K.tee;
  const legC = doc ? "#a8864f" : K.jeans;
  const jackC = doc ? "#b8955c" : K.jacket;
  const hoodC = doc ? "#d4b47c" : K.hood;
  const idle = bounceIn === undefined;
  const bounce = (bounceIn ?? 0) + surprise * 0.9;

  // kendiliğinden canlılık
  const blink = blinkIn || (live && surprise < 0.3 && blinkAt(q, seed));
  const sac = live ? saccade(q, seed) : [0, 0];
  const lk: [number, number] = [look[0] + sac[0] * (1 - surprise), look[1] + sac[1] * (1 - surprise)];
  const breath = live ? Math.sin(q / 24 + seed) : 0;
  const sway = live && idle ? Math.sin(q / 71 + seed) : 0;
  // konuşma: ağız açıklığı hece ritminde, vurgularda baş sallanır, ara ara kaş kalkar
  const flap = talk > 0 ? Math.min(1, Math.abs(Math.sin(q / 2.3 + seed)) * (0.45 + 0.55 * Math.abs(Math.sin(q / 5.3 + seed * 2))) * 1.5) * talk : 0;
  const talkNod = talk * 4 * Math.sin(q / 7.5 + seed);
  const listenNod = nod * 6 * Math.max(0, Math.sin(q / 9 + seed));
  const shake = laugh * 5 * Math.sin(fr * 1.7);
  const headRot = (live && idle ? 2 * Math.sin(q / 53 + seed * 2) : 0) + talk * 2.5 * Math.sin(q / 13 + seed) + laugh * 6;
  const hairLag = (live && idle ? 2 * Math.sin((q - 8) / 53 + seed * 2) : 0) + laugh * 3 * Math.sin((fr - 3) * 1.7);

  // kollar: jest ↔ duruş karışımı (taşmalı)
  const G = GEST[gesture];
  const t = gT;
  let aR = armR ?? REST;
  let aL = armL ?? mirror(REST);
  let hR: HandKind = handR ?? "open";
  let hL: HandKind = handL ?? "open";
  if (gesture !== "rest" && G.a) {
    let ga = G.a;
    if (gesture === "wave") ga = [ga[0] + 24 * Math.sin(q / 3), ga[1] - 8 * Math.sin(q / 3), ga[2] - 30 * Math.sin(q / 3)];
    const one = gSide === "R";
    if (one || G.b) aR = mix(aR, ga, t);
    if (!one || G.b) aL = mix(aL, mirror(G.b && one ? G.b : ga), t);
    if (t > 0.5) {
      if (one || G.b) hR = G.ha ?? hR;
      if (!one || G.b) hL = (G.b ? G.hb : G.ha) ?? hL;
    }
  }
  // omuz silkme: omuzlar ve baş yukarı
  const shrugUp = gesture === "shrug" ? 14 * t : 0;
  // nefes + ağırlık aktarma: kollar hafif sallanır
  aR = [aR[0] + sway * 4, aR[1] + breath * 3, aR[2]];
  aL = [aL[0] + sway * 4, aL[1] + breath * 3, aL[2]];

  const tiltAll = tilt + headRot + (gesture === "shrug" ? 8 * t : 0) + (gesture === "think" ? -6 * t : 0);
  let faceUse: HoseFace = face;
  if (talk > 0 && flap > 0.12) faceUse = "talk";
  if (laugh > 0.3) faceUse = "grin";
  if (surprise > 0.4) faceUse = "o";
  const happy = happyEyes || laugh > 0.3;
  const lidUse = Math.max(lid, gesture === "think" ? 0.35 * t : 0);
  const browUp = talk > 0 && Math.sin(q / 23 + seed) > 0.7 ? 1 : 0;

  // ezilip-uzama: yere değerken basık ve geniş, havadayken ince ve uzun
  const lift = bounce * 26 + shake * 0.6;
  const sq = 1 - (1 - Math.min(1, bounce)) * (idle ? 0.01 : 0.06) + bounce * 0.04 + breath * 0.008;
  const sx = 2 - sq;
  const shY = -390;
  const shL = [-62, shY + 14 - shrugUp];
  const shR = [62, shY + 14 - shrugUp];
  const hipY = -196;
  const knee = (idle ? 6 : (1 - Math.min(1, bounce)) * 26) + sway * 4; // basınca dizler dışa kıvrılır
  const headY = -496;
  const headDy = -lift * 1.15 - shrugUp * 0.7 + listenNod + talkNod * 0.5;
  const hatPop = surprise * 70;

  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={4} rx={120 - bounce * 30} ry={16} fill={K.ink} opacity={0.3} />
      <g transform={`translate(${sway * 5} ${-lift}) rotate(${sway * 1.5} 0 0) scale(${sx} ${sq})`}>
        {/* bacaklar */}
        {[-1, 1].map((sd) => (
          <g key={sd}>
            <Hose s={[sd * 34, hipY]} e={[sd * 46, -26]} bend={-sd * (knee + 6)} w={30} color={legC} />
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
            <path d={`M-58 ${shY} Q-84 -260 -60 ${hipY} Q0 ${hipY + 26} 60 ${hipY} Q84 -260 58 ${shY} Q0 ${shY - 20} -58 ${shY} Z`} fill={teeC} />
            <path d={`M-58 ${shY} Q-84 -260 -60 ${hipY} L-26 ${hipY + 6} Q-36 -300 -20 ${shY - 8} Z`} fill={K.jacket} />
            <path d={`M58 ${shY} Q84 -260 60 ${hipY} L26 ${hipY + 6} Q36 -300 20 ${shY - 8} Z`} fill={K.jacket} />
            <path d={`M-60 ${hipY - 6} Q0 ${hipY + 16} 60 ${hipY - 6}`} fill="none" stroke={K.ink} strokeWidth={8} />
          </g>
        ) : (
          <g stroke={K.ink} strokeWidth={6} strokeLinejoin="round">
            <path d={`M-62 ${shY} Q-92 -260 -66 ${hipY} Q0 ${hipY + 26} 66 ${hipY} Q92 -260 62 ${shY} Q0 ${shY - 20} -62 ${shY} Z`} fill={hoodC} />
            <path d={`M-62 ${shY} Q-92 -260 -66 ${hipY} L-28 ${hipY + 8} Q-40 -300 -24 ${shY - 8} Z`} fill={jackC} />
            <path d={`M62 ${shY} Q92 -260 66 ${hipY} L28 ${hipY + 8} Q40 -300 24 ${shY - 8} Z`} fill={jackC} />
            {/* kapüşon ipleri (doktorda cep + düğmeler) */}
            {doc ? (
              <g>
                <path d={`M0 ${shY + 6} L0 ${hipY}`} stroke={K.ink} strokeWidth={3} />
                {[0, 1, 2].map((k) => <circle key={k} cx={6} cy={shY + 40 + k * 50} r={4} fill={K.ink} />)}
              </g>
            ) : null}
            <path opacity={doc ? 0 : 1} d={`M-10 ${shY + 4} q-3 40 0 70 M10 ${shY + 4} q3 40 0 66`} stroke={K.white} strokeWidth={5} fill="none" strokeLinecap="round" />
            <path d={`M-10 ${shY + 4} q-3 40 0 70 M10 ${shY + 4} q3 40 0 66`} stroke={K.ink} strokeWidth={1.5} fill="none" />
          </g>
        )}
        {/* kollar + eldivenler */}
        {[
          [shL, aL, hL, -1],
          [shR, aR, hR, 1],
        ].map(([sh, a, hk, sd], i) => {
          const shp = sh as number[];
          const ar = a as HoseArm;
          const side = sd as number;
          void hk;
          const e = [shp[0] + ar[0], shp[1] + ar[1]];
          const ang = (Math.atan2(ar[1], ar[0]) * 180) / Math.PI - 90;
          return (
            <g key={i}>
              <Hose s={shp} e={e} bend={ar[2]} w={26} color={jackC} />
              <Glove x={e[0]} y={e[1]} r={ang} side={-side} kind={(i ? hR : hL) as HandKind} />
            </g>
          );
        })}
      </g>

      {/* baş (gövdeden biraz gecikmeli zıplar) */}
      <g transform={`translate(${sway * 6} ${headDy}) rotate(${tiltAll} 0 ${headY + 90})`}>
        {girl ? (
          // arka saç: uzun, uçları kıvrık; başın hareketini gecikmeyle izler
          <path
            transform={`rotate(${hairLag - headRot * 0.6} 0 ${headY})`}
            d={`M-96 ${headY - 20} Q-120 ${headY + 120} -96 ${headY + 200} Q-70 ${headY + 230} -60 ${headY + 196} Q-40 ${headY + 230} -16 ${headY + 200} L16 ${headY + 200} Q40 ${headY + 230} 60 ${headY + 196} Q70 ${headY + 230} 96 ${headY + 200} Q120 ${headY + 120} 96 ${headY - 20} Z`}
            fill={hairC}
            stroke={K.ink}
            strokeWidth={6}
          />
        ) : (
          // kıvırcık saç: şapkanın altından iki yana taşan bukleler (doktorda kısa kır saç)
          <g fill={doc ? "#9a948c" : K.hair} stroke={K.ink} strokeWidth={5} opacity={doc ? 0.9 : 1} transform={doc ? "scale(0.85 0.6) translate(0 -330)" : undefined}>
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
        {doc ? (
          <path d={`M-40 ${headY + 34} Q-20 ${headY + 22} 0 ${headY + 30} Q20 ${headY + 22} 40 ${headY + 34} Q20 ${headY + 46} 0 ${headY + 38} Q-20 ${headY + 46} -40 ${headY + 34} Z`} fill="#6b4a30" stroke={K.ink} strokeWidth={4} />
        ) : null}
        {!girl && !doc ? (
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
        <PieEye x={-32} y={headY - 18} look={lk} closed={blink} happy={happy} lashes={girl} side={-1} lid={lidUse} big={1 + surprise * 0.25} uid={id} />
        <PieEye x={32} y={headY - 18} look={lk} closed={blink || wink} happy={happy} lashes={girl} side={1} lid={lidUse * 0.6} big={1 + surprise * 0.25} uid={id} />
        {/* kaşlar */}
        {doc ? (
          <g fill="none" stroke={K.ink} strokeWidth={6}>
            <circle cx={-32} cy={headY - 18} r={30} />
            <circle cx={32} cy={headY - 18} r={30} />
            <path d={`M-2 ${headY - 22} L2 ${headY - 22} M-62 ${headY - 24} L-96 ${headY - 10} M62 ${headY - 24} L96 ${headY - 10}`} />
          </g>
        ) : null}
        {girl ? (
          <path d={`M-48 ${headY - 58 - browUp * 6 - surprise * 14} q16 -10 32 -2 M16 ${headY - 60 - browUp * 6 - surprise * 14} q16 -8 32 2`} stroke={K.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
        ) : null}
        {/* burun */}
        <ellipse cx={0} cy={headY + 14} rx={girl ? 9 : 14} ry={girl ? 7 : 11} fill={girl ? K.skinD : "#c98b66"} stroke={K.ink} strokeWidth={4} />
        <ellipse cx={-3} cy={headY + 10} rx={4} ry={3} fill="#fff" opacity={0.7} />
        <Mouth y={headY + 46} face={faceUse} girl={girl} open={flap} />
        {/* üst saç / şapka */}
        {girl ? (
          <g stroke={K.ink} strokeWidth={6} strokeLinejoin="round">
            {/* tepe + perdeli kâkül (dalgalı kenar) */}
            <path d={`M-104 ${headY - 6} Q-110 ${headY - 112} 0 ${headY - 112} Q110 ${headY - 112} 104 ${headY - 6} Q92 ${headY - 40} 70 ${headY - 52} Q58 ${headY - 40} 40 ${headY - 58} Q22 ${headY - 46} 4 ${headY - 70} Q-16 ${headY - 46} -36 ${headY - 58} Q-56 ${headY - 40} -70 ${headY - 52} Q-92 ${headY - 40} -104 ${headY - 6} Z`} fill={hairC} />
            <path d={`M-40 ${headY - 96} Q-60 ${headY - 70} -64 ${headY - 56} M40 ${headY - 96} Q60 ${headY - 70} 64 ${headY - 56}`} stroke="#8a5a3a" strokeWidth={5} fill="none" />
            {beret ? (
              <g transform={`translate(0 ${-hatPop}) rotate(${-12 + surprise * 18} 0 ${headY - 110})`}>
                <ellipse cx={-10} cy={headY - 112} rx={92} ry={34} fill={K.red} />
                <path d={`M-96 ${headY - 104} Q-10 ${headY - 80} 76 ${headY - 104}`} fill="none" stroke="#7a1414" strokeWidth={6} />
                <path d={`M-12 ${headY - 146} l0 -16`} strokeWidth={8} strokeLinecap="round" />
                <path d={`M-60 ${headY - 128} Q-30 ${headY - 140} 10 ${headY - 136}`} stroke="#e56a5f" strokeWidth={6} fill="none" strokeLinecap="round" />
              </g>
            ) : null}
          </g>
        ) : (
          doc ? (
          <g stroke={K.ink} strokeWidth={6} strokeLinejoin="round" transform={`translate(0 ${-hatPop}) rotate(${surprise * -10} 0 ${headY - 40})`}>
            <ellipse cx={0} cy={headY - 50} rx={136} ry={30} fill="#e2cf9c" />
            <path d={`M-96 ${headY - 54} Q-100 ${headY - 160} 0 ${headY - 162} Q100 ${headY - 160} 96 ${headY - 54} Z`} fill="#eadbb0" />
            <path d={`M-96 ${headY - 70} Q0 ${headY - 90} 96 ${headY - 70} L96 ${headY - 54} Q0 ${headY - 74} -96 ${headY - 54} Z`} fill="#7a5a32" />
            <circle cx={0} cy={headY - 162} r={8} fill="#eadbb0" />
          </g>
          ) : (
          <g stroke={K.ink} strokeWidth={6} strokeLinejoin="round" transform={`translate(0 ${-hatPop}) rotate(${surprise * -10} 0 ${headY - 40})`}>
            <path d={`M-98 ${headY - 44} Q-102 ${headY - 136} 0 ${headY - 138} Q102 ${headY - 136} 98 ${headY - 44} Z`} fill={K.cap} />
            <path d={`M0 ${headY - 138} L0 ${headY - 46} M-48 ${headY - 128} Q-60 ${headY - 90} -56 ${headY - 46} M48 ${headY - 128} Q60 ${headY - 90} 56 ${headY - 46}`} stroke="#3a3634" strokeWidth={3} fill="none" />
            <circle cx={0} cy={headY - 138} r={8} fill={K.cap} />
            <path d={`M-84 ${headY - 120} Q-60 ${headY - 140} -24 ${headY - 136}`} stroke="#6a6462" strokeWidth={6} fill="none" strokeLinecap="round" />
            {/* siperlik */}
            <path d={`M-110 ${headY - 46} Q0 ${headY - 74} 110 ${headY - 46} Q100 ${headY - 16} 0 ${headY - 20} Q-100 ${headY - 16} -110 ${headY - 46} Z`} fill={K.cap} />
          </g>
          )
        )}
      </g>
    </g>
  );
};

/* ---------- eski film katmanı ---------- */


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
      <Lbl x={60} y={120} t="Yunus & Duru · 1930'lar stili" s={70} />
      {/* yüzler */}
      {(
        [
          ["yunus", "grin", false, false, "güler"],
          ["yunus", "smirk", false, false, "şüpheci"],
          ["duru", "smile", true, false, "göz kırpar"],
          ["duru", "kiss", false, true, "öpücük"],
        ] as const
      ).map(([w, fc, wk, hp, n], i) => (
        <g key={i}>
          <rect x={30 + i * 258} y={170} width={246} height={300} rx={18} fill="#f6ecd4" stroke={K.ink} strokeWidth={5} />
          <svg x={30 + i * 258} y={170} width={246} height={300} viewBox="-150 -656 300 366">
            <HoseChar x={0} y={0} who={w} face={fc} wink={wk} happyEyes={hp} look={fc === "smirk" ? [0.8, 0] : [0, 0]} tilt={fc === "smirk" ? -6 : 0} beret={w === "duru"} />
          </svg>
          <Lbl x={56 + i * 258} y={515} t={n} s={40} />
        </g>
      ))}
      {/* tam boy */}
      <HoseChar x={300} y={1500} s={1.35} who="yunus" face="grin" armL={[-90, 120, 50]} armR={[120, -120, -70]} handR="open" />
      <HoseChar x={780} y={1500} s={1.35} who="duru" face="smile" wink beret armL={[-110, -110, 70]} armR={[70, 140, -40]} handL="point" />
      <Lbl x={210} y={1640} t="Yunus" s={56} />
      <Lbl x={700} y={1640} t="Duru" s={56} />
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
        who="duru"
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

/* ---------- 3) davranış denemesi: sessiz sohbet (konuşma, dinleme, şaşırma, gülme, jestler) ---------- */

const on = (f: number, a: number, b: number) => (f >= a && f < b ? 1 : 0);
const ramp = (f: number, a: number, b: number, len = 6) =>
  interpolate(f, [a - len, a, b, b + len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const HoseBehave: React.FC = () => {
  const f = useCurrentFrame();
  const q = Math.floor(f / 2) * 2;
  const iris = interpolate(f, [0, 18, 342, 360], [0, 1, 1, 0.06], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });

  // Yunus: anlatır (24–100) → omuz silker (160–205) → düşünür (220–268) → başparmak (278–318) → el sallar (325–350)
  const yTalk = on(q, 24, 100) + on(q, 160, 200) * 0.6;
  const yG =
    q < 110 ? { g: "explain" as const, t: gestureT(q, 30, 96) } :
    q < 215 ? { g: "shrug" as const, t: gestureT(q, 160, 200) } :
    q < 274 ? { g: "think" as const, t: gestureT(q, 222, 264) } :
    q < 322 ? { g: "thumbs" as const, t: gestureT(q, 280, 314) } :
    { g: "wave" as const, t: gestureT(q, 326, 352) };
  // Duru: dinler + başını sallar (24–100) → şaşırır (112–140) → güler (148–196) → anlatıp işaret eder (214–266) → eller belde (278–318) → el sallar
  const dSurp = ramp(q, 114, 136, 5);
  const dLaugh = ramp(q, 148, 192, 6);
  const dTalk = on(q, 214, 266);
  const dG =
    q < 272 ? { g: "point" as const, t: gestureT(q, 220, 262) } :
    q < 322 ? { g: "hips" as const, t: gestureT(q, 280, 316) } :
    { g: "wave" as const, t: gestureT(q, 330, 352) };
  const toCam = q >= 274;

  // kamera: konuşana doğru yavaşça kayar, şaşkınlıkta küçük yakınlaşma
  const camX = interpolate(q, [0, 100, 140, 210, 270, 360], [0, -40, 50, 20, 40, 0], { extrapolateRight: "clamp" });
  const camZ = 1 + 0.06 * ramp(q, 114, 140, 8) + 0.03 * Math.sin(q / 90);

  return (
    <OldFilm f={f} iris={iris}>
      <g transform={`translate(540 1100) scale(${camZ}) translate(${-540 + camX} -1100)`}>
        <Stage f={q} />
        <HoseChar
          x={275}
          y={1650}
          s={1.55}
          who="yunus"
          seed={4}
          talk={yTalk}
          gesture={yG.g}
          gT={yG.t}
          gSide={yG.g === "wave" ? "L" : "R"}
          face={q >= 160 && q < 215 ? "smirk" : q >= 278 ? "grin" : "smile"}
          look={toCam ? [0, 0] : yG.g === "think" ? [0.4, -0.8] : [1, 0]}
          nod={on(q, 214, 266) * 0.8}
        />
        <HoseChar
          x={810}
          y={1650}
          s={1.55}
          who="duru"
          beret
          seed={9}
          talk={dTalk}
          gesture={dG.g}
          gT={dG.t}
          gSide={dG.g === "point" ? "L" : "R"}
          surprise={dSurp}
          laugh={dLaugh}
          face={toCam ? "smile" : "smile"}
          look={toCam ? [0, 0] : [-1, 0]}
          nod={on(q, 30, 100)}
          wink={on(q, 300, 312) === 1}
        />
      </g>
    </OldFilm>
  );
};
