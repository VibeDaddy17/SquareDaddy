#!/usr/bin/env python3
"""
Create a test game where the REAL logged-in user is the creator.
This allows the actual user to test admin features.
"""

import requests
import time
from datetime import datetime, timezone, timedelta
import uuid
import sys

BACKEND_URL = "http://localhost:8001/api"

def create_test_user_and_session(user_number):
    """Create a test user and session in MongoDB"""
    import pymongo
    
    client = pymongo.MongoClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    user_id = f"test_user_{user_number}_{uuid.uuid4().hex[:8]}"
    session_token = f"test_session_{user_number}_{uuid.uuid4().hex[:8]}"
    
    # Create user
    user = {
        "user_id": user_id,
        "email": f"test.user.{user_number}.{int(time.time())}@example.com",
        "name": f"Test User {user_number}",
        "picture": "https://via.placeholder.com/150",
        "mock_balance": 1000.0,
        "created_at": datetime.now(timezone.utc)
    }
    db.users.insert_one(user)
    
    # Create session
    session = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    db.user_sessions.insert_one(session)
    
    print(f"✅ Created Test User {user_number}: {user['name']} (ID: {user_id})")
    return session_token, user_id

def create_game_as_real_user(real_user_token):
    """Create a game as the real logged-in user"""
    response = requests.post(
        f"{BACKEND_URL}/games",
        headers={"Authorization": f"Bearer {real_user_token}"},
        json={
            "event_name": "YOUR Test Game - Admin Features",
            "entry_fee": 10.0
        }
    )
    
    if response.status_code == 200:
        game = response.json()
        print(f"✅ Created Game as YOU: {game['event_name']} (ID: {game['game_id']})")
        return game['game_id']
    else:
        print(f"❌ Failed to create game: {response.status_code} - {response.text}")
        return None

def join_square(session_token, game_id, square_number, user_name):
    """Join a specific square"""
    response = requests.post(
        f"{BACKEND_URL}/games/{game_id}/join",
        headers={"Authorization": f"Bearer {session_token}"},
        json={"square_number": square_number}
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ {user_name} joined square {square_number}")
        return result
    else:
        print(f"❌ Failed to join square {square_number}: {response.status_code} - {response.text}")
        return None

def get_game_details(session_token, game_id):
    """Get game details"""
    response = requests.get(
        f"{BACKEND_URL}/games/{game_id}",
        headers={"Authorization": f"Bearer {session_token}"}
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"❌ Failed to get game details: {response.status_code}")
        return None

def main():
    if len(sys.argv) < 2:
        print("❌ Error: Session token required!")
        print("\nUsage:")
        print("  python create_your_game.py YOUR_SESSION_TOKEN")
        print("\nHow to get your session token:")
        print("  1. Open the app on your phone")
        print("  2. You should already be logged in")
        print("  3. I'll provide instructions to get the token...")
        print("\nAlternatively, just tell me and I'll create the game for you!")
        return
    
    real_user_token = sys.argv[1]
    
    print("🎮 Creating Test Game With YOU as Admin")
    print("=" * 60)
    
    # Step 1: Create game as real user
    print("\n📝 Step 1: Creating game with YOU as creator...")
    game_id = create_game_as_real_user(real_user_token)
    if not game_id:
        print("❌ Test failed: Could not create game")
        return
    
    # Step 2: You join first 2 squares
    print("\n📝 Step 2: YOU joining first 2 squares...")
    join_square(real_user_token, game_id, 0, "YOU")
    time.sleep(0.5)
    join_square(real_user_token, game_id, 1, "YOU")
    
    # Step 3: Create 8 test users to fill remaining squares
    print("\n📝 Step 3: Creating 8 test users to fill remaining squares...")
    square_number = 2
    
    for user_num in range(1, 9):
        time.sleep(0.5)
        token, user_id = create_test_user_and_session(user_num)
        join_square(token, game_id, square_number, f"Test User {user_num}")
        square_number += 1
    
    # Step 4: Verify game is active
    print("\n📝 Step 4: Verifying game activation...")
    time.sleep(1)
    
    game = get_game_details(real_user_token, game_id)
    
    if game:
        print("\n" + "=" * 60)
        print("🎲 YOUR GAME IS READY!")
        print("=" * 60)
        print(f"Game ID: {game['game_id']}")
        print(f"Game Name: {game['event_name']}")
        print(f"Status: {game['status']}")
        print(f"\n✅ YOU are the creator - you have full admin access!")
        print(f"\nYour Squares:")
        print(f"  Square 0: Number {game['random_numbers'][0]}")
        print(f"  Square 1: Number {game['random_numbers'][1]}")
        
        print(f"\n🎰 All Random Numbers:")
        for i, num in enumerate(game['random_numbers']):
            square_owner = game['squares'][i]['user_name'] if game['squares'][i] else "Empty"
            print(f"  Square {i} ({square_owner}): Number {num}")
        
        print("\n" + "=" * 60)
        print("📱 NOW YOU CAN TEST ADMIN FEATURES!")
        print("=" * 60)
        print("1. Open the app on your phone")
        print("2. Go to 'Squares' tab")
        print("3. Look for: 'YOUR Test Game - Admin Features'")
        print("4. You'll see: 'Your Game • Tap to enter scores'")
        print("5. Tap to open the game")
        print("6. Tap the settings icon (⚙️) or 'Manage Game' button")
        print("7. Enter scores and see automatic winner calculation!")
        print("\n" + "=" * 60)
    else:
        print("❌ Test failed: Could not retrieve game details")

if __name__ == "__main__":
    main()
