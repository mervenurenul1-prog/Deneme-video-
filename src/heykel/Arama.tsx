// VOOM spor programı tanıtımı — "Yine aynı arama": salonda ne yapacağını bilmemek. Anlatıcı kullanıcının sesi.
// Dekupe tanrıça (public/heykel/dekupe/fitnessNN.png, gri fon silinmiş) tasarlanmış sahnelerde: dert = soğuk karanlık sahne +
// telefonun içi (arama kutusu, birbirini tutmayan video akışı); VOOM = sıcak çikolata zemin + fıstık yeşili ışık + gerçek ekranlar;
// final = buğulu aynada tanrıçalar (Artemis, Athena, Amphitrite). Sahneler `ar-*`; kelime zamanı w(i).
import React, { useId } from "react";
import { Easing, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { fontFamily } from "../fonts";
import { CREAM, LIME, Logo, pop, prog, RED, Screen, T, useImgReady } from "./GizliCekim";

type SceneProps = { d: number; w: (i: number) => number };

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
export const CHOC = "#2a1912";
// aynada görünen hâl: khitonlu tanrıça heykeli (kullanıcının seçtiği; art arda üç tanrıça reddedildi)
const GODS = ["heykel/khiton/kaide-v2.png"];

/* ---------- sahne zemini ---------- */

// mood: "cold" (dert: gece mavisi, kırmızı vurgu) | "warm" (VOOM: çikolata + fıstık yeşili ışık)
export const Stage: React.FC<{ f: number; mood: "cold" | "warm"; word?: string; wordO?: number }> = ({ f, mood, word, wordO = 1 }) => {
  const id = useId().replace(/:/g, "");
  const warm = mood === "warm";
  const top = warm ? "#3a2418" : "#141a24";
  const bot = warm ? "#120a07" : "#07090d";
  const glow = warm ? LIME : "#5d7bb0";
  return (
    <g>
      <linearGradient id={`sg${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={top} />
        <stop offset="1" stopColor={bot} />
      </linearGradient>
      <radialGradient id={`sl${id}`} cx="0.5" cy="0.42" r="0.5">
        <stop offset="0" stopColor={glow} stopOpacity={warm ? 0.32 : 0.22} />
        <stop offset="1" stopColor={glow} stopOpacity={0} />
      </radialGradient>
      <rect width={1080} height={1920} fill={`url(#sg${id})`} />
      {/* arkada dev, içi boş harfler */}
      {word ? (
        <text x={540 + Math.sin(f / 50) * 20} y={900} fontFamily={fontFamily} fontWeight={900} fontSize={word.length > 3 ? 300 : 520} textAnchor="middle" fill="none" stroke={warm ? LIME : "#6f7d96"} strokeWidth={4} opacity={0.18 * wordO}>
          {word}
        </text>
      ) : null}
      <ellipse cx={540} cy={820} rx={620 + 20 * Math.sin(f / 30)} ry={900} fill={`url(#sl${id})`} />
      {/* ışık huzmeleri */}
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${380 + i * 160} -40 L${200 + i * 260} 1700 L${330 + i * 260} 1700 Z`} fill={glow} opacity={0.035 + 0.02 * Math.sin(f / 40 + i)} />
      ))}
      {/* parlak zemin */}
      <ellipse cx={540} cy={1520} rx={560} ry={70} fill={glow} opacity={warm ? 0.12 : 0.08} />
      {/* toz */}
      {[...Array(18)].map((_, i) => {
        const x = random(`dx${i}`) * 1080;
        const y = (random(`dy${i}`) * 1920 - f * (0.6 + random(`ds${i}`))) % 1920;
        return <circle key={i} cx={x + Math.sin(f / 25 + i) * 10} cy={y < 0 ? y + 1920 : y} r={2 + random(`dr${i}`) * 3} fill="#fff" opacity={0.15} />;
      })}
    </g>
  );
};

// Dekupe tanrıça: alt orta noktası (x, y), boyu h (görselin tam boyu, 941x1672 oranında)
export const Cut: React.FC<{ n: string; x: number; y: number; h: number; o?: number; flip?: boolean }> = ({ n, x, y, h, o = 1, flip }) => {
  const url = staticFile(`heykel/dekupe/fitness${n}.png`);
  useImgReady(url);
  const wd = h * (941 / 1672);
  return (
    <g opacity={o}>
      <ellipse cx={x} cy={y - h * 0.012} rx={wd * 0.32} ry={h * 0.02} fill="#000" opacity={0.45} />
      <image href={url} x={flip ? -x - wd / 2 : x - wd / 2} y={y - h} width={wd} height={h} transform={flip ? "scale(-1 1)" : undefined} />
    </g>
  );
};

// Görselden kırpılmış küçük resim (video kapağı)
export const Thumb: React.FC<{ src: string; x: number; y: number; w: number; h: number; vb: string }> = ({ src, x, y, w, h, vb }) => {
  const url = staticFile(src);
  useImgReady(url);
  return (
    <svg x={x} y={y} width={w} height={h} viewBox={vb} preserveAspectRatio="xMidYMid slice">
      <image href={url} x={0} y={0} width={941} height={1672} />
    </svg>
  );
};

/* ---------- telefonun içi ---------- */

const QUERY = "kalça antrenmanı nasıl yapılır";

// Arama kutusu: yazılan harf sayısı n, imleç yanıp söner
const SearchBar: React.FC<{ f: number; n: number; y?: number }> = ({ f, n, y = 300 }) => (
  <g>
    <rect x={70} y={y} width={940} height={120} rx={60} fill="#1e2229" stroke="#3a404b" strokeWidth={3} />
    <circle cx={140} cy={y + 58} r={22} fill="none" stroke="#c9ced8" strokeWidth={6} />
    <path d={`M156 ${y + 74} L178 ${y + 96}`} stroke="#c9ced8" strokeWidth={7} strokeLinecap="round" />
    <text x={200} y={y + 74} fontFamily={fontFamily} fontWeight={600} fontSize={44} fill="#eef1f6">
      {QUERY.slice(0, Math.max(0, Math.min(QUERY.length, Math.floor(n))))}
      <tspan fill={LIME} opacity={Math.floor(f / 8) % 2 ? 1 : 0}>
        |
      </tspan>
    </text>
  </g>
);

// Arama geçmişi: aynı sorgu defalarca (saat simgesiyle)
const History: React.FC<{ f: number; count: number; a: number; y?: number }> = ({ f, count, a, y = 470 }) => (
  <g>
    {[...Array(count)].map((_, i) => {
      const p = pop(f, a + i * 3, 8);
      if (p <= 0) return null;
      return (
        <g key={i} transform={`translate(0 ${y + i * 92})`} opacity={Math.min(1, p) * (1 - i * 0.08)}>
          <circle cx={130} cy={0} r={20} fill="none" stroke="#8a919e" strokeWidth={4} />
          <path d="M130 -10 V0 L138 6" stroke="#8a919e" strokeWidth={4} fill="none" strokeLinecap="round" />
          <text x={180} y={14} fontFamily={fontFamily} fontWeight={500} fontSize={40} fill="#aab1bd">
            {QUERY}
          </text>
        </g>
      );
    })}
  </g>
);

// Video akışı kartları: birbirini tutmayan başlıklar
const FEED: { t: string; src: string; vb: string; dur: string; red?: boolean }[] = [
  { t: "KALÇA İÇİN TEK HAREKET", src: "heykel/fitness/poz07.jpg", vb: "150 500 700 420", dur: "0:58" },
  { t: "BU MAKİNE HER ŞEYİ DEĞİŞTİRDİ", src: "heykel/erkek/poz08.jpg", vb: "100 450 760 460", dur: "12:04" },
  { t: "ASLA SQUAT YAPMA!", src: "heykel/erkek/poz07.jpg", vb: "150 450 700 420", dur: "8:31", red: true },
  { t: "PİLATES Mİ AĞIRLIK MI?", src: "heykel/pilates/poz07.jpg", vb: "100 650 760 460", dur: "15:22" },
  { t: "30 GÜNDE KALÇA", src: "heykel/fitness/poz02.jpg", vb: "200 500 700 420", dur: "0:41" },
  { t: "HOCALAR BUNU SÖYLEMİYOR", src: "heykel/erkek/poz03.jpg", vb: "150 120 700 420", dur: "21:10", red: true },
];
const CARD_H = 520;
const Card: React.FC<{ i: number; y: number; hi: number }> = ({ i, y, hi }) => {
  const c = FEED[i % FEED.length];
  return (
    <g transform={`translate(70 ${y})`}>
      <rect x={0} y={0} width={940} height={CARD_H - 40} rx={34} fill="#161a20" stroke={hi > 0 ? LIME : "#2c313a"} strokeWidth={hi > 0 ? 6 : 3} />
      <Thumb src={c.src} x={20} y={20} w={900} h={330} vb={c.vb} />
      {/* oynat simgesi + süre */}
      <circle cx={470} cy={185} r={52} fill="#000" opacity={0.55} />
      <path d="M452 158 L496 185 L452 212 Z" fill="#fff" />
      <rect x={800} y={300} width={100} height={40} rx={10} fill="#000" opacity={0.75} />
      <text x={850} y={330} fontFamily={fontFamily} fontWeight={700} fontSize={28} fill="#fff" textAnchor="middle">
        {c.dur}
      </text>
      <text x={30} y={420} fontFamily={fontFamily} fontWeight={900} fontSize={46} fill={c.red ? "#ff5a4f" : "#f2f4f8"}>
        {c.t}
      </text>
    </g>
  );
};

/* ---------- sahneler ---------- */

// telefon ekranının dekupe poz05'teki yeri (941x1672 görsel koordinatı)
const PHONE5 = { x: 558, y: 297, w: 58, h: 112 };

// 1) "Salona giriyorsun, telefonu açıp yine aynı şeyi yazıyorsun."
// Soğuk sahnede telefona bakan tanrıça → kamera telefonun içine dalar → arama kutusu, altında aynı sorgu defalarca
const ArKanca: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const dive = interpolate(f, [w(2) - 6, w(3) + 2], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const H = 1480;
  // telefonun ekrandaki merkezi
  const px = 540 - (H * (941 / 1672)) / 2 + (PHONE5.x + PHONE5.w / 2) * (H / 1672);
  const py = 1560 - H + (PHONE5.y + PHONE5.h / 2) * (H / 1672);
  const z = 1 + dive * 14;
  return (
    <g>
      {dive < 1 ? (
        <g transform={`translate(${px} ${py}) scale(${z * (1 + 0.04 * prog(f, 0, w(2)))}) translate(${-px} ${-py})`}>
          <Stage f={f} mood="cold" word="?" />
          <Cut n="05" x={540} y={1560} h={H} />
          {/* telefon ekranı yanıyor (arama ekranı) */}
          <rect x={px - (PHONE5.w * H) / 1672 / 2} y={py - (PHONE5.h * H) / 1672 / 2} width={(PHONE5.w * H) / 1672} height={(PHONE5.h * H) / 1672} rx={6} fill="#1b2433" />
          <rect x={px - (PHONE5.w * H) / 1672 / 2 + 4} y={py - (PHONE5.h * H) / 1672 / 2 + 14} width={(PHONE5.w * H) / 1672 - 8} height={9} rx={4} fill="#3a4556" />
          <ellipse cx={px} cy={py} rx={80} ry={110} fill="#7fa4ff" opacity={0.12 + 0.04 * Math.sin(f / 6)} />
        </g>
      ) : null}
      {dive > 0.6 ? (
        <g opacity={prog(f, w(3) - 4, w(3) + 3)}>
          <rect width={1080} height={1920} fill="#0d1015" />
          <SearchBar f={f} n={interpolate(f, [w(4), w(7) + 8], [0, QUERY.length], clamp)} y={240} />
          <text x={110} y={470} fontFamily={fontFamily} fontWeight={700} fontSize={32} fill="#6b7280">
            SON ARAMALAR
          </text>
          <History f={f} count={6} a={w(5)} y={560} />
        </g>
      ) : null}
    </g>
  );
};

// 2) "Bir videoda squat, ötekinde makine. Bir saat sonra çıkıyorsun ama neyi çalıştırdığını bilmiyorsun."
// Birbirini tutmayan video akışı hızla kayar → telefondan çıkılır: düşünceli tanrıça, saat bir tur döner, "?" işaretleri
const ArAkis: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const out = prog(f, w(5) - 4, w(5) + 4);
  // akış: kelimelerde hızlanan kaydırma
  const scroll = interpolate(f, [0, w(2), w(4), w(5)], [0, CARD_H * 0.6, CARD_H * 2.4, CARD_H * 5.2], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const clockA = prog(f, w(6), w(8) + 6);
  return (
    <g>
      {out < 1 ? (
        <g opacity={1 - out} transform={`translate(540 960) scale(${1 - 0.15 * out}) translate(-540 -960)`}>
          <rect width={1080} height={1920} fill="#0d1015" />
          <g transform={`translate(0 ${200 - scroll})`}>
            {[...Array(9)].map((_, i) => (
              <Card key={i} i={i} y={i * CARD_H} hi={(i === 0 && f >= w(2) - 3 && f < w(3)) || (i === 1 && f >= w(3) && f < w(4) + 4) ? 1 : 0} />
            ))}
          </g>
          {/* hız bulanıklığı hissi: kenar karartma */}
          <rect width={1080} height={260} fill="#0d1015" opacity={0.85} />
          <SearchBar f={f} n={QUERY.length} y={90} />
        </g>
      ) : null}
      {out > 0 ? (
        <g opacity={out}>
          <Stage f={f} mood="cold" word="?" />
          {/* saat: bir saat geçer */}
          <g transform="translate(540 760)" opacity={0.9}>
            <circle r={430} fill="none" stroke="#6f7d96" strokeWidth={6} opacity={0.35} />
            <path d={`M0 -430 A430 430 0 ${clockA > 0.5 ? 1 : 0} 1 ${430 * Math.sin(clockA * Math.PI * 2 - 0.0001)} ${-430 * Math.cos(clockA * Math.PI * 2 - 0.0001)}`} fill="none" stroke={RED} strokeWidth={14} strokeLinecap="round" opacity={clockA > 0 ? 0.9 : 0} />
            <text x={0} y={-460} fontFamily={fontFamily} fontWeight={900} fontSize={54} fill={RED} textAnchor="middle" opacity={clockA}>
              {`${Math.round(clockA * 60)} dk`}
            </text>
          </g>
          <Cut n="03" x={540} y={1600} h={1420} />
          {/* "?" işaretleri */}
          {[0, 1, 2, 3, 4].map((i) => {
            const p = pop(f, w(10) + i * 3, 10);
            const a = -2.6 + i * 0.55;
            return p > 0 ? (
              <text key={i} x={560 + Math.cos(a) * 300} y={420 + Math.sin(a) * 200 + Math.sin(f / 9 + i) * 8} fontFamily={fontFamily} fontWeight={900} fontSize={110 * p} fill={i % 2 ? CREAM : RED} textAnchor="middle">
                ?
              </text>
            ) : null;
          })}
        </g>
      ) : null}
    </g>
  );
};

// 3) "Ertesi gün yine aynı arama." — takvim yaprağı kopar (+1 gün), arama kutusu boşalır ve aynı sorgu yeniden yazılır
const ArErtesi: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const tear = prog(f, w(0), w(1) + 4);
  const retype = interpolate(f, [w(2), w(4) + 4], [0, QUERY.length], clamp);
  return (
    <g>
      <rect width={1080} height={1920} fill="#0d1015" />
      <SearchBar f={f} n={retype} y={240} />
      <text x={110} y={470} fontFamily={fontFamily} fontWeight={700} fontSize={32} fill="#6b7280">
        SON ARAMALAR
      </text>
      <History f={f} count={7} a={-40} y={560} />
      {/* takvim yaprağı */}
      <g transform="translate(540 1230)">
        <rect x={-190} y={-150} width={380} height={300} rx={26} fill={CREAM} />
        <rect x={-190} y={-150} width={380} height={80} rx={26} fill={RED} />
        <text x={0} y={-95} fontFamily={fontFamily} fontWeight={800} fontSize={40} fill="#fff" textAnchor="middle">
          EKİM
        </text>
        <text x={0} y={90} fontFamily={fontFamily} fontWeight={900} fontSize={170} fill="#1d1513" textAnchor="middle">
          31
        </text>
        {tear < 1 ? (
          <g transform={`translate(${tear * 240} ${tear * 520}) rotate(${tear * 40})`} opacity={1 - tear}>
            <rect x={-190} y={-150} width={380} height={300} rx={26} fill={CREAM} stroke="#d9cdb8" strokeWidth={3} />
            <rect x={-190} y={-150} width={380} height={80} rx={26} fill={RED} />
            <text x={0} y={-95} fontFamily={fontFamily} fontWeight={800} fontSize={40} fill="#fff" textAnchor="middle">
              EKİM
            </text>
            <text x={0} y={90} fontFamily={fontFamily} fontWeight={900} fontSize={170} fill="#1d1513" textAnchor="middle">
              30
            </text>
          </g>
        ) : null}
      </g>
    </g>
  );
};

// set listesi ekranı (04-set-sayaci, 384x848): hareket adları x≈55..270, setler x≈300..372, satırlar y≈380..660
const LISTE = "app/voom-hareketler.jpg";

// 4) "VOOM sabah sana o günün antrenmanını hazır verir: hangi hareket, kaç set, neden."
// Telefon kararır, yeşil nokta → logo; sıcak sahne; gülümseyen tanrıça telefonla; yanında gerçek hareket listesi; sonra "neden?"
const ArVoom: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const open = prog(f, 0, 12);
  const list = pop(f, w(4), 14) * (1 - prog(f, w(12) - 4, w(12) + 2));
  const why = pop(f, w(12), 12);
  return (
    <g>
      <Stage f={f} mood="warm" />
      <g transform={`translate(${-60 * prog(f, w(3), w(5))} 0)`}>
        <Cut n="05" x={420} y={1620} h={1380} o={prog(f, 4, 14)} />
      </g>
      {/* açılış: siyah ekranda logo */}
      {open < 1 ? (
        <g>
          <rect width={1080} height={1920} fill="#000" opacity={1 - open} />
        </g>
      ) : null}
      <g opacity={1 - prog(f, w(3), w(4))}>
        <g transform={`translate(540 760) scale(${pop(f, 2, 14)})`}>
          <Logo x={0} y={0} s={170} />
        </g>
      </g>
      <Screen src={LISTE} iw={384} ih={848} crop={[20, 330, 364, 360]} x={690} y={860} wd={640} p={list} r={2}>
        <rect x={55} y={372} width={205} height={310} rx={12} fill="none" stroke={LIME} strokeWidth={4} opacity={prog(f, w(8), w(9))} />
        <rect x={283} y={372} width={95} height={310} rx={12} fill="none" stroke={LIME} strokeWidth={4} opacity={prog(f, w(10), w(11))} />
      </Screen>
      <Screen src="app/bugun-neden.jpg" iw={384} ih={848} crop={[0, 200, 384, 150]} x={690} y={900} wd={680} p={why} r={-2}>
        <rect x={14} y={252} width={356} height={72} rx={10} fill="none" stroke={LIME} strokeWidth={4} />
      </Screen>
      {/* etiketler */}
      {[
        [w(8), "hareket", 440],
        [w(10), "set", 560],
        [w(12), "neden", 680],
      ].map(([at, t, y], i) => {
        const p = pop(f, at as number, 10);
        return p > 0 ? (
          <g key={i} transform={`translate(${880} ${(y as number) + 600}) scale(${p})`}>
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

// 5) "Setlerini sayar, yükünü haftadan haftaya kendisi artırır." — squat yapan tanrıça; dev set halkası 1/3 → 3/3; arkasında
// haftalık yük sütunları yükselir
const ArSet: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const sets = f < w(0) ? 0 : f < w(1) ? 1 : f < w(1) + 8 ? 2 : 3;
  const ring = prog(f, w(0) - 6, w(1) + 10);
  const bars = prog(f, w(2), w(6) + 4);
  return (
    <g>
      <Stage f={f} mood="warm" />
      {/* haftalık yük sütunları */}
      {[...Array(6)].map((_, i) => {
        const h = (200 + i * 110) * Math.min(1, Math.max(0, bars * 6 - i));
        return (
          <g key={i}>
            <rect x={120 + i * 145} y={1500 - h} width={110} height={h} rx={14} fill={LIME} opacity={0.22 + i * 0.05} />
            {h > 40 ? (
              <text x={175 + i * 145} y={1500 - h + 50} fontFamily={fontFamily} fontWeight={900} fontSize={34} fill={CREAM} textAnchor="middle">
                {`${i + 1}.h`}
              </text>
            ) : null}
          </g>
        );
      })}
      <Cut n="07" x={540} y={1600} h={1320} />
      {/* set halkası */}
      <g transform="translate(830 420)">
        <circle r={150} fill="#120a07" opacity={0.85} />
        <circle r={130} fill="none" stroke="#4a3a2c" strokeWidth={22} />
        <circle r={130} fill="none" stroke={LIME} strokeWidth={22} strokeLinecap="round" strokeDasharray={`${(2 * Math.PI * 130 * sets) / 3 * Math.min(1, ring * 1.5)} 9999`} transform="rotate(-90)" />
        <text x={0} y={22} fontFamily={fontFamily} fontWeight={900} fontSize={84} fill={CREAM} textAnchor="middle">
          {`${Math.max(1, sets)}/3`}
        </text>
        <text x={0} y={80} fontFamily={fontFamily} fontWeight={700} fontSize={30} fill={LIME} textAnchor="middle">
          SET
        </text>
      </g>
    </g>
  );
};

// 6) "Takıldığın yerde koçuna sorarsın." — işaret eden tanrıça; yanında koç sohbeti (gerçek ekran), önce "yazıyor…"
const ArKoc: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const msg = pop(f, w(2), 14);
  return (
    <g>
      <Stage f={f} mood="warm" />
      <Cut n="04" x={330} y={1620} h={1360} />
      {/* soru balonu */}
      <g transform={`translate(700 520) scale(${pop(f, w(0) - 2, 10)})`}>
        <rect x={-300} y={-70} width={600} height={130} rx={40} fill={CREAM} />
        <text x={0} y={14} fontFamily={fontFamily} fontWeight={800} fontSize={40} fill={CHOC} textAnchor="middle">
          Kalçamı nasıl çalıştırayım?
        </text>
      </g>
      {/* yazıyor… */}
      {f >= w(1) && f < w(2) + 4 ? (
        <g transform="translate(760 700)">
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

// Ayna (buğulu ↔ net): içi kırpılmış, oymalı altın çerçeve
const MX = 170;
const MY = 230;
const MW = 740;
const MH = 1180;
const GodMirror: React.FC<{ f: number; fog: number; wipe: number; god: string; fogged: React.ReactNode }> = ({ f, fog, wipe, god, fogged }) => {
  const id = useId().replace(/:/g, "");
  const url = staticFile(god);
  useImgReady(url);
  const wx = MX - 120 + (MW + 240) * wipe;
  return (
    <g>
      <clipPath id={`gc${id}`}>
        <rect x={MX} y={MY} width={MW} height={MH} rx={MW / 2} ry={150} />
      </clipPath>
      <filter id={`gf${id}`}>
        <feGaussianBlur stdDeviation={18} />
      </filter>
      <linearGradient id={`gg${id}`} x1="0" x2="1">
        <stop offset="0" stopColor="#000" />
        <stop offset="0.85" stopColor="#000" />
        <stop offset="1" stopColor="#fff" />
      </linearGradient>
      <mask id={`gm${id}`}>
        <rect width={1080} height={1920} fill="#fff" />
        <rect x={wx - 1300} y={0} width={1300} height={1920} fill={`url(#gg${id})`} />
      </mask>
      <g clipPath={`url(#gc${id})`}>
        <image href={url} x={MX - 20} y={MY - 40} width={MW + 40} height={(MW + 40) * (1672 / 941)} />
        {fog > 0 ? (
          <g mask={`url(#gm${id})`} opacity={fog}>
            <rect x={MX} y={MY} width={MW} height={MH} fill="#c9ced3" />
            <g filter={`url(#gf${id})`} opacity={0.7}>
              {fogged}
            </g>
            <rect x={MX} y={MY} width={MW} height={MH} fill="#e3e7ea" opacity={0.35} />
          </g>
        ) : null}
        <rect x={MX} y={MY} width={MW} height={MH} fill="#fff" opacity={0.08 + 0.04 * Math.sin(f / 10)} />
      </g>
      <rect x={MX - 14} y={MY - 14} width={MW + 28} height={MH + 28} rx={MW / 2 + 14} ry={164} fill="none" stroke="#c9a24a" strokeWidth={28} />
      <rect x={MX - 30} y={MY - 30} width={MW + 60} height={MH + 60} rx={MW / 2 + 30} ry={180} fill="none" stroke="#7d6128" strokeWidth={6} />
    </g>
  );
};

// 7) "Ve bir gün aynaya baktığında, aradığını bulmuş olursun." — tanrıça aynanın önünde arkası dönük (yan profil);
// buğu silinir: aynada Artemis → Athena → Amphitrite
const ArAyna: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const wipe = prog(f, w(4), w(6));
  const step = 12;
  const gi = f < w(6) ? 0 : Math.floor((f - w(6)) / step) % GODS.length;
  const flash = f >= w(6) ? Math.max(0, 1 - (f - w(6)) / 8) : 0;
  return (
    <g>
      <Stage f={f} mood="warm" />
      <GodMirror f={f} fog={1} wipe={wipe} god={GODS[gi]} fogged={<Cut n="01" x={540} y={1460} h={1260} />} />
      <rect width={1080} height={1920} fill="#fff" opacity={0.25 * flash} />
      {/* önde, aynaya bakan tanrıça (yan profil, küçük) */}
      <g opacity={1 - prog(f, w(6), w(6) + 8)}>
        <Cut n="02" x={210} y={1640} h={900} />
      </g>
    </g>
  );
};

// 8) "VOOM yakında, linki profilde. Yoksa yarın yine…" — tanrıçalar arkada döner, logo; "Yoksa"da sahne soğur ve açılış karesine
// (telefona bakan tanrıça) döner
const ArSon: React.FC<SceneProps> = ({ w, d }) => {
  const f = useCurrentFrame();
  const cold = prog(f, w(4) - 2, w(4) + 8);
  const gi = Math.floor(f / 14) % GODS.length;
  const url = staticFile(GODS[gi]);
  useImgReady(url);
  const logo = pop(f, 2, 14) * (1 - cold);
  return (
    <g>
      <image href={url} x={0} y={0} width={1080} height={1920} preserveAspectRatio="xMidYMid slice" transform={`translate(540 960) scale(${1.05 + 0.02 * Math.sin(f / 20)}) translate(-540 -960)`} />
      <rect width={1080} height={1920} fill="#000" opacity={0.35} />
      {logo > 0 ? (
        <g opacity={Math.min(1, logo * 1.3)}>
          <rect x={170} y={1020} width={740} height={360} rx={44} fill="#0c0c0d" opacity={0.84} />
          <g transform={`translate(540 1180) scale(${logo})`}>
            <Logo x={0} y={0} s={150} />
          </g>
          <T x={540} y={1270} s={50} c={CREAM} w={700}>
            yakında
          </T>
          <g opacity={prog(f, w(2), w(2) + 6)}>
            <T x={540} y={1340} s={40} c={LIME} w={800}>
              link profilde ↗
            </T>
          </g>
        </g>
      ) : null}
      {cold > 0 ? (
        <g opacity={cold}>
          <Stage f={f} mood="cold" word="?" />
          <Cut n="05" x={540} y={1560} h={1480} />
        </g>
      ) : null}
    </g>
  );
};

export const ARAMA_SCENES: Record<string, React.FC<SceneProps>> = {
  "ar-kanca": ArKanca,
  "ar-akis": ArAkis,
  "ar-ertesi": ArErtesi,
  "ar-voom": ArVoom,
  "ar-set": ArSet,
  "ar-koc": ArKoc,
  "ar-ayna": ArAyna,
  "ar-son": ArSon,
};
