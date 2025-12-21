import os, json
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import RedirectResponse, Response

from app.db import User, create_db_and_tables, engine
from app.schemas import UserCreate, UserRead, UserUpdate
from app.users import auth_backend, current_active_user, fastapi_users, google_oauth_client, SECRET

from dotenv import load_dotenv

load_dotenv()

print("GOOGLE_OAUTH_CLIENT_ID loaded:", bool(os.getenv("GOOGLE_OAUTH_CLIENT_ID")))
print("GOOGLE_OAUTH_CLIENT_SECRET loaded:", bool(os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")))
print("GOOGLE_REDIRECT_URL:", os.getenv("GOOGLE_REDIRECT_URL"))
print("MOBILE_REDIRECT_URL", os.getenv("MOBILE_REDIRECT_URL"))

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    try:
        yield
    finally:
        await engine.dispose()

# Starlette/FastAPI middleware class, inherits from BaseHTTPMiddleware
class OAuthMobileRedirectMiddleware(BaseHTTPMiddleware):
    # override dispatch(request, call_next) method
    # method runs every request/response, 
    # call_next(request) calls next handler and returns response
    async def dispatch(self, request, call_next):
        # grab json response containing access token
        response = await call_next(request)
        # read mobile redirect link for after oauth completes
        mobile_redirect = os.getenv("MOBILE_REDIRECT_URL")

        if request.url.path not in ("/auth/google/callback", "/auth/associate/google/callback"):
            return response

        # if mobile redirect is not configured, do nothing and return the response
        if not mobile_redirect:
            return response
        
        # getting content-type header
        content_type = response.headers.get("content-type", "")
        # only get json responses
        if not content_type.startswith("application/json"):
            return response
        
        # empty bytes string for response body bytes
        body_bytes = b""
        # stream response using body_iterator
        async for chunk in response.body_iterator:
            body_bytes += chunk

        try:
            # decode json bytes to string to dict
            data = json.loads(body_bytes.decode("utf-8"))
            # get access token from data
            token = data.get("access_token")
            # get token type from data
            token_type = data.get("token_type", "bearer")
            # if token exists
            if token:
                # redirect back to the app using url fragment
                return RedirectResponse(
                    url=f"{mobile_redirect}#access_token={token}&token_type={token_type}",
                    status_code=303
                )
        except Exception:
            pass

        # rebuild response with same content, status, headers
        return Response(
            content=body_bytes,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=content_type
        )


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)
app.add_middleware(OAuthMobileRedirectMiddleware)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

API_URL = os.getenv("EXPO_PUBLIC_API_URL", "")
REDIRECT_URL = os.getenv("GOOGLE_REDIRECT_URL")

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
        is_verified_by_default=True,
        redirect_url=REDIRECT_URL
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