# ⚽ Sportz

A real-time sports match tracking API with live commentary, built on **Express 5**, **WebSockets**, and **PostgreSQL**.

Clients can create matches, post play-by-play commentary, and receive instant updates through a persistent WebSocket connection — making it ideal for live scoreboards, sports tickers, and fan-facing dashboards.

---

## ✨ Features

| Category | Details |
|---|---|
| **REST API** | Create & list matches, post & fetch live commentary |
| **Real-Time** | WebSocket server with per-match subscription channels |
| **Database** | PostgreSQL with Drizzle ORM and migration tooling |
| **Validation** | Request schemas enforced with Zod v4 |
| **Security** | Arcjet integration — rate limiting, bot detection, and shield protection |
| **Monitoring** | APM Insight agent for application performance monitoring |

---

## 🏗️ Tech Stack

- **Runtime** — Node.js (ES Modules)
- **Framework** — [Express 5](https://expressjs.com/)
- **WebSockets** — [ws](https://github.com/websockets/ws)
- **ORM** — [Drizzle ORM](https://orm.drizzle.team/) (PostgreSQL dialect)
- **Validation** — [Zod 4](https://zod.dev/)
- **Security** — [Arcjet](https://arcjet.com/) (shield, bot detection, sliding-window rate limiting)
- **APM** — [APM Insight](https://www.site24x7.com/apm-insight.html)
- **Package Manager** — pnpm

---

## 📁 Project Structure

```
sportz/
├── drizzle/                    # Generated SQL migrations
│   └── meta/                   # Drizzle migration metadata
├── src/
│   ├── index.js                # App entrypoint — Express + HTTP server + WS bootstrap
│   ├── arcjet.js               # Arcjet security configuration (HTTP & WS)
│   ├── db/
│   │   ├── db.js               # PostgreSQL connection pool & Drizzle instance
│   │   └── schema.js           # Database schema (matches & commentary tables)
│   ├── routes/
│   │   ├── matches.routes.js   # GET / POST  /matches
│   │   └── commentary.routes.js# GET / POST  /matches/:id/commentary
│   ├── utils/
│   │   └── match-status.js     # Derives match status from start/end times
│   ├── validation/
│   │   ├── matches.js          # Zod schemas for match payloads & query params
│   │   └── commentary.js       # Zod schemas for commentary payloads
│   └── ws/
│       └── server.js           # WebSocket server — subscriptions, broadcasting, heartbeat
├── drizzle.config.js           # Drizzle Kit configuration
├── package.json
└── .env                        # Environment variables (not committed)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 10
- **PostgreSQL** instance (local or hosted, e.g. [Neon](https://neon.tech/))

### 1. Clone the repository

```bash
git clone https://github.com/tunde-james/sportz-websocket.git
cd sportz-websocket
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# Server
PORT=8000
HOST=0.0.0.0

# Arcjet (https://arcjet.com)
ARCJET_KEY=your_arcjet_key
ARCJET_ENV=development
```

### 4. Run database migrations

```bash
pnpm db:generate   # Generate migration SQL from schema
pnpm db:migrate    # Apply migrations to the database
```

### 5. Start the server

```bash
# Development (auto-restart on file changes)
pnpm dev

# Production
pnpm start
```

The server will start on `http://localhost:8000` with the WebSocket endpoint at `ws://localhost:8000/ws`.

---

## 📡 REST API Reference

### Health Check

```
GET /
```

**Response** `200`

```json
{ "message": "Server is up and running." }
```

---

### Matches

#### List Matches

```
GET /matches?limit=50
```

| Query Param | Type | Default | Description |
|---|---|---|---|
| `limit` | `integer` | `50` | Max results to return (capped at 100) |

**Response** `200`

```json
{
  "data": [
    {
      "id": 1,
      "sport": "football",
      "homeTeam": "PSG",
      "awayTeam": "Chelsea",
      "status": "live",
      "startTime": "2026-03-05T15:00:00.000Z",
      "endTime": "2026-03-05T17:00:00.000Z",
      "homeScore": 1,
      "awayScore": 3,
      "createdAt": "2026-03-05T12:00:00.000Z"
    }
  ]
}
```

#### Create Match

```
POST /matches
Content-Type: application/json
```

**Request Body**

```json
{
  "sport": "football",
  "homeTeam": "PSG",
  "awayTeam": "Chelsea",
  "startTime": "2026-03-05T15:00:00Z",
  "endTime": "2026-03-05T17:00:00Z",
  "homeScore": 0,
  "awayScore": 0
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `sport` | `string` | ✅ | Sport type (e.g. football, basketball) |
| `homeTeam` | `string` | ✅ | Home team name |
| `awayTeam` | `string` | ✅ | Away team name |
| `startTime` | `ISO 8601` | ✅ | Match start time |
| `endTime` | `ISO 8601` | ✅ | Match end time (must be after `startTime`) |
| `homeScore` | `integer` | ❌ | Home team score (default: `0`) |
| `awayScore` | `integer` | ❌ | Away team score (default: `0`) |

**Response** `201`

```json
{
  "data": { "id": 1, "sport": "football", "...": "..." }
}
```

> Match `status` is automatically computed as `scheduled`, `live`, or `finished` based on `startTime` / `endTime` relative to the current time.

---

### Commentary

#### List Commentary

```
GET /matches/:id/commentary?limit=10
```

| Query Param | Type | Default | Description |
|---|---|---|---|
| `limit` | `integer` | `10` | Max results to return (capped at 100) |

**Response** `200`

```json
{
  "data": [
    {
      "id": 1,
      "matchId": 1,
      "minute": 23,
      "sequence": 1,
      "period": "first_half",
      "eventType": "goal",
      "actor": "Joao Pedro",
      "team": "Chelsea",
      "message": "GOAL! Joao Pedro scores from inside the box!",
      "metadata": { "assistedBy": "Cole Palmer" },
      "tags": ["goal", "highlight"],
      "createdAt": "2026-03-05T15:23:00.000Z"
    }
  ]
}
```

#### Create Commentary

```
POST /matches/:id/commentary
Content-Type: application/json
```

**Request Body**

```json
{
  "message": "GOAL! Joao Pedro from inside the box!",
  "minute": 23,
  "sequence": 1,
  "period": "first_half",
  "eventType": "goal",
  "actor": "Joao Pedro",
  "team": "Chelsea",
  "metadata": { "assistedBy": "Cole Palmer" },
  "tags": ["goal", "highlight"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `string` | ✅ | Commentary text |
| `minute` | `integer` | ❌ | Match minute |
| `sequence` | `integer` | ❌ | Ordering sequence number |
| `period` | `string` | ❌ | Match period (e.g. `first_half`) |
| `eventType` | `string` | ❌ | Event type (e.g. `goal`, `foul`, `card`) |
| `actor` | `string` | ❌ | Player or person involved |
| `team` | `string` | ❌ | Team associated with the event |
| `metadata` | `object` | ❌ | Arbitrary key-value metadata |
| `tags` | `string[]` | ❌ | Searchable tags |

**Response** `201`

```json
{
  "data": { "id": 1, "matchId": 1, "message": "...", "...": "..." }
}
```

---

## 🔌 WebSocket API

Connect to the WebSocket server at:

```
ws://localhost:8000/ws
```

### Connection Flow

1. Client connects → receives a `welcome` message
2. Client subscribes to specific match IDs
3. Server pushes real-time `match_created` and `commentary` events
4. Server sends periodic `ping` frames (30s interval) to keep connections alive

### Client → Server Messages

#### Subscribe to a match

```json
{ "type": "subscribe", "matchId": 1 }
```

**Response:**

```json
{ "type": "subscribed", "matchId": 1 }
```

#### Unsubscribe from a match

```json
{ "type": "unsubscribe", "matchId": 1 }
```

**Response:**

```json
{ "type": "unsubscribed", "matchId": 1 }
```

### Server → Client Events

#### New match created (broadcast to all)

```json
{
  "type": "match_created",
  "data": {
    "id": 1,
    "sport": "football",
    "homeTeam": "Arsenal",
    "awayTeam": "Chelsea",
    "status": "scheduled",
    "...": "..."
  }
}
```

#### New commentary (broadcast to match subscribers)

```json
{
  "type": "commentary",
  "data": {
    "id": 1,
    "matchId": 1,
    "message": "GOAL! Joao Pedro scores!",
    "minute": 23,
    "...": "..."
  }
}
```

---

## 🛡️ Security

Sportz uses [Arcjet](https://arcjet.com/) with three layers of protection:

| Layer | HTTP | WebSocket |
|---|---|---|
| **Shield** | ✅ | ✅ |
| **Bot Detection** | ✅ (allows search engines & previews) | ✅ |
| **Rate Limiting** | 50 req / 10s (sliding window) | 5 req / 2s (sliding window) |

Set `ARCJET_MODE=DRY_RUN` in your `.env` to log decisions without enforcing them during development.

---

## 🗄️ Database Schema

### `matches`

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` | Primary key |
| `sport` | `text` | Not null |
| `home_team` | `text` | Not null |
| `away_team` | `text` | Not null |
| `status` | `enum` | `scheduled` · `live` · `finished` (default: `scheduled`) |
| `start_time` | `timestamp` | |
| `end_time` | `timestamp` | |
| `home_score` | `integer` | Default: `0` |
| `away_score` | `integer` | Default: `0` |
| `created_at` | `timestamp` | Auto-set |

### `commentary`

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` | Primary key |
| `match_id` | `integer` | Foreign key → `matches.id` |
| `minute` | `integer` | |
| `sequence` | `integer` | |
| `period` | `text` | |
| `event_type` | `text` | |
| `actor` | `text` | |
| `team` | `text` | |
| `message` | `text` | Not null |
| `metadata` | `jsonb` | |
| `tags` | `text[]` | |
| `created_at` | `timestamp` | Auto-set |

---

## 📜 Scripts

| Script | Command | Description |
|---|---|---|
| **Dev** | `pnpm dev` | Start with `--watch` for auto-restart |
| **Start** | `pnpm start` | Start in production mode |
| **Generate** | `pnpm db:generate` | Generate Drizzle migration files |
| **Migrate** | `pnpm db:migrate` | Apply pending migrations |
| **Studio** | `pnpm db:studio` | Open Drizzle Studio (visual DB browser) |

---

## 📄 License

ISC
