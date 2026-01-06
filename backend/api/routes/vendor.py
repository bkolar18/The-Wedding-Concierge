"""Vendor management API endpoints."""
from typing import List, Optional
from datetime import date
import base64
import json
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import anthropic

from core.database import get_db
from core.auth import get_current_user
from core.config import settings
from models.user import User
from models.wedding import Wedding
from models.vendor import (
    Vendor,
    VendorPayment,
    VendorDocument,
    VendorCommunication,
    VENDOR_CATEGORIES,
    VENDOR_STATUSES,
    PAYMENT_TYPES,
    PAYMENT_STATUSES,
    DOCUMENT_TYPES,
    COMMUNICATION_TYPES,
)

router = APIRouter()


# --- Pydantic Schemas ---

class VendorCreate(BaseModel):
    business_name: str
    category: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website_url: Optional[str] = None
    instagram_handle: Optional[str] = None
    address: Optional[str] = None
    status: str = "inquiry"
    contract_amount: Optional[float] = None
    deposit_amount: Optional[float] = None
    service_description: Optional[str] = None
    service_date: Optional[date] = None
    arrival_time: Optional[str] = None
    end_time: Optional[str] = None
    notes: Optional[str] = None


class VendorUpdate(BaseModel):
    business_name: Optional[str] = None
    category: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website_url: Optional[str] = None
    instagram_handle: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
    is_confirmed: Optional[bool] = None
    contract_amount: Optional[float] = None
    deposit_amount: Optional[float] = None
    deposit_paid: Optional[bool] = None
    deposit_paid_date: Optional[date] = None
    service_description: Optional[str] = None
    service_date: Optional[date] = None
    arrival_time: Optional[str] = None
    end_time: Optional[str] = None
    notes: Optional[str] = None


class PaymentCreate(BaseModel):
    payment_type: str = "installment"
    description: Optional[str] = None
    amount: float
    due_date: Optional[date] = None
    status: str = "pending"
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class PaymentUpdate(BaseModel):
    payment_type: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    status: Optional[str] = None
    payment_method: Optional[str] = None
    confirmation_number: Optional[str] = None
    notes: Optional[str] = None


class CommunicationCreate(BaseModel):
    communication_type: str = "note"
    direction: str = "outbound"
    subject: Optional[str] = None
    content: str
    follow_up_date: Optional[date] = None


# --- Helper functions ---

async def get_user_wedding(current_user: User, db: AsyncSession) -> Wedding:
    """Get the authenticated user's wedding or raise 404."""
    if not current_user.wedding_id:
        raise HTTPException(
            status_code=404,
            detail="You don't have a wedding yet. Create one first."
        )

    result = await db.execute(
        select(Wedding).where(Wedding.id == current_user.wedding_id)
    )
    wedding = result.scalar_one_or_none()

    if not wedding:
        raise HTTPException(status_code=404, detail="Wedding not found")

    return wedding


def serialize_vendor(vendor: Vendor) -> dict:
    """Serialize a vendor to a dictionary."""
    return {
        "id": str(vendor.id),
        "business_name": vendor.business_name,
        "category": vendor.category,
        "contact_name": vendor.contact_name,
        "email": vendor.email,
        "phone": vendor.phone,
        "website_url": vendor.website_url,
        "instagram_handle": vendor.instagram_handle,
        "address": vendor.address,
        "status": vendor.status,
        "is_confirmed": vendor.is_confirmed,
        "contract_amount": float(vendor.contract_amount) if vendor.contract_amount else None,
        "deposit_amount": float(vendor.deposit_amount) if vendor.deposit_amount else None,
        "deposit_paid": vendor.deposit_paid,
        "deposit_paid_date": vendor.deposit_paid_date.isoformat() if vendor.deposit_paid_date else None,
        "service_description": vendor.service_description,
        "service_date": vendor.service_date.isoformat() if vendor.service_date else None,
        "arrival_time": vendor.arrival_time,
        "end_time": vendor.end_time,
        "notes": vendor.notes,
        "created_at": vendor.created_at.isoformat() if vendor.created_at else None,
        "updated_at": vendor.updated_at.isoformat() if vendor.updated_at else None,
    }


