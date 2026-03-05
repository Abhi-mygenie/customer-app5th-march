from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import hashlib
import secrets
import jwt
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'customer-app-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"

# Upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI(title="Customer App API")

# Serve uploaded files
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
customer_router = APIRouter(prefix="/customer", tags=["Customer"])
config_router = APIRouter(prefix="/config", tags=["Configuration"])
upload_router = APIRouter(prefix="/upload", tags=["Upload"])

# ============================================
# Models
# ============================================

class LoginRequest(BaseModel):
    phone_or_email: str
    password: Optional[str] = None
    otp: Optional[str] = None
    restaurant_id: Optional[str] = None  # From POS API response (e.g., "698")
    pos_id: Optional[str] = "0001"  # Default MyGenie, can be "petpooja", "ezzo", etc.

class LoginResponse(BaseModel):
    success: bool
    user_type: str  # "customer" or "restaurant"
    token: str
    user: dict
    restaurant_context: Optional[dict] = None  # Restaurant info for customer

class OTPRequest(BaseModel):
    phone: str
    restaurant_id: Optional[str] = None  # For scoped OTP sending
    pos_id: Optional[str] = "0001"

class CheckCustomerRequest(BaseModel):
    phone: str
    restaurant_id: str
    pos_id: Optional[str] = "0001"

class CustomerProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    phone: str
    email: Optional[str] = None
    total_points: int = 0
    wallet_balance: float = 0.0
    tier: str = "Bronze"
    total_visits: int = 0
    total_spent: float = 0.0
    allergies: Optional[List[str]] = None
    diet_preference: Optional[str] = None

class OrderSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    order_amount: float
    points_earned: int = 0
    created_at: str
    order_type: Optional[str] = None
    items: Optional[List[dict]] = None

class PointsTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    points: int
    transaction_type: str
    description: str
    created_at: str
    balance_after: int = 0

class AppConfigUpdate(BaseModel):
    # Landing Page Visibility
    showLogo: Optional[bool] = None
    showWelcomeText: Optional[bool] = None
    showDescription: Optional[bool] = None
    showSocialIcons: Optional[bool] = None
    showTableNumber: Optional[bool] = None
    showPromotions: Optional[bool] = None
    showPoweredBy: Optional[bool] = None
    showCallWaiter: Optional[bool] = None
    showPayBill: Optional[bool] = None
    showAboutUs: Optional[bool] = None
    showFooter: Optional[bool] = None
    showLandingCustomerCapture: Optional[bool] = None  # Capture name/phone on landing
    # Menu Page Visibility
    showPromotionsOnMenu: Optional[bool] = None
    showCategories: Optional[bool] = None
    # Order Page Visibility
    showCustomerDetails: Optional[bool] = None
    showCustomerName: Optional[bool] = None
    showCustomerPhone: Optional[bool] = None
    showCookingInstructions: Optional[bool] = None
    showSpecialInstructions: Optional[bool] = None
    showPriceBreakdown: Optional[bool] = None
    showTableInfo: Optional[bool] = None
    # Branding - Colors
    logoUrl: Optional[str] = None
    primaryColor: Optional[str] = None
    secondaryColor: Optional[str] = None
    buttonTextColor: Optional[str] = None
    backgroundColor: Optional[str] = None
    textColor: Optional[str] = None
    textSecondaryColor: Optional[str] = None
    # Branding - Typography
    fontHeading: Optional[str] = None
    fontBody: Optional[str] = None
    # Branding - Style
    borderRadius: Optional[str] = None  # sharp, rounded, pill
    # Branding - Text
    welcomeMessage: Optional[str] = None
    tagline: Optional[str] = None
    instagramUrl: Optional[str] = None
    facebookUrl: Optional[str] = None
    twitterUrl: Optional[str] = None
    youtubeUrl: Optional[str] = None
    whatsappNumber: Optional[str] = None
    # Contact
    phone: Optional[str] = None
    # Content - About Us
    aboutUsContent: Optional[str] = None
    aboutUsImage: Optional[str] = None
    openingHours: Optional[str] = None
    # Content - Footer
    footerText: Optional[str] = None
    footerLinks: Optional[List[dict]] = None
    # Content - Contact
    address: Optional[str] = None
    contactEmail: Optional[str] = None
    mapEmbedUrl: Optional[str] = None
    # Content - Feedback
    feedbackEnabled: Optional[bool] = True
    feedbackIntroText: Optional[str] = None
    # Content - Custom Pages
    customPages: Optional[List[dict]] = None
    # Content - Nav Menu
    navMenuOrder: Optional[List[dict]] = None
    # Extra Info Section (Footer)
    showExtraInfo: Optional[bool] = None
    extraInfoItems: Optional[List[str]] = None  # Up to 5 bullet points

