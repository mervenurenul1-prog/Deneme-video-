"""Ücretsiz spor salonu müziği (numpy sentezi, bize ait): 128 BPM trap/hip-hop ritmi — 808 bas, kick, clap, hi-hat
(üçlemeli rulolar), karanlık synth akorları (La minör). Döngülü video için 16 ölçü (~30 sn) + başa sarınca kopmaz.
Kullanım: python3 scripts/muzik-spor.py public/music/spor-trap.wav  →  ffmpeg ile mp3 + loudnorm -20 LUFS
"""
import sys
import wave

import numpy as np

SR = 44100
BPM = 128
BEAT = 60 / BPM
BARS = 16
N = int(SR * BEAT * 4 * BARS)
out = np.zeros(N)
rng = np.random.default_rng(7)


def at(t):
    return int(t * SR)


def add(sig, t, gain=1.0):
    i = at(t)
    j = min(N, i + len(sig))
    if i < N:
        out[i:j] += sig[: j - i] * gain


def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR
    e = np.minimum(1, t / a) * np.exp(-t / d)
    return e


def kick():
    n = at(0.45)
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env(n, 0.001, 0.18) * 1.1


def clap():
    n = at(0.25)
    s = rng.standard_normal(n)
    # birkaç el çırpma vuruşu + band geçiren hissi (fark filtresi)
    s = np.diff(s, prepend=0)
    e = np.zeros(n)
    for k in (0, 0.008, 0.017):
        e += np.roll(env(n, 0.001, 0.05), at(k))
    return s * e * 0.35


def hat(open_=False):
    n = at(0.18 if open_ else 0.05)
    s = np.diff(np.diff(rng.standard_normal(n), prepend=0), prepend=0)
    return s * env(n, 0.0005, 0.06 if open_ else 0.015) * 0.12


def bass808(freq, dur):
    n = at(dur)
    t = np.arange(n) / SR
    f = freq * (1 + 0.25 * np.exp(-t * 30))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.tanh(2.2 * np.sin(ph)) * np.minimum(1, t / 0.003) * np.exp(-t / (dur * 0.9))
    return s * 0.55


def pad(freqs, dur):
    n = at(dur)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for fr in freqs:
        for det in (-0.004, 0.004):
            ph = 2 * np.pi * fr * (1 + det) * t
            s += 2 * (ph / (2 * np.pi) % 1) - 1  # testere
    # basit alçak geçiren (hareketli ortalama) + yumuşak giriş/çıkış
    k = 24
    s = np.convolve(s, np.ones(k) / k, mode="same")
    e = np.minimum(1, t / 0.15) * np.minimum(1, (dur - t) / 0.25)
    return s * e * 0.045


def pluck(freq, dur=0.22):
    n = at(dur)
    t = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * freq * t)) * 0.5 + np.sin(2 * np.pi * freq * 2 * t) * 0.3
    return s * env(n, 0.002, 0.09) * 0.09


# La minör: Am – F – C – G (akor kökleri ve 808 notaları)
CHORDS = [
    ([220.0, 261.63, 329.63], 55.0),
    ([174.61, 220.0, 261.63], 43.65),
    ([261.63, 329.63, 392.0], 65.41),
    ([196.0, 246.94, 293.66], 49.0),
]
MELODY = [659.25, 523.25, 587.33, 493.88]  # ölçü başına tekrarlayan kısa motif

bar = BEAT * 4
for b in range(BARS):
    t0 = b * bar
    ch, root = CHORDS[b % 4]
    intro = b < 1  # ilk ölçü sade (davul az) — döngüde fark edilmesin diye kısa
    add(pad(ch, bar), t0)
    # 808: 1, 2.75, 3.5 vuruşlarında
    for pos, dur in ((0, 1.6), (2.75, 0.6), (3.5, 0.5)):
        add(bass808(root, dur * BEAT), t0 + pos * BEAT)
    if not intro:
        for pos in (0, 2.5):
            add(kick(), t0 + pos * BEAT)
        if b % 2 == 1:
            add(kick(), t0 + 3.25 * BEAT, 0.8)
        for pos in (1, 3):
            add(clap(), t0 + pos * BEAT)
    # hi-hat: sekizlik; her 2 ölçüde bir üçlemeli rulo
    for k in range(8):
        add(hat(), t0 + k * BEAT / 2, 1.0 if k % 2 == 0 else 0.6)
    if b % 2 == 1:
        for k in range(6):
            add(hat(), t0 + 3 * BEAT + k * BEAT / 6, 0.7)
    if b % 8 == 7:
        add(hat(True), t0 + 3.5 * BEAT)
    # motif: 4 ölçüde bir başlar
    if b >= 4:
        for k, fr in enumerate(MELODY):
            add(pluck(fr * (1 if b % 4 < 2 else 0.5)), t0 + (k * 0.75 + 0.5) * BEAT)

out = np.tanh(out * 1.2)
out /= np.max(np.abs(out)) * 1.05
st = np.stack([out, np.roll(out, 12)], axis=1)  # hafif stereo
data = (st * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes(data.tobytes())
print("ok", N / SR)
