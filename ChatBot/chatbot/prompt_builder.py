import re

def safe_text(x):
    """Ensure text is always a non-null string."""
    return x if isinstance(x, str) and x.strip() else ""

def build_prompt(input_data, strategy, is_critical=False, region="IN"):

    # --- Conversation formatting ---
    if isinstance(input_data, str):
        cleaned = safe_text(input_data)
        history = f"User: {cleaned}\n"
        last_user = cleaned

    else:
        history = ""
        last_user = ""

        # Build history safely
        for m in input_data:
            role = "User" if getattr(m, "role", None) == "user" else "Assistant"
            content = safe_text(getattr(m, "content", ""))
            history += f"{role}: {content}\n"

        # Extract last valid user message
        for m in reversed(input_data):
            if getattr(m, "role", None) == "user":
                content = safe_text(getattr(m, "content", ""))
                if content:
                    last_user = content
                    break

        # Final fallback (prevents API crash)
        last_user = last_user or " "

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
- Gently suggest reaching out to someone nearby (friend, family, trusted person).
- Encourage real-world support in a natural way (not as an instruction block).
- If appropriate, include a helpline as an option — not as a script.

Tone:
- Steady, human, and direct.
- No generic reassurance lines.
- No heavy or clinical language.
- No long lists.

Example tone:
"I'm really sorry you're dealing with this. If things feel intense right now, it might help to reach out to someone close to you or even call a helpline — they’re there to talk in moments like this."

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
- In crisis situations, do not start with refusal-style phrasing.
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