def build_prompt(input_data, strategy, is_critical=False):

    # --- Conversation formatting ---
    if isinstance(input_data, str):
        history = f"User: {input_data}\n"
        last_user = input_data
    else:
        history = ""
        last_user = ""

        for m in input_data:
            role = "User" if m.role == "user" else "Assistant"
            history += f"{role}: {m.content}\n"

        # extract last user message
        for m in reversed(input_data):
            if m.role == "user":
                last_user = m.content
                break

    # --- Strategy mapping ---
    strategy_map = {
        "NORMAL": "Respond naturally.",
        "GUIDANCE": "Offer 1–2 gentle suggestions if appropriate.",
        "SUPPORT": "Focus on emotional validation.",
        "ESCALATE": "Encourage seeking support from others.",
        "CRITICAL": "Encourage immediate help and prioritize safety."
    }

    strategy_text = strategy_map.get(strategy, "Respond supportively.")

    if is_critical:
        strategy_text = "User may be in crisis. Prioritize immediate support and safety."

    # --- Final prompt ---
    return f"""
Conversation:
{history}

Last user message:
{last_user}

Instruction:
{strategy_text}

Respond to the last user message.
""".strip()