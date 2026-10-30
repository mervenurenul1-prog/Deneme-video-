# 1930'lar çizgi film / caz havasında meraklı fon müzikleri (10 aday).
# Ücretsiz: mido (MIDI) + FluidSynth + FluidR3_GM (MIT). Çıktı: ses-ornekleri/muzik-1930/NN-ad.mp3
import os, subprocess, sys, random
import numpy as np
import mido

OUT = sys.argv[1]
TMP = sys.argv[2]
SF2 = "/usr/share/sounds/sf2/FluidR3_GM.sf2"
os.makedirs(OUT, exist_ok=True)
os.makedirs(TMP, exist_ok=True)

TPB = 480
# akorlar: tonika'ya göre kök + tür
Q = {"m": [0, 3, 7], "M": [0, 4, 7], "7": [0, 4, 7, 10], "dim": [0, 3, 6]}
A_PROG = [(0, "m"), (0, "m"), (5, "m"), (0, "m"), (8, "M"), (5, "m"), (7, "7"), (0, "m")]
B_PROG = [(5, "m"), (5, "m"), (0, "m"), (0, "m"), (7, "7"), (7, "7")]

# ezgiler: (vuruş, süre, tonikaya göre yarım ses)
A1 = [  # sinsi, kromatik parmak ucu
    [(0, .5, 7), (1, .5, 6), (1.5, .5, 7), (2, .5, 8), (2.5, .5, 7), (3, .5, 6), (3.5, .5, 7)],
    [(0, 1, 3), (1.5, .5, 2), (2, .5, 3), (2.5, .5, 5), (3, 1, 7)],
    [(0, .5, 8), (.5, .5, 7), (1, .5, 8), (1.5, .5, 10), (2, 1, 12), (3, .5, 10), (3.5, .5, 8)],
    [(0, 1.5, 7), (2, .5, 3), (2.5, .5, 5), (3, 1, 7)],
    [(0, .5, 12), (.5, .5, 11), (1, .5, 12), (1.5, .5, 15), (2, 1, 12), (3, 1, 8)],
    [(0, .5, 10), (.5, .5, 8), (1, .5, 7), (1.5, .5, 5), (2, 2, 8)],
    [(0, .5, 11), (.5, .5, 12), (1, .5, 14), (1.5, .5, 11), (2, .5, 7), (2.5, .5, 8), (3, 1, 11)],
    [(0, 1, 12), (1, .5, 7), (1.5, .5, 3), (2, 2, 0)],
]
A2 = [  # soru soran, uzun notalar, gerilim (bemol beşli)
    [(0, 1.5, 3), (1.5, .5, 2), (2, 1, 3), (3, 1, 7)],
    [(0, 2, 6), (2, .5, 7), (2.5, .5, 8), (3, 1, 7)],
    [(0, 1.5, 8), (1.5, .5, 7), (2, 1, 5), (3, 1, 8)],
    [(0, 3, 7)],
    [(0, 1.5, 15), (1.5, .5, 14), (2, 1, 12), (3, 1, 8)],
    [(0, 1.5, 10), (1.5, .5, 8), (2, 2, 5)],
    [(0, 1, 11), (1, 1, 14), (2, 1, 17), (3, 1, 11)],
    [(0, 4, 12)],
]
A3 = [  # ragtime, senkoplu
    [(0, .5, 0), (.5, .5, 3), (1, .5, 7), (1.5, 1, 12), (2.5, .5, 11), (3, 1, 7)],
    [(0, .5, 6), (.5, .5, 7), (1, .5, 3), (1.5, 1, 7), (3, .5, 6), (3.5, .5, 7)],
    [(0, .5, 5), (.5, .5, 8), (1, .5, 12), (1.5, 1, 17), (2.5, .5, 15), (3, 1, 12)],
    [(0, .5, 11), (.5, .5, 12), (1, .5, 7), (1.5, 1, 3), (3, 1, 7)],
    [(0, .5, 8), (.5, .5, 12), (1, .5, 15), (1.5, 1, 20), (2.5, .5, 19), (3, 1, 15)],
    [(0, .5, 14), (.5, .5, 12), (1, .5, 10), (1.5, 1, 8), (3, 1, 5)],
    [(0, .5, 7), (.5, .5, 11), (1, .5, 14), (1.5, .5, 17), (2, .5, 14), (2.5, .5, 11), (3, 1, 7)],
    [(0, .5, 12), (.5, .5, 7), (1, 1, 3), (2, 2, 0)],
]
B1 = [
    [(0, 1, 12), (1, 1, 10), (2, 1, 8), (3, 1, 5)],
    [(0, 1.5, 8), (1.5, .5, 7), (2, 2, 5)],
    [(0, 1, 7), (1, 1, 6), (2, 1, 7), (3, 1, 3)],
    [(0, 3, 7)],
    [(0, .5, 11), (.5, .5, 14), (1, .5, 17), (1.5, .5, 14), (2, .5, 11), (2.5, .5, 7), (3, .5, 5), (3.5, .5, 2)],
    [(0, 1, 11), (1, 1, 7), (2, 2, -1)],
]


