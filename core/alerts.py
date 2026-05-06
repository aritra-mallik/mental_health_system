#core/alert.py
from ChatBot.chatbot.llm_client import generate_response


def resolve_level(risk):
    if risk == "high":
        return "red"
    elif risk == "moderate":
        return "orange"
    return "green"


def generate_alert(global_state, trigger_context=None):

    mood = global_state.get("overall_mood")
    risk = global_state.get("overall_risk")
    score = global_state.get("score")

    trigger_text = ""

    if trigger_context:
        trigger_text = f"""
Latest trigger:
- Source: {trigger_context.get("source")}
- Mood: {trigger_context.get("mood")}
- Risk: {trigger_context.get("risk")}
"""

    prompt = f"""
You are generating a dashboard mental wellness alert.

Current aggregated emotional state:
- Overall Mood: {mood}
- Overall Risk: {risk}
- Emotional Score: {score}

{trigger_text}

STRICT OUTPUT RULES:
- Return ONLY one sentence
- Maximum 18 words
- No quotation marks
- No emojis
- No diagnosis
- No crisis language
- No generic therapy advice
- Sound natural and emotionally aware

STYLE:
- Warm but concise
- Calm and supportive
- Avoid sounding dramatic
- Avoid sounding clinical
- Avoid sounding robotic

LOW RISK RULES:
- Use emotionally stable wording
- Sound reassuring and grounded
- Avoid negative emotional assumptions
- NEVER use:
  overwhelmed
  struggling
  distressed
  difficult
  exhausted
  emotionally heavy
  breaking down

MODERATE RISK RULES:
- Gentle concern is acceptable
- Supportive reflection is acceptable
- Keep tone steady, not alarming

HIGH RISK RULES:
- Use compassionate urgency
- Encourage slowing down or self-care gently
- Do not sound panicked

GOOD EXAMPLES:
- Your recent emotional patterns appear relatively steady today.
- You're showing signs of maintaining balance despite normal emotional fluctuations.
- Small emotional shifts are natural, and your overall state still appears manageable.

BAD EXAMPLES:
- You're overwhelmed right now.
- Things seem emotionally difficult lately.
- You're struggling internally.
"""

    msg = generate_response(prompt)

    return {
        "level": resolve_level(risk),
        "msg": msg,
        "risk": risk,
        "mood": mood,
        "score": score
    }