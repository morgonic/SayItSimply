import uuid
from typing import Optional
from fastapi_users import schemas

class UserRead(schemas.BaseUser[uuid.UUID]):
    language: str
    reading_level: int

class UserCreate(schemas.BaseUserCreate):
    language: str = "en"
    reading_level: int = 6

class UserUpdate(schemas.BaseUserUpdate):
    language: Optional[str] = None
    reading_level: Optional[int] = None