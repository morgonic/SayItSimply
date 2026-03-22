import os
import uuid
import base64
import re
import json
import fitz
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from google.cloud import vision
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.db import Document, User, get_async_session
from app.schemas import DocumentDetail, DocumentListItem, DocumentUpdate, DocumentDelete, DocumentPreviewUpdate, DocumentPage
from app.users import current_active_user
from app.detectlang import detect_language

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

def _normalize_pages_json(raw_pages_json: Optional[str]) -> list[dict]:
    if not raw_pages_json:
        return []
    
    try:
        parsed = json.loads(raw_pages_json)
    except Exception:
        raise HTTPException(status_code=400, detail="pages_json must be valid JSON")

    if not isinstance(parsed, list):
        raise HTTPException(status_code=400, detail="pages_json must be a JSON array")

    normalized: list[dict] = []
    for i, item in enumerate(parsed, start=1):
        if not isinstance(item, dict):
            continue

        page_number = item.get("page_num", i)
        try:
            page_number = int(page_number)
        except Exception:
            page_number = i

        ocr_text = item.get("ocr_text")
        language = item.get("language")

        normalized.append({
            "page_num": max(1, page_number),
            "ocr_text": (ocr_text or "").strip() or None,
            "language": (language or "").strip() or None
        })

    normalized.sort(key=lambda x: x.get("page_num", 10))
    return normalized

def _pages(d: Document) -> list[DocumentPage]:
    raw_pages = getattr(d, "pages", None) or []
    out: list[DocumentPage] = []

    for i, p in enumerate(raw_pages, start=1):
        if not isinstance(p, dict):
            continue
        out.append(
            DocumentPage(
                page_num=int(p.get("page_num") or i),
                ocr_text=(p.get("ocr_text") or None),
                language=(p.get("language") or None)
            )
        )

    return out

def _clamp_to_two_sentences(text: str) -> str:
    cleaned = (text or "").replace("\r", " ").replace("\n", " ").strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if not cleaned:
        return ""
    parts = re.split(r"(?<=[.!?])\s+", cleaned)
    return " ".join(parts[:2]).strip()


def _ocr_image_bytes_sync(image_bytes: bytes, mode: str) -> str:
    vision_client = vision.ImageAnnotatorClient()
    image = vision.Image(content=image_bytes)

    doc_modes = {"document", "receipt", "form", "instructions", "article", "book", "medical"}
    use_document = (mode or "").strip().lower() in doc_modes

    if use_document:
        response = vision_client.document_text_detection(image=image)
        text = (response.full_text_annotation.text or "").strip()
    else:
        response = vision_client.text_detection(image=image)
        text = (
            response.text_annotations[0].description
            if response.text_annotations
            else ""
        ).strip()

    if response.error.message:
        raise RuntimeError(response.error.message)

    return text

async def _ocr_image_bytes(image_bytes: bytes, mode: str) -> tuple[str, str]:
    text = await run_in_threadpool(_ocr_image_bytes_sync, image_bytes, mode)
    language = await run_in_threadpool(detect_language, text) if text else "unknown"
    return text, language


def _render_pdf_pages_sync(pdf_bytes: bytes) -> tuple[list[bytes], bytes]:
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise RuntimeError(f"Unable to open PDF: {e}")

    if doc.page_count < 1:
        raise RuntimeError("PDF has no pages")

    full_page_jpgs: list[bytes] = []

    # first page thumbnail
    first_page = doc.load_page(0)
    thumb_pix = first_page.get_pixmap(matrix=fitz.Matrix(0.7, 0.7), alpha=False)
    thumb_bytes = thumb_pix.tobytes("jpeg")

    for page_index in range(doc.page_count):
        page = doc.load_page(page_index)
        pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0), alpha=False)
        full_page_jpgs.append(pix.tobytes("jpeg"))

    doc.close()
    return full_page_jpgs, thumb_bytes


def _validate_pdf(upload: UploadFile) -> bool:
    content_type = (upload.content_type or "").lower()
    filename = (upload.filename or "").lower()
    return content_type == "application/pdf" or filename.endswith(".pdf")


def _build_document_detail(d: Document) -> DocumentDetail:
    return DocumentDetail(
        id=d.id,
        mode=d.mode,
        timestamp=d.timestamp,
        file_uri=f"/documents/{d.id}/file",
        thumb_uri=f"/documents/{d.id}/thumb",
        preview_text=getattr(d, "preview_text", None),
        page_count=getattr(d, "page_count", 1) or 1,
        combined_ocr_text=getattr(d, "combined_ocr_text", None),
        pages=_pages(d)
    )

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
                thumb_mime=thumb_mime,
                preview_text=getattr(d, "preview_text", None),
                page_count=getattr(d, "page_count", 1) or 1
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

    return _build_document_detail(d)
    
