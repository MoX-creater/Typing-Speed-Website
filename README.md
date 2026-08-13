# Typing Speed Web App

A full-stack typing test platform built with **React, Node.js/Express, Socket.io, Firebase/Firestore, and Google Gemini**, featuring real-time WPM and accuracy computation, AI-generated adaptive passages, AI performance summaries, live multiplayer race mode, global leaderboards, and a premium dark-themed UI.

**Live demo:** [typing-speed-website-lac.vercel.app](https://typing-speed-website-lac.vercel.app/)

## Features

- **Real-Time Metrics** — Live WPM, accuracy, and word count updated during typing with low-latency response
- **Multiple Durations** — Choose from 15s, 30s, 60s, or 120s test sessions
- **AI-Generated Passages** — Personalized typing passages generated via Google Gemini, adapted to each user's error patterns (frequently mistyped characters/bigrams), with configurable difficulty and theme
- **AI Performance Summaries** — Post-test natural-language performance analysis generated via Gemini, highlighting speed trends and accuracy patterns, shown on both solo and multiplayer results
- **Live Multiplayer Race Mode** — Create or join a room and race against other players in real time via Socket.io, with live progress tracking and synced countdown/start
- **Firebase Authentication** — Secure user accounts via Firebase Auth
- **Firestore Persistence** — Solo test results and multiplayer race results saved to Firestore, tagged by mode (`solo` / `multiplayer`) with room and rank data for races
- **Global Leaderboard** — Top typists ranked by best WPM
- **Profile Dashboard** — Aggregated stats and session history pulled from Firestore
- **Post-Test Results Screen** — WPM-over-time graph (raw vs. smoothed), consistency score, character breakdown, AI performance summary, and full session detail
- **Optimized Rendering** — `useRef` for mutable stats and windowed word rendering to minimize input lag during continuous typing

## AI Integration

- **Adaptive passage generation** — tracks per-user typing errors (mistyped characters/bigrams, WPM-over-time, accuracy by character class) in a rolling Firestore-backed typing profile, and feeds this into a Gemini prompt to generate passages that target the user's specific weak points
- **Prompt design** — passage prompts constrain length, difficulty, theme, and target error patterns while explicitly guiding the model toward natural, coherent prose over disconnected or awkward filler text
- **Caching & reuse** — generated passages are cached per user/difficulty/theme combination and reused until enough new error data accumulates or a time threshold passes, reducing redundant API calls
- **Rate limiting** — per-user cooldown on AI endpoints to prevent abuse and control API costs
- **Graceful fallback** — new users without typing history, or requests that fail generation/validation, fall back to default passages rather than erroring, so the AI features never block the core typing experience

## Tech Stack

| Layer      | Technology                                     |
|------------|-------------------------------------------------|
| Frontend   | React, Vite, React Router                        |
| Backend    | Node.js, Express, Socket.io                      |
| AI/LLM     | Google Gemini API (`gemini-3.1-flash-lite`)       |
| Database   | Firebase / Cloud Firestore                        |
| Auth       | Firebase Authentication                           |
| Styling    | Vanilla CSS (dark theme, JetBrains Mono)          |
| Deployment | Backend: Render · Frontend: Vercel                |

## Project Structure

```
├── server/
│   ├── index.js                 # Express + Socket.io entry point, CORS
│   ├── firebaseAdmin.js         # Firebase Admin SDK init (env-based credentials)
│   ├── socketHandlers.js        # Multiplayer room, race lifecycle, socket events
│   ├── routes/
│   │   └── passages.js          # AI passage generation + AI summary routes
│   ├── utils/
│   │   ├── geminiService.js     # Gemini API client (shared across passage + summary generation)
│   │   ├── buildPassagePrompt.js # Prompt builder for adaptive passage generation
│   │   ├── buildSummaryPrompt.js # Prompt builder for post-test AI summaries
│   │   └── rateLimiter.js       # Per-user cooldown for AI endpoints
│   └── .env                     # PORT, CLIENT_URL, FIREBASE_*, GEMINI_API_KEY
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── lib/
│   │   ├── firebase.js          # Firebase client SDK init
│   │   └── auth.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx              # Router + auth state
│       ├── api.js
│       ├── index.css            # Design system
│       ├── hooks/
│       │   ├── useFriends.js
│       │   └── useRoom.js
│       └── components/
│           ├── Navbar.jsx
│           ├── TypingTest.jsx       # Core typing engine + AI passage request
│           ├── MultiplayerLobby.jsx
│           ├── MultiplayerRace.jsx
│           ├── Results.jsx          # Results screen + AI performance summary
│           ├── Login.jsx
│           ├── Register.jsx
│           ├── Profile.jsx
│           └── Leaderboard.jsx
```

## Getting Started

### Prerequisites

- **Node.js** v18+
- A **Firebase** project with Firestore and Authentication enabled
- A **Google Gemini API key** ([Google AI Studio](https://aistudio.google.com))

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/Typing-Speed-Website.git
cd Typing-Speed-Website

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Configuration

**Backend** — copy `server/.env.example` to `server/.env` and fill in your own values (Firebase Admin credentials, JWT secret, Gemini API key, etc.):

```bash
cd server
cp .env.example .env
```

**Frontend** — copy `client/.env.example` to `client/.env` and fill in your Firebase client config and backend URL:

```bash
cd client
cp .env.example .env
```

See each `.env.example` file for the full list of required variables — never commit your actual `.env` files.

### Run

```bash
# Terminal 1 — Start backend
cd server
npm start

# Terminal 2 — Start frontend
cd client
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:5000

## Multiplayer Race Mode

- Create or join a room via a short room code
- Server-synced countdown before the race starts
- Live progress broadcast to all players in the room via Socket.io
- Results saved to Firestore per player, tagged with `mode: "multiplayer"`, `roomId`, and final `rank`

## Deployment

- **Backend** deployed on [Render](https://render.com) (Node/Express + Socket.io, persistent WebSocket support)
- **Frontend** deployed on [Vercel](https://vercel.com)
- **Database/Auth** hosted on Firebase (Firestore + Authentication)

## Performance

- Optimized React state management using `useRef` for high-frequency keystroke tracking to avoid unnecessary re-renders
- Windowed rendering — only the words near the cursor are rendered from the full passage, minimizing DOM nodes
- Socket.io progress updates batched to avoid flooding connections during multiplayer races
- AI passage caching and rate limiting reduce redundant Gemini API calls and control response latency
