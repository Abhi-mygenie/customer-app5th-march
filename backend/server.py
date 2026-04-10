from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, PlainTextResponse
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

# JWT Config (CA-002 fix - removed weak fallback)
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise ValueError("CRITICAL: JWT_SECRET environment variable must be set")
JWT_ALGORITHM = "HS256"

# Upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# MyGenie POS API base URL (DFA-002 fix: no fallback, fail fast)
MYGENIE_API_URL = os.environ.get("MYGENIE_API_URL")
if not MYGENIE_API_URL:
    raise ValueError("CRITICAL: MYGENIE_API_URL environment variable must be set")

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
dietary_router = APIRouter(prefix="/dietary-tags", tags=["Dietary Tags"])

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
    pos_token: Optional[str] = None  # POS API token for admin operations (QR, etc.)
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
    showLandingCallWaiter: Optional[bool] = None
    showLandingPayBill: Optional[bool] = None
    showAboutUs: Optional[bool] = None
    showFooter: Optional[bool] = None
    showLandingCustomerCapture: Optional[bool] = None  # Capture name/phone on landing
    # Menu Page Visibility
    showPromotionsOnMenu: Optional[bool] = None
    showCategories: Optional[bool] = None
    showMenuFab: Optional[bool] = None  # Menu FAB button on menu page
    # Order Page Visibility
    showCustomerDetails: Optional[bool] = None
    showCustomerName: Optional[bool] = None
    showCustomerPhone: Optional[bool] = None
    showCookingInstructions: Optional[bool] = None
    showSpecialInstructions: Optional[bool] = None
    showPriceBreakdown: Optional[bool] = None
    showTableInfo: Optional[bool] = None
    # Visibility toggles (missing from original model)
    showHamburgerMenu: Optional[bool] = None
    showLoginButton: Optional[bool] = None
    showEstimatedTimes: Optional[bool] = None
    showFoodStatus: Optional[bool] = None  # Food Item Status (Preparing/Ready/Served)
    # Branding - Colors
    logoUrl: Optional[str] = None
    backgroundImageUrl: Optional[str] = None
    mobileBackgroundImageUrl: Optional[str] = None
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
    menuOrder: Optional[dict] = None
    # Extra Info Section (Footer)
    showExtraInfo: Optional[bool] = None
    extraInfoItems: Optional[List[str]] = None  # Up to 5 bullet points
    # Order Page - Loyalty/Coupon/Wallet visibility
    showLoyaltyPoints: Optional[bool] = None
    showCouponCode: Optional[bool] = None
    showWallet: Optional[bool] = None
    # Custom Text
    browseMenuButtonText: Optional[str] = None
    # Customer Capture - Mandatory fields
    mandatoryCustomerName: Optional[bool] = None
    mandatoryCustomerPhone: Optional[bool] = None
    # OTP Configuration per order type
    otpRequiredDineIn: Optional[bool] = None
    otpRequiredTakeaway: Optional[bool] = None
    otpRequiredDineInWithTable: Optional[bool] = None
    otpRequiredWalkIn: Optional[bool] = None
    otpRequiredRoomOrders: Optional[bool] = None
    # Restaurant Operating Shifts (up to 4)
    restaurantShifts: Optional[List[dict]] = None  # [{ "start": "07:00", "end": "11:00" }, ...]
    # Restaurant Open master toggle
    restaurantOpen: Optional[bool] = None
    # Category & Item Timings (admin overrides)
    categoryTimings: Optional[dict] = None  # { "catId": { "start": "07:00", "end": "11:00" } }
    itemTimings: Optional[dict] = None  # { "itemId": { "start": "08:00", "end": "10:00" } }
    # Payment Options Configuration (FEAT-001)
    codEnabled: Optional[bool] = None  # Show COD/Pay at Counter option
    onlinePaymentDinein: Optional[bool] = None  # Enable online payment for dine-in
    onlinePaymentTakeaway: Optional[bool] = None  # Enable online payment for takeaway
    onlinePaymentDelivery: Optional[bool] = None  # Enable online payment for delivery
    payOnlineLabel: Optional[str] = None  # Custom label for online payment (default: "Pay Online")
    payAtCounterLabel: Optional[str] = None  # Custom label for COD (default: "Pay at Counter")

class SetPasswordRequest(BaseModel):
    phone: str
    password: str
    confirm_password: str
    restaurant_id: str
    pos_id: Optional[str] = "0001"
    name: Optional[str] = None

