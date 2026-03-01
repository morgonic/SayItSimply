import hashlib
import logging
import os
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
import wave
from typing import Optional, Tuple
from google.genai import types
from app.gemini_flash import gemini_client as gemini_client

logger = logging.getLogger(__name__)

# Gemini TTS returns raw PCM
DEFAULT_SAMPLE_RATE_HZ = 24000
DEFAULT_CHANNELS = 1
DEFAULT_SAMPLE_WIDTH_BYTES = 2
DEFAULT_MODEL = "gemini-2.5-flash-preview-tts"
DEFAULT_VOICE = "Autonoe"
BACKEND_DIR = Path(__file__).resolve().parents[1]
CACHE_DIR = BACKEND_DIR / "tts_cache"

@dataclass(frozen=True)
class TTSParams:
    text: str
    voice: str = DEFAULT_VOICE
    rate: float = 1.0
    pitch: float = 0.0
    model: str = DEFAULT_MODEL
    language: Optional[str] = None #for future use --will need to pass BCP-47 language codes for it to work (IE: instead of EN, use en-US)
    
def _ensure_cache_dir(cache_dir: Path) -> None:
    cache_dir.mkdir(parents=True, exist_ok=True)
    
def _hash_key(params: TTSParams) -> str:
    #Cache key
    h = hashlib.sha256()
    h.update(params.model.encode("utf-8"))
    h.update(b"\n")
    h.update(params.voice.encode("utf-8"))
    h.update(b"\n")
    h.update(f"{params.rate:.4f}".encode("utf-8"))
    h.update(b"\n")
    h.update(f"{params.pitch:.4f}".encode("utf-8"))
    h.update(b"\n")
    if params.language:
        h.update(params.language.encode("utf-8"))
        h.update(b"\n")
    h.update(params.text.encode("utf-8"))
    return h.hexdigest()

def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def _slider_to_pitch_value(v: float) -> float:
    """
    Map slider values [-2, 2] to pitch guidance [-1, 1]
    """
    v = float(v)
    pitch = (v / 2.0) * 20.0
    return _clamp(pitch, -20.0, 20.0)

def _slider_to_rate_value(v: float) -> float:
    """
    Map slider values [-2, 2] to rate guidance [0.5, 2.0] and clamp to Gemini supported range [0.25, 4.0]
    """
    v = float(v)
    rate = 2 ** (v / 2.0)
    return _clamp(rate, 0.25, 4.0)

def _build_tts_prompt(params: TTSParams) -> str:
    """
    Speed/pitch will be controlled by config.
    """
    style_lines = [
        "Read the following text aloud exactly as written. Do not add or remove words.",
        "Maintain a friendly, accessible tone suitable for an assistive reading app while also following speed/pitch specified by config."
    ]
    if params.language:
        style_lines.append(f"Use pronunciation appropriate for: {params.language}.")
    style = " ".join(style_lines)
    return f"{style}\n\nTEXT:\n{params.text}"

def _pitch_guidance(pitch: float) -> str:
    p = _slider_to_pitch_value(pitch)
    #Convert pitch slider value into natural-language guidance gemini expects.
    if p >= 1.0:
        return "Use an extremely high pitch (extremely above neutral)."
    if p >= 0.75:
        return "Use a very high pitch (significantly above neutral)."
    if p >= 0.50:
        return "Use a noticeably higher pitch than neutral."
    if p >= 0.25:
        return "Use a slightly higher pitch than neutral."
    if p >= 0.0:
        return "Use a neutral pitch."
    if p <= -1.0:
        return "Use an extremely high pitch (extremely below neutral)."
    if p <= -0.85:
        return "Use a very low pitch (significantly below neutral)."
    if p <= -0.55:
        return "Use a noticeably lower pitch than neutral."
    if p <= -0.25:
        return "Use a slightly lower pitch than neutral."
    if p <= -0.1:
        return "Use a neutral pitch."
    return "Use a neutral pitch."

def _rate_guidance(rate: float) -> str:
    r = _clamp(float(rate), 0.5, 2.0)
    #Convert a rate slider value into natural-language guidance gemini expects.
    if r >= 2.0:
        return f"Speak extremely quickly (about {r:.2f}x normal speed), enunciating carefully and clearly."
    if r >= 1.75:
        return f"Speak very quickly (about {r:.2f}x normal speed), enunciating carefully."
    if r >= 1.5:
        return f"Speak quickly (about {r:.2f}x normal speed), enunciating clearly."
    if r >= 1.25:
        return f"Speak slightly faster than normal (about {r:.2f}x)."
    if r >= 1.0:
        return f"Speak at a natural pace (about {rate:.2f}x)."
    if r <= 0.5:
        return f"Speak extremely slowly (about {r:.2f}x normal speed), enunciating carefully and clearly."
    if r <= 0.60:
        return f"Speak very slowly (about {r:.2f}x normal speed), enunciating carefully."
    if r <= 0.75:
        return f"Speak slowly (about {r:.2f}x normal speed), enunciating clearly."
    if r <= 0.90:
        return f"Speak slightly slower than normal (about {r:.2f}x)."
    return f"Speak at a natural pace (about {rate:.2f}x)."

def _pcm_to_wav_bytes(
    pcm_bytes: bytes,
    sample_rate_hz: int = DEFAULT_SAMPLE_RATE_HZ,
    channels: int = DEFAULT_CHANNELS,
    sample_width_bytes: int = DEFAULT_SAMPLE_WIDTH_BYTES,
) -> bytes:
    #Returns a .wav file as bytes.
    bio = BytesIO()
    with wave.open(bio, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width_bytes)
        wf.setframerate(sample_rate_hz)
        wf.writeframes(pcm_bytes)
    return bio.getvalue()

def synthesize_tts_wav(params: TTSParams) -> Tuple[bytes, bool, str]:
    if not params.text or not params.text.strip():
        raise ValueError("Text is required for TTS.")

    #Prevents huge latency/cache artifacts.
    if len(params.text) > 12000:
        raise ValueError("Text is too long for TTS right now (max 12,000 characters).")

    _ensure_cache_dir(CACHE_DIR)

    key = _hash_key(params)
    cache_path = CACHE_DIR / f"{key}.wav"

    if cache_path.exists() and cache_path.stat().st_size > 44:
        logger.info("TTS cache hit: %s", key)
        return cache_path.read_bytes(), True, key

    prompt = _build_tts_prompt(params)
    rate = _slider_to_rate_value(params.rate)
    pitch = _slider_to_pitch_value(params.pitch)

    # Gemini speech generation config (audio-only response)
    gen_config = types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name=params.voice
                )
            )
        ),
    )

    logger.info("TTS cache miss: %s (model=%s, voice=%s)", key, params.model, params.voice)

    c = gemini_client()
    result = c.models.generate_content(
        model=params.model,
        contents=prompt,
        config=gen_config,
    )

    # Extract raw audio bytes
    try:
        part = result.candidates[0].content.parts[0]
        pcm_data = part.inline_data.data  # raw PCM bytes
    except Exception as e:
        logger.exception("Failed to parse Gemini TTS response.")
        raise RuntimeError("Gemini TTS response did not include audio data.") from e

    wav_bytes = _pcm_to_wav_bytes(pcm_data)

    # Write cache atomically
    tmp_path = cache_path.with_suffix(".wav.tmp")
    tmp_path.write_bytes(wav_bytes)
    tmp_path.replace(cache_path)

    return wav_bytes, False, key