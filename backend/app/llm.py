from __future__ import annotations

import os
from typing import Any, List, Optional

from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from .models import VisualCodeResponse
from .prompts import GENERATE_PROMPT, INTERPRET_PROMPT, REFINE_PROMPT, SYSTEM_PROMPT


class InterpretOutput(BaseModel):
    plan_context: str = Field(..., description="1-3 sentence summary of user intent.")
    proposed_logic: str = Field(..., description="Plain-language steps like A -> B -> C. No code.")
    assistant_message: str = Field(..., description="Friendly message that asks user to confirm the steps.")


class RefineOutput(BaseModel):
    assistant_message: str = Field(..., description="1-3 clarifying questions, ends with a question.")


def _env(name: str, default: Optional[str] = None) -> str:
    value = os.getenv(name, default)
    if value is None:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


def get_llm() -> ChatOpenAI:
    # OPENAI_API_KEY must be set in environment for langchain_openai
    model = os.getenv("OPENAI_MODEL", "gpt-4o")
    temperature = float(os.getenv("OPENAI_TEMPERATURE", "0.2"))
    return ChatOpenAI(model=model, temperature=temperature)


def _to_lc_messages(messages: List[dict]) -> List[dict]:
    # ChatOpenAI accepts LC messages; but it also accepts OpenAI-style dict messages
    # via LangChain's normalization in many setups. We'll keep it as dicts for simplicity.
    return messages


async def interpret_idea(*, messages: List[dict]) -> InterpretOutput:
    llm = get_llm().with_structured_output(InterpretOutput)
    prompt_messages: List[dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": INTERPRET_PROMPT},
        *_to_lc_messages(messages),
    ]
    return await llm.ainvoke(prompt_messages)


async def refine_with_feedback(*, messages: List[dict], proposed_logic: Optional[str], feedback_text: Optional[str]) -> RefineOutput:
    llm = get_llm().with_structured_output(RefineOutput)
    context = f"Current proposed_logic:\n{proposed_logic or '(none)'}\n\nUser feedback_text:\n{feedback_text or '(none)'}"
    prompt_messages: List[dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": REFINE_PROMPT},
        {"role": "user", "content": context},
        *_to_lc_messages(messages),
    ]
    return await llm.ainvoke(prompt_messages)


async def generate_visual_code(*, plan_context: str, proposed_logic: str, messages: List[dict]) -> VisualCodeResponse:
    llm = get_llm().with_structured_output(VisualCodeResponse)
    context = f"plan_context:\n{plan_context}\n\nproposed_logic:\n{proposed_logic}"
    prompt_messages: List[dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": GENERATE_PROMPT},
        {"role": "user", "content": context},
        *_to_lc_messages(messages),
    ]
    return await llm.ainvoke(prompt_messages)

