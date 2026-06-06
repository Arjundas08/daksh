import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

import database as db

router = APIRouter(prefix="/api/contractors", tags=["Contractors"])

class ContractorRegisterRequest(BaseModel):
    name: str
    phone: str
    password: str
    email: str = ""
    company_name: str = ""
    photo: str = ""

class LoginRequest(BaseModel):
    phone: str
    password: str

@router.post("/login")
async def login_contractor(req: LoginRequest):
    contractor = db.get_contractor_by_phone(req.phone)
    if contractor:
        if contractor.get("password") == req.password:
            return {"status": "existing", "contractor": contractor}
        else:
            raise HTTPException(status_code=401, detail="Invalid password")
    return {"status": "new"}

@router.post("/register", status_code=201)
async def register_contractor(req: ContractorRegisterRequest):
    existing = db.get_contractor_by_phone(req.phone)
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
        
    contractor = db.create_contractor(
        name=req.name,
        phone=req.phone,
        password=req.password,
        email=req.email,
        company_name=req.company_name,
        photo=req.photo,
    )
    return {"success": True, "contractor": contractor}
