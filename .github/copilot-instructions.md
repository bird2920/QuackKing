# Smartish - AI Agent Instructions

## Architecture Overview

**Jackbox-style real-time multiplayer trivia game** with Firebase backend, React frontend, modular screen-based architecture.

### Critical Firestore Path Pattern

All data lives under: `artifacts/{appId}/public/data/games/{gameCode}/`

- **Game doc**: `games/{gameCode}` - stores game state, questions array, current question index
- **Players subcollection**: `games/{gameCode}/players/{userId}` - stores name, score, lastAnswer

⚠️ **Always use helper functions from `src/helpers/firebasePaths.js`** - never hardcode paths:
```javascript
getGameDocPath(db, gameCode)        // → game document reference
getPlayersCollectionPath(db, gameCode)  // → players collection
getPlayerDocPath(db, gameCode, userId)  // → specific player doc
```

### Global Configuration (index.html)

Three critical globals injected before React loads:
```javascript
window.__app_id = "my-app"  // Used in Firestore paths
window.__firebase_config = JSON.stringify({...})  // Firebase SDK config
window.__initial_auth_token = null  // Optional custom auth (usually null)
window.GEMINI_API_KEY = ""  // Optional AI question generation
```

**Never reference Firebase config directly in code** - always use `useFirebase()` hook which reads these globals.

## Application Flow

### Entry Point Chain
```
main.jsx → src/App.jsx (routing) → TriviaGame component → Screen components
         └─ ThemeProvider (if exists)
```

### Game State Machine
```
HOME → LOBBY → UPLOAD → PLAYING → RESULTS → (loop back to LOBBY or HOME)
```

Controlled by `lobbyState.status` field in Firestore. Host updates this field, all clients react via `onSnapshot` listeners.

### Real-Time Sync Pattern

**Every screen uses live Firestore listeners** (not REST calls):
```javascript
useEffect(() => {
  const unsubGame = onSnapshot(getGameDocPath(db, gameCode), (docSnap) => {
    setLobbyState(docSnap.data());
  });
  const unsubPlayers = onSnapshot(getPlayersCollectionPath(db, gameCode), (querySnap) => {
    setPlayers(querySnap.docs.map(d => d.data()));
  });
  return () => { unsubGame(); unsubPlayers(); };
}, [db, gameCode]);
```

⚠️ **Always clean up listeners** in the return function to prevent memory leaks.

## File Organization

### Modular Architecture (Post-Refactor)

```
src/
├── App.jsx                 # Routing + TriviaGame component (game orchestration)
├── helpers/
│   ├── useFirebase.js      # Firebase initialization hook
│   ├── firebasePaths.js    # Centralized Firestore path builders
│   ├── codeUtils.js        # 4-letter game code generation
│   ├── questionUtils.js    # CSV parsing, array shuffling
│   └── geminiService.js    # AI question generation (optional)
└── screens/
    ├── HomeScreen.jsx      # Name input + create/join game
    ├── LobbyScreen.jsx     # Question upload + player waiting room
    ├── HostGameScreen.jsx  # Host view during gameplay (reveals answers)
    ├── PlayerGameScreen.jsx # Player view (answer submission)
    └── ResultsScreen.jsx   # Final scores + rematch/leave
```

### Legacy Files (May Still Exist)

- `TriviaGame.jsx` (root) - Original monolithic file, being phased out
- `App.jsx` (root) - Delete if it exists; use `src/App.jsx` only

## Development Workflows

### Critical Commands
```bash
npm run dev        # Vite dev server on :5173
npm run build      # Production build to dist/
npm run validate   # Check Firebase config (runs validate-firebase.js)
make deploy        # Build + deploy to Cloudflare Workers (wrangler)
```

### Testing Multiplayer Locally

1. Run `npm run dev`
2. Open `http://localhost:5173` (host)
3. Create game, note 4-letter code
4. Open **incognito/private window** with same URL (player)
5. Join with code
6. Test game flow from both perspectives

**Why incognito?** Firebase anonymous auth creates separate users per browser context.

### Firebase Config Validation

If you see "Firebase initialization failed":
```bash
npm run validate  # Checks __firebase_config in index.html
```

Common issues:
- Forgot to replace `YOUR_KEY` placeholders in `index.html`
- JSON syntax error in config object
- Anonymous auth not enabled in Firebase Console

## Security Model

### Firestore Rules Summary

- **Game doc**: Read: anyone | Create: authed | Update/Delete: host only
- **Player docs**: Read: anyone | Create: self only | Update: self OR host | Delete: authed

⚠️ **Players cannot modify their own scores** - enforced by security rules checking `request.resource.data.score == resource.data.score` in update operations.

