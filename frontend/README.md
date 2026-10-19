# ACP App Boilerplate

Minimal full-stack starter for the Advanced Computer Programming class, Department of Robotics and AI Engineering, KMITL.

## Stack

- Next.js Pages Router
- React
- shadcn-style UI components with Tailwind CSS
- Native `fetch()` for API calls
- FastAPI
- PostgreSQL
- Docker Compose

## Run

```bash
git clone https://github.com/syanyong/acpapp.git
cd acpapp
docker compose up --build
```

Open:

- Frontend: `http://localhost:3000`
- FastAPI: `http://localhost:8000`
- FastAPI docs: `http://localhost:8000/docs`

## Demo login

- Email: `demo@example.com`
- Password: `password`

The demo password is stored as a bcrypt hash in PostgreSQL.

## Pages

- `/` — static landing page with example user cards
- `/login` — login form using native `fetch()`

## API

### POST `/api/login`

Request:

```json
{
  "email": "demo@example.com",
  "password": "password"
}
```

Response:

```json
{
  "email": "demo@example.com",
  "token": "..."
}
```

Next.js rewrites `/api/*` to the FastAPI container, so frontend code can call relative URLs such as:

```js
const response = await fetch("/api/login", { ... })
```

## Database

The starter intentionally has only one table:

```sql
users (
  email      primary key,
  password   not null,
  token,
  create_at  not null
)
```

The `password` column stores a bcrypt hash, not plaintext.

## Project structure

```text
.
├── docker-compose.yaml
├── backend-api/
│   ├── app.py
│   ├── database.py
│   ├── routes/
│   │   └── auth.py
│   └── requirements.txt
└── nextjs/
    ├── components/ui/
    ├── lib/utils.js
    ├── pages/
    │   ├── _app.js
    │   ├── index.js
    │   └── login.js
    ├── styles/globals.css
    ├── components.json
    ├── tailwind.config.js
    └── package.json
```

This repository is intentionally small. Students can add CRUD, authorization, state management, and additional tables later as course exercises.
