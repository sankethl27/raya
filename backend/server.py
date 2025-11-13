from fastapi import FastAPI, APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError
import socketio
from bson import ObjectId
import razorpay

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("SECRET_KEY", "raya-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 days

# Razorpay setup
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET")

if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    logging.info("Razorpay initialized successfully")
else:
    razorpay_client = None
    logging.warning("Razorpay not enabled - missing API keys")

# Email/OTP setup (using simple random for demo - replace with actual email service)
import random
otp_storage = {}  # In production, use Redis

security = HTTPBearer()

# Socket.IO setup
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Wrap FastAPI with Socket.IO
socket_app = socketio.ASGIApp(sio, app)

# ==================== MODELS ====================

class UserType(str):
    ARTIST = "artist"
    PARTNER = "partner"
    VENUE = "venue"
    ADMIN = "admin"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    user_type: str  # artist, partner, venue, admin
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    is_paused: bool = False  # For pausing profile (hidden but data saved)
    is_artist_pro: bool = False  # Artist Pro subscription status
    is_venue_pro: bool = False  # Venue Pro subscription status
    is_partner_pro: bool = False  # Partner Pro subscription status
    artist_profile_views_count: int = 0  # Track artist profile views (5 free)
    partner_chat_settings: str = "all"  # For partners: "all", "partners_only", "off"
    blocked_users: list = []  # List of blocked user IDs
    last_login: Optional[datetime] = None

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    user_type: str
    profile_data: Optional[Dict[str, Any]] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_type: str
    user_id: str

class Availability(BaseModel):
    date: str  # Format: "YYYY-MM-DD"
    is_available: bool = True  # True = available, False = blocked/unavailable

class PricingInfo(BaseModel):
    price_per_hour: Optional[float] = None  # None means "for promotion"
    is_for_promotion: bool = False
    is_negotiable: bool = False
    negotiation_conditions: Optional[str] = None  # e.g., "Negotiable for events >3 hours"

class ArtistProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    stage_name: str
    description: str
    art_type: str  # pottery, calligraphy, music, book clubs, etc.
    experience_gigs: int = 0
    rating: float = 0.0
    review_count: int = 0
    availability: List[Availability] = []
    locations: List[str] = []  # e.g., ["Koramangala", "Indiranagar", "Whitefield"]
    pricing: Optional[PricingInfo] = None
    profile_image: Optional[str] = None  # base64
    media_gallery: List[str] = []  # base64 images/videos
    is_featured: bool = False
    featured_until: Optional[datetime] = None
    featured_type: Optional[str] = None  # "weekly" or "monthly"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PartnerProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    brand_name: str
    description: str
    service_type: str  # premium water, book launch, food brands, etc.
    rating: float = 0.0
    review_count: int = 0
    locations: List[str] = []  # e.g., ["Koramangala", "Indiranagar", "Whitefield"]
    profile_image: Optional[str] = None  # base64
    media_gallery: List[str] = []  # base64 images/videos
    is_featured: bool = False
    featured_until: Optional[datetime] = None
    featured_type: Optional[str] = None  # "monthly" for brands
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VenueProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    venue_name: str
    description: Optional[str] = None
    profile_image: Optional[str] = None  # base64
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    profile_id: str  # artist or partner profile id
    profile_type: str  # artist or partner
    reviewer_id: str = ""  # venue user id
    reviewer_name: str = "Anonymous"
    rating: float  # 1-5
    comment: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Wishlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_user_id: str = ""
    profile_id: str = ""  # artist or partner profile id
    profile_type: str = ""  # artist or partner
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatRoom(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_user_id: Optional[str] = None  # For venue chats
    provider_user_id: Optional[str] = None  # For venue chats (artist or partner user id)
    provider_type: Optional[str] = None  # artist or partner (for venue chats)
    # For artist-to-artist chats
    participant1_id: Optional[str] = None  # First artist user_id
    participant2_id: Optional[str] = None  # Second artist user_id
    chat_type: str = "venue_artist"  # "venue_artist", "venue_partner", or "artist_artist"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_message_at: Optional[datetime] = None

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chat_room_id: str
    sender_id: str
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ==================== NEW MODELS FOR MINI-BATCH 1 ====================

class VenueSubscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_user_id: str
    subscription_type: str  # "trial", "monthly", "pay_per_view"
    profile_views_remaining: int = 10  # 10 for trial, unlimited for monthly (-1)
    subscription_status: str  # "active", "expired", "cancelled"
    razorpay_subscription_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    amount_paid: Optional[float] = None
    subscription_start: datetime = Field(default_factory=datetime.utcnow)
    subscription_end: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ArtistSubscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    artist_user_id: str
    subscription_type: str  # "free", "pro"
    profile_views_remaining: int = 10  # 10 for free, unlimited for pro (-1)
    subscription_status: str  # "active", "expired", "cancelled"
    razorpay_subscription_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    amount_paid: Optional[float] = None  # ₹499 for pro
    subscription_start: datetime = Field(default_factory=datetime.utcnow)
    subscription_end: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PartnerSubscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_user_id: str
    subscription_type: str  # "free", "pro"
    profile_views_remaining: int = 10  # 10 for free, unlimited for pro (-1)
    subscription_status: str  # "active", "expired", "cancelled"
    razorpay_subscription_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    amount_paid: Optional[float] = None  # ₹499 for pro
    subscription_start: datetime = Field(default_factory=datetime.utcnow)
    subscription_end: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class HostSubscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    host_user_id: str
    subscription_type: str  # "free", "pro"
    profile_views_remaining: int = 10  # 10 for free, unlimited for pro (-1)
    subscription_status: str  # "active", "expired", "cancelled"
    razorpay_subscription_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    amount_paid: Optional[float] = None  # ₹499 for pro
    subscription_start: datetime = Field(default_factory=datetime.utcnow)
    subscription_end: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reporter_user_id: str
    reported_user_id: str
    reason: str  # Description of why user is being reported
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending"  # "pending", "reviewed", "resolved"

class Collaboration(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chat_room_id: str
    initiator_user_id: str  # Who proposed the collaboration
    participant1_id: str  # First party
    participant2_id: str  # Second party
    participant1_approved: bool = False
    participant2_approved: bool = False
    shared_on_home: bool = False  # Shared on Raaya home page
    shared_on_instagram: bool = False  # Shared on Instagram
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    description: Optional[str] = None  # Optional collaboration description

class OTPVerification(BaseModel):
    email: EmailStr
    otp: str
    purpose: str  # "signup" or "forgot_password"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    is_verified: bool = False

# ==================== EXISTING ROUTES ====================

# ==================== HELPER FUNCTIONS ====================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        user_type=user_data.user_type
    )
    await db.users.insert_one(user.dict())
    
    # Create profile based on user type
    if user_data.user_type == "artist" and user_data.profile_data:
        profile = ArtistProfile(
            user_id=user.id,
            stage_name=user_data.profile_data.get("stage_name", ""),
            description=user_data.profile_data.get("description", ""),
            art_type=user_data.profile_data.get("art_type", ""),
            profile_image=user_data.profile_data.get("profile_image")
        )
        await db.artist_profiles.insert_one(profile.dict())
    elif user_data.user_type == "partner" and user_data.profile_data:
        profile = PartnerProfile(
            user_id=user.id,
            brand_name=user_data.profile_data.get("brand_name", ""),
            description=user_data.profile_data.get("description", ""),
            service_type=user_data.profile_data.get("service_type", ""),
            profile_image=user_data.profile_data.get("profile_image")
        )
        await db.partner_profiles.insert_one(profile.dict())
    elif user_data.user_type == "venue":
        profile = VenueProfile(
            user_id=user.id,
            venue_name=user_data.profile_data.get("venue_name", "") if user_data.profile_data else "",
            description=user_data.profile_data.get("description", "") if user_data.profile_data else ""
        )
        await db.venue_profiles.insert_one(profile.dict())
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_type=user.user_type,
        user_id=user.id
    )

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_type=user["user_type"],
        user_id=user["id"]
    )

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    # Get profile based on user type
    profile = None
    if current_user["user_type"] == "artist":
        profile = await db.artist_profiles.find_one({"user_id": current_user["id"]})
    elif current_user["user_type"] == "partner":
        profile = await db.partner_profiles.find_one({"user_id": current_user["id"]})
    elif current_user["user_type"] == "venue":
        profile = await db.venue_profiles.find_one({"user_id": current_user["id"]})
    
    if profile:
        profile.pop("_id", None)
    
    return {
        "user": {
            "id": current_user["id"],
            "email": current_user["email"],
            "user_type": current_user["user_type"]
        },
        "profile": profile
    }

# ==================== PROFILE ROUTES ====================

@api_router.get("/artists")
async def get_artists(
    min_rating: Optional[float] = None,
    max_rating: Optional[float] = None,
    min_experience: Optional[int] = None,
    max_experience: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    location: Optional[str] = None,
    available_only: Optional[bool] = False
):
    query = {"is_paused": {"$ne": True}}  # Exclude paused profiles
    
    # Rating filter
    if min_rating is not None or max_rating is not None:
        query["rating"] = {}
        if min_rating is not None:
            query["rating"]["$gte"] = min_rating
        if max_rating is not None:
            query["rating"]["$lte"] = max_rating
    
    # Experience filter
    if min_experience is not None or max_experience is not None:
        query["experience_gigs"] = {}
        if min_experience is not None:
            query["experience_gigs"]["$gte"] = min_experience
        if max_experience is not None:
            query["experience_gigs"]["$lte"] = max_experience
    
    # Location filter
    if location:
        query["locations"] = location
    
    # Availability filter
    if available_only:
        query["availability"] = {"$exists": True, "$ne": []}
    
    artists = await db.artist_profiles.find(query).to_list(1000)
    
    # Filter out paused profiles
    filtered_artists = []
    for artist in artists:
        user = await db.users.find_one({"id": artist["user_id"]})
        if user and not user.get("is_paused", False):
            filtered_artists.append(artist)
    
    artists = filtered_artists
    
    # Price filter (done after fetch since it's nested)
    if min_price is not None or max_price is not None:
        filtered_artists = []
        for artist in artists:
            if artist.get("pricing"):
                price = artist["pricing"].get("price_per_hour")
                if price is not None:
                    if (min_price is None or price >= min_price) and (max_price is None or price <= max_price):
                        filtered_artists.append(artist)
                elif artist["pricing"].get("is_for_promotion"):
                    # Include artists working for promotion in any price range
                    filtered_artists.append(artist)
        artists = filtered_artists
    
    for artist in artists:
        artist.pop("_id", None)
    return artists

