// 22 Kreatin saç döker mi? — "heykel" stili: canlanan mermer tanrıça pozları (tam ekran) + kamera + bilgi katmanları.
// Pozlar public/heykel/fitness/pozNN.jpg (941x1672 ≈ 9:16). Sahneler `kre-*`; kelime zamanı w(i).
import React, { useEffect, useState } from "react";
import { continueRender, delayRender, Easing, interpolate, staticFile, useCurrentFrame } from "remotion";
import { fontFamily, handFamily } from "../fonts";

type SceneProps = { d: number; w: (i: number) => number };

const INK = "#1d1513";
const BURGUNDY = "#7a1f2b";
const NAVY = "#1f3a68";
const RED = "#c0302b";
const CREAM = "#fbf6ee";
const LIME = "#c8e85a";

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

// Kamera: [kare, merkezX, merkezY, yakınlık]
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
const Cam: React.FC<{ f: number; keys: Key[]; children: React.ReactNode }> = ({ f, keys, children }) => {
  const [, cx0, cy0, z0] = camAt(f, keys);
  // çok hafif "nefes" (görüntü hiç donmasın); kamera görselin dışına taşmaz (boş şerit kalmasın)
  const z = Math.max(1.02, z0) * (1 + 0.006 * Math.sin(f / 18));
  const cx = Math.min(1080 - 540 / z, Math.max(540 / z, cx0));
  const cy = Math.min(1920 - 960 / z, Math.max(960 / z, cy0));
  return <g transform={`translate(540 960) scale(${z}) translate(${-cx} ${-cy})`}>{children}</g>;
};

// Tam ekran poz (941x1672 → 1080x1920)
const Pose: React.FC<{ n: string; set?: string }> = ({ n, set = "fitness" }) => {
  const src = staticFile(`heykel/${set}/${n}.jpg`);
  useImgReady(src);
  return <image href={src} x={0} y={0} width={1080} height={1920} preserveAspectRatio="xMidYMid slice" />;
};

const Card: React.FC<{ x: number; y: number; w: number; h: number; p: number; r?: number; children?: React.ReactNode; dark?: boolean }> = ({ x, y, w, h, p, r = 0, children, dark }) => {
  if (p <= 0) return null;
  return (
    <g transform={`translate(${x + w / 2} ${y + h / 2}) rotate(${r}) scale(${p}) translate(${-w / 2} ${-h / 2})`} opacity={Math.min(1, p * 1.4)}>
      <rect x={6} y={10} width={w} height={h} rx={28} fill="#000" opacity={0.18} />
      <rect x={0} y={0} width={w} height={h} rx={28} fill={dark ? "#141212" : CREAM} stroke={dark ? "#2c2a28" : "#e6dccb"} strokeWidth={3} />
      {children}
    </g>
  );
};
const T: React.FC<{ x: number; y: number; s: number; c?: string; w?: number; a?: "start" | "middle" | "end"; children: React.ReactNode; hand?: boolean }> = ({ x, y, s, c = INK, w = 800, a = "middle", children, hand }) => (
  <text x={x} y={y} fontFamily={hand ? handFamily : fontFamily} fontWeight={hand ? 400 : w} fontSize={s} fill={c} textAnchor={a}>
    {children}
  </text>
);

