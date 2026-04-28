# Enterprise Knowledge Assistant

An AI-powered internal knowledge assistant that lets employees query company documents using natural language. Built with a RAG pipeline, JWT authentication, PostgreSQL for persistence, and a clean React frontend.

---

## Tech Stack

**Backend:** Python, FastAPI, LangChain, Google Gemini API, ChromaDB, PostgreSQL, SQLAlchemy

**Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router

**Auth:** JWT (email + password)

---

## Features

- Employees can ask natural language questions and get answers grounded strictly in uploaded company documents
- Admins can upload PDF and TXT files which are chunked, embedded, and stored in ChromaDB
- All questions and answers are logged to PostgreSQL per user
- Chat history is shown in the sidebar and is clickable
- Role-based routing - admins land on /admin, employees land on /chat
- JWT authentication with protected routes on both frontend and backend

---

## Project Structure

```
enterprise-knowledge-assistant/
backend/
main.py              - FastAPI app, CORS, router wiring
database.py          - SQLAlchemy engine and session
models.py            - User, Document, QueryHistory tables
auth.py              - Password hashing, JWT creation and verification
rag.py               - Document ingestion, chunking, embedding, RAG chain
routers/
auth_router.py     - /auth/register, /auth/login
admin_router.py    - /admin/upload, /admin/documents
chat_router.py     - /chat/ask, /chat/history
frontend/
src/
pages/
LoginPage.tsx    - Login form with JWT flowa# Enterprise Knowledge Assistant

An AI-powered internal knowledge assistant that lets employees query company documents using natural language. Built with a RAG pipeline, JWT authentication, PostgreSQL for persistence, and a clean React + TypeScript frontend.

---

## Tech Stack

**Backend:** Python, FastAPI, LangChain, Google Gemini API, ChromaDB, PostgreSQL, SQLAlchemy

**Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router

**Auth:** JWT (email + password)

---

## Features

- Employees can ask natural language questions and get answers grounded strictly in uploaded company documents
- Admins can upload PDF and TXT files which are chunked, embedded, and stored in ChromaDB
- All questions and answers are logged to PostgreSQL per user
- Chat history is shown in the sidebar and is clickable
- Role-based routing - admins land on `/admin`, employees land on `/chat`
- JWT authentication with protected routes on both frontend and backend

---

## Project Structure

```
enterprise-knowledge-assistant/
  backend/
    main.py                  - FastAPI app, CORS, router wiring
    database.py              - SQLAlchemy engine and session
    models.py                - User, Document, QueryHistory tables
    auth.py                  - Password hashing, JWT creation and verification
    rag.py                   - Document ingestion, chunking, embedding, RAG chain
    routers/
      auth_router.py         - /auth/register, /auth/login
      admin_router.py        - /admin/upload, /admin/documents
      chat_router.py         - /chat/ask, /chat/history
    requirements.txt
    .env
  frontend/
    src/
      pages/
        LoginPage.tsx         - Login form with JWT flow
        ChatPage.tsx          - Conversational chat UI with sidebar history
        AdminPage.tsx         - Document upload and document list
      components/
        MessageBubble.tsx     - User and assistant message rendering
      context/
        AuthContext.tsx       - Global auth state, login, logout
      App.tsx                 - Routing and protected route guards
    .env
  README.md
```

---

## Local Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL running locally

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/knowledge_db
SECRET_KEY=your_long_random_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Create the database in PostgreSQL:

```sql
CREATE DATABASE knowledge_db;
```

Create tables and start the server:

```bash
python -c "from database import engine, Base; import models; Base.metadata.create_all(bind=engine)"
uvicorn main:app --reload --port 8001
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:8001
```

```bash
npm run dev
```

Open `http://localhost:5173`

---

## API Endpoints

| Method | Endpoint          | Auth       | Description                              |
|--------|-------------------|------------|------------------------------------------|
| POST   | /auth/register    | None       | Register a new user                      |
| POST   | /auth/login       | None       | Login and receive JWT                    |
| POST   | /admin/upload     | Admin JWT  | Upload PDF or TXT to knowledge base      |
| GET    | /admin/documents  | Admin JWT  | List all uploaded documents              |
| POST   | /chat/ask         | Any JWT    | Ask a question, get a grounded answer    |
| GET    | /chat/history     | Any JWT    | Get current user's query history         |