@api_router.get("/artists/{artist_id}")
async def get_artist(artist_id: str):
    artist = await db.artist_profiles.find_one({"id": artist_id})
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    artist.pop("_id", None)
    return artist

@api_router.post("/artists")
async def create_artist(artist_data: dict, current_user: dict = Depends(get_current_user)):
    # Ensure user is an artist
    if current_user["user_type"] != "artist":
        raise HTTPException(status_code=403, detail="Only artists can create artist profiles")
    
    # Check if artist profile already exists
    existing = await db.artist_profiles.find_one({"user_id": current_user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Artist profile already exists")
    
    # Create new artist profile
    new_artist = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "stage_name": artist_data.get("stage_name", "Artist"),
        "art_type": artist_data.get("art_type", "General"),
        "description": artist_data.get("description", ""),
        "experience_gigs": artist_data.get("experience_gigs", 0),
        "availability": artist_data.get("availability", []),
        "locations": artist_data.get("locations", []),
        "media_gallery": artist_data.get("media_gallery", []),
        "rating": 0,
        "review_count": 0,
        "is_featured": False,
        "pricing": artist_data.get("pricing", {"price_per_hour": None, "is_for_promotion": False, "is_negotiable": False}),
        "created_at": datetime.utcnow()
    }
    
    await db.artist_profiles.insert_one(new_artist)
    new_artist.pop("_id", None)
    return new_artist

@api_router.put("/artists/{artist_id}")
async def update_artist(artist_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    artist = await db.artist_profiles.find_one({"id": artist_id})
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    
    if artist["user_id"] != current_user["id"] and current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.artist_profiles.update_one({"id": artist_id}, {"$set": updates})
    updated_artist = await db.artist_profiles.find_one({"id": artist_id})
    updated_artist.pop("_id", None)
    return updated_artist

@api_router.get("/partners")
async def get_partners():
    partners = await db.partner_profiles.find({"is_paused": {"$ne": True}}).to_list(1000)
    for partner in partners:
        partner.pop("_id", None)
    return partners

@api_router.get("/partners/{partner_id}")
async def get_partner(partner_id: str):
    partner = await db.partner_profiles.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    partner.pop("_id", None)
    return partner

@api_router.post("/partners")
async def create_partner(partner_data: dict, current_user: dict = Depends(get_current_user)):
    # Ensure user is a partner
    if current_user["user_type"] != "partner":
        raise HTTPException(status_code=403, detail="Only partners can create partner profiles")
    
    # Check if partner profile already exists
    existing = await db.partner_profiles.find_one({"user_id": current_user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Partner profile already exists")
    
    # Create new partner profile
    new_partner = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "brand_name": partner_data.get("brand_name", "Brand"),
        "service_type": partner_data.get("service_type", "General"),
        "description": partner_data.get("description", ""),
        "locations": partner_data.get("locations", []),
        "media_gallery": partner_data.get("media_gallery", []),
        "rating": 0,
        "review_count": 0,
        "is_featured": False,
        "created_at": datetime.utcnow()
    }
    
    await db.partner_profiles.insert_one(new_partner)
    new_partner.pop("_id", None)
    return new_partner

@api_router.put("/partners/{partner_id}")
async def update_partner(partner_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    partner = await db.partner_profiles.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    if partner["user_id"] != current_user["id"] and current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.partner_profiles.update_one({"id": partner_id}, {"$set": updates})
    updated_partner = await db.partner_profiles.find_one({"id": partner_id})
    updated_partner.pop("_id", None)
    return updated_partner

@api_router.put("/venues/{venue_id}")
async def update_venue(venue_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    venue = await db.venue_profiles.find_one({"id": venue_id})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    if venue["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.venue_profiles.update_one({"id": venue_id}, {"$set": updates})
    updated_venue = await db.venue_profiles.find_one({"id": venue_id})
    updated_venue.pop("_id", None)
    return updated_venue

# ==================== PROFILE MANAGEMENT ====================

@api_router.post("/profile/pause")
async def pause_profile(current_user: dict = Depends(get_current_user)):
    """Pause user's profile"""
    user_type = current_user["user_type"]
    user_id = current_user["id"]
    
    if user_type == "artist":
        collection = db.artist_profiles
    elif user_type == "partner":
        collection = db.partner_profiles
    elif user_type == "venue":
        collection = db.venue_profiles
    else:
        raise HTTPException(status_code=400, detail="Invalid user type")
    
    profile = await collection.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    await collection.update_one({"user_id": user_id}, {"$set": {"is_paused": True}})
    return {"message": "Profile paused successfully"}

@api_router.post("/profile/unpause")
async def unpause_profile(current_user: dict = Depends(get_current_user)):
    """Unpause user's profile"""
    user_type = current_user["user_type"]
    user_id = current_user["id"]
    
    if user_type == "artist":
        collection = db.artist_profiles
    elif user_type == "partner":
        collection = db.partner_profiles
    elif user_type == "venue":
        collection = db.venue_profiles
    else:
        raise HTTPException(status_code=400, detail="Invalid user type")
    
    profile = await collection.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    await collection.update_one({"user_id": user_id}, {"$set": {"is_paused": False}})
    return {"message": "Profile unpaused successfully"}

@api_router.delete("/profile")
async def delete_profile(current_user: dict = Depends(get_current_user)):
    """Delete user's profile and account"""
    user_type = current_user["user_type"]
    user_id = current_user["id"]
    
    # Delete profile
    if user_type == "artist":
        await db.artist_profiles.delete_one({"user_id": user_id})
    elif user_type == "partner":
        await db.partner_profiles.delete_one({"user_id": user_id})
    elif user_type == "venue":
        await db.venue_profiles.delete_one({"user_id": user_id})
    
    # Delete user account
    await db.users.delete_one({"id": user_id})
    
    # Delete related data
    await db.wishlist.delete_many({"venue_user_id": user_id})
    await db.reviews.delete_many({"reviewer_id": user_id})
    
    return {"message": "Profile and account deleted successfully"}

# ==================== REVIEW ROUTES ====================

@api_router.post("/reviews")
async def create_review(review: Review, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "venue":
        raise HTTPException(status_code=403, detail="Only venues can create reviews")
    
    # Check if already reviewed
    existing_review = await db.reviews.find_one({
        "profile_id": review.profile_id,
        "reviewer_id": current_user["id"]
    })
    if existing_review:
        raise HTTPException(status_code=400, detail="Already reviewed")
    
    review.reviewer_id = current_user["id"]
    venue_profile = await db.venue_profiles.find_one({"user_id": current_user["id"]})
    review.reviewer_name = venue_profile.get("venue_name", "Anonymous") if venue_profile else "Anonymous"
    
    await db.reviews.insert_one(review.dict())
    
    # Update profile rating
    collection = db.artist_profiles if review.profile_type == "artist" else db.partner_profiles
    profile = await collection.find_one({"id": review.profile_id})
    
    if profile:
        new_review_count = profile.get("review_count", 0) + 1
        current_rating = profile.get("rating", 0.0)
        new_rating = ((current_rating * profile.get("review_count", 0)) + review.rating) / new_review_count
        
        await collection.update_one(
            {"id": review.profile_id},
            {"$set": {"rating": new_rating, "review_count": new_review_count}}
        )
    
    return {"message": "Review created successfully"}

@api_router.get("/reviews/{profile_id}")
async def get_reviews(profile_id: str):
    reviews = await db.reviews.find({"profile_id": profile_id}).to_list(1000)
    for review in reviews:
        review.pop("_id", None)
    return reviews

# ==================== WISHLIST ROUTES ====================

@api_router.post("/wishlist")
async def add_to_wishlist(wishlist: Wishlist, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "venue":
        raise HTTPException(status_code=403, detail="Only venues can add to wishlist")
    
    # Check if already in wishlist
    existing = await db.wishlists.find_one({
        "venue_user_id": current_user["id"],
        "profile_id": wishlist.profile_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already in wishlist")
    
    wishlist.venue_user_id = current_user["id"]
    await db.wishlists.insert_one(wishlist.dict())
    return {"message": "Added to wishlist"}

@api_router.delete("/wishlist/{profile_id}")
async def remove_from_wishlist(profile_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.wishlists.delete_one({
        "venue_user_id": current_user["id"],
        "profile_id": profile_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found in wishlist")
    return {"message": "Removed from wishlist"}

@api_router.get("/wishlist")
async def get_wishlist(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "venue":
        raise HTTPException(status_code=403, detail="Only venues have wishlist")
    
    wishlists = await db.wishlists.find({"venue_user_id": current_user["id"]}).to_list(1000)
    
    # Get full profiles
    result = []
    for item in wishlists:
        if item["profile_type"] == "artist":
            profile = await db.artist_profiles.find_one({"id": item["profile_id"]})
        else:
            profile = await db.partner_profiles.find_one({"id": item["profile_id"]})
        
        if profile:
            profile.pop("_id", None)
            result.append({
                "wishlist_id": item["id"],
                "profile": profile,
                "profile_type": item["profile_type"]
            })
    
    return result

# ==================== CHAT ROUTES ====================

@api_router.post("/chat/room")
async def create_chat_room(data: dict, current_user: dict = Depends(get_current_user)):
    provider_user_id = data.get("provider_user_id")
    provider_type = data.get("provider_type")
    other_artist_id = data.get("other_artist_id")  # For artist-to-artist chat
    other_partner_id = data.get("other_partner_id")  # For partner-to-partner chat
    
    # Artist-to-artist chat
    if current_user["user_type"] == "artist" and other_artist_id:
        # Check if room already exists (either direction)
        existing_room = await db.chat_rooms.find_one({
            "$or": [
                {"participant1_id": current_user["id"], "participant2_id": other_artist_id},
                {"participant1_id": other_artist_id, "participant2_id": current_user["id"]}
            ],
            "chat_type": "artist_artist"
        })
        
        if existing_room:
            existing_room.pop("_id", None)
            return existing_room
        
        # Create new artist-to-artist room
        room = ChatRoom(
            participant1_id=current_user["id"],
            participant2_id=other_artist_id,
            chat_type="artist_artist"
        )
        await db.chat_rooms.insert_one(room.dict())
        return room.dict()
    
    # Partner-to-partner chat
    if current_user["user_type"] == "partner" and other_partner_id:
        # Check partner's chat settings
        partner_user = await db.users.find_one({"id": other_partner_id})
        if partner_user:
            chat_settings = partner_user.get("partner_chat_settings", "all")
            if chat_settings == "off":
                raise HTTPException(status_code=403, detail="This partner has chat turned off")
            elif chat_settings == "partners_only":
                # Allow only if current user is also a partner (which they are)
                pass
        
        # Check if room already exists (either direction)
        existing_room = await db.chat_rooms.find_one({
            "$or": [
                {"participant1_id": current_user["id"], "participant2_id": other_partner_id},
                {"participant1_id": other_partner_id, "participant2_id": current_user["id"]}
            ],
            "chat_type": "partner_partner"
        })
        
        if existing_room:
            existing_room.pop("_id", None)
            return existing_room
        
        # Create new partner-to-partner room
        room = ChatRoom(
            participant1_id=current_user["id"],
            participant2_id=other_partner_id,
            chat_type="partner_partner"
        )
        await db.chat_rooms.insert_one(room.dict())
        return room.dict()
    
    # Cross-type chats: Artist <-> Partner or Partner <-> Artist
    # When frontend sends provider_user_id and provider_type
    if provider_user_id and provider_type:
        # Determine the other party's user type
        other_user = await db.users.find_one({"id": provider_user_id})
        if not other_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        other_user_type = other_user["user_type"]
        
        # Check if partner has chat settings restrictions
        if other_user_type == "partner":
            chat_settings = other_user.get("partner_chat_settings", "all")
            if chat_settings == "off":
                raise HTTPException(status_code=403, detail="This partner has chat turned off")
            elif chat_settings == "partners_only" and current_user["user_type"] != "partner":
                raise HTTPException(status_code=403, detail="This partner only accepts chats from other partners")
        
        # For cross-type, use venue chat model (provider_user_id/venue_user_id)
        # Check existing room (handle both directions for artist-partner chats)
        existing_room = await db.chat_rooms.find_one({
            "$or": [
                {"venue_user_id": current_user["id"], "provider_user_id": provider_user_id},
                {"venue_user_id": provider_user_id, "provider_user_id": current_user["id"]}
            ]
        })
        
        if existing_room:
            existing_room.pop("_id", None)
            return existing_room
        
        # Create new cross-type room
        chat_type = f"venue_{provider_type}" if current_user["user_type"] == "venue" else "cross_type"
        room = ChatRoom(
            venue_user_id=current_user["id"],
            provider_user_id=provider_user_id,
            provider_type=provider_type,
            chat_type=chat_type
        )
        await db.chat_rooms.insert_one(room.dict())
        return room.dict()
    
    # Venue chat (existing logic for venues only)
    if current_user["user_type"] == "venue":
        raise HTTPException(status_code=400, detail="Missing provider_user_id and provider_type")
    
    raise HTTPException(status_code=403, detail="Invalid chat request")

@api_router.get("/chat/rooms")
async def get_chat_rooms(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] == "venue":
        rooms = await db.chat_rooms.find({"venue_user_id": current_user["id"]}).to_list(1000)
    elif current_user["user_type"] == "artist":
        # Get venue chats, artist-to-artist chats, AND cross-type chats
        rooms = await db.chat_rooms.find({
            "$or": [
                {"provider_user_id": current_user["id"]},  # Venue chats as provider
                {"participant1_id": current_user["id"]},   # Artist-to-artist chats
                {"participant2_id": current_user["id"]},   # Artist-to-artist chats
                {"venue_user_id": current_user["id"]}      # Cross-type chats (artist as initiator)
            ]
        }).to_list(1000)
    elif current_user["user_type"] == "partner":
        # Get venue chats, partner-to-partner chats, AND cross-type chats
        rooms = await db.chat_rooms.find({
            "$or": [
                {"provider_user_id": current_user["id"]},  # Venue/cross-type chats as provider
                {"participant1_id": current_user["id"]},   # Partner-to-partner chats
                {"participant2_id": current_user["id"]},   # Partner-to-partner chats
                {"venue_user_id": current_user["id"]}      # Cross-type chats (partner as initiator)
            ]
        }).to_list(1000)
    else:
        rooms = []
    
    # Enrich with profile data
    for room in rooms:
        room.pop("_id", None)
        
        # Artist-to-artist chat
        if room.get("chat_type") == "artist_artist":
            # Get both artist profiles
            artist1_profile = await db.artist_profiles.find_one({"user_id": room["participant1_id"]})
            artist2_profile = await db.artist_profiles.find_one({"user_id": room["participant2_id"]})
            
            if artist1_profile:
                artist1_profile.pop("_id", None)
                room["artist1_profile"] = artist1_profile
            if artist2_profile:
                artist2_profile.pop("_id", None)
                room["artist2_profile"] = artist2_profile
        # Partner-to-partner chat
        elif room.get("chat_type") == "partner_partner":
            # Get both partner profiles
            partner1_profile = await db.partner_profiles.find_one({"user_id": room["participant1_id"]})
            partner2_profile = await db.partner_profiles.find_one({"user_id": room["participant2_id"]})
            
            if partner1_profile:
                partner1_profile.pop("_id", None)
                room["partner1_profile"] = partner1_profile
            if partner2_profile:
                partner2_profile.pop("_id", None)
                room["partner2_profile"] = partner2_profile
        else:
            # Venue chat or cross-type chat (existing logic)
            # Get venue/initiator user
            venue_user_id = room.get("venue_user_id")
            if venue_user_id:
                venue_user = await db.users.find_one({"id": venue_user_id})
                if venue_user and venue_user["user_type"] == "venue":
                    venue_profile = await db.venue_profiles.find_one({"user_id": venue_user_id})
                    if venue_profile:
                        venue_profile.pop("_id", None)
                        room["venue_profile"] = venue_profile
                else:
                    # Initiator is artist or partner (cross-type chat)
                    if venue_user["user_type"] == "artist":
                        initiator_profile = await db.artist_profiles.find_one({"user_id": venue_user_id})
                    else:
                        initiator_profile = await db.partner_profiles.find_one({"user_id": venue_user_id})
                    if initiator_profile:
                        initiator_profile.pop("_id", None)
                        room["initiator_profile"] = initiator_profile
            
            # Get provider profile
            if room.get("provider_type") == "artist":
                provider_profile = await db.artist_profiles.find_one({"user_id": room.get("provider_user_id")})
            else:
                provider_profile = await db.partner_profiles.find_one({"user_id": room.get("provider_user_id")})
            
            if provider_profile:
                provider_profile.pop("_id", None)
                room["provider_profile"] = provider_profile
        
        # Get last message
        last_message = await db.messages.find_one(
            {"chat_room_id": room["id"]},
            sort=[("created_at", -1)]
        )
        if last_message:
            last_message.pop("_id", None)
            room["last_message"] = last_message
    
    return rooms

@api_router.get("/chat/messages/{room_id}")
async def get_messages(room_id: str, current_user: dict = Depends(get_current_user)):
    # Verify user is part of this room
    room = await db.chat_rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Chat room not found")
    
    # Check if user is authorized for this chat
    is_authorized = False
    
    # Artist-to-artist or partner-to-partner chat
    if room.get("chat_type") in ["artist_artist", "partner_partner"]:
        if current_user["id"] in [room.get("participant1_id"), room.get("participant2_id")]:
            is_authorized = True
    # Venue chat
    elif room.get("venue_user_id") == current_user["id"] or room.get("provider_user_id") == current_user["id"]:
        is_authorized = True
    
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    messages = await db.messages.find({"chat_room_id": room_id}).sort("created_at", 1).to_list(1000)
    for msg in messages:
        msg.pop("_id", None)
    
    # Mark messages as read
    await db.messages.update_many(
        {"chat_room_id": room_id, "sender_id": {"$ne": current_user["id"]}},
        {"$set": {"is_read": True}}
    )
    
    return messages

@api_router.post("/chat/messages")
async def send_message(message_data: dict, current_user: dict = Depends(get_current_user)):
    room_id = message_data.get("room_id")
    message_text = message_data.get("message")
    
    if not room_id or not message_text:
        raise HTTPException(status_code=400, detail="room_id and message are required")
    
    # Verify user is part of this room
    room = await db.chat_rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Chat room not found")
    
    # Check if user is authorized for this chat
    is_authorized = False
    
    # Artist-to-artist or partner-to-partner chat
    if room.get("chat_type") in ["artist_artist", "partner_partner"]:
        if current_user["id"] in [room.get("participant1_id"), room.get("participant2_id")]:
            is_authorized = True
    # Venue chat
    elif room.get("venue_user_id") == current_user["id"] or room.get("provider_user_id") == current_user["id"]:
        is_authorized = True
    
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Create new message
    new_message = {
        "id": str(uuid.uuid4()),
        "chat_room_id": room_id,
        "sender_id": current_user["id"],
        "message": message_text,
        "is_read": False,
        "created_at": datetime.utcnow()
    }
    
    await db.messages.insert_one(new_message)
    
    # Update room's last_message_at
    await db.chat_rooms.update_one(
        {"id": room_id},
        {"$set": {"last_message_at": datetime.utcnow()}}
    )
    
    new_message.pop("_id", None)
    return new_message

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/chats")
async def get_all_chats(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    rooms = await db.chat_rooms.find().to_list(1000)
    result = []
    
    for room in rooms:
        room.pop("_id", None)
        messages = await db.messages.find({"chat_room_id": room["id"]}).sort("created_at", 1).to_list(1000)
        for msg in messages:
            msg.pop("_id", None)
        
        # Handle different chat types
        user1_profile = None
        user2_profile = None
        
        # Get user1 profile (could be artist, partner, or venue)
        user1_id = room.get("user1_id")
        if user1_id:
            user1_artist = await db.artist_profiles.find_one({"user_id": user1_id})
            user1_partner = await db.partner_profiles.find_one({"user_id": user1_id})
            user1_venue = await db.venue_profiles.find_one({"user_id": user1_id})
            
            if user1_artist:
                user1_artist.pop("_id", None)
                user1_profile = {"type": "artist", "profile": user1_artist}
            elif user1_partner:
                user1_partner.pop("_id", None)
                user1_profile = {"type": "partner", "profile": user1_partner}
            elif user1_venue:
                user1_venue.pop("_id", None)
                user1_profile = {"type": "venue", "profile": user1_venue}
        
        # Get user2 profile
        user2_id = room.get("user2_id")
        if user2_id:
            user2_artist = await db.artist_profiles.find_one({"user_id": user2_id})
            user2_partner = await db.partner_profiles.find_one({"user_id": user2_id})
            user2_venue = await db.venue_profiles.find_one({"user_id": user2_id})
            
            if user2_artist:
                user2_artist.pop("_id", None)
                user2_profile = {"type": "artist", "profile": user2_artist}
            elif user2_partner:
                user2_partner.pop("_id", None)
                user2_profile = {"type": "partner", "profile": user2_partner}
            elif user2_venue:
                user2_venue.pop("_id", None)
                user2_profile = {"type": "venue", "profile": user2_venue}
        
        result.append({
            "room": room,
            "messages": messages,
            "user1_profile": user1_profile,
            "user2_profile": user2_profile
        })
    
    return result

@api_router.get("/admin/reports")
async def get_all_reports(current_user: dict = Depends(get_current_user)):
    """Get all user reports for admin dashboard"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    reports = await db.user_reports.find().sort("created_at", -1).to_list(1000)
    
    # Enrich reports with user information
    enriched_reports = []
    for report in reports:
        report.pop("_id", None)
        
        # Get reporter user info
        reporter_user = await db.users.find_one({"id": report["reporter_user_id"]})
        reporter_info = None
        if reporter_user:
            reporter_info = {
                "id": reporter_user["id"],
                "email": reporter_user["email"],
                "user_type": reporter_user["user_type"]
            }
        
        # Get reported user info
        reported_user = await db.users.find_one({"id": report["reported_user_id"]})
        reported_info = None
        if reported_user:
            reported_info = {
                "id": reported_user["id"],
                "email": reported_user["email"],
                "user_type": reported_user["user_type"]
            }
        
        enriched_reports.append({
            "report": report,
            "reporter": reporter_info,
            "reported_user": reported_info
        })
    
    return enriched_reports

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete user and associated profiles
    await db.users.delete_one({"id": user_id})
    await db.artist_profiles.delete_many({"user_id": user_id})
    await db.partner_profiles.delete_many({"user_id": user_id})
    await db.venue_profiles.delete_many({"user_id": user_id})
    
    return {"message": "User deleted successfully"}

# ==================== MINI-BATCH 1: OTP + SUBSCRIPTION + ADMIN ====================

# OTP ENDPOINTS
def generate_otp():
    return str(random.randint(100000, 999999))

@api_router.post("/auth/send-otp")
async def send_otp(data: dict):
    email = data.get("email")
    purpose = data.get("purpose", "signup")  # signup or forgot_password
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Generate OTP
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Store OTP (in production, use Redis)
    otp_storage[email] = {
        "otp": otp_code,
        "purpose": purpose,
        "expires_at": expires_at,
        "is_verified": False
    }
    
    # In production, send email via SMTP/SendGrid
    # For now, return OTP in response (REMOVE IN PRODUCTION!)
    logging.info(f"OTP for {email}: {otp_code}")
    
    return {
        "message": "OTP sent successfully",
        "otp": otp_code,  # REMOVE IN PRODUCTION!
        "expires_in_minutes": 10
    }

@api_router.post("/auth/verify-otp")
async def verify_otp(data: dict):
    email = data.get("email")
    otp_code = data.get("otp")
    
    if not email or not otp_code:
        raise HTTPException(status_code=400, detail="Email and OTP are required")
    
    stored_otp = otp_storage.get(email)
    if not stored_otp:
        raise HTTPException(status_code=404, detail="OTP not found or expired")
    
    if datetime.utcnow() > stored_otp["expires_at"]:
        del otp_storage[email]
        raise HTTPException(status_code=400, detail="OTP expired")
    
    if stored_otp["otp"] != otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Mark as verified
    stored_otp["is_verified"] = True
    
    return {"message": "OTP verified successfully"}

@api_router.post("/auth/forgot-password")
async def forgot_password(data: dict):
    email = data.get("email")
    new_password = data.get("new_password")
    otp_code = data.get("otp")
    
    if not all([email, new_password, otp_code]):
        raise HTTPException(status_code=400, detail="Email, OTP, and new password are required")
    
    # Verify OTP again for security
    stored_otp = otp_storage.get(email)
    if not stored_otp:
        raise HTTPException(status_code=400, detail="OTP session expired. Please request a new OTP.")
    
    # Check if OTP is correct (re-verify)
    if stored_otp["otp"] != otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Check if OTP purpose is correct
    if stored_otp.get("purpose") != "forgot_password":
        raise HTTPException(status_code=400, detail="Invalid OTP purpose")
    
    # Check if OTP has expired
    if datetime.utcnow() > stored_otp.get("expires_at"):
        del otp_storage[email]
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    # Find user
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found with this email")
    
    # Hash new password
    hashed_password = pwd_context.hash(new_password)
    
    # Update password in database
    result = await db.users.update_one(
        {"email": email}, 
        {"$set": {"password": hashed_password}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to update password")
    
    # Clear OTP from storage
    del otp_storage[email]
    
    logging.info(f"Password reset successful for user: {email}")
    
    return {
        "message": "Password reset successfully. You can now login with your new password.",
        "success": True
    }

# SUBSCRIPTION ENDPOINTS
@api_router.post("/subscription/initialize")
async def initialize_subscription(current_user: dict = Depends(get_current_user)):
    """Initialize free trial for new venue users"""
    if current_user["user_type"] != "venue":
        raise HTTPException(status_code=403, detail="Only venues can have subscriptions")
    
    # Check if subscription already exists
    existing = await db.venue_subscriptions.find_one({"venue_user_id": current_user["id"]})
    if existing:
        existing.pop("_id", None)
        return existing
    
    # Create trial subscription
    subscription = {
        "id": str(uuid.uuid4()),
        "venue_user_id": current_user["id"],
        "subscription_type": "trial",
        "profile_views_remaining": 10,
        "subscription_status": "active",
        "created_at": datetime.utcnow()
    }
    
    await db.venue_subscriptions.insert_one(subscription)
    subscription.pop("_id", None)
    return subscription

# Removed duplicate venue-only subscription status endpoint - using universal one below

@api_router.post("/subscription/track-view")
async def track_profile_view(data: dict, current_user: dict = Depends(get_current_user)):
    """Track when venue views an artist/partner profile"""
    if current_user["user_type"] != "venue":
        raise HTTPException(status_code=403, detail="Only venues can track views")
    
    profile_id = data.get("profile_id")
    if not profile_id:
        raise HTTPException(status_code=400, detail="profile_id is required")
    
    subscription = await db.venue_subscriptions.find_one({"venue_user_id": current_user["id"]})
    if not subscription:
        subscription = await initialize_subscription(current_user)
        subscription = await db.venue_subscriptions.find_one({"venue_user_id": current_user["id"]})
    
    # Check if unlimited (monthly subscription)
    if subscription["profile_views_remaining"] == -1:
        return {"allowed": True, "views_remaining": -1, "subscription_type": subscription["subscription_type"]}
    
    # Check if trial views exhausted
    if subscription["profile_views_remaining"] <= 0:
        return {
            "allowed": False,
            "views_remaining": 0,
            "subscription_type": subscription["subscription_type"],
            "message": "Trial views exhausted. Please subscribe."
        }
    
    # Deduct one view
    await db.venue_subscriptions.update_one(
        {"venue_user_id": current_user["id"]},
        {"$inc": {"profile_views_remaining": -1}}
    )
    
    return {
        "allowed": True,
        "views_remaining": subscription["profile_views_remaining"] - 1,
        "subscription_type": subscription["subscription_type"]
    }

@api_router.post("/subscription/create-razorpay-order")
async def create_razorpay_order(data: dict, current_user: dict = Depends(get_current_user)):
    """Create Razorpay order for subscription or pay-per-view"""
    if current_user["user_type"] != "venue":
        raise HTTPException(status_code=403, detail="Only venues can subscribe")
    
    payment_type = data.get("payment_type")  # "monthly" or "pay_per_view"
    
    if payment_type == "monthly":
        amount = 49900  # ₹499 in paise
        description = "Monthly Subscription - Unlimited Access"
    elif payment_type == "pay_per_view":
        amount = 9900  # ₹99 in paise
        description = "10 Profile Views"
    else:
        raise HTTPException(status_code=400, detail="Invalid payment type")
    
    if not razorpay_client:
        # For testing without Razorpay keys
        return {
            "order_id": f"test_order_{uuid.uuid4()}",
            "amount": amount,
            "currency": "INR",
            "test_mode": True
        }
    
    # Create Razorpay order
    order_data = {
        "amount": amount,
        "currency": "INR",
        "receipt": f"receipt_{current_user['id']}_{datetime.utcnow().timestamp()}",
        "notes": {
            "venue_user_id": current_user["id"],
            "payment_type": payment_type
        }
    }
    
    order = razorpay_client.order.create(data=order_data)
    return order

@api_router.post("/subscription/verify-payment")
async def verify_razorpay_payment(data: dict, current_user: dict = Depends(get_current_user)):
    """Verify Razorpay payment and activate subscription"""
    if current_user["user_type"] != "venue":
        raise HTTPException(status_code=403, detail="Only venues can subscribe")
    
    razorpay_order_id = data.get("razorpay_order_id")
    razorpay_payment_id = data.get("razorpay_payment_id")
    razorpay_signature = data.get("razorpay_signature")
    payment_type = data.get("payment_type")
    
    # In test mode (no Razorpay keys), accept any payment
    if not razorpay_client:
        # Update subscription directly
        if payment_type == "monthly":
            await db.venue_subscriptions.update_one(
                {"venue_user_id": current_user["id"]},
                {
                    "$set": {
                        "subscription_type": "monthly",
                        "profile_views_remaining": -1,  # Unlimited
                        "subscription_status": "active",
                        "subscription_start": datetime.utcnow(),
                        "subscription_end": datetime.utcnow() + timedelta(days=30),
                        "amount_paid": 499.0
                    }
                }
            )
        elif payment_type == "pay_per_view":
            await db.venue_subscriptions.update_one(
                {"venue_user_id": current_user["id"]},
                {
                    "$set": {"subscription_type": "pay_per_view"},
                    "$inc": {"profile_views_remaining": 10},
                    "$set": {"subscription_status": "active"}
                }
            )
        
        return {"message": "Payment verified successfully (test mode)", "status": "active"}
    
    # Verify signature (production)
    try:
        params_dict = {
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature
        }
        razorpay_client.utility.verify_payment_signature(params_dict)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Payment verification failed")
    
    # Update subscription
    if payment_type == "monthly":
        await db.venue_subscriptions.update_one(
            {"venue_user_id": current_user["id"]},
            {
                "$set": {
                    "subscription_type": "monthly",
                    "profile_views_remaining": -1,  # Unlimited
                    "subscription_status": "active",
                    "razorpay_payment_id": razorpay_payment_id,
                    "subscription_start": datetime.utcnow(),
                    "subscription_end": datetime.utcnow() + timedelta(days=30),
                    "amount_paid": 499.0
                }
            }
        )
    elif payment_type == "pay_per_view":
        await db.venue_subscriptions.update_one(
            {"venue_user_id": current_user["id"]},
            {
                "$set": {
                    "subscription_type": "pay_per_view",
                    "subscription_status": "active",
                    "razorpay_payment_id": razorpay_payment_id,
                    "amount_paid": 99.0
                },
                "$inc": {"profile_views_remaining": 10}
            }
        )
    
    return {"message": "Payment verified and subscription activated", "status": "active"}

# ==================== ARTIST SUBSCRIPTION ENDPOINTS ====================

@api_router.post("/artist/subscription/initialize")
async def initialize_artist_subscription(current_user: dict = Depends(get_current_user)):
    """Initialize free tier for new artist users"""
    if current_user["user_type"] != "artist":
        raise HTTPException(status_code=403, detail="Only artists can have artist subscriptions")
    
    # Check if subscription already exists
    existing = await db.artist_subscriptions.find_one({"artist_user_id": current_user["id"]})
    if existing:
        existing.pop("_id", None)
        return existing
    
    # Create free tier subscription
    subscription = {
        "id": str(uuid.uuid4()),
        "artist_user_id": current_user["id"],
        "subscription_type": "free",
        "profile_views_remaining": 10,
        "subscription_status": "active",
        "created_at": datetime.utcnow()
    }
    
    await db.artist_subscriptions.insert_one(subscription)
    subscription.pop("_id", None)
    return subscription

@api_router.get("/artist/subscription/status")
async def get_artist_subscription_status(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "artist":
        raise HTTPException(status_code=403, detail="Only artists can check subscription")
    
    subscription = await db.artist_subscriptions.find_one({"artist_user_id": current_user["id"]})
    if not subscription:
        # Auto-initialize
        return await initialize_artist_subscription(current_user)
    
    subscription.pop("_id", None)
    return subscription

@api_router.post("/artist/subscription/track-view")
async def track_artist_profile_view(data: dict, current_user: dict = Depends(get_current_user)):
    """Track when artist views another artist's profile"""
    if current_user["user_type"] != "artist":
        raise HTTPException(status_code=403, detail="Only artists can track views")
    
    profile_id = data.get("profile_id")
    if not profile_id:
        raise HTTPException(status_code=400, detail="profile_id is required")
    
    subscription = await db.artist_subscriptions.find_one({"artist_user_id": current_user["id"]})
    if not subscription:
        subscription_obj = await initialize_artist_subscription(current_user)
        subscription = await db.artist_subscriptions.find_one({"artist_user_id": current_user["id"]})
    
    # Check if Pro (unlimited views)
    if subscription["profile_views_remaining"] == -1:
        return {"allowed": True, "views_remaining": -1, "subscription_type": subscription["subscription_type"]}
    
    # Check if free views exhausted
    if subscription["profile_views_remaining"] <= 0:
        return {
            "allowed": False,
            "views_remaining": 0,
            "subscription_type": subscription["subscription_type"],
            "message": "Free views exhausted. Upgrade to Pro for unlimited access."
        }
    
    # Deduct one view
    await db.artist_subscriptions.update_one(
        {"artist_user_id": current_user["id"]},
        {"$inc": {"profile_views_remaining": -1}}
    )
    
    return {
        "allowed": True,
        "views_remaining": subscription["profile_views_remaining"] - 1,
        "subscription_type": subscription["subscription_type"]
    }

@api_router.post("/artist/subscription/create-razorpay-order")
async def create_artist_pro_order(current_user: dict = Depends(get_current_user)):
    """Create Razorpay order for Artist Pro subscription (₹499/month)"""
    if current_user["user_type"] != "artist":
        raise HTTPException(status_code=403, detail="Only artists can subscribe to Pro")
    
    amount = 49900  # ₹499 in paise
    description = "Artist Pro - Monthly Subscription"
    
    if not razorpay_client:
        # For testing without Razorpay keys
        return {
            "order_id": f"test_artist_pro_{uuid.uuid4()}",
            "amount": amount,
            "currency": "INR",
            "test_mode": True
        }
    
    # Create Razorpay order
    order_data = {
        "amount": amount,
        "currency": "INR",
        "receipt": f"artist_pro_{current_user['id']}_{datetime.utcnow().timestamp()}",
        "notes": {
            "artist_user_id": current_user["id"],
            "subscription_type": "pro"
        }
    }
    
    order = razorpay_client.order.create(data=order_data)
    return order

@api_router.post("/artist/subscription/verify-payment")
async def verify_artist_pro_payment(data: dict, current_user: dict = Depends(get_current_user)):
    """Verify Razorpay payment and activate Artist Pro subscription"""
    if current_user["user_type"] != "artist":
        raise HTTPException(status_code=403, detail="Only artists can subscribe to Pro")
    
    razorpay_order_id = data.get("razorpay_order_id")
    razorpay_payment_id = data.get("razorpay_payment_id")
    razorpay_signature = data.get("razorpay_signature")
    
    # In test mode (no Razorpay keys), accept any payment
    if not razorpay_client:
        # Update subscription to Pro
        await db.artist_subscriptions.update_one(
            {"artist_user_id": current_user["id"]},
            {
                "$set": {
                    "subscription_type": "pro",
                    "profile_views_remaining": -1,  # Unlimited
                    "subscription_status": "active",
                    "subscription_start": datetime.utcnow(),
                    "subscription_end": datetime.utcnow() + timedelta(days=30),
                    "amount_paid": 499.0
                }
            }
        )
        
        # Update user's is_artist_pro flag
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"is_artist_pro": True}}
        )
        
        return {"message": "Payment verified successfully (test mode)", "status": "active"}
    
    # Verify signature (production)
    try:
        params_dict = {
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature
        }
        razorpay_client.utility.verify_payment_signature(params_dict)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Payment verification failed")
    
    # Update subscription to Pro
    await db.artist_subscriptions.update_one(
        {"artist_user_id": current_user["id"]},
        {
            "$set": {
                "subscription_type": "pro",
                "profile_views_remaining": -1,  # Unlimited
                "subscription_status": "active",
                "razorpay_payment_id": razorpay_payment_id,
                "subscription_start": datetime.utcnow(),
                "subscription_end": datetime.utcnow() + timedelta(days=30),
                "amount_paid": 499.0
            }
        }
    )
    
    # Update user's is_artist_pro flag
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"is_artist_pro": True}}
    )
    
    return {"message": "Payment verified and Artist Pro subscription activated", "status": "active"}

# ==================== PARTNER SUBSCRIPTION ENDPOINTS ====================

@api_router.post("/partner/subscription/create-razorpay-order")
async def create_partner_pro_order(current_user: dict = Depends(get_current_user)):
    """Create Razorpay order for Partner Pro subscription (₹499/month)"""
    if current_user["user_type"] != "partner":
        raise HTTPException(status_code=403, detail="Only partners can subscribe to Pro")
    
    amount = 49900  # ₹499 in paise
    description = "Partner Pro - Monthly Subscription"
    
    if not razorpay_client:
        # For testing without Razorpay keys
        return {
            "order_id": f"test_partner_pro_{uuid.uuid4()}",
            "amount": amount,
            "currency": "INR",
            "test_mode": True
        }
    
    # Create Razorpay order
    order_data = {
        "amount": amount,
        "currency": "INR",
        "receipt": f"partner_pro_{current_user['id']}_{datetime.utcnow().timestamp()}",
        "notes": {
            "partner_user_id": current_user["id"],
            "subscription_type": "pro"
        }
    }
    
    order = razorpay_client.order.create(data=order_data)
    return order

@api_router.post("/partner/subscription/verify-payment")
async def verify_partner_pro_payment(data: dict, current_user: dict = Depends(get_current_user)):
    """Verify Razorpay payment and activate Partner Pro subscription"""
    if current_user["user_type"] != "partner":
        raise HTTPException(status_code=403, detail="Only partners can subscribe to Pro")
    
    razorpay_order_id = data.get("razorpay_order_id")
    razorpay_payment_id = data.get("razorpay_payment_id")
    razorpay_signature = data.get("razorpay_signature")
    
    # In test mode (no Razorpay keys), accept any payment
    if not razorpay_client:
        # Check if subscription exists
        existing_sub = await db.partner_subscriptions.find_one({"partner_user_id": current_user["id"]})
        
        if existing_sub:
            # Update existing subscription
            await db.partner_subscriptions.update_one(
                {"partner_user_id": current_user["id"]},
                {
                    "$set": {
                        "subscription_type": "pro",
                        "profile_views_remaining": -1,  # Unlimited
                        "subscription_status": "active",
                        "subscription_start": datetime.utcnow(),
                        "subscription_end": datetime.utcnow() + timedelta(days=30),
                        "amount_paid": 499.0
                    }
                }
            )
        else:
            # Create new subscription
            new_sub = {
                "id": str(uuid.uuid4()),
                "partner_user_id": current_user["id"],
                "subscription_type": "pro",
                "profile_views_remaining": -1,
                "subscription_status": "active",
                "subscription_start": datetime.utcnow(),
                "subscription_end": datetime.utcnow() + timedelta(days=30),
                "amount_paid": 499.0,
                "created_at": datetime.utcnow()
            }
            await db.partner_subscriptions.insert_one(new_sub)
        
        # Update user's is_partner_pro flag
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"is_partner_pro": True}}
        )
        
        return {"message": "Payment verified successfully (test mode)", "status": "active"}
    
    # Verify signature (production)
    try:
        params_dict = {
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature
        }
        razorpay_client.utility.verify_payment_signature(params_dict)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Payment verification failed")
    
    # Check if subscription exists
    existing_sub = await db.partner_subscriptions.find_one({"partner_user_id": current_user["id"]})
    
    if existing_sub:
        # Update existing subscription
        await db.partner_subscriptions.update_one(
            {"partner_user_id": current_user["id"]},
            {
                "$set": {
                    "subscription_type": "pro",
                    "profile_views_remaining": -1,  # Unlimited
                    "subscription_status": "active",
                    "razorpay_payment_id": razorpay_payment_id,
                    "subscription_start": datetime.utcnow(),
                    "subscription_end": datetime.utcnow() + timedelta(days=30),
                    "amount_paid": 499.0
                }
            }
        )
    else:
        # Create new subscription
        new_sub = {
            "id": str(uuid.uuid4()),
            "partner_user_id": current_user["id"],
            "subscription_type": "pro",
            "profile_views_remaining": -1,
            "subscription_status": "active",
            "razorpay_payment_id": razorpay_payment_id,
            "subscription_start": datetime.utcnow(),
            "subscription_end": datetime.utcnow() + timedelta(days=30),
            "amount_paid": 499.0,
            "created_at": datetime.utcnow()
        }
        await db.partner_subscriptions.insert_one(new_sub)
    
    # Update user's is_partner_pro flag
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"is_partner_pro": True}}
    )
    
    return {"message": "Payment verified and Partner Pro subscription activated", "status": "active"}

@api_router.post("/partner/subscription/initialize")
async def initialize_partner_subscription(current_user: dict = Depends(get_current_user)):
    """Initialize free tier for new partner users"""
    if current_user["user_type"] != "partner":
        raise HTTPException(status_code=403, detail="Only partners can have partner subscriptions")
    
    # Check if subscription already exists
    existing = await db.partner_subscriptions.find_one({"partner_user_id": current_user["id"]})
    if existing:
        existing.pop("_id", None)
        return existing
    
    # Create free tier subscription
    subscription = {
        "id": str(uuid.uuid4()),
        "partner_user_id": current_user["id"],
        "subscription_type": "free",
        "profile_views_remaining": 10,
        "subscription_status": "active",
        "created_at": datetime.utcnow()
    }
    
    await db.partner_subscriptions.insert_one(subscription)
    subscription.pop("_id", None)
    return subscription

@api_router.get("/partner/subscription/status")
async def get_partner_subscription_status(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "partner":
        raise HTTPException(status_code=403, detail="Only partners can check subscription")
    
    subscription = await db.partner_subscriptions.find_one({"partner_user_id": current_user["id"]})
    if not subscription:
        # Auto-initialize
        return await initialize_partner_subscription(current_user)
    
    subscription.pop("_id", None)
    return subscription

@api_router.post("/partner/subscription/track-view")
async def track_partner_profile_view(data: dict, current_user: dict = Depends(get_current_user)):
    """Track when partner views another profile"""
    if current_user["user_type"] != "partner":
        raise HTTPException(status_code=403, detail="Only partners can track views")
    
    profile_id = data.get("profile_id")
    if not profile_id:
        raise HTTPException(status_code=400, detail="profile_id is required")
    
    subscription = await db.partner_subscriptions.find_one({"partner_user_id": current_user["id"]})
    if not subscription:
        subscription_obj = await initialize_partner_subscription(current_user)
        subscription = await db.partner_subscriptions.find_one({"partner_user_id": current_user["id"]})
    
    # Check if Pro (unlimited views)
    if subscription["profile_views_remaining"] == -1:
        return {"allowed": True, "views_remaining": -1, "subscription_type": subscription["subscription_type"]}
    
    # Check if free views exhausted
    if subscription["profile_views_remaining"] <= 0:
        return {
            "allowed": False,
            "views_remaining": 0,
            "subscription_type": subscription["subscription_type"],
            "message": "Free views exhausted. Upgrade to Pro for unlimited access."
        }
    
    # Decrement view count
    await db.partner_subscriptions.update_one(
        {"partner_user_id": current_user["id"]},
        {"$inc": {"profile_views_remaining": -1}}
    )
    
    new_count = subscription["profile_views_remaining"] - 1
    return {
        "allowed": True,
        "views_remaining": new_count,
        "subscription_type": subscription["subscription_type"]
    }

# ==================== HOST/VENUE SUBSCRIPTION ENDPOINTS ====================

@api_router.post("/venue/subscription/create-razorpay-order")
async def create_venue_pro_order(current_user: dict = Depends(get_current_user)):
    """Create Razorpay order for Host Pro subscription (₹499/month)"""
    if current_user["user_type"] != "venue":
        raise HTTPException(status_code=403, detail="Only hosts can subscribe to Pro")
    
    amount = 49900  # ₹499 in paise
    description = "Host Pro - Monthly Subscription"
    
    if not razorpay_client:
        # For testing without Razorpay keys
        return {
            "order_id": f"test_venue_pro_{uuid.uuid4()}",
            "amount": amount,
            "currency": "INR",
            "test_mode": True
        }
    
    # Create Razorpay order
    order_data = {
        "amount": amount,
        "currency": "INR",
        "receipt": f"venue_pro_{current_user['id']}_{datetime.utcnow().timestamp()}",
        "notes": {
            "venue_user_id": current_user["id"],
            "subscription_type": "pro"
        }
    }
    
    order = razorpay_client.order.create(data=order_data)
    return order

@api_router.post("/venue/subscription/verify-payment")
async def verify_venue_pro_payment(data: dict, current_user: dict = Depends(get_current_user)):
    """Verify Razorpay payment and activate Host Pro subscription"""
    if current_user["user_type"] != "venue":
        raise HTTPException(status_code=403, detail="Only hosts can subscribe to Pro")
    
    razorpay_order_id = data.get("razorpay_order_id")
    razorpay_payment_id = data.get("razorpay_payment_id")
    razorpay_signature = data.get("razorpay_signature")
    
    # In test mode (no Razorpay keys), accept any payment
    if not razorpay_client:
        # Update existing venue subscription
        await db.venue_subscriptions.update_one(
            {"venue_user_id": current_user["id"]},
            {
                "$set": {
                    "subscription_type": "pro",
                    "profile_views_remaining": -1,  # Unlimited
                    "subscription_status": "active",
                    "subscription_start": datetime.utcnow(),
                    "subscription_end": datetime.utcnow() + timedelta(days=30),
                    "amount_paid": 499.0
                }
            }
        )
        
        # Update user's is_venue_pro flag
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"is_venue_pro": True}}
        )
        
        return {"message": "Payment verified successfully (test mode)", "status": "active"}
    
    # Verify signature (production)
    try:
        params_dict = {
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature
        }
        razorpay_client.utility.verify_payment_signature(params_dict)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Payment verification failed")
    
    # Update existing venue subscription
    await db.venue_subscriptions.update_one(
        {"venue_user_id": current_user["id"]},
        {
            "$set": {
                "subscription_type": "pro",
                "profile_views_remaining": -1,  # Unlimited
                "subscription_status": "active",
                "razorpay_payment_id": razorpay_payment_id,
                "subscription_start": datetime.utcnow(),
                "subscription_end": datetime.utcnow() + timedelta(days=30),
                "amount_paid": 499.0
            }
        }
    )
    
    # Update user's is_venue_pro flag
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"is_venue_pro": True}}
    )
    
    return {"message": "Payment verified and Host Pro subscription activated", "status": "active"}

