import base64
import os, json
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from google.cloud import vision

from pydantic import BaseModel

from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import RedirectResponse, Response

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import User, OAuthAccount, create_db_and_tables, engine, get_async_session
from app.schemas import UserCreate, UserRead, UserUpdate, GeminiRequest, GeminiResponse, OCRRequest, OCRResponse
from app.users import auth_backend, current_active_user, fastapi_users, get_user_manager, google_oauth_client, SECRET

from dotenv import load_dotenv
load_dotenv()

from app.gemini_flash import get_gemini_response
from app.calibration import router as calibration_router

print("GOOGLE_OAUTH_CLIENT_ID loaded:", bool(os.getenv("GOOGLE_OAUTH_CLIENT_ID")))
print("GOOGLE_OAUTH_CLIENT_SECRET loaded:", bool(os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")))
print("GEMINI_API_KEY loaded:", bool(os.getenv("GEMINI_API_KEY")))
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
                # return variable, redirect response for mobile redirect
                redirect = RedirectResponse(
                    url=f"{mobile_redirect}#access_token={token}&token_type={token_type}",
                    status_code=303
                )
                # prevent stale cookies
                for cookie in response.headers.getlist("set-cookie"):
                    redirect.headers.append("set-cookie", cookie)
                # redirect back to the app using url fragment
                return redirect
        except Exception:
            pass

        # rebuild response with same content, status, headers
        return Response(
            content=body_bytes,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=content_type
        )

# Starlette/FastAPI middleware class, inherits from BaseHTTPMiddleware
# turns JSON authorization_url response into HTTP redirect
# browser session receives CSRF + state cookies not fetch request
class OAuthAuthorizeRedirectMiddleware(BaseHTTPMiddleware):
    # called for every request/response
    async def dispatch(self, request, call_next):
        # only intercept google oauth endpoints
        if request.url.path not in ("/auth/google/authorize", "/auth/associate/google/authorize"):
            return await call_next(request)
        # run normal route handler
        response = await call_next(request)
        # only use json responses
        content_type = response.headers.get("content-type", "")
        if not content_type.startswith("application/json"):
            return response
        # stream response body and collect bytes
        body_bytes = b""
        async for chunk in response.body_iterator:
            body_bytes += chunk
        # try to parse json body and extract authorization url
        try:
            data = json.loads(body_bytes.decode("utf-8"))
            auth_url = data.get("authorization_url")
        except Exception:
            auth_url = None
        # if fail rebuild and return original response
        if not auth_url:
            return Response(
                content=body_bytes,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=content_type
            )
        # redirect browser to google 
        redirect = RedirectResponse(url=auth_url, status_code=303)
        # set oauth cookies
        for cookie in response.headers.getlist("set-cookie"):
            redirect.headers.append("set-cookie", cookie)
        # don't cache redirect
        redirect.headers["Cache-Control"] = "no-store"
        # return redirect response to browser
        return redirect


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)
app.add_middleware(OAuthMobileRedirectMiddleware)
app.add_middleware(OAuthAuthorizeRedirectMiddleware)
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

app.include_router(calibration_router)

@app.delete("/users/me", tags=["users"])
async def delete_me(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    await session.execute(
        delete(OAuthAccount).where(OAuthAccount.user_id == user.id)
    )
    await session.delete(user)
    await session.commit()

    return {"ok": True}

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

### Password Change Logic ###
# Disabled if user logged in via Oauth, so it checks for matching id/user_id between the 2 tables 
class PasswordChangeRequest(BaseModel):
    password: str

@app.get("/users/me/auth-method", tags=["users"])
async def get_auth_method(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(OAuthAccount).where(OAuthAccount.user_id == user.id)
    )
    oauth = result.scalars().first()
    return {"is_oauth": oauth is not None}


@app.patch("/users/me/password", tags=["users"])
async def change_password(
    payload: PasswordChangeRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
    user_manager=Depends(get_user_manager),
):
    result = await session.execute(
        select(OAuthAccount).where(OAuthAccount.user_id == user.id)
    )
    oauth = result.scalars().first()
    if oauth is not None:
        raise HTTPException(status_code=400, detail="OAuth users cannot change password.")

    new_password = (payload.password or "").strip()
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    user.hashed_password = user_manager.password_helper.hash(new_password)

    session.add(user)
    await session.commit()

    return {"ok": True}

### Gemini ###

class ReadingLevelPatch(BaseModel):
    reading_level: int

# gemini endpoint for main structured output
@app.post("/gemini")
async def gemini(request: GeminiRequest, user: User = Depends(current_active_user)):

    # check if text is valid, error if not
    text = (request.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    # document type mode
    mode = request.mode or "Document"
    # default english if no user language found
    language = user.language or "en"
    # default 6 grade level if none found; prefer request override
    reading_level = request.reading_level or user.reading_level or 6
    # how many grades lower than user's reading level
    offset = request.simplify_more_by or 0
    # new reading level with offset
    simplified_level = max(1, reading_level - offset)
    print("Simplified reading level:", simplified_level)
    # return gemini response using 
    # OCR text, user language, user reading level, selected/detected doc type/mode
    return await get_gemini_response(
        input_text=text, 
        language=language, 
        reading_level=simplified_level,
        mode=mode,
        challenge_mode=user.challenge_mode
    )

# endpoint for updating user reading level
@app.patch("/users/me/reading-level", tags=["users"])
async def update_reading_level(
    payload: ReadingLevelPatch,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    # set user reading level to payload (input) reading level
    user.reading_level = payload.reading_level
    # log to console for debug
    print("User's new reading level:", user.reading_level)
    # commit session changes
    await session.commit()
    # return reading level value
    return {"reading_level": user.reading_level}


### OCR ###

# ocr endpoint, accepts base64 image, runs google cloud vision ocr, returns extracted text
@app.post("/ocr", response_model=OCRResponse, tags=["ocr"])
async def ocr_text(payload: OCRRequest):
    try:
        # extract raw base64 string from request body
        raw = payload.image_base64
        # decode base64 into bytes for vision api
        content = base64.b64decode(raw)

        # instantiate vision client
        vision_client = vision.ImageAnnotatorClient()
        # build vision image object from bytes
        image = vision.Image(content=content)

        # language hints to improve ocr results
        image_context = None
        if payload.language:
            image_context = vision.ImageContext(language_hints=payload.language)

        # normalize mode string and compare against set of document-like modes
        doc_modes = {"document", "receipt", "form", "instructions", "article", "book", "medical"}
        use_document = (payload.mode or "").strip().lower() in doc_modes

        if use_document:
            # document_text_detection butter for full-page documents
            # run_in_threadpool to prevent blocking event loop
            response = await run_in_threadpool(
                vision_client.document_text_detection,
                image=image,
                image_context=image_context
            )
            # full_text_annotation has complete extracted text for document ocr
            text = (response.full_text_annotation.text or "").strip()
        else:
            # text_detection for shorter text/signs/labels
            response = await run_in_threadpool(
                vision_client.text_detection,
                image=image,
                image_context=image_context
            )
            # text_annoations[0] contains full text concatenated
            text = (
                response.text_annotations[0].description 
                if response.text_annotations 
                else ""
            ).strip()
        # if vision api returns error, return 500 with error message
        if response.error.message:
            raise HTTPException(status_code=500, detail=response.error.message)
        # return response to client
        return OCRResponse(text=text)
    
    except Exception as e:
        # 500 with error message
        raise HTTPException(status_code=500, detail=f"OCR failed: {e}")

@app.get("/authenticated-route")
async def authenticated_route(user: User = Depends(current_active_user)):
    return {"message": f"Hello {user.email}!"}

@app.get("/")
async def read_root():
    return {"message": "SayItSimply backend is running! Woohoo!"}
