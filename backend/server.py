from fastapi import FastAPI, APIRouter, HTTPException, Header, Request, Response, Cookie
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import random


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ============= Models =============
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    mock_balance: float = 1000.0  # Starting mock balance
    created_at: datetime

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class Game(BaseModel):
    game_id: str
    creator_id: str
    event_name: str
    entry_fee: float
    status: str  # pending, active, completed
    squares: List[Optional[Dict[str, Any]]]  # List of 10 squares: {user_id, user_name, entry_id} or None
    random_numbers: List[Optional[int]]  # List of 10 numbers (0-9) assigned after all squares filled
    created_at: datetime
    quarter_scores: Dict[str, str] = {}  # {"Q1": "21-17", "Q2": "28-24", ...}
    winners: Dict[str, Optional[str]] = {}  # {"Q1": user_id, "Q2": user_id, ...}

class GameEntry(BaseModel):
    entry_id: str
    game_id: str
    user_id: str
    user_name: str
    square_number: int  # 0-9
    paid_amount: float
    created_at: datetime

class Payout(BaseModel):
    payout_id: str
    game_id: str
    user_id: str
    quarter: str
    amount: float
    paid: bool
    created_at: datetime


# ============= Request/Response Models =============
class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

class CreateGameRequest(BaseModel):
    event_name: str
    entry_fee: float

class JoinGameRequest(BaseModel):
    square_number: int

class UpdateScoreRequest(BaseModel):
    quarter: str  # Q1, Q2, Q3, Q4
    score: str  # e.g., "21-17"


# ============= Auth Helper Functions =============
async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[User]:
    """Get current user from Authorization header"""
    if not authorization:
        return None
    
    # Handle "Bearer token" format
    token = authorization
    if authorization.startswith("Bearer "):
        token = authorization[7:]
    
    # Find session
    session = await db.user_sessions.find_one(
        {"session_token": token},
        {"_id": 0}
    )
    
    if not session:
        return None
    
    # Check expiry (handle timezone-naive datetime from MongoDB)
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        return None
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    
    if user_doc:
        return User(**user_doc)
    return None


# ============= Auth Routes =============
@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="X-Session-ID header required")
    
    # Call Emergent Auth API
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_data = auth_response.json()
    
    # Check if user exists
    existing_user = await db.users.find_one(
        {"email": user_data["email"]},
        {"_id": 0}
    )
    
    if existing_user:
        user_id = existing_user["user_id"]
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "mock_balance": 1000.0,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(new_user)
    
    # Create session
    session_token = user_data["session_token"]
    session = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session)
    
    return SessionDataResponse(**user_data)

@api_router.get("/auth/me")
async def get_me(authorization: Optional[str] = Header(None)):
    """Get current user info"""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Logout user"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization
    if authorization.startswith("Bearer "):
        token = authorization[7:]
    
    await db.user_sessions.delete_one({"session_token": token})
    return {"message": "Logged out successfully"}


# ============= Game Routes =============
@api_router.get("/games")
async def get_games(authorization: Optional[str] = Header(None)):
    """Get all games"""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    games = await db.games.find(
        {},
        {"_id": 0, "game_id": 1, "creator_id": 1, "event_name": 1, "entry_fee": 1, "status": 1, "squares": 1, "random_numbers": 1, "created_at": 1, "quarter_scores": 1, "winners": 1}
    ).sort("created_at", -1).limit(100).to_list(100)
    
    # Add user's entries to each game
    for game in games:
        user_entries = await db.game_entries.find(
            {"game_id": game["game_id"], "user_id": user.user_id},
            {"_id": 0}
        ).to_list(10)
        game["user_entries"] = user_entries
    
    return games

@api_router.get("/games/{game_id}")
async def get_game(game_id: str, authorization: Optional[str] = Header(None)):
    """Get game details"""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    game = await db.games.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Get all entries for this game
    entries = await db.game_entries.find(
        {"game_id": game_id},
        {"_id": 0, "entry_id": 1, "user_id": 1, "user_name": 1, "square_number": 1, "paid_amount": 1, "created_at": 1}
    ).limit(100).to_list(100)
    game["entries"] = entries
    
    # Get payouts if game is active or completed
    if game["status"] in ["active", "completed"]:
        payouts = await db.payouts.find(
            {"game_id": game_id},
            {"_id": 0}
        ).to_list(100)
        game["payouts"] = payouts
    else:
        game["payouts"] = []
    
    return game