# ==================== GET SUBSCRIPTION STATUS ENDPOINT ====================

@api_router.get("/subscription/status")
async def get_subscription_status(current_user: dict = Depends(get_current_user)):
    """Get subscription status for current user (works for all user types)"""
    user_type = current_user["user_type"]
    
    if user_type == "artist":
        subscription = await db.artist_subscriptions.find_one({"artist_user_id": current_user["id"]})
        
        # Auto-initialize if doesn't exist
        if not subscription:
            subscription = {
                "id": str(uuid.uuid4()),
                "artist_user_id": current_user["id"],
                "subscription_type": "free",
                "profile_views_remaining": 10,
                "subscription_status": "active",
                "created_at": datetime.utcnow()
            }
            await db.artist_subscriptions.insert_one(subscription)
            subscription.pop("_id", None)
        else:
            subscription.pop("_id", None)
            
        return {
            "user_type": "artist",
            "is_pro": current_user.get("is_artist_pro", False),
            "subscription": subscription
        }
    elif user_type == "partner":
        subscription = await db.partner_subscriptions.find_one({"partner_user_id": current_user["id"]})
        
        # Auto-initialize if doesn't exist
        if not subscription:
            subscription = {
                "id": str(uuid.uuid4()),
                "partner_user_id": current_user["id"],
                "subscription_type": "free",
                "profile_views_remaining": 10,
                "subscription_status": "active",
                "created_at": datetime.utcnow()
            }
            await db.partner_subscriptions.insert_one(subscription)
            subscription.pop("_id", None)
        else:
            subscription.pop("_id", None)
            
        return {
            "user_type": "partner",
            "is_pro": current_user.get("is_partner_pro", False),
            "subscription": subscription
        }
    elif user_type == "venue":
        subscription = await db.venue_subscriptions.find_one({"venue_user_id": current_user["id"]})
        
        # Auto-initialize if doesn't exist
        if not subscription:
            subscription = {
                "id": str(uuid.uuid4()),
                "venue_user_id": current_user["id"],
                "subscription_type": "free",
                "profile_views_remaining": 10,
                "subscription_status": "active",
                "created_at": datetime.utcnow()
            }
            await db.venue_subscriptions.insert_one(subscription)
            subscription.pop("_id", None)
        else:
            subscription.pop("_id", None)
            
        return {
            "user_type": "venue",
            "is_pro": current_user.get("is_venue_pro", False),
            "subscription": subscription
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid user type")

# ==================== BLOCK & REPORT ENDPOINTS ====================

@api_router.post("/users/block/{user_id}")
async def block_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Block a user"""
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    
    # Add to blocked users list
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$addToSet": {"blocked_users": user_id}}
    )
    
    return {"message": "User blocked successfully"}

@api_router.delete("/users/unblock/{user_id}")
async def unblock_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Unblock a user"""
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$pull": {"blocked_users": user_id}}
    )
    
    return {"message": "User unblocked successfully"}

