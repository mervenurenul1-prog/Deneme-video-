// VOOM tanıtımı (erkek odaklı) — "Bacak günü": göğüs/kol hiç kaçmaz, bacak günü hep ertelenir → üstü tanrı, bacaklar
// çubuk kraker. Anlatıcı Yunus. Görseller public/heykel/bacak/bN.png (ChatGPT, aynı salon) + bN-glow.png (fotoğraftan ayrılmış
// yeşil damar ışığı, `Alive` ile nabız gibi atar). Sahneler `bc-*`; kelime zamanı w(i).
import React from "react";
import { useCurrentFrame } from "remotion";
import { fontFamily } from "../fonts";
import { CHOC } from "./Arama";
import { Alive } from "./Demo";
import { camAt, CREAM, LIME, Logo, pop, prog, RED, Screen, Stamp, T, type Key } from "./GizliCekim";

type SceneProps = { d: number; w: (i: number) => number };

const B = (n: number) => `heykel/bacak/b${n}`;

// Kamera: anahtar karelerle yakınlık/konum (görsel dışına taşmaz)
const Shot: React.FC<{ f: number; keys: Key[]; children: React.ReactNode }> = ({ f, keys, children }) => {
  const [, cx0, cy0, z0] = camAt(f, keys);
  const z = Math.max(1, z0);
  const cx = Math.min(1080 - 540 / z, Math.max(540 / z, cx0));
  const cy = Math.min(1920 - 960 / z, Math.max(960 / z, cy0));
  return <g transform={`translate(540 960) scale(${z}) translate(${-cx} ${-cy})`}>{children}</g>;
};

// Telefon bildirimi (üstten iner)
const Notice: React.FC<{ p: number; title: string; body: string; y?: number; children?: React.ReactNode }> = ({ p, title, body, y = 120, children }) => (
  <g transform={`translate(0 ${-300 + (y + 300) * p})`} opacity={Math.min(1, p * 1.5)}>
    <rect x={50} y={0} width={980} height={250} rx={40} fill="#141212" opacity={0.96} />
    <circle cx={130} cy={78} r={44} fill="#000" stroke="#3a3735" strokeWidth={3} />
    <T x={124} y={90} s={30} w={800}>
      voom
    </T>
    <circle cx={168} cy={84} r={5} fill={LIME} />
    <T x={196} y={70} s={30} c={LIME} w={800} a="start">
      {title}
    </T>
    <T x={90} y={170} s={40} w={700} a="start">
      {body}
    </T>
    {children}
  </g>
);

// 1) "Bacak günü geldi mi hep bir işin çıkıyor. Ama göğüs günü, kol günü? Onları hiç kaçırmıyorsun."
// Bankta telefona bakıp göz deviren tanrı; "BACAK GÜNÜ" bildirimi → "Ertele"ye basılır. "Ama"da kesme: yemyeşil yanan kollar.
const BcKanca: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const cut = f >= w(8);
  const n = pop(f, 0, 12);
  const press = prog(f, w(5), w(6));
  return (
    <g>
      {!cut ? (
        <g>
          <Shot f={f} keys={[[0, 520, 900, 1.25], [w(8), 560, 760, 1.5]]}>
            <Alive f={f} d={d} base={B(1)} flat push={0.02} />
          </Shot>
          <Notice p={n} title="BUGÜN" body="Bacak günü. Başlayalım mı?">
            <g transform="translate(560 190)">
              <rect x={0} y={-6} width={190} height={56} rx={28} fill="#2a2726" />
              <T x={95} y={32} s={30} w={800}>
                Başla
              </T>
              <rect x={210} y={-6} width={200} height={56} rx={28} fill={press > 0.5 ? RED : "#2a2726"} transform={`translate(${310} ${22}) scale(${1 - 0.08 * Math.sin(press * Math.PI)}) translate(${-310} ${-22})`} />
              <T x={310} y={32} s={30} w={800}>
                Ertele
              </T>
            </g>
          </Notice>
        </g>
      ) : (
        <g>
          <Shot f={f} keys={[[w(8), 520, 520, 2.0], [d, 520, 500, 2.15]]}>
            <Alive f={f} d={d} base={B(4)} flat push={0.02} pulse={0.8} />
          </Shot>
          <Stamp x={300} y={1180} p={pop(f, w(9), 10)} t="GÖĞÜS ✓" c={LIME} s={70} r={-6} />
          <Stamp x={780} y={1300} p={pop(f, w(11), 10)} t="KOL ✓" c={LIME} s={70} r={5} />
        </g>
      )}
      <rect width={1080} height={1920} fill="#fff" opacity={cut ? Math.max(0, 0.4 - (f - w(8)) / 8) : 0} />
    </g>
  );
};