### Score Calculation (Host-Only)

Only `HostGameScreen.jsx` calculates scores after answer submissions:
```javascript
// Time-based scoring: faster answers = more points
const timeElapsed = Date.now() - lobbyState.currentQuestionStartTime;
const speedBonus = Math.max(0, 30000 - timeElapsed) / 1000;  // 30s max
const pointsEarned = 100 + Math.floor(speedBonus * 10);
```

Host then updates player docs with new scores via `updateDoc()`.

## Common Patterns

### Screen Component Props

All screens receive same core props:
```javascript
{ db, gameCode, lobbyState, players, userId, isHost }
```

Host/player role determined by: `isHost = lobbyState?.hostUserId === userId`

### Question Format

```javascript
{
  id: 0,
  question: "What is the capital of France?",
  correctAnswer: "Paris",
  options: ["Paris", "London", "Berlin", "Madrid"]  // shuffled, includes correct answer
}
```

Options are **always shuffled** on parse - use `shuffleArray()` from `questionUtils.js`.

### CSV Upload Pattern

```csv
Question, Correct Answer, Option 1, Option 2, Option 3
What is 2+2?, 4, 3, 5, 6
```

Host pastes CSV in `LobbyScreen`, triggers `parseCSV()` → updates `lobbyState.questions` array.

### AI Question Generation

When `window.GEMINI_API_KEY` is set, calls `geminiService.js`:
```javascript
callGeminiApi({
  contents: [{ parts: [{ text: `Generate 5 trivia questions about: ${topic}` }] }],
  generationConfig: { responseMimeType: "application/json", responseSchema: QUESTION_SCHEMA }
})
```

Returns structured JSON matching question format above.

## Styling Approach

- **Tailwind CSS 3** for all styling (utility classes)
- No CSS-in-JS or styled-components
- Dark theme default: `bg-gray-900`, `text-white`
- Theme system files may exist in `src/styles/` (ThemeContext, ThemeSwitcher) but currently **not integrated**

### Responsive Design

All screens use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`). Mobile-first approach.

## Known Quirks

1. **Hot reload and Firebase**: `useFirebase.js` checks `getApps().length` before re-initializing to prevent duplicate Firebase instances during HMR.

2. **HashRouter vs BrowserRouter**: Uses `HashRouter` for static hosting compatibility (no server-side routing needed). URLs look like `/#/game/ABCD`.

3. **4-letter codes**: Generated with consonants/vowels pattern for pronounceability (`codeUtils.js`). Always uppercase, always 4 chars.

4. **Anonymous auth required**: Every user gets anonymous Firebase UID on mount. Game joins validate against this UID in security rules.

5. **No backend server**: Pure client-side app. Firestore handles all persistence, Firebase handles auth. Gemini API called directly from browser (⚠️ API key exposed in production - document advises backend proxy).

## When Making Changes

### Adding a New Screen
1. Create in `src/screens/YourScreen.jsx`
2. Import into `src/App.jsx`
3. Add conditional render based on `lobbyState.status` value
4. Ensure it receives standard props: `{ db, gameCode, lobbyState, players, userId, isHost }`

### Modifying Game Flow
1. Update `lobbyState.status` field via `updateDoc(getGameDocPath(db, gameCode), { status: 'NEW_STATE' })`
2. All clients will react via `onSnapshot` listeners
3. Add conditional render in `src/App.jsx` for new status

### Firebase Schema Changes
1. Update Firestore security rules in `firestore.rules`
2. Test locally first (rules emulator or test mode)
3. **Must manually deploy rules** via Firebase Console (Rules tab → Publish)
4. Update helper functions in `firebasePaths.js` if path structure changes

### Question Format Changes
1. Update `parseCSV()` in `questionUtils.js` for CSV parsing
2. Update `QUESTION_SCHEMA` in `geminiService.js` for AI generation
3. Update render logic in all screens that display questions

## Performance Considerations

- **Firestore listeners are persistent** - don't create new listeners on every render (use `useEffect` with correct deps)
- **Player list re-sorts on every update** - `players.sort((a,b) => b.score - a.score)` runs in listener callback
- **Free tier limits**: 50K reads/day ≈ 500 players/day (each player ~100 reads per game session)

## Testing Checklist

When changing core functionality:
- [ ] Test as host (create game, upload questions, control flow)
- [ ] Test as player (join game, answer questions, see scores)
- [ ] Test with 2+ concurrent players (use incognito windows)
- [ ] Check browser console for Firestore errors
- [ ] Verify security rules still allow intended actions
- [ ] Test on mobile viewport (responsive design)