@api_router.get("/users/blocked-list")
async def get_blocked_users(current_user: dict = Depends(get_current_user)):
    """Get list of blocked users"""
    user = await db.users.find_one({"id": current_user["id"]})
    blocked_users = user.get("blocked_users", []) if user else []
    
    return {"blocked_users": blocked_users}

@api_router.post("/users/report")
async def report_user(data: dict, current_user: dict = Depends(get_current_user)):
    """Report a user with description"""
    reported_user_id = data.get("reported_user_id")
    reason = data.get("reason", "")
    
    if not reported_user_id:
        raise HTTPException(status_code=400, detail="reported_user_id is required")
    
    if reported_user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot report yourself")
    
    report = UserReport(
        reporter_user_id=current_user["id"],
        reported_user_id=reported_user_id,
        reason=reason
    )
    
    await db.user_reports.insert_one(report.dict())
    
    return {"message": "User reported successfully", "report_id": report.id}

# ==================== PARTNER CHAT SETTINGS ====================

@api_router.patch("/users/chat-settings")
async def update_chat_settings(data: dict, current_user: dict = Depends(get_current_user)):
    """Update partner chat settings"""
    if current_user["user_type"] != "partner":
        raise HTTPException(status_code=403, detail="Only partners can update chat settings")
    
    chat_settings = data.get("chat_settings")  # "all", "partners_only", "off"
    
    if chat_settings not in ["all", "partners_only", "off"]:
        raise HTTPException(status_code=400, detail="Invalid chat_settings value")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"partner_chat_settings": chat_settings}}
    )
    
    return {"message": "Chat settings updated", "chat_settings": chat_settings}