def serialize_vendor_with_details(vendor: Vendor) -> dict:
    """Serialize a vendor with payments, documents, and communications."""
    data = serialize_vendor(vendor)

    # Calculate payment summary
    total_paid = sum(float(p.amount) for p in vendor.payments if p.status == "paid")
    contract_amount = float(vendor.contract_amount) if vendor.contract_amount else 0

    data["payment_summary"] = {
        "total_contract": contract_amount,
        "total_paid": total_paid,
        "balance_due": contract_amount - total_paid,
        "payment_count": len(vendor.payments),
    }

    data["payments"] = [
        {
            "id": str(p.id),
            "payment_type": p.payment_type,
            "description": p.description,
            "amount": float(p.amount),
            "due_date": p.due_date.isoformat() if p.due_date else None,
            "paid_date": p.paid_date.isoformat() if p.paid_date else None,
            "status": p.status,
            "payment_method": p.payment_method,
            "confirmation_number": p.confirmation_number,
            "notes": p.notes,
        }
        for p in sorted(vendor.payments, key=lambda x: x.due_date or date.max)
    ]

    data["documents"] = [
        {
            "id": str(d.id),
            "document_type": d.document_type,
            "name": d.name,
            "file_name": d.file_name,
            "file_url": d.file_url,
            "is_signed": d.is_signed,
            "expiration_date": d.expiration_date.isoformat() if d.expiration_date else None,
            "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
        }
        for d in vendor.documents
    ]

    data["communications"] = [
        {
            "id": str(c.id),
            "communication_type": c.communication_type,
            "direction": c.direction,
            "subject": c.subject,
            "content": c.content,
            "follow_up_date": c.follow_up_date.isoformat() if c.follow_up_date else None,
            "follow_up_completed": c.follow_up_completed,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in sorted(vendor.communications, key=lambda x: x.created_at, reverse=True)
    ]

    return data


# --- Vendor Endpoints ---

@router.get("/categories")
async def get_vendor_categories():
    """Get list of vendor categories."""
    return {"categories": VENDOR_CATEGORIES}


@router.get("/statuses")
async def get_vendor_statuses():
    """Get list of vendor statuses."""
    return {"statuses": VENDOR_STATUSES}


@router.get("/")
async def list_vendors(
    category: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all vendors for the user's wedding."""
    wedding = await get_user_wedding(current_user, db)

    query = select(Vendor).where(Vendor.wedding_id == wedding.id)

    if category:
        query = query.where(Vendor.category == category)
    if status:
        query = query.where(Vendor.status == status)

    query = query.options(selectinload(Vendor.payments))

    result = await db.execute(query)
    vendors = result.scalars().all()

    # Build vendor list with payment summary
    vendor_list = []
    for v in vendors:
        data = serialize_vendor(v)
        total_paid = sum(float(p.amount) for p in v.payments if p.status == "paid")
        contract_amount = float(v.contract_amount) if v.contract_amount else 0
        data["payment_summary"] = {
            "total_contract": contract_amount,
            "total_paid": total_paid,
            "balance_due": contract_amount - total_paid,
        }
        vendor_list.append(data)

    return {
        "vendors": vendor_list,
        "total": len(vendor_list),
    }


@router.post("/", status_code=201)
async def create_vendor(
    vendor_data: VendorCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a new vendor to the wedding."""
    wedding = await get_user_wedding(current_user, db)

    # Validate category
    if vendor_data.category not in VENDOR_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {VENDOR_CATEGORIES}"
        )

    # Validate status
    if vendor_data.status not in VENDOR_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {VENDOR_STATUSES}"
        )

    vendor = Vendor(
        wedding_id=wedding.id,
        **vendor_data.model_dump()
    )
    db.add(vendor)
    await db.commit()
    await db.refresh(vendor)

    return {
        "id": str(vendor.id),
        "message": f"Vendor '{vendor.business_name}' added successfully",
    }


@router.get("/{vendor_id}")
async def get_vendor(
    vendor_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get vendor details with payments, documents, and communications."""
    wedding = await get_user_wedding(current_user, db)

    result = await db.execute(
        select(Vendor)
        .options(
            selectinload(Vendor.payments),
            selectinload(Vendor.documents),
            selectinload(Vendor.communications),
        )
        .where(Vendor.id == vendor_id, Vendor.wedding_id == wedding.id)
    )
    vendor = result.scalar_one_or_none()

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    return serialize_vendor_with_details(vendor)


@router.patch("/{vendor_id}")
async def update_vendor(
    vendor_id: str,
    update_data: VendorUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update vendor details."""
    wedding = await get_user_wedding(current_user, db)

    result = await db.execute(
        select(Vendor).where(Vendor.id == vendor_id, Vendor.wedding_id == wedding.id)
    )
    vendor = result.scalar_one_or_none()

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Validate category if provided
    if update_data.category and update_data.category not in VENDOR_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {VENDOR_CATEGORIES}"
        )

    # Validate status if provided
    if update_data.status and update_data.status not in VENDOR_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {VENDOR_STATUSES}"
        )

    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(vendor, field, value)

    await db.commit()
    await db.refresh(vendor)

    return {"id": str(vendor.id), "message": "Vendor updated successfully"}


@router.delete("/{vendor_id}")
async def delete_vendor(
    vendor_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a vendor."""
    wedding = await get_user_wedding(current_user, db)

    result = await db.execute(
        select(Vendor).where(Vendor.id == vendor_id, Vendor.wedding_id == wedding.id)
    )
    vendor = result.scalar_one_or_none()

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    await db.delete(vendor)
    await db.commit()

    return {"message": "Vendor deleted successfully"}


# --- Payment Endpoints ---

@router.get("/{vendor_id}/payments")
async def list_vendor_payments(
    vendor_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all payments for a vendor."""
    wedding = await get_user_wedding(current_user, db)

    # Verify vendor belongs to user's wedding
    result = await db.execute(
        select(Vendor)
        .options(selectinload(Vendor.payments))
        .where(Vendor.id == vendor_id, Vendor.wedding_id == wedding.id)
    )
    vendor = result.scalar_one_or_none()

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    payments = [
        {
            "id": str(p.id),
            "payment_type": p.payment_type,
            "description": p.description,
            "amount": float(p.amount),
            "due_date": p.due_date.isoformat() if p.due_date else None,
            "paid_date": p.paid_date.isoformat() if p.paid_date else None,
            "status": p.status,
            "payment_method": p.payment_method,
            "confirmation_number": p.confirmation_number,
            "notes": p.notes,
        }
        for p in sorted(vendor.payments, key=lambda x: x.due_date or date.max)
    ]

    total_paid = sum(float(p.amount) for p in vendor.payments if p.status == "paid")
    contract_amount = float(vendor.contract_amount) if vendor.contract_amount else 0

    return {
        "payments": payments,
        "summary": {
            "total_contract": contract_amount,
            "total_paid": total_paid,
            "balance_due": contract_amount - total_paid,
        }
    }


@router.post("/{vendor_id}/payments", status_code=201)
async def create_payment(
    vendor_id: str,
    payment_data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a payment record for a vendor."""
    wedding = await get_user_wedding(current_user, db)

    # Verify vendor belongs to user's wedding
    result = await db.execute(
        select(Vendor).where(Vendor.id == vendor_id, Vendor.wedding_id == wedding.id)
    )
    vendor = result.scalar_one_or_none()

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Validate payment type
    if payment_data.payment_type not in PAYMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid payment type. Must be one of: {PAYMENT_TYPES}"
        )

    # Validate status
    if payment_data.status not in PAYMENT_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {PAYMENT_STATUSES}"
        )

    payment = VendorPayment(
        vendor_id=vendor_id,
        wedding_id=wedding.id,
        **payment_data.model_dump()
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    return {"id": str(payment.id), "message": "Payment added successfully"}


@router.patch("/{vendor_id}/payments/{payment_id}")
async def update_payment(
    vendor_id: str,
    payment_id: str,
    update_data: PaymentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a payment record."""
    wedding = await get_user_wedding(current_user, db)

    result = await db.execute(
        select(VendorPayment).where(
            VendorPayment.id == payment_id,
            VendorPayment.vendor_id == vendor_id,
            VendorPayment.wedding_id == wedding.id
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Validate payment type if provided
    if update_data.payment_type and update_data.payment_type not in PAYMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid payment type. Must be one of: {PAYMENT_TYPES}"
        )

    # Validate status if provided
    if update_data.status and update_data.status not in PAYMENT_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {PAYMENT_STATUSES}"
        )

    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(payment, field, value)

    await db.commit()
    await db.refresh(payment)

    return {"id": str(payment.id), "message": "Payment updated successfully"}


@router.delete("/{vendor_id}/payments/{payment_id}")
async def delete_payment(
    vendor_id: str,
    payment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a payment record."""
    wedding = await get_user_wedding(current_user, db)

    result = await db.execute(
        select(VendorPayment).where(
            VendorPayment.id == payment_id,
            VendorPayment.vendor_id == vendor_id,
            VendorPayment.wedding_id == wedding.id
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    await db.delete(payment)
    await db.commit()

    return {"message": "Payment deleted successfully"}


# --- Communication Endpoints ---

@router.get("/{vendor_id}/communications")
async def list_vendor_communications(
    vendor_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all communications for a vendor."""
    wedding = await get_user_wedding(current_user, db)

    result = await db.execute(
        select(Vendor)
        .options(selectinload(Vendor.communications))
        .where(Vendor.id == vendor_id, Vendor.wedding_id == wedding.id)
    )
    vendor = result.scalar_one_or_none()

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    communications = [
        {
            "id": str(c.id),
            "communication_type": c.communication_type,
            "direction": c.direction,
            "subject": c.subject,
            "content": c.content,
            "follow_up_date": c.follow_up_date.isoformat() if c.follow_up_date else None,
            "follow_up_completed": c.follow_up_completed,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in sorted(vendor.communications, key=lambda x: x.created_at, reverse=True)
    ]

    return {"communications": communications}


@router.post("/{vendor_id}/communications", status_code=201)
async def create_communication(
    vendor_id: str,
    comm_data: CommunicationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Log a communication with a vendor."""
    wedding = await get_user_wedding(current_user, db)

    # Verify vendor belongs to user's wedding
    result = await db.execute(
        select(Vendor).where(Vendor.id == vendor_id, Vendor.wedding_id == wedding.id)
    )
    vendor = result.scalar_one_or_none()

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Validate communication type
    if comm_data.communication_type not in COMMUNICATION_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid communication type. Must be one of: {COMMUNICATION_TYPES}"
        )

    communication = VendorCommunication(
        vendor_id=vendor_id,
        wedding_id=wedding.id,
        **comm_data.model_dump()
    )
    db.add(communication)
    await db.commit()
    await db.refresh(communication)

    return {"id": str(communication.id), "message": "Communication logged successfully"}


# --- Dashboard Summary Endpoint ---

@router.get("/summary/all")
async def get_vendor_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a summary of all vendors and payments for the dashboard."""
    wedding = await get_user_wedding(current_user, db)

    result = await db.execute(
        select(Vendor)
        .options(selectinload(Vendor.payments))
        .where(Vendor.wedding_id == wedding.id)
    )
    vendors = result.scalars().all()

    # Calculate totals
    total_vendors = len(vendors)
    total_contract = sum(float(v.contract_amount or 0) for v in vendors)
    total_paid = sum(
        sum(float(p.amount) for p in v.payments if p.status == "paid")
        for v in vendors
    )

    # Group by category
    by_category = {}
    for v in vendors:
        if v.category not in by_category:
            by_category[v.category] = {"count": 0, "total": 0, "paid": 0}
        by_category[v.category]["count"] += 1
        by_category[v.category]["total"] += float(v.contract_amount or 0)
        by_category[v.category]["paid"] += sum(
            float(p.amount) for p in v.payments if p.status == "paid"
        )

    # Get upcoming payments (due in next 30 days)
    from datetime import datetime, timedelta
    today = date.today()
    thirty_days = today + timedelta(days=30)

    upcoming_payments = []
    overdue_payments = []

    for v in vendors:
        for p in v.payments:
            if p.status == "pending" and p.due_date:
                payment_info = {
                    "vendor_name": v.business_name,
                    "vendor_id": str(v.id),
                    "payment_id": str(p.id),
                    "description": p.description or p.payment_type,
                    "amount": float(p.amount),
                    "due_date": p.due_date.isoformat(),
                }
                if p.due_date < today:
                    overdue_payments.append(payment_info)
                elif p.due_date <= thirty_days:
                    upcoming_payments.append(payment_info)

    # Sort by due date
    upcoming_payments.sort(key=lambda x: x["due_date"])
    overdue_payments.sort(key=lambda x: x["due_date"])

    return {
        "summary": {
            "total_vendors": total_vendors,
            "total_contract": total_contract,
            "total_paid": total_paid,
            "balance_due": total_contract - total_paid,
            "percent_paid": round((total_paid / total_contract * 100) if total_contract > 0 else 0, 1),
        },
        "by_category": by_category,
        "upcoming_payments": upcoming_payments[:10],  # Top 10
        "overdue_payments": overdue_payments,
    }


# --- Contract Extraction Endpoint ---

class ExtractedContractData(BaseModel):
    """Data extracted from a vendor contract."""
    business_name: Optional[str] = None
    category: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contract_amount: Optional[float] = None
    deposit_amount: Optional[float] = None
    service_description: Optional[str] = None
    service_date: Optional[str] = None
    payment_schedule: Optional[List[dict]] = None
    notes: Optional[str] = None
    confidence: str = "medium"


@router.post("/extract-contract")
async def extract_contract_data(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Extract vendor information from a contract PDF or image.

    Uses Claude's vision capabilities to analyze the contract
    and extract key information for the user to review before saving.

    Supported formats: PDF, PNG, JPG, JPEG
    Max file size: 10MB
    """
    # Verify user has a wedding
    await get_user_wedding(current_user, db)

    # Validate file type
    allowed_types = ["application/pdf", "image/png", "image/jpeg", "image/jpg"]
    content_type = file.content_type or ""

    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Allowed: PDF, PNG, JPG"
        )

    # Read file content
    content = await file.read()

    # Check file size (10MB limit)
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10MB."
        )

    # Encode content for Claude
    base64_content = base64.standard_b64encode(content).decode("utf-8")

    # Determine media type for Claude
    if content_type == "application/pdf":
        media_type = "application/pdf"
    elif content_type in ["image/jpeg", "image/jpg"]:
        media_type = "image/jpeg"
    else:
        media_type = "image/png"

    # Build extraction prompt
    extraction_prompt = """Analyze this wedding vendor contract and extract the following information.
Return the data as a JSON object with these fields:

{
    "business_name": "The vendor's business name",
    "category": "One of: Venue, Photographer, Videographer, DJ/Band, Florist, Caterer, Cake/Desserts, Hair/Makeup, Wedding Planner, Officiant, Transportation, Rentals, Invitations, Photo Booth, Lighting, Other",
    "contact_name": "Primary contact person name",
    "email": "Contact email address",
    "phone": "Contact phone number",
    "address": "Business address",
    "contract_amount": 0.00,
    "deposit_amount": 0.00,
    "service_description": "Brief description of services included",
    "service_date": "YYYY-MM-DD format if specified",
    "payment_schedule": [
        {
            "description": "e.g., Deposit, Final Payment, etc.",
            "amount": 0.00,
            "due_date": "YYYY-MM-DD or relative date like 'Due on wedding day'"
        }
    ],
    "notes": "Any other important terms, cancellation policy, etc.",
    "confidence": "high/medium/low based on how clearly the information was visible"
}

Important:
- Only include fields you can confidently extract
- For amounts, use numbers only (no $ or commas)
- If a date is mentioned but not in YYYY-MM-DD format, try to convert it or include as-is in notes
- Set confidence to "low" if the document is blurry or information is unclear

Return ONLY the JSON object, no other text."""

    try:
        # Call Claude API for extraction
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document" if media_type == "application/pdf" else "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": base64_content,
                            },
                        },
                        {
                            "type": "text",
                            "text": extraction_prompt,
                        }
                    ],
                }
            ],
        )

        # Parse the response
        response_text = message.content[0].text.strip()

        # Try to parse as JSON
        # Handle case where Claude might wrap in ```json blocks
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]

        extracted_data = json.loads(response_text)

        return {
            "success": True,
            "extracted_data": extracted_data,
            "message": "Contract data extracted successfully. Please review and confirm before saving.",
        }

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Failed to parse extracted data. Please try again or enter data manually."
        )
    except anthropic.APIError as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI extraction failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Contract extraction failed: {str(e)}"
        )
