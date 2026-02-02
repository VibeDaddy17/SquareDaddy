# Square Display Design - Updated for Social Engagement

## Design Philosophy
Show both the number AND user name so players can follow the action and banter about who's winning/losing during the game.

---

## Display States

### 1. Empty Square (Before Selection)
```
┌─────────────┐
│             │
│  Click to   │
│    Pick     │
│             │
└─────────────┘
```
- Dashed green border
- Green text "Click to Pick"
- Interactive (tap to select)

---

### 2. Filled Square - PENDING Game (Before All 10 Filled)
```
┌─────────────┐
│             │
│  John Doe   │
│             │
│             │
└─────────────┘
```
- Solid colored background (unique color per user)
- User's full name (or shortened if >12 chars)
- No number yet
- Example: "John Doe" or "Christopher..." (truncated)

---

### 3. Filled Square - ACTIVE Game (After Random Numbers Generated)
```
┌─────────────┐
│    ┌───┐    │
│    │ 7 │    │  ← Gold badge with number
│    └───�┘    │
│  John Doe   │  ← User name below
└─────────────┘
```
- Colored background remains
- **Gold badge** with large number (0-9) at top
- User name below the badge (shortened if >10 chars)
- Example displays:
  - "John Doe" (full name)
  - "Christoph..." (truncated at 10 chars)

---

## Name Truncation Rules

| State | Max Length | Example |
|-------|------------|---------|
| **Pending** | 12 characters | "Christopher" → "Christopher..." |
| **Active** | 10 characters | "Christopher" → "Christoph..." |

**Why shorter in active?** The gold badge takes up space, so we reduce name length to maintain readability.

---

## Visual Example - Full Grid (Active Game)

```
┌──────┬──────┬──────┬──────┬──────┐
│  3   │  7   │  8   │  0   │  2   │
│ John │ Mary │ Bob  │ Sue  │ Tom  │
├──────┼──────┼──────┼──────┼──────┤
│  5   │  1   │  9   │  4   │  6   │
│ Lisa │ Mike │ Chris│ Anna │ Dave │
└──────┴──────┴──────┴──────┴──────┘
```

---

## Social Benefits

### Players Can:
✅ **See who has which number** at a glance
✅ **Track their friends** during the game
✅ **Banter and trash talk** based on who's leading
✅ **Celebrate wins together** when their number hits

### Example Banter:
- "Sarah has number 7! She's got a great shot at Q1!"
- "Mike's got 0... that's rough, buddy!"
- "John and Lisa are sitting pretty with 3 and 7!"

---

## Technical Implementation

### Component Logic:
```javascript
// Active game display
{game.status !== 'pending' && game.random_numbers[index] !== null ? (
  <>
    <View style={styles.randomNumberBadge}>
      <Text style={styles.randomNumber}>{game.random_numbers[index]}</Text>
    </View>
    <Text style={styles.squareUserActive}>
      {square?.user_name?.length > 10 
        ? square.user_name.substring(0, 10) + '...'
        : square?.user_name}
    </Text>
  </>
) : ...}
```

### Styling:
- **Badge**: Gold (#FFD700) background, 18px bold number
- **Active Name**: 8px font, white text, centered below badge
- **Pending Name**: 10px font, white text, centered in square

---

## Winner Highlighting (Future Enhancement)
When a quarter ends, the winning square could:
- Add a trophy icon 🏆
- Pulse animation
- Bright border glow
- Show payout amount

---

## Summary
This design balances:
- **Visual clarity**: Numbers are prominent
- **Social engagement**: Names stay visible
- **Space efficiency**: Smart truncation keeps it readable
- **User experience**: Everyone knows who to root for (or against!)