@api_router.get("/users/chat-settings")
async def get_chat_settings(current_user: dict = Depends(get_current_user)):
    """Get current chat settings"""
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"chat_settings": user.get("partner_chat_settings", "all")}

# ==================== COLLABORATION ENDPOINTS ====================

@api_router.post("/collaborations/propose")
async def propose_collaboration(data: dict, current_user: dict = Depends(get_current_user)):
    """Propose a collaboration from within a chat"""
    chat_room_id = data.get("chat_room_id")
    description = data.get("description", "")
    
    if not chat_room_id:
        raise HTTPException(status_code=400, detail="chat_room_id is required")
    
    # Get chat room
    chat_room = await db.chat_rooms.find_one({"id": chat_room_id})
    if not chat_room:
        raise HTTPException(status_code=404, detail="Chat room not found")
    
    # Determine participants based on chat type
    if chat_room.get("chat_type") in ["artist_artist", "partner_partner"]:
        participant1_id = chat_room["participant1_id"]
        participant2_id = chat_room["participant2_id"]
    else:
        # Venue chat
        participant1_id = chat_room.get("venue_user_id")
        participant2_id = chat_room.get("provider_user_id")
    
    # Check if collaboration already exists for this chat
    existing = await db.collaborations.find_one({"chat_room_id": chat_room_id})
    if existing:
        raise HTTPException(status_code=400, detail="Collaboration already proposed for this chat")
    
    # Create collaboration
    collaboration = Collaboration(
        chat_room_id=chat_room_id,
        initiator_user_id=current_user["id"],
        participant1_id=participant1_id,
        participant2_id=participant2_id,
        description=description
    )
    
    # Auto-approve for initiator
    if current_user["id"] == participant1_id:
        collaboration.participant1_approved = True
    elif current_user["id"] == participant2_id:
        collaboration.participant2_approved = True
    
    await db.collaborations.insert_one(collaboration.dict())
    
    return {"message": "Collaboration proposed", "collaboration_id": collaboration.id}

