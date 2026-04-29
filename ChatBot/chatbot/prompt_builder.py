def build_prompt(input_data, strategy, is_critical=False, region="IN"):

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

        for m in reversed(input_data):
            if m.role == "user":
                last_user = m.content
                break

    # --- Strategy mapping ---
    strategy_map = {
        "NORMAL": "Respond like a thoughtful human conversation partner.",
        "GUIDANCE": "Offer light, practical suggestions only if they fit naturally.",
        "SUPPORT": "Acknowledge feelings briefly, then engage normally.",
        "ESCALATE": "Gently suggest reaching out to someone they trust.",
        "CRITICAL": "Prioritize immediate real-world support in a calm, direct way."
    }

    strategy_text = strategy_map.get(strategy, "Respond in a supportive, natural way.")

    # --- Crisis / critical override ---
    if is_critical:
        if region == "IN":
            helplines = """
India helplines (include at least one naturally in your response):
- Kiran Mental Health Helpline: 1800-599-0019
- AASRA: +91-9820466726
- iCALL: +91-9152987821
"""
        else:
            helplines = """
Provide relevant local crisis helplines for the user's country.
"""

        strategy_text = f"""
User may be in crisis. Be calm, direct, and supportive.

- Encourage reaching out to someone they trust nearby.
- Suggest immediate real-world help.
- Keep tone steady and non-alarmist.
{helplines}
"""

    # --- Style constraints ---
    style_rules = """
Style guidelines:
- Write like a real person, not a therapist script.
- Avoid overused phrases like "that sounds really hard" or "you're not alone".
- Do NOT over-validate or exaggerate empathy.
- Keep responses grounded, specific, and slightly informal.
- Avoid long disclaimers or overly clinical language.
- Do not give multiple suggestions unless clearly needed.
- Match the user’s tone (don’t be overly soft if they are casual).
- Prefer natural phrasing over structured advice.
- If appropriate, include a simple follow-up question.
"""

    # --- Final prompt ---
    return f"""
Conversation:
{history}

Last user message:
{last_user}

Instruction:
{strategy_text}

{style_rules}

Respond to the last user message.
""".strip()