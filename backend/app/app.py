import base64
import os, json
import uuid
import hashlib
import secrets

from contextlib import asynccontextmanager

from datetime import datetime, timedelta

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from google.cloud import vision

from pydantic import BaseModel

from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import RedirectResponse, Response

from sqlalchemy import delete, select
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import User, UserSettings, OAuthAccount, create_db_and_tables, engine, FaceIdLoginToken, get_async_session
from app.schemas import (
    ActionItem, AddToDoRequest, PatchItemRequest, UserCreate, UserRead, UserUpdate, GeminiRequest, OCRRequest, OCRResponse, 
    SettingsRead, SettingsUpdate,FaceIdRegisterReq, FaceIdRegisterRes, FaceIdLoginReq, FaceIdDisableReq
)
from app.users import auth_backend, current_active_user, fastapi_users, get_user_manager, google_oauth_client, get_jwt_strategy, SECRET

from dotenv import load_dotenv
load_dotenv()

from app.gemini_flash import get_gemini_response
from app.calibration import router as calibration_router
from app.detectlang import detect_language
from app.documents import router as documents_router
from app.tts import router as tts_router

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

app.include_router(documents_router)

app.include_router(tts_router)

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

### FaceId ###
def hash_faceid_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

def create_faceid_token() -> str:
    return secrets.token_urlsafe(48)

@app.post(
    "/users/me/faceid/register",
    response_model=FaceIdRegisterRes,
    tags=["users"]
)
async def register_faceid_login(
    payload: FaceIdRegisterReq,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    device_id = (payload.device_id or "").strip()
    platform = (payload.platform or "").strip().lower() or "unknown"
    label = (payload.label or "").strip() or None

    if not device_id:
        raise HTTPException(status_code=400, detail="device_id is required.")
    
    raw_token = create_faceid_token()
    token_hash = hash_faceid_token(raw_token)

    result = await session.execute(
        select(FaceIdLoginToken).where(
            FaceIdLoginToken.user_id == user.id,
            FaceIdLoginToken.device_id == device_id,
        )
    )
    existing = result.scalars().first()

    expires_at = datetime.now() + timedelta(days=180)
    
    if existing:
        existing.token_hash = token_hash
        existing.platform = platform
        existing.label = label
        existing.is_active = True
        existing.expires_at = expires_at
        existing.last_used_at = None
        session.add(existing)
    else:
        rec = FaceIdLoginToken(
            user_id=user.id,
            device_id=device_id,
            token_hash=token_hash,
            platform=platform,
            label=label,
            is_active=True,
            expires_at=expires_at,
        )
        session.add(rec)
        
    s = await get_or_create_user_settings(session, user)
    s.face_id = True
    session.add(s)
    
    await session.commit()
    return FaceIdRegisterRes(ok=True, face_id_token=raw_token)

@app.post("/auth/faceid/login", tags=["auth"])
async def face_id_login(
    payload: FaceIdLoginReq,
    session: AsyncSession = Depends(get_async_session)
):
    device_id = (payload.device_id or "").strip()
    raw_token = (payload.face_id_token or "").strip()

    if not device_id or not raw_token:
        raise HTTPException(status_code=400, detail="device_id and face_id_token are required.")

    token_hash = hash_faceid_token(raw_token)

    result = await session.execute(
        select(FaceIdLoginToken).where(
            FaceIdLoginToken.device_id == device_id,
            FaceIdLoginToken.token_hash == token_hash,
            FaceIdLoginToken.is_active == True,
        )
    )
    record = result.scalars().first()
    
    if not record:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Face ID login.")

    if record.expires_at and record.expires_at < datetime.now():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Face ID login token is expired.")

    user_result = await session.execute(
        select(User).where(User.id == record.user_id)
    )
    user = user_result.scalars().first()

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is inactive.")

    record.last_used_at = datetime.now()
    session.add(record)
    await session.commit()

    strategy = get_jwt_strategy()
    access_token = await strategy.write_token(user)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "email": user.email
    }
    
