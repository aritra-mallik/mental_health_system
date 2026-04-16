def build_prompt(input_data, strategy, is_critical=False):
    """
    Supports:
    - string (assessment flow)
    - list of ChatMessage (chat flow)
    """

    # -------------------------
    # 1. Handle BOTH input types
    # -------------------------
    if isinstance(input_data, str):
        # OLD FLOW (assessment)
        history = f"User: {input_data}\n"

    else:
        # NEW FLOW (chat messages)
        history = ""
        for m in input_data:
            role = "User" if m.role == "user" else "Assistant"
            history += f"{role}: {m.content}\n"

    # -------------------------
    # 2. Strategy instructions
    # -------------------------
    strategy_instructions = {
        "NORMAL": "Respond naturally and supportively.",
        "GUIDANCE": "Gently guide the user with helpful suggestions.",
        "SUPPORT": "Provide emotional support and validation.",
        "ESCALATE": "Encourage seeking help and emphasize importance.",
        "CRITICAL": "Respond with urgency and encourage immediate professional help."
    }

    strategy_text = strategy_instructions.get(
        strategy,
        "Respond supportively."
    )

    if is_critical:
        strategy_text = "User may be in crisis. Encourage immediate help and support."

    # -------------------------
    # 3. Final prompt
    # -------------------------
    prompt = f"""
You are a mental health support assistant.

CONVERSATION:
{history}

INSTRUCTIONS:
- Respond to the LAST user message
- Be empathetic and specific
- Do NOT give generic responses
- Keep response concise (2–4 sentences)
- {strategy_text}

Now respond:
"""

    return prompt.strip()