---

## Assumptions and Trade-offs

**SharePoint and Confluence** - replaced with direct PDF and TXT file upload via the admin panel. The same chunking and embedding pipeline would connect to those APIs in a production deployment by swapping the file ingestion step with an API fetch.

**OAuth** - replaced with JWT email and password auth to keep the scope manageable. OAuth via Google or Microsoft would be added using the `authlib` library as the next step, with minimal changes to the existing token flow.

**Department-based access controls** - the `department` and `role` fields are modelled in the database schema. In this version, access is controlled at the role level (admin vs employee). Per-department ChromaDB collections would be the next step to restrict which documents each department can query.

**GPT-4 replaced with Gemini** - the LangChain abstraction means swapping the LLM is a one-line change in `rag.py`. Gemini was chosen for cost and because it has a generous free tier suitable for development.

**ChromaDB in-memory** - ChromaDB runs in-memory in this version, meaning the vector store resets on server restart. Switching to persistent storage requires one config change: replace `chromadb.Client()` with `chromadb.PersistentClient(path="./chroma_store")` in `rag.py`.

---

## What I Would Add Next

- OAuth login via Google or Microsoft using `authlib`
- Persistent ChromaDB with per-department collections
- WebSocket streaming for real-time token-by-token responses
- Docker Compose setup for one-command local startup
- Document deletion from admin panel
- Query resolution rate tracking dashboard
ChatPage.tsx     - Conversational chat UI with sidebar history
AdminPage.tsx    - Document upload and document list
components/
MessageBubble.tsx - User and assistant message rendering
context/
AuthContext.tsx  - Global auth state, login, logout
App.tsx            - Routing and protected route guards

```

---

## Local Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL running locally

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

```
Create `backend/.env`:
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/knowledge_db
SECRET_KEY=your_long_random_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=60

Create the database in PostgreSQL:
```

```sql
CREATE DATABASE knowledge_db;
```

Create tables and start the server:

```bash
python -c "from database import engine, Base; import models; Base.metadata.create_all(bind=engine)"
uvicorn main:app --reload --port 8001
```

### Frontend

```bash
cd frontend
npm install
```

```
Create `frontend/.env`:
VITE_API_URL=http://localhost:8001
```

```bash
npm run dev
```

Open `http://localhost:5173`

---

## API Endpoints

| Method | Endpoint         | Auth      | Description                           |
| ------ | ---------------- | --------- | ------------------------------------- |
| POST   | /auth/register   | None      | Register a new user                   |
| POST   | /auth/login      | None      | Login and receive JWT                 |
| POST   | /admin/upload    | Admin JWT | Upload PDF or TXT to knowledge base   |
| GET    | /admin/documents | Admin JWT | List all uploaded documents           |
| POST   | /chat/ask        | Any JWT   | Ask a question, get a grounded answer |
| GET    | /chat/history    | Any JWT   | Get current user's query history      |

---

## Assumptions and Trade-offs

**SharePoint and Confluence** - replaced with direct PDF and TXT file upload via the admin panel. The same chunking and embedding pipeline would connect to those APIs in a production deployment by swapping the file ingestion step with an API fetch.

**OAuth** - replaced with JWT email and password auth to keep the scope manageable. OAuth via Google or Microsoft would be added using the `authlib` library as the next step, with minimal changes to the existing token flow.

**Department-based access controls** - the `department` and `role` fields are modelled in the database schema. In this version, access is controlled at the role level (admin vs employee). Per-department ChromaDB collections would be the next step to restrict which documents each department can query.

**GPT-4 replaced with Gemini** - the LangChain abstraction means swapping the LLM is a one-line change in `rag.py`. Gemini was chosen for cost and because it has a generous free tier suitable for development.

**ChromaDB in-memory** - ChromaDB runs in-memory in this version, meaning the vector store resets on server restart. Switching to persistent storage requires one config change: replace `chromadb.Client()` with `chromadb.PersistentClient(path="./chroma_store")` in `rag.py`.

---

## What I Would Add Next

- OAuth login via Google or Microsoft using `authlib`
- Persistent ChromaDB with per-department collections
- WebSocket streaming for real-time token-by-token responses
- Docker Compose setup for one-command local startup
- Document deletion from admin panel
- Query resolution rate tracking dashboard
