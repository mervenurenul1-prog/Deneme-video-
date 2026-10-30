// Ücretsiz hareket denemesi: tek fotoğraf → 2.5D derinlik (dekupe ön plan + bulanık arka plan farklı hızda kayar),
// nefes alan karakter, nabız gibi atan yeşil damarlar (fotoğraftan ayrılmış ışık katmanı), ışık süpürmesi. Sahne `dm-*`.
import React, { useId } from "react";
import { random, staticFile, useCurrentFrame } from "remotion";
import { prog, useImgReady } from "./GizliCekim";

type SceneProps = { d: number; w: (i: number) => number };

// base: görselin yolu (uzantısız); base-bg.jpg = karakteri silinmiş (inpaint) arka plan, base-cut.png = dekupe, base-glow.png = damar ışığı
export const Alive: React.FC<{ f: number; d: number; base: string; push?: number; pulse?: number; ox?: number; oy?: number; flat?: boolean }> = ({ f, d, base, push = 0.12, pulse = 1.2, ox = 540, oy = 760, flat = false }) => {
  const id = useId().replace(/:/g, "");
  const full = staticFile(`${base}-bg.jpg`);
  const cut = staticFile(`${base}-cut.png`);
  const glow = staticFile(`${base}-glow.png`);
  useImgReady(full);
  useImgReady(cut);
  useImgReady(glow);
  const t = prog(f, 0, d);
  // kamera: ön plan daha çok yaklaşır ve ters yöne kayar (derinlik)
  const zf = 1.04 + push * t;
  const zb = 1.1 + push * 0.4 * t;
  const px = interpolateX(t);
  const breath = 1 + 0.006 * Math.sin(f / 14);
  // nabız: her pulse saniyede bir tepe (tekrar ritmi)
  const ph = (f / 30 / pulse) % 1;
  const beat = Math.pow(Math.max(0, Math.sin(ph * Math.PI)), 2);
  const g = 0.35 + 0.65 * beat;
  const sweep = ((f / 30) % 3) / 3;
  return (
    <g>
      <filter id={`bb${id}`}>
        <feGaussianBlur stdDeviation={7} />
      </filter>
      <filter id={`gl${id}`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation={14} />
      </filter>
      <linearGradient id={`sw${id}`} x1="0" x2="1" y1="0" y2="0.3">
        <stop offset="0" stopColor="#fff" stopOpacity={0} />
        <stop offset="0.5" stopColor="#fff" stopOpacity={0.12} />
        <stop offset="1" stopColor="#fff" stopOpacity={0} />
      </linearGradient>
      {/* arka plan: bulanık, yavaş, ters yöne (flat: dekupe temiz değilse tek katman) */}
      <g opacity={flat ? 0 : 1} transform={`translate(${ox - px * 30} ${oy}) scale(${zb}) translate(${-ox} ${-oy})`} filter={`url(#bb${id})`}>
        <image href={full} x={0} y={0} width={1080} height={1920} preserveAspectRatio="xMidYMid slice" />
      </g>
      {/* ön plan: dekupe karakter + damar ışığı */}
      <g transform={`translate(${ox + px * 18} ${oy}) scale(${zf}) translate(${-ox} ${-oy})`}>
        <g transform={`translate(540 1700) scale(1 ${breath}) translate(-540 -1700)`}>
          <image href={flat ? staticFile(`${base}.png`) : cut} x={0} y={0} width={1080} height={1920} preserveAspectRatio="xMidYMid slice" />
          <image href={glow} x={0} y={0} width={1080} height={1920} preserveAspectRatio="xMidYMid slice" filter={`url(#gl${id})`} opacity={0.9 * g} />
          <image href={glow} x={0} y={0} width={1080} height={1920} preserveAspectRatio="xMidYMid slice" opacity={0.55 * g} />
        </g>
      </g>
      {/* ışık süpürmesi + toz */}
      <rect x={-600 + sweep * 2200} y={0} width={500} height={1920} fill={`url(#sw${id})`} transform="skewX(-12)" />
      {[...Array(16)].map((_, i) => {
        const x = random(`px${i}`) * 1080;
        const y = (random(`py${i}`) * 1920 - f * (0.5 + random(`ps${i}`))) % 1920;
        return <circle key={i} cx={x} cy={y < 0 ? y + 1920 : y} r={1.5 + random(`pr${i}`) * 2.5} fill="#e9ffc0" opacity={0.25} />;
      })}
    </g>
  );
};
const interpolateX = (t: number) => -1 + 2 * t;

const DmDamar: React.FC<SceneProps> = ({ d }) => {
  const f = useCurrentFrame();
  return <Alive f={f} d={d} base="heykel/yeni/erkek-calisma" ox={600} oy={700} flat />;
};

export const DEMO_SCENES: Record<string, React.FC<SceneProps>> = {
  "dm-damar": DmDamar,
};
