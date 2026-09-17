# ChatNexus — API (Express + MongoDB)

## What it is

REST + Socket.IO backend for **ChatNexus**: multi-tenant style applications, channels, integrations, users, and request logging. Built with TypeScript for a clean, production-oriented API surface.

Companion web app: [`chatnexus-web`](https://github.com/omarkily/chatnexus-web)

## Stack

- **Node.js** + **Express** + **TypeScript**
- **MongoDB** via Mongoose
- **JWT** auth (+ optional master API keys)
- **Socket.IO** for realtime events
- Helmet, CORS, Morgan, bcrypt

## API surface (high level)

- Auth — register / login / JWT
- Users — profile & password updates
- Applications — app registry for integrations
- Channels — messaging channels
- Integrations — provider connections
- Accounts — linked accounts
- Request logs — API activity trail
- Realtime — Socket.IO hub

## Quick start

```bash
cp .env.example .env
# edit MONGO_URI + JWT_SECRET

npm install
npm run dev
```

API default: [http://localhost:3001](http://localhost:3001)

Optional helpers:

```bash
npm run initdb
npm run generate-master-key
```

## Environment

Copy `.env.example` → `.env`. All values are placeholders — never commit real secrets.

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | no | Default `3001` |
| `MONGO_URI` | yes | Mongo connection string |
| `JWT_SECRET` | yes | Signing secret |
| `JWT_EXPIRES_IN` | no | Default `24h` |
| `CORS_ORIGIN` | no | Frontend origin(s) |
| `MASTER_KEYS` | no | Comma-separated bypass keys |
| `LOG_LEVEL` | no | `debug` / `info` / … |

## Project layout

```
src/
  config/        # DB + Socket.IO
  controllers/   # HTTP handlers
  middlewares/   # auth, logging, errors
  models/        # Mongoose schemas
  routes/        # Express routers
  services/      # Business logic
  scripts/       # DB / key helpers
  utils/         # logger, errors, constants
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | TS watch server |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled server |
| `npm run initdb` | Seed/init helpers |
| `npm run generate-master-key` | Append a master key to `.env` |

## Security notes

- `.env` is gitignored; only `.env.example` is published
- Passwords are bcrypt-hashed
- Use strong `JWT_SECRET` and rotate any leaked keys

## License

ISC