// Tuzlu çubuk kraker (çizim)
const Stick: React.FC<{ x: number; y: number; h: number; r: number; p: number }> = ({ x, y, h, r, p }) =>
  p > 0 ? (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${p})`}>
      <rect x={-14} y={-h / 2} width={28} height={h} rx={14} fill="#c98a3d" stroke="#8a5a22" strokeWidth={4} />
      {[...Array(9)].map((_, i) => (
        <rect key={i} x={-6 + (i % 2) * 6} y={-h / 2 + 20 + i * ((h - 40) / 9)} width={6} height={5} rx={2} fill="#fbf6ee" />
      ))}
    </g>
  ) : null;

// 2) "Sonuç: üst vücudun tanrı gibi, bacakların çubuk kraker." — yemyeşil kollardan aşağı iner: ince, sönük bacaklar;
// yanında iki çubuk kraker belirir
const BcKraker: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const sp = pop(f, w(6), 12);
  return (
    <g>
      <Shot f={f} keys={[[0, 520, 500, 2.15], [w(4), 540, 560, 1.7], [w(5) + 8, 540, 1000, 1.0], [d, 540, 980, 1.04]]}>
        <Alive f={f} d={d} base={B(4)} flat push={0.02} pulse={0.8} />
      </Shot>
      <T x={540} y={330} s={70} c={LIME} w={900}>
        {f >= w(2) && f < w(5) ? "TANRI" : ""}
      </T>
      <Stick x={210} y={1220} h={420} r={-8} p={sp} />
      <Stick x={880} y={1230} h={420} r={9} p={pop(f, w(6) + 4, 12)} />
      <Stamp x={540} y={1000} p={pop(f, w(7), 12)} t="ÇUBUK KRAKER" s={78} />
    </g>
  );
};

// 3) "Oysa vücudunun en büyük kasları bacaklarında. Gücünün de dengenin de temeli orası." — bankta oturan tanrı; uyluk ve
// kalça kalın yeşil çizgiyle belirir; "temeli"nde ayakların altına yeşil zemin çizgisi
const BcBuyuk: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const hl = prog(f, w(2), w(5));
  return (
    <g>
      <Shot f={f} keys={[[0, 540, 800, 1.3], [w(3), 560, 1060, 1.45], [d, 560, 1080, 1.5]]}>
        <Alive f={f} d={d} base={B(2)} flat push={0.02} />
        {hl > 0 ? (
          <g fill="none" stroke={LIME} strokeWidth={10} strokeLinecap="round" opacity={0.9}>
            <ellipse cx={400} cy={990} rx={130} ry={66} transform="rotate(-14 400 990)" strokeDasharray={600} strokeDashoffset={600 * (1 - hl)} />
            <ellipse cx={720} cy={975} rx={175} ry={70} transform="rotate(6 720 975)" strokeDasharray={800} strokeDashoffset={800 * (1 - hl)} />
          </g>
        ) : null}
        <rect x={250} y={1640} width={720 * prog(f, w(10), w(11) + 4)} height={14} rx={7} fill={LIME} />
      </Shot>
      <g transform={`translate(540 420) scale(${pop(f, w(3), 12)})`}>
        <rect x={-330} y={-70} width={660} height={130} rx={36} fill="#0c0c0d" opacity={0.85} stroke={LIME} strokeWidth={4} />
        <T x={0} y={18} s={52} c={CREAM} w={900}>
          en büyük kaslar
        </T>
      </g>
    </g>
  );
};

// bugun.jpg (1290x2622): başlık "Alt Vücut · Arka Bacak & Kalça" y≈230..440, "Sıradaki · Üst Vücut" y≈840..990
// 4) "VOOM haftanı dengeli kurar: bir gün üst vücut, bir gün bacak. Ne yapacağın her sabah hazır."
const BcVoom: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const logo = pop(f, 0, 12) * (1 - prog(f, w(2) - 4, w(2) + 2));
  const card = pop(f, w(2), 14);
  return (
    <g>
      <Shot f={f} keys={[[0, 540, 760, 1.3], [d, 560, 700, 1.45]]}>
        <Alive f={f} d={d} base={B(3)} flat push={0.02} />
      </Shot>
      <rect width={1080} height={1920} fill="#000" opacity={0.25 * card} />
      <g transform={`translate(540 700) scale(${logo})`} opacity={Math.min(1, logo * 1.4)}>
        <Logo x={0} y={0} s={180} />
      </g>
      <Screen src="app/bugun.jpg" iw={1290} ih={2622} crop={[20, 150, 1250, 900]} x={540} y={820} wd={900} p={card} r={-1}>
        <rect x={60} y={820} width={1180} height={190} rx={22} fill="none" stroke={LIME} strokeWidth={10} opacity={prog(f, w(6), w(7))} />
        <rect x={60} y={210} width={1180} height={250} rx={22} fill="none" stroke={LIME} strokeWidth={10} opacity={prog(f, w(9), w(10))} />
      </Screen>
    </g>
  );
};

// 5) "Bacak gününü kaçırırsan koçun onu kaydırır, ama silmez." — koçun gerçek mesajı: "Perşembe → Çarşamba: Alt Vücut günü
// bugüne alındı"; "silmez"de yeşil tik
const BcKoc: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const msg = pop(f, w(2), 14);
  return (
    <g>
      <Shot f={f} keys={[[0, 560, 640, 1.6], [d, 560, 600, 1.75]]}>
        <Alive f={f} d={d} base={B(3)} flat push={0.02} />
      </Shot>
      <rect width={1080} height={1920} fill="#000" opacity={0.3 * msg} />
      <Screen src="app/koc.jpg" iw={1290} ih={2622} crop={[30, 1560, 1240, 640]} x={540} y={820} wd={900} p={msg} r={1} />
      {f >= w(7) ? (
        <path d="M780 1180 l40 44 l80 -100" stroke={LIME} strokeWidth={24} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={240} strokeDashoffset={240 * (1 - prog(f, w(7), w(7) + 8))} />
      ) : null}
    </g>
  );
};

// 6) "Ve ilk kez bacakların da yanar." — squat; bacak damarları sönükten yemyeşile yanar, beyaz parlama, her tepe hafif sarsıntı
const BcYanar: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const amt = prog(f, w(2), w(5));
  const flash = f >= w(5) ? Math.max(0, 0.45 - (f - w(5)) / 10) : 0;
  const sh = f >= w(5) && f < w(5) + 10 ? Math.sin(f * 2.3) * 10 * (1 - (f - w(5)) / 10) : 0;
  return (
    <g transform={`translate(${sh} 0)`}>
      <Shot f={f} keys={[[0, 540, 760, 1.15], [w(5), 540, 1080, 1.4], [d, 540, 1100, 1.45]]}>
        <Alive f={f} d={d} base={B(5)} flat push={0.02} pulse={0.7} glowAmt={0.15 + 0.85 * amt} />
      </Shot>
      <rect width={1080} height={1920} fill="#e8ffc0" opacity={flash} />
    </g>
  );
};

// 7) "VOOM yakında, linki profilde. Bunu bacak gününü atlayan arkadaşına gönder." — güçlü bacaklarıyla gülümseyen tanrı + logo
const BcSon: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const logo = pop(f, 0, 14) * (1 - prog(f, w(4) - 4, w(4) + 2));
  const send = pop(f, w(4), 12) * (1 - prog(f, d - 22, d - 12));
  return (
    <g>
      <Shot f={f} keys={[[0, 540, 900, 1.15], [d, 540, 880, 1.25]]}>
        <Alive f={f} d={d} base={B(6)} flat push={0.02} />
      </Shot>
      {logo > 0 ? (
        <g opacity={Math.min(1, logo * 1.3)}>
          <rect x={170} y={1050} width={740} height={340} rx={44} fill="#0c0c0d" opacity={0.85} />
          <g transform={`translate(540 1200) scale(${logo})`}>
            <Logo x={0} y={0} s={140} />
          </g>
          <T x={540} y={1285} s={48} c={CREAM} w={700}>
            yakında
          </T>
          <g opacity={prog(f, w(2), w(2) + 6)}>
            <T x={540} y={1350} s={38} c={LIME} w={800}>
              link profilde ↗
            </T>
          </g>
        </g>
      ) : null}
      {send > 0 ? (
        <g transform={`translate(540 1200) scale(${send})`}>
          <rect x={-420} y={-80} width={840} height={150} rx={40} fill={CREAM} />
          <text x={0} y={18} fontFamily={fontFamily} fontWeight={900} fontSize={44} fill={CHOC} textAnchor="middle">
            Bacak gününü atlayana gönder →
          </text>
        </g>
      ) : null}
    </g>
  );
};

export const BACAK_SCENES: Record<string, React.FC<SceneProps>> = {
  "bc-kanca": BcKanca,
  "bc-kraker": BcKraker,
  "bc-buyuk": BcBuyuk,
  "bc-voom": BcVoom,
  "bc-koc": BcKoc,
  "bc-yanar": BcYanar,
  "bc-son": BcSon,
};