@api_router.post("/collaborations/{collaboration_id}/approve")
async def approve_collaboration(collaboration_id: str, current_user: dict = Depends(get_current_user)):
    """Approve a collaboration"""
    collaboration = await db.collaborations.find_one({"id": collaboration_id})
    if not collaboration:
        raise HTTPException(status_code=404, detail="Collaboration not found")
    
    # Check if user is a participant
    if current_user["id"] not in [collaboration["participant1_id"], collaboration["participant2_id"]]:
        raise HTTPException(status_code=403, detail="You are not a participant in this collaboration")
    
    # Update approval status
    update_data = {}
    if current_user["id"] == collaboration["participant1_id"]:
        update_data["participant1_approved"] = True
    elif current_user["id"] == collaboration["participant2_id"]:
        update_data["participant2_approved"] = True
    
    # Check if both approved
    collaboration_updated = await db.collaborations.find_one({"id": collaboration_id})
    if current_user["id"] == collaboration["participant1_id"]:
        both_approved = True and collaboration.get("participant2_approved", False)
    else:
        both_approved = collaboration.get("participant1_approved", False) and True
    
    if both_approved:
        update_data["approved_at"] = datetime.utcnow()
        update_data["shared_on_home"] = True
        update_data["shared_on_instagram"] = True
    
    await db.collaborations.update_one(
        {"id": collaboration_id},
        {"$set": update_data}
    )
    
    message = "Collaboration approved"
    if both_approved:
        message = "Collaboration fully approved! Will be shared on Raaya home and Instagram."
    
    return {"message": message, "both_approved": both_approved}

