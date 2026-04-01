<div align="center">

# 🎭 WhatsArt

**WhatsApp-based CRM & Campaign Manager**

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-9-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Web.js-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)

</div>

---

## 📋 Overview

WhatsArt is a full-stack WhatsApp automation platform designed for theatre management. It enables staff to manage customer conversations, broadcast campaign messages, and provide AI-powered event information — all through a sleek web dashboard connected to WhatsApp.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 💬 **Live Chat** | Real-time WhatsApp messaging with reply, media support & read receipts |
| 📢 **Campaigns** | Schedule & broadcast bulk messages with media attachments |
| 🤖 **AI Assistant** | GPT-4o-mini powered bot answering event queries from iTicket.az |
| 📊 **Dashboard** | Statistics, activity feed & device status at a glance |
| 👥 **Contacts** | Contact management synced with WhatsApp conversations |
| 🔍 **Event Scraper** | Live iTicket.az integration for theatre event data |

---

## 🏗️ Architecture

```
whatsart/
├── backend/                 # Node.js + Express 5 API
│   ├── config/              # Database configuration
│   ├── models/              # Mongoose schemas (User, Contact, Message, Campaign)
│   ├── routes/              # REST API endpoints
│   │   ├── whatsappRoutes   # WhatsApp, contacts, messages, media
│   │   ├── campaignRoutes   # Campaign CRUD & scheduling
│   │   └── aiRoutes         # AI text enhancement
│   ├── services/
│   │   ├── whatsappService  # WhatsApp Web.js client management
│   │   ├── aiService        # OpenAI GPT integration
│   │   ├── scraperService   # Event scraper
│   │   ├── campaignRunner   # Background campaign scheduler
│   │   └── logger           # Centralized logging with rotation
│   └── server.js            # Express app entry point
│
├── frontend/                # React 19 + Vite 8 SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/      # AppLayout (sidebar, navigation)
│   │   │   ├── common/      # LoadingScreens, shared UI
│   │   │   ├── chat/        # ChatSidebar, MessageBubble, ChatInput
│   │   │   └── campaign/    # ContactPickerModal
│   │   ├── pages/           # Dashboard, ChatLogs, Campaigns
│   │   └── config/          # API base URL configuration
│   └── vite.config.js       # Vite + dev proxy configuration
│
├── Dockerfile               # Multi-stage production build
├── railway.toml             # Railway deployment config
└── .dockerignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+
- **MongoDB** (local or cloud — e.g. MongoDB Atlas / Railway)
- **OpenAI API Key** for AI features

### 1. Clone & Install

```bash
git clone https://github.com/your-username/whatsart.git
cd whatsart

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 2. Configure Environment

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/whatsart
OPENAI_API_KEY=sk-your-openai-key
KASSA_PHONE=994XXXXXXXXX
```

### 3. Run Development

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173** → Scan the QR code with WhatsApp → Done! 🎉

---

## 🌐 Deployment (Railway)

The project is configured for **single-service Railway deployment** where the backend serves the built frontend.

### Steps

1. Push code to GitHub
2. Create a new Railway project → connect your repo
3. Add environment variables:

| Variable | Value |
|----------|-------|
| `MONGO_URI` | Your MongoDB connection string |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `KASSA_PHONE` | Kassa notification phone number |
| `NODE_ENV` | `production` |

4. Railway will auto-detect the `Dockerfile` and build

> ✅ WhatsApp session is stored in MongoDB via `RemoteAuth`. No QR re-scan needed after redeployment!

---

## 🔧 Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Express 5 | HTTP server & REST API |
| whatsapp-web.js | WhatsApp Web client (Puppeteer-based) |
| Mongoose 9 | MongoDB ODM |
| OpenAI SDK | GPT-4o-mini chat completions |
| Multer | File upload handling |
| Cheerio | HTML parsing (scraper fallback) |

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 19 | UI framework |
| Vite 8 | Build tool & dev server |
| React Router 7 | Client-side routing |
| Lucide React | Icon library |
| Axios | HTTP client |

---

## 📡 API Endpoints

### WhatsApp
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/whatsapp/status` | Connection status |
| `GET` | `/api/whatsapp/status-stream` | SSE real-time status |
| `GET` | `/api/whatsapp/contacts` | List contacts |
| `GET` | `/api/whatsapp/device-messages/:phone` | Chat messages |
| `POST` | `/api/whatsapp/send-device-message` | Send message |
| `POST` | `/api/whatsapp/logout` | Disconnect session |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/campaigns` | List campaigns |
| `POST` | `/api/campaigns` | Create campaign |
| `PUT` | `/api/campaigns/:id` | Update campaign |
| `DELETE` | `/api/campaigns/:id` | Delete campaign |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server health check (Railway) |

---

## 📄 License

This project is proprietary software.

---

<div align="center">
  <sub>Built with ❤️ for the art of theatre</sub>
</div>
