import re

def safe_text(x):
    return x if isinstance(x, str) and x.strip() else ""


def build_prompt(input_data, strategy, is_critical=False, region="IN", state=None,suggest_consultation=False):

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

    # --- 🧠 Inject mental state ---
    state_block = ""

    if state:
        mood = state.get("overall_mood")
        risk = state.get("overall_risk")
        score = state.get("score")

        state_block = f"""
    User mental state (IMPORTANT — use this actively):
    - Mood: {mood}
    - Risk: {risk}
    - Score: {score}

    Instructions:
    - Do NOT start with generic phrases like "I'm here to listen"
    - Speak as if you already understand their situation
    - If mood is anxious → help reduce overwhelm or guide thinking
    - If risk is moderate/high → gently guide toward coping or clarity
    - Reference their state naturally in your response
    """
    consultation_block = ""

    if suggest_consultation:
        consultation_block = """
    If it feels natural, gently suggest talking to a professional.
    Do NOT push strongly.
    Do NOT sound like a recommendation engine.
    Make it feel like a human suggestion in conversation.
    """
    # --- Strategy mapping ---
    strategy_map = {
        "NORMAL": "Respond like a thoughtful human conversation partner.",
        "GUIDANCE": "Offer light, practical suggestions only if they fit naturally.",
        "SUPPORT": "Respond as if you already understand the user's situation. Be specific and grounded. Avoid generic empathy.",
        "ESCALATE": "Gently suggest reaching out to someone they trust.",
        "CRITICAL": "Prioritize immediate real-world support in a calm, direct way."
    }

    strategy_text = strategy_map.get(strategy, "Respond in a supportive, natural way.")

    # --- Crisis override ---
    if is_critical:
        if region == "IN":
            helplines = """
If you're in India, you could reach out to:
- Kiran Mental Health Helpline: 1800-599-0019
- AASRA: +91-9820466726
- iCALL: +91-9152987821
"""
        else:
            helplines = "Offer a relevant local crisis helpline."

        strategy_text = f"""
The user may be in immediate emotional distress.

Respond like a calm, grounded person in the moment:
- Acknowledge briefly, without dramatizing.
- Gently suggest reaching out to someone nearby.
- Encourage real-world support naturally.
- Optionally include a helpline.

{helplines}
"""

    # --- Style rules ---
    style_rules = """
Style guidelines:
- Write like a real person.
- Avoid generic empathy phrases.
- Keep it grounded and slightly informal.
- No long disclaimers.
- Match user tone.
- Ask at most one question.
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