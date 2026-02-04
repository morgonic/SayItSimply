import uuid
from typing import Optional, List, Literal
from fastapi_users import schemas
from pydantic import BaseModel, Field

class UserRead(schemas.BaseUser[uuid.UUID]):
    language: str
    reading_level: int
    challenge_mode: bool
    onboarding_done: bool
    profile_photo: Optional[str] = None
    scan_count: int
    calib_freq: int

class UserCreate(schemas.BaseUserCreate):
    language: str = "en"
    reading_level: int = 6
    challenge_mode: bool = False
    onboarding_done: bool = False
    profile_photo: Optional[str] = None
    scan_count: int = 0
    calib_freq: int = 0

class UserUpdate(schemas.BaseUserUpdate):
    language: Optional[str] = None
    reading_level: Optional[int] = None
    challenge_mode: Optional[bool] = None
    onboarding_done: Optional[bool] = None
    profile_photo: Optional[str] = None
    scan_count: Optional[int] = None
    calib_freq: Optional[int] = None

# request model for /ocr endpoint
class OCRRequest(BaseModel):
    image_base64: str # base64 encoded image data
    mode: str | None = None # optional hint about content/document type
    language: list[str] | None = None # optional list of language codes to help accuracy

# response model for /ocr endpoint
class OCRResponse(BaseModel):
    text: str # extracted ocr text
    language: str = "unknown"

# request model for /gemini endpoint
class GeminiRequest(BaseModel):
    text: str
    mode: str = "Auto-detect"
    simplify_more_by: int = Field(
        default=0, 
        description="How many grade levels lower than the user's reading_level to simplify more."
    )
    reading_level: Optional[int] = None

# response model for /gemini endpoint
class GeminiResponse(BaseModel):
    summary: str = Field(description="A concise, plain-language summary of exactly what is written in the text.")
    simplification: str = Field(description="A version of the text that is simplified to the user's reading level.")
    action_items: List[str] = Field(description="A list of the action items that have been detected from the text for the user to add to their to-do list.")
    translation: Optional[str] = Field(default=None, description="A translation of the original text into the user's preferred language.")
    mode: str = Field(description="The detected document type (one word).")
    reading_level: int = Field(description="The grade level used for simplification. Clamped to minimum 1.")
    complex_words: Optional[List[str]] = Field(default=None, description="A list of words extracted from the input_text that are above the user's preferred reading level.")
    complex_definitions: Optional[List[str]] = Field(default=None, description="A list of short plain-language definitions for each of the complex_words extracted from the input_text.")
    simple_words: Optional[List[str]] = Field(default=None, description="A list of words extracted from the simplification that are above the user's preferred reading level.")
    simple_definitions: Optional[List[str]] = Field(default=None, description="A list of short plain-language definitions for each of the simple_words extracted from the simplification.")
    
# calibration schemas
class CalibStateRes(BaseModel):
    scan_count: int = Field(default=0,description="The amount of scans the user has intitiated")
    calib_freq: int = Field(default=0,description="How often the user is prompted to calibrate -- random number within the given range.")
    reading_level: Optional[int] = Field(default=None,description="The grade level used for simplification. Only changed if user selects higher/lower")
    
class ScanCountIncrReq(BaseModel):
    event: str = "scan"
    
class ScanCountIncrRes(BaseModel):
    scan_count: int
    calib_freq: int
    prompt: bool = Field(description="The checker to see if scan_count has reached the calib_freq")
    reading_level: Optional[int] = None
    
class UpdateReadingLvlReq(BaseModel):
    new_level: int = Field(ge=1, le=9)
    choice: Literal["lower", "stay", "higher"]