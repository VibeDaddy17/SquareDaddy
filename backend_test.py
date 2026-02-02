#!/usr/bin/env python3
"""
Sports Squares Backend API Test Suite
Tests all backend endpoints for the Sports Squares betting game
"""

import requests
import json
import time
import random
from datetime import datetime, timezone, timedelta

# Configuration
BASE_URL = "https://luckyvibe.preview.emergentagent.com/api"
MONGO_DB = "test_database"

class BackendTester:
    def __init__(self):
        self.session_token = None
        self.user_id = None
        self.game_id = None
        self.second_user_token = None
        self.second_user_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details or {}
        }
        self.test_results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details:
            print(f"   Details: {details}")
        print()
    
    def create_test_user(self, user_suffix=""):
        """Create a test user and session in MongoDB"""
        print(f"🔧 Creating test user{user_suffix}...")
        
        timestamp = int(time.time() * 1000)
        user_id = f"user_{timestamp}{user_suffix}"
        session_token = f"test_session_{timestamp}{user_suffix}"
        email = f"test.user.{timestamp}{user_suffix}@example.com"
        
        # MongoDB commands to create user and session
        mongo_commands = f'''
use('{MONGO_DB}');
db.users.insertOne({{
  user_id: "{user_id}",
  email: "{email}",
  name: "Test User{user_suffix}",
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
        
        # Execute MongoDB commands
        import subprocess
        try:
            result = subprocess.run(
                ["mongosh", "--eval", mongo_commands],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                print(f"✅ Created user: {user_id}")
                print(f"✅ Session token: {session_token}")
                return user_id, session_token
            else:
                print(f"❌ MongoDB error: {result.stderr}")
                return None, None
                
        except Exception as e:
            print(f"❌ Error creating test user: {e}")
            return None, None
    
    def test_auth_me(self):
        """Test GET /api/auth/me endpoint"""
        print("🧪 Testing GET /api/auth/me...")
        
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "user_id" in data and data["user_id"] == self.user_id:
                    self.log_result("GET /api/auth/me", True, "Successfully retrieved user info", data)
                else:
                    self.log_result("GET /api/auth/me", False, "Invalid user data returned", data)
            else:
                self.log_result("GET /api/auth/me", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("GET /api/auth/me", False, f"Request failed: {e}")
    
    def test_auth_logout(self):
        """Test POST /api/auth/logout endpoint"""
        print("🧪 Testing POST /api/auth/logout...")
        
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        try:
            response = requests.post(f"{BASE_URL}/auth/logout", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_result("POST /api/auth/logout", True, "Successfully logged out", data)
                else:
                    self.log_result("POST /api/auth/logout", False, "Invalid logout response", data)
            else:
                self.log_result("POST /api/auth/logout", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("POST /api/auth/logout", False, f"Request failed: {e}")
    
    def test_create_game(self):
        """Test POST /api/games - Create a game"""
        print("🧪 Testing POST /api/games (Create Game)...")
        
        headers = {
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        }
        
        game_data = {
            "event_name": "Test Super Bowl",
            "entry_fee": 20.0
        }
        
        try:
            response = requests.post(f"{BASE_URL}/games", headers=headers, json=game_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "game_id" in data and data["event_name"] == "Test Super Bowl":
                    self.game_id = data["game_id"]
                    self.log_result("POST /api/games", True, "Successfully created game", {
                        "game_id": self.game_id,
                        "event_name": data["event_name"],
                        "entry_fee": data["entry_fee"],
                        "status": data["status"]
                    })
                else:
                    self.log_result("POST /api/games", False, "Invalid game data returned", data)
            else:
                self.log_result("POST /api/games", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("POST /api/games", False, f"Request failed: {e}")
    
    def test_get_games(self):
        """Test GET /api/games - Get all games"""
        print("🧪 Testing GET /api/games...")
        
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/games", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Check if our created game is in the list
                    game_found = any(game.get("game_id") == self.game_id for game in data)
                    if game_found:
                        self.log_result("GET /api/games", True, f"Successfully retrieved {len(data)} games", {
                            "total_games": len(data),
                            "created_game_found": True
                        })
                    else:
                        self.log_result("GET /api/games", False, "Created game not found in list", {
                            "total_games": len(data),
                            "looking_for": self.game_id
                        })
                else:
                    self.log_result("GET /api/games", False, "Invalid response format", data)
            else:
                self.log_result("GET /api/games", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("GET /api/games", False, f"Request failed: {e}")
    
    def test_join_game_scenarios(self):
        """Test POST /api/games/{game_id}/join with various scenarios"""
        print("🧪 Testing game joining scenarios...")
        
        if not self.game_id:
            self.log_result("Game Join Tests", False, "No game_id available for testing")
            return
        
        headers = {
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        }
        
        # Test 1: Join first square (should succeed)
        print("   Testing first square join...")
        join_data = {"square_number": 0}
        
        try:
            response = requests.post(f"{BASE_URL}/games/{self.game_id}/join", headers=headers, json=join_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_result("Join Game - First Square", True, "Successfully joined first square", {
                    "square_number": 0,
                    "game_status": data.get("game_status", "unknown")
                })
            else:
                self.log_result("Join Game - First Square", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Join Game - First Square", False, f"Request failed: {e}")
        
        # Test 2: Join second square (should succeed)
        print("   Testing second square join...")
        join_data = {"square_number": 1}
        
        try:
            response = requests.post(f"{BASE_URL}/games/{self.game_id}/join", headers=headers, json=join_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_result("Join Game - Second Square", True, "Successfully joined second square", {
                    "square_number": 1,
                    "game_status": data.get("game_status", "unknown")
                })
            else:
                self.log_result("Join Game - Second Square", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Join Game - Second Square", False, f"Request failed: {e}")
        
        # Test 3: Try to join third square (should fail - 2 entry limit)
        print("   Testing third square join (should fail)...")
        join_data = {"square_number": 2}
        
        try:
            response = requests.post(f"{BASE_URL}/games/{self.game_id}/join", headers=headers, json=join_data, timeout=10)
            
            if response.status_code == 400:
                error_data = response.json()
                if "2 entries per game" in error_data.get("detail", ""):
                    self.log_result("Join Game - Third Square (Limit Test)", True, "Correctly rejected third entry", {
                        "expected_error": "2 entries per game limit",
                        "actual_error": error_data.get("detail")
                    })
                else:
                    self.log_result("Join Game - Third Square (Limit Test)", False, "Wrong error message", error_data)
            else:
                self.log_result("Join Game - Third Square (Limit Test)", False, f"Expected 400, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Join Game - Third Square (Limit Test)", False, f"Request failed: {e}")
    
    def test_fill_remaining_squares(self):
        """Create multiple users and fill remaining squares to activate game"""
        print("🧪 Testing game activation by filling all squares...")
        
        if not self.game_id:
            self.log_result("Fill Remaining Squares", False, "No game_id available for testing")
            return
        
        # We already have 2 squares filled by the first user (squares 0 and 1)
        # Need to fill squares 2-9 (8 more squares)
        # Since each user can only have 2 entries, we need 4 more users
        
        users_created = []
        success_count = 0
        
        for user_num in range(2, 6):  # Create users 2, 3, 4, 5
            user_id, user_token = self.create_test_user(f"_{user_num}")
            
            if not user_token:
                print(f"   ❌ Failed to create user {user_num}")
                continue
                
            users_created.append((user_id, user_token))
            
            headers = {
                "Authorization": f"Bearer {user_token}",
                "Content-Type": "application/json"
            }
            
            # Each user fills 2 squares
            for square_offset in range(2):
                square_num = (user_num - 2) * 2 + 2 + square_offset  # Calculate square number
                if square_num >= 10:  # Don't exceed 10 squares
                    break
                    
                join_data = {"square_number": square_num}
                
                try:
                    response = requests.post(f"{BASE_URL}/games/{self.game_id}/join", headers=headers, json=join_data, timeout=10)
                    
                    if response.status_code == 200:
                        success_count += 1
                        data = response.json()
                        print(f"   ✅ User {user_num} filled square {square_num}, game status: {data.get('game_status', 'unknown')}")
                        
                        # Check if game became active
                        if data.get('game_status') == 'active':
                            print(f"   🎉 Game activated after filling square {square_num}!")
                            break
                    else:
                        print(f"   ❌ User {user_num} failed to fill square {square_num}: {response.status_code} - {response.text}")
                        
                except Exception as e:
                    print(f"   ❌ Error filling square {square_num}: {e}")
            
            # If game is active, break out of user creation loop
            if success_count > 0:
                try:
                    # Check game status
                    check_headers = {"Authorization": f"Bearer {self.session_token}"}
                    game_response = requests.get(f"{BASE_URL}/games/{self.game_id}", headers=check_headers, timeout=10)
                    if game_response.status_code == 200:
                        game_data = game_response.json()
                        if game_data.get("status") == "active":
                            print(f"   🎉 Game is now active with {success_count + 2} total squares filled!")
                            break
                except:
                    pass
        
        # Store second user info for later tests
        if users_created:
            self.second_user_id, self.second_user_token = users_created[0]
        
        total_squares_needed = 8  # We need to fill 8 more squares (2-9)
        if success_count >= total_squares_needed:
            self.log_result("Fill Remaining Squares", True, f"Successfully filled {success_count} squares", {
                "squares_filled": success_count,
                "total_squares_needed": total_squares_needed,
                "users_created": len(users_created)
            })
        else:
            self.log_result("Fill Remaining Squares", False, f"Only filled {success_count}/{total_squares_needed} squares", {
                "squares_filled": success_count,
                "total_squares_needed": total_squares_needed,
                "users_created": len(users_created)
            })
    
    def test_get_game_details(self):
        """Test GET /api/games/{game_id} - Get detailed game info"""
        print("🧪 Testing GET /api/games/{game_id}...")
        
        if not self.game_id:
            self.log_result("Get Game Details", False, "No game_id available for testing")
            return
        
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/games/{self.game_id}", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check key fields
                checks = {
                    "has_game_id": "game_id" in data,
                    "has_squares": "squares" in data,
                    "has_random_numbers": "random_numbers" in data,
                    "has_entries": "entries" in data,
                    "status_active": data.get("status") == "active",
                    "all_squares_filled": all(square is not None for square in data.get("squares", [])),
                    "random_numbers_assigned": all(num is not None for num in data.get("random_numbers", []))
                }
                
                all_passed = all(checks.values())
                
                self.log_result("Get Game Details", all_passed, "Retrieved game details", {
                    "game_id": data.get("game_id"),
                    "status": data.get("status"),
                    "squares_filled": sum(1 for s in data.get("squares", []) if s is not None),
                    "random_numbers_count": sum(1 for n in data.get("random_numbers", []) if n is not None),
                    "entries_count": len(data.get("entries", [])),
                    "checks": checks
                })
            else:
                self.log_result("Get Game Details", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Get Game Details", False, f"Request failed: {e}")
    
    def test_update_scores(self):
        """Test POST /api/games/{game_id}/score - Update quarter scores"""
        print("🧪 Testing score updates...")
        
        if not self.game_id:
            self.log_result("Update Scores", False, "No game_id available for testing")
            return
        
        headers = {
            "Authorization": f"Bearer {self.session_token}",  # Use original user (game creator)
            "Content-Type": "application/json"
        }
        
        quarters = [
            {"quarter": "Q1", "score": "21-17"},
            {"quarter": "Q2", "score": "28-24"},
            {"quarter": "Q3", "score": "35-31"},
            {"quarter": "Q4", "score": "42-38"}
        ]
        
        for q_data in quarters:
            print(f"   Testing {q_data['quarter']} score update...")
            
            try:
                response = requests.post(f"{BASE_URL}/games/{self.game_id}/score", headers=headers, json=q_data, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Calculate expected winning number
                    team1, team2 = q_data["score"].split("-")
                    expected_winning_number = (int(team1) % 10 + int(team2) % 10) % 10
                    
                    checks = {
                        "has_winning_number": "winning_number" in data,
                        "correct_winning_number": data.get("winning_number") == expected_winning_number,
                        "has_winner": "winner_user_id" in data,
                        "has_payout": "payout_amount" in data
                    }
                    
                    all_passed = all(checks.values())
                    
                    self.log_result(f"Update Score - {q_data['quarter']}", all_passed, f"Score updated for {q_data['quarter']}", {
                        "quarter": q_data["quarter"],
                        "score": q_data["score"],
                        "winning_number": data.get("winning_number"),
                        "expected_winning_number": expected_winning_number,
                        "winner_user_id": data.get("winner_user_id"),
                        "payout_amount": data.get("payout_amount"),
                        "checks": checks
                    })
                else:
                    self.log_result(f"Update Score - {q_data['quarter']}", False, f"HTTP {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_result(f"Update Score - {q_data['quarter']}", False, f"Request failed: {e}")
    
    def test_unauthorized_score_update(self):
        """Test that non-creators cannot update scores"""
        print("🧪 Testing unauthorized score update...")
        
        if not self.game_id or not self.second_user_token:
            self.log_result("Unauthorized Score Update", False, "Missing game_id or second user token")
            return
        
        headers = {
            "Authorization": f"Bearer {self.second_user_token}",  # Use second user (not creator)
            "Content-Type": "application/json"
        }
        
        score_data = {"quarter": "Q1", "score": "14-7"}
        
        try:
            response = requests.post(f"{BASE_URL}/games/{self.game_id}/score", headers=headers, json=score_data, timeout=10)
            
            if response.status_code == 403:
                error_data = response.json()
                if "Only game creator" in error_data.get("detail", ""):
                    self.log_result("Unauthorized Score Update", True, "Correctly rejected non-creator score update", {
                        "expected_error": "Only game creator can update scores",
                        "actual_error": error_data.get("detail")
                    })
                else:
                    self.log_result("Unauthorized Score Update", False, "Wrong error message", error_data)
            else:
                self.log_result("Unauthorized Score Update", False, f"Expected 403, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Unauthorized Score Update", False, f"Request failed: {e}")
    
    def test_profile(self):
        """Test GET /api/profile - Get user profile"""
        print("🧪 Testing GET /api/profile...")
        
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        try:
            response = requests.get(f"{BASE_URL}/profile", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                checks = {
                    "has_user": "user" in data,
                    "has_entries": "entries" in data,
                    "has_payouts": "payouts" in data,
                    "has_created_games": "created_games" in data,
                    "has_total_winnings": "total_winnings" in data,
                    "user_id_matches": data.get("user", {}).get("user_id") == self.user_id
                }
                
                all_passed = all(checks.values())
                
                self.log_result("GET /api/profile", all_passed, "Retrieved user profile", {
                    "user_id": data.get("user", {}).get("user_id"),
                    "entries_count": len(data.get("entries", [])),
                    "payouts_count": len(data.get("payouts", [])),
                    "created_games_count": len(data.get("created_games", [])),
                    "total_winnings": data.get("total_winnings", 0),
                    "checks": checks
                })
            else:
                self.log_result("GET /api/profile", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("GET /api/profile", False, f"Request failed: {e}")
    
    def cleanup_test_data(self):
        """Clean up test data from MongoDB"""
        print("🧹 Cleaning up test data...")
        
        mongo_commands = f'''