class VerifyPasswordRequest(BaseModel):
    phone: str
    password: str
    restaurant_id: str
    pos_id: Optional[str] = "0001"

class ResetPasswordRequest(BaseModel):
    phone: str
    new_password: str
    confirm_password: str
    otp: str
    restaurant_id: str
    pos_id: Optional[str] = "0001"

class BannerCreate(BaseModel):
    bannerImage: str
    bannerTitle: str
    bannerLink: Optional[str] = None
    bannerOrder: int = 0
    bannerEnabled: bool = True
    displayOn: str = "both"  # "both", "landing", "menu"

class BannerUpdate(BaseModel):
    bannerImage: Optional[str] = None
    bannerTitle: Optional[str] = None
    bannerLink: Optional[str] = None
    bannerOrder: Optional[int] = None
    bannerEnabled: Optional[bool] = None
    displayOn: Optional[str] = None

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
# POS Token Refresh Helper
# ============================================

async def refresh_pos_token(email: str, password: str) -> Optional[str]:
    """
    Call POS API vendoremployee login to get fresh POS token.
    Returns new token on success, None on failure.
    
    NOTE: Token is NOT stored in database - it's returned to frontend
    and stored in localStorage for admin operations (QR, etc.)
    """
    import httpx
    
    # DFA-002 fix: Use module-level MYGENIE_API_URL (no fallback)
    pos_api_url = MYGENIE_API_URL
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            # Use vendoremployee login endpoint with email field
            response = await http_client.post(
                f"{pos_api_url}/auth/vendoremployee/login",
                json={
                    "email": email,
                    "password": password
                },
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                # POS API returns token directly in response.token
                new_token = data.get("token")
                
                if new_token:
                    logging.info(f"[Auth] Got fresh POS token for {email}")
                    return new_token
            else:
                logging.warning(f"[Auth] POS vendoremployee login failed with status {response.status_code}: {response.text[:200]}")
                
    except Exception as e:
        logging.warning(f"[Auth] Failed to get POS token: {str(e)}")
    
    return None

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
    }, {"_id": 0, "name": 1, "phone": 1, "id": 1, "password_hash": 1})
    
    if customer:
        return {
            "exists": True,
            "customer": {
                "name": customer.get("name", ""),
                "phone": customer.get("phone", ""),
                "has_password": bool(customer.get("password_hash"))
            }
        }
    
    return {"exists": False, "customer": None}