// Kreatin kutusu
const Tub: React.FC<{ x: number; y: number; s?: number; r?: number }> = ({ x, y, s = 1, r = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <rect x={-80} y={-130} width={160} height={40} rx={10} fill="#2a2523" />
    <rect x={-90} y={-95} width={180} height={220} rx={24} fill={CREAM} stroke="#d9cdb8" strokeWidth={4} />
    <rect x={-90} y={-40} width={180} height={90} fill={BURGUNDY} />
    <T x={0} y={18} s={34} c={CREAM} w={900}>
      KREATİN
    </T>
    <T x={0} y={92} s={22} c={INK} w={600}>
      monohidrat
    </T>
  </g>
);

// Düşen saç telleri
const Hairs: React.FC<{ f: number; at: number; x: number; y: number }> = ({ f, at, x, y }) => {
  if (f < at) return null;
  return (
    <g>
      {[...Array(7)].map((_, i) => {
        const t = (f - at - i * 3) / 30;
        if (t < 0) return null;
        const hx = x + (i - 3) * 38 + Math.sin(t * 5 + i) * 30;
        const hy = y + t * 520;
        return (
          <path
            key={i}
            d={`M${hx} ${hy} q14 18 0 36 q-14 18 0 36`}
            stroke="#e8d9bf"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            opacity={Math.max(0, 1 - t * 0.9)}
            transform={`rotate(${t * 120 + i * 20} ${hx} ${hy + 36})`}
          />
        );
      })}
    </g>
  );
};

const Stamp: React.FC<{ x: number; y: number; p: number; t: string; c?: string; s?: number; r?: number }> = ({ x, y, p, t, c = RED, s = 64, r = -8 }) => {
  if (p <= 0) return null;
  const k = 1.7 - 0.7 * p;
  const w = t.length * s * 0.62 + 50;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`} opacity={Math.min(1, p * 1.4)}>
      <rect x={-w / 2} y={-s * 0.85} width={w} height={s * 1.35} rx={14} fill="none" stroke={c} strokeWidth={8} />
      <T x={0} y={s * 0.3} s={s} c={c} w={900}>
        {t}
      </T>
    </g>
  );
};

/* ---------- sahneler ---------- */

const FACE06: Key = [0, 524, 250, 2.1];

// 1) Kanca: "Kreatin kullanma, saçın dökülür." — şaşkın tanrıça; kreatin kutusu, saç telleri dökülür
const KreKanca: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  return (
    <g>
      <Cam f={f} keys={[FACE06, [w(2), 516, 300, 1.9], [d, 516, 760, 1.12]]}>
        <Pose n="poz06" set="pilates" />
        <Hairs f={f} at={w(2)} x={510} y={140} />
      </Cam>
      <g opacity={pop(f, w(0) + 4)}>
        <Tub x={880} y={1180} s={1.1 * pop(f, w(0) + 4)} r={8} />
        <path d="M790 1080 L970 1300 M970 1080 L790 1300" stroke={RED} strokeWidth={22} strokeLinecap="round" opacity={prog(f, w(1), w(1) + 6)} />
      </g>
    </g>
  );
};

// 2) Tarih: 2009 Güney Afrika, 20 ragbi oyuncusu, 3 hafta → hormon arttı → saç ölçülmedi
const Ball: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s}) rotate(-25)`}>
    <ellipse cx={0} cy={0} rx={36} ry={22} fill="#8a4b2a" stroke={INK} strokeWidth={3} />
    <path d="M-14 0 L14 0 M-8 -5 L-8 5 M0 -5 L0 5 M8 -5 L8 5" stroke={CREAM} strokeWidth={3} />
  </g>
);
const KreTarih: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const tube = prog(f, w(16), w(19));
  return (
    <g>
      <Cam f={f} keys={[[0, 560, 700, 1.25], [w(16), 600, 640, 1.35], [w(20), 470, 250, 2.0], [d, 470, 270, 2.1]]}>
        <Pose n="poz03" set="erkek" />
        {/* saçın üstünde büyüteç ve "?" */}
        {f >= w(20) ? (
          <g opacity={prog(f, w(20), w(20) + 8)}>
            <circle cx={450} cy={110} r={110} fill="#fff" opacity={0.18} stroke={INK} strokeWidth={10} />
            <path d="M528 188 L600 260" stroke={INK} strokeWidth={22} strokeLinecap="round" />
            <T x={450} y={145} s={120} c={RED} w={900}>
              ?
            </T>
          </g>
        ) : null}
      </Cam>
      {/* bilgi kartları (ekran koordinatı) */}
      {f < w(20) ? (
        <g>
          <Card x={70} y={250} w={460} h={150} p={pop(f, w(6))} r={-3}>
            <T x={230} y={70} s={58} c={BURGUNDY} w={900}>
              2009
            </T>
            <T x={230} y={122} s={34} w={700}>
              Güney Afrika
            </T>
          </Card>
          <Card x={600} y={420} w={410} h={230} p={pop(f, w(9))} r={3}>
            {[...Array(20)].map((_, i) => (
              <Ball key={i} x={52 + (i % 5) * 76} y={50 + Math.floor(i / 5) * 34} s={0.55} />
            ))}
            <T x={205} y={205} s={30} w={800}>
              20 ragbi oyuncusu
            </T>
          </Card>
          <Card x={90} y={700} w={330} h={140} p={pop(f, w(12))} r={-2}>
            <T x={165} y={88} s={52} c={NAVY} w={900}>
              3 hafta
            </T>
          </Card>
          {/* kan tüpü: hormon yükselir */}
          <g opacity={prog(f, w(16), w(16) + 6)} transform="translate(800 930)">
            <rect x={-46} y={-170} width={92} height={300} rx={46} fill="#fff" opacity={0.9} stroke={INK} strokeWidth={6} />
            <rect x={-38} y={120 - 250 * (0.35 + 0.45 * tube)} width={76} height={250 * (0.35 + 0.45 * tube)} rx={36} fill={RED} />
            <path d={`M110 60 L110 ${60 - 160 * tube}`} stroke={RED} strokeWidth={16} strokeLinecap="round" />
            <path d={`M80 ${90 - 160 * tube} L110 ${60 - 160 * tube} L140 ${90 - 160 * tube}`} stroke={RED} strokeWidth={16} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <T x={0} y={190} s={36} w={900} c={INK}>
              HORMON
            </T>
          </g>
        </g>
      ) : (
        <Stamp x={540} y={760} p={pop(f, w(22), 12)} t="SAÇ ÖLÇÜLMEDİ" s={70} />
      )}
    </g>
  );
};

