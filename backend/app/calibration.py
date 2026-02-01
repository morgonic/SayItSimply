import random
from fastapi import APIRouter, Depends
from fastapi_users import FastAPIUsers
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import User, get_async_session
from app.schemas import ( CalibStateRes, ScanCountIncrReq, ScanCountIncrRes, UpdateReadingLvlReq,)
from app.users import fastapi_users

router = APIRouter(prefix="/user", tags=["calibration"])

current_user = fastapi_users.current_user()

@router.get("/calib_state", response_model=CalibStateRes)
async def get_calib_state(
    user: User = Depends(current_user),
):
    return {
        "scan_count": user.scan_count,
        "calib_freq": user.calib_freq,
        "reading_level": user.reading_level,
    }
    
@router.post("/scan_count", response_model=ScanCountIncrRes)
async def incr_scan_count(
    _: ScanCountIncrReq,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_user),
):
    if not user.calib_freq or user.calib_freq < 1:
        #change the values after testing -- maybe 10, 15
        user.calib_freq = random.randint(1, 2)
    
    user.scan_count += 1
    
    prompt = user.scan_count >= user.calib_freq
    
    await session.commit()
    await session.refresh(user)
    
    return {
        "scan_count": user.scan_count,
        "calib_freq": user.calib_freq,
        "prompt": prompt,
        "reading_level": user.reading_level,
    }
    
@router.post("/reading_level")
async def update_reading_level(
    payload: UpdateReadingLvlReq,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_user),
):
    user.reading_level = payload.new_level
    
    user.scan_count = 0
    #change the values after testing -- maybe 10, 15
    user.calib_freq = random.randint(1, 2)
    
    await session.commit()
    
    return {"success": True}