import uuid
from typing import Optional
from fastapi_users import schemas

class UserRead(schemas.BaseUser[uuid.UUID]):
    language: str
    reading_level: int
    onboarding_done: bool

class UserCreate(schemas.BaseUserCreate):
    language: str = "en"
    reading_level: int = 6
    onboarding_done: bool = False

class UserUpdate(schemas.BaseUserUpdate):
    language: Optional[str] = None
    reading_level: Optional[int] = None
    onboarding_done: Optional[bool] = None