// 3) Bilim: 2025, 12 hafta, 45 sporcu → hormon da saç da değişmedi (eşit çubuklar + lacivert tik)
const KreBilim: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const g1 = prog(f, w(13), w(15));
  const g2 = prog(f, w(16), w(17) + 4);
  const bar = (x: number, h: number, c: string, lbl: string) => (
    <g>
      <rect x={x} y={420 - h} width={70} height={h} rx={10} fill={c} />
      <T x={x + 35} y={455} s={22} w={700}>
        {lbl}
      </T>
    </g>
  );
  return (
    <g>
      <Cam f={f} keys={[[0, 540, 960, 1.0], [d, 560, 940, 1.06]]}>
        <Pose n="poz04" />
      </Cam>
      <Card x={560} y={240} w={470} h={200} p={pop(f, w(0))} r={2}>
        <T x={235} y={78} s={62} c={NAVY} w={900}>
          2025
        </T>
        <T x={235} y={130} s={30} w={700}>
          {f >= w(7) ? "12 hafta" : ""}
          {f >= w(10) ? " · 45 sporcu" : ""}
        </T>
      </Card>
      <Card x={560} y={480} w={470} h={520} p={pop(f, w(13))} r={-1}>
        <T x={120} y={60} s={30} w={900}>
          HORMON
        </T>
        <T x={350} y={60} s={30} w={900}>
          SAÇ
        </T>
        {bar(45, 260 * g1, BURGUNDY, "kreatin")}
        {bar(125, 260 * g1, "#a7a29a", "plasebo")}
        {bar(275, 300 * g2, BURGUNDY, "kreatin")}
        {bar(355, 300 * g2, "#a7a29a", "plasebo")}
        {f >= w(17) ? (
          <g opacity={prog(f, w(17), w(17) + 6)}>
            <path d="M150 498 l40 0" stroke="none" />
            <T x={235} y={505} s={40} c={NAVY} w={900}>
              FARK YOK
            </T>
          </g>
        ) : null}
      </Card>
      {f >= w(17) ? (
        <path d="M860 1080 l40 44 l80 -100" stroke={NAVY} strokeWidth={26} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={240} strokeDashoffset={240 * (1 - prog(f, w(17), w(17) + 8))} />
      ) : null}
    </g>
  );
};

