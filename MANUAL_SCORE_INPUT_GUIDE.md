# Manual Score Input Feature - Complete Guide

## Overview
The Manual Score Input feature allows game creators to enter scores after each quarter and automatically calculates winners and distributes payouts.

---

## ✅ Feature Status: FULLY IMPLEMENTED

### What's Included:
1. ✅ Manual score input form (Q1, Q2, Q3, Q4)
2. ✅ Automatic winner identification
3. ✅ Automatic payout calculation (20/20/20/40%)
4. ✅ Automatic balance crediting
5. ✅ Score format validation (XX-XX)
6. ✅ Visual indicators showing completed quarters
7. ✅ Access control (creators only, active games only)

---

## How to Access Manual Score Input

### Method 1: From Game List (Squares Tab)
1. Go to "Squares" tab
2. Find your game (marked with gold star "Your Game")
3. If game is **ACTIVE**, you'll see: "• Tap to enter scores"
4. Tap the game card
5. Scroll to bottom and tap "Manage Game" button (blue)

### Method 2: From Game Detail Screen
**Option A - Header Button:**
1. Open your active game
2. Look at top-right of screen
3. Tap the **settings icon** (⚙️)

**Option B - Bottom Button:**
1. Open your active game
2. Scroll to bottom
3. Tap the blue "Manage Game" button

### Method 3: Direct URL
- Navigate to: `/game/admin/{game_id}`

---

## Important Prerequisites

### Game Must Be ACTIVE
❌ **Pending games:** Score entry NOT available (game not full)
✅ **Active games:** Score entry available (all 10 squares filled)
❌ **Completed games:** Score entry locked (all quarters done)

**To activate a game:**
- All 10 squares must be filled
- System automatically generates random numbers
- Game status changes from "pending" to "active"
- Score entry becomes available

---

## Using the Score Management Screen

### Screen Layout

```
┌─────────────────────────────────────┐
│  ← Manage Game                      │
├─────────────────────────────────────┤
│  Test Super Bowl                    │
│  Update scores after each quarter   │
├─────────────────────────────────────┤
│  Q1                          [Done] │
│  Enter Score (Format: XX-XX)        │
│  ┌───────────────────────────────┐  │
│  │ e.g., 21-17                   │  │
│  └───────────────────────────────┘  │
│  [Update Score]                     │
├─────────────────────────────────────┤
│  Q2                                 │
│  ... (same as Q1)                   │
├─────────────────────────────────────┤
│  Q3                                 │
│  ... (same as Q1)                   │
├─────────────────────────────────────┤
│  Q4                                 │
│  ... (same as Q1)                   │
├─────────────────────────────────────┤
│  Payout Structure:                  │
│  • Q1: 20% - $40.00                 │
│  • Q2: 20% - $40.00                 │
│  • Q3: 20% - $40.00                 │
│  • Q4: 40% - $80.00                 │
├─────────────────────────────────────┤
│  [Back to Game]                     │
└─────────────────────────────────────┘
```

---

## Step-by-Step: Entering Scores

### Quarter 1 Example

**1. Enter Score:**
- Input field shows: "e.g., 21-17"
- Enter actual score: `14-7`
- Format: `{Team1Score}-{Team2Score}`

**2. Tap "Update Score":**
- Confirmation dialog appears
- Shows: "Update Q1 score to 14-7?"
- Tap "Update"

**3. Automatic Processing:**
```
System Calculates:
├─ Last digit of 14 = 4
├─ Last digit of 7 = 7
├─ Sum = 4 + 7 = 11
└─ Winning number = 11 % 10 = 1

System Finds Winner:
├─ Checks which square has number 1
├─ Square 3 has number 1
├─ Square 3 belongs to "John Doe"
└─ John Doe wins Q1!

System Creates Payout:
├─ Total pot: $200 (10 squares × $20)
├─ Q1 payout: 20% = $40
├─ Credits $40 to John Doe's balance
└─ Records payout in database
```

**4. Success Message:**
- Shows: "Score updated! Winner: Found, Payout: $40.00"
- Screen refreshes
- Q1 section now shows green checkmark
- Displays winner name and payout

**5. Repeat for Q2, Q3, Q4:**
- Same process for each quarter
- Different payout percentages automatically applied

---

## Score Format Rules

### ✅ Valid Formats:
- `14-7`
- `21-17`
- `3-0`
- `35-28`
- `0-0` (tie)

