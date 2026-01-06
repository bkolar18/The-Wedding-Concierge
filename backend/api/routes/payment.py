"""Stripe payment API endpoints."""
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.config import settings
from core.auth import get_current_user
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize Stripe
try:
    import stripe
    if settings.STRIPE_SECRET_KEY:
        stripe.api_key = settings.STRIPE_SECRET_KEY
        STRIPE_ENABLED = True
    else:
        STRIPE_ENABLED = False
        logger.warning("Stripe not configured - payment features disabled")
except ImportError:
    STRIPE_ENABLED = False
    logger.warning("Stripe package not installed")


# --- Pydantic Schemas ---

class CreateCheckoutRequest(BaseModel):
    """Request to create a checkout session."""
    tier: str  # "standard" or "premium"
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CheckoutSessionResponse(BaseModel):
    """Response with checkout session URL."""
    checkout_url: str
    session_id: str


class PaymentStatusResponse(BaseModel):
    """User's payment status."""
    subscription_tier: str
    is_paid: bool
    paid_at: Optional[str] = None
    features: dict


# --- Pricing Configuration ---

PRICING_TIERS = {
    "free": {
        "name": "Free",
        "price_cents": 0,
        "features": {
            "chat_enabled": True,
            "chat_limit": 50,  # messages per month
            "sms_enabled": False,
            "vendors_enabled": False,
            "branding_removable": False,
            "qr_codes": True,
        }
    },
    "standard": {
        "name": "Standard",
        "price_cents": settings.PRICE_STANDARD_CENTS,
        "features": {
            "chat_enabled": True,
            "chat_limit": None,  # Unlimited
            "sms_enabled": True,
            "vendors_enabled": True,
            "branding_removable": True,
            "qr_codes": True,
        }
    },
    "premium": {
        "name": "Premium",
        "price_cents": settings.PRICE_PREMIUM_CENTS,
        "features": {
            "chat_enabled": True,
            "chat_limit": None,  # Unlimited
            "sms_enabled": True,
            "vendors_enabled": True,
            "branding_removable": True,
            "qr_codes": True,
            "priority_support": True,
            "custom_domain": True,
        }
    }
}


# --- Endpoints ---

@router.get("/config")
async def get_payment_config():
    """
    Get Stripe publishable key and pricing info.

    This is public - no auth required.
    """
    return {
        "stripe_publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
        "stripe_enabled": STRIPE_ENABLED and bool(settings.STRIPE_PUBLISHABLE_KEY),
        "pricing": {
            tier: {
                "name": info["name"],
                "price_cents": info["price_cents"],
                "price_display": f"${info['price_cents'] / 100:.0f}" if info["price_cents"] > 0 else "Free",
                "features": info["features"],
            }
            for tier, info in PRICING_TIERS.items()
        }
    }


@router.get("/status")
async def get_payment_status(
    current_user: User = Depends(get_current_user),
):
    """
    Get current user's payment/subscription status.
    """
    tier = current_user.subscription_tier or "free"
    tier_info = PRICING_TIERS.get(tier, PRICING_TIERS["free"])

    return PaymentStatusResponse(
        subscription_tier=tier,
        is_paid=tier != "free",
        paid_at=current_user.paid_at.isoformat() if current_user.paid_at else None,
        features=tier_info["features"],
    )