// 4) Tavsiye: günde 5 g, yükleme yok, her gün
const KreTavsiye: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  return (
    <g>
      <Cam f={f} keys={[[0, 540, 1000, 1.15], [w(8), 540, 960, 1.05], [d, 520, 980, 1.1]]}>
        <Pose n="poz07" />
      </Cam>
      <g transform={`translate(830 330) scale(${pop(f, w(1))})`}>
        <circle cx={0} cy={0} r={150} fill={BURGUNDY} />
        <circle cx={0} cy={0} r={150} fill="none" stroke={CREAM} strokeWidth={6} strokeDasharray="6 10" />
        <T x={0} y={20} s={110} c={CREAM} w={900}>
          5 g
        </T>
        <T x={0} y={82} s={30} c={CREAM} w={700}>
          günde
        </T>
      </g>
      <Card x={60} y={240} w={420} h={170} p={pop(f, w(4))} r={-3}>
        <T x={210} y={78} s={40} w={800} c="#8b847b">
          yükleme: 20 g
        </T>
        <T x={210} y={128} s={30} w={600} c="#8b847b">
          × 7 gün
        </T>
        <path d="M40 30 L380 140" stroke={RED} strokeWidth={14} strokeLinecap="round" opacity={prog(f, w(6), w(7))} />
      </Card>
      {/* her gün: 7 kutu sırayla lacivert tik */}
      {f >= w(10) ? (
        <g transform="translate(540 1280)">
          {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((dn, i) => {
            const on = prog(f, w(10) + i * 3, w(10) + i * 3 + 4);
            return (
              <g key={i} transform={`translate(${(i - 3) * 128} 0) scale(${pop(f, w(10) + i * 2)})`}>
                <rect x={-54} y={-54} width={108} height={108} rx={18} fill={on > 0.5 ? NAVY : CREAM} stroke={INK} strokeWidth={4} />
                <T x={0} y={-12} s={26} w={700} c={on > 0.5 ? CREAM : INK}>
                  {dn}
                </T>
                {on > 0 ? <path d="M-22 14 l14 16 l30 -34" stroke={on > 0.5 ? LIME : NAVY} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={80} strokeDashoffset={80 * (1 - on)} /> : null}
              </g>
            );
          })}
        </g>
      ) : null}
    </g>
  );
};

