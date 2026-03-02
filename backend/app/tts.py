import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from app.gemini_tts import TTSParams, synthesize_tts_wav, DEFAULT_MODEL, DEFAULT_VOICE

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tts", tags=["tts"])

class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    rate: float = Field(0.0, ge=-2.0, le=2.0)
    pitch: float = Field(0.0, ge=-2.0, le=2.0)
    voice: str = Field(DEFAULT_VOICE, min_length=1, max_length=40)
    model: str = Field(DEFAULT_MODEL, min_length=1, max_length=80)
    language: Optional[str] = Field(None, max_length=20)
    
@router.post("")
def tts(req: TTSRequest):
    try:
        wav_bytes, cache_hit, cache_key = synthesize_tts_wav(
        TTSParams(
            text=req.text.strip(),
            rate=req.rate,
            pitch=req.pitch,
            voice=req.voice,
            model=req.model,
            language=req.language
        )
    )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("TTS generation failed.")
        raise HTTPException(status_code=502, detail="TTS service failed. Please try again.")

    headers = {
        "Content-Type": "audio/wav",
        "X-TTS-Cache": "HIT" if cache_hit else "MISS",
        "X-TTS-Cache-Key": cache_key,
    } 
    return Response(content=wav_bytes, media_type="audio/wav", headers=headers)