@api_router.get("/collaborations")
async def get_collaborations(current_user: dict = Depends(get_current_user)):
    """Get collaborations for current user"""
    collaborations = await db.collaborations.find({
        "$or": [
            {"participant1_id": current_user["id"]},
            {"participant2_id": current_user["id"]}
        ]
    }).to_list(1000)
    
    for collab in collaborations:
        collab.pop("_id", None)
    
    return collaborations

@api_router.get("/collaborations/approved")
async def get_approved_collaborations():
    """Get all approved collaborations for home page display"""
    collaborations = await db.collaborations.find({
        "participant1_approved": True,
        "participant2_approved": True
    }).to_list(1000)
    
    for collab in collaborations:
        collab.pop("_id", None)
    
    return collaborations

# ADMIN ENDPOINTS FOR ADD/DELETE
@api_router.post("/admin/artists")
async def admin_add_artist(artist_data: dict, current_user: dict = Depends(get_current_user)):
    """Admin can add artists directly"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Create user account first
    email = artist_data.get("email")
    password = artist_data.get("password", "default123")  # Admin sets password
    
    # Check if user already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Create user
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password": pwd_context.hash(password),
        "user_type": "artist",
        "is_paused": False,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(user)
    
    # Create artist profile
    new_artist = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "stage_name": artist_data.get("stage_name", "Artist"),
        "art_type": artist_data.get("art_type", "General"),
        "description": artist_data.get("description", ""),
        "experience_gigs": artist_data.get("experience_gigs", 0),
        "availability": artist_data.get("availability", []),
        "locations": artist_data.get("locations", []),
        "media_gallery": artist_data.get("media_gallery", []),
        "rating": 0,
        "review_count": 0,
        "is_featured": False,
        "created_at": datetime.utcnow()
    }
    
    await db.artist_profiles.insert_one(new_artist)
    new_artist.pop("_id", None)
    user.pop("_id", None)
    user.pop("password", None)
    
    return {"user": user, "profile": new_artist}

@api_router.post("/admin/partners")
async def admin_add_partner(partner_data: dict, current_user: dict = Depends(get_current_user)):
    """Admin can add partners/brands directly"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Create user account first
    email = partner_data.get("email")
    password = partner_data.get("password", "default123")
    
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password": pwd_context.hash(password),
        "user_type": "partner",
        "is_paused": False,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(user)
    
    new_partner = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "brand_name": partner_data.get("brand_name", "Brand"),
        "service_type": partner_data.get("service_type", "General"),
        "description": partner_data.get("description", ""),
        "locations": partner_data.get("locations", []),
        "media_gallery": partner_data.get("media_gallery", []),
        "rating": 0,
        "review_count": 0,
        "is_featured": False,
        "created_at": datetime.utcnow()
    }
    
    await db.partner_profiles.insert_one(new_partner)
    new_partner.pop("_id", None)
    user.pop("_id", None)
    user.pop("password", None)
    
    return {"user": user, "profile": new_partner}