// 5) VOOM: suplement hatırlatıcı — telefona yakınlaşma, gerçek ekran (Kreatin 5g, her gün), bildirim + tik
const SUP = staticFile("app/suplement-kreatin.jpg");
// poz05'te telefon ekranı (1080 koordinatı)
const PH = { x: 551, y: 312, w: 73, h: 152 };
const KreVoom: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  useImgReady(SUP);
  const zoom = prog(f, 0, w(2));
  const big = pop(f, w(1), 14);
  const tick = prog(f, w(6), w(7) + 6);
  return (
    <g>
      <Cam f={f} keys={[[0, 540, 900, 1.05], [w(2), 590, 420, 2.0], [d, 590, 430, 2.05]]}>
        <Pose n="poz05" set="pilates" />
        {/* telefon ekranında VOOM */}
        <clipPath id="kreScreen">
          <rect x={PH.x} y={PH.y} width={PH.w} height={PH.h} rx={8} />
        </clipPath>
        <rect x={PH.x} y={PH.y} width={PH.w} height={PH.h} fill="#0d0d0d" />
        <image href={SUP} x={PH.x} y={PH.y + 10} width={PH.w} height={PH.w * (420 / 384)} clipPath="url(#kreScreen)" opacity={zoom} />
      </Cam>
      {/* büyük ekran kartı */}
      {big > 0 ? (
        <g transform={`translate(540 1060) scale(${big}) translate(-300 -330)`}>
          <rect x={10} y={16} width={600} height={656} rx={34} fill="#000" opacity={0.25} />
          <rect x={0} y={0} width={600} height={656} rx={34} fill="#0f0f0f" stroke="#2c2a28" strokeWidth={4} />
          <image href={SUP} x={0} y={0} width={600} height={656} preserveAspectRatio="xMidYMid slice" />
          {/* Kreatin satırı vurgusu */}
          <rect x={44} y={418} width={516} height={96} rx={16} fill="none" stroke={LIME} strokeWidth={6} opacity={prog(f, w(3), w(4))} />
          {/* "Sabah suplementlerini aldım" tik */}
          {tick > 0 ? (
            <g>
              <rect x={68} y={548} width={466} height={64} rx={14} fill={LIME} opacity={0.25 * tick} />
              <path d="M484 566 l16 18 l34 -38" stroke={LIME} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={90} strokeDashoffset={90 * (1 - tick)} />
            </g>
          ) : null}
        </g>
      ) : null}
      {/* bildirim */}
      <g transform={`translate(0 ${-200 + 380 * pop(f, w(3), 12)})`}>
        <rect x={60} y={0} width={960} height={130} rx={34} fill="#141212" opacity={0.95} />
        <circle cx={130} cy={65} r={38} fill="#000" stroke="#3a3735" strokeWidth={3} />
        <T x={130} y={76} s={26} c="#fff" w={800}>
          voom
        </T>
        <circle cx={168} cy={74} r={5} fill={LIME} />
        <T x={200} y={56} s={30} c="#fff" w={800} a="start">
          Sabah suplementlerin
        </T>
        <T x={200} y={98} s={28} c="#cfc9c0" w={500} a="start">
          Kreatin 5 g · her gün
        </T>
      </g>
    </g>
  );
};

// Açılış karesi (döngü için kapanışta da çizilir)
const Opening: React.FC = () => (
  <Cam f={0} keys={[FACE06]}>
    <Pose n="poz06" set="pilates" />
  </Cam>
);

// 6) Kapanış: "Bunu, saçı yüzünden kreatini bırakan arkadaşına gönder. Çünkü ona da şunu dediler:"
const KreSon: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const fly = prog(f, w(6), w(8) + 4);
  const opening = f >= w(8) + 4;
  return (
    <g>
      {!opening ? (
        <g>
          <Cam f={f} keys={[[0, 540, 960, 1.0], [w(5), 540, 820, 1.18]]}>
            <Pose n="poz01" set="erkek" />
          </Cam>
          {(() => {
            const sc = 0.7 + fly * fly * 16;
            return (
              <g transform={`translate(${760 - fly * 220} ${760 - fly * 200}) scale(${sc}) rotate(${-12 + fly * 22})`}>
                <path d="M-70 -30 L70 0 L-70 30 L-40 0 Z" fill={CREAM} stroke={INK} strokeWidth={5 / Math.max(1, sc * 0.4)} />
                <path d="M-40 0 L70 0" stroke={INK} strokeWidth={4 / Math.max(1, sc * 0.4)} />
              </g>
            );
          })()}
        </g>
      ) : (
        <g>
          <Opening />
          <rect x={0} y={0} width={1080} height={1920} fill={CREAM} opacity={1 - prog(f, w(8) + 4, Math.min(d - 2, w(8) + 12))} />
        </g>
      )}
    </g>
  );
};

export const KREATIN_SCENES: Record<string, React.FC<SceneProps>> = {
  "kre-kanca": KreKanca,
  "kre-tarih": KreTarih,
  "kre-bilim": KreBilim,
  "kre-tavsiye": KreTavsiye,
  "kre-voom": KreVoom,
  "kre-son": KreSon,
};
