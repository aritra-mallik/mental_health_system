# import re

# def safe_text(x):
#     return x if isinstance(x, str) and x.strip() else ""


# def build_prompt(input_data, strategy, is_critical=False, region="IN", state=None,suggest_consultation=False):

#     # --- Conversation formatting ---
#     if isinstance(input_data, str):
#         cleaned = safe_text(input_data)
#         history = f"User: {cleaned}\n"
#         last_user = cleaned

#     else:
#         history = ""
#         last_user = ""

#         for m in input_data:
#             if isinstance(m, dict):
#                 role_val = m.get("role")
#                 content_val = m.get("content", "")
#             else:
#                 role_val = getattr(m, "role", None)
#                 content_val = getattr(m, "content", "")

#             role = "User" if role_val == "user" else "Assistant"
#             content = safe_text(content_val)
#             history += f"{role}: {content}\n"

#         for m in reversed(input_data):
#             if isinstance(m, dict):
#                 role_val = m.get("role")
#                 content_val = m.get("content", "")
#             else:
#                 role_val = getattr(m, "role", None)
#                 content_val = getattr(m, "content", "")

#             if role_val == "user":
#                 content = safe_text(content_val)
#                 if content:
#                     last_user = content
#                     break

#         last_user = last_user or "I just completed a mental health assessment."

#     # --- 🧠 Inject mental state ---
#     state_block = ""

#     if state:
#         mood = state.get("overall_mood")
#         risk = state.get("overall_risk")
#         score = state.get("score")

#         state_block = f"""
#     User mental state (IMPORTANT — use this actively):
#     - Mood: {mood}
#     - Risk: {risk}
#     - Score: {score}

#     Instructions:
#     - Use the emotional state as quiet conversational context
#     - Never directly mention scores, risk levels, classifications, or assessment outcomes
#     - Do not explicitly label the user's emotions unless they used those words first
#     - Reflect emotional awareness subtly through tone and wording
#     - If the user seems emotionally stable, sound encouraging and grounded
#     - If the user seems emotionally strained, sound calmer and steadier
#     - Support the conversation naturally instead of analyzing the user
#     - Avoid sounding clinical, diagnostic, or therapeutic
#     - Avoid turning the conversation into emotional interrogation
#     - Ask questions sparingly
#     """
#     consultation_block = ""

#     if suggest_consultation:
#         consultation_block = """
#     If it feels natural, gently suggest talking to a professional.
#     Do NOT push strongly.
#     Do NOT sound like a recommendation engine.
#     Make it feel like a human suggestion in conversation.
#     """
#     # --- Strategy mapping ---
#     strategy_map = {
#         "NORMAL": "Respond like a thoughtful human conversation partner.",
#         "GUIDANCE": "Offer light, practical suggestions only if they fit naturally.",
#         "SUPPORT": "Respond as if you already understand the user's situation. Be specific and grounded. Avoid generic empathy.",
#         "ESCALATE": "Gently suggest reaching out to someone they trust.",
#         "CRITICAL": "Prioritize immediate real-world support in a calm, direct way."
#     }

#     strategy_text = strategy_map.get(strategy, "Respond in a supportive, natural way.")

#     # --- Crisis override ---
#     if is_critical:
#         if region == "IN":
#             helplines = """
# If you're in India, you could reach out to:
# - Kiran Mental Health Helpline: 1800-599-0019
# - AASRA: +91-9820466726
# - iCALL: +91-9152987821
# """
#         else:
#             helplines = "Offer a relevant local crisis helpline."

#         strategy_text = f"""
# The user may be in immediate emotional distress.

# Respond calmly and directly.

# Do NOT give coping strategies.
# Do NOT give long emotional advice.
# Do NOT over-explain.
# Keep the response short, grounded, and supportive.
# Encourage immediate real-world support naturally.

# {helplines}
# """

#     # --- Style rules ---
#     style_rules = """
# Style guidelines:
# - Write like a real person.
# - Avoid generic empathy phrases.
# - Keep it grounded and slightly informal.
# - No long disclaimers.
# - Match user tone.
# - Ask at most one question.
# """

#     # --- Final prompt ---
#     return f"""
# Conversation:
# {history}

# Last user message:
# {last_user}

# {state_block}
# {consultation_block}

# Instruction:
# {strategy_text}

# {style_rules}