use('{MONGO_DB}');
db.users.deleteMany({{email: /test\\.user\\./}});
db.user_sessions.deleteMany({{session_token: /test_session/}});
db.games.deleteMany({{event_name: "Test Super Bowl"}});
db.game_entries.deleteMany({{user_id: /user_/}});
db.payouts.deleteMany({{user_id: /user_/}});
'''
        
        try:
            import subprocess
            result = subprocess.run(
                ["mongosh", "--eval", mongo_commands],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                print("✅ Test data cleaned up successfully")
            else:
                print(f"⚠️  Cleanup warning: {result.stderr}")
                
        except Exception as e:
            print(f"⚠️  Cleanup error: {e}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Sports Squares Backend API Tests")
        print("=" * 60)
        
        # Setup
        self.user_id, self.session_token = self.create_test_user()
        
        if not self.session_token:
            print("❌ Failed to create test user. Cannot proceed with tests.")
            return
        
        # Run tests in order
        self.test_auth_me()
        self.test_create_game()
        self.test_get_games()
        self.test_join_game_scenarios()
        self.test_fill_remaining_squares()
        self.test_get_game_details()
        self.test_unauthorized_score_update()
        self.test_update_scores()
        self.test_profile()
        self.test_auth_logout()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if "✅ PASS" in result["status"])
        failed = sum(1 for result in self.test_results if "❌ FAIL" in result["status"])
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        # Cleanup
        self.cleanup_test_data()
        
        return passed, failed

if __name__ == "__main__":
    tester = BackendTester()
    passed, failed = tester.run_all_tests()
    
    # Exit with error code if tests failed
    exit(0 if failed == 0 else 1)