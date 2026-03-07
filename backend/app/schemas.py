import uuid
from typing import Optional, List, Literal
from fastapi_users import schemas
from pydantic import BaseModel, Field
from datetime import datetime

class ActionItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())) # generate action item id here
    action_item: str
    deadline: Optional[str] = None
    completed: bool = False

# request model for users/me/todo
class AddToDoRequest(BaseModel):
    action_items: List[ActionItem]

# request model to patch to do list items
class PatchItemRequest(BaseModel):
    action_item: Optional[str] = None
    deadline: Optional[str] = None
    completed: Optional[bool] = None

class UserRead(schemas.BaseUser[uuid.UUID]):
    language: str
    reading_level: int
    onboarding_done: bool
    profile_photo: Optional[str]
    scan_count: int
    calib_freq: int
    to_do: List[ActionItem] = Field(default_factory=list)

class UserCreate(schemas.BaseUserCreate):
    language: str = "en"
    reading_level: int = 6
    onboarding_done: bool = False
    profile_photo: Optional[str] = None
    scan_count: int = 0
    calib_freq: int = 0
    to_do: List[ActionItem] = Field(default_factory=list)

class UserUpdate(schemas.BaseUserUpdate):
    language: Optional[str] = None
    reading_level: Optional[int] = None
    onboarding_done: Optional[bool] = None
    profile_photo: Optional[str] = None
    scan_count: Optional[int] = None
    calib_freq: Optional[int] = None
    to_do: Optional[List[ActionItem]] = None

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
    action_items: List[ActionItem] = Field(description="A list of the action items that have been detected from the text for the user to add to their to-do list.")
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
    
TextSizeVals = Literal["XS", "S", "M", "L", "XL"]

class SettingsRead(BaseModel):
    challenge_mode: bool
    highlight_difficult_words: bool
    dark_mode: bool
    text_size: TextSizeVals
    scan_doc_save: bool
    scan_doc_delete: Optional[int] = Field(
        default=30,
        description="Days before deleting history. Null = never."
    )
    save_photos: bool
    notif: bool
    face_id_supported: bool
    face_id: bool
    tts_rate: float
    tts_pitch: float
    
class SettingsUpdate(BaseModel):
    challenge_mode: Optional[bool] = None
    highlight_difficult_words: Optional[bool] = None
    dark_mode: Optional[bool] = None
    text_size: Optional[TextSizeVals] = None
    scan_doc_save: Optional[bool] = None
    scan_doc_delete: Optional[int] | None = None  # allow null
    save_photos: Optional[bool] = None
    notif: Optional[bool] = None
    face_id_supported: Optional[bool] = None
    face_id: Optional[bool] = None
    tts_rate: Optional[float] = None
    tts_pitch: Optional[float] = None
    
class DocumentListItem(BaseModel):
    id: uuid.UUID
    mode: str
    timestamp: datetime
    thumb_uri: str
    thumb_b64: Optional[str] = None
    thumb_mime: Optional[str] = None
    preview_text: Optional[str] = None
    
class DocumentDetail(BaseModel):
    id: uuid.UUID
    mode: str
    timestamp: datetime
    file_uri: str
    thumb_uri: str
    thumb_b64: Optional[str] = None
    thumb_mime: Optional[str] = None
    preview_text: Optional[str] = None
    
class DocumentUpdate(BaseModel):
    mode: str = Field(description="A label for the source of the text")
    
class DocumentDelete(BaseModel):
    ok: bool = True
    
class DocumentPreviewUpdate(BaseModel):
    preview_text: str = Field(min_length=20, max_length=250)
    
# FaceId schemas
class FaceIdRegisterReq(BaseModel):
    device_id: str
    platform: str
    label: Optional[str] = None

class FaceIdRegisterRes(BaseModel):
    ok: bool = True
    face_id_token: str

class FaceIdLoginReq(BaseModel):
    device_id: str
    face_id_token: str

class FaceIdDisableReq(BaseModel):
    device_id: str

class FaceIdCapabilityRes(BaseModel):
    enabled: bool