// Kadın karakter (Merve) — referans: kullanıcının gönderdiği karakter sayfasındaki kız
// (uzun kahverengi dalgalı saç, perdeli kâkül, halka küpe, beyaz tişört + siyah deri ceket, kot; isteğe bağlı kırmızı bere).
// Hero ile aynı ölçek ve koordinat düzeni: ayak tabanı (0,0), yukarı eksi.
import React, { useId } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { handFamily } from "../fonts";

const M = {
  ink: "#24170f",
  skinL: "#f6d2b4",
  skin: "#e9b791",
  skinD: "#c38e6a",
  lip: "#b65a52",
  lipD: "#8e3f3a",
  hair: "#4e2e1e",
  hairL: "#8a5a3a",
  hairD: "#2e1a10",
  jacket: "#1f1b1a",
  jacketL: "#4a4240",
  tee: "#f3efe7",
  teeD: "#d6cfc2",
  jeans: "#4a6288",
  jeansL: "#6e86ad",
  beret: "#a3262a",
  beretL: "#c9453f",
  hoop: "#d9dcdf",
  top: "#1d1d20",
  leg: "#2f3036",
  shoe: "#ece6da",
  iris: "#6b4428",
  rim: "#ffcf8a",
};

export type MerveMouth = "soft" | "smile" | "grin" | "kiss" | "talk";
export type MerveOutfit = "sokak" | "salon";
type Arm = [number, number];

export type MerveProps = {
  x: number;
  y: number;
  s?: number;
  mouth?: MerveMouth;
  talk?: number;
  brow?: "calm" | "up" | "skeptic";
  look?: [number, number];
  wink?: boolean;
  tilt?: number;
  armL?: Arm;
  armR?: Arm;
  outfit?: MerveOutfit;
  beret?: boolean;
  rim?: number;
  live?: boolean;
  seed?: number;
};

