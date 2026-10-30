// 22 Kreatin saç döker mi? — 1930'lar stili (Yunus + Duru), tenya kurgusu örnek alındı. Sahneler `kh-*`; kelime zamanı w(i).
// Eski seri stilinde (Cizim1 OldChar) anlatıcı tek ses Yunus; Duru yalnız yan karakter, konuşmaz.
import React, { useContext } from "react";
import { interpolate, staticFile, useCurrentFrame } from "remotion";
import { gestureT, HoseChar } from "../avatar2/Hose";
import { CharCtx, Who } from "./cast";

// 1930 stilinde Duru kendi repliklerini konuşur; eski seride anlatıcı Yunus olduğundan Duru'nun ağzı oynamaz
const useDuruTalks = () => useContext(CharCtx) === HoseChar;
import { fontFamily, handFamily } from "../fonts";
import { INK, RED, NAVY, WHITE, clamp, prog, pop, q2, Cam, handAt, Room, Lens, Stamp, YearCard, Calendar, useImgReady, type SceneProps } from "./Tenya";

/* ---------- eşyalar ---------- */

// Kreatin kutusu
const Tub: React.FC<{ x: number; y: number; s?: number; r?: number }> = ({ x, y, s = 1, r = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} stroke={INK} strokeWidth={6}>
    <rect x={-70} y={-120} width={140} height={34} rx={8} fill="#2a2523" />
    <rect x={-80} y={-90} width={160} height={190} rx={20} fill={WHITE} />
    <rect x={-80} y={-40} width={160} height={70} fill={RED} />
    <text x={0} y={8} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={30} fill={WHITE} stroke="none">
      KREATİN
    </text>
  </g>
);

