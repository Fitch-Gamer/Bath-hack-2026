# React TypeScript + Flask Template

This repository is a minimal template integrating a React + TypeScript frontend (Vite) with a Python Flask backend.

Quick start

1. Start the backend (from repository root):

```powershell
cd backend
python -m venv venv        # optional but recommended
venv\\Scripts\\Activate     # on Windows
pip install -r requirements.txt
python app.py
```

2. Start the frontend (separate terminal):

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:3000 and backend on http://localhost:5000 by default.

Files of interest:
- [backend/app.py](backend/app.py)
- [frontend/src/App.tsx](frontend/src/App.tsx)
# Bath-hack-2026