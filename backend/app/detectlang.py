from langdetect import detect_langs, DetectorFactory
from langdetect.lang_detect_exception import LangDetectException

DetectorFactory.seed = 0
CONFIDENCE_THRESHOLD = 0.80

def detect_language(ocr_text: str) -> str:
    if not ocr_text or not ocr_text.strip():
        return "unknown"
    try:
        language = detect_langs(ocr_text)
    except LangDetectException:
        return "unknown"
    
    if not language:
        return "unknown"
    
    best = language[0]
    if best.prob < CONFIDENCE_THRESHOLD:
        return "unknown"

    return best.lang or "unknown"

lang = detect_language("TEST TEST TEST")
print(lang)