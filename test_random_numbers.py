#!/usr/bin/env python3
"""
Test script to create dummy users and fill a game to test random number generation.
This script will:
1. Create a test game
2. Create the first user and have them join 2 squares
3. Create 8 more dummy users
4. Have each dummy user join 1 square
5. Verify that random numbers are generated when all 10 squares are filled
"""

import requests
import time
from datetime import datetime, timezone, timedelta
import uuid

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
    
    print(f"✅ Created User {user_number}: {user['name']} (ID: {user_id})")
    return session_token, user_id

def create_game(session_token):
    """Create a test game"""
    response = requests.post(
        f"{BACKEND_URL}/games",
        headers={"Authorization": f"Bearer {session_token}"},
        json={
            "event_name": "Test Super Bowl - Random Number Generation Test",
            "entry_fee": 10.0
        }
    )
    
    if response.status_code == 200:
        game = response.json()
        print(f"✅ Created Game: {game['event_name']} (ID: {game['game_id']})")
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
    print("🎮 Starting Random Number Generation Test")
    print("=" * 60)
    
    # Step 1: Create first user
    print("\n📝 Step 1: Creating first user...")
    user1_token, user1_id = create_test_user_and_session(1)
    
    # Step 2: Create game
    print("\n📝 Step 2: Creating game...")
    game_id = create_game(user1_token)
    if not game_id:
        print("❌ Test failed: Could not create game")
        return
    
    # Step 3: First user joins 2 squares
    print("\n📝 Step 3: First user joining 2 squares...")
    join_square(user1_token, game_id, 0, "Test User 1")
    time.sleep(0.5)
    join_square(user1_token, game_id, 1, "Test User 1")
    
    # Step 4: Create 8 more users and have them join
    print("\n📝 Step 4: Creating 8 more users and filling remaining squares...")
    square_number = 2
    
    for user_num in range(2, 10):
        time.sleep(0.5)
        token, user_id = create_test_user_and_session(user_num)
        join_square(token, game_id, square_number, f"Test User {user_num}")
        square_number += 1
    
    # Step 5: Check game status and random numbers
    print("\n📝 Step 5: Verifying random number generation...")
    time.sleep(1)
    
    game = get_game_details(user1_token, game_id)
    
    if game:
        print("\n" + "=" * 60)
        print("🎲 GAME STATUS AFTER ALL SQUARES FILLED")
        print("=" * 60)
        print(f"Game ID: {game['game_id']}")
        print(f"Status: {game['status']}")
        print(f"\nSquares Filled:")
        for i, square in enumerate(game['squares']):
            if square:
                print(f"  Square {i}: {square['user_name']}")
        
        print(f"\n🎰 Random Numbers Generated:")
        if all(num is not None for num in game['random_numbers']):
            for i, num in enumerate(game['random_numbers']):
                square_owner = game['squares'][i]['user_name'] if game['squares'][i] else "Empty"
                print(f"  Square {i} ({square_owner}): Number {num}")
            
            # Check for uniqueness
            unique_numbers = set(game['random_numbers'])
            if len(unique_numbers) == 10:
                print("\n✅ SUCCESS! All random numbers are unique (0-9)")
            else:
                print(f"\n❌ ERROR! Duplicate numbers found. Unique count: {len(unique_numbers)}")
            
            # Check game status
            if game['status'] == 'active':
                print("✅ SUCCESS! Game status changed to 'active'")
            else:
                print(f"❌ ERROR! Game status is '{game['status']}', expected 'active'")
        else:
            print("❌ ERROR! Random numbers were not generated")
            print(f"   Random numbers: {game['random_numbers']}")
    else:
        print("❌ Test failed: Could not retrieve game details")
    
    print("\n" + "=" * 60)
    print("🏁 Test Complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()
