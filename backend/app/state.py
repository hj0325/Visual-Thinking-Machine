from __future__ import annotations

import operator
from typing import Annotated, Literal, Optional, TypedDict


Message = dict  # {"role": "user"|"assistant"|"system", "content": "..."}


class GraphState(TypedDict, total=False):
    # Reducer: new messages are appended to prior messages
    messages: Annotated[list[Message], operator.add]

    # State machine
    current_step: Literal["ask", "confirm", "generate"]

    # Interpret output (waiting for confirmation)
    proposed_logic: Optional[str]
    plan_context: Optional[str]

    # Feedback input (ephemeral per /feedback call)
    confirmed: Optional[bool]
    feedback_text: Optional[str]

    # Outputs
    assistant_message: Optional[str]
    visual_code: Optional[dict]

