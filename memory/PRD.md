# Sports Squares Betting Game - Product Requirements Document

## Overview
A mobile-first web application for creating and managing sports betting squares games, similar to Super Bowl squares. Users can create games, join by selecting squares, and winners are determined based on quarter scores.

## Core Features

### 1. User Authentication
- Google Social Login via Emergent Auth
- Persistent sessions (7 days)
- User profiles with mock balance tracking

### 2. Game Creation
- Any user can create a game
- Configure event name (e.g., "Super Bowl LIX")
- Set entry fee (configurable per game)
- Creator becomes game admin

### 3. Square Selection
- 10 squares per game (0-9)
- Users can select up to 2 squares per game
- Entry fee deducted from user's mock balance
- Visual grid showing available/taken squares

### 4. Random Number Assignment
- Automatic when all 10 squares are filled
- Each square gets a unique random number (0-9)
- Game status changes from "pending" to "active"

### 5. Score Management
- Game creator manually enters scores after each quarter
- Format: XX-XX (e.g., "21-17")
- System calculates winning number: sum of last digits mod 10
- Winner determined by matching square number

### 6. Payout Structure
- Quarter 1: 20% of total pot
- Quarter 2: 20% of total pot
- Quarter 3: 20% of total pot
- Quarter 4: 40% of total pot (final score)
- Payouts automatically credited to winner's balance

### 7. Game States
- **Pending**: Accepting new players, squares can be selected
- **Active**: All squares filled, scores can be entered
- **Completed**: All 4 quarters scored, game finished

### 8. User Features
- View all games (available, active, completed)
- Profile page with balance, stats, and payout history
- Game history (entries, winnings, created games)
- Mock balance system for testing ($1000 starting balance)

## Technical Stack
- **Frontend**: Expo (React Native) - Mobile-first web app
- **Backend**: FastAPI + MongoDB
- **Authentication**: Emergent Google OAuth
- **Payments**: Mock system (real payments future enhancement)

## User Flows

### Create Game Flow
1. User navigates to "Create" tab
2. Enters event name and entry fee
3. Game created in "pending" state
4. User can share game with others

### Join Game Flow
1. User views available games on "Home" tab
2. Selects a game to view details
3. Taps empty square to join
4. Confirms entry fee deduction
5. Square assigned to user

### Admin/Score Entry Flow
1. Game creator waits for all squares to fill
2. Game auto-activates with random numbers
3. Creator accesses admin panel
4. Enters score after each quarter
5. System calculates winner and distributes payout
6. Process repeats for all 4 quarters

## Future Enhancements
- Real payment integration (Stripe/PayPal)
- Live sports scores API integration (The Odds API recommended)
- Push notifications for score updates
- Social sharing features
- Multiple game types (different square counts)
- Tournament mode

## Success Metrics
- User can create and join games seamlessly
- Random number generation is fair and transparent
- Payout calculations are accurate
- Mobile experience is smooth and intuitive