# Respond to the last user message.
# """.strip()

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

    # -------------------------------------------------
    # Conversation formatting
    # -------------------------------------------------
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

        last_user = (
            last_user
            or "I just completed a mental health assessment."
        )

    # -------------------------------------------------
    # Mental state context
    # -------------------------------------------------
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
- Use emotional state as quiet conversational context
- Never directly mention scores, classifications, or assessment results
- Do not explicitly label emotions unless the user used those words first
- Reflect emotional awareness subtly through tone
- Avoid sounding clinical, diagnostic, or therapeutic
- Avoid emotional over-analysis
- Avoid therapy-style questioning
- Prefer grounded guidance over emotional reflection
- Focus on usefulness and stability
- Take initiative when helpful
"""

    # -------------------------------------------------
    # Consultation suggestion block
    # -------------------------------------------------
    consultation_block = ""

    if suggest_consultation:

        consultation_block = """
If it feels natural, gently suggest professional support.

Do NOT:
- push aggressively
- sound automated
- repeatedly recommend consultation

Keep it natural and human.
"""

    # -------------------------------------------------
    # Strategy mapping
    # -------------------------------------------------
    strategy_map = {

        "NORMAL": """
Respond naturally and directly.

Focus on:
- usefulness
- clarity
- grounded conversation

Avoid unnecessary follow-up questions.
""",

        "GUIDANCE": """
Give practical and realistic suggestions.

Prefer:
- actionable guidance
- concrete next steps
- small achievable actions

Take initiative instead of repeatedly asking the user what they want to do.
""",

        "SUPPORT": """
Respond calmly, clearly, and supportively.

Do NOT:
- sound like a therapist
- emotionally over-mirror
- over-validate emotions
- prolong the conversation unnecessarily

Prioritize:
- grounded support
- practical guidance
- emotional steadiness
- realistic next steps

Prefer direct observations, reinforcement, and practical guidance over questions.
Only ask questions if essential for safety or clarification.
""",

        "ESCALATE": """
Encourage reaching out to trusted people or professional support calmly and naturally.

Be:
- direct
- grounded
- calm
- practical

Avoid dramatic language.
""",

        "CRITICAL": """
The user may be discussing self-harm or suicide-related thoughts.

Respond calmly and directly.

Do NOT:
- emotionally analyze the user
- mirror suicidal wording
- ask probing emotional questions
- prolong the interaction unnecessarily
- overwhelm the user with advice
- sound robotic or clinical
-encourage unnecessary escalation if the user is already seeking help or improving

Focus on:
- immediate safety
- grounding
- trusted human connection
- professional support
- very small practical next steps

Keep the response:
- short
- steady
- supportive
- actionable
"""
    }

    strategy_text = strategy_map.get(
        strategy,
        "Respond in a calm, supportive, and grounded way."
    )

    # -------------------------------------------------
    # Crisis override
    # -------------------------------------------------
    if is_critical:

        if region == "IN":

            helplines = """
If you're in India, you could reach out to:

- Kiran Mental Health Helpline: 1800-599-0019
- AASRA: +91-9820466726
- iCALL: +91-9152987821
"""

        else:

            helplines = """
Offer a relevant local crisis helpline.
"""

        strategy_text += f"""

Additional guidance:

- Encourage real-world support naturally
- Suggest contacting someone trusted if appropriate
- Keep the response calm and stabilizing
- Avoid emotionally intense language

{helplines}
"""

    # -------------------------------------------------
    # Global style rules
    # -------------------------------------------------
    style_rules = """
Style guidelines:
- If the user expresses improvement, stability, or relief:
    - acknowledge it naturally
    - avoid reintroducing crisis resources
    - avoid mentioning helplines unless necessary
    - avoid returning to emergency framing
- Write like a calm, capable human.
- Prioritize usefulness over emotional performance.
- Avoid generic empathy phrases.
- Avoid therapy-style wording.
- Avoid excessive emotional mirroring.
- Avoid repeating distressing statements back to the user.
- Avoid turning every response into a conversation.
- Avoid follow-up questions unless absolutely necessary.
- Prefer statements, guidance, or reinforcement over questions.
- Do not try to extend the conversation artificially.
- Prefer practical suggestions and grounded guidance.
- Keep responses concise, steady, and realistic.
- Match the user's tone naturally.
"""

    # -------------------------------------------------
    # Final prompt
    # -------------------------------------------------
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