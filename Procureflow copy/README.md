# Procureflow

**Reduce Waiting. Improve Transparency. Simplify Procurement.**

SIH 2026 — Agricultural Procurement Management System

---

## What is Procureflow?

Procureflow is a digital platform that connects farmers, centre operators, and government officers throughout the agricultural procurement process. Farmers book slots at procurement centres, track their position in the queue in real time, and receive updates as their produce is weighed, quality-checked, and paid for. Operators manage the physical queue at the counter. Officers monitor all centres and analytics in one dashboard.

---

## Quick Start (Windows)

### Option A — Double-click

```
Double-click start.bat
```

That's it. The script will:
1. Check Python and Node.js are installed
2. Install all Python and Node.js dependencies
3. Create the SQLite database and seed demo data
4. Start the FastAPI backend on port 8000
5. Start the Vite frontend on port 5173

---

### Option B — PowerShell

Right-click `start.ps1` → **Run with PowerShell**

Or from a terminal:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\start.ps1
```

---

## Manual Start

If you prefer to start each part yourself:

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python init_db.py
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend** (separate terminal):
```bash
cd frontend
npm install
npm run dev
```

---

## Application URLs

| Portal | URL |
|---|---|
| Farmer Portal | http://localhost:5173/login/farmer |
| Staff Portal (Operator + Officer) | http://localhost:5173/login/staff |
| Backend API | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Farmer | farmer@demo.com | farmer123 |
| Centre Operator | operator@demo.com | operator123 |
| Government Officer | officer@demo.com | officer123 |

> These are prototype demo accounts only.

---

## Requirements

| Tool | Version |
|---|---|
| Python | 3.10 or higher |
| Node.js | 18 or higher |
| npm | 8 or higher |

No external database, cloud service, SMS API, or payment gateway is required. Everything runs locally.

---

## Tech Stack

**Backend:** Python · FastAPI · SQLAlchemy · SQLite · JWT authentication

**Frontend:** React 18 · Vite · TypeScript · Tailwind CSS · TanStack Query · Zustand · Framer Motion · Recharts · i18next

---

## Features

- **Farmer Portal** — Smart slot booking with AI slot recommendation, live queue, QR booking pass, procurement timeline, payment tracking, cancel/reschedule, notifications, 9-language support
- **Operator Portal** — Real-time queue management, weighing, quality check, procurement completion, payment update
- **Officer Portal** — Centre performance monitoring, procurement/payment tables with filters, trend charts

---

## Languages Supported

English · हिन्दी · اردو · छत्तीसगढ़ी · मराठी · বাংলা · ગુજરાતી · ਪੰਜਾਬੀ · తెలుగు

Change language from the Settings page or the language icon in any header. Your preference persists across sessions.

---

## Themes

☀️ Light  ·  🌙 Dark  ·  ⚙️ System Default

Change from Settings or the theme icon in any header.

---

## Demo Flow (for SIH presentation)

1. Log in as **Farmer** → view "Aaj Kya Karna Hai?" on dashboard
2. Go to **Book Slot** → select crop → quantity → centre → date → slot → confirm
3. See **Token** and **QR Pass**
4. Go to **My Queue** → see live position and estimated wait
5. Log in as **Operator** → click **Call Next Farmer**
6. Farmer's queue page updates to show "Your Turn!"
7. Operator clicks **Start Weighing → Complete Weighing → Start Quality → Complete Quality → Complete Procurement**
8. Farmer sees each stage update in real time
9. Operator clicks **Update Payment → Mark Completed**
10. Farmer sees payment completed
11. Log in as **Officer** → view analytics dashboard → Procurements tab → Payments tab

---

*Procureflow is a prototype built for SIH 2026. Demo OTP, demo eKYC, and demo payments are simulated locally — no real SMS, UIDAI, or banking connections are made.*
