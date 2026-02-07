import os
import uuid
import base64
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import Document, User, get_async_session
from app.schemas import DocumentDetail, DocumentListItem
from app.users import current_active_user

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_ROOT = Path("./uploads")
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


def _user_dir(user_id: uuid.UUID) -> Path:
    d = UPLOAD_ROOT / str(user_id)
    d.mkdir(parents=True, exist_ok=True)
    return d

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
        raise HTTPException(status_code=404, detail="Document not found")

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
    image: UploadFile = File(...),
    thumb: UploadFile = File(...),
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="image must be an image/* type")
    if not thumb.content_type or not thumb.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="thumb must be an image/* type")

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
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(d.thumb_uri):
        raise HTTPException(status_code=404, detail="Thumb missing")

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
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(d.image_uri):
        raise HTTPException(status_code=404, detail="File missing")

    return FileResponse(d.image_uri, media_type=d.mime_type)