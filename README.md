# LocalAI Mesh — Multi-Agent Orchestration Dashboard

> **A Local AI Swarm Operating System** — ระบบ orchestration สำหรับควบคุม AI agents หลายเครื่องที่รัน Ollama พร้อมกันบน local network

---

## ภาพรวมระบบ

```
┌─────────────────────────────────────────────────────────────┐
│                     LOCAL NETWORK                           │
│                                                             │
│  ┌──────────┐   WS    ┌─────────────────┐   WS   ┌───────┐  │
│  │ Browser  │◄───────►│  FastAPI Server │◄──────►│Agent A│  │
│  │Dashboard │         │  (Orchestrator) │        │Ollama │  │
│  └──────────┘         │  localhost:8000 │        └───────┘  │
│                       └────────┬────────┘                   │
│                                │ WS                         │
│                           ┌────▼────┐   ┌───────┐           │
│                           │ Agent B │   │Agent C│           │
│                           │ Ollama  │   │Ollama │           │
│                           └─────────┘   └───────┘           │
└─────────────────────────────────────────────────────────────┘
```

- **1 Agent = 1 เครื่องคอมพิวเตอร์** ที่รัน [Ollama](https://ollama.ai) และ Local LLM
- **Orchestrator** (backend) รับ task แล้ว route ไปยัง agent ที่ว่างที่สุด
- **Dashboard** (frontend) แสดงผล real-time: hardware metrics, logs, task status
- เมื่อ backend ออฟไลน์ dashboard จะ **fallback เป็น simulation** อัตโนมัติ

---

## Tech Stack

| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS, Framer Motion |
| Backend | Python 3.12+, FastAPI, WebSocket, asyncio, Pydantic v2 |
| State | Zustand, Recharts |
| Communication | WebSocket (real-time bidirectional) |

---

## ความต้องการของระบบ

| ซอฟต์แวร์ | เวอร์ชันขั้นต่ำ | ตรวจสอบด้วย |
|-----------|---------------|------------|
| Python | 3.12+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Ollama *(optional)* | latest | `ollama --version` |

---

## เริ่มต้นใช้งาน

### วิธีที่ 1 — รันทุกอย่างด้วยคำสั่งเดียว (แนะนำ)

**Windows (PowerShell):**
```powershell
.\run.ps1
```

**macOS / Linux / Git Bash:**
```bash
bash run.sh
```

Script จะ:
1. ตรวจสอบ Python, Node.js, npm
2. สร้าง Python virtual environment (`.venv`) ถ้ายังไม่มี
3. `pip install` dependencies อัตโนมัติ
4. `npm install` dependencies อัตโนมัติ
5. สร้าง `.env` จาก `.env.example` ถ้ายังไม่มี
6. Start backend → `http://localhost:8000`
7. Start frontend → `http://localhost:3000`
8. รอจนกว่า backend พร้อม แล้วแสดง URL

กด **Ctrl+C** เพื่อหยุดทั้งสองบริการ

---

### วิธีที่ 2 — รันแยก (สำหรับ development)

#### Backend

```bash
cd back-end

# สร้าง virtual environment (ครั้งแรกเท่านั้น)
python -m venv .venv

# Activate
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# ติดตั้ง dependencies (ครั้งแรกเท่านั้น)
pip install -r requirements.txt

# สร้าง .env (ครั้งแรกเท่านั้น)
cp .env.example .env

# Start server
python main.py
```

Backend จะขึ้นที่ `http://localhost:8000`
API Docs อยู่ที่ `http://localhost:8000/docs`

#### Frontend

```bash
cd font-end

# ติดตั้ง dependencies (ครั้งแรกเท่านั้น)
npm install

# Start dev server
npm run dev
```

Frontend จะขึ้นที่ `http://localhost:3000`

---

## โครงสร้างโปรเจกต์

```
Multi_Agent_Local/
├── run.sh                     # Start script (bash)
├── run.ps1                    # Start script (PowerShell)
│
├── back-end/                  # FastAPI Orchestrator
│   ├── main.py                # Entry point (uvicorn server)
│   ├── requirements.txt
│   ├── .env.example           # Environment config template
│   ├── core/
│   │   ├── config.py          # Settings (pydantic-settings)
│   │   ├── websocket_manager.py  # WS connection pool
│   │   └── agent_registry.py  # In-memory agent state
│   ├── models/
│   │   ├── agent.py           # AgentState, HardwareMetrics
│   │   ├── task.py            # Task, TaskCreate
│   │   └── messages.py        # WebSocket message protocol
│   ├── routers/
│   │   ├── health.py          # GET /health
│   │   ├── agents.py          # GET /agents
│   │   ├── tasks.py           # POST /tasks, GET /tasks
│   │   └── ws.py              # WS /ws/dashboard, /ws/agent/{id}
│   └── services/
│       ├── orchestrator.py    # Task routing logic
│       └── ollama_client.py   # Async Ollama API wrapper
│
└── font-end/                  # Next.js Dashboard
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx        # Main dashboard page
    │   │   └── globals.css
    │   ├── components/
    │   │   ├── agents/         # AgentCard, HardwareMonitor, ModelInfoPanel
    │   │   ├── dashboard/      # LiveLogConsole
    │   │   ├── layout/         # Sidebar, TopBar
    │   │   ├── network/        # NetworkTopology (node graph)
    │   │   └── ui/             # GlowProgress, CircularGauge, TerminalLog...
    │   ├── hooks/
    │   │   ├── useBackendWS.ts # WebSocket client + auto-reconnect
    │   │   └── useSimulator.ts # Fallback simulation loop
    │   ├── store/
    │   │   └── agentStore.ts   # Zustand global state
    │   ├── lib/
    │   │   ├── mockData.ts     # Initial mock agents
    │   │   ├── simulator.ts    # Metric drift simulation
    │   │   └── utils.ts        # Helpers
    │   └── types/
    │       └── agent.ts        # TypeScript interfaces
    ├── .env.local              # Frontend environment variables
    └── tailwind.config.ts
```

---

## API Reference

### REST Endpoints

| Method | Path | คำอธิบาย |
|--------|------|---------|
| `GET` | `/health` | Health check → `{"status":"ok"}` |
| `GET` | `/health/detailed` | จำนวน agent, dashboard connections |
| `GET` | `/agents` | รายชื่อ agent ทั้งหมด |
| `GET` | `/agents/{id}` | ข้อมูล agent รายตัว |
| `POST` | `/tasks` | สร้าง task ใหม่ (auto-route หรือระบุ agent) |
| `GET` | `/tasks` | รายการ task ทั้งหมด |
| `GET` | `/tasks/{id}` | ข้อมูล task รายการ |
| `GET` | `/docs` | Swagger UI (interactive API docs) |

#### POST /tasks — ตัวอย่าง

```bash
curl -X POST http://localhost:8000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Summarize the following text...",
    "agent_id": null,
    "model": null
  }'
```

`agent_id: null` = orchestrator เลือก agent ที่ GPU load ต่ำสุดอัตโนมัติ

---

### WebSocket Protocol

#### Dashboard → `ws://localhost:8000/ws/dashboard`

รับ event ทุก update แบบ real-time

| Message type | ทิศทาง | คำอธิบาย |
|-------------|--------|---------|
| `agents.update` | Server → Dashboard | State ของ agent ทั้งหมด (broadcast ทุก heartbeat) |
| `task.update` | Server → Dashboard | อัพเดทสถานะ task |
| `task.token` | Server → Dashboard | Token streaming จาก agent |
| `log.entry` | Server → Dashboard | Log line จาก agent |
| `task.assign` | Dashboard → Server | ขอสร้าง task ใหม่ |
| `ping` / `pong` | สองทาง | Keepalive |

```json
// ตัวอย่าง: ส่ง task จาก dashboard
{
  "type": "task.assign",
  "payload": {
    "prompt": "Write unit tests for this function...",
    "agent_id": "alpha",
    "model": "llama3.1-8b"
  }
}
```

#### Agent → `ws://localhost:8000/ws/agent/{agent_id}`

| Message type | คำอธิบาย |
|-------------|---------|
| `agent.register` | แจ้งตัวเมื่อ connect ครั้งแรก |
| `agent.heartbeat` | ส่ง hardware metrics ทุก ~2 วินาที |
| `task.token` | ส่ง token ระหว่าง streaming |
| `task.complete` | แจ้งเมื่อ task เสร็จ |
| `task.failed` | แจ้งเมื่อ task ล้มเหลว |

```json
// ตัวอย่าง: agent ส่ง heartbeat
{
  "type": "agent.heartbeat",
  "payload": {
    "status": "thinking",
    "hardware": {
      "cpu_usage": 45.2,
      "gpu_usage": 87.0,
      "ram_used": 16.0,
      "ram_total": 32.0,
      "vram_used": 10.5,
      "vram_total": 12.0,
      "temperature": 78.0,
      "power_draw": 240.0
    },
    "model": {
      "name": "llama3.1-8b",
      "quantization": "Q4_K_M",
      "tokens_per_sec": 28.4,
      "context_size": 8192,
      "context_used": 4096,
      "active_task": "Summarizing customer feedback..."
    }
  }
}
```

---

## เชื่อมต่อ Agent จริง (Ollama)

เพื่อเชื่อมเครื่องที่รัน Ollama เข้าสู่ระบบ ให้สร้าง agent client script บนเครื่องนั้น:

```python
# agent_client.py — รันบนเครื่อง Ollama แต่ละเครื่อง
import asyncio, json, time, httpx, websockets

ORCHESTRATOR_WS = "ws://192.168.1.100:8000/ws/agent/my-agent-id"
OLLAMA_URL = "http://localhost:11434"
AGENT_ID = "my-agent-id"

async def get_metrics():
    # ดึง metrics จาก OS / nvidia-smi ตามระบบปฏิบัติการ
    return {
        "cpu_usage": 40.0,
        "gpu_usage": 75.0,
        "ram_used": 8.0,
        "ram_total": 16.0,
        "vram_used": 6.0,
        "vram_total": 8.0,
        "temperature": 72.0,
        "power_draw": 180.0,
    }

async def run():
    async with websockets.connect(ORCHESTRATOR_WS) as ws:
        # Register
        await ws.send(json.dumps({
            "type": "agent.register",
            "payload": {
                "name": "My Agent",
                "hostname": "my-machine",
                "ip_address": "192.168.1.200",
                "model": {"name": "llama3.1-8b", "quantization": "Q4_K_M"},
                "hardware": await get_metrics(),
            }
        }))

        # Heartbeat loop
        while True:
            await ws.send(json.dumps({
                "type": "agent.heartbeat",
                "payload": {
                    "status": "idle",
                    "hardware": await get_metrics(),
                    "model": {"name": "llama3.1-8b", "tokens_per_sec": 0},
                }
            }))
            await asyncio.sleep(2)

asyncio.run(run())
```

---

## Environment Variables

### Backend — `back-end/.env`

| Variable | Default | คำอธิบาย |
|----------|---------|---------|
| `HOST` | `0.0.0.0` | IP ที่ server ฟัง |
| `PORT` | `8000` | Port ของ server |
| `DEBUG` | `true` | เปิด debug logging |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS origins (คั่นด้วย `,`) |
| `OLLAMA_DEFAULT_PORT` | `11434` | Port ของ Ollama บนเครื่อง agent |
| `OLLAMA_TIMEOUT` | `120` | Timeout (วินาที) สำหรับ inference |
| `AGENT_HEARTBEAT_TIMEOUT` | `15` | วินาทีที่ไม่ได้รับ heartbeat แล้วถือว่า offline |

### Frontend — `font-end/.env.local`

| Variable | Default | คำอธิบาย |
|----------|---------|---------|
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000/ws/dashboard` | WebSocket URL |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | REST API URL |

---

## Dashboard Features

| Feature | คำอธิบาย |
|---------|---------|
| Agent Cards | แสดง status, hardware metrics, model info, logs แบบ real-time |
| Hardware Monitoring | CPU / GPU / RAM / VRAM gauge + sparkline chart |
| Network Topology | Node graph แสดง agent-to-agent connections + data packet animation |
| Live Log Console | Aggregated logs จากทุก agent พร้อม filter |
| WS Status Badge | แสดง `LIVE` เมื่อเชื่อม backend / `SIMULATED` เมื่อออฟไลน์ |
| Simulation Fallback | เมื่อ backend ออฟไลน์ ข้อมูลจะถูก simulate อัตโนมัติ |
| Grid / Network View | สลับระหว่าง card grid และ network topology view |

---

## Troubleshooting

**Backend ไม่ start**
```bash
# ตรวจสอบว่า port ไม่ถูกใช้งาน
# Windows:
netstat -ano | findstr :8000
# macOS/Linux:
lsof -i :8000
```

**Frontend แสดง SIMULATED แทน LIVE**
- ตรวจสอบว่า backend ทำงานอยู่: `curl http://localhost:8000/health`
- ตรวจสอบ `font-end/.env.local` ว่า `NEXT_PUBLIC_WS_URL` ถูกต้อง
- ตรวจสอบ CORS ใน `back-end/.env` ว่ามี `http://localhost:3000`

**pip install ล้มเหลว**
```bash
# อัพเกรด pip ก่อน
python -m pip install --upgrade pip
pip install -r requirements.txt
```

**npm install ล้มเหลว**
```bash
# ลบ cache แล้วลงใหม่
cd font-end
rm -rf node_modules package-lock.json
npm install
```

---

## Roadmap

- [ ] Agent client library (Python) สำเร็จรูปสำหรับเชื่อมเครื่อง Ollama
- [ ] React Flow สำหรับ interactive network graph (drag/zoom)
- [ ] PostgreSQL + Redis สำหรับ persistent storage
- [ ] Task queue ด้วย priority routing
- [ ] Multi-model load balancing
- [ ] Docker Compose สำหรับ deploy ทั้งระบบ
- [ ] Agent detail side panel
- [ ] Workflow visual editor

---

## License

MIT