const pt = (p: number[]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
const dir = (side: number, deg: number) => {
  const r = (deg * Math.PI) / 180;
  return [side * Math.sin(r), Math.cos(r)];
};
const arm = (side: number, [a1, a2]: Arm, sh: number[]) => {
  const e1 = dir(side, a1);
  const e = [sh[0] + e1[0] * 140, sh[1] + e1[1] * 140];
  const h1 = dir(side, a1 + a2);
  return [sh, e, [e[0] + h1[0] * 128, e[1] + h1[1] * 128]];
};
const blinkAt = (f: number, seed: number) => {
  let t = 30 + (seed % 19);
  let i = 0;
  while (t < f + 10) {
    if (f >= t && f < t + 4) return true;
    i++;
    t += 64 + ((i * 41 + seed * 11) % 74);
  }
  return false;
};

export const Merve: React.FC<MerveProps> = ({
  x,
  y,
  s = 1,
  mouth = "soft",
  talk = 0,
  brow = "calm",
  look = [0, 0],
  wink = false,
  tilt = 0,
  armL = [10, -6],
  armR = [10, -6],
  outfit = "sokak",
  beret = false,
  rim = 0.6,
  live = true,
  seed = 7,
}) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const f = useCurrentFrame();
  const breath = live ? Math.sin(f / 27 + 1) : 0;
  const sway = live ? Math.sin(f / 58 + seed) : 0;
  const headX = live ? 1.5 * Math.sin(f / 44 + seed) + 0.7 * Math.sin(f / 17) : 0;
  const headR = live ? 1.2 * Math.sin(f / 51 + seed) : 0;
  const hairSw = live ? Math.sin(f / 33 + seed) : 0;
  const blink = live && blinkAt(f, seed);
  const lx = look[0] * 5;
  const ly = look[1] * 3;
  const sokak = outfit === "sokak";
  const bun = !sokak; // salonda saç topuz

  const shY = -588 - breath * 2;
  const aL = arm(-1, armL, [-96, shY + 10]);
  const aR = arm(1, armR, [96, shY + 10]);
  const hip = -385;
  const legs = [
    [[-40, hip], [-44 + sway * 2, -200], [-46, -30]],
    [[40, hip], [44 - sway * 3, -200], [46, -30]],
  ];
  const g = (n: string) => `url(#${n}${id})`;
  const faceD = "M-44 -776 C-52 -750 -53 -722 -51 -700 C-49 -676 -38 -652 -20 -638 Q0 -628 20 -638 C38 -652 49 -676 51 -700 C53 -722 52 -750 44 -776 Z";

  const limb = (p: number[][], w: number, color: string, light: string, w2?: number) => {
    const d = `M${pt(p[0])} L${pt(p[1])} L${pt(p[2])}`;
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} stroke={M.ink} strokeWidth={w + 7} />
        <path d={d} stroke={color} strokeWidth={w} />
        {w2 ? <path d={`M${pt(p[1])} L${pt(p[2])}`} stroke={color} strokeWidth={w2} /> : null}
        <path d={d} stroke={light} strokeWidth={w * 0.25} opacity={0.35} transform="translate(-8 0)" />
      </g>
    );
  };

  // dalgalı saç kenarı: iki nokta arasında kıvrımlı çizgi
  const wave = (x0: number, y0: number, x1: number, y1: number, n: number, amp: number) => {
    let d = "";
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const tm = (i - 0.5) / n;
      const mx = x0 + (x1 - x0) * tm + (i % 2 ? amp : -amp);
      const my = y0 + (y1 - y0) * tm;
      d += ` Q${mx.toFixed(1)} ${my.toFixed(1)} ${(x0 + (x1 - x0) * t).toFixed(1)} ${(y0 + (y1 - y0) * t).toFixed(1)}`;
    }
    return d;
  };

  const eye = (sd: number) => {
    const cx = sd * 23;
    const cy = -706;
    const w = 14;
    const closed = blink || (wink && sd > 0);
    if (closed) {
      return (
        <g key={sd}>
          <path d={`M${cx - w} ${cy - 1} Q${cx} ${cy + (wink && sd > 0 ? -7 : 6)} ${cx + w} ${cy - 1}`} stroke={M.ink} strokeWidth={3.6} fill="none" strokeLinecap="round" />
          <path d={`M${cx + sd * w} ${cy - 1} l${sd * 6} -4 M${cx + sd * (w - 5)} ${cy + 1} l${sd * 4} 5`} stroke={M.ink} strokeWidth={2.4} strokeLinecap="round" />
        </g>
      );
    }
    const top = brow === "skeptic" && sd < 0 ? cy - 6 : cy - 12;
    const almond = `M${cx - w} ${cy} Q${cx} ${cy - 13} ${cx + w} ${cy - 2} Q${cx} ${cy + 8} ${cx - w} ${cy} Z`;
    const cid = `me${sd > 0 ? "r" : "l"}${id}`;
    return (
      <g key={sd}>
        {/* göz farı */}
        <ellipse cx={cx} cy={cy - 9} rx={w + 2} ry={7} fill="#a8735a" opacity={0.35} filter={g("sf")} />
        <clipPath id={cid}>
          <path d={almond} />
        </clipPath>
        <path d={almond} fill="#f5eee4" />
        <g clipPath={`url(#${cid})`}>
          <circle cx={cx + lx} cy={cy - 2 + ly} r={7} fill={M.iris} />
          <circle cx={cx + lx} cy={cy - 2 + ly} r={7} fill="none" stroke="#2c1a0e" strokeWidth={1.4} />
          <circle cx={cx + lx} cy={cy - 2 + ly} r={3.2} fill="#120a06" />
          <circle cx={cx + lx - 2.4} cy={cy - 4.4 + ly} r={1.8} fill="#fff" />
          <path d={`M${cx - w - 2} ${cy - 16} L${cx + w + 2} ${cy - 16} L${cx + w + 2} ${cy - 2} Q${cx} ${top} ${cx - w - 2} ${cy} Z`} fill={g("sk")} />
        </g>
        {/* kalın kirpik çizgisi + dışa kalkan eyeliner */}
        <path d={`M${cx - w - 1} ${cy + 0.5} Q${cx} ${top - 1} ${cx + w + 1} ${cy - 2}`} stroke={M.ink} strokeWidth={4.6} fill="none" strokeLinecap="round" />
        <path d={`M${cx + sd * (w - 1)} ${cy - 2 + (sd < 0 ? 2 : 0)} l${sd * 8} -6`} stroke={M.ink} strokeWidth={3.2} strokeLinecap="round" />
        {[0.15, 0.45, 0.75].map((t, k) => {
          const px = cx - sd * w + sd * 2 * w * t;
          return <path key={k} d={`M${px} ${cy - 10 + Math.abs(t - 0.5) * 8} l${sd * 2} -5`} stroke={M.ink} strokeWidth={1.8} strokeLinecap="round" />;
        })}
        <path d={`M${cx - w + 3} ${cy + 4} Q${cx} ${cy + 9} ${cx + w - 2} ${cy + 2}`} stroke={M.skinD} strokeWidth={1.8} fill="none" />
        <path d={`M${cx - w + 2} ${top - 5} Q${cx} ${top - 10} ${cx + w - 1} ${top - 4}`} stroke={M.skinD} strokeWidth={1.6} fill="none" />
      </g>
    );
  };

  const lips = () => {
    if (mouth === "kiss") {
      // büzülmüş dudak: öne itilmiş, dikey kırışıklı, yanaklar hafif içe
      return (
        <g>
          <path d="M-7 -662 Q-9 -671 -2 -670 Q2 -673 6 -670 Q13 -671 11 -662 Q2 -664 -7 -662 Z" fill={M.lip} stroke={M.ink} strokeWidth={2.2} />
          <path d="M-7 -662 Q-9 -650 2 -650 Q13 -650 11 -662 Q2 -660 -7 -662 Z" fill={M.lip} stroke={M.ink} strokeWidth={2.2} />
          <path d="M-6 -662 Q2 -659 10 -662" stroke={M.lipD} strokeWidth={2} fill="none" strokeLinecap="round" />
          <ellipse cx={0} cy={-655} rx={3} ry={1.6} fill="#fff" opacity={0.45} />
          <path d="M64 -720 c0 -6 8 -6 8 0 c0 -6 8 -6 8 0 c0 6 -8 10 -8 12 c0 -2 -8 -6 -8 -12 Z" fill="#d8434a" stroke={M.ink} strokeWidth={1.8} />
        </g>
      );
    }
    if (mouth === "grin") {
      return (
        <g>
          <path d="M-22 -666 Q-8 -671 0 -668 Q8 -671 22 -666 Q14 -643 0 -642 Q-14 -643 -22 -666 Z" fill="#5a1f18" stroke={M.ink} strokeWidth={2.8} />
          <path d="M-19 -665 Q0 -669 19 -665 L17 -659 Q0 -661 -17 -659 Z" fill="#f7f2e8" />
          <path d="M-22 -666 Q-8 -673 0 -669 Q8 -673 22 -666 Q8 -667 0 -666 Q-8 -667 -22 -666 Z" fill={M.lip} />
          <path d="M-14 -646 Q0 -640 14 -646" stroke={M.lip} strokeWidth={4} fill="none" strokeLinecap="round" />
        </g>
      );
    }
    if (mouth === "talk") {
      const o = 3 + talk * 10;
      return (
        <g>
          <path d={`M-15 -663 Q0 -666 15 -663 Q8 ${-663 + o} 0 ${-663 + o} Q-8 ${-663 + o} -15 -663 Z`} fill="#5a1f18" stroke={M.ink} strokeWidth={2.4} />
          <path d="M-16 -663 Q-7 -670 0 -667 Q7 -670 16 -663 Q0 -664 -16 -663 Z" fill={M.lip} />
          <path d={`M-12 ${-660 + o} Q0 ${-654 + o} 12 ${-660 + o}`} stroke={M.lip} strokeWidth={4.5} fill="none" strokeLinecap="round" />
        </g>
      );
    }
    const up = mouth === "smile" ? 4 : 1;
    return (
      <g>
        {/* üst dudak (kupid yayı) + dolgun alt dudak */}
        <path d={`M-17 ${-663 - up} Q-8 -671 0 -667 Q8 -671 17 ${-663 - up} Q0 -662 -17 ${-663 - up} Z`} fill={M.lip} stroke={M.ink} strokeWidth={1.8} />
        <path d={`M-15 ${-662 - up * 0.6} Q0 -647 15 ${-662 - up * 0.6} Q0 -660 -15 ${-662 - up * 0.6} Z`} fill={M.lip} stroke={M.ink} strokeWidth={1.8} />
        <path d={`M-17 ${-663 - up} Q0 ${-660 + up * 0.5} 17 ${-663 - up}`} stroke={M.lipD} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        <ellipse cx={-3} cy={-655} rx={5} ry={2} fill="#fff" opacity={0.35} />
        {mouth === "smile" ? <path d="M-21 -670 q-2 4 0 7 M21 -670 q2 4 0 7" stroke={M.skinD} strokeWidth={1.8} fill="none" /> : null}
      </g>
    );
  };

  const backHair =
    "M0 -828 C-60 -828 -84 -790 -84 -730" +
    wave(-84, -730, -104 + hairSw * 3, -500, 6, -8) +
    " Q-60 -486 0 -492 Q60 -486 " + (104 + hairSw * 3).toFixed(1) + " -500" +
    wave(104 + hairSw * 3, -500, 84, -730, 6, 8) +
    " C84 -790 60 -828 0 -828 Z";

  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <linearGradient id={`sk${id}`} x1="0" x2="1">
          <stop offset="0" stopColor={M.skinL} />
          <stop offset="0.6" stopColor={M.skin} />
          <stop offset="1" stopColor={M.skinD} />
        </linearGradient>
        <linearGradient id={`hr${id}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={M.hairL} />
          <stop offset="0.45" stopColor={M.hair} />
          <stop offset="1" stopColor={M.hairD} />
        </linearGradient>
        <linearGradient id={`jk${id}`} x1="0" x2="1">
          <stop offset="0" stopColor={M.jacketL} />
          <stop offset="0.45" stopColor={M.jacket} />
          <stop offset="1" stopColor="#121010" />
        </linearGradient>
        <clipPath id={`fc${id}`}>
          <path d={faceD} />
        </clipPath>
        <filter id={`sf${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      <ellipse cx={sway * 5} cy={6} rx={130} ry={16} fill="#000" opacity={0.26} filter={g("sf")} />

      {/* arka saç (omuzların arkasına dökülür) */}
      <g transform={`translate(${headX} 0)`}>
        {!bun ? (
          <>
            <path d={backHair} fill={g("hr")} stroke={M.ink} strokeWidth={3} />
            <path d="M-70 -700 C-80 -640 -82 -580 -90 -520 M70 -700 C80 -640 84 -580 92 -520 M-56 -660 C-62 -600 -60 -560 -66 -510" stroke={M.hairD} strokeWidth={3} fill="none" opacity={0.6} />
          </>
        ) : null}
      </g>

      {/* bacaklar: geniş paça kot / tayt */}
      {legs.map((p, i) => (
        <g key={i}>
          {sokak ? limb(p, 54, M.jeans, M.jeansL, 62) : limb(p, 46, M.leg, "#55565e")}
          <path
            d={`M${p[2][0] - 30} ${p[2][1] + 14} Q${p[2][0] - 30} ${p[2][1] - 14} ${p[2][0]} ${p[2][1] - 14} Q${p[2][0] + 30} ${p[2][1] - 12} ${p[2][0] + 36} ${p[2][1] + 14} Z`}
            fill={sokak ? "#2a2322" : M.shoe}
            stroke={M.ink}
            strokeWidth={3.2}
          />
          <rect x={p[2][0] - 32} y={p[2][1] + 12} width={70} height={8} rx={4} fill={M.shoe} stroke={M.ink} strokeWidth={2.6} />
        </g>
      ))}

      {/* gövde */}
      <g transform={`translate(0 ${-breath * 1.5})`}>
        {sokak ? (
          <>
            {/* beyaz tişört: yüksek bel kotun içine sokulu, kemer */}
            <path d={`M-64 ${shY} L64 ${shY} Q70 -470 60 -392 L-60 -392 Q-70 -470 -64 ${shY} Z`} fill={M.tee} stroke={M.ink} strokeWidth={3.5} />
            <path d={`M-30 ${shY - 2} Q0 ${shY + 34} 30 ${shY - 2}`} stroke={M.ink} strokeWidth={3} fill={g("sk")} />
            <path d="M-40 -480 q18 10 30 2 M42 -470 q-14 10 -28 4" stroke={M.teeD} strokeWidth={2.5} fill="none" />
            <path d="M-62 -402 L62 -402 L60 -386 L-60 -386 Z" fill="#3a2a20" stroke={M.ink} strokeWidth={3} />
            <rect x={-10} y={-404} width={20} height={20} rx={3} fill="none" stroke="#cfc6b0" strokeWidth={3} />
            {/* deri ceket: açık önlü, belde biter, yaka + fermuar */}
            {[-1, 1].map((sd) => (
              <g key={sd}>
                <path
                  d={`M${sd * 102} ${shY + 8} Q${sd * 106} -480 ${sd * 96} -398 L${sd * 52} -398 Q${sd * 46} -480 ${sd * 34} ${shY - 2} Z`}
                  fill={g("jk")}
                  stroke={M.ink}
                  strokeWidth={3.8}
                  strokeLinejoin="round"
                />
                <path d={`M${sd * 34} ${shY - 2} L${sd * 66} ${shY + 46} L${sd * 50} ${shY + 60} L${sd * 56} ${shY + 116}`} stroke={M.ink} strokeWidth={3.2} fill="none" strokeLinejoin="round" />
                <path d={`M${sd * 84} -540 Q${sd * 90} -480 ${sd * 82} -420`} stroke="#6e6460" strokeWidth={3} fill="none" opacity={0.6} />
                <path d={`M${sd * 90} -455 l${sd * -26} 0`} stroke="#bdb6ad" strokeWidth={2.5} />
              </g>
            ))}
            <path d={`M102 ${shY + 8} Q106 -480 96 -398`} stroke={M.rim} strokeWidth={3} fill="none" opacity={rim * 0.8} />
          </>
        ) : (
          <>
            {/* salon: kısa spor üstü + yüksek bel tayt */}
            <path d={`M-90 ${shY + 4} Q-96 -500 -70 -452 Q0 -444 70 -452 Q96 -500 90 ${shY + 4} Q0 ${shY - 12} -90 ${shY + 4} Z`} fill={M.top} stroke={M.ink} strokeWidth={3.8} />
            <path d={`M-30 ${shY - 2} Q0 ${shY + 30} 30 ${shY - 2}`} stroke={M.ink} strokeWidth={3} fill={g("sk")} />
            <path d="M-64 -452 Q-70 -420 -60 -392 L60 -392 Q70 -420 64 -452 Q0 -444 -64 -452 Z" fill={g("sk")} stroke={M.ink} strokeWidth={3.2} />
            <path d="M0 -438 l0 22" stroke={M.skinD} strokeWidth={2.4} />
            <path d="M-62 -400 L62 -400 L60 -380 L-60 -380 Z" fill={M.leg} stroke={M.ink} strokeWidth={3} />
            <path d={`M90 ${shY + 4} Q96 -500 70 -452`} stroke={M.rim} strokeWidth={3} fill="none" opacity={rim * 0.8} />
          </>
        )}
      </g>

      {/* kollar */}
      {[aL, aR].map((p, i) => (
        <g key={i}>
          {sokak ? limb(p, 46, M.jacket, M.jacketL) : limb(p, 36, M.skin, M.skinL)}
          <ellipse cx={p[2][0]} cy={p[2][1] + 4} rx={16} ry={21} fill={g("sk")} stroke={M.ink} strokeWidth={3.2} />
          <path d={`M${p[2][0] - 7} ${p[2][1] + 16} l0 9 M${p[2][0]} ${p[2][1] + 18} l0 9 M${p[2][0] + 7} ${p[2][1] + 16} l0 8`} stroke={M.skinD} strokeWidth={2.2} strokeLinecap="round" />
          {!sokak && i === 0 ? <rect x={p[2][0] - 15} y={p[2][1] - 22} width={30} height={9} rx={3} fill="#c9a8d8" stroke={M.ink} strokeWidth={2} /> : null}
        </g>
      ))}

      {/* boyun */}
      <path d={`M-21 -648 L-23 ${shY + 4} Q0 ${shY + 12} 23 ${shY + 4} L21 -648 Z`} fill={g("sk")} stroke={M.ink} strokeWidth={3.2} />
      <path d="M-21 -640 Q0 -620 21 -640 L21 -630 Q0 -612 -21 -630 Z" fill="#8a5636" opacity={0.3} />
      {/* ince kolye */}
      <path d={`M-20 ${shY + 2} Q0 ${shY + 26} 20 ${shY + 2}`} stroke="#d8c48a" strokeWidth={1.8} fill="none" />

      {/* baş */}
      <g transform={`translate(${headX} ${-breath * 1.5}) rotate(${tilt + headR} 0 -640)`}>
        {bun ? (
          // dağınık topuz
          <g>
            <circle cx={0} cy={-836} r={34} fill={g("hr")} stroke={M.ink} strokeWidth={3} />
            <path d="M-24 -846 q12 -16 30 -10 M-10 -822 q14 -10 30 2 M14 -858 q8 8 4 18" stroke={M.hairL} strokeWidth={2.4} fill="none" />
            <path d="M28 -850 q16 -10 18 6 M-30 -826 q-14 8 -8 20" stroke={M.ink} strokeWidth={2.2} fill="none" />
          </g>
        ) : null}
        {/* kulaklar + halka küpeler */}
        {[-1, 1].map((sd) => (
          <g key={sd}>
            <ellipse cx={sd * 51} cy={-702} rx={8} ry={15} fill={g("sk")} stroke={M.ink} strokeWidth={2.8} />
            <circle cx={sd * 52} cy={-680} r={8} fill="none" stroke={M.ink} strokeWidth={5} />
            <circle cx={sd * 52} cy={-680} r={8} fill="none" stroke={M.hoop} strokeWidth={2.6} />
          </g>
        ))}
        <path d={faceD} fill={g("sk")} stroke={M.ink} strokeWidth={3.4} />
        <g clipPath={g("fc")}>
          <ellipse cx={42} cy={-694} rx={16} ry={40} fill={M.skinD} opacity={0.4} filter={g("sf")} />
          <ellipse cx={-30} cy={-684} rx={13} ry={8} fill="#ee8a80" opacity={0.35} filter={g("sf")} />
          <ellipse cx={32} cy={-684} rx={12} ry={7} fill="#ee8a80" opacity={0.28} filter={g("sf")} />
          {/* çil */}
          {[
            [-24, -690],
            [-18, -686],
            [-28, -684],
            [20, -690],
            [26, -686],
          ].map(([cx, cy], k) => (
            <circle key={k} cx={cx} cy={cy} r={1.1} fill="#a06a4a" opacity={0.6} />
          ))}
          <path d="M-20 -640 Q0 -632 20 -640" stroke={M.skinD} strokeWidth={6} fill="none" opacity={0.4} filter={g("sf")} />
        </g>
        {/* kaşlar: ince, kavisli */}
        {[-1, 1].map((sd) => {
          const d = brow === "up" ? -5 : brow === "skeptic" ? (sd > 0 ? -7 : 2) : 0;
          const cx = sd * 24;
          return (
            <path
              key={sd}
              d={`M${cx - sd * 15} ${-724 + d * 0.6} Q${cx + sd * 2} ${-735 + d} ${cx + sd * 17} ${-726 + d * 0.8} Q${cx + sd * 2} ${-731 + d} ${cx - sd * 15} ${-720 + d * 0.6} Z`}
              fill={M.hairD}
              stroke={M.ink}
              strokeWidth={1.2}
            />
          );
        })}
        {[-1, 1].map((sd) => eye(sd))}
        {/* burun: küçük, kalkık uç */}
        <path d="M6 -712 Q9 -698 8 -688" stroke={M.skinD} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        <path d="M-8 -684 Q-3 -678 0 -680 Q3 -678 8 -684" stroke={M.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        <ellipse cx={-1} cy={-690} rx={3.5} ry={2.6} fill="#fff" opacity={0.3} />
        {lips()}
        {/* ön saç: tepe + perdeli kâkül + yüze düşen tutamlar */}
        {bun ? (
          <g>
            <path d="M-52 -732 C-58 -800 -20 -820 0 -820 C20 -820 58 -800 52 -732 C46 -762 24 -774 0 -772 C-24 -774 -46 -762 -52 -732 Z" fill={g("hr")} stroke={M.ink} strokeWidth={3} />
            <path d="M-44 -760 C-56 -730 -50 -706 -42 -690 C-46 -716 -44 -740 -36 -756 Z M46 -758 C56 -728 52 -704 44 -690 C46 -716 44 -740 38 -754 Z" fill={g("hr")} stroke={M.ink} strokeWidth={2.4} />
          </g>
        ) : (
          <g>
            <path d="M-58 -720 C-66 -800 -30 -830 0 -830 C30 -830 66 -800 58 -720 C54 -748 44 -768 24 -774 C12 -776 -12 -776 -24 -774 C-44 -768 -54 -748 -58 -720 Z" fill={g("hr")} stroke={M.ink} strokeWidth={3} />
            {/* perdeli kâkül: ortadan ayrılır, alnın iki yanından kaş uçlarına ve şakaklara kıvrılır */}
            <path d="M4 -800 C-14 -796 -34 -786 -46 -764 C-56 -744 -56 -712 -50 -684 C-46 -704 -42 -724 -34 -740 C-24 -758 -10 -770 4 -800 Z" fill={g("hr")} stroke={M.ink} strokeWidth={2.6} />
            <path d="M4 -800 C22 -796 40 -786 50 -764 C58 -744 58 -712 52 -684 C48 -704 44 -724 38 -740 C28 -758 16 -770 4 -800 Z" fill={g("hr")} stroke={M.ink} strokeWidth={2.6} />
            <path d="M-2 -792 C-20 -776 -34 -756 -42 -720 M10 -792 C28 -776 40 -756 46 -720 M-30 -820 C-14 -828 14 -828 30 -820" stroke={M.hairL} strokeWidth={2.2} fill="none" opacity={0.8} />
            {/* omzun önüne düşen tutam (sol) */}
            <path d={`M-50 -720 C-62 -660 -56 -610 -66 -560` + wave(-66, -560, -60 + hairSw * 2, -470, 3, -6) + " C-46 -520 -40 -600 -40 -680 Z"} fill={g("hr")} stroke={M.ink} strokeWidth={2.6} />
            <path d="M-52 -690 C-56 -640 -54 -590 -60 -540" stroke={M.hairL} strokeWidth={2} fill="none" opacity={0.7} />
          </g>
        )}
        {beret ? (
          <g transform="rotate(-9 0 -800) translate(0 12)">
            <ellipse cx={-8} cy={-818} rx={82} ry={34} fill={M.beret} stroke={M.ink} strokeWidth={3.4} />
            <path d="M-72 -806 Q-8 -788 62 -806" stroke="#6e1518" strokeWidth={4} fill="none" />
            <path d="M-56 -834 Q-24 -850 20 -846" stroke={M.beretL} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.8} />
            <path d="M-8 -852 l2 -10" stroke={M.ink} strokeWidth={4} strokeLinecap="round" />
          </g>
        ) : null}
        <path d="M50 -716 C53 -696 50 -676 44 -660" stroke={M.rim} strokeWidth={3} fill="none" opacity={rim * 0.5} filter={g("sf")} />
      </g>
    </g>
  );
};

