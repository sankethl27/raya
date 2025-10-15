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
    day: str  # Monday, Tuesday, etc.
    time_slots: List[str]  # ["10:00 AM - 2:00 PM", "6:00 PM - 10:00 PM"]

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
    reviewer_id: str  # venue user id
    reviewer_name: str
    rating: float  # 1-5
    comment: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Wishlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_user_id: str
    profile_id: str  # artist or partner profile id
    profile_type: str  # artist or partner
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatRoom(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_user_id: str
    provider_user_id: str  # artist or partner user id
    provider_type: str  # artist or partner
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_message_at: Optional[datetime] = None

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chat_room_id: str
    sender_id: str
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

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
    query = {}
    
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
    partners = await db.partner_profiles.find().to_list(1000)
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
    
    if current_user["user_type"] != "venue":
        raise HTTPException(status_code=403, detail="Only venues can start chats")
    
    # Check if room already exists
    existing_room = await db.chat_rooms.find_one({
        "venue_user_id": current_user["id"],
        "provider_user_id": provider_user_id
    })
    
    if existing_room:
        existing_room.pop("_id", None)
        return existing_room
    
    # Create new room
    room = ChatRoom(
        venue_user_id=current_user["id"],
        provider_user_id=provider_user_id,
        provider_type=provider_type
    )
    await db.chat_rooms.insert_one(room.dict())
    return room.dict()

@api_router.get("/chat/rooms")
async def get_chat_rooms(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] == "venue":
        rooms = await db.chat_rooms.find({"venue_user_id": current_user["id"]}).to_list(1000)
    else:
        rooms = await db.chat_rooms.find({"provider_user_id": current_user["id"]}).to_list(1000)
    
    # Enrich with profile data
    for room in rooms:
        room.pop("_id", None)
        
        # Get venue profile
        venue_profile = await db.venue_profiles.find_one({"user_id": room["venue_user_id"]})
        if venue_profile:
            venue_profile.pop("_id", None)
            room["venue_profile"] = venue_profile
        
        # Get provider profile
        if room["provider_type"] == "artist":
            provider_profile = await db.artist_profiles.find_one({"user_id": room["provider_user_id"]})
        else:
            provider_profile = await db.partner_profiles.find_one({"user_id": room["provider_user_id"]})
        
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
    
    if room["venue_user_id"] != current_user["id"] and room["provider_user_id"] != current_user["id"]:
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
        
        # Get profiles
        venue_profile = await db.venue_profiles.find_one({"user_id": room["venue_user_id"]})
        if room["provider_type"] == "artist":
            provider_profile = await db.artist_profiles.find_one({"user_id": room["provider_user_id"]})
        else:
            provider_profile = await db.partner_profiles.find_one({"user_id": room["provider_user_id"]})
        
        if venue_profile:
            venue_profile.pop("_id", None)
        if provider_profile:
            provider_profile.pop("_id", None)
        
        result.append({
            "room": room,
            "messages": messages,
            "venue_profile": venue_profile,
            "provider_profile": provider_profile
        })
    
    return result

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