@app.delete("/users/me/faceid", tags=["users"])
async def disable_face_id_login(
    payload: FaceIdDisableReq,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    device_id = (payload.device_id or "").strip()
    if not device_id:
        raise HTTPException(status_code=400, detail="device_id is required.")

    result = await session.execute(
        select(FaceIdLoginToken).where(
            FaceIdLoginToken.user_id == user.id,
            FaceIdLoginToken.device_id == device_id,
        )
    )
    rec = result.scalars().first()

    if rec:
        await session.delete(rec)

    s = await get_or_create_user_settings(session, user)
    s.face_id = False
    session.add(s)

    await session.commit()
    return {"ok": True}

### Settings ###
async def get_or_create_user_settings(
    session: AsyncSession,
    user: User
) -> UserSettings:
    result = await session.execute(
        select(UserSettings).where(UserSettings.user_id == user.id)
    )
    scal = result.scalars().first()
    if scal:
        return scal
    
    scal = UserSettings(user_id=user.id)
    session.add(scal)
    await session.commit()
    await session.refresh(scal)
    return scal

@app.get("/users/me/settings", response_model=SettingsRead, tags=["users"])
async def get_my_settings(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    s = await get_or_create_user_settings(session, user)
    
    return SettingsRead(
        challenge_mode=s.challenge_mode,
        highlight_difficult_words=s.highlight_difficult_words,
        dark_mode=s.dark_mode,
        text_size=s.text_size,
        scan_doc_save=s.scan_doc_save,
        scan_doc_delete=s.scan_doc_delete,
        save_photos=s.save_photos,
        notif=s.notif,
        face_id_supported=s.face_id_supported,
        face_id=s.face_id,
        tts_rate=s.tts_rate,
        tts_pitch=s.tts_pitch,
    )

@app.patch("/users/me/settings", response_model=SettingsRead, tags=["users"])
async def patch_my_settings(
    payload: SettingsUpdate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    s = await get_or_create_user_settings(session, user)
    data = payload.model_dump(exclude_unset=True)
    
    for k, v in data.items():
        if hasattr(s, k):
            setattr(s, k, v)

    session.add(s)
    await session.commit()
    
    await session.refresh(s)
    return SettingsRead(
        challenge_mode=s.challenge_mode,
        highlight_difficult_words=s.highlight_difficult_words,
        dark_mode=s.dark_mode,
        text_size=s.text_size,
        scan_doc_save=s.scan_doc_save,
        scan_doc_delete=s.scan_doc_delete,
        save_photos=s.save_photos,
        notif=s.notif,
        face_id_supported=s.face_id_supported,
        face_id=s.face_id,
        tts_rate=s.tts_rate,
        tts_pitch=s.tts_pitch,
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
async def gemini(request: GeminiRequest, user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):

    # check if text is valid, error if not
    text = (request.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    # settings
    s = await get_or_create_user_settings(session, user)
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
        challenge_mode=s.challenge_mode
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

# endpoint for fetching to do list
@app.get("/users/me/todo", response_model=list[ActionItem], tags=["users"])
async def get_todo_list(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    # start with what is currently stored in user table
    current = [dict(i) for i in (user.to_do or [])]
    # track which ids have already been seen, no dupes
    seen: set[str] = set()
    # bool flag to track whether list has been changed/mutated/updated
    updated = False

    # iterate tjrpigj stpred items
    for item in current:
        # make sure completed is never none
        if item.get("completed") is None:
            item['completed'] = False
            updated = True
        # allow empty deadline to be none
        if "deadline" in item and item["deadline"] == "":
            item["deadline"] = None
            updated = True

    # iterate through stored items
    for item in current:
        # normalize item id
        item_id = str(item.get("id") or "").strip()
        # missing or dupe id, generate new uuid
        if not item_id or item_id in seen:
            item["id"] = str(uuid.uuid4())
            item_id = item["id"]
            updated = True
        # record id as seen
        seen.add(item_id)

    # if anything was updated, write the updated list to the user table in db
    if updated:
        user.to_do = current
        flag_modified(user, "to_do") # have sqlalchemy flag instance as modfiied
        session.add(user)
        await session.commit()
        await session.refresh(user)

    # validate each dict into actionitem modal and return
    return [ActionItem.model_validate(i) for i in current]

# endpoint for adding items to to do list
@app.post("/users/me/todo", response_model=list[ActionItem], tags=["users"])
async def add_todo_items(
    payload: AddToDoRequest, 
    user: User = Depends(current_active_user), 
    session: AsyncSession = Depends(get_async_session)
):
    # current to do list, empty if none
    current = list(user.to_do or [])
    # add each action item from the payload request
    for item in payload.action_items:
        # grab action item text, strip it
        text = (item.action_item or "").strip()
        # if there is no text, continue
        if not text:
            continue
        # append action item text and deadline to current to do list
        current.append({
            "id": str(uuid.uuid4()),
            "action_item": text,
            "deadline": item.deadline,
            "completed": item.completed
        })
    # update user to do with current
    user.to_do = current
    session.add(user)
    # commit it
    await session.commit()
    # refresh attributes
    await session.refresh(user)
    # return ActionItem for each item in user's to do list, or empty list
    return [ActionItem.model_validate(item) for item in (user.to_do or [])]


# endpoint for patching to do list item
@app.patch("/users/me/todo/{item_id}", response_model=ActionItem, tags=["users"])
async def patch_todo_item(
    item_id: str,
    payload: PatchItemRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    # current to do list from user table in db as copy of every dict
    current = [dict(i) for i in (user.to_do or [])]
    raw = payload.model_dump(exclude_unset=True)
    data = payload.model_dump(exclude_unset=True, exclude_none=True)

    if "deadline" in raw:
        data["deadline"] = raw["deadline"]

    # validate and normalize edits
    if "action_item" in data:
        text = (data['action_item'] or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail='action_item cannot be empty')
        data["action_item"] = text

    if "deadline" in data:
        if data['deadline'] is not None:
            due_text = (data["deadline"] or "").strip()
            if due_text:
                data['deadline'] = due_text
            else:
                data['deadline'] = None
    # will store updated dict if match is found
    found = None

    # iterate through to do list and patch completed flag
    for index, item in enumerate(current):
        if str(item.get("id")) == item_id:
            #fix corrupt data
            if item.get("completed") is None:
                item["completed"] = False
            
            # only apply sent fields
            patched = {**item, **data}

            # do not allow none
            if patched.get("completed") is None:
                patched["completed"] = False
            
            current[index] = patched
            found = patched
            break
    # no match, error 404 not found
    if not found:
        raise HTTPException(status_code=404, detail="To-do item not found.")
    # persist patched list to user table in db
    user.to_do = current
    # make sqlalchemy flag the instance as modified
    flag_modified(user, "to_do")

    session.add(user)
    await session.commit()
    await session.refresh(user)
    # return updated item as validated actionitem model
    return ActionItem.model_validate(found)

# endpoint for deleting to do item
@app.delete("/users/me/todo/{item_id}", tags=["users"])
async def delete_todo_item(
    item_id: str,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    # current to do list from db
    current = [dict(i) for i in (user.to_do or [])]
    # updated to do list
    updated = [i for i in current if str(i.get("id")) != item_id]

    # different lengths between lists, error 404 not found
    if len(updated) == len(current):
        raise HTTPException(status_code=404, detail="To-do item not fuound.")
    
    # update to_do in db
    user.to_do = updated
    # mark to_do field as modified
    flag_modified(user, "to_do")

    session.add(user)
    await session.commit()
    await session.refresh(user)

    return {"deleted_item_id": item_id}



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
        # detect langauge from ocr text
        lang = await run_in_threadpool(detect_language, text)
        # return response to client
        return OCRResponse(text=text, language=lang)
    
    except Exception as e:
        # 500 with error message
        raise HTTPException(status_code=500, detail=f"OCR failed: {e}")

@app.get("/authenticated-route")
async def authenticated_route(user: User = Depends(current_active_user)):
    return {"message": f"Hello {user.email}!"}

@app.get("/")
async def read_root():
    return {"message": "SayItSimply backend is running! Woohoo!"}
