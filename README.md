<div align="center">

# ⚡ Sportz

**A production-grade real-time sports data platform built with Node.js, WebSockets, and PostgreSQL.**

[![Node.js](https://img.shields.io/badge/-Node.js-339933?style=for-the-badge&logo=Node.js&logoColor=white)](https://nodejs.org/)
[![Express 5](https://img.shields.io/badge/-Express_5-000000?style=for-the-badge&logo=Express&logoColor=white)](https://expressjs.com/)
[![WebSockets](https://img.shields.io/badge/-WebSockets-010101?style=for-the-badge&logo=Socket.io&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![React](https://img.shields.io/badge/-React-61DAFB?style=for-the-badge&logo=React&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/-PostgreSQL-4169E1?style=for-the-badge&logo=PostgreSQL&logoColor=white)](https://www.postgresql.org/)
[![Drizzle](https://img.shields.io/badge/-Drizzle-C5F74F?style=for-the-badge&logo=Drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Zod](https://img.shields.io/badge/-Zod-3E67B1?style=for-the-badge&logo=Zod&logoColor=white)](https://zod.dev/)
[![Arcjet](https://img.shields.io/badge/-Arcjet-5C2D91?style=for-the-badge&logo=Arcjet&logoColor=white)](https://arcjet.com/)
[![Site24x7](https://img.shields.io/badge/-Site24x7-26CD66?style=for-the-badge&logo=Site24x7&logoColor=white)](https://www.site24x7.com/)

</div>

---

## Table of Contents

1. [Overview](#-overview)
2. [Live Preview](#-live-preview)
3. [Architecture](#-architecture)
4. [Tech Stack](#️-tech-stack)
5. [Features](#-features)
6. [Quick Start](#-quick-start)
7. [REST API Reference](#-rest-api-reference)
8. [WebSocket Protocol](#-websocket-protocol)
9. [Security — Arcjet Bot Protection](#-security--arcjet-bot-protection)
10. [Monitoring — Site24x7 APM](#-monitoring--site24x7-apm)
11. [Scaling to Multi-Instance](#-scaling-to-multi-instance)
12. [Environment Variables](#-environment-variables)
13. [Project Structure](#-project-structure)

---

## Overview

**Sportz** is a backend service built for live sports coverage. It exposes REST endpoints for match and commentary management and uses WebSockets to push real-time score and play-by-play updates to connected clients with zero polling overhead.

Key engineering properties:

- **Strict input validation** via Zod schemas on every REST and WS message
- **Backpressure protection** — closes sockets whose buffer exceeds 1 MB
- **Rate limiting** built into the WS layer (20 burst, 10 msg/sec)
- **Application-layer bot protection** via Arcjet, blocking automated scrapers and credential-stuffing bots before they hit business logic
- **Live observability** through Site24x7 APM with Apdex, error rate, and per-component response time tracking
- **GitHub Copilot** used for boilerplate and beginner tasks, keeping engineering focus on architecture and business logic

---

## Live Preview

> ![Live Commentary UI](assets/sportz_live_commentary.png)
> *Real-time match commentary feed rendered in the React client via WebSocket subscription*

---

## Architecture

### Single-Server (Current)

```
Client (React)
    │
    ├── HTTP  ──►  Express REST API  ──►  Drizzle ORM  ──►  PostgreSQL
    │
    └── WS    ──►  ws Server
                      │
                      ├── Subscribe / Unsubscribe
                      ├── Heartbeat (ping/pong)
                      ├── Rate limiter
                      └── Backpressure guard
```

### Multi-Instance Horizontal Scaling (Recommended for Production)

When scaling horizontally, individual servers don't share WebSocket state. A Pub/Sub broker (Redis / NATS / Kafka) bridges that gap so every server instance receives and forwards every broadcast regardless of which instance the originating client is connected to.

> ![Pub/Sub Pattern](assets/pubsub_pattern.png)
> *Redis Pub/Sub pattern for multi-instance WebSocket broadcasting — servers publish events to a shared channel, and all subscribers receive them in real time*

**Data flow:**

1. User A triggers a score update → Server 1 receives it
2. Server 1 **publishes** the event to the Redis `AAPL` channel
3. Server 2 (subscribed to the same channel) receives the broadcast from Redis
4. Server 2 **pushes** the update to its own connected clients

This decouples servers completely — Server 1 never needs to know Server 2 exists.

> **Note:** Auth is intentionally omitted in this project to keep focus on WebSocket mechanics and architecture.

---

## Tech Stack

| Layer | Technology | Role |
|---|---|---|
| Runtime | Node.js | JavaScript execution environment |
| Framework | Express 5 | REST API server |
| Real-time | WS (ws library) | WebSocket server (full-duplex) |
| UI | React | Client-side real-time frontend |
| Database | PostgreSQL | Persistent match and commentary storage |
| ORM | Drizzle ORM + Kit | Type-safe DB queries and schema migrations |
| Validation | Zod | Runtime schema validation for REST + WS |
| Security | Arcjet | Bot protection, rate limiting, sensitive data masking |
| Monitoring | Site24x7 | APM, uptime tracking, response time analysis |
| Dev tooling | GitHub Copilot | Boilerplate generation for beginner coding tasks |
| Config | dotenv | Environment variable management |
| CORS | cors | Cross-Origin Resource Sharing middleware |

---

## Features

- **Match Management** — Create matches, track scores, and manage match status (`scheduled → live → finished`) automatically derived from `startTime` / `endTime`
- **Commentary Management** — Per-match play-by-play commentary with full event metadata (minute, period, actor, team, event type, tags)
- **Real-Time Broadcasts** — Per-match WebSocket subscriptions push commentary and score updates to clients instantly
- **Structured WS Protocol** — Subscribe, unsubscribe, bulk `setSubscriptions`, and ping/pong all handled with typed message envelopes
- **Heartbeat System** — Keeps idle connections alive; detects and cleans up dead clients
- **Backpressure Protection** — Prevents memory exhaustion by dropping sockets that can't consume data fast enough
- **Rate Limiting** — Per-socket message rate enforcement (20 burst / 10 per second)
- **Strict Input Validation** — Zod schemas enforce shape and types on every inbound REST request and WS message
- **Seed Tooling** — Dedicated seed script to populate matches and simulate live commentary for local development and testing

---

## Quick Start

### Prerequisites

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en) (v18+)
- [npm](https://www.npmjs.com/)
- A running PostgreSQL instance

### 1. Clone the Repository

```bash
git clone https://github.com/Ruturaj-007/sportz.git
cd sportz
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file at the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sportz

# Server
PORT=8000
HOST=0.0.0.0

# Arcjet
ARCJET_KEY=""
ARCJET_ENV="development"

# API
API_URL="http://localhost:8000"
# API_URL="YOUR_PRODUCTION_URL"

# Seeder config
BROADCAST="1"
DELAY_MS="250"
MATCH_COUNT="0"
```

### 4. Run Migrations

```bash
npm run db:push
```

### 5. Start the Server

```bash
npm run dev
```

| Service | URL |
|---|---|
| HTTP API | `http://localhost:8000` |
| WebSocket | `ws://localhost:8000/ws` |
| React Client | `http://localhost:3000` |

### Available Scripts

```bash
npm run dev      # Start server in watch mode
npm run seed     # Seed DB with a basic match + commentary entry
npm run db:push  # Push Drizzle schema to the database
```

---

## REST API Reference

### Matches

#### `GET /matches`

List all matches.

```
GET /matches?limit=50
```

**Response** — Array of match objects with computed `status`.

---

#### `POST /matches`

Create a new match.

```json
{
  "sport": "football",
  "homeTeam": "FC Neon",
  "awayTeam": "Drizzle United",
  "startTime": "2025-02-01T12:00:00.000Z",
  "endTime": "2025-02-01T13:45:00.000Z"
}
```

Status (`scheduled` | `live` | `finished`) is **computed** from `startTime` and `endTime` — do not pass it manually.

---

### Commentary

#### `GET /matches/:id/commentary`

List commentary for a match.

```
GET /matches/:id/commentary?limit=100
```

---

#### `POST /matches/:id/commentary`

Add a commentary entry to a live match.

```json
{
  "minute": 42,
  "sequence": 120,
  "period": "2nd half",
  "eventType": "goal",
  "actor": "Alex Morgan",
  "team": "FC Neon",
  "message": "GOAL! Powerful finish from the edge of the box.",
  "metadata": { "assist": "Sam Kerr" },
  "tags": ["goal", "shot"]
}
```

> Only `live` matches accept new commentary. Attempts on `scheduled` or `finished` matches return a `409 Conflict`.

---

## WebSocket Protocol

### Connection

```
ws://localhost:8000/ws
```

Auto-subscribe to a match on connect:

```
ws://localhost:8000/ws?matchId=123
```

---

### Client → Server Messages

| Type | Payload | Description |
|---|---|---|
| `subscribe` | `{ matchId: number }` | Subscribe to a match's live feed |
| `unsubscribe` | `{ matchId: number }` | Unsubscribe from a match |
| `setSubscriptions` | `{ matchIds: number[] }` | Replace all active subscriptions atomically |
| `ping` | — | Keepalive ping |

---

### Server → Client Messages

| Type | Description |
|---|---|
| `welcome` | Sent immediately after connection is established |
| `subscribed` | Confirms subscription to `matchId` |
| `unsubscribed` | Confirms removal of subscription |
| `subscriptions` | Full list of current active subscriptions |
| `commentary` | Live commentary event broadcast |
| `pong` | Response to client `ping` |
| `error` | Structured error with `code`, `message`, and optional `matchIds` |

**Commentary broadcast example:**

```json
{
  "type": "commentary",
  "data": {
    "id": 1,
    "matchId": 123,
    "minute": 42,
    "message": "GOAL! Powerful finish from the edge of the box.",
    "eventType": "goal"
  }
}
```

**Error example:**

```json
{
  "type": "error",
  "code": "match_not_found",
  "message": "Match 999 not found",
  "matchIds": [999]
}
```

---

### WS Limits

| Limit | Value |
|---|---|
| Max subscriptions per socket | 50 |
| Rate limit | 20 burst / 10 msg/sec |
| Max message payload | 1 MB |
| Backpressure threshold | 1 MB buffered → socket closed |

---

## 🛡 Security — Arcjet Bot Protection

Arcjet is embedded at the application layer to block automated clients — scrapers, credential-stuffing bots, and aggressive API crawlers — before they hit business logic or inflate compute costs.

> ![Arcjet Bot Protection](assets/bot_protection_arcjet.png)
> *Arcjet `BOT_V2` engine blocking a bot attempting `POST /api/v1/auth/sign-in` — the request arrived with completely empty headers, a definitive automated script fingerprint. Arcjet returned `403 Forbidden` instantly.*

**How detection works:**

- **User-Agent analysis** — Flags non-browser or missing UA strings
- **IP reputation** — Cross-references known malicious IP ranges
- **Header fingerprinting** — Real browsers always send `User-Agent`, `Accept-Language`, `Host`, etc. Empty headers (`headers: {}`) are an unambiguous bot signal
- **`BOT_V2` engine** — Arcjet's updated detection layer that evaluates all signals together for a `DENY` / `ALLOW` verdict

Protection is applied to sensitive routes (auth, commentary write) where automated abuse is highest risk.

---

## Monitoring — Site24x7 APM

Site24x7 provides real-time application performance monitoring with Apdex scoring, per-component latency breakdown, and uptime tracking.

> ![Site24x7 APM Dashboard](assets/site24x7_Application_Performance_Metrics.png)
> *24-hour APM view: Apdex 0.994, avg response 140 ms, 28.41K total requests — with a `NODEJS-CORE` spike to 5,796 ms isolated at 08:39 AM*

**Key metrics tracked:**

| Metric | Value | Notes |
|---|---|---|
| Apdex Score | 0.994 | 100% satisfied users, 0% frustrated |
| Avg Response Time | 140 ms | Healthy baseline |
| Throughput | 19.7 rpm | 28.41K requests over 24h |
| Error Rate | 2.1% | Minor edge cases flagged for debugging |

**Bottleneck identification:**

During a peak traffic spike at 08:39 AM, the `NODEJS-CORE` component accounted for 5,796 ms of latency vs. just 4 ms for `createServer`. This points directly to event-loop blocking or a heavy synchronous task in the Node.js backend — exactly the kind of signal that's invisible without component-level APM breakdown.

**Uptime:**

The events timeline captured multiple short outages between 08:00–09:00 PM, a prolonged gap around 03:00 AM, and frequent drop-offs between 06:00–12:00 PM — all pinpointed to the minute for targeted debugging.

---

## Scaling to Multi-Instance

The current architecture runs on a single server. For horizontal scaling:

**The problem:** Multiple Node.js instances don't share WebSocket subscription state. A broadcast on Server 1 never reaches clients on Server 2.

**The solution:** Introduce Redis (or NATS / Kafka) as a shared Pub/Sub broker:

```bash
npm install ioredis
```

```js
// publisher (any server that receives a commentary write)
await redis.publish(`match:${matchId}`, JSON.stringify(commentaryPayload));

// subscriber (all WS server instances on startup)
redisSub.subscribe(`match:${matchId}`);
redisSub.on('message', (channel, message) => {
  broadcastToLocalClients(channel, JSON.parse(message));
});
```

Every server subscribes to Redis. When any instance publishes, all others receive it and forward to their locally connected clients. Server count becomes irrelevant to delivery guarantees.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `PORT` | ✅ | HTTP server port (default: `8000`) |
| `HOST` | ✅ | Bind address (default: `0.0.0.0`) |
| `ARCJET_KEY` | ✅ | Arcjet project API key |
| `ARCJET_ENV` | ✅ | `development` or `production` |
| `API_URL` | ✅ | Base URL used by the seeder and client |
| `BROADCAST` | ❌ | Enable WS broadcast in seeder (`1` = on) |
| `DELAY_MS` | ❌ | Delay between seeder events in ms |
| `MATCH_COUNT` | ❌ | Number of matches to seed (`0` = existing) |

---

## Project Structure

```
sportz/
├── src/
│   ├── config/          # Drizzle, Arcjet, env config
│   ├── db/
│   │   ├── schema/      # Drizzle table definitions
│   │   └── index.ts     # DB client
│   ├── routes/
│   │   ├── matches.ts   # GET/POST /matches
│   │   └── commentary.ts# GET/POST /matches/:id/commentary
│   ├── ws/
│   │   ├── server.ts    # ws server setup, heartbeat, backpressure
│   │   ├── handlers.ts  # subscribe / unsubscribe / setSubscriptions
│   │   └── broadcast.ts # push to all subscribed sockets
│   ├── validators/      # Zod schemas for REST + WS messages
│   └── index.ts         # Express + WS bootstrap
├── scripts/
│   └── seed.ts          # Match + commentary seeder
├── assets/              # Project screenshots and diagrams
├── drizzle.config.ts
├── .env.example
└── package.json
```

---

<div align="center">

Built with Node.js, Express, WebSockets, PostgreSQL, and Arcjet.

</div>