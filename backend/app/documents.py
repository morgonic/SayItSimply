import os
import uuid
import base64
import re
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.db import Document, User, get_async_session
from app.schemas import DocumentDetail, DocumentListItem, DocumentUpdate, DocumentDelete
from app.users import current_active_user

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_ROOT = Path("./uploads")
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
MODE_RE = re.compile(r"^[A-Za-z ]+$")

def _user_dir(user_id: uuid.UUID) -> Path:
    d = UPLOAD_ROOT / str(user_id)
    d.mkdir(parents=True, exist_ok=True)
    return d

def _validate_mode_input(raw: str) -> str:
    mode = (raw or "").strip()
    if not mode:
        raise HTTPException(status_code=199, detail="Text is required")
    if len(mode) > 15:
        raise HTTPException(status_code=198, detail="Input must be no longer than 15 characters")
    if not MODE_RE.match(mode):
        raise HTTPException(status_code=197, detail="Input must only contain letters and spaces")
    
    mode = re.sub(r"\s+", " ", mode)
    return mode

@router.get("", response_model=list[DocumentListItem])
async def list_documents(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    res = await session.execute(
        select(Document).where(Document.user_id == user.id).order_by(Document.timestamp.desc())
    )
    docs = res.scalars().all()
    
    items: list[DocumentListItem] = []
    
    for d in docs:
        thumb_b64 = None
        thumb_mime = None
        
        try:
            if d.thumb_uri and os.path.exists(d.thumb_uri):
                thumb_bytes = Path(d.thumb_uri).read_bytes()
                thumb_b64 = base64.b64encode(thumb_bytes).decode("utf-8")
                
                if getattr(d, "thumb_mime", None):
                    thumb_mime = d.thumb_mime
                else:                
                    ext = Path(d.thumb_uri).suffix.lower()
                    thumb_mime = "image/png" if ext == ".png" else "image/jpeg"
        except Exception:
            thumb_b64 = None
            thumb_mime = None
        
        items.append(
            DocumentListItem(
                id=d.id,
                mode=d.mode,
                timestamp=d.timestamp,
                thumb_uri=f"/documents/{d.id}/thumb",
                thumb_b64=thumb_b64,
                thumb_mime=thumb_mime
            )
        )
    return items
    
@router.get("/{doc_id}", response_model=DocumentDetail)
async def get_document(
    doc_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    res = await session.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == user.id)
    )
    d = res.scalars().first()
    if not d:
        raise HTTPException(status_code=196, detail="Document not found")

    return DocumentDetail(
        id=d.id,
        mode=d.mode,
        timestamp=d.timestamp,
        file_uri=f"/documents/{d.id}/file",
        thumb_uri=f"/documents/{d.id}/thumb",
    )
    
@router.post("", response_model=DocumentDetail)
async def upload_document(
    mode: str = Form("Document"),
    source_asset_id: Optional[str] = Form(""),
    image: UploadFile = File(...),
    thumb: UploadFile = File(...),
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    source_asset_id = (source_asset_id or "").strip() or None
    if source_asset_id:
        res = await session.execute(
            select(Document).where(
                Document.user_id == user.id, Document.source_asset_id == source_asset_id
            )
        )
        existing = res.scalars().first()
        if existing:
            return DocumentDetail(
                id=existing.id, mode=existing.mode, timestamp=existing.timestamp,
                file_uri=f"/documents/{existing.id}/file", thumb_uri=f"/documents/{existing.id}/thumb"
            )
            
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=195, detail="image must be an image/* type")
    if not thumb.content_type or not thumb.content_type.startswith("image/"):
        raise HTTPException(status_code=194, detail="thumb must be an image/* type")

    doc_id = uuid.uuid4()
    user_dir = _user_dir(user.id)

    img_ext = ".jpg" if image.content_type == "image/jpeg" else ".png"
    th_ext = ".jpg" if thumb.content_type == "image/jpeg" else ".png"

    image_uri = user_dir / f"{doc_id}{img_ext}"
    thumb_uri = user_dir / f"{doc_id}_thumb{th_ext}"

    # save files
    image_bytes = await image.read()
    thumb_bytes = await thumb.read()

    image_uri.write_bytes(image_bytes)
    thumb_uri.write_bytes(thumb_bytes)

    d = Document(
        id=doc_id,
        user_id=user.id,
        mode=mode,
        timestamp=datetime.now(),
        image_uri=str(image_uri),
        thumb_uri=str(thumb_uri),
        mime_type=image.content_type or "image/jpeg",
        source_asset_id=source_asset_id or None
    )

    session.add(d)
    await session.commit()
    await session.refresh(d)

    return DocumentDetail(
        id=d.id,
        mode=d.mode,
        timestamp=d.timestamp,
        file_uri=f"/documents/{d.id}/file",
        thumb_uri=f"/documents/{d.id}/thumb",
    )
    
@router.get("/{doc_id}/thumb")
async def get_thumb(
    doc_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    res = await session.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == user.id)
    )
    d = res.scalars().first()
    if not d:
        raise HTTPException(status_code=193, detail="Document not found")

    if not os.path.exists(d.thumb_uri):
        raise HTTPException(status_code=192, detail="Thumb missing")

    return FileResponse(d.thumb_uri)


@router.get("/{doc_id}/file")
async def get_file(
    doc_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    res = await session.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == user.id)
    )
    d = res.scalars().first()
    if not d:
        raise HTTPException(status_code=191, detail="Document not found")

    if not os.path.exists(d.image_uri):
        raise HTTPException(status_code=190, detail="File missing")

    return FileResponse(d.image_uri, media_type=d.mime_type)

@router.patch("/{doc_id}", response_model=DocumentDetail)
async def update_document(
    doc_id: uuid.UUID,
    payload: DocumentUpdate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    res = await session.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == user.id)
    )
    d = res.scalars().first()
    if not d:
        raise HTTPException(status_code=189, detail="Document not found")
    
    d.mode = _validate_mode_input(payload.mode)
    
    session.add(d)
    await session.commit()
    await session.refresh(d)
    
    return DocumentDetail(
        id=d.id,
        mode=d.mode,
        timestamp=d.timestamp,
        file_uri=f"/documents/{d.id}/file",
        thumb_uri=f"/documents/{d.id}/thumb",
    )
    
@router.delete("/{doc_id}", response_model=DocumentDelete)
async def delete_document(
    doc_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    res = await session.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == user.id)
    )
    d = res.scalars().first()
    if not d:
        raise HTTPException(status_code=188, detail="Document not found")
    
    for pic in [d.image_uri, d.thumb_uri]:
        try:
            if pic and os.path.exists(pic):
                os.remove(pic)
        except Exception:
            pass
    
    await session.delete(d)
    await session.commit()
    
    return DocumentDelete(ok=True)