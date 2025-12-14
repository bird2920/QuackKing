# 🎮 QuackKing – Real-Time Multiplayer Trivia

QuackKing is a trivia experience built with React, Vite, Tailwind CSS, and Firebase. Spin up a lobby, invite friends with a four-letter code or QR, generate or import questions, and run the whole show from one screen while players answer from any device.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Firebase](https://img.shields.io/badge/firebase-10.12-orange.svg)
![React](https://img.shields.io/badge/react-18.2-blue.svg)

---

## ✨ Highlights

- 🔴 **Real-time Firestore lobby/gameplay** with auto-resume for hosts, saved timer settings, and hash routing for static hosting.
- 🤖 **Question tools built-in**: Gemini or proxy-based AI generator, curated topic suggestions, CSV paste, and an inline Questions Editor.
- 🖥️ **Spectator / TV mode** at `/#/spectator/:code` with QR join code, live timers, answer distribution, and leaderboard.
- 📣 **Host dashboard**: copy/share invites, player topic suggestions, kick controls, Play Solo test mode, and auto-advance timers.
- 🧑‍🤝‍🧑 **Accounts, stats, achievements**: anonymous by default; optional email sign-in to save history, unlock achievements, and load past games from the profile panel.
- 🧪 **Production helpers**: Firestore security rules, `npm run validate` config check, Vitest + Testing Library suites, and sample CSV data.

---

## 🚀 Getting Started

### Requirements
- Node.js 18+
- npm
- Firebase project with **Firestore** + **Anonymous Auth** enabled
- Optional: **Email/Password auth** (for saved profiles), Gemini API key or AI proxy endpoint for automatic question generation

### Setup
```bash
git clone <repo-url>
cd trivia-game
cp .env.example .env.local   # fill with your Firebase values
npm install

npm run validate             # confirms Firebase config works
npm run dev                  # launches http://localhost:5173/#/
```

Helpful references:
- **QUICKSTART.md** – 5‑minute Firebase walkthrough
- **FIREBASE_SETUP.md** – detailed auth/rules/deploy steps
- **TESTING_MULTIPLAYER.md** – simulate multiple players locally
- **ALTERNATIVES.md** – Supabase & other backend options

---

## ⚙️ Configuration

### Firebase (.env.local)
Add secrets to `.env.local` (git-ignored) so keys stay out of commits:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123
VITE_APP_ID=quackking   # Firestore namespace for games/users
```
`npm run validate` reads these values and falls back to `window.__firebase_config` / `window.__app_id` in `index.html` when present. `VITE_APP_ID` scopes all Firestore documents; use a unique value per environment to avoid collisions.

### Runtime overrides (non-Vite hosting)
If you cannot inject env vars at build time, set `window.__firebase_config`, `window.__app_id`, `window.__initial_auth_token`, and `window.GEMINI_API_KEY` in `index.html` before the bundle loads.

### AI Question Generation (optional)
Two ways to enable the AI generator button in the lobby:
1) **Proxy URL** – Set `VITE_AI_PROXY_URL` (or `window.AI_PROXY_URL`) to a backend that returns formatted questions.  
2) **Gemini direct** – Provide `VITE_GEMINI_API_KEY` (or `window.GEMINI_API_KEY`). Uses `gemini-2.5-flash-preview-09-2025` with structured JSON responses (`src/helpers/geminiService.js`).

When neither is configured, the UI automatically falls back to manual CSV uploads.

### Security Rules
Deploy the shipped `firestore.rules` to prevent score tampering and enforce host-only controls:
```bash
firebase deploy --only firestore:rules
```

---

## 🧭 Game Flow & Features

### Host tools
- Create a lobby, resume cached host sessions, and copy/share invite links.
- Launch Spectator/TV mode (`/#/spectator/{code}`) for QR join codes, live timers, and leaderboards.
- Gather player topic suggestions, generate questions with AI, paste CSV rows, and edit in the Questions Editor.
- Adjust auto-host + timers (reveal/next-question), drop players, start full games, or **Play Solo** test loops.

### Player experience
- Join with a name + 4-letter code from any device.
- Suggest topics to the host, answer timed questions, and see instant scoring + leaderboards.
- Unlock achievements and see recently earned badges in the lobby.

### Spectator / TV mode
- Big-screen view shows QR code, player count, timers, answer distribution, fastest responses, and current theme.

### Accounts, profiles, achievements
- Anonymous auth by default; optional email sign-up/sign-in + password reset to keep history.
- Profile panel surfaces saved games and aggregates (score, accuracy, placements) stored in Firestore.
- Achievements are tracked locally during a session and displayed in the lobby/profile.
- Enable **Email/Password** in Firebase Console if you want sign-in beyond anonymous play.

---

## 🧩 Project Structure
```
trivia-game/
├── LandingPage.jsx            # Marketing splash (/# route)
├── main.jsx
├── src/
│   ├── App.jsx                # HashRouter + screen wiring
│   ├── helpers/               # Firebase paths, AI client, scoring, user stats
│   ├── hooks/useGameLogic.js  # Core lobby/game state + resume logic
│   ├── components/
│   │   ├── AccountModal.jsx
│   │   ├── PlayerAchievements.jsx
│   │   ├── ProfilePanel.jsx
│   │   ├── QuestionsEditor.jsx
│   │   └── QuackKingLogo.jsx
│   ├── screens/
│   │   ├── HomeScreen.jsx
│   │   ├── LobbyScreen.jsx
│   │   ├── HostGameScreen.jsx
│   │   ├── PlayerGameScreen.jsx
│   │   ├── ResultsScreen.jsx
│   │   └── SpectatorScreen.jsx
│   ├── services/achievements/ # In-memory achievement system
│   └── styles/                # Tailwind helpers + themes
├── sample-questions.csv
├── firestore.rules
├── tests/                     # Vitest + Testing Library suites
├── public/                    # Static assets (logos, duck, etc.)
└── _redirects, wrangler.jsonc, makefile, etc.
```
Routing uses `HashRouter` for static hosting: `/` renders the landing page, `/game` mounts the main experience, and `/spectator/:code` shows TV mode.

---

## 🧪 Scripts & Testing
| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server (hash router at `/#/game/...`) |
| `npm run dev -- --host` | Expose dev server on your LAN for phone/tablet testing |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the build locally |
| `npm run validate` | Verifies Firebase configuration using `validate-firebase.js` |
| `npm run test` | Run Vitest suite once |
| `npm run test:watch` | Watch mode for rapid UI/helper tests |

See `TESTING_MULTIPLAYER.md` for local multi-player tips.

---

## 🌐 Deployment

### Firebase Hosting (recommended)
```bash
npm run build
firebase login
firebase init hosting   # if you haven’t already
firebase deploy         # serves dist/ + rewrites handled by HashRouter
```

### Netlify / Vercel / Cloudflare Pages
```bash
npm run build
# Deploy the generated dist/ folder.
# _redirects is included for Netlify single-page routing.
```

---

## 🐛 Troubleshooting Cheatsheet
- **Firebase initialization failed** – ensure `.env.local` has VITE_FIREBASE_* values (or `window.__firebase_config` is set) and `npm run validate` passes.
- **Missing permissions** – deploy `firestore.rules`, enable Anonymous Auth, and confirm the Firebase project ID matches `VITE_FIREBASE_PROJECT_ID`.
- **AI button disabled** – set `VITE_AI_PROXY_URL` or `VITE_GEMINI_API_KEY`.
- **Accounts won’t sign in** – enable Email/Password in Firebase if you want non-anonymous logins.
- **Players overwrite each other** – each browser profile gets one anonymous user; open incognito windows per player (see `TESTING_MULTIPLAYER.md`).
- **Styling missing** – run `npm install`, confirm `tailwind.config.cjs` plus `postcss.config.cjs` exist, and restart `npm run dev`.

---

## 📄 License & Credits
- Licensed under **MIT** – use it at parties, classrooms, or commercial events.
- Inspired by Jackbox-style party games, powered by Firebase + React, and optionally enhanced by Google Gemini.

Happy hosting, and enjoy the trivia battles! 🎉