/* ---------- Karakter sayfası ---------- */

const Label: React.FC<{ x: number; y: number; t: string; s?: number; r?: number }> = ({ x, y, t, s = 46, r = -3 }) => (
  <text x={x} y={y} fontFamily={handFamily} fontSize={s} fill={M.ink} transform={`rotate(${r} ${x} ${y})`}>
    {t}
  </text>
);

export const MerveSheet: React.FC = () => {
  const faces: { m: MerveMouth; b: "calm" | "up" | "skeptic"; l: [number, number]; w?: boolean; t: number; n: string }[] = [
    { m: "soft", b: "calm", l: [0, 0], t: 0, n: "sakin" },
    { m: "smile", b: "up", l: [0.3, 0], w: true, t: 4, n: "göz kırpar" },
    { m: "kiss", b: "calm", l: [0.2, -0.2], t: -4, n: "öpücük" },
    { m: "grin", b: "up", l: [0, 0], t: 0, n: "güler" },
  ];
  return (
    <AbsoluteFill style={{ background: "#e8dcc6" }}>
      <svg viewBox="0 0 1080 1920" width="100%" height="100%">
        <Label x={60} y={130} t="Merve" s={110} />
        <Label x={64} y={190} t="kadın karakter · taslak" s={44} r={-2} />
        <Label x={720} y={110} t="meraklı · cesur" s={38} r={2} />
        <Label x={720} y={160} t="şık · sadık" s={38} r={2} />
        {[M.hair, M.jacket, M.tee, M.jeans, M.beret, M.skin].map((c, i) => (
          <circle key={i} cx={740 + i * 50} cy={205} r={18} fill={c} stroke={M.ink} strokeWidth={2} />
        ))}
        {faces.map((fc, i) => (
          <g key={i}>
            <rect x={40 + i * 255} y={260} width={235} height={300} fill="#2b2420" stroke={M.ink} strokeWidth={4} />
            <svg x={40 + i * 255} y={260} width={235} height={300} viewBox="-115 -860 230 294">
              <Merve x={0} y={0} mouth={fc.m} brow={fc.b} look={fc.l} wink={fc.w} tilt={fc.t} live={false} />
            </svg>
            <Label x={60 + i * 255} y={605} t={fc.n} s={40} />
          </g>
        ))}
        <Label x={60} y={680} t="kıyafet konuya göre değişir →" s={42} />
        <Merve x={200} y={1700} s={1.2} outfit="sokak" mouth="smile" look={[0.3, 0]} armL={[12, -8]} armR={[10, -6]} live={false} />
        <Merve x={545} y={1700} s={1.2} outfit="sokak" beret mouth="soft" brow="skeptic" look={[0.6, 0]} tilt={-4} armL={[8, -4]} armR={[10, -6]} live={false} />
        <Merve x={890} y={1700} s={1.2} outfit="salon" mouth="grin" brow="up" armL={[16, -10]} armR={[14, -8]} live={false} />
        <Label x={130} y={1800} t="sokak" s={44} />
        <Label x={480} y={1800} t="bereli" s={44} />
        <Label x={830} y={1800} t="salon" s={44} />
      </svg>
    </AbsoluteFill>
  );
};