@router.post("", response_model=DocumentDetail)
async def upload_document(
    mode: str = Form("Document"),
    source_asset_id: Optional[str] = Form(""),
    image: UploadFile = File(...),
    thumb: UploadFile = File(...),
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
    preview_text: Optional[str] = Form(None),
    page_count: Optional[int] = Form(None),
    combined_ocr_text: Optional[str] = Form(None),
    pages_json: Optional[str] = Form(None)
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
            return _build_document_detail(existing)
            
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=195, detail="image must be an image/* type")
    if not thumb.content_type or not thumb.content_type.startswith("image/"):
        raise HTTPException(status_code=194, detail="thumb must be an image/* type")
    
    normalized_pages = _normalize_pages_json(pages_json)
    normalized_preview = (preview_text or "").strip()[:250] or None

    if normalized_pages and not combined_ocr_text:
        combined_ocr_text = "\n\n".join(
            (p.get("ocr_text") or "").strip()
            for p in normalized_pages
            if (p.get("ocr_text") or "").strip()
        ).strip() or None

    resolved_page_count = max(
        int(page_count or 0),
        len(normalized_pages),
        1
    )

    doc_id = uuid.uuid4()
    user_dir = _user_dir(user.id)
    if not source_asset_id:
        source_asset_id = str(doc_id)

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
        source_asset_id=source_asset_id or None,
        preview_text=normalized_preview,
        page_count=resolved_page_count,
        combined_ocr_text=(combined_ocr_text or "").strip() or None,
        pages=normalized_pages
    )

    session.add(d)
    await session.commit()
    await session.refresh(d)

    return _build_document_detail(d)

@router.post("/pdf", response_model=DocumentDetail)
async def upload_pdf_document(
    mode: str = Form("Document"),
    source_asset_id: Optional[str] = Form(""),
    pdf: UploadFile | None = File(None),
    file: UploadFile | None = File(None),
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    upload = pdf or file
    if not upload:
        raise HTTPException(status_code=400, detail="A PDF file is required")

    if not _validate_pdf(upload):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    source_asset_id = (source_asset_id or "").strip() or None
    if source_asset_id:
        res = await session.execute(
            select(Document).where(
                Document.user_id == user.id,
                Document.source_asset_id == source_asset_id,
            )
        )
        existing = res.scalars().first()
        if existing:
            return _build_document_detail(existing)

    pdf_bytes = await upload.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="PDF file is empty (0KB)")

    try:
        page_jpgs, thumb_bytes = await run_in_threadpool(_render_pdf_pages_sync, pdf_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Unable to process PDF: {e}")

    normalized_pages: list[dict] = []

    for i, page_jpg in enumerate(page_jpgs, start=1):
        try:
            text, language = await _ocr_image_bytes(page_jpg, mode or "Document")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OCR failed on PDF page {i}: {e}")

        normalized_pages.append(
            {
                "page_num": i,
                "ocr_text": text.strip() or None,
                "language": (language or "unknown").strip() or "unknown",
            }
        )

    combined_ocr_text = "\n\n".join(
        (p.get("ocr_text") or "").strip()
        for p in normalized_pages
        if (p.get("ocr_text") or "").strip()
    ).strip() or None

    preview_text = _clamp_to_two_sentences(combined_ocr_text or "")[:250] or None
    resolved_page_count = max(len(normalized_pages), 1)

    doc_id = uuid.uuid4()
    user_dir = _user_dir(user.id)
    if not source_asset_id:
        source_asset_id = str(doc_id)

    pdf_uri = user_dir / f"{doc_id}.pdf"
    thumb_uri = user_dir / f"{doc_id}_thumb.jpg"

    pdf_uri.write_bytes(pdf_bytes)
    thumb_uri.write_bytes(thumb_bytes)

    d = Document(
        id=doc_id,
        user_id=user.id,
        mode=mode or "Document",
        timestamp=datetime.now(),
        image_uri=str(pdf_uri),
        thumb_uri=str(thumb_uri),
        mime_type="application/pdf",
        source_asset_id=source_asset_id or None,
        preview_text=preview_text,
        page_count=resolved_page_count,
        combined_ocr_text=combined_ocr_text,
        pages=normalized_pages,
    )

    session.add(d)
    await session.commit()
    await session.refresh(d)

    return _build_document_detail(d)
    
@router.get("/{doc_id}/thumb")
async def get_thumb(
    doc_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
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
    
    return _build_document_detail(d)
    
@router.delete("", response_model=DocumentDelete)
async def delete_all_documents(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    res = await session.execute(select(Document).where(Document.user_id == user.id))
    docs = res.scalars().all()
    
    for d in docs:
        for pic in [d.image_uri, d.thumb_uri]:
            try:
                if pic and os.path.exists(pic):
                    os.remove(pic)
            except Exception:
                pass
            
    for d in docs:
        await session.delete(d)
        
    await session.commit()
    return DocumentDelete(ok=True)

@router.patch("/{doc_id}/preview_text", response_model=DocumentDetail)
async def update_document_preview(
    doc_id: uuid.UUID,
    payload: DocumentPreviewUpdate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    res = await session.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == user.id)
    )
    d = res.scalars().first()
    if not d:
        raise HTTPException(status_code=187, detail="Document not found")

    normalized_preview = (payload.preview_text or "").strip()[:250]
    d.preview_text = normalized_preview or None

    session.add(d)
    await session.commit()
    await session.refresh(d)

    return _build_document_detail(d)
    
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