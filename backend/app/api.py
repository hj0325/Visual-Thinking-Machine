from __future__ import annotations

from fastapi import APIRouter

from .graph import build_graph
from .models import ChatResponse, UserFeedback, UserInput, VisualCodeResponse


router = APIRouter()

_GRAPH, _CHECKPOINTER = build_graph()


def _status_from_state(state: dict) -> str:
    step = state.get("current_step")
    if step == "confirm":
        return "confirm"
    if step == "generate" and state.get("visual_code"):
        return "completed"
    return "chat"


def _to_chat_response(*, session_id: str, state: dict) -> ChatResponse:
    visual_code = state.get("visual_code")
    vc_model = VisualCodeResponse(**visual_code) if isinstance(visual_code, dict) else None
    return ChatResponse(
        status=_status_from_state(state),
        session_id=session_id,
        current_step=state.get("current_step") or "ask",
        assistant_message=state.get("assistant_message") or "",
        proposed_logic=state.get("proposed_logic"),
        plan_context=state.get("plan_context"),
        visual_code=vc_model,
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: UserInput) -> ChatResponse:
    thread_id = payload.session_id
    input_state = {
        "messages": [{"role": "user", "content": payload.message}],
        # ensure feedback fields don't accidentally persist
        "confirmed": None,
        "feedback_text": None,
    }
    state = await _GRAPH.ainvoke(input_state, config={"configurable": {"thread_id": thread_id}})
    return _to_chat_response(session_id=payload.session_id, state=state)


@router.post("/feedback", response_model=ChatResponse)
async def feedback(payload: UserFeedback) -> ChatResponse:
    thread_id = payload.session_id
    input_state = {
        "confirmed": payload.confirmed,
        "feedback_text": payload.feedback_text,
    }
    state = await _GRAPH.ainvoke(input_state, config={"configurable": {"thread_id": thread_id}})
    return _to_chat_response(session_id=payload.session_id, state=state)