### ❌ Invalid Formats:
- `14:7` (wrong separator)
- `14` (missing second score)
- `fourteen-seven` (not numbers)
- `14 - 7` (spaces not allowed)
- `-7` (missing first score)

### Validation:
- Must match pattern: `\d+-\d+`
- Must be two numbers separated by hyphen
- No spaces allowed

---

## Winner Calculation Logic

### Example 1: Score 21-17
```
Step 1: Extract last digits
  21 → last digit = 1
  17 → last digit = 7

Step 2: Add them together
  1 + 7 = 8

Step 3: Take modulo 10
  8 % 10 = 8

Result: Winning number is 8
Winner: Player who has square with number 8
```

### Example 2: Score 30-24
```
Step 1: Extract last digits
  30 → last digit = 0
  24 → last digit = 4

Step 2: Add them together
  0 + 4 = 4

Step 3: Take modulo 10
  4 % 10 = 4

Result: Winning number is 4
Winner: Player who has square with number 4
```

### Example 3: Score 27-23
```
Step 1: Extract last digits
  27 → last digit = 7
  23 → last digit = 3

Step 2: Add them together
  7 + 3 = 10

Step 3: Take modulo 10
  10 % 10 = 0

Result: Winning number is 0
Winner: Player who has square with number 0
```

---

## Payout Distribution

### Example Game: $20 entry fee × 10 squares = $200 pot

| Quarter | Percentage | Amount | Winner |
|---------|-----------|--------|--------|
| Q1      | 20%       | $40    | Auto-calculated |
| Q2      | 20%       | $40    | Auto-calculated |
| Q3      | 20%       | $40    | Auto-calculated |
| Q4      | 40%       | $80    | Auto-calculated |
| **Total** | **100%** | **$200** | **Distributed** |

### Automatic Actions:
1. ✅ Calculates payout amount
2. ✅ Identifies winning user
3. ✅ Credits winner's mock_balance
4. ✅ Creates payout record
5. ✅ Updates game state
6. ✅ Displays winner info

---

## Visual Indicators

### On Game List:
- **Your Game** + gold star icon
- **ACTIVE status** badge (green)
- **"Tap to enter scores"** text (green)

### On Game Detail:
- **Settings icon** in header (top-right)
- **"Manage Game"** button at bottom (blue)

### On Admin Screen:
- **Green checkmark** next to completed quarters
- **Winner name** and **payout amount** displayed
- **Disabled input** for completed quarters

---

## Troubleshooting

### "Manage Game" Button Not Showing

**Check 1: Are you the creator?**
- Only game creators can enter scores
- Look for "Your Game" badge

**Check 2: Is game active?**
- Game must have all 10 squares filled
- Status should be "ACTIVE" (green badge)
- Random numbers must be generated

**Check 3: Is game completed?**
- If all 4 quarters have scores, game is done
- Score entry is no longer available

### Can't Enter Score

**Error: "Please enter a score"**
- Input field is empty
- Enter score in XX-XX format

**Error: "Invalid score format"**
- Format doesn't match XX-XX
- Use numbers and hyphen only
- Examples: 21-17, 14-7, 35-28

**Error: "Only game creator can update scores"**
- You're not the game creator
- Only the person who created the game can enter scores

**Error: "Game is not active"**
- Game status is "pending" (not all squares filled) or "completed"
- Wait for all squares to fill or game has ended

---

## Testing the Feature

### Create Test Scenario:
1. Create a test game (use random number test script)
2. Fill all 10 squares
3. Verify game becomes "ACTIVE"
4. Access score management screen
5. Enter Q1 score: `14-7`
6. Verify winner calculation (number 1)
7. Check winner's balance increased
8. Repeat for Q2, Q3, Q4
9. Verify game becomes "COMPLETED"

---

## API Endpoint

### POST /api/games/{game_id}/score

**Request:**
```json
{
  "quarter": "Q1",
  "score": "21-17"
}
```

**Response:**
```json
{
  "message": "Score updated",
  "winning_number": 8,
  "winner_user_id": "user_abc123",
  "payout_amount": 40.0
}
```

---

## Summary

✅ **Feature is fully implemented and working**
✅ **Accessible to game creators for active games**
✅ **Automatic winner identification**
✅ **Automatic payout calculation and distribution**
✅ **Score validation and error handling**
✅ **Clear visual indicators throughout the app**

The feature is production-ready and available for use immediately!