@router.post("/create-checkout-session")
async def create_checkout_session(
    request: CreateCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a Stripe Checkout session for payment.

    Returns a URL to redirect the user to Stripe's hosted checkout page.
    """
    if not STRIPE_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Payment processing is not configured"
        )

    # Validate tier
    if request.tier not in ["standard", "premium"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid tier. Must be 'standard' or 'premium'"
        )

    # Check if already paid for this tier or higher
    tier_order = {"free": 0, "standard": 1, "premium": 2}
    current_tier_level = tier_order.get(current_user.subscription_tier, 0)
    requested_tier_level = tier_order.get(request.tier, 0)

    if current_tier_level >= requested_tier_level:
        raise HTTPException(
            status_code=400,
            detail=f"You already have {current_user.subscription_tier} tier or higher"
        )

    tier_info = PRICING_TIERS[request.tier]

    # Create or retrieve Stripe customer
    try:
        if current_user.stripe_customer_id:
            customer_id = current_user.stripe_customer_id
        else:
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.name,
                metadata={
                    "user_id": current_user.id,
                }
            )
            customer_id = customer.id

            # Save customer ID
            current_user.stripe_customer_id = customer_id
            await db.commit()

        # Create checkout session
        success_url = request.success_url or f"{settings.FRONTEND_URL}/dashboard?payment=success"
        cancel_url = request.cancel_url or f"{settings.FRONTEND_URL}/pricing?payment=cancelled"

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"Wedding Concierge - {tier_info['name']}",
                        "description": f"One-time payment for {tier_info['name']} tier features",
                    },
                    "unit_amount": tier_info["price_cents"],
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": current_user.id,
                "tier": request.tier,
            },
            # Allow promotion codes
            allow_promotion_codes=True,
        )

        return CheckoutSessionResponse(
            checkout_url=session.url,
            session_id=session.id,
        )

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout session: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to create payment session"
        )


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Stripe webhook events.

    This endpoint receives events from Stripe when payments are completed,
    failed, refunded, etc.
    """
    if not STRIPE_ENABLED:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.error("Stripe webhook secret not configured")
        raise HTTPException(status_code=500, detail="Webhook not configured")

    # Get the raw body
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload,
            stripe_signature,
            settings.STRIPE_WEBHOOK_SECRET,
        )
    except ValueError as e:
        logger.error(f"Invalid webhook payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid webhook signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        await handle_successful_payment(session, db)
    elif event["type"] == "payment_intent.payment_failed":
        payment_intent = event["data"]["object"]
        logger.warning(f"Payment failed for {payment_intent.get('id')}")
    elif event["type"] == "charge.refunded":
        charge = event["data"]["object"]
        await handle_refund(charge, db)
    else:
        logger.info(f"Unhandled webhook event type: {event['type']}")

    return {"status": "success"}


async def handle_successful_payment(session: dict, db: AsyncSession):
    """Process a successful checkout session."""
    user_id = session.get("metadata", {}).get("user_id")
    tier = session.get("metadata", {}).get("tier", "standard")
    payment_id = session.get("payment_intent")
    amount = session.get("amount_total")

    if not user_id:
        logger.error(f"No user_id in checkout session metadata: {session.get('id')}")
        return

    # Find the user
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        logger.error(f"User not found for successful payment: {user_id}")
        return

    # Update user's subscription
    user.subscription_tier = tier
    user.stripe_payment_id = payment_id
    user.paid_at = datetime.utcnow()
    user.payment_amount_cents = amount

    await db.commit()
    logger.info(f"User {user.email} upgraded to {tier} tier")


async def handle_refund(charge: dict, db: AsyncSession):
    """Process a refund."""
    payment_intent_id = charge.get("payment_intent")

    if not payment_intent_id:
        return

    # Find user by payment ID
    result = await db.execute(
        select(User).where(User.stripe_payment_id == payment_intent_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        logger.warning(f"User not found for refund: {payment_intent_id}")
        return

    # Downgrade to free tier
    user.subscription_tier = "free"
    await db.commit()
    logger.info(f"User {user.email} downgraded to free tier due to refund")


@router.post("/verify-session/{session_id}")
async def verify_checkout_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify a checkout session and update user status.

    Called by frontend after returning from Stripe checkout to ensure
    the payment was processed (backup in case webhook is delayed).
    """
    if not STRIPE_ENABLED:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    try:
        session = stripe.checkout.Session.retrieve(session_id)

        # Verify this session belongs to this user
        if session.metadata.get("user_id") != current_user.id:
            raise HTTPException(status_code=403, detail="Session does not belong to this user")

        if session.payment_status == "paid":
            # Update user if not already updated by webhook
            if current_user.subscription_tier == "free":
                tier = session.metadata.get("tier", "standard")
                current_user.subscription_tier = tier
                current_user.stripe_payment_id = session.payment_intent
                current_user.paid_at = datetime.utcnow()
                current_user.payment_amount_cents = session.amount_total
                await db.commit()

            return {
                "status": "paid",
                "tier": current_user.subscription_tier,
                "message": "Payment successful!"
            }
        else:
            return {
                "status": session.payment_status,
                "message": "Payment not yet completed"
            }

    except stripe.error.StripeError as e:
        logger.error(f"Error verifying session: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify payment")