@api_router.delete("/admin/artist/{artist_id}")
async def admin_delete_artist(artist_id: str, current_user: dict = Depends(get_current_user)):
    """Admin can delete artist profiles"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    artist = await db.artist_profiles.find_one({"id": artist_id})
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    
    # Delete profile and user
    await db.artist_profiles.delete_one({"id": artist_id})
    await db.users.delete_one({"id": artist["user_id"]})
    
    return {"message": "Artist deleted successfully"}

@api_router.delete("/admin/partner/{partner_id}")
async def admin_delete_partner(partner_id: str, current_user: dict = Depends(get_current_user)):
    """Admin can delete partner profiles"""
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    partner = await db.partner_profiles.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    await db.partner_profiles.delete_one({"id": partner_id})
    await db.users.delete_one({"id": partner["user_id"]})
    
    return {"message": "Partner deleted successfully"}

# ==================== RAZORPAY PAYMENT ROUTES (READY FOR ACTIVATION) ====================

# Initialize Razorpay client (will be activated when keys are provided)
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RAZORPAY_ENABLED = bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)

if RAZORPAY_ENABLED:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    logging.info("Razorpay payment gateway initialized")
else:
    logging.warning("Razorpay not enabled - missing API keys")

class FeaturedPaymentRequest(BaseModel):
    profile_id: str
    profile_type: str  # artist or partner
    plan: str  # "weekly" (artists ₹199) or "monthly" (brands ₹999)

@api_router.post("/payment/create-featured-order")
async def create_featured_order(request: FeaturedPaymentRequest, current_user: dict = Depends(get_current_user)):
    if not RAZORPAY_ENABLED:
        raise HTTPException(status_code=503, detail="Payment gateway not configured")
    
    # Verify user owns this profile
    collection = db.artist_profiles if request.profile_type == "artist" else db.partner_profiles
    profile = await collection.find_one({"id": request.profile_id})
    
    if not profile or profile["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Calculate amount based on plan
    if request.plan == "weekly":
        amount = 19900  # ₹199 in paise
        duration_days = 7
    elif request.plan == "monthly":
        amount = 99900  # ₹999 in paise
        duration_days = 30
    else:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    try:
        # Create Razorpay order
        order = razorpay_client.order.create({
            "amount": amount,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {
                "profile_id": request.profile_id,
                "profile_type": request.profile_type,
                "user_id": current_user["id"],
                "duration_days": request.duration_days
            }
        })
        
        # Store order in database
        await db.payment_orders.insert_one({
            "order_id": order["id"],
            "profile_id": request.profile_id,
            "profile_type": request.profile_type,
            "user_id": current_user["id"],
            "amount": amount,
            "duration_days": request.duration_days,
            "status": "created",
            "created_at": datetime.utcnow()
        })
        
        return {
            "order_id": order["id"],
            "amount": amount,
            "currency": "INR",
            "key_id": RAZORPAY_KEY_ID
        }
    except Exception as e:
        logging.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail="Payment order creation failed")

@api_router.post("/payment/verify-featured")
async def verify_featured_payment(data: dict, current_user: dict = Depends(get_current_user)):
    if not RAZORPAY_ENABLED:
        raise HTTPException(status_code=503, detail="Payment gateway not configured")
    
    try:
        # Verify payment signature
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": data["razorpay_order_id"],
            "razorpay_payment_id": data["razorpay_payment_id"],
            "razorpay_signature": data["razorpay_signature"]
        })
        
        # Get order details
        order = await db.payment_orders.find_one({"order_id": data["razorpay_order_id"]})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Update profile to featured
        collection = db.artist_profiles if order["profile_type"] == "artist" else db.partner_profiles
        featured_until = datetime.utcnow() + timedelta(days=order.get("duration_days", 7))
        
        await collection.update_one(
            {"id": order["profile_id"]},
            {"$set": {
                "is_featured": True,
                "featured_until": featured_until,
                "featured_type": order.get("plan", "weekly")
            }}
        )
        
        # Update order status
        await db.payment_orders.update_one(
            {"order_id": data["razorpay_order_id"]},
            {"$set": {
                "status": "completed",
                "payment_id": data["razorpay_payment_id"],
                "completed_at": datetime.utcnow()
            }}
        )
        
        return {"message": "Payment verified and profile featured successfully"}
    except Exception as e:
        logging.error(f"Payment verification failed: {e}")
        raise HTTPException(status_code=400, detail="Payment verification failed")

# ==================== PROFILE MANAGEMENT ROUTES ====================

@api_router.post("/profile/pause")
async def pause_profile(current_user: dict = Depends(get_current_user)):
    """Pause profile - hidden from venues but data saved, can still chat"""
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"is_paused": True}}
    )
    return {"message": "Profile paused successfully"}

@api_router.delete("/profile/delete")
async def delete_profile(current_user: dict = Depends(get_current_user)):
    """Permanently delete user profile and all associated data"""
    user_id = current_user["id"]
    
    # Delete all associated data
    await db.users.delete_one({"id": user_id})
    await db.artist_profiles.delete_many({"user_id": user_id})
    await db.partner_profiles.delete_many({"user_id": user_id})
    await db.venue_profiles.delete_many({"user_id": user_id})
    await db.reviews.delete_many({"reviewer_id": user_id})
    await db.wishlists.delete_many({"venue_user_id": user_id})
    await db.chat_rooms.delete_many({"$or": [{"venue_user_id": user_id}, {"provider_user_id": user_id}]})
    
    return {"message": "Profile permanently deleted"}

# ==================== ADMIN ANALYTICS ROUTES ====================

@api_router.get("/admin/analytics")
async def get_analytics(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Total users by type
    total_artists = await db.users.count_documents({"user_type": "artist"})
    total_partners = await db.users.count_documents({"user_type": "partner"})
    total_venues = await db.users.count_documents({"user_type": "venue"})
    total_users = total_artists + total_partners + total_venues
    
    # Active users (logged in last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    active_users = await db.users.count_documents({
        "last_login": {"$gte": seven_days_ago}
    })
    
    # Chat statistics
    total_chats = await db.chat_rooms.count_documents({})
    total_messages = await db.messages.count_documents({})
    
    # Active chats (messages in last 7 days)
    active_chat_rooms = await db.messages.distinct("chat_room_id", {
        "created_at": {"$gte": seven_days_ago}
    })
    active_chats = len(active_chat_rooms)
    
    # Rating statistics
    all_artists = await db.artist_profiles.find().to_list(1000)
    all_partners = await db.partner_profiles.find().to_list(1000)
    
    artist_ratings = [a["rating"] for a in all_artists if a.get("rating", 0) > 0]
    partner_ratings = [p["rating"] for p in all_partners if p.get("rating", 0) > 0]
    
    avg_artist_rating = sum(artist_ratings) / len(artist_ratings) if artist_ratings else 0
    avg_partner_rating = sum(partner_ratings) / len(partner_ratings) if partner_ratings else 0
    
    # Featured listings
    featured_artists = await db.artist_profiles.count_documents({"is_featured": True})
    featured_partners = await db.partner_profiles.count_documents({"is_featured": True})
    
    # Revenue from featured (if payment orders exist)
    completed_orders = await db.payment_orders.find({"status": "completed"}).to_list(1000)
    total_revenue = sum(order.get("amount", 0) for order in completed_orders) / 100  # Convert paise to rupees
    
    # Growth stats (new users last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    new_users = await db.users.count_documents({
        "created_at": {"$gte": thirty_days_ago}
    })
    
    return {
        "users": {
            "total": total_users,
            "artists": total_artists,
            "partners": total_partners,
            "venues": total_venues,
            "active_7_days": active_users,
            "new_30_days": new_users
        },
        "chats": {
            "total_rooms": total_chats,
            "active_rooms": active_chats,
            "total_messages": total_messages
        },
        "ratings": {
            "avg_artist_rating": round(avg_artist_rating, 2),
            "avg_partner_rating": round(avg_partner_rating, 2),
            "total_reviews": sum(a.get("review_count", 0) for a in all_artists) + sum(p.get("review_count", 0) for p in all_partners)
        },
        "featured": {
            "artists": featured_artists,
            "partners": featured_partners,
            "total_revenue": round(total_revenue, 2)
        }
    }

# ==================== SOCKET.IO EVENTS ====================

connected_users = {}  # {user_id: sid}

@sio.event
async def connect(sid, environ):
    logging.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logging.info(f"Client disconnected: {sid}")
    # Remove from connected users
    user_to_remove = None
    for user_id, socket_id in connected_users.items():
        if socket_id == sid:
            user_to_remove = user_id
            break
    if user_to_remove:
        del connected_users[user_to_remove]

@sio.event
async def authenticate(sid, data):
    user_id = data.get('user_id')
    if user_id:
        connected_users[user_id] = sid
        await sio.emit('authenticated', {'user_id': user_id}, room=sid)
        logging.info(f"User {user_id} authenticated with socket {sid}")

@sio.event
async def join_room(sid, data):
    room_id = data.get('room_id')
    await sio.enter_room(sid, room_id)
    logging.info(f"Socket {sid} joined room {room_id}")

@sio.event
async def leave_room(sid, data):
    room_id = data.get('room_id')
    await sio.leave_room(sid, room_id)
    logging.info(f"Socket {sid} left room {room_id}")

@sio.event
async def send_message(sid, data):
    room_id = data.get('room_id')
    sender_id = data.get('sender_id')
    message_text = data.get('message')
    
    # Save to database
    message = Message(
        chat_room_id=room_id,
        sender_id=sender_id,
        message=message_text
    )
    await db.messages.insert_one(message.dict())
    
    # Update room last message time
    await db.chat_rooms.update_one(
        {"id": room_id},
        {"$set": {"last_message_at": datetime.utcnow()}}
    )
    
    # Broadcast to room
    message_dict = message.dict()
    message_dict.pop("_id", None)
    await sio.emit('new_message', message_dict, room=room_id)
    logging.info(f"Message sent to room {room_id}")

@sio.event
async def typing(sid, data):
    room_id = data.get('room_id')
    user_id = data.get('user_id')
    is_typing = data.get('is_typing')
    
    await sio.emit('user_typing', {
        'user_id': user_id,
        'is_typing': is_typing
    }, room=room_id, skip_sid=sid)

@sio.event
async def mark_read(sid, data):
    room_id = data.get('room_id')
    user_id = data.get('user_id')
    
    # Mark messages as read
    await db.messages.update_many(
        {"chat_room_id": room_id, "sender_id": {"$ne": user_id}},
        {"$set": {"is_read": True}}
    )
    
    await sio.emit('messages_read', {'room_id': room_id}, room=room_id)

# ==================== INCLUDE ROUTER ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
