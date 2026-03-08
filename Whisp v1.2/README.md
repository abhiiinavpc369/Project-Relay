# Project Relay

Project Relay is a full-fledged chatting website rebuilt from zero.

## Tech Stack
- Frontend: Next.js + Tailwind CSS
- Backend: Node.js + Express + Socket.IO
- Database: PostgreSQL + Prisma

## Theme
- Green
- Blue
- Darkgrey
- Black
- Yellow
- White

## Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open: `http://localhost:3000`