class Song:
    def __init__(self, bpm, swing):
        self.bpm, self.swing = bpm, swing
        self.ev = []  # (beat, dur, ch, note, vel)
        self.prog = {}

    def inst(self, ch, program):
        self.prog[ch] = program

    def note(self, beat, dur, ch, note, vel):
        frac = beat - int(beat)
        if self.swing and abs(frac - 0.5) < 1e-6:
            beat += self.swing  # sekizlikler sallanır (swing)
        self.ev.append((beat, dur, ch, int(note), int(max(1, min(127, vel)))))

    def write(self, path):
        mid = mido.MidiFile(ticks_per_beat=TPB)
        tr = mido.MidiTrack()
        mid.tracks.append(tr)
        tr.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(self.bpm), time=0))
        for ch, p in self.prog.items():
            if ch != 9:
                tr.append(mido.Message("program_change", channel=ch, program=p, time=0))
        msgs = []
        for b, d, ch, n, v in self.ev:
            t0 = int(round(b * TPB))
            t1 = int(round((b + d) * TPB)) - 4
            msgs.append((t0, 1, mido.Message("note_on", channel=ch, note=n, velocity=v)))
            msgs.append((max(t0 + 1, t1), 0, mido.Message("note_off", channel=ch, note=n, velocity=0)))
        msgs.sort(key=lambda m: (m[0], m[1]))
        last = 0
        for t, _, m in msgs:
            m.time = t - last
            last = t
            tr.append(m)
        mid.save(path)


def chord(root, q):
    return [root + i for i in Q[q]]


def form():
    # giriş 2 ölçü (yalnız eşlik) + A (8) + B (6) + A (8) = 24 ölçü
    bars = [A_PROG[0], A_PROG[0]] + A_PROG + B_PROG + A_PROG
    sect = ["I", "I"] + ["A"] * 8 + ["B"] * 6 + ["A2"] * 8
    return bars, sect


