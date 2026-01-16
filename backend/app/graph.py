from __future__ import annotations

from typing import Any, Literal, Optional

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph

from .llm import generate_visual_code, interpret_idea, refine_with_feedback
from .state import GraphState


def _last_user_message(messages: list[dict]) -> Optional[str]:
    for m in reversed(messages):
        if m.get("role") == "user":
            return (m.get("content") or "").strip()
    return None


async def ask_node(state: GraphState) -> GraphState:
    assistant_message = "What kind of idea do you have? Tell me in one or two sentences."
    return {
        "current_step": "ask",
        "assistant_message": assistant_message,
        "messages": [{"role": "assistant", "content": assistant_message}],
        # clear ephemeral feedback
        "confirmed": None,
        "feedback_text": None,
    }


async def interpret_node(state: GraphState) -> GraphState:
    messages = state.get("messages", [])
    out = await interpret_idea(messages=messages)
    return {
        "current_step": "confirm",
        "assistant_message": out.assistant_message,
        "proposed_logic": out.proposed_logic,
        "plan_context": out.plan_context,
        "messages": [{"role": "assistant", "content": out.assistant_message}],
        "confirmed": None,
        "feedback_text": None,
    }


async def refine_node(state: GraphState) -> GraphState:
    messages = state.get("messages", [])
    out = await refine_with_feedback(
        messages=messages,
        proposed_logic=state.get("proposed_logic"),
        feedback_text=state.get("feedback_text"),
    )
    # After asking clarifying questions, we expect a new user message via /chat
    return {
        "current_step": "ask",
        "assistant_message": out.assistant_message,
        "messages": [{"role": "assistant", "content": out.assistant_message}],
        "confirmed": None,
        "feedback_text": None,
    }


async def confirm_wait_node(state: GraphState) -> GraphState:
    assistant_message = "To continue, please confirm: YES or NO."
    return {
        "assistant_message": assistant_message,
        "messages": [{"role": "assistant", "content": assistant_message}],
    }


async def generate_visual_code_node(state: GraphState) -> GraphState:
    plan_context = state.get("plan_context") or ""
    proposed_logic = state.get("proposed_logic") or ""
    messages = state.get("messages", [])
    vc = await generate_visual_code(plan_context=plan_context, proposed_logic=proposed_logic, messages=messages)
    assistant_message = vc.summary
    return {
        "current_step": "generate",
        "assistant_message": assistant_message,
        "visual_code": vc.model_dump(),
        "messages": [{"role": "assistant", "content": assistant_message}],
        "confirmed": None,
        "feedback_text": None,
    }


async def completed_wait_node(state: GraphState) -> GraphState:
    assistant_message = "Completed. If you want, start a new session to explore another idea."
    return {
        "assistant_message": assistant_message,
        "messages": [{"role": "assistant", "content": assistant_message}],
    }


def route_next(state: GraphState) -> Literal["ask", "interpret", "refine", "generate", "confirm_wait", "completed_wait"]:
    step = state.get("current_step")
    confirmed = state.get("confirmed")
    messages = state.get("messages", [])

    if step is None:
        return "ask"

    if step == "ask":
        last_user = _last_user_message(messages)
        if last_user:
            return "interpret"
        return "ask"

    if step == "confirm":
        if confirmed is True:
            return "generate"
        if confirmed is False:
            return "refine"
        return "confirm_wait"

    if step == "generate":
        return "completed_wait"

    return "ask"


def _router_node(state: GraphState) -> GraphState:
    # No-op node used only for conditional routing
    return {}


def build_graph() -> tuple[Any, MemorySaver]:
    checkpointer = MemorySaver()

    sg = StateGraph(GraphState)
    sg.add_node("router", _router_node)
    sg.add_node("ask", ask_node)
    sg.add_node("interpret", interpret_node)
    sg.add_node("refine", refine_node)
    sg.add_node("generate", generate_visual_code_node)
    sg.add_node("confirm_wait", confirm_wait_node)
    sg.add_node("completed_wait", completed_wait_node)

    sg.set_entry_point("router")
    # Single-step routing: an invocation executes exactly one node after routing decision.
    sg.add_conditional_edges(
        "router",
        route_next,
        {
            "ask": "ask",
            "interpret": "interpret",
            "refine": "refine",
            "generate": "generate",
            "confirm_wait": "confirm_wait",
            "completed_wait": "completed_wait",
        },
    )
    sg.add_edge("ask", END)
    sg.add_edge("interpret", END)
    sg.add_edge("refine", END)
    sg.add_edge("generate", END)
    sg.add_edge("confirm_wait", END)
    sg.add_edge("completed_wait", END)

    graph = sg.compile(checkpointer=checkpointer)
    return graph, checkpointer

