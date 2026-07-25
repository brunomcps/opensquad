#!/usr/bin/env python3
"""Prepare an Instagram story video for local editorial analysis."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path


def run(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def probe(path: Path) -> dict:
    result = run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=index,codec_type,codec_name,width,height",
            "-of",
            "json",
            str(path),
        ]
    )
    return json.loads(result.stdout)


def extract_frames(media: Path, output_dir: Path, stem: str, duration: float) -> list[str]:
    frames_dir = output_dir / f"{stem}-frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    fractions = (0.1, 0.3, 0.5, 0.7, 0.9)
    frames: list[str] = []

    for index, fraction in enumerate(fractions, start=1):
        timestamp = max(0.0, min(duration - 0.05, duration * fraction))
        frame = frames_dir / f"frame-{index:02d}.jpg"
        run(
            [
                "ffmpeg",
                "-y",
                "-ss",
                f"{timestamp:.3f}",
                "-i",
                str(media),
                "-frames:v",
                "1",
                "-q:v",
                "2",
                str(frame),
            ]
        )
        frames.append(str(frame))

    return frames


def transcribe(media: Path, output_dir: Path, stem: str, language: str, model_name: str) -> Path:
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise RuntimeError(
            "faster-whisper nao esta instalado; execute sem --transcribe ou instale a dependencia."
        ) from exc

    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        str(media),
        language=language,
        vad_filter=True,
        beam_size=5,
    )
    lines = [f"[{segment.start:06.2f}-{segment.end:06.2f}] {segment.text.strip()}" for segment in segments]
    transcript = output_dir / f"{stem}-transcricao.txt"
    transcript.write_text("\n".join(lines), encoding="utf-8")

    metadata = output_dir / f"{stem}-transcricao-meta.json"
    metadata.write_text(
        json.dumps(
            {
                "language": info.language,
                "languageProbability": info.language_probability,
                "model": model_name,
                "engine": "faster-whisper",
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    return transcript


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True, type=Path)
    parser.add_argument("--audio", type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--stem", required=True)
    parser.add_argument("--transcribe", action="store_true")
    parser.add_argument("--language", default="pt")
    parser.add_argument("--model", default="small")
    args = parser.parse_args()

    if not args.video.is_file():
        parser.error(f"video inexistente: {args.video}")
    if args.audio and not args.audio.is_file():
        parser.error(f"audio inexistente: {args.audio}")
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        parser.error("ffmpeg e ffprobe precisam estar disponiveis no PATH")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    complete = args.output_dir / f"{args.stem}-completo.mp4"

    if args.audio:
        run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(args.video),
                "-i",
                str(args.audio),
                "-map",
                "0:v:0",
                "-map",
                "1:a:0",
                "-c",
                "copy",
                str(complete),
            ]
        )
    else:
        shutil.copy2(args.video, complete)

    media_probe = probe(complete)
    duration = float(media_probe.get("format", {}).get("duration") or 0)
    if duration <= 0:
        raise RuntimeError("ffprobe nao retornou uma duracao valida")

    frames = extract_frames(complete, args.output_dir, args.stem, duration)
    transcript = None
    if args.transcribe:
        transcript = transcribe(complete, args.output_dir, args.stem, args.language, args.model)

    manifest = {
        "sourceVideo": str(args.video.resolve()),
        "sourceAudio": str(args.audio.resolve()) if args.audio else None,
        "completeMedia": str(complete.resolve()),
        "durationSeconds": duration,
        "streams": media_probe.get("streams", []),
        "frames": frames,
        "transcript": str(transcript.resolve()) if transcript else None,
    }
    manifest_path = args.output_dir / f"{args.stem}-manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