@api_router.post("/games")
async def create_game(game_request: CreateGameRequest, authorization: Optional[str] = Header(None)):
    """Create a new game"""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    game_id = f"game_{uuid.uuid4().hex[:12]}"
    game = {
        "game_id": game_id,
        "creator_id": user.user_id,
        "event_name": game_request.event_name,
        "entry_fee": game_request.entry_fee,
        "status": "pending",
        "squares": [None] * 10,  # 10 empty squares
        "random_numbers": [None] * 10,
        "created_at": datetime.now(timezone.utc),
        "quarter_scores": {},
        "winners": {}
    }
    
    await db.games.insert_one(game)
    # Remove MongoDB's _id field before returning
    game.pop('_id', None)
    return game

@api_router.post("/games/{game_id}/join")
async def join_game(game_id: str, join_request: JoinGameRequest, authorization: Optional[str] = Header(None)):
    """Join a game by selecting a square"""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get game
    game = await db.games.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["status"] != "pending":
        raise HTTPException(status_code=400, detail="Game is not accepting new players")
    
    square_num = join_request.square_number
    if square_num < 0 or square_num > 9:
        raise HTTPException(status_code=400, detail="Invalid square number")
    
    if game["squares"][square_num] is not None:
        raise HTTPException(status_code=400, detail="Square already taken")
    
    # Check if user already has 2 entries in this game
    user_entries_count = await db.game_entries.count_documents({
        "game_id": game_id,
        "user_id": user.user_id
    })
    
    if user_entries_count >= 2:
        raise HTTPException(status_code=400, detail="You can only have 2 entries per game")
    
    # Check user balance (only if entry fee > 0)
    if game["entry_fee"] > 0 and user.mock_balance < game["entry_fee"]:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Create entry
    entry_id = f"entry_{uuid.uuid4().hex[:12]}"
    entry = {
        "entry_id": entry_id,
        "game_id": game_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "square_number": square_num,
        "paid_amount": game["entry_fee"],
        "created_at": datetime.now(timezone.utc)
    }
    await db.game_entries.insert_one(entry)
    # Remove MongoDB's _id field before returning
    entry.pop('_id', None)
    
    # Update game squares
    game["squares"][square_num] = {
        "user_id": user.user_id,
        "user_name": user.name,
        "entry_id": entry_id
    }
    
    # Deduct from user balance (only if entry fee > 0)
    if game["entry_fee"] > 0:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$inc": {"mock_balance": -game["entry_fee"]}}
        )
    
    # Check if all squares are filled
    if all(square is not None for square in game["squares"]):
        # Generate random numbers (0-9, no duplicates)
        numbers = list(range(10))
        random.shuffle(numbers)
        game["random_numbers"] = numbers
        game["status"] = "active"
    
    # Update game
    await db.games.update_one(
        {"game_id": game_id},
        {"$set": {
            "squares": game["squares"],
            "random_numbers": game["random_numbers"],
            "status": game["status"]
        }}
    )
    
    return {"message": "Successfully joined game", "entry": entry, "game_status": game["status"]}

