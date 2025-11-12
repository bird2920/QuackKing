# 🎮 Smartish – Real-Time Multiplayer Trivia

Smartish is a Jackbox-style trivia experience built with React, Vite, Tailwind CSS, and Firebase. Hosts spin up a lobby, invite friends with a four-letter code, load or generate questions, and run the entire show from one screen while players answer from any device.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Firebase](https://img.shields.io/badge/firebase-10.12-orange.svg)
![React](https://img.shields.io/badge/react-18.2-blue.svg)

---

## ✨ Highlights

- 🎯 **Real-time lobby + gameplay** powered by Firestore listeners
- 🤖 **AI question generator** (Gemini or bring-your-own proxy) plus CSV import & live editor
- 📋 **Host dashboard** with player suggestions, “Test Alone” mode, and copy/share invite buttons
- 🧠 **Questions Editor** for on-the-fly tweaks, reordering options, or deleting rounds
- 🏆 **Automatic scoring + leaderboards** with per-question timers
- 📱 **Responsive layout** tuned for laptops, tablets, and TV displays (no top-level scrolling required)
- 🔐 **Security-first** Firestore rules & anonymous auth setup scripts
- 🧪 **Vitest + Testing Library** coverage for UI flows and helper logic

---

## 🚀 Getting Started

### Requirements
- Node.js 18+
- npm or yarn
- Firebase project with Firestore + Anonymous Auth enabled
- (Optional) Gemini API key or an AI proxy endpoint for automatic question generation

### Setup
```bash
git clone https://github.com/yourname/trivia-game.git
cd trivia-game
npm install

# Configure Firebase (see QUICKSTART.md for screenshots)
# Option A: edit index.html and paste your firebaseConfig object
# Option B: create .env.local with VITE_FIREBASE_* variables

npm run validate   # confirms Firebase config works
npm run dev        # launches http://localhost:5173
```

Helpful references:
- **[QUICKSTART.md](./QUICKSTART.md)** – 5‑minute Firebase walkthrough
- **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** – detailed auth/rules/deploy steps
- **[TESTING_MULTIPLAYER.md](./TESTING_MULTIPLAYER.md)** – simulate multiple players locally
- **[ALTERNATIVES.md](./ALTERNATIVES.md)** – Supabase & other backend options

---

## 🧩 Available Scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server (hash router at `/#/game/...`) |
| `npm run dev -- --host` | Expose dev server on your LAN for phone/tablet testing |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the build locally |
| `npm run validate` | Verifies Firebase configuration using `validate-firebase.js` |
| `npm run test` | Run Vitest suite once |
| `npm run test:watch` | Watch mode for rapid UI/helper tests |

---

## ⚙️ Configuration

### Firebase
Smartish expects a global config object before React mounts. In `index.html`:
```html
<script>
  window.__firebase_config = JSON.stringify({
    apiKey: "YOUR_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT",
    appId: "YOUR_APP_ID",
    // ...
  });
</script>
```
Alternatively, define the same values in `.env.local` using `VITE_FIREBASE_*` variables (see `QUICKSTART.md`).

### Security Rules
Deploy the shipped `firestore.rules` to prevent score tampering and enforce host-only controls:
```bash
firebase deploy --only firestore:rules
```

### AI Question Generation (Optional)
Two ways to enable the AI generator button in the lobby:
1. **Proxy URL** – Set `VITE_AI_PROXY_URL` (or `window.AI_PROXY_URL`) to a backend that returns formatted questions.
2. **Gemini direct** – Provide `VITE_GEMINI_API_KEY` (or `window.GEMINI_API_KEY`). The app uses the `gemini-2.5-flash` model with structured JSON responses (see `src/helpers/geminiService.js`).

When neither is configured, the UI automatically falls back to manual CSV uploads.

---

## 🎮 Gameplay Flow

### Host Controls
1. **Create game** from the home screen (LandingPage → `/game` route).
2. **Share invite** – copy the link or tap the native Web Share button (desktop & mobile friendly).
3. **Load questions**:
   - Paste CSV (there’s a `sample-questions.csv` in the repo).
   - Prompt the AI generator with a theme.
   - Use the in-app Questions Editor for touch-ups.
4. **Monitor lobby** – see live player list, topic suggestions, and question count.
5. **Start Game** or **Test Alone** (host-only dry run that resets scores and starts the round loop).

### Players
1. Enter a display name & 4-letter code.
2. Wait in the lobby until the host starts.
3. Answer questions in real time; points are awarded for speed and accuracy.
4. Follow along as the host advances to results.

### Questions Editor (Host Only)
`src/components/QuestionsEditor.jsx` offers:
- Inline editing for prompts, answers, and options
- Visual highlight for the correct answer
- Expand/collapse per question to keep the UI compact
- Delete protection with confirmations

---

## 📝 Question Sources

### CSV Format
```csv
Question,Correct Answer,Option 1,Option 2,Option 3
What is the capital of France?,Paris,London,Berlin,Madrid
Who painted the Mona Lisa?,Leonardo da Vinci,Michelangelo,Raphael,Donatello
```
- Use Excel/Sheets or edit by hand.
- Paste directly into the “Manual CSV Upload” textarea.
- The upload button shows how many questions will be imported.

### AI Prompts
Enter topics like “World Capitals”, “90s Cartoons”, or “Food Trivia”. The app requests five multiple-choice questions per prompt and shuffles the options automatically.

---

## 🏗️ Project Structure
```
trivia-game/
├── LandingPage.jsx            # Marketing splash page (/# route)
├── src/
│   ├── App.jsx                # Router + Firebase wiring
│   ├── components/
│   │   └── QuestionsEditor.jsx
│   ├── screens/
│   │   ├── HomeScreen.jsx
│   │   ├── LobbyScreen.jsx
│   │   ├── HostGameScreen.jsx
│   │   ├── PlayerGameScreen.jsx
│   │   └── ResultsScreen.jsx
│   ├── helpers/               # Firebase paths, AI client, utility functions
│   └── styles/customThemes/   # Tailwind helper palettes
├── tests/                     # Vitest + Testing Library suites
├── index.html / index.css     # Firebase config entry + Tailwind layer
├── firestore.rules            # Must be deployed
├── sample-questions.csv
└── wrangler.jsonc, _redirects, etc.
```
Routing uses `HashRouter` for easy static hosting: `/` renders the animated landing page, `/game` mounts the main `TriviaGame` component.

---

## 🎨 Styling & Customization
- Tailwind is configured via `tailwind.config.cjs` with additional palettes in `src/styles/customThemes/`.
- Update hero/marketing copy in `LandingPage.jsx`.
- Tweak lobby layouts in `src/screens/LobbyScreen.jsx` (recently optimized for TV-sized displays).
- Modify gameplay logic or scoring in `src/screens/HostGameScreen.jsx` & `PlayerGameScreen.jsx`.
- Adjust the Questions Editor look/feel in `src/components/QuestionsEditor.jsx`.

---

## 🧪 Testing & QA
- Run `npm run test` to execute Vitest suites (see `tests/`).
- `TESTING_MULTIPLAYER.md` explains how to simulate multiple players (incognito windows, LAN devices, etc.).
- When debugging Firebase issues, `npm run validate` confirms credentials and rule access before you start the UI.

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
- **Firebase initialization failed** – ensure `window.__firebase_config` (or env vars) are populated and `npm run validate` passes.
- **Missing permissions** – deploy `firestore.rules`, enable Anonymous Auth, and confirm the Firebase project ID matches.
- **AI button disabled** – set `VITE_AI_PROXY_URL` or `VITE_GEMINI_API_KEY`.
- **Players overwrite each other** – read `TESTING_MULTIPLAYER.md` (each browser profile gets one anonymous user).
- **Styling missing** – run `npm install`, confirm `tailwind.config.cjs` plus `postcss.config.cjs` exist, and restart `npm run dev`.

---

## 📄 License & Credits
- Licensed under **MIT** – use it at parties, classrooms, or commercial events.
- Inspired by Jackbox-style party games, powered by Firebase + React, and optionally enhanced by Google Gemini.

Happy hosting, and enjoy the trivia battles! 🎉
