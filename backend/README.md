# Thinking Machine Backend (FastAPI + LangGraph)

## Setup

Create a virtualenv and install:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Environment

Set environment variables:

- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (optional, default: `gpt-4o`)
- `OPENAI_TEMPERATURE` (optional, default: `0.2`)

Example file (copy manually; we don't commit `.env*`):

```bash
export OPENAI_API_KEY="..."
export OPENAI_MODEL="gpt-4o"
export OPENAI_TEMPERATURE="0.2"
```

## Run

```bash
uvicorn backend.app.main:app --reload --port 8000
```

## Endpoints

- `GET /health`
- `POST /chat`
- `POST /feedback`

