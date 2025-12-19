from collections.abc import AsyncGenerator

from fastapi import Depends
from fastapi_users.db import SQLAlchemyBaseUserTableUUID, SQLAlchemyUserDatabase, SQLAlchemyBaseOAuthAccountTableUUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

# SQLite database URL
DATABASE_URL = "sqlite+aiosqlite:///./sayitsimply.db"

# Define base class for models
class Base(DeclarativeBase):
    pass

# Define the OAuthAccount model
class OAuthAccount(SQLAlchemyBaseOAuthAccountTableUUID, Base):
    pass

# Define the User model
class User(SQLAlchemyBaseUserTableUUID, Base):
    pass

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
    yield SQLAlchemyUserDatabase(session, User)