def build(cfg):
    s = Song(cfg["bpm"], cfg.get("swing", 0.12))
    k = cfg["key"]
    for ch, p in cfg["inst"].items():
        s.inst(ch, p)
    bars, sect = form()
    rnd = random.Random(cfg["seed"])
    for bi, ((r, q), sc) in enumerate(zip(bars, sect)):
        t = bi * 4
        ct = chord(r, q)
        nxt = bars[(bi + 1) % len(bars)][0]
        # bas
        bs, bch, boct = cfg["bass"]
        root = k + r + boct
        if bs == "oompah":
            s.note(t, .9, bch, root, 92)
            s.note(t + 2, .9, bch, k + ct[2] + boct - 12 if ct[2] > 6 else k + ct[2] + boct, 84)
        elif bs == "walk":
            line = [ct[0], ct[1], ct[2], (nxt + (1 if nxt < ct[0] else -1)) if nxt != ct[0] else ct[1]]
            for i, n in enumerate(line):
                s.note(t + i, .9, bch, k + n + boct, 88 if i == 0 else 78)
        elif bs == "pizz":
            for i, n in enumerate([ct[0], ct[2] - 12, ct[0], ct[2] - 12]):
                s.note(t + i, .35, bch, k + n + boct, 90 if i % 2 == 0 else 72)
        elif bs == "stride":
            s.note(t, .5, bch, root, 92)
            s.note(t + 2, .5, bch, k + ct[2] + boct - 12, 86)
        # eşlik
        cs, cch, coct = cfg["comp"]
        ch_notes = [k + n + coct for n in ct]
        if cs == "offbeat":
            for b in (1, 3):
                for n in ch_notes:
                    s.note(t + b, .3, cch, n, 64)
        elif cs == "stride":
            for b in (1, 3):
                for n in ch_notes:
                    s.note(t + b, .45, cch, n, 70)
        elif cs == "pompe":
            for b in range(4):
                for n in ch_notes:
                    s.note(t + b, .25, cch, n, 72 if b % 2 else 52)
        elif cs == "arp":
            seq = ch_notes + [ch_notes[1] + 12]
            for i in range(8):
                s.note(t + i * .5, .45, cch, seq[i % len(seq)], 48 + (8 if i % 2 == 0 else 0))
        elif cs == "pad":
            for n in ch_notes:
                s.note(t, 3.9, cch, n, 46)
        elif cs == "banjo":
            for b in (0.5, 1.5, 2.5, 3.5):
                for n in ch_notes:
                    s.note(t + b, .25, cch, n, 66)
        # ezgi
        if sc in ("A", "A2", "B"):
            mel = cfg["melody"] if sc != "B" else B1
            row = mel[(bi - 2) % 8] if sc != "B" else B1[(bi - 10) % 6]
            mch, moct, mvel, stacc = cfg["lead"] if sc != "B" else cfg.get("lead_b", cfg["lead"])
            up = 12 if (sc == "A2" and cfg.get("a2_up")) else 0
            for b, d, n in row:
                s.note(t + b, d * (0.55 if stacc else 0.95), mch, k + n + moct + up, mvel + rnd.randint(-6, 6))
            # ikinci A'da cevap çalgısı (karşı ezgi)
            if sc == "A2" and "answer" in cfg:
                ach, aoct, avel = cfg["answer"]
                for b, d, n in row[::2]:
                    s.note(t + b + .5, .4, ach, k + n + aoct, avel)
        # davul
        dr = cfg.get("drums")
        if dr == "brush":
            for b in (1, 3):
                s.note(t + b, .2, 9, 38, 34)
            for b in range(4):
                s.note(t + b, .15, 9, 42, 30)
                s.note(t + b + .5, .1, 9, 42, 20)
        elif dr == "wood":
            for b in (1, 3):
                s.note(t + b, .1, 9, 76, 58)
            s.note(t + 3.5, .1, 9, 77, 40)
        elif dr == "march":
            s.note(t, .2, 9, 36, 50)
            s.note(t + 2, .2, 9, 36, 44)
            for b in (1, 3):
                s.note(t + b, .1, 9, 38, 30)
    # son: tonik (döngüde başa bağlanır)
    return s