// Ölçek kaşığı (beyaz toz dolu); tilt > 0 → toz dökülür
const Scoop: React.FC<{ x: number; y: number; s?: number; r?: number; tilt?: number }> = ({ x, y, s = 1, r = 0, tilt = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${r + tilt * 70}) scale(${s})`} stroke={INK} strokeWidth={5}>
    <path d="M-10 6 L-90 18" strokeWidth={16} strokeLinecap="round" />
    <path d="M-10 6 L-90 18" stroke="#c9c2b4" strokeWidth={8} strokeLinecap="round" />
    <path d="M-12 -24 L52 -24 L46 26 Q20 36 -6 26 Z" fill="#c9c2b4" />
    {tilt < 0.5 ? <path d="M-12 -24 Q20 -48 52 -24 Z" fill={WHITE} /> : null}
  </g>
);

// Düşen saç telleri (kıvırcık)
const Hairs: React.FC<{ f: number; at: number; x: number; y: number; n?: number }> = ({ f, at, x, y, n = 6 }) => {
  if (f < at) return null;
  return (
    <g>
      {[...Array(n)].map((_, i) => {
        const t = (f - at - i * 2) / 30;
        if (t < 0) return null;
        const hx = x + (i - n / 2) * 30 + Math.sin(t * 5 + i) * 24;
        const hy = y + t * 420;
        return (
          <path
            key={i}
            d={`M${hx} ${hy} q14 14 0 28 q-14 14 0 28`}
            stroke={INK}
            strokeWidth={5}
            fill="none"
            strokeLinecap="round"
            opacity={Math.max(0, 1 - t * 0.8)}
            transform={`rotate(${t * 140 + i * 30} ${hx} ${hy + 28})`}
          />
        );
      })}
    </g>
  );
};

// Ragbi topu
const Ball: React.FC<{ x: number; y: number; s?: number; r?: number }> = ({ x, y, s = 1, r = -25 }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} stroke={INK} strokeWidth={5}>
    <ellipse cx={0} cy={0} rx={44} ry={27} fill="#9a5a32" />
    <path d="M-16 0 L16 0 M-9 -6 L-9 6 M0 -6 L0 6 M9 -6 L9 6" stroke={WHITE} strokeWidth={4} />
  </g>
);

// Mini ragbi oyuncusu (rubber hose: turta gözler, çizgili forma, hortum bacaklar)
const Player: React.FC<{ x: number; y: number; s?: number; f: number; seed?: number; ball?: boolean; look?: number }> = ({ x, y, s = 1, f, seed = 0, ball, look = 0 }) => {
  const bob = Math.abs(Math.sin(q2(f) / 5 + seed)) * 10;
  const sw = Math.sin(q2(f) / 5 + seed) * 18;
  return (
    <g transform={`translate(${x} ${y - bob}) scale(${s})`} stroke={INK} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
      {/* bacaklar */}
      <path d={`M-18 0 Q${-26 - sw * 0.4} 50 ${-22 - sw} 96`} fill="none" strokeWidth={14} />
      <path d={`M18 0 Q${26 + sw * 0.4} 50 ${22 + sw} 96`} fill="none" strokeWidth={14} />
      <ellipse cx={-30 - sw} cy={100} rx={24} ry={12} fill={INK} />
      <ellipse cx={30 + sw} cy={100} rx={24} ry={12} fill={INK} />
      {/* şort + forma */}
      <rect x={-40} y={-22} width={80} height={34} rx={8} fill={WHITE} />
      <rect x={-46} y={-128} width={92} height={110} rx={22} fill={RED} />
      {[-104, -78, -52].map((sy) => (
        <rect key={sy} x={-46} y={sy} width={92} height={12} fill={WHITE} strokeWidth={0} />
      ))}
      <rect x={-46} y={-128} width={92} height={110} rx={22} fill="none" />
      {/* kollar */}
      <path d={`M-42 -110 Q-80 -70 ${-70 + sw * 0.3} -30`} fill="none" strokeWidth={12} />
      <path d={`M42 -110 Q80 -70 ${70 - sw * 0.3} -30`} fill="none" strokeWidth={12} />
      <circle cx={-70 + sw * 0.3} cy={-28} r={13} fill={WHITE} />
      <circle cx={70 - sw * 0.3} cy={-28} r={13} fill={WHITE} />
      {ball ? <Ball x={0} y={-60} s={0.8} /> : null}
      {/* baş */}
      <circle cx={0} cy={-178} r={48} fill="#f3e3c4" />
      <path d="M-40 -200 Q-30 -240 0 -232 Q30 -244 42 -204 Q20 -222 0 -214 Q-20 -222 -40 -200 Z" fill={INK} />
      <ellipse cx={-14 + look * 6} cy={-182} rx={9} ry={14} fill={WHITE} strokeWidth={4} />
      <ellipse cx={14 + look * 6} cy={-182} rx={9} ry={14} fill={WHITE} strokeWidth={4} />
      <path d={`M${-14 + look * 8} -184 l0 8 l5 -4 Z M${14 + look * 8} -184 l0 8 l5 -4 Z`} fill={INK} strokeWidth={6} />
      <path d="M-18 -156 Q0 -142 18 -156" fill="none" strokeWidth={5} />
    </g>
  );
};

// Ragbi sahası
const Field: React.FC<{ f: number }> = ({ f }) => (
  <g stroke={INK} strokeWidth={7}>
    <rect x={-900} y={-700} width={2900} height={3400} fill="#f1dcb0" />
    {/* tribün */}
    <rect x={-900} y={560} width={2900} height={420} fill="#c9a26a" />
    {[...Array(3)].map((_, r) =>
      [...Array(26)].map((__, i) => (
        <circle key={`${r}-${i}`} cx={-860 + i * 110 + (r % 2) * 55} cy={640 + r * 110 + Math.abs(Math.sin(q2(f) / 6 + i + r)) * -8} r={30} fill={(i + r) % 3 ? "#e9d4a8" : "#b7884f"} strokeWidth={4} />
      )),
    )}
    <rect x={-900} y={980} width={2900} height={24} fill="#7a4e26" />
    {/* çim */}
    <rect x={-900} y={1004} width={2900} height={1700} fill="#a7b06a" />
    {[...Array(9)].map((_, i) => (
      <rect key={i} x={-900 + i * 340} y={1004} width={170} height={1700} fill="#99a35f" strokeWidth={0} />
    ))}
    <path d="M-900 1500 L2000 1500" stroke={WHITE} strokeWidth={10} />
    {/* H direği */}
    <g stroke={INK} strokeWidth={6}>
      <rect x={170} y={480} width={22} height={700} fill={WHITE} />
      <rect x={430} y={480} width={22} height={700} fill={WHITE} />
      <rect x={170} y={900} width={282} height={20} fill={WHITE} />
    </g>
  </g>
);

// Kan tüpü: hormon seviyesi yükselir (lv 0..1)
const BloodTube: React.FC<{ x: number; y: number; s?: number; lv: number; arrow?: number }> = ({ x, y, s = 1, lv, arrow = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={7}>
    <rect x={-60} y={-260} width={120} height={420} rx={60} fill={WHITE} />
    <rect x={-50} y={150 - 380 * (0.3 + 0.5 * lv)} width={100} height={380 * (0.3 + 0.5 * lv)} rx={48} fill={RED} strokeWidth={0} />
    <rect x={-60} y={-260} width={120} height={420} rx={60} fill="none" />
    <rect x={-72} y={-300} width={144} height={50} rx={12} fill="#2a2523" />
    {arrow > 0 ? (
      <g stroke={RED} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={arrow}>
        <path d={`M150 120 L150 ${120 - 260 * arrow}`} />
        <path d={`M108 ${170 - 260 * arrow} L150 ${120 - 260 * arrow} L192 ${170 - 260 * arrow}`} />
      </g>
    ) : null}
    <text x={0} y={240} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={60} fill={INK} stroke="none" letterSpacing={3}>
      HORMON
    </text>
  </g>
);

// Rapor: iki çift eşit çubuk (kreatin / plasebo) → "FARK YOK"
const Report: React.FC<{ x: number; y: number; s?: number; a: number; b: number; ok: number }> = ({ x, y, s = 1, a, b, ok }) => {
  const bar = (bx: number, h: number, c: string) => <rect x={bx} y={250 - h} width={58} height={h} rx={8} fill={c} />;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeWidth={6}>
      <rect x={-270} y={-200} width={540} height={420} rx={14} fill={WHITE} />
      <text x={0} y={-140} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={44} fill={INK} stroke="none" letterSpacing={3}>
        12 HAFTA SONRA
      </text>
      <path d="M-230 -116 L230 -116" strokeWidth={4} />
      <text x={-125} y={-66} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={38} fill={INK} stroke="none">
        HORMON
      </text>
      <text x={125} y={-66} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={38} fill={INK} stroke="none">
        SAÇ
      </text>
      <g strokeWidth={5}>
        {bar(-200, 220 * a, RED)}
        {bar(-110, 220 * a, "#a7a29a")}
        {bar(50, 240 * b, RED)}
        {bar(140, 240 * b, "#a7a29a")}
      </g>
      {a > 0.9 ? <text x={-125} y={-4} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={54} fill={NAVY} stroke="none">=</text> : null}
      {b > 0.9 ? <text x={125} y={-4} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={54} fill={NAVY} stroke="none">=</text> : null}
      <path d="M-230 252 L230 252" strokeWidth={4} />
      {ok > 0 ? (
        <path d="M150 -190 l40 44 l80 -100" stroke={NAVY} strokeWidth={22} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={240} strokeDashoffset={240 * (1 - ok)} />
      ) : null}
    </g>
  );
};

// VOOM telefonu: gerçek suplement ekranı (Kreatin 5g, her gün) + "aldım" tiki
const SUP = staticFile("app/suplement-kreatin.jpg");
const SW = 300;
const SH = (SW * 420) / 384;
const SupPhone: React.FC<{ x: number; y: number; s?: number; tick: number; glow?: number }> = ({ x, y, s = 1, tick, glow = 0 }) => {
  useImgReady(SUP);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {glow > 0 ? <ellipse cx={0} cy={0} rx={260} ry={340} fill="#ffe9a8" opacity={0.5 * glow} /> : null}
      <rect x={-SW / 2 - 22} y={-SH / 2 - 70} width={SW + 44} height={SH + 150} rx={36} fill="#1b1817" stroke={INK} strokeWidth={8} />
      <text x={0} y={-SH / 2 - 22} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={34} fill={WHITE} letterSpacing={2}>
        voom
      </text>
      <circle cx={46} cy={-SH / 2 - 30} r={6} fill="#d7f05a" />
      <clipPath id="khSup">
        <rect x={-SW / 2} y={-SH / 2} width={SW} height={SH} rx={12} />
      </clipPath>
      <image href={SUP} x={-SW / 2} y={-SH / 2} width={SW} height={SH} clipPath="url(#khSup)" preserveAspectRatio="xMidYMid slice" />
      {/* "Kreatin 5g" satırı vurgusu + tik */}
      <rect x={-SW / 2 + 20} y={SH * 0.13} width={SW - 40} height={SH * 0.16} rx={10} fill="none" stroke="#d7f05a" strokeWidth={5} opacity={tick > 0 ? 1 : 0} />
      {tick > 0 ? (
        <path d={`M-40 ${SH / 2 + 30} l24 26 l50 -56`} stroke="#d7f05a" strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={140} strokeDashoffset={140 * (1 - tick)} />
      ) : null}
    </g>
  );
};

// Bildirim balonu (ekranın üstünden iner)
const Notice: React.FC<{ p: number }> = ({ p }) => {
  if (p <= 0) return null;
  return (
    <g transform={`translate(540 ${-120 + 380 * p})`} stroke={INK} strokeWidth={6}>
      <rect x={-460} y={-70} width={920} height={140} rx={40} fill="#1b1817" />
      <circle cx={-380} cy={0} r={42} fill={WHITE} />
      <text x={-380} y={12} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={30} fill={INK} stroke="none">
        voom
      </text>
      <text x={-310} y={-8} fontFamily={fontFamily} fontWeight={800} fontSize={36} fill={WHITE} stroke="none">
        Günaydın! Kreatin zamanı
      </text>
      <text x={-310} y={40} fontFamily={handFamily} fontSize={36} fill="#d7f05a" stroke="none">
        5 g · her gün
      </text>
    </g>
  );
};

/* ---------- sahneler ---------- */

// Açılış: Yunus kaşıkla kreatin alırken Duru araya girer (döngü için kapanışta da aynı kare)
const Y1 = { x: 330, y: 1760, s: 1.25 };
const D1 = { x: 790, y: 1760, s: 1.25 };
const ARM_SCOOP: [number, number, number] = [130, -80, -60];
const ARM_TUB: [number, number, number] = [-40, 60, 40];
const SCOOP_AT = handAt(Y1.x, Y1.y, Y1.s, ARM_SCOOP, 1);
const TUB_AT = handAt(Y1.x, Y1.y, Y1.s, ARM_TUB, -1);
const OPEN_CAM: [number, number, number, number] = [0, 560, 1150, 1.25];

const KancaShot: React.FC<{ f: number; talk: boolean; w: (i: number) => number }> = ({ f, talk: talkIn, w }) => {
  const duruTalks = useDuruTalks();
  const talk = talkIn && duruTalks;
  const sp = interpolate(f, [w(2), w(2) + 4, w(3) + 16, w(3) + 26], [0, 1, 1, 0.3], clamp);
  const tilt = prog(f, w(3), w(3) + 8);
  return (
    <>
      <Room />
      <Tub x={TUB_AT[0]} y={TUB_AT[1] + 40} s={0.9} r={-6} />
      <Who x={Y1.x} y={Y1.y} s={Y1.s} who="yunus" seed={4} armR={ARM_SCOOP} handR="fist" armL={ARM_TUB} handL="fist" look={sp > 0 ? [0, -0.6] : [1, -0.2]} face={sp > 0.3 ? "o" : "smile"} surprise={sp} />
      <Scoop x={SCOOP_AT[0] + 40} y={SCOOP_AT[1] - 20} s={1.3} tilt={tilt} />
      <Who x={D1.x} y={D1.y} s={D1.s} who="duru" beret seed={9} talk={talk ? 1 : 0} armL={[-150, -60, 40]} handL="open" look={[-1, -0.2]} face="o" tilt={-5} />
      <Hairs f={f} at={w(3)} x={Y1.x} y={Y1.y - Y1.s * 640} />
    </>
  );
};

// 1) Duru: "Kreatin kullanma, saçın dökülür." — Yunus'un şapkası havalanır, saç telleri dökülür
const KhKanca: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  return (
    <Cam f={f} keys={[OPEN_CAM, [w(2), 520, 1120, 1.32], [d, 480, 1100, 1.4]]} shake={interpolate(f, [w(2), w(2) + 8], [0.5, 0], clamp)}>
      <KancaShot f={f} talk={f < d - 6} w={w} />
    </Cam>
  );
};

// 2) Yunus: tek kaynak → 2009 Güney Afrika, 20 ragbi oyuncusu, 3 hafta kreatin → hormon arttı → saça bakılmadı
const KhTarih: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const field = f >= w(6) && f < w(16);
  const lab = f >= w(16) && f < w(20);
  const hair = f >= w(20);
  const weeks = f >= w(12) ? 1 + Math.min(2, Math.floor((f - w(12)) / 6)) : 0;
  return (
    <g>
      {f < w(6) ? (
        <Cam f={f} keys={[[0, 540, 1100, 1.2], [w(5), 540, 1060, 1.3]]}>
          <Room />
          <Who x={420} y={1760} s={1.3} who="yunus" seed={4} talk={1} armR={f >= w(2) ? [50, -190, -20] : undefined} handR={f >= w(2) ? "point" : undefined} look={[0.4, -0.3]} />
          <Who x={900} y={1780} s={1.15} who="duru" beret seed={9} nod={0.6} look={[-1, -0.2]} lid={0.35} />
          <text x={560} y={720} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={200} fill={RED} stroke={INK} strokeWidth={8} paintOrder="stroke fill" opacity={pop(f, w(2))}>
            1
          </text>
        </Cam>
      ) : field ? (
        <Cam f={f} keys={[[w(6), 540, 1000, 1.05], [w(9), 540, 1100, 1.0], [w(12), 560, 1060, 1.08], [w(15) + 6, 560, 1100, 1.12]]}>
          <Field f={f} />
          {[...Array(10)].map((_, i) => (
            <Player key={i} x={30 + i * 112} y={1330 + (i % 2) * 40} s={0.8} f={f} seed={i * 1.7} ball={i === 4} look={i < 5 ? 1 : -1} />
          ))}
          {[...Array(10)].map((_, i) => (
            <g key={`b${i}`} opacity={pop(f, w(9) + i)}>
              <Player x={80 + i * 108} y={1560 + (i % 2) * 40} s={0.9} f={f} seed={i * 2.3 + 1} look={i < 5 ? 1 : -1} />
            </g>
          ))}
          <YearCard f={f} t="2009" at={w(6)} x={300} y={330} />
          <g opacity={prog(f, w(7), w(7) + 8)}>
            <text x={300} y={510} textAnchor="middle" fontFamily={handFamily} fontSize={64} fill={INK}>
              Güney Afrika
            </text>
          </g>
          <g transform={`translate(810 360) scale(${pop(f, w(9))})`}>
            <circle cx={0} cy={0} r={120} fill={WHITE} stroke={INK} strokeWidth={8} />
            <text x={0} y={40} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={120} fill={RED} stroke={INK} strokeWidth={4} paintOrder="stroke fill">
              20
            </text>
          </g>
          {weeks > 0 ? (
            <g transform={`translate(810 360) rotate(${(f % 6) * 2 - 5})`}>
              <Calendar x={0} y={0} n={weeks} s={0.85} />
            </g>
          ) : null}
          {f >= w(14) ? <Tub x={540} y={880 - prog(f, w(14), w(15)) * 40} s={1.1 * pop(f, w(14))} r={-4} /> : null}
        </Cam>
      ) : lab ? (
        <Cam f={f} keys={[[w(16), 540, 960, 1.15], [w(19) + 8, 540, 920, 1.05]]}>
          <rect x={-800} y={-600} width={2700} height={3200} fill="#e8d3a6" />
          <BloodTube x={500} y={980} s={1.5} lv={prog(f, w(18), w(19) + 6)} arrow={prog(f, w(18), w(19) + 4)} />
        </Cam>
      ) : hair ? (
        <Cam f={f} keys={[[w(20), 540, 1060, 1.2], [w(22), 540, 980, 1.05], [d, 540, 960, 1.0]]}>
          <Field f={f} />
          <Player x={420} y={1500} s={2.4} f={0} seed={1} look={1} />
          {/* saçın üstünde büyüteç: saç büyür, içinde "?" */}
          <Lens x={600} y={760} r={150} id="khHair">
            <g transform="translate(600 760) scale(2.2) translate(-420 -980)">
              <Player x={420} y={1500} s={2.4} f={0} seed={1} look={1} />
            </g>
            <text x={600} y={840} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={200} fill={RED} stroke={INK} strokeWidth={8} paintOrder="stroke fill" opacity={pop(f, w(21))}>
              ?
            </text>
          </Lens>
          <Who x={880} y={1800} s={1.05} who="yunus" seed={4} gesture="shrug" gT={gestureT(f, w(22), d)} talk={1} look={[-1, -0.3]} />
          <Stamp x={540} y={420} t="SAÇ ÖLÇÜLMEDİ" p={pop(f, w(22), 12)} size={96} />
        </Cam>
      ) : null}
    </g>
  );
};

// 3) Yunus: "2025'te bir deney tam olarak bunu ölçtü: on iki hafta, kırk beş sporcu."
const KhBilim: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const weeks = f >= w(7) ? Math.min(12, 1 + Math.floor((f - w(7)) / 2)) : 0;
  const inD = prog(f, w(10), w(12));
  return (
    <Cam f={f} keys={[[0, 540, 960, 1.05], [w(6), 560, 900, 1.1], [w(10), 600, 920, 1.05], [d, 600, 940, 1.1]]}>
      <Room />
      <YearCard f={f} t="2025" at={0} x={540} y={300} />
      <Who x={250} y={1760} s={1.15} who="yunus" seed={4} talk={1} gesture="point" gT={gestureT(f, w(6), d)} look={[1, -0.4]} />
      {weeks > 0 ? <Calendar x={420} y={680} n={weeks} s={0.9} /> : null}
      {/* 45 sporcu: 9 x 5 küçük baş */}
      {f >= w(10) ? (
        <g transform={`translate(760 700)`}>
          <rect x={-230} y={-170} width={460} height={340} rx={16} fill={WHITE} stroke={INK} strokeWidth={7} opacity={pop(f, w(10))} />
          {[...Array(45)].map((_, i) => {
            const cx = -192 + (i % 9) * 48;
            const cy = -128 + Math.floor(i / 9) * 52;
            return (
              <g key={i} transform={`translate(${cx} ${cy}) scale(${pop(f, w(10) + i * 0.5, 6)})`} stroke={INK} strokeWidth={3}>
                <circle cx={0} cy={0} r={15} fill="#f3e3c4" />
                <path d="M-14 26 Q0 10 14 26" fill={i % 2 ? RED : NAVY} />
              </g>
            );
          })}
          <text x={0} y={150} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={44} fill={INK} opacity={pop(f, w(12))}>
            45 SPORCU
          </text>
        </g>
      ) : null}
      {/* Duru raporla gelir */}
      <g transform={`translate(${(1 - inD) * 500} 0)`}>
        <Who x={900} y={1780} s={1.1} who="duru" beret seed={9} look={[-1, -0.3]} armL={[-80, -10, 50]} handL="fist" face="smile" />
        <rect x={900 - 1.1 * 160} y={1780 - 1.1 * 420} width={110} height={140} rx={8} fill={WHITE} stroke={INK} strokeWidth={6} transform={`rotate(-8 ${900 - 1.1 * 110} ${1780 - 1.1 * 350})`} />
      </g>
    </Cam>
  );
};

// 4) Duru: "Ne hormon değişti ne saç." — raporu açıp okur, iki çift eşit çubuk, "FARK YOK"
const KhSonuc: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const duru = useDuruTalks();
  const a = prog(f, w(0), w(2));
  const b = prog(f, w(3), w(4) + 6);
  const ok = prog(f, w(4) + 6, w(4) + 14);
  const sp = interpolate(f, [w(4) + 4, w(4) + 8, Math.max(d, w(4) + 9)], [0, 0.8, 0.5], clamp);
  return (
    <Cam f={f} keys={[[0, 540, 1130, 1.3], [w(4), 540, 1110, 1.22], [d, 540, 1100, 1.2]]}>
      <Room />
      <Who x={540} y={1800} s={1.5} who="duru" beret seed={9} talk={f < d - 8 && duru ? 1 : 0} armR={[98, 60, -40]} armL={[-98, 60, 40]} handR="fist" handL="fist" look={[0, 0.5]} surprise={sp} face={sp > 0.3 ? "o" : "talk"} />
      <Report x={540} y={1400} s={1.0} a={a} b={b} ok={ok} />
      <g opacity={ok}>
        <text x={540} y={690} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={110} fill={NAVY} stroke={INK} strokeWidth={4} paintOrder="stroke fill" letterSpacing={4}>
          FARK YOK
        </text>
      </g>
    </Cam>
  );
};

// 5) Yunus: "Günde beş gram yeter, yükleme yapmana gerek yok. Asıl mesele her gün almak."
const KhTavsiye: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const Y = { x: 320, y: 1760, s: 1.25 };
  const arm: [number, number, number] = [140, -110, -50];
  const h = handAt(Y.x, Y.y, Y.s, arm, 1);
  const out = prog(f, w(8), w(9));
  return (
    <Cam f={f} keys={[[0, 520, 1060, 1.2], [w(4), 540, 980, 1.08], [w(10), 540, 960, 1.0], [d, 540, 980, 1.05]]} shake={interpolate(f, [w(6), w(6) + 8], [0.5, 0], clamp)}>
      <Room />
      <Who x={Y.x} y={Y.y} s={Y.s} who="yunus" seed={4} talk={1} armR={arm} handR="fist" look={[1, -0.4]} face="grin" />
      <Scoop x={h[0] + 40} y={h[1] - 20} s={1.3} />
      <Who x={850} y={1780} s={1.1} who="duru" beret seed={9} nod={f >= w(10) ? 1 : 0.4} look={[-1, -0.2]} face="smile" />
      {/* 5 g rozeti */}
      <g transform={`translate(${h[0] + 260} ${h[1] - 220}) scale(${pop(f, w(1)) * (1 - out)})`}>
        <circle cx={0} cy={0} r={130} fill={NAVY} stroke={INK} strokeWidth={8} />
        <circle cx={0} cy={0} r={108} fill="none" stroke={WHITE} strokeWidth={4} strokeDasharray="8 10" />
        <text x={0} y={22} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={96} fill={WHITE}>
          5 g
        </text>
        <text x={0} y={76} textAnchor="middle" fontFamily={handFamily} fontSize={40} fill={WHITE}>
          günde
        </text>
      </g>
      {/* yükleme kartı: kırmızı çizilir */}
      <g transform={`translate(330 420) rotate(-4) scale(${pop(f, w(4)) * (1 - out)})`} stroke={INK} strokeWidth={7}>
        <rect x={-230} y={-90} width={460} height={180} rx={18} fill={WHITE} />
        <text x={0} y={-10} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={54} fill={INK} stroke="none">
          YÜKLEME
        </text>
        <text x={0} y={56} textAnchor="middle" fontFamily={handFamily} fontSize={48} fill={INK} stroke="none">
          20 g × 7 gün
        </text>
        <path d="M-200 -70 L200 70" stroke={RED} strokeWidth={20} strokeLinecap="round" strokeDasharray={430} strokeDashoffset={430 * (1 - prog(f, w(6), w(6) + 6))} />
      </g>
      {/* her gün: 7 gün sırayla lacivert */}
      {f >= w(9) ? (
        <g transform="translate(540 440)">
          {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((dn, i) => {
            const on = prog(f, w(10) + i * 3, w(10) + i * 3 + 4);
            return (
              <g key={i} transform={`translate(${(i - 3) * 132} 0) scale(${pop(f, w(9) + i * 2)})`}>
                <rect x={-56} y={-56} width={112} height={112} rx={16} fill={on > 0.5 ? NAVY : WHITE} stroke={INK} strokeWidth={6} />
                <text x={0} y={-10} textAnchor="middle" fontFamily={fontFamily} fontWeight={800} fontSize={32} fill={on > 0.5 ? WHITE : INK}>
                  {dn}
                </text>
                {on > 0 ? <path d="M-24 18 l14 16 l32 -36" stroke={on > 0.5 ? WHITE : NAVY} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={80} strokeDashoffset={80 * (1 - on)} /> : null}
              </g>
            );
          })}
        </g>
      ) : null}
    </Cam>
  );
};

// 6) Duru: "VOOM'daki suplement hatırlatıcın her sabah haber verir, unutmazsın." — sabah güneşi, bildirim, tik
const KhVoom: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const duru = useDuruTalks();
  const sun = prog(f, w(3), w(5));
  const tick = prog(f, w(7), w(7) + 8);
  return (
    <g>
      <Cam f={f} keys={[[0, 560, 1000, 1.1], [w(2), 620, 900, 1.15], [w(7), 600, 920, 1.08], [d, 600, 940, 1.1]]}>
        <Room />
        {/* pencerede sabah güneşi doğar */}
        <clipPath id="khWin">
          <rect x={-60} y={300} width={360} height={460} />
        </clipPath>
        <g clipPath="url(#khWin)">
          <circle cx={120} cy={820 - sun * 320} r={90} fill="#f6a640" stroke={INK} strokeWidth={7} />
        </g>
        <Who x={290} y={1780} s={1.15} who="duru" beret seed={9} talk={f < d - 6 && duru ? 1 : 0} gesture="point" gT={gestureT(f, w(0), w(6))} gSide="R" look={[1, -0.3]} face={tick > 0.5 ? "grin" : "smile"} wink={f >= w(7) + 4 && f < w(7) + 12} />
        <SupPhone x={740} y={940} s={1.25} tick={tick} glow={pop(f, w(0))} />
      </Cam>
      <Notice p={pop(f, w(3), 12)} />
    </g>
  );
};

// 7) Yunus: "Bunu, saçı yüzünden kreatini bırakan arkadaşına gönder. Çünkü ona da şunu dediler:" → kâğıt uçak → açılış karesi
const KhSon: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const fold = prog(f, w(0), w(2));
  const fly = prog(f, w(6), w(7) + 4);
  const opening = f >= w(7) + 4;
  const never = () => 99999;
  return (
    <g>
      {!opening ? (
        <Cam f={f} keys={[[0, 540, 1000, 1.05], [w(3), 600, 980, 1.15], [w(6), 600, 980, 1.15]]}>
          <Room />
          <Who x={170} y={1780} s={1.05} who="duru" beret seed={9} look={[1, -0.2]} face="smile" />
          <Who x={480} y={1760} s={1.2} who="yunus" seed={4} talk={1} gesture={fly > 0 ? "point" : "explain"} gT={fly > 0 ? 1 - fly : gestureT(f, w(0), w(5))} face="grin" look={[0.6, -0.3]} />
          {/* saçı yüzünden kreatini bırakan arkadaş: kutuyu kenara itmiş, saçını tutuyor */}
          <Who x={900} y={1780} s={1.1} who="arkadas" seed={6} look={[-1, 0]} face="sad" gesture="facepalm" gT={gestureT(f, w(1), w(5))} gSide="L" />
          <Tub x={1000} y={1720} s={0.7} r={20} />
          <path d="M935 1610 L1065 1830 M1065 1610 L935 1830" stroke={RED} strokeWidth={14} strokeLinecap="round" opacity={prog(f, w(3), w(4))} />
          {(() => {
            const sc = 0.6 + fold * 0.4 + fly * fly * 14;
            const px = 680 + fly * -140;
            const py = 1040 - fly * 140;
            return (
              <g transform={`translate(${px} ${py}) scale(${sc}) rotate(${-10 + fly * 20})`} stroke={INK} strokeWidth={6 / Math.max(1, sc * 0.5)}>
                <path d="M-70 -30 L70 0 L-70 30 L-40 0 Z" fill={WHITE} />
                <path d="M-40 0 L70 0" />
              </g>
            );
          })()}
        </Cam>
      ) : (
        <g>
          <Cam f={0} keys={[OPEN_CAM]}>
            <KancaShot f={0} talk w={never} />
          </Cam>
          <rect x={0} y={0} width={1080} height={1920} fill={WHITE} opacity={1 - prog(f, w(7) + 4, Math.min(d - 2, w(7) + 12))} />
        </g>
      )}
    </g>
  );
};

export const KREATIN_HOSE_SCENES: Record<string, React.FC<SceneProps>> = {
  "kh-kanca": KhKanca,
  "kh-tarih": KhTarih,
  "kh-bilim": KhBilim,
  "kh-sonuc": KhSonuc,
  "kh-tavsiye": KhTavsiye,
  "kh-voom": KhVoom,
  "kh-son": KhSon,
};
