# LexiBrief AI ⚖️🚀

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Gemini](https://img.shields.io/badge/Google-Gemini_2.5_Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)

**An automated, high-fidelity legal document analysis platform that extracts critical legal insights, compliance risks, and core deadlines from complex legal PDFs with persistent cloud history orchestration.**

LexiBrief AI transforms dense legal PDFs into four structured intelligence panels—Summary & Context, Core Legal Issues, Risk Obligations, and Deadline Alerts—backed by a cyberpunk-grade React dashboard and a resilient Node.js analysis pipeline.

---

## ✨ Key Architectural Features

| Capability | Description |
|------------|-------------|
| **Gen AI Parsing Core** | Powered by **Google Gemini 2.5 Flash** for semantic document analysis and intelligent text-chunk processing across multi-page legal filings. |
| **Fault-Tolerant Retry Engine** | Dual-attempt recovery with automatic model fallback (`2.5-flash` → `2.0-flash` → `1.5-flash`) to bypass temporary **503 Service Unavailable** spikes without breaking the UI. |
| **Direct Shard-Pool Connectivity** | Custom multi-seed MongoDB URI layout bypasses Windows local router DNS issues and `mongodb+srv` SRV lookup blockades. |
| **Dynamic Sliding Dashboard** | Interactive PDF dropzone with glassmorphism UI, typewriter stream animations, and a cloud-synchronized **History Logs** drawer with per-entry purge controls. |

---

## 🛠 Tech Stack

### Frontend
![React](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-0055FF?style=flat-square)

- **React (Vite)** — SPA shell & component architecture  
- **Tailwind CSS** — utility-first cyberpunk theming  
- **Framer Motion** — slide-in history panel & micro-interactions  
- **Axios** — REST orchestration to Express API  
- **Lucide React** — premium iconography  

### Backend
![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express)
![Multer](https://img.shields.io/badge/Multer-Uploads-000000?style=flat-square)
![PDF Parse](https://img.shields.io/badge/PDF--Parse-New-FF6B6B?style=flat-square)

- **Node.js + Express** — REST API gateway  
- **Multer** — in-memory PDF ingestion  
- **pdf-parse-new** — multi-page text extraction  
- **dotenv + cors** — secure env & cross-origin config  

### Database
![Mongoose](https://img.shields.io/badge/Mongoose-ODM-47A248?style=flat-square&logo=mongodb)

- **MongoDB Atlas** with **Mongoose ODM** — persistent scan history, metadata indexing, and targeted record purging  

### AI Framework
![Google GenAI](https://img.shields.io/badge/@google%2Fgenai-SDK-4285F4?style=flat-square&logo=google)

- **Google Gen AI SDK** (`@google/genai`) — structured 4-section legal synthesis engine  

---

## 📁 Project Directory Layout

```text
legal-saas-project/
├── README.md                 # Project documentation (this file)
├── backend/
│   ├── .env.example          # Environment variable template
│   ├── .env                  # Local secrets (git-ignored)
│   ├── package.json
│   ├── server.js             # Express API, Gemini engine, MongoDB layer
│   └── node_modules/
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── public/
    │   └── favicon.svg
    └── src/
        ├── main.jsx
        ├── App.jsx           # LexiBrief AI dashboard & history drawer
        ├── App.css
        └── index.css
```

---

## 🚀 Quick Installation & Setup

### Prerequisites

- **Node.js** 18+  
- **npm** 9+  
- **MongoDB Atlas** cluster (with Network Access configured)  
- **Google AI Studio** API key ([Get API Key](https://aistudio.google.com/apikey))  

### 1. Clone & install dependencies

```bash
git clone <your-repository-url>
cd legal-saas-project

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment variables

Create `backend/.env` from the template:

```bash
cd backend
cp .env.example .env   # Windows: copy .env.example .env
```

Edit `backend/.env` with your credentials:

```env
PORT=5001
GEMINI_API_KEY=your_google_gemini_api_key_here
MONGO_URI=mongodb://username:encoded_password@shard-00-00.example.mongodb.net:27017,shard-00-01.example.mongodb.net:27017,shard-00-02.example.mongodb.net:27017/legal_saas_db?ssl=true&replicaSet=atlas-example-shard-0&authSource=admin&retryWrites=true&w=majority
```

> **Password tip:** If your MongoDB password contains `@`, URL-encode it as `%40` in the connection string.  
> Example: password `@MyPass123` → `%40MyPass123`

| Variable | Description |
|----------|-------------|
| `PORT` | Express server port (default `5001`) |
| `GEMINI_API_KEY` | Google Gemini API key from AI Studio |
| `MONGO_URI` | Direct multi-shard MongoDB Atlas connection string |

### 3. Run locally

Open **two terminals**:

**Terminal 1 — Backend**

```bash
cd backend
node server.js
# or: npm run dev   (with nodemon)
```

Expected output:

```text
Server is LIVE and running on http://localhost:5001
🍃 MongoDB Database Engine Connected Successfully!
```

**Terminal 2 — Frontend**

```bash
cd frontend
npm run dev
```

Open the dashboard at **http://localhost:5173**

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Upload PDF → Gemini analysis → persist to MongoDB |
| `GET` | `/api/history` | List recent scan metadata (`fileName`, `timestamp`) |
| `GET` | `/api/history/:id` | Fetch full historical analysis payload |
| `DELETE` | `/api/history/:id` | Purge a specific history record |

---

## 🧠 Analysis Output Matrix

Every successful scan returns four structured sections:

1. **📋 Summary & Context**  
2. **⚖️ Core Legal Issues & Clauses**  
3. **⚠️ Key Risks & Critical Obligations**  
4. **📅 Detected Deadlines & Timeline Alerts**  

The frontend parser streams each block into dedicated glassmorphism cards with graceful empty-state fallbacks.

---

## 🔁 Retry & Resilience Model

On each **Analyze Document** action:

- Up to **3 Gemini models** are attempted in sequence  
- Each model receives up to **2 attempts** on `503` overload errors  
- Maximum theoretical calls per scan: **6** (typically **1** on success)  
- MongoDB writes use in-memory fallback only when Atlas is unreachable  

---

## 🖥 UI Highlights

- **LexiBrief AI** neon gradient hero branding  
- Drag-and-drop PDF upload with pulse feedback  
- Real-time typewriter + glitch stream rendering  
- Right-side **History Logs** flyout (Framer Motion)  
- One-click history restore & animated delete purge  

---

## ⚠️ Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `503 UNAVAILABLE` from Gemini | Temporary Google model overload | Wait 1–2 min; retry (auto-fallback models enabled) |
| `Invalid URL` MongoDB error | Special chars in password (`@`) | URL-encode password (`%40`) |
| `querySrv ECONNREFUSED` | Router DNS blocks SRV lookups | Use direct shard `MONGO_URI` (see `.env.example`) |
| `bad auth` MongoDB | Wrong username/password | Reset Atlas DB user password & update `.env` |
| History empty after restart | MongoDB was offline during scan | Confirm `🍃 MongoDB Connected` in terminal |

---

## 📄 License

This project is provided for educational and portfolio demonstration purposes. Configure your own API keys and database credentials before any production deployment.

---

<p align="center">
  <strong>LexiBrief AI ⚖️🚀</strong><br/>
  <em>Precision legal intelligence. Structured. Persistent. Production-ready.</em>
</p>