@api_router.post("/games/{game_id}/score")
async def update_score(game_id: str, score_request: UpdateScoreRequest, authorization: Optional[str] = Header(None)):
    """Update score for a quarter (only game creator can do this)"""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get game
    game = await db.games.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["creator_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only game creator can update scores")
    
    if game["status"] != "active":
        raise HTTPException(status_code=400, detail="Game is not active")
    
    quarter = score_request.quarter
    score = score_request.score
    
    if quarter not in ["Q1", "Q2", "Q3", "Q4"]:
        raise HTTPException(status_code=400, detail="Invalid quarter")
    
    # Parse score (e.g., "21-17")
    try:
        team1, team2 = score.split("-")
        team1_score = int(team1)
        team2_score = int(team2)
    except:
        raise HTTPException(status_code=400, detail="Invalid score format (use XX-XX)")
    
    # Calculate winning number
    team1_last_digit = team1_score % 10
    team2_last_digit = team2_score % 10
    winning_number = (team1_last_digit + team2_last_digit) % 10
    
    # Find winner (which square has this number)
    winner_user_id = None
    for i, num in enumerate(game["random_numbers"]):
        if num == winning_number and game["squares"][i] is not None:
            winner_user_id = game["squares"][i]["user_id"]
            break
    
    # Update game with score and winner
    game["quarter_scores"][quarter] = score
    game["winners"][quarter] = winner_user_id
    
    # Calculate and create payout
    total_pot = game["entry_fee"] * 10
    payout_percentages = {"Q1": 0.20, "Q2": 0.20, "Q3": 0.20, "Q4": 0.40}
    payout_amount = total_pot * payout_percentages[quarter]
    
    if winner_user_id:
        payout_id = f"payout_{uuid.uuid4().hex[:12]}"
        payout = {
            "payout_id": payout_id,
            "game_id": game_id,
            "user_id": winner_user_id,
            "quarter": quarter,
            "amount": payout_amount,
            "paid": True,
            "created_at": datetime.now(timezone.utc)
        }
        await db.payouts.insert_one(payout)
        
        # Credit winner's balance
        await db.users.update_one(
            {"user_id": winner_user_id},
            {"$inc": {"mock_balance": payout_amount}}
        )
    
    # If Q4 is done, mark game as completed
    if quarter == "Q4":
        game["status"] = "completed"
    
    await db.games.update_one(
        {"game_id": game_id},
        {"$set": {
            "quarter_scores": game["quarter_scores"],
            "winners": game["winners"],
            "status": game["status"]
        }}
    )
    
    return {
        "message": "Score updated",
        "winning_number": winning_number,
        "winner_user_id": winner_user_id,
        "payout_amount": payout_amount
    }

@api_router.post("/games/{game_id}/leave")
async def leave_square(game_id: str, authorization: Optional[str] = Header(None)):
    """Leave/undo a square selection (only if game is still pending)"""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get game
    game = await db.games.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["status"] != "pending":
        raise HTTPException(status_code=400, detail="Cannot leave square after game has started")
    
    # Find user's entries in this game
    entries = await db.game_entries.find(
        {"game_id": game_id, "user_id": user.user_id},
        {"_id": 0}
    ).to_list(10)
    
    if not entries:
        raise HTTPException(status_code=400, detail="You have no entries in this game")
    
    # Remove all user's entries
    for entry in entries:
        square_num = entry["square_number"]
        game["squares"][square_num] = None
        
        # Refund user (only if entry fee > 0)
        if entry["paid_amount"] > 0:
            await db.users.update_one(
                {"user_id": user.user_id},
                {"$inc": {"mock_balance": entry["paid_amount"]}}
            )
    
    # Delete entries
    await db.game_entries.delete_many({"game_id": game_id, "user_id": user.user_id})
    
    # Update game
    await db.games.update_one(
        {"game_id": game_id},
        {"$set": {"squares": game["squares"]}}
    )
    
    return {"message": f"Successfully left {len(entries)} square(s)", "refunded": sum(e["paid_amount"] for e in entries)}

@api_router.delete("/games/{game_id}")
async def delete_game(game_id: str, authorization: Optional[str] = Header(None)):
    """Delete a game (only creator can do this, and only if game is pending)"""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get game
    game = await db.games.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["creator_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only game creator can delete the game")
    
    if game["status"] != "pending":
        raise HTTPException(status_code=400, detail="Cannot delete game after it has started")
    
    # Refund all players
    entries = await db.game_entries.find({"game_id": game_id}, {"_id": 0}).to_list(100)
    for entry in entries:
        if entry["paid_amount"] > 0:
            await db.users.update_one(
                {"user_id": entry["user_id"]},
                {"$inc": {"mock_balance": entry["paid_amount"]}}
            )
    
    # Delete all entries
    await db.game_entries.delete_many({"game_id": game_id})
    
    # Delete game
    await db.games.delete_one({"game_id": game_id})
    
    return {"message": "Game deleted successfully", "refunded_entries": len(entries)}

@api_router.get("/profile")
async def get_profile(authorization: Optional[str] = Header(None)):
    """Get user profile with game history"""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get user's game entries
    entries = await db.game_entries.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    # Get user's payouts
    payouts = await db.payouts.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    # Get games created by user
    created_games = await db.games.find(
        {"creator_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "user": user,
        "entries": entries,
        "payouts": payouts,
        "created_games": created_games,
        "total_winnings": sum(p["amount"] for p in payouts)
    }


# ============= Include Router =============
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
