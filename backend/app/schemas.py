import uuid
from typing import List, Optional
from fastapi_users import schemas
from pydantic import BaseModel, Field

class UserRead(schemas.BaseUser[uuid.UUID]):
    language: str
    reading_level: int
    onboarding_done: bool
    profile_photo: Optional[str] = None

class UserCreate(schemas.BaseUserCreate):
    language: str = "en"
    reading_level: int = 6
    onboarding_done: bool = False
    profile_photo: Optional[str] = None

class UserUpdate(schemas.BaseUserUpdate):
    language: Optional[str] = None
    reading_level: Optional[int] = None
    onboarding_done: Optional[bool] = None
    profile_photo: Optional[str] = None

# request model for /ocr endpoint
class OCRRequest(BaseModel):
    image_base64: str # base64 encoded image data
    mode: str | None = None # optional hint about content/document type
    language: list[str] | None = None # optional list of language codes to help accuracy

# response model for /ocr endpoint
class OCRResponse(BaseModel):
    text: str # extracted ocr text

# request model for /gemini endpoint
class GeminiRequest(BaseModel):
    text: str
    mode: str = "Auto-detect"
    simplify_more_by: int = Field(
        default=0, 
        description="How many grade levels lower than the user's reading_level to simplify more."
    )

# response model for /gemini endpoint
class GeminiResponse(BaseModel):
    summary: str = Field(description="A concise, plain-language summary of exactly what is written in the text.")
    simplified_explanation: str = Field(description="An explanation of the text simplified to the user's preferred reading level.")
    action_items: List[str] = Field(description="A list of the action items that have been detected from the text for the user to add to their to-do list.")
    translation: Optional[str] = Field(default=None, description="A translation of the original text into the user's preferred language.")
    mode: str = Field(description="The detected document type (one word).")
    reading_level: int = Field(description="The grade level used for simplified_explanation. Clamped to minimum 1.")