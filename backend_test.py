#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Raya Mobile App
Tests all authentication, profile, review, wishlist, and chat endpoints
"""

import requests
import json
import os
from datetime import datetime
import uuid

# Get backend URL from frontend environment
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except:
        pass
    return "https://talent-nexus-31.preview.emergentagent.com"

BASE_URL = get_backend_url()
API_BASE = f"{BASE_URL}/api"

print(f"Testing backend at: {API_BASE}")

# Test data
TEST_USERS = {
    "artist": {
        "email": "test.artist@raya.com",
        "password": "password123",
        "user_type": "artist",
        "profile_data": {
            "stage_name": "Creative Artist",
            "description": "Professional pottery and calligraphy artist",
            "art_type": "pottery"
        }
    },
    "partner": {
        "email": "premium.water@raya.com", 
        "password": "password123",
        "user_type": "partner",
        "profile_data": {
            "brand_name": "Premium Water Co",
            "description": "High-quality water services for events",
            "service_type": "premium water"
        }
    },
    "venue": {
        "email": "venue.manager@raya.com",
        "password": "password123", 
        "user_type": "venue",
        "profile_data": {
            "venue_name": "Grand Event Hall",
            "description": "Premium venue for cultural events"
        }
    }
}

# Global variables to store tokens and IDs
tokens = {}
user_ids = {}
profile_ids = {}

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        
    def success(self, test_name):
        self.passed += 1
        print(f"✅ {test_name}")
        
    def failure(self, test_name, error):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"❌ {test_name}: {error}")
        
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY: {self.passed}/{total} passed")
        if self.errors:
            print(f"\nFAILED TESTS:")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*60}")
        return len(self.errors) == 0

results = TestResults()

def make_request(method, endpoint, data=None, headers=None, auth_token=None):
    """Make HTTP request with proper error handling"""
    url = f"{API_BASE}{endpoint}"
    
    if headers is None:
        headers = {"Content-Type": "application/json"}
    
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=30)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=headers, timeout=30)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        return response
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None

def test_auth_register():
    """Test user registration for all user types"""
    print("\n🔐 Testing Authentication - Registration")
    
    for user_type, user_data in TEST_USERS.items():
        response = make_request("POST", "/auth/register", user_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user_id" in data:
                tokens[user_type] = data["access_token"]
                user_ids[user_type] = data["user_id"]
                results.success(f"Register {user_type}")
            else:
                results.failure(f"Register {user_type}", "Missing token or user_id in response")
        elif response and response.status_code == 400:
            # User might already exist, try login instead
            login_response = make_request("POST", "/auth/login", {
                "email": user_data["email"],
                "password": user_data["password"]
            })
            if login_response and login_response.status_code == 200:
                data = login_response.json()
                tokens[user_type] = data["access_token"]
                user_ids[user_type] = data["user_id"]
                results.success(f"Register {user_type} (existing user)")
            else:
                results.failure(f"Register {user_type}", f"Registration failed and login failed")
        else:
            error_msg = response.text if response else "No response"
            results.failure(f"Register {user_type}", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

def test_auth_login():
    """Test user login"""
    print("\n🔐 Testing Authentication - Login")
    
    for user_type, user_data in TEST_USERS.items():
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        
        response = make_request("POST", "/auth/login", login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                tokens[user_type] = data["access_token"]
                user_ids[user_type] = data["user_id"]
                results.success(f"Login {user_type}")
            else:
                results.failure(f"Login {user_type}", "Missing access_token in response")
        else:
            error_msg = response.text if response else "No response"
            results.failure(f"Login {user_type}", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

def test_auth_me():
    """Test get current user profile"""
    print("\n🔐 Testing Authentication - Get Me")
    
    for user_type in TEST_USERS.keys():
        if user_type not in tokens:
            results.failure(f"Get me {user_type}", "No auth token available")
            continue
            
        response = make_request("GET", "/auth/me", auth_token=tokens[user_type])
        
        if response and response.status_code == 200:
            data = response.json()
            if "user" in data and "profile" in data:
                # Store profile IDs for later tests
                if data["profile"] and "id" in data["profile"]:
                    profile_ids[user_type] = data["profile"]["id"]
                results.success(f"Get me {user_type}")
            else:
                results.failure(f"Get me {user_type}", "Missing user or profile in response")
        else:
            error_msg = response.text if response else "No response"
            results.failure(f"Get me {user_type}", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

def test_artists_endpoints():
    """Test artist-related endpoints"""
    print("\n🎨 Testing Artists Endpoints")
    
    # Test GET /api/artists
    response = make_request("GET", "/artists")
    if response and response.status_code == 200:
        artists = response.json()
        if isinstance(artists, list):
            results.success("Get all artists")
            
            # Test GET specific artist if any exist
            if artists and "artist" in profile_ids:
                artist_id = profile_ids["artist"]
                response = make_request("GET", f"/artists/{artist_id}")
                if response and response.status_code == 200:
                    results.success("Get specific artist")
                else:
                    error_msg = response.text if response else "No response"
                    results.failure("Get specific artist", f"Status: {response.status_code if response else 'None'}")
            
            # Test PUT artist (requires auth)
            if "artist" in tokens and "artist" in profile_ids:
                update_data = {"description": "Updated artist description"}
                artist_id = profile_ids["artist"]
                response = make_request("PUT", f"/artists/{artist_id}", update_data, auth_token=tokens["artist"])
                if response and response.status_code == 200:
                    results.success("Update artist profile")
                else:
                    error_msg = response.text if response else "No response"
                    results.failure("Update artist profile", f"Status: {response.status_code if response else 'None'}")
        else:
            results.failure("Get all artists", "Response is not a list")
    else:
        error_msg = response.text if response else "No response"
        results.failure("Get all artists", f"Status: {response.status_code if response else 'None'}")

def test_partners_endpoints():
    """Test partner-related endpoints"""
    print("\n🤝 Testing Partners Endpoints")
    
    # Test GET /api/partners
    response = make_request("GET", "/partners")
    if response and response.status_code == 200:
        partners = response.json()
        if isinstance(partners, list):
            results.success("Get all partners")
            
            # Test GET specific partner
            if partners and "partner" in profile_ids:
                partner_id = profile_ids["partner"]
                response = make_request("GET", f"/partners/{partner_id}")
                if response and response.status_code == 200:
                    results.success("Get specific partner")
                else:
                    error_msg = response.text if response else "No response"
                    results.failure("Get specific partner", f"Status: {response.status_code if response else 'None'}")
            
            # Test PUT partner (requires auth)
            if "partner" in tokens and "partner" in profile_ids:
                update_data = {"description": "Updated partner description"}
                partner_id = profile_ids["partner"]
                response = make_request("PUT", f"/partners/{partner_id}", update_data, auth_token=tokens["partner"])
                if response and response.status_code == 200:
                    results.success("Update partner profile")
                else:
                    error_msg = response.text if response else "No response"
                    results.failure("Update partner profile", f"Status: {response.status_code if response else 'None'}")
        else:
            results.failure("Get all partners", "Response is not a list")
    else:
        error_msg = response.text if response else "No response"
        results.failure("Get all partners", f"Status: {response.status_code if response else 'None'}")

def test_reviews():
    """Test review endpoints"""
    print("\n⭐ Testing Reviews")
    
    # Test POST review (venue only)
    if "venue" in tokens and "artist" in profile_ids:
        review_data = {
            "id": str(uuid.uuid4()),
            "profile_id": profile_ids["artist"],
            "profile_type": "artist",
            "reviewer_id": user_ids.get("venue", ""),
            "reviewer_name": "Grand Event Hall",
            "rating": 4.5,
            "comment": "Excellent pottery work for our cultural event!"
        }
        
        response = make_request("POST", "/reviews", review_data, auth_token=tokens["venue"])
        if response and response.status_code == 200:
            results.success("Create review")
            
            # Test GET reviews for profile
            response = make_request("GET", f"/reviews/{profile_ids['artist']}")
            if response and response.status_code == 200:
                reviews = response.json()
                if isinstance(reviews, list):
                    results.success("Get reviews for profile")
                else:
                    results.failure("Get reviews for profile", "Response is not a list")
            else:
                error_msg = response.text if response else "No response"
                results.failure("Get reviews for profile", f"Status: {response.status_code if response else 'None'}")
        else:
            error_msg = response.text if response else "No response"
            results.failure("Create review", f"Status: {response.status_code if response else 'None'}")
    else:
        results.failure("Create review", "Missing venue token or artist profile ID")

def test_wishlist():
    """Test wishlist endpoints (venue only)"""
    print("\n💝 Testing Wishlist")
    
    if "venue" not in tokens:
        results.failure("Wishlist tests", "No venue token available")
        return
    
    # Test POST wishlist
    if "artist" in profile_ids:
        wishlist_data = {
            "id": str(uuid.uuid4()),
            "venue_user_id": user_ids.get("venue", ""),
            "profile_id": profile_ids["artist"],
            "profile_type": "artist"
        }
        
        response = make_request("POST", "/wishlist", wishlist_data, auth_token=tokens["venue"])
        if response and response.status_code == 200:
            results.success("Add to wishlist")
        else:
            error_msg = response.text if response else "No response"
            results.failure("Add to wishlist", f"Status: {response.status_code if response else 'None'}")
    
    # Test GET wishlist
    response = make_request("GET", "/wishlist", auth_token=tokens["venue"])
    if response and response.status_code == 200:
        wishlist = response.json()
        if isinstance(wishlist, list):
            results.success("Get wishlist")
            
            # Test DELETE from wishlist
            if "artist" in profile_ids:
                response = make_request("DELETE", f"/wishlist/{profile_ids['artist']}", auth_token=tokens["venue"])
                if response and response.status_code == 200:
                    results.success("Remove from wishlist")
                else:
                    error_msg = response.text if response else "No response"
                    results.failure("Remove from wishlist", f"Status: {response.status_code if response else 'None'}")
        else:
            results.failure("Get wishlist", "Response is not a list")
    else:
        error_msg = response.text if response else "No response"
        results.failure("Get wishlist", f"Status: {response.status_code if response else 'None'}")

def test_chat_rooms():
    """Test chat room endpoints"""
    print("\n💬 Testing Chat Rooms")
    
    if "venue" not in tokens or "artist" not in user_ids:
        results.failure("Chat room tests", "Missing venue token or artist user ID")
        return
    
    # Test POST chat room
    room_data = {
        "provider_user_id": user_ids["artist"],
        "provider_type": "artist"
    }
    
    response = make_request("POST", "/chat/room", room_data, auth_token=tokens["venue"])
    room_id = None
    if response and response.status_code == 200:
        room_data_response = response.json()
        if "id" in room_data_response:
            room_id = room_data_response["id"]
            results.success("Create chat room")
        else:
            results.failure("Create chat room", "Missing room ID in response")
    else:
        error_msg = response.text if response else "No response"
        results.failure("Create chat room", f"Status: {response.status_code if response else 'None'}")
    
    # Test GET chat rooms
    response = make_request("GET", "/chat/rooms", auth_token=tokens["venue"])
    if response and response.status_code == 200:
        rooms = response.json()
        if isinstance(rooms, list):
            results.success("Get chat rooms")
            
            # Test GET messages for room
            if room_id:
                response = make_request("GET", f"/chat/messages/{room_id}", auth_token=tokens["venue"])
                if response and response.status_code == 200:
                    messages = response.json()
                    if isinstance(messages, list):
                        results.success("Get chat messages")
                    else:
                        results.failure("Get chat messages", "Response is not a list")
                else:
                    error_msg = response.text if response else "No response"
                    results.failure("Get chat messages", f"Status: {response.status_code if response else 'None'}")
        else:
            results.failure("Get chat rooms", "Response is not a list")
    else:
        error_msg = response.text if response else "No response"
        results.failure("Get chat rooms", f"Status: {response.status_code if response else 'None'}")

def test_artist_subscription_endpoints():
    """Test Artist subscription endpoints for Razorpay Go Pro"""
    print("\n🎨 Testing Artist Subscription Endpoints")
    
    if "artist" not in tokens:
        results.failure("Artist subscription tests", "No artist token available")
        return
    
    # Test 1: Initialize free subscription
    response = make_request("POST", "/artist/subscription/initialize", auth_token=tokens["artist"])
    if response and response.status_code == 200:
        data = response.json()
        if data.get('subscription_type') == 'free' and data.get('profile_views_remaining') == 10:
            results.success("Artist initialize subscription")
        else:
            results.failure("Artist initialize subscription", f"Unexpected data: {data}")
    else:
        error_msg = response.text if response else "No response"
        results.failure("Artist initialize subscription", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    # Test 2: Get subscription status
    response = make_request("GET", "/artist/subscription/status", auth_token=tokens["artist"])
    if response and response.status_code == 200:
        data = response.json()
        if 'subscription_type' in data and 'profile_views_remaining' in data:
            results.success("Artist get subscription status")
        else:
            results.failure("Artist get subscription status", f"Missing required fields: {data}")
    else:
        error_msg = response.text if response else "No response"
        results.failure("Artist get subscription status", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    # Test 3: Track profile views (test 10 views + 1 blocked)
    views_working = True
    for i in range(11):
        view_data = {"profile_id": f"test_profile_{i}"}
        response = make_request("POST", "/artist/subscription/track-view", view_data, auth_token=tokens["artist"])
        if response and response.status_code == 200:
            data = response.json()
            if i < 10:  # First 10 should be allowed
                if not data.get("allowed"):
                    results.failure(f"Artist track view {i+1}", "View should be allowed but was blocked")
                    views_working = False
                    break
            else:  # 11th view should be blocked
                if data.get("allowed"):
                    results.failure("Artist track view 11 (block test)", "11th view should be blocked but was allowed")
                    views_working = False
                    break
        else:
            error_msg = response.text if response else "No response"
            results.failure(f"Artist track view {i+1}", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            views_working = False
            break
    
    if views_working:
        results.success("Artist track views (free tier limit enforcement)")
    
    # Test 4: Create Razorpay order (test mode)
    response = make_request("POST", "/artist/subscription/create-razorpay-order", auth_token=tokens["artist"])
    order_id = None
    if response and response.status_code == 200:
        data = response.json()
        if 'order_id' in data and data.get('amount') == 49900:
            order_id = data['order_id']
            results.success("Artist create Razorpay order")
        else:
            results.failure("Artist create Razorpay order", f"Unexpected order data: {data}")
    else:
        error_msg = response.text if response else "No response"
        results.failure("Artist create Razorpay order", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    # Test 5: Verify payment (test mode)
    if order_id:
        payment_data = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "test_payment_123",
            "razorpay_signature": "test_signature_123"
        }
        response = make_request("POST", "/artist/subscription/verify-payment", payment_data, auth_token=tokens["artist"])
        if response and response.status_code == 200:
            data = response.json()
            if 'message' in data and data.get('status') == 'active':
                results.success("Artist verify payment")
                
                # Test 6: Verify Pro status after payment
                response = make_request("GET", "/artist/subscription/status", auth_token=tokens["artist"])
                if response and response.status_code == 200:
                    data = response.json()
                    if data.get('subscription_type') == 'pro' and data.get('profile_views_remaining') == -1:
                        results.success("Artist Pro status verification")
                        
                        # Test 7: Test unlimited views after Pro upgrade
                        view_data = {"profile_id": "test_pro_profile"}
                        response = make_request("POST", "/artist/subscription/track-view", view_data, auth_token=tokens["artist"])
                        if response and response.status_code == 200:
                            data = response.json()
                            if data.get("allowed") and data.get("views_remaining") == -1:
                                results.success("Artist Pro unlimited views")
                            else:
                                results.failure("Artist Pro unlimited views", f"Expected unlimited views, got: {data}")
                        else:
                            error_msg = response.text if response else "No response"
                            results.failure("Artist Pro unlimited views", f"Status: {response.status_code if response else 'None'}")
                    else:
                        results.failure("Artist Pro status verification", f"Expected Pro with unlimited views, got: {data}")
                else:
                    error_msg = response.text if response else "No response"
                    results.failure("Artist Pro status verification", f"Status: {response.status_code if response else 'None'}")
            else:
                results.failure("Artist verify payment", f"Unexpected payment response: {data}")
        else:
            error_msg = response.text if response else "No response"
            results.failure("Artist verify payment", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

def test_partner_subscription_endpoints():
    """Test Partner subscription endpoints for Razorpay Go Pro"""
    print("\n🤝 Testing Partner Subscription Endpoints")
    
    if "partner" not in tokens:
        results.failure("Partner subscription tests", "No partner token available")
        return
    
    # Test 1: Initialize free subscription
    response = make_request("POST", "/partner/subscription/initialize", auth_token=tokens["partner"])
    if response and response.status_code == 200:
        data = response.json()
        if data.get('subscription_type') == 'free' and data.get('profile_views_remaining') == 10:
            results.success("Partner initialize subscription")
        else:
            results.failure("Partner initialize subscription", f"Unexpected data: {data}")
    else:
        error_msg = response.text if response else "No response"
        results.failure("Partner initialize subscription", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    # Test 2: Get subscription status
    response = make_request("GET", "/partner/subscription/status", auth_token=tokens["partner"])
    if response and response.status_code == 200:
        data = response.json()
        if 'subscription_type' in data and 'profile_views_remaining' in data:
            results.success("Partner get subscription status")
        else:
            results.failure("Partner get subscription status", f"Missing required fields: {data}")
    else:
        error_msg = response.text if response else "No response"
        results.failure("Partner get subscription status", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    # Test 3: Track profile views (test 10 views + 1 blocked)
    views_working = True
    for i in range(11):
        view_data = {"profile_id": f"test_partner_profile_{i}"}
        response = make_request("POST", "/partner/subscription/track-view", view_data, auth_token=tokens["partner"])
        if response and response.status_code == 200:
            data = response.json()
            if i < 10:  # First 10 should be allowed
                if not data.get("allowed"):
                    results.failure(f"Partner track view {i+1}", "View should be allowed but was blocked")
                    views_working = False
                    break
            else:  # 11th view should be blocked
                if data.get("allowed"):
                    results.failure("Partner track view 11 (block test)", "11th view should be blocked but was allowed")
                    views_working = False
                    break
        else:
            error_msg = response.text if response else "No response"
            results.failure(f"Partner track view {i+1}", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            views_working = False
            break
    
    if views_working:
        results.success("Partner track views (free tier limit enforcement)")
    
    # Test 4: Create Razorpay order (test mode)
    response = make_request("POST", "/partner/subscription/create-razorpay-order", auth_token=tokens["partner"])
    order_id = None
    if response and response.status_code == 200:
        data = response.json()
        if 'order_id' in data and data.get('amount') == 49900:
            order_id = data['order_id']
            results.success("Partner create Razorpay order")
        else:
            results.failure("Partner create Razorpay order", f"Unexpected order data: {data}")
    else:
        error_msg = response.text if response else "No response"
        results.failure("Partner create Razorpay order", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    # Test 5: Verify payment (test mode)
    if order_id:
        payment_data = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "test_payment_456",
            "razorpay_signature": "test_signature_456"
        }
        response = make_request("POST", "/partner/subscription/verify-payment", payment_data, auth_token=tokens["partner"])
        if response and response.status_code == 200:
            data = response.json()
            if 'message' in data and data.get('status') == 'active':
                results.success("Partner verify payment")
                
                # Test 6: Verify Pro status after payment
                response = make_request("GET", "/partner/subscription/status", auth_token=tokens["partner"])
                if response and response.status_code == 200:
                    data = response.json()
                    if data.get('subscription_type') == 'pro' and data.get('profile_views_remaining') == -1:
                        results.success("Partner Pro status verification")
                    else:
                        results.failure("Partner Pro status verification", f"Expected Pro with unlimited views, got: {data}")
                else:
                    error_msg = response.text if response else "No response"
                    results.failure("Partner Pro status verification", f"Status: {response.status_code if response else 'None'}")
            else:
                results.failure("Partner verify payment", f"Unexpected payment response: {data}")
        else:
            error_msg = response.text if response else "No response"
            results.failure("Partner verify payment", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

def test_venue_subscription_endpoints():
    """Test Venue/Host subscription endpoints for Razorpay Go Pro"""
    print("\n🏢 Testing Venue/Host Subscription Endpoints")
    
    if "venue" not in tokens:
        results.failure("Venue subscription tests", "No venue token available")
        return
    
    # Test 1: Create Razorpay order (test mode)
    response = make_request("POST", "/venue/subscription/create-razorpay-order", auth_token=tokens["venue"])
    order_id = None
    if response and response.status_code == 200:
        data = response.json()
        if 'order_id' in data and data.get('amount') == 49900:
            order_id = data['order_id']
            results.success("Venue create Razorpay order")
        else:
            results.failure("Venue create Razorpay order", f"Unexpected order data: {data}")
    else:
        error_msg = response.text if response else "No response"
        results.failure("Venue create Razorpay order", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
    
    # Test 2: Verify payment (test mode)
    if order_id:
        payment_data = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "test_payment_789",
            "razorpay_signature": "test_signature_789"
        }
        response = make_request("POST", "/venue/subscription/verify-payment", payment_data, auth_token=tokens["venue"])
        if response and response.status_code == 200:
            data = response.json()
            if 'message' in data and data.get('status') == 'active':
                results.success("Venue verify payment")
            else:
                results.failure("Venue verify payment", f"Unexpected payment response: {data}")
        else:
            error_msg = response.text if response else "No response"
            results.failure("Venue verify payment", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

def test_universal_subscription_endpoint():
    """Test universal subscription status endpoint for all user types"""
    print("\n🌐 Testing Universal Subscription Status Endpoint")
    
    for user_type in ["artist", "partner", "venue"]:
        if user_type not in tokens:
            results.failure(f"Universal subscription status - {user_type}", f"No {user_type} token available")
            continue
        
        response = make_request("GET", "/subscription/status", auth_token=tokens[user_type])
        if response and response.status_code == 200:
            data = response.json()
            if 'subscription_type' in data and 'profile_views_remaining' in data:
                results.success(f"Universal subscription status - {user_type}")
            else:
                results.failure(f"Universal subscription status - {user_type}", f"Missing required fields: {data}")
        else:
            error_msg = response.text if response else "No response"
            results.failure(f"Universal subscription status - {user_type}", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

def main():
    """Run all tests"""
    print("🚀 Starting Raya Backend API Tests")
    print(f"Backend URL: {API_BASE}")
    
    # Test authentication first
    test_auth_register()
    test_auth_login()
    test_auth_me()
    
    # Test profile endpoints
    test_artists_endpoints()
    test_partners_endpoints()
    
    # Test feature endpoints
    test_reviews()
    test_wishlist()
    test_chat_rooms()
    
    # Test NEW Razorpay Go Pro subscription endpoints
    print("\n" + "="*60)
    print("🎯 TESTING NEW RAZORPAY GO PRO SUBSCRIPTION ENDPOINTS")
    print("="*60)
    test_artist_subscription_endpoints()
    test_partner_subscription_endpoints()
    test_venue_subscription_endpoints()
    test_universal_subscription_endpoint()
    
    # Print final results
    success = results.summary()
    
    if success:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n💥 {results.failed} tests failed!")
        return 1

if __name__ == "__main__":
    exit(main())