@auth_router.post("/login", response_model=LoginResponse)
async def unified_login(request: LoginRequest):
    """
    Unified login - checks customers first (scoped by restaurant), then restaurant users
    Supports both OTP (for customers) and password (for restaurant admins)
    """
    identifier = request.phone_or_email.strip().lower()
    
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
        # Customer found - verify via OTP or password
        if request.otp:
            phone = customer.get("phone")
            if not verify_otp(phone, request.otp):
                raise HTTPException(status_code=401, detail="Invalid or expired OTP")
        elif request.password:
            password_hash = customer.get("password_hash")
            if not password_hash:
                raise HTTPException(status_code=401, detail="No password set. Please use OTP to login.")
            if not verify_password(request.password, password_hash):
                raise HTTPException(status_code=401, detail="Invalid password")
        else:
            raise HTTPException(status_code=400, detail="Password or OTP required for login")
        
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
                "user_id": customer.get("user_id", ""),
                "has_password": bool(customer.get("password_hash"))
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
        
        # Refresh POS token on every login
        # This ensures pos_token is always fresh for POS API calls (QR, etc.)
        user_email = user.get("email", identifier)
        pos_token = await refresh_pos_token(user_email, request.password)
        if not pos_token:
            logging.warning(f"[Auth] Could not get POS token for {user_email}")
        
        token = create_token(user["id"], "restaurant")
        return LoginResponse(
            success=True,
            user_type="restaurant",
            token=token,
            pos_token=pos_token,  # Return POS token to frontend for localStorage
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

@auth_router.post("/set-password")
async def set_password(request: SetPasswordRequest):
    """Set password for a customer (new or existing without password)"""
    import bcrypt
    
    if request.password != request.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    phone = request.phone.strip()
    pos_id = request.pos_id or "0001"
    user_id = f"pos_{pos_id}_restaurant_{request.restaurant_id}"
    
    # Normalize phone
    normalized_phone = phone
    if phone.startswith('+91'):
        normalized_phone = phone[3:]
    elif phone.startswith('91') and len(phone) > 10:
        normalized_phone = phone[2:]
    
    # Find customer
    customer = await db.customers.find_one({
        "$or": [
            {"phone": phone, "user_id": user_id},
            {"phone": normalized_phone, "user_id": user_id}
        ]
    }, {"_id": 0})
    
    password_hash = bcrypt.hashpw(request.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    if customer:
        # Update existing customer with password
        await db.customers.update_one(
            {"id": customer["id"]},
            {"$set": {"password_hash": password_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        token = create_token(customer["id"], "customer")
        return {
            "success": True,
            "message": "Password set successfully",
            "token": token,
            "customer": {"id": customer["id"], "name": customer.get("name", ""), "phone": customer.get("phone", "")}
        }
    else:
        # Create new customer
        customer_id = f"cust-{request.restaurant_id}-{uuid.uuid4().hex[:8]}"
        new_customer = {
            "id": customer_id,
            "user_id": user_id,
            "name": request.name or "",
            "phone": normalized_phone,
            "country_code": "+91",
            "email": "",
            "tier": "Bronze",
            "total_points": 0,
            "wallet_balance": 0,
            "total_visits": 0,
            "total_spent": 0.0,
            "password_hash": password_hash,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.customers.insert_one(new_customer)
        token = create_token(customer_id, "customer")
        return {
            "success": True,
            "message": "Account created with password",
            "token": token,
            "customer": {"id": customer_id, "name": request.name or "", "phone": normalized_phone}
        }

@auth_router.post("/verify-password")
async def verify_customer_password(request: VerifyPasswordRequest):
    """Verify password for returning customer login"""
    import bcrypt
    
    phone = request.phone.strip()
    pos_id = request.pos_id or "0001"
    user_id = f"pos_{pos_id}_restaurant_{request.restaurant_id}"
    
    normalized_phone = phone
    if phone.startswith('+91'):
        normalized_phone = phone[3:]
    elif phone.startswith('91') and len(phone) > 10:
        normalized_phone = phone[2:]
    
    customer = await db.customers.find_one({
        "$or": [
            {"phone": phone, "user_id": user_id},
            {"phone": normalized_phone, "user_id": user_id}
        ]
    }, {"_id": 0})
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    password_hash = customer.get("password_hash")
    if not password_hash:
        raise HTTPException(status_code=400, detail="No password set for this account")
    
    if not bcrypt.checkpw(request.password.encode('utf-8'), password_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    token = create_token(customer["id"], "customer")
    return {
        "success": True,
        "token": token,
        "customer": {
            "id": customer["id"],
            "name": customer.get("name", ""),
            "phone": customer.get("phone", ""),
            "tier": customer.get("tier", "Bronze"),
            "total_points": customer.get("total_points", 0)
        }
    }

@auth_router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password via OTP verification"""
    import bcrypt
    
    if request.new_password != request.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    phone = request.phone.strip()
    
    if not verify_otp(phone, request.otp):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    
    pos_id = request.pos_id or "0001"
    user_id = f"pos_{pos_id}_restaurant_{request.restaurant_id}"
    
    normalized_phone = phone
    if phone.startswith('+91'):
        normalized_phone = phone[3:]
    elif phone.startswith('91') and len(phone) > 10:
        normalized_phone = phone[2:]
    
    password_hash = bcrypt.hashpw(request.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    result = await db.customers.update_one(
        {"$or": [{"phone": phone, "user_id": user_id}, {"phone": normalized_phone, "user_id": user_id}]},
        {"$set": {"password_hash": password_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {"success": True, "message": "Password reset successfully"}

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

# Air BnB router for order details (Edit Order feature)
air_bnb_router = APIRouter(prefix="/air-bnb", tags=["Air BnB"])

@air_bnb_router.get("/get-order-details/{order_id}")
async def get_order_details(order_id: str):
    """Get order details from MyGenie API"""
    import httpx
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{MYGENIE_API_URL}/air-bnb/get-order-details/{order_id}",
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
            else:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch order details from MyGenie")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"MyGenie API unavailable: {str(e)}")

@api_router.get("/table-config")
async def get_table_config(
    user: dict = Depends(get_restaurant_user),
    x_pos_token: Optional[str] = Header(None, alias="X-POS-Token")
):
    """Fetch table/room config from POS API using POS token from header"""
    import httpx
    from urllib.parse import unquote, urlparse

    # Use token from header (preferred) or fallback to db.users (legacy)
    mygenie_token = x_pos_token or user.get("mygenie_token")
    if not mygenie_token:
        raise HTTPException(status_code=400, detail="No POS token provided. Please logout and login again.")

    # Derive v2 base URL from MYGENIE_API_URL (replace /api/v1 with /api/v2)
    base_url = MYGENIE_API_URL.replace("/api/v1", "")
    url = f"{base_url}/api/v2/vendoremployee/restaurant-settings/table-config"

    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.get(
                url,
                headers={
                    "accept": "application/json",
                    "authorization": f"Bearer {mygenie_token}",
                },
            )

            if response.status_code == 401:
                raise HTTPException(
                    status_code=401, 
                    detail="POS session expired. Please logout and login again to refresh your session."
                )
            elif response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="POS API error")

            data = response.json()
            if not data.get("success"):
                raise HTTPException(status_code=502, detail="POS API returned an error")

            pos_data = data.get("data", {})
            all_items = pos_data.get("tables", [])

            # Extract subdomain from the first table's Normal QR URL
            subdomain = ""
            for item in all_items:
                normal_url = (item.get("qr_code_urls") or {}).get("Normal", "")
                if normal_url:
                    decoded = unquote(normal_url)
                    # Pattern: ...data=https://subdomain/rid?...
                    if "data=" in decoded:
                        target = decoded.split("data=")[1].split("?")[0]
                        parsed = urlparse(target)
                        subdomain = parsed.hostname or ""
                    break

            tables = [t for t in all_items if t.get("rtype") == "TB"]
            rooms = [t for t in all_items if t.get("rtype") == "RM"]

            return {
                "tables": tables,
                "rooms": rooms,
                "subdomain": subdomain,
                "restaurant_id": pos_data.get("restaurant_id"),
                "restaurant_name": pos_data.get("restaurant_name"),
            }

    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"POS API unavailable: {str(e)}")

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
            "showWelcomeText": False,
            "showDescription": False,
            "showSocialIcons": False,
            "showTableNumber": True,
            "showPromotions": True,
            "showPoweredBy": True,
            "showCallWaiter": False,
            "showPayBill": False,
            "showLandingCallWaiter": False,
            "showLandingPayBill": False,
            "showAboutUs": True,
            "showFooter": True,
            "showLandingCustomerCapture": False,  # Default OFF - restaurant opts in
            "showHamburgerMenu": True,
            "showLoginButton": False,
            "showEstimatedTimes": False,  # Default OFF
            "showFoodStatus": True,  # Default ON - show Preparing/Ready/Served
            "showOrderStatusTracker": False,  # Order Status Progress Bar
            # Menu Page
            "showPromotionsOnMenu": False,
            "showCategories": True,
            "showMenuFab": True,  # Menu FAB button
            # Order Page
            "showCustomerDetails": False,
            "showCustomerName": False,
            "showCustomerPhone": True,
            "showCookingInstructions": True,
            "showSpecialInstructions": True,
            "showPriceBreakdown": True,
            "showTableInfo": True,
            "showLoyaltyPoints": True,
            "showCouponCode": False,
            "showWallet": False,
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
            "feedbackEnabled": False,
            "feedbackIntroText": None,
            "customPages": [],
            "navMenuOrder": [
                {"id": "home", "label": "Home", "type": "builtin", "visible": True},
                {"id": "menu", "label": "Menu", "type": "builtin", "visible": True},
                {"id": "about", "label": "About Us", "type": "builtin", "visible": False},
                {"id": "contact", "label": "Contact", "type": "builtin", "visible": False},
                {"id": "feedback", "label": "Feedback", "type": "builtin", "visible": False},
                {"id": "login", "label": "Login", "type": "builtin", "visible": False}
            ],
            "banners": [],
            # Extra Info Section
            "showExtraInfo": True,
            "extraInfoItems": [],
            # Customer Capture - Mandatory fields
            "mandatoryCustomerName": False,
            "mandatoryCustomerPhone": False,
            # OTP Configuration per order type
            "otpRequiredDineIn": False,
            "otpRequiredTakeaway": False,
            "otpRequiredDineInWithTable": False,
            "otpRequiredWalkIn": False,
            "otpRequiredRoomOrders": False,
            # Restaurant Operating Shifts
            "restaurantShifts": [{"start": "06:00", "end": "03:00"}],
            # Restaurant Open master toggle (default open)
            "restaurantOpen": True,
            # Category & Item Timings
            "categoryTimings": {},
            "itemTimings": {},
            # Payment Options Configuration (FEAT-001)
            "codEnabled": False,  # Default OFF - restaurant opts in
            "onlinePaymentDinein": True,  # Default ON if Razorpay configured
            "onlinePaymentTakeaway": True,
            "onlinePaymentDelivery": True,
            "payOnlineLabel": "Pay Online",
            "payAtCounterLabel": "Pay at Counter",
        }
    
    return config

@config_router.put("/")
async def update_app_config(
    config_update: AppConfigUpdate,
    user: dict = Depends(get_restaurant_user)
):
    """Update app configuration (restaurant admin only)"""
    # Use restaurant_id as the primary key for config
    # This matches what the frontend uses to fetch config (from URL)
    config_key = user.get("restaurant_id") or user["id"]
    
    update_dict = {k: v for k, v in config_update.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.customer_app_config.update_one(
        {"restaurant_id": config_key},
        {"$set": update_dict, "$setOnInsert": {"restaurant_id": config_key, "banners": []}},
        upsert=True
    )
    
    config = await db.customer_app_config.find_one({"restaurant_id": config_key}, {"_id": 0})
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
# Loyalty Settings Endpoint
# ============================================

@api_router.get("/loyalty-settings/{restaurant_id}")
async def get_loyalty_settings(restaurant_id: str):
    """Get loyalty settings for a restaurant to calculate points"""
    user_id = f"pos_0001_restaurant_{restaurant_id}"
    settings = await db.loyalty_settings.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    if not settings:
        # Return default settings if not found
        return {
            "found": False,
            "bronze_earn_percent": 5.0,
            "silver_earn_percent": 7.0,
            "gold_earn_percent": 10.0,
            "platinum_earn_percent": 15.0,
            "redemption_value": 0.25,
            "min_order_value": 100.0,
            "first_visit_bonus_enabled": True,
            "first_visit_bonus_points": 50
        }
    
    return {
        "found": True,
        "bronze_earn_percent": settings.get("bronze_earn_percent", 5.0),
        "silver_earn_percent": settings.get("silver_earn_percent", 7.0),
        "gold_earn_percent": settings.get("gold_earn_percent", 10.0),
        "platinum_earn_percent": settings.get("platinum_earn_percent", 15.0),
        "redemption_value": settings.get("redemption_value", 0.25),
        "min_order_value": settings.get("min_order_value", 100.0),
        "first_visit_bonus_enabled": settings.get("first_visit_bonus_enabled", True),
        "first_visit_bonus_points": settings.get("first_visit_bonus_points", 50)
    }

@api_router.get("/customer-lookup/{restaurant_id}")
async def customer_lookup(restaurant_id: str, phone: str):
    """Look up customer by phone number for a restaurant — returns name, points, tier"""
    user_id = f"pos_0001_restaurant_{restaurant_id}"
    
    # Normalize phone
    normalized = phone.strip()
    if normalized.startswith('+91'):
        normalized = normalized[3:]
    elif normalized.startswith('91') and len(normalized) > 10:
        normalized = normalized[2:]
    
    customer = await db.customers.find_one(
        {"$or": [{"phone": phone.strip(), "user_id": user_id}, {"phone": normalized, "user_id": user_id}]},
        {"_id": 0, "name": 1, "phone": 1, "total_points": 1, "tier": 1, "wallet_balance": 1, "country_code": 1}
    )
    
    if customer:
        return {
            "found": True,
            "name": customer.get("name", ""),
            "phone": customer.get("phone", ""),
            "country_code": customer.get("country_code", "+91"),
            "total_points": customer.get("total_points", 0),
            "tier": customer.get("tier", "Bronze"),
            "wallet_balance": customer.get("wallet_balance", 0.0),
        }
    
    return {
        "found": False,
        "name": "",
        "phone": normalized,
        "total_points": 0,
        "tier": "Bronze",
        "wallet_balance": 0.0,
    }

# ============================================
# Dietary Tags Routes
# ============================================

# Available dietary tags (global configuration)
AVAILABLE_DIETARY_TAGS = [
    {"id": "jain", "label": "Jain", "icon": "🙏"},
    {"id": "vegan", "label": "Vegan", "icon": "🌱"},
    {"id": "gluten-free", "label": "Gluten-Free", "icon": "🌾"},
    {"id": "lactose-free", "label": "Lactose-Free", "icon": "🥛"},
    {"id": "nut-free", "label": "Nut-Free", "icon": "🥜"},
    {"id": "halal", "label": "Halal", "icon": "☪️"},
    {"id": "sugar-free", "label": "Sugar-Free", "icon": "🍬"},
    {"id": "high-protein", "label": "High Protein", "icon": "💪"},
]

class DietaryTagsMapping(BaseModel):
    mappings: dict  # {item_id: [tag_ids]}

@dietary_router.get("/available")
async def get_available_dietary_tags():
    """Get list of all available dietary tags"""
    return {"tags": AVAILABLE_DIETARY_TAGS}

@dietary_router.get("/{restaurant_id}")
async def get_dietary_tags(restaurant_id: str):
    """Get dietary tag mappings for a restaurant"""
    doc = await db.dietary_tags_mapping.find_one(
        {"restaurant_id": restaurant_id},
        {"_id": 0}
    )
    
    if doc:
        return {
            "restaurant_id": restaurant_id,
            "mappings": doc.get("mappings", {}),
            "updated_at": doc.get("updated_at")
        }
    
    return {
        "restaurant_id": restaurant_id,
        "mappings": {},
        "updated_at": None
    }

@dietary_router.put("/{restaurant_id}")
async def update_dietary_tags(
    restaurant_id: str,
    data: DietaryTagsMapping,
    authorization: str = Header(None)
):
    """Update dietary tag mappings for a restaurant (admin only)"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization required")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = verify_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Update or insert the mapping
    await db.dietary_tags_mapping.update_one(
        {"restaurant_id": restaurant_id},
        {
            "$set": {
                "restaurant_id": restaurant_id,
                "mappings": data.mappings,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": payload.get("sub")
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": "Dietary tags updated successfully"}

# ============================================
# Include all routers
# ============================================

api_router.include_router(auth_router)
api_router.include_router(customer_router)
api_router.include_router(config_router)
api_router.include_router(upload_router)
api_router.include_router(air_bnb_router)  # Add air-bnb router
api_router.include_router(dietary_router)  # Add dietary tags router

# ============================================
# Documentation Endpoints (must be before app.include_router)
# ============================================

@api_router.get("/docs/bug-tracker")
async def get_bug_tracker():
    """View the BUG_TRACKER.md file in browser"""
    file_path = Path("/app/memory/BUG_TRACKER.md")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Bug tracker file not found")
    content = file_path.read_text()
    return PlainTextResponse(content, media_type="text/plain; charset=utf-8")

@api_router.get("/docs/api-mapping")
async def get_api_mapping():
    """View the API_MAPPING.md file in browser"""
    file_path = Path("/app/memory/API_MAPPING.md")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="API mapping file not found")
    content = file_path.read_text()
    return PlainTextResponse(content, media_type="text/plain; charset=utf-8")

@api_router.get("/docs/code-audit")
async def get_code_audit():
    """View the CODE_AUDIT.md file in browser"""
    file_path = Path("/app/memory/CODE_AUDIT.md")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Code audit file not found")
    content = file_path.read_text()
    return PlainTextResponse(content, media_type="text/plain; charset=utf-8")

@api_router.get("/docs/prd")
async def get_prd():
    """View the PRD.md file in browser"""
    file_path = Path("/app/memory/PRD.md")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="PRD file not found")
    content = file_path.read_text()
    return PlainTextResponse(content, media_type="text/plain; charset=utf-8")

@api_router.get("/docs/roadmap")
async def get_roadmap():
    """View the ROADMAP.md file in browser"""
    file_path = Path("/app/memory/ROADMAP.md")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="ROADMAP file not found")
    content = file_path.read_text()
    return PlainTextResponse(content, media_type="text/plain; charset=utf-8")

@api_router.get("/docs/architecture")
async def get_architecture():
    """View the ARCHITECTURE.md file in browser"""
    file_path = Path("/app/memory/ARCHITECTURE.md")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="ARCHITECTURE file not found")
    content = file_path.read_text()
    return PlainTextResponse(content, media_type="text/plain; charset=utf-8")

@api_router.get("/docs/changelog")
async def get_changelog():
    """View the CHANGELOG_TRANSFORM_V1.md file in browser"""
    file_path = Path("/app/memory/CHANGELOG_TRANSFORM_V1.md")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="CHANGELOG file not found")
    content = file_path.read_text()
    return PlainTextResponse(content, media_type="text/plain; charset=utf-8")

@api_router.get("/docs/test-cases")
async def get_test_cases():
    """View the TEST_CASES.md file in browser"""
    file_path = Path("/app/memory/TEST_CASES.md")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="TEST_CASES file not found")
    content = file_path.read_text()
    return PlainTextResponse(content, media_type="text/plain; charset=utf-8")

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
