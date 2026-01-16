from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# For the Frontend <-> Backend communication
class UserInput(BaseModel):
    session_id: str = Field(..., description="Client-managed session id; mapped to LangGraph thread_id internally.")
    message: str


class UserFeedback(BaseModel):
    session_id: str
    confirmed: bool  # True = YES, False = NO
    feedback_text: Optional[str] = None  # Optional context if NO


# For the LLM Output (Visual Code)
class Node(BaseModel):
    id: str
    type: Literal["Trigger", "Action", "Condition", "UI"]
    label: str
    description: str


class Edge(BaseModel):
    source: str
    target: str


class VisualCodeResponse(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    summary: str


class ChatStatus(BaseModel):
    status: Literal["chat", "confirm", "completed"]


class ChatResponse(BaseModel):
    status: Literal["chat", "confirm", "completed"]
    session_id: str
    current_step: Literal["ask", "confirm", "generate"]
    assistant_message: str
    proposed_logic: Optional[str] = None
    plan_context: Optional[str] = None
    visual_code: Optional[VisualCodeResponse] = None

