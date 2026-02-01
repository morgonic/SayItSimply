import re
from langdetect import detect_langs, DetectorFactory
from langdetect.lang_detect_exception import LangDetectException

DetectorFactory.seed = 0
CONFIDENCE_THRESHOLD = 0.80

def detect_language(ocr_text: str) -> tuple[str, float | None]:
    if not ocr_text or not ocr_text.strip():
        return "unknown", None
    
    # clean ocr text
    cleaned = re.sub(r'[^\w\s]', '', ocr_text)
    # don't detect on tiny text
    if len(cleaned) < 20:
        return "unknown", None
    
    try:
        language = detect_langs(cleaned)
    except LangDetectException:
        return "unknown", None
    
    if not language:
        return "unknown", None
    
    best = language[0]
    prob = float(getattr(best, "prob", 0.0) or 0.0)

    if prob < CONFIDENCE_THRESHOLD:
        return "unknown", prob

    return (best.lang or "unknown"), prob

lang = detect_language("TEST TEST TEST")
print(lang)