# Agentic AI Student Career Guidance System

A full-stack, production-style project with a **real LangGraph multi-agent
system** (not a single chatbot wrapper). Node/Express + MongoDB own the
system of record and auth; a Python FastAPI service runs the actual
`StateGraph` with conditional routing and persistent memory; React +
Tailwind is the frontend.

## Architecture

```
career-guidance-system/
├── frontend/                  # React + Tailwind (Vite)
│   ├── src/
│   │   ├── pages/              # Login, Register, Dashboard, StudentProfile,
│   │   │                       # ResumeUpload, CareerRecommendation,
│   │   │                       # LearningRoadmap, Chatbot
│   │   ├── components/         # DashboardLayout, ProtectedRoute
│   │   ├── context/AuthContext.jsx
│   │   ├── api/axiosClient.js
│   │   └── index.css           # blue/purple glassmorphism design system
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                    # Node.js + Express REST API
│   ├── src/
│   │   ├── config/db.js
│   │   ├── models/              # User, StudentProfile, CareerRecommendation,
│   │   │                        # LearningRoadmap, ResumeReport, ChatHistory
│   │   ├── middleware/          # JWT auth guard, Multer upload, error handler
│   │   ├── controllers/         # auth, profile, resume, career, roadmap, chat
│   │   ├── routes/
│   │   └── app.js
│   ├── server.js
│   └── package.json
│
├── agent-service/               # Python LangGraph microservice
│   ├── agents/
│   │   ├── state.py                     # shared GraphState (TypedDict)
│   │   ├── orchestrator.py              # entry node + all conditional routing
│   │   ├── profile_analysis_agent.py
│   │   ├── skill_assessment_agent.py
│   │   ├── career_recommendation_agent.py
│   │   ├── learning_roadmap_agent.py
│   │   ├── course_recommendation_agent.py
│   │   ├── resume_analyzer_agent.py
│   │   └── chatbot_agent.py
│   ├── graph.py                # StateGraph: nodes, edges, conditional routing, memory
│   ├── main.py                 # FastAPI app: /api/agent/invoke, /api/agent/chat
│   └── requirements.txt
│
└── README.md
```

**Why two backends?** LangGraph and the LangChain Gemini integration are
Python-native. Node/Express stays the system of record (MongoDB, JWT auth,
REST, file upload) and delegates all agent reasoning to the Python service
over HTTP — the same pattern used in production agentic systems.

## The LangGraph pipeline

`agent-service/graph.py` compiles one `StateGraph` with 8 nodes:

```
START -> orchestrator --(conditional: request_type)--> one of:
             profile_analysis | skill_assessment | career_recommendation |
             learning_roadmap | resume_analyzer | chatbot

profile_analysis      --(conditional: full_pipeline?)--> skill_assessment | END
skill_assessment       --(conditional: full_pipeline?)--> career_recommendation | END
career_recommendation  --(conditional: full_pipeline?)--> learning_roadmap | END
learning_roadmap       ------------------------------------> course_recommendation (always)
course_recommendation  ------------------------------------> END
resume_analyzer         ------------------------------------> END
chatbot                 ------------------------------------> END
```

- **Orchestrator Agent**: no LLM call — pure coordination. Reads
  `request_type` and sets `next_agent`, which `add_conditional_edges` uses
  to route at runtime.
- **Profile Analysis, Skill Assessment, Career Recommendation, Learning
  Roadmap, Course Recommendation, Resume Analyzer**: each is a real node
  function that calls Gemini via `langchain_google_genai` and returns a
  partial state update, which LangGraph merges into the shared `GraphState`.
- **Career Chatbot Agent**: reads whatever context already exists in the
  shared state for that student's thread (profile summary, skill gap,
  career recs — all recalled automatically via the `MemorySaver`
  checkpointer) plus the running `messages` list, so follow-up questions
  stay grounded without the frontend resending context.
- **Memory**: a `MemorySaver` checkpointer is attached at compile time,
  keyed by `thread_id = student-<userId>`. Every endpoint uses the same
  thread_id per student, so state persists and accumulates across separate
  HTTP calls — this is what makes the chatbot context-aware.

## REST API

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user |
| POST | `/api/profile` | Create/update profile |
| GET | `/api/profile` | Get profile |
| POST | `/api/profile/analyze` | Runs full LangGraph pipeline (profile → skills → careers → roadmap → courses) |
| POST | `/api/resume/upload` | Upload PDF resume (multipart, field `resume`) → ATS report |
| GET | `/api/resume` | List resume reports |
| POST | `/api/career/recommend` | Re-run Career Recommendation Agent alone |
| GET | `/api/career` | Latest career recommendations |
| POST | `/api/roadmap/generate` | Re-run Learning Roadmap + Course Recommendation Agents |
| GET | `/api/roadmap` | Latest roadmap |
| POST | `/api/chat` | Ask the Career Chatbot Agent a follow-up question |
| GET | `/api/chat` | Full chat history |

## MongoDB collections

`Users`, `StudentProfiles` (incl. embedded skill gap), `CareerRecommendations`,
`LearningRoadmaps` (incl. embedded courses), `ResumeReports`, `ChatHistories`.

## Setup

### 1. MongoDB
Local `mongod` or a free MongoDB Atlas cluster — copy the connection string.

### 2. Agent service (Python) — start this first
```bash
cd agent-service
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# edit .env: GOOGLE_API_KEY from https://aistudio.google.com/apikey
python main.py
```
Runs on `http://localhost:8000`.

### 3. Backend (Node.js)
```bash
cd backend
cp .env.example .env
# edit .env: MONGO_URI, JWT_SECRET, AGENT_SERVICE_URL=http://localhost:8000
npm install
npm run dev
```
Runs on `http://localhost:5000`.

### 4. Frontend (React + Tailwind)
```bash
cd frontend
cp .env.example .env
# edit .env: VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
```
Runs on `http://localhost:5173`. Register an account, fill in your profile
on the Student Profile page, click **Run AI analysis**, then explore Career
Recommendation, Learning Roadmap, Resume Upload, and Chatbot.

## Design system

Blue/purple glassmorphism theme ("Aurora"): deep indigo-navy background
(`#05061A`) with layered radial gradients, translucent frosted-glass panels
(`backdrop-blur-xl` + `border-white/10`), indigo→violet→cyan accent
gradients, `Sora` for display type and `Inter` for body text. Fully
responsive (sidebar collapses on mobile), visible keyboard focus states.

## Notes on production-readiness

- All secrets are environment variables (see each `.env.example`).
- JWT auth guards every private route; passwords are bcrypt-hashed.
- Every agent node has try/catch around the Gemini call and records
  failures into `state["errors"]` rather than crashing the graph.
- Resume PDFs are parsed in memory (Multer `memoryStorage`) — never
  written to disk.
- For a real deployment: add rate limiting, request validation
  (e.g. `zod`/`joi`), HTTPS, a persistent LangGraph checkpointer (Postgres/
  Redis instead of `MemorySaver`, which is in-process only), and CI.
