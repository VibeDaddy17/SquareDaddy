#!/usr/bin/env python3
"""
Quick test for game joining functionality
"""

import requests
import json
import time
import subprocess

BASE_URL = "https://luckyvibe.preview.emergentagent.com/api"
MONGO_DB = "test_database"

def create_test_user():
    """Create a test user and session in MongoDB"""
    timestamp = int(time.time() * 1000)
    user_id = f"user_{timestamp}"
    session_token = f"test_session_{timestamp}"
    email = f"test.user.{timestamp}@example.com"
    
    mongo_commands = f'''
use('{MONGO_DB}');
db.users.insertOne({{
  user_id: "{user_id}",
  email: "{email}",
  name: "Test User",
  picture: "https://via.placeholder.com/150",
  mock_balance: 1000.0,
  created_at: new Date()
}});
db.user_sessions.insertOne({{
  user_id: "{user_id}",
  session_token: "{session_token}",
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
}});
'''
    
    try:
        result = subprocess.run(
            ["mongosh", "--eval", mongo_commands],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print(f"✅ Created user: {user_id}")
            return user_id, session_token
        else:
            print(f"❌ MongoDB error: {result.stderr}")
            return None, None
            
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        return None, None

def test_game_flow():
    """Test the complete game flow"""
    
    # Create test user
    user_id, session_token = create_test_user()
    if not session_token:
        print("❌ Failed to create test user")
        return
    
    headers = {
        "Authorization": f"Bearer {session_token}",
        "Content-Type": "application/json"
    }
    
    # Create game
    print("🧪 Creating game...")
    game_data = {"event_name": "Test Super Bowl", "entry_fee": 20.0}
    
    try:
        response = requests.post(f"{BASE_URL}/games", headers=headers, json=game_data, timeout=10)
        print(f"Create game response: {response.status_code}")
        
        if response.status_code == 200:
            game = response.json()
            game_id = game["game_id"]
            print(f"✅ Created game: {game_id}")
        else:
            print(f"❌ Failed to create game: {response.text}")
            return
            
    except Exception as e:
        print(f"❌ Error creating game: {e}")
        return
    
    # Join game
    print("🧪 Joining game...")
    join_data = {"square_number": 0}
    
    try:
        response = requests.post(f"{BASE_URL}/games/{game_id}/join", headers=headers, json=join_data, timeout=10)
        print(f"Join game response: {response.status_code}")
        
        if response.status_code == 200:
            join_result = response.json()
            print(f"✅ Joined game successfully: {join_result}")
        else:
            print(f"❌ Failed to join game: {response.text}")
            
    except Exception as e:
        print(f"❌ Error joining game: {e}")
    
    # Cleanup
    print("🧹 Cleaning up...")
    mongo_commands = f'''
use('{MONGO_DB}');
db.users.deleteMany({{email: /test\\.user\\./}});
db.user_sessions.deleteMany({{session_token: /test_session/}});
db.games.deleteMany({{event_name: "Test Super Bowl"}});
db.game_entries.deleteMany({{user_id: /user_/}});
'''
    
    try:
        subprocess.run(["mongosh", "--eval", mongo_commands], capture_output=True, text=True, timeout=30)
        print("✅ Cleanup completed")
    except Exception as e:
        print(f"⚠️  Cleanup error: {e}")

if __name__ == "__main__":
    test_game_flow()