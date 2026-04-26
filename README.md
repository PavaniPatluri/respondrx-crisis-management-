# RespondrX: Smart Crisis Management for Hospitality

**RespondrX** is a premium, AI-driven crisis management and operations command center designed for the 7-star hospitality industry. It provides real-time situational awareness, automated staff coordination, and multilingual emergency alerts to ensure guest safety and operational excellence.

## 🚀 Key Differentiators

*   **Intelligence Engine**: Autonomous incident severity assessment and automated task allocation using predictive risk modeling.
*   **Zero-Failure Audio Orchestrator**: A hardened, hardware-locked multilingual voice alert system (English, Hindi, Telugu) with watchdog resilience.
*   **Tactical HUD**: Real-time spatial awareness with interactive floor maps and live situational feeds.
*   **Situational Forensics**: Replay mode for post-incident analysis and XAI (Explainable AI) reasoning for every system decision.
*   **Failure Injection System**: Built-in simulator for testing resilience against staff unavailability, exit blockages, and communication delays.

## 🛠️ Technology Stack

*   **Frontend**: React, Vite, Socket.io-client, CSS3 (Glassmorphic UI).
*   **Backend**: Python, Flask, Socket.io, SQLAlchemy.
*   **Real-time**: Bi-directional WebSocket communication for zero-latency updates.

## 📦 Setup & Deployment

### Backend
1. `cd backend`
2. `pip install -r requirements.txt`
3. `python main.py`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## ⚙️ Deployment (Free-Forever Strategy)

This project is optimized for a 100% free deployment using the following "Trio":

### 1. Backend: Hugging Face Spaces (Free API Hosting)
1.  **Create Space**: Go to [Hugging Face](https://huggingface.co/new-space).
2.  **Config**: Select **Docker** (Blank template).
3.  **Upload**: Upload the `backend/` folder and the `Dockerfile` from the root.
4.  **Secrets**: In Space Settings, add `DATABASE_URL` and `SECRET_KEY`.

### 2. Database: Supabase (Free PostgreSQL)
1.  **Project**: Create a new project on [Supabase](https://supabase.com/).
2.  **Connection**: Copy the "Transaction" Connection String (URI) from Database Settings.
3.  **Link**: Use this as your `DATABASE_URL` in Hugging Face.

### 3. Frontend: Vercel (Free Dashboard Hosting)
1.  **New Project**: Connect your GitHub repo to [Vercel](https://vercel.com/).
2.  **Settings**: Set **Root Directory** to `frontend`.
3.  **Variables**: Add `VITE_BACKEND_URL` (your Hugging Face Space URL ending in `.hf.space`).

---
*Developed for high-impact hospitality environments. Smart. Resilient. RespondrX.*
