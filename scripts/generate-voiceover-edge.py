"""ElevenLabs anahtarı yokken kullanılan ücretsiz yedek seslendirme (Microsoft Edge TTS).

Kullanım: pip install edge-tts
          python3 scripts/generate-voiceover-edge.py <id>... [--voice tr-TR-AhmetNeural]

generate-voiceover.ts ile aynı manifest.json biçimini üretir; render adımı değişmez.
ElevenLabs anahtarı geldiğinde `npm run voiceover -- <id>` bu sesleri otomatik değiştirir
(voiceId farklı olduğu için önbellek eşleşmez).
"""

import argparse
import asyncio
import json
import os
import ssl
import subprocess
import time
from pathlib import Path

import edge_tts
import edge_tts.communicate

# Kurumsal/vekil sunucu sertifikaları için: SSL_CERT_FILE tanımlıysa onu kullan
if os.environ.get("SSL_CERT_FILE"):
    edge_tts.communicate._SSL_CTX = ssl.create_default_context(cafile=os.environ["SSL_CERT_FILE"])

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIRS = ["posts", "stories", "promos"]


def find_video(video_id: str) -> dict:
    for d in CONTENT_DIRS:
        f = ROOT / "content" / d / f"{video_id}.json"
        if f.exists():
            return json.loads(f.read_text(encoding="utf8"))
    raise SystemExit(f"İçerik bulunamadı: {video_id}")


def duration(file: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(file)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


async def synth(text: str, voice: str, rate: str, file: Path) -> list[dict]:
    words = []
    comm = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    with file.open("wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / 1e7
                words.append({"word": chunk["text"], "start": start, "end": start + chunk["duration"] / 1e7})
    # Edge TTS noktalamayı atar; kelime sayısı tutuyorsa altyazı için orijinal metni kullan
    tokens = text.split()
    if len(tokens) == len(words):
        for w, t in zip(words, tokens):
            w["word"] = t
    return words


async def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("ids", nargs="+")
    p.add_argument("--voice", default="tr-TR-AhmetNeural")
    p.add_argument("--rate", default="+5%")
    args = p.parse_args()
    voice_id = f"edge:{args.voice}"

    for video_id in args.ids:
        video = find_video(video_id)
        out_dir = ROOT / "public" / "voiceover" / video_id
        out_dir.mkdir(parents=True, exist_ok=True)
        stamp = format(int(time.time() * 1000), "x")
        scenes = []
        for i, scene in enumerate(video["scenes"]):
            print(f"[{video_id}] sahne {i + 1}: \"{scene['voice']}\"")
            name = f"{i + 1}-{stamp}.mp3"
            words = await synth(scene["voice"], args.voice, args.rate, out_dir / name)
            scenes.append({
                "voice": scene["voice"],
                "voiceId": voice_id,
                "file": f"voiceover/{video_id}/{name}",
                "durationInSeconds": duration(out_dir / name),
                "words": words,
            })
        (out_dir / "manifest.json").write_text(json.dumps({"scenes": scenes}, ensure_ascii=False, indent=2), encoding="utf8")
        print(f"[{video_id}] {len(scenes)} sahne seslendirildi.")


asyncio.run(main())