class BannerCreate(BaseModel):
    bannerImage: str
    bannerTitle: str
    bannerLink: Optional[str] = None
    bannerOrder: int = 0
    bannerEnabled: bool = True

class BannerUpdate(BaseModel):
    bannerImage: Optional[str] = None
    bannerTitle: Optional[str] = None
    bannerLink: Optional[str] = None
    bannerOrder: Optional[int] = None
    bannerEnabled: Optional[bool] = None

# ============================================
# Auth Helpers
# ============================================

def create_token(user_id: str, user_type: str) -> str:
    payload = {
        "user_id": user_id,
        "user_type": user_type,
        "exp": datetime.now(timezone.utc).timestamp() + (24 * 60 * 60)  # 24 hours
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    
    user_id = payload.get("user_id")
    user_type = payload.get("user_type")
    
    if user_type == "customer":
        user = await db.customers.find_one({"id": user_id}, {"_id": 0})
    else:
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    user["user_type"] = user_type
    return user

async def get_restaurant_user(authorization: str = Header(None)):
    user = await get_current_user(authorization)
    if user.get("user_type") != "restaurant":
        raise HTTPException(status_code=403, detail="Restaurant admin access required")
    return user

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Simple password verification"""
    import bcrypt
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# OTP Storage (in-memory for demo, use Redis in production)
otp_store = {}

def generate_otp(phone: str) -> str:
    otp = str(secrets.randbelow(900000) + 100000)  # 6-digit OTP
    otp_store[phone] = {"otp": otp, "expires": datetime.now(timezone.utc).timestamp() + 300}  # 5 min expiry
    return otp

def verify_otp(phone: str, otp: str) -> bool:
    # Hardcoded OTP "1111" for testing - always valid
    if otp == "1111":
        return True
    
    stored = otp_store.get(phone)
    if not stored:
        return False
    if datetime.now(timezone.utc).timestamp() > stored["expires"]:
        del otp_store[phone]
        return False
    if stored["otp"] == otp:
        del otp_store[phone]
        return True
    return False

# ============================================
# Auth Routes
# ============================================

@auth_router.post("/send-otp")
async def send_otp(request: OTPRequest):
    """Send OTP to phone number - scoped by restaurant context"""
    phone = request.phone.strip()
    
    # Build user_id for restaurant-scoped lookup
    if request.restaurant_id:
        pos_id = request.pos_id or "0001"
        user_id = f"pos_{pos_id}_restaurant_{request.restaurant_id}"
        
        # Check if customer exists for this restaurant
        customer = await db.customers.find_one({
            "phone": phone,
            "user_id": user_id
        }, {"_id": 0})
    else:
        # Fallback: check by phone only (for restaurant admin login)
        customer = await db.customers.find_one({"phone": phone}, {"_id": 0})
    
    if not customer:
        # Check if it's a restaurant user by phone
        user = await db.users.find_one({"phone": phone}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="Phone number not registered for this restaurant")
    
    otp = generate_otp(phone)
    # In production, send OTP via SMS provider (Twilio/MSG91)
    logging.info(f"OTP for {phone}: {otp}")  # For testing
    
    return {"success": True, "message": "OTP sent successfully", "otp_for_testing": otp}

@auth_router.post("/check-customer")
async def check_customer(request: CheckCustomerRequest):
    """Check if customer exists for this restaurant - used for landing page capture flow"""
    phone = request.phone.strip()
    pos_id = request.pos_id or "0001"
    user_id = f"pos_{pos_id}_restaurant_{request.restaurant_id}"
    
    # Normalize phone - remove +91 prefix if present for matching
    normalized_phone = phone
    if phone.startswith('+91'):
        normalized_phone = phone[3:]  # Remove +91
    elif phone.startswith('91') and len(phone) > 10:
        normalized_phone = phone[2:]  # Remove 91
    
    # Check if customer exists for this restaurant (try both formats)
    customer = await db.customers.find_one({
        "$or": [
            {"phone": phone, "user_id": user_id},
            {"phone": normalized_phone, "user_id": user_id}
        ]
    }, {"_id": 0, "name": 1, "phone": 1, "id": 1})
    
    if customer:
        return {
            "exists": True,
            "customer": {
                "name": customer.get("name", ""),
                "phone": customer.get("phone", "")
            }
        }
    
    return {"exists": False, "customer": None}

@auth_router.post("/login", response_model=LoginResponse)
async def unified_login(request: LoginRequest):
    """
    Unified login - checks customers first (scoped by restaurant), then restaurant users
    Supports both OTP (for customers) and password (for restaurant admins)
    """
    identifier = request.phone_or_email.strip()
    
    # Build user_id for restaurant-scoped customer lookup
    customer = None
    user_id = None
    
    if request.restaurant_id:
        pos_id = request.pos_id or "0001"
        user_id = f"pos_{pos_id}_restaurant_{request.restaurant_id}"
        
        # Step 1: Check customers collection (scoped by restaurant)
        customer = await db.customers.find_one({
            "$or": [
                {"phone": identifier, "user_id": user_id},
                {"email": identifier, "user_id": user_id}
            ]
        }, {"_id": 0})
    else:
        # Fallback: check by phone/email only (legacy or admin login)
        customer = await db.customers.find_one({
            "$or": [
                {"phone": identifier},
                {"email": identifier}
            ]
        }, {"_id": 0})
    
    if customer:
        # Customer found - verify OTP
        if not request.otp:
            raise HTTPException(status_code=400, detail="OTP required for customer login")
        
        phone = customer.get("phone")
        if not verify_otp(phone, request.otp):
            raise HTTPException(status_code=401, detail="Invalid or expired OTP")
        
        token = create_token(customer["id"], "customer")
        return LoginResponse(
            success=True,
            user_type="customer",
            token=token,
            user={
                "id": customer["id"],
                "name": customer.get("name", ""),
                "phone": customer.get("phone", ""),
                "email": customer.get("email"),
                "tier": customer.get("tier", "Bronze"),
                "total_points": customer.get("total_points", 0),
                "wallet_balance": customer.get("wallet_balance", 0.0),
                "user_id": customer.get("user_id", "")
            },
            restaurant_context={
                "restaurant_id": request.restaurant_id,
                "pos_id": request.pos_id or "0001",
                "user_id": user_id
            } if request.restaurant_id else None
        )
    
    # Step 2: Check users collection (restaurant admins)
    user = await db.users.find_one({
        "$or": [
            {"email": identifier},
            {"phone": identifier}
        ]
    }, {"_id": 0})
    
    if user:
        # Restaurant user found - verify password
        if not request.password:
            raise HTTPException(status_code=400, detail="Password required for restaurant login")
        
        password_hash = user.get("password_hash")
        if not password_hash:
            raise HTTPException(status_code=401, detail="Password not set for this account")
        
        if not verify_password(request.password, password_hash):
            raise HTTPException(status_code=401, detail="Invalid password")
        
        token = create_token(user["id"], "restaurant")
        return LoginResponse(
            success=True,
            user_type="restaurant",
            token=token,
            user={
                "id": user["id"],
                "restaurant_id": user.get("restaurant_id", ""),
                "email": user.get("email", ""),
                "restaurant_name": user.get("restaurant_name", ""),
                "phone": user.get("phone", ""),
                "pos_id": user.get("pos_id", ""),
                "pos_name": user.get("pos_name", "")
            }
        )
    
    # Step 3: Not found in either collection
    raise HTTPException(status_code=404, detail="Account not found. Please contact restaurant.")

@auth_router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user profile based on user type"""
    return {
        "user_type": user.get("user_type"),
        "user": user
    }

# ============================================
# Customer Routes
# ============================================

@customer_router.get("/profile", response_model=CustomerProfile)
async def get_customer_profile(user: dict = Depends(get_current_user)):
    """Get customer profile"""
    if user.get("user_type") != "customer":
        raise HTTPException(status_code=403, detail="Customer access only")
    
    return CustomerProfile(
        id=user["id"],
        name=user.get("name", ""),
        phone=user.get("phone", ""),
        email=user.get("email"),
        total_points=user.get("total_points", 0),
        wallet_balance=user.get("wallet_balance", 0.0),
        tier=user.get("tier", "Bronze"),
        total_visits=user.get("total_visits", 0),
        total_spent=user.get("total_spent", 0.0),
        allergies=user.get("allergies"),
        diet_preference=user.get("diet_preference")
    )

@customer_router.get("/orders", response_model=List[OrderSummary])
async def get_customer_orders(
    limit: int = 20,
    skip: int = 0,
    user: dict = Depends(get_current_user)
):
    """Get customer order history"""
    if user.get("user_type") != "customer":
        raise HTTPException(status_code=403, detail="Customer access only")
    
    orders = await db.orders.find(
        {"customer_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return [OrderSummary(
        id=o["id"],
        order_amount=o.get("order_amount", 0),
        points_earned=o.get("points_earned", 0),
        created_at=o.get("created_at", ""),
        order_type=o.get("order_type"),
        items=o.get("items", [])
    ) for o in orders]

@customer_router.get("/points", response_model=List[PointsTransaction])
async def get_customer_points(
    limit: int = 50,
    skip: int = 0,
    user: dict = Depends(get_current_user)
):
    """Get customer points transaction history"""
    if user.get("user_type") != "customer":
        raise HTTPException(status_code=403, detail="Customer access only")
    
    transactions = await db.points_transactions.find(
        {"customer_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return [PointsTransaction(
        id=t["id"],
        points=t.get("points", 0),
        transaction_type=t.get("transaction_type", ""),
        description=t.get("description", ""),
        created_at=t.get("created_at", ""),
        balance_after=t.get("balance_after", 0)
    ) for t in transactions]

@customer_router.get("/wallet")
async def get_customer_wallet(
    limit: int = 50,
    skip: int = 0,
    user: dict = Depends(get_current_user)
):
    """Get customer wallet transaction history"""
    if user.get("user_type") != "customer":
        raise HTTPException(status_code=403, detail="Customer access only")
    
    transactions = await db.wallet_transactions.find(
        {"customer_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "balance": user.get("wallet_balance", 0.0),
        "transactions": transactions
    }

@customer_router.get("/coupons")
async def get_customer_coupons(user: dict = Depends(get_current_user)):
    """Get available coupons for customer"""
    if user.get("user_type") != "customer":
        raise HTTPException(status_code=403, detail="Customer access only")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Get coupons that are active and within date range
    coupons = await db.coupons.find({
        "user_id": user.get("user_id"),  # Restaurant's coupons
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }, {"_id": 0}).to_list(100)
    
    return {"coupons": coupons}

@customer_router.put("/profile")
async def update_customer_profile(
    updates: dict,
    user: dict = Depends(get_current_user)
):
    """Update customer profile (limited fields)"""
    if user.get("user_type") != "customer":
        raise HTTPException(status_code=403, detail="Customer access only")
    
    # Only allow certain fields to be updated
    allowed_fields = {"name", "email", "allergies", "diet_preference", "preferred_dining_type"}
    filtered = {k: v for k, v in updates.items() if k in allowed_fields and v is not None}
    
    if not filtered:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    filtered["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.customers.update_one({"id": user["id"]}, {"$set": filtered})
    
    updated = await db.customers.find_one({"id": user["id"]}, {"_id": 0})
    return {"success": True, "user": updated}

# ============================================
# Config Routes (Admin)
# ============================================

@config_router.get("/{restaurant_id}")
async def get_app_config(restaurant_id: str):
    """Get app configuration for a restaurant (public endpoint)"""
    config = await db.customer_app_config.find_one(
        {"restaurant_id": restaurant_id},
        {"_id": 0}
    )
    
    if not config:
        # Return defaults - everything visible
        return {
            "restaurant_id": restaurant_id,
            # Landing Page
            "showLogo": True,
            "showWelcomeText": True,
            "showDescription": True,
            "showSocialIcons": True,
            "showTableNumber": True,
            "showPromotions": True,
            "showPoweredBy": True,
            "showCallWaiter": True,
            "showPayBill": True,
            "showAboutUs": True,
            "showFooter": True,
            "showLandingCustomerCapture": False,  # Default OFF - restaurant opts in
            # Menu Page
            "showPromotionsOnMenu": True,
            "showCategories": True,
            # Order Page
            "showCustomerDetails": True,
            "showCustomerName": True,
            "showCustomerPhone": True,
            "showCookingInstructions": True,
            "showSpecialInstructions": True,
            "showPriceBreakdown": True,
            "showTableInfo": True,
            # Branding - Colors
            "logoUrl": None,
            "primaryColor": "#E8531E",
            "secondaryColor": "#2E7D32",
            "buttonTextColor": "#FFFFFF",
            "backgroundColor": "#FFFFFF",
            "textColor": "#333333",
            "textSecondaryColor": "#666666",
            # Branding - Typography
            "fontHeading": "Montserrat",
            "fontBody": "Montserrat",
            # Branding - Style
            "borderRadius": "rounded",
            # Branding - Text
            "welcomeMessage": "Welcome!",
            "tagline": None,
            "instagramUrl": None,
            "facebookUrl": None,
            "twitterUrl": None,
            "youtubeUrl": None,
            "whatsappNumber": None,
            "phone": None,
            "aboutUsContent": None,
            "aboutUsImage": None,
            "openingHours": None,
            "footerText": None,
            "footerLinks": [],
            "address": None,
            "contactEmail": None,
            "mapEmbedUrl": None,
            "feedbackEnabled": True,
            "feedbackIntroText": None,
            "customPages": [],
            "navMenuOrder": [
                {"id": "home", "label": "Home", "type": "builtin", "visible": True},
                {"id": "menu", "label": "Menu", "type": "builtin", "visible": True},
                {"id": "about", "label": "About Us", "type": "builtin", "visible": True},
                {"id": "contact", "label": "Contact", "type": "builtin", "visible": True},
                {"id": "feedback", "label": "Feedback", "type": "builtin", "visible": True}
            ],
            "banners": [],
            # Extra Info Section
            "showExtraInfo": True,
            "extraInfoItems": []
        }
    
    return config

@config_router.put("/")
async def update_app_config(
    config_update: AppConfigUpdate,
    user: dict = Depends(get_restaurant_user)
):
    """Update app configuration (restaurant admin only)"""
    # Use restaurant_id field if available, fallback to user id
    restaurant_id = user.get("restaurant_id") or user["id"]
    
    update_dict = {k: v for k, v in config_update.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.customer_app_config.update_one(
        {"restaurant_id": restaurant_id},
        {"$set": update_dict, "$setOnInsert": {"restaurant_id": restaurant_id, "banners": []}},
        upsert=True
    )
    
    config = await db.customer_app_config.find_one({"restaurant_id": restaurant_id}, {"_id": 0})
    return {"success": True, "config": config}

@config_router.post("/banners")
async def create_banner(
    banner: BannerCreate,
    user: dict = Depends(get_restaurant_user)
):
    """Add a new banner (restaurant admin only)"""
    restaurant_id = user.get("restaurant_id") or user["id"]
    
    banner_doc = {
        "id": str(uuid.uuid4()),
        **banner.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.customer_app_config.update_one(
        {"restaurant_id": restaurant_id},
        {
            "$push": {"banners": banner_doc},
            "$setOnInsert": {"restaurant_id": restaurant_id}
        },
        upsert=True
    )
    
    return {"success": True, "banner": banner_doc}

@config_router.put("/banners/{banner_id}")
async def update_banner(
    banner_id: str,
    banner_update: BannerUpdate,
    user: dict = Depends(get_restaurant_user)
):
    """Update a banner (restaurant admin only)"""
    restaurant_id = user.get("restaurant_id") or user["id"]
    
    update_dict = {f"banners.$.{k}": v for k, v in banner_update.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.customer_app_config.update_one(
        {"restaurant_id": restaurant_id, "banners.id": banner_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    return {"success": True, "message": "Banner updated"}

@config_router.delete("/banners/{banner_id}")
async def delete_banner(
    banner_id: str,
    user: dict = Depends(get_restaurant_user)
):
    """Delete a banner (restaurant admin only)"""
    restaurant_id = user.get("restaurant_id") or user["id"]
    
    result = await db.customer_app_config.update_one(
        {"restaurant_id": restaurant_id},
        {"$pull": {"banners": {"id": banner_id}}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    return {"success": True, "message": "Banner deleted"}

# ============================================
# Feedback Routes
# ============================================

class FeedbackCreate(BaseModel):
    restaurant_id: str
    name: str
    email: Optional[str] = None
    rating: int = Field(ge=1, le=5)
    message: str

@config_router.post("/feedback")
async def submit_feedback(feedback: FeedbackCreate):
    doc = {
        "id": str(uuid.uuid4()),
        "restaurant_id": feedback.restaurant_id,
        "name": feedback.name,
        "email": feedback.email,
        "rating": feedback.rating,
        "message": feedback.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.feedback.insert_one(doc)
    return {"success": True, "message": "Thank you for your feedback!"}

@config_router.get("/feedback/{restaurant_id}")
async def get_feedback(restaurant_id: str, user: dict = Depends(get_restaurant_user)):
    feedbacks = await db.feedback.find(
        {"restaurant_id": restaurant_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return {"feedbacks": feedbacks}

# ============================================
# Custom Pages Routes
# ============================================

class CustomPageCreate(BaseModel):
    title: str
    slug: str
    content: str
    published: bool = False

class CustomPageUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    published: Optional[bool] = None

@config_router.post("/pages")
async def create_custom_page(
    page_data: CustomPageCreate,
    user: dict = Depends(get_restaurant_user)
):
    restaurant_id = user.get("restaurant_id") or user["id"]
    page_doc = {
        "id": str(uuid.uuid4()),
        "title": page_data.title,
        "slug": page_data.slug,
        "content": page_data.content,
        "published": page_data.published,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.customer_app_config.update_one(
        {"restaurant_id": restaurant_id},
        {"$push": {"customPages": page_doc}, "$setOnInsert": {"restaurant_id": restaurant_id}},
        upsert=True
    )
    return {"success": True, "page": page_doc}

@config_router.put("/pages/{page_id}")
async def update_custom_page(
    page_id: str,
    page_update: CustomPageUpdate,
    user: dict = Depends(get_restaurant_user)
):
    restaurant_id = user.get("restaurant_id") or user["id"]
    update_dict = {f"customPages.$.{k}": v for k, v in page_update.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.customer_app_config.update_one(
        {"restaurant_id": restaurant_id, "customPages.id": page_id},
        {"$set": update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Page not found")
    return {"success": True}

@config_router.delete("/pages/{page_id}")
async def delete_custom_page(
    page_id: str,
    user: dict = Depends(get_restaurant_user)
):
    restaurant_id = user.get("restaurant_id") or user["id"]
    result = await db.customer_app_config.update_one(
        {"restaurant_id": restaurant_id},
        {"$pull": {"customPages": {"id": page_id}}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Page not found")
    return {"success": True}

# ============================================
# Upload Routes
# ============================================

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@upload_router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(get_restaurant_user)
):
    """Upload an image file (restaurant admin only). Max 5MB."""
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename

    with open(filepath, "wb") as f:
        f.write(contents)

    url = f"/api/uploads/{filename}"
    return {"success": True, "url": url, "filename": filename}

# ============================================
# Legacy Routes (Keep existing functionality)
# ============================================

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

@api_router.get("/")
async def root():
    return {"message": "Customer App API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

# ============================================
# Include all routers
# ============================================

api_router.include_router(auth_router)
api_router.include_router(customer_router)
api_router.include_router(config_router)
api_router.include_router(upload_router)
app.include_router(api_router)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
