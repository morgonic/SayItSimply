from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import User, create_db_and_tables, engine
from app.schemas import UserCreate, UserRead, UserUpdate
from app.users import auth_backend, current_active_user, fastapi_users, google_oauth_client, SECRET


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    try:
        yield
    finally:
        await engine.dispose()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(
    fastapi_users.get_auth_router(auth_backend), prefix="/auth/jwt", tags=["auth"]
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"]
)
app.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/auth",
    tags=["auth"]
)
app.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/auth",
    tags=["auth"]
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"]
)
app.include_router(
    fastapi_users.get_oauth_router(
        google_oauth_client, 
        auth_backend, 
        SECRET,
        associate_by_email=True,
        is_verified_by_default=True
    ),
    prefix="/auth/google",
    tags=["auth"]
)
app.include_router(
    fastapi_users.get_oauth_associate_router(google_oauth_client, UserRead, SECRET),
    prefix="/auth/associate/google",
    tags=["auth"]
)

@app.get("/authenticated-route")
async def authenticated_route(user: User = Depends(current_active_user)):
    return {"message": f"Hello {user.email}!"}

@app.get("/")
async def read_root():
    return {"message": "SayItSimply backend is running! Woohoo!"}