from collections.abc import AsyncGenerator
import uuid
from datetime import datetime
from fastapi import Depends
from fastapi_users.db import SQLAlchemyBaseUserTableUUID, SQLAlchemyUserDatabase, SQLAlchemyBaseOAuthAccountTableUUID
from sqlalchemy import Column, DateTime, JSON, ForeignKey, String, UniqueConstraint
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.orm import DeclarativeBase, Mapped, relationship, mapped_column

# SQLite database URL
DATABASE_URL = "sqlite+aiosqlite:///./sayitsimply.db"

# Define base class for models
class Base(DeclarativeBase):
    pass

# Define the OAuthAccount model
class OAuthAccount(SQLAlchemyBaseOAuthAccountTableUUID, Base):
    pass

# Define and map user settings. pkey = user_id (1:1 relationship)
class UserSettings(Base):
    __tablename__ = "user_settings"
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # Settings - Set to defaults (match frontend)
    challenge_mode: Mapped[bool] = mapped_column(default=False, server_default="0")
    highlight_difficult_words: Mapped[bool] = mapped_column(default=True, server_default="1")
    dark_mode: Mapped[bool] = mapped_column(default=False, server_default="0")
    text_size: Mapped[str] = mapped_column(default="M", server_default="M")
    scan_doc_save: Mapped[bool] = mapped_column(default=True, server_default="1")
    scan_doc_delete: Mapped[int | None] = mapped_column(nullable=True, default=30)
    save_photos: Mapped[bool] = mapped_column(default=False, server_default="0")
    notif: Mapped[bool] = mapped_column(default=True, server_default="1")
    face_id_supported: Mapped[bool] = mapped_column(default=False, server_default="0")
    face_id: Mapped[bool] = mapped_column(default=False, server_default="0")
    tts_rate: Mapped[float] = mapped_column(default=1.0, server_default="1.0")
    tts_pitch: Mapped[float] = mapped_column(default=1.0, server_default="1.0")
    user: Mapped["User"] = relationship(back_populates="settings")

# Define Documents model
class Document(Base):
    __tablename__ = "documents"
    
    source_asset_id = Column(String, nullable=True, index=True)
    
    __table_args__ = (
        UniqueConstraint("user_id", "source_asset_id", name="doc_user_source_asset"),
    )
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    
    mode: Mapped[str] = mapped_column(String(50), default="Document")
    timestamp: Mapped[datetime] = mapped_column(DateTime)
    image_uri: Mapped[str] = mapped_column(String, nullable=False)
    thumb_uri: Mapped[str] = mapped_column(String, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(50), default="image/jpeg")
    user: Mapped["User"] = relationship("User", back_populates="documents")

# Define the User model
class User(SQLAlchemyBaseUserTableUUID, Base):
    oauth_accounts: Mapped[list[OAuthAccount]] = relationship(
        "OAuthAccount", lazy="joined"
    )
    language: Mapped[str] = mapped_column(default="en")
    reading_level: Mapped[int] = mapped_column(default=6)
    onboarding_done: Mapped[bool] = mapped_column(default=False)
    profile_photo: Mapped[str | None] = mapped_column(nullable=True, default=None)
    scan_count: Mapped[int] = mapped_column(default=0, server_default="0")
    calib_freq: Mapped[int] = mapped_column(default=0, server_default="0")
    settings: Mapped["UserSettings | None"] = relationship(
        "UserSettings",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="joined"
    )
    documents: Mapped["Document | None"] = relationship(
        "Document",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    to_do: Mapped[list[dict[str, any]]] = mapped_column(
        MutableList.as_mutable(JSON),
        default=list,
        server_default="[]"
    )

# Create async engine and session maker
engine = create_async_engine(DATABASE_URL)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

# Create the database tables
async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# Define async session dependency
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session

# Define user database dependency
async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    yield SQLAlchemyUserDatabase(session, User, OAuthAccount)