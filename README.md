
# TypePulse — Typing Speed Web App

A full-stack typing test platform built with the **MERN stack** (MongoDB, Express, React, Node.js) featuring real-time WPM and accuracy computation, JWT authentication, global leaderboards, and a premium dark-themed UI.

##  Features

- **Real-Time Metrics** — Live WPM, accuracy, and word count updated during typing with sub-150ms response latency
- **Multiple Durations** — Choose from 15s, 30s, 60s, or 120s test sessions
- **6 RESTful APIs** — User registration/login, session persistence, leaderboard, and profile analytics
- **JWT Authentication** — Secure token-based auth with 7-day expiry
- **Global Leaderboard** — Top 50 typists ranked by best WPM
- **Profile Dashboard** — Aggregated stats (best/avg WPM, accuracy, total time) with session history
- **Optimized Rendering** — `useRef` for mutable stats and windowed word rendering to minimize input lag during continuous typing
- **Request Timing Middleware** — Server-side monitoring logs any API response exceeding 150ms

## 🛠️ Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 19, Vite, React Router, Axios |
| Backend    | Node.js, Express                  |
| Database   | MongoDB, Mongoose                 |
| Auth       | JWT (jsonwebtoken), bcryptjs      |
| Styling    | Vanilla CSS (glassmorphism, JetBrains Mono) |

##  Project Structure

```
├── server/
│   ├── index.js                # Express entry point, CORS, timing middleware
│   ├── .env                    # MONGO_URI, JWT_SECRET
│   ├── models/
│   │   ├── User.js             # User schema
│   │   └── Session.js          # Typing session schema
│   ├── middleware/
│   │   └── auth.js             # JWT verification middleware
│   └── routes/
│       ├── users.js            # Register, Login, Profile APIs
│       └── sessions.js         # Save, Leaderboard, History APIs
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx             # Router + auth state
│       ├── api.js              # Axios service layer
│       ├── index.css           # Design system
│       └── components/
│           ├── Navbar.jsx
│           ├── TypingTest.jsx  # Core typing engine
│           ├── Results.jsx
│           ├── Login.jsx
│           ├── Register.jsx
│           ├── Profile.jsx
│           └── Leaderboard.jsx
```

##  Getting Started

### Prerequisites

- **Node.js** v18+
- **MongoDB** running locally or a [MongoDB Atlas](https://www.mongodb.com/atlas) URI

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

Create or edit `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/typing-speed-app
JWT_SECRET=your_secret_key_here
```

### Run

```bash
# Terminal 1 — Start backend
cd server
npm run dev

# Terminal 2 — Start frontend
cd client
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:5000

##  API Reference

| Method | Endpoint                  | Auth | Description                       |
|--------|---------------------------|------|-----------------------------------|
| POST   | `/api/users/register`     | No   | Register a new user               |
| POST   | `/api/users/login`        | No   | Authenticate and return JWT       |
| GET    | `/api/users/profile`      | Yes  | User profile with aggregated stats|
| POST   | `/api/sessions`           | Yes  | Save a typing session result      |
| GET    | `/api/sessions/leaderboard`| No  | Global top 50 scores              |
| GET    | `/api/sessions/history`   | Yes  | Paginated user session history    |
| GET    | `/api/health`             | No   | Server health check               |

##  Performance

- Optimized React state management using `useRef` for high-frequency keystroke tracking to avoid unnecessary re-renders
- Windowed rendering — only ~70 words near the cursor are rendered from 200+ total, minimizing DOM nodes
- Server-side request timing middleware flags any response exceeding 150ms
- Validated under 50–100 concurrent sessions ensuring consistent data synchronization


