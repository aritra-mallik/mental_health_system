import re


def safe_text(x):
    return x if isinstance(x, str) and x.strip() else ""


def build_prompt(
    input_data,
    strategy,
    is_critical=False,
    region="IN",
    state=None,
    suggest_consultation=False
):

    # --- Conversation formatting ---
    if isinstance(input_data, str):
        cleaned = safe_text(input_data)
        history = f"User: {cleaned}\n"
        last_user = cleaned

    else:
        history = ""
        last_user = ""

        for m in input_data:
            if isinstance(m, dict):
                role_val = m.get("role")
                content_val = m.get("content", "")
            else:
                role_val = getattr(m, "role", None)
                content_val = getattr(m, "content", "")

            role = "User" if role_val == "user" else "Assistant"
            content = safe_text(content_val)

            if content:
                history += f"{role}: {content}\n"

        for m in reversed(input_data):
            if isinstance(m, dict):
                role_val = m.get("role")
                content_val = m.get("content", "")
            else:
                role_val = getattr(m, "role", None)
                content_val = getattr(m, "content", "")

            if role_val == "user":
                content = safe_text(content_val)

                if content:
                    last_user = content
                    break

        last_user = last_user or "I just completed a mental health assessment."

    # --- Mental state guidance ---
    state_block = ""

    if state:
        mood = state.get("overall_mood")
        risk = state.get("overall_risk")
        score = state.get("score")

        state_block = f"""
User emotional state context:
- Mood: {mood}
- Risk: {risk}
- Score: {score}

Important behavioral rules:
- Use this only as soft context
- Do NOT mention scores, risk levels, or classifications
- Do NOT tell the user what emotional state they are in
- Do NOT repeat emotional labels back to the user
- Avoid sounding like an assessment report
- Prioritize emotional stability over emotional exploration
- Do not intensify negative emotions
- Avoid repeatedly focusing on distress
- Avoid excessive emotional interpretation
"""

    # --- Consultation block ---
    consultation_block = ""

    if suggest_consultation:
        consultation_block = """
If it feels genuinely appropriate:
- Briefly and gently suggest talking to a professional
- Do not pressure the user
- Mention it naturally and infrequently
"""

    # --- Strategy mapping ---
    strategy_map = {
        "NORMAL":
            "Respond naturally and conversationally.",

        "GUIDANCE":
            "Offer calm, practical suggestions only if clearly helpful.",

        "SUPPORT":
            """
Be emotionally supportive without overanalyzing.
Focus on grounding, clarity, and emotional steadiness.
Avoid sounding therapeutic or clinical.
""",

        "ESCALATE":
            """
Encourage the user to connect with trusted real-world support calmly.
Avoid alarming language.
""",

        "CRITICAL":
            """
Stay calm and direct.
Encourage immediate real-world support naturally.
Avoid panic or dramatic wording.
"""
    }

    strategy_text = strategy_map.get(
        strategy,
        "Respond in a calm, natural, supportive way."
    )

    # --- Crisis override ---
    if is_critical:

        if region == "IN":
            helplines = """
If appropriate, you may include:
- Kiran Mental Health Helpline: 1800-599-0019
- AASRA: +91-9820466726
- iCALL: +91-9152987821
"""
        else:
            helplines = "Include a relevant local crisis helpline if necessary."

        strategy_text = f"""
The user may be in serious emotional distress.

Behavior rules:
- Stay calm
- Keep responses short and grounding
- Avoid emotional intensity
- Encourage contacting someone trusted nearby
- Encourage real-world support naturally
- Do not overwhelm the user with advice

{helplines}
"""

    # --- Style rules ---
    style_rules = """
Style guidelines:
- Sound human and calm
- Keep responses concise
- Avoid generic empathy phrases
- Avoid sounding like a therapist
- Avoid sounding like an assessment tool
- Avoid excessive reassurance
- Do not repeatedly ask questions
- Ask a question only if truly necessary
- Prefer grounding and stabilization over emotional probing
- Match the user's conversational energy
- Avoid long explanations
"""

    # --- Final prompt ---
    return f"""
Conversation:
{history}

Last user message:
{last_user}

{state_block}

{consultation_block}

Instruction:
{strategy_text}

{style_rules}

Respond to the last user message.
""".strip()