# QuestAi - Setup & Deployment Guide

QuestAi is a professional AI-powered interview preparation platform for developers.

## 1. Local Setup (VS Code)

1.  **Extract the ZIP** and open the folder in VS Code.
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Setup Environment Variables**:
    - Rename `.env.example` to `.env`.
    - Fill in the values:
        - `DATABASE_URL`: Your PostgreSQL connection string (from Neon.tech or local Postgres).
        - `GEMINI_API_KEY`: Get one for free at [aistudio.google.com](https://aistudio.google.com/app/apikey).
        - `JWT_SECRET`: Any random string (e.g., `questai-secret-123`).
4.  **Run Development Server**:
    ```bash
    npm run dev
    ```
5.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## 2. Deployment (Render / Railway)

### Prerequisites:
- A GitHub account.
- A PostgreSQL database (Neon.tech is recommended).

### Render Setup (Recommended)
- Build Command: `npm run build`
- Start Command: `npm start`
- Environment Variables: Add `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`.

### Vercel Setup
- Vercel will automatically detect the `vercel.json` I added.
- **Environment Variables**: Go to Project Settings -> Environment Variables and add `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`.
- **Framework Preset**: Other (or Vite).
- **Output Directory**: `dist`.

## 3. Gemini API Key (FREE)
1. Go to [AI Studio](https://aistudio.google.com/app/apikey).
2. Click **Create API key**.
3. Copy the key and paste it into your `.env` file or deployment settings.

## 3. Database Schema
QuestAi handles table creation automatically on startup using the `server.ts` initialization logic. You just need to provide a working PostgreSQL URL.

---
**Note on Gemini API key**: Ensure your key has access to the `gemini-1.5-flash` model.
