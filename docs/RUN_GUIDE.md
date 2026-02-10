# IDEA-PM Run & Management Guide 🚀

This guide explains how to stop, start, and manage your Polymarket Truth Machine.

---

## 🛑 How to STOP Everything

### 1. Stop the Backend (Database & Indexer)
Run this from the project root (`d:\VSK\IDEA-PM`):
```powershell
docker compose -f docker/docker-compose.yml down
```

### 2. Stop the Frontend
- Go to the terminal where you ran `npm run dev` and press **`Ctrl + C`**.
- Or, if you want to force kill it from any terminal:
```powershell
Stop-Process -Name "node" -Force
```

---

## ▶️ How to START Everything

### 1. Start the Backend
Run this from the project root. It will build and start the database and indexer in the background:
```powershell
docker compose -f docker/docker-compose.yml up -d --build
```
> [!TIP]
> Always use `--build` if you have changed your `.env` file or backend code!

### 2. Start the Frontend
Open a new terminal and run:
```powershell
cd frontend
npm run dev
```

---

## 📊 How to MONITOR the System

### View Backend Logs
To see what the indexer is doing (captured logs, metadata retrieval):
```powershell
docker compose -f docker/docker-compose.yml logs -f --tail 50 indexer
```

### Check Database Tables
To see how much data you have:
```powershell
docker compose -f docker/docker-compose.yml exec -T db psql -U user -d ideapm -c "\dt"
```

---

## 🧹 How to RESET Everything (Start Fresh)
If you want to clear all data and start indexing from block 0 again:

1. **Stop and wipe volume**:
```powershell
docker compose -f docker/docker-compose.yml down -v
```

2. **Start fresh**:
```powershell
docker compose -f docker/docker-compose.yml up -d --build
```

---

## 🔗 Access Links
- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend Stats**: [http://localhost:3000/stats](http://localhost:3000/stats)
- **Backend Events**: [http://localhost:3000/events](http://localhost:3000/events)