C = {
    1: dict(name="sinsi-tuba-pizzicato", bpm=108, key=57, seed=1, inst={0: 58, 1: 45, 2: 71}, bass=("oompah", 0, -24), comp=("offbeat", 1, 0), melody=A1, lead=(2, 12, 84, True), lead_b=(1, 12, 80, True), drums="brush"),
    2: dict(name="ragtime-piyano", bpm=112, key=50, seed=2, inst={0: 3, 1: 3, 2: 3}, bass=("stride", 0, -12), comp=("stride", 1, 12), melody=A3, lead=(2, 24, 88, False), a2_up=False, drums=None),
    3: dict(name="dedektif-ksilofon", bpm=104, key=52, seed=3, inst={0: 32, 1: 0, 2: 13, 3: 59}, bass=("walk", 0, -12), comp=("offbeat", 1, 12), melody=A1, lead=(2, 24, 90, True), lead_b=(3, 12, 78, False), answer=(3, 12, 60), drums="brush"),
    4: dict(name="gece-kulubu-trompet", bpm=96, key=48, seed=4, inst={0: 32, 1: 0, 2: 59, 3: 66}, bass=("walk", 0, -12), comp=("offbeat", 1, 12), melody=A2, lead=(2, 12, 86, False), lead_b=(3, 12, 76, False), drums="brush"),
    5: dict(name="banjo-tuba-kartun", bpm=120, key=55, seed=5, inst={0: 58, 1: 105, 2: 71, 3: 68}, bass=("oompah", 0, -24), comp=("banjo", 1, 0), melody=A3, lead=(2, 12, 84, True), lead_b=(3, 12, 80, True), drums="wood"),
    6: dict(name="muzik-kutusu-gizem", bpm=90, key=57, seed=6, inst={0: 45, 1: 8, 2: 10, 3: 9}, bass=("pizz", 0, -12), comp=("arp", 1, 12), melody=A2, lead=(2, 24, 80, False), lead_b=(3, 24, 70, False), drums=None),
    7: dict(name="fagot-parmak-ucu", bpm=100, key=50, seed=7, inst={0: 45, 1: 45, 2: 70, 3: 71}, bass=("pizz", 0, -12), comp=("offbeat", 1, 0), melody=A1, lead=(2, 0, 92, True), lead_b=(3, 12, 80, True), answer=(3, 12, 56), drums=None),
    8: dict(name="kara-piyano", bpm=92, key=53, seed=8, inst={0: 0, 1: 0, 2: 0}, bass=("stride", 0, -12), comp=("stride", 1, 12), melody=A2, lead=(2, 24, 80, False), drums=None),
    9: dict(name="lunapark-org", bpm=110, key=55, seed=9, inst={0: 58, 1: 21, 2: 82, 3: 13}, bass=("oompah", 0, -24), comp=("offbeat", 1, 0), melody=A3, lead=(2, 12, 76, True), lead_b=(3, 24, 76, True), drums="march"),
    10: dict(name="cingene-caz", bpm=120, key=52, seed=10, inst={0: 32, 1: 24, 2: 40, 3: 71}, bass=("walk", 0, -12), comp=("pompe", 1, 0), melody=A1, lead=(2, 12, 84, False), lead_b=(3, 12, 80, False), drums=None),
    # kullanıcı 2 (ragtime) ve 5 (banjo + tuba) havasını sevdi → harmanlar
    11: dict(name="ragtime-banjo-tuba", bpm=112, key=50, seed=11, inst={0: 58, 1: 105, 2: 3, 3: 3}, bass=("oompah", 0, -24), comp=("banjo", 1, 0), melody=A3, lead=(2, 24, 88, False), lead_b=(3, 12, 82, False), drums="wood"),
    12: dict(name="kartun-kovalamaca", bpm=126, key=55, seed=12, inst={0: 58, 1: 105, 2: 71, 3: 13}, bass=("oompah", 0, -24), comp=("banjo", 1, 0), melody=A3, lead=(2, 12, 86, True), lead_b=(3, 24, 84, True), answer=(3, 24, 62), drums="wood"),
    13: dict(name="ragtime-sinsi", bpm=104, key=57, seed=13, inst={0: 58, 1: 3, 2: 3, 3: 105}, bass=("oompah", 0, -24), comp=("stride", 1, 12), melody=A1, lead=(2, 24, 88, True), lead_b=(3, 12, 76, False), drums="brush"),
}
ONLY = {int(x) for x in sys.argv[3].split(",")} if len(sys.argv) > 3 else None

# plak cızırtısı: seyrek tıkırtılar + çok kısık hışırtı
sr = 44100
def crackle(seconds, seed):
    rng = np.random.default_rng(seed)
    n = int(seconds * sr)
    x = rng.normal(0, 0.004, n)
    x = np.convolve(x, np.ones(12) / 12, mode="same")
    clicks = rng.random(n) < 0.0009
    x[clicks] += rng.choice([-1, 1], clicks.sum()) * rng.uniform(0.05, 0.25, clicks.sum())
    return (np.clip(x, -1, 1) * 32767).astype(np.int16)

import wave
for i, cfg in C.items():
    if ONLY and i not in ONLY:
        continue
    s = build(cfg)
    mid = os.path.join(TMP, f"{i:02d}.mid")
    wav = os.path.join(TMP, f"{i:02d}.wav")
    s.write(mid)
    subprocess.run(["fluidsynth", "-ni", "-g", "0.7", "-r", str(sr), "-F", wav, SF2, mid], check=True, capture_output=True)
    secs = 24 * 4 * 60 / cfg["bpm"]
    cr = os.path.join(TMP, f"{i:02d}-cr.wav")
    with wave.open(cr, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(crackle(secs + 2, i).tobytes())
    out = os.path.join(OUT, f"{i:02d}-{cfg['name']}.mp3")
    # döngü uzunluğuna kırp, eski plak tınısı (bant filtre + hafif oda), cızırtı, −20 LUFS
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-i", wav, "-i", cr, "-filter_complex",
        f"[0:a]atrim=0:{secs:.3f},highpass=f=80,lowpass=f=8500,aecho=0.8:0.5:40:0.12,loudnorm=I=-20:TP=-2[m];"
        f"[1:a]atrim=0:{secs:.3f},volume=0.5[c];[m][c]amix=inputs=2:duration=first:normalize=0",
        "-ac", "2", "-b:a", "192k", out], check=True)
    print(out, f"{secs:.1f} sn")
