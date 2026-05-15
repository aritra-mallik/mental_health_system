# core/alert.py

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
    # ---------------------------------
    # NO DATA STATE
    # ---------------------------------
    if mood is None and risk is None:
        import random
        empty_state_messages = [
            "Take a moment to pause and check in with yourself today.",
            "How are you feeling right now? Smera is here to listen.",
            "Your dashboard is ready when you want to reflect on your day.",
            "Whenever you are ready, let's take a quick emotional pulse."
        ]
        return {
            "level": "gray",
            "msg": random.choice(empty_state_messages),
            "risk": None,
            "mood": None,
            "score": None
        }

    trigger_text = ""

    if trigger_context:
        trigger_text = f"""
Latest trigger:
- Source: {trigger_context.get("source")}
- Mood: {trigger_context.get("mood")}
- Risk: {trigger_context.get("risk")}
"""

    prompt = f"""
You are generating a mental wellness dashboard alert.

Your job:
Create ONE short emotionally-aware summary sentence
based ONLY on the provided emotional state.

Current aggregated emotional state:
- Overall Mood: {mood}
- Overall Risk: {risk}
- Emotional Score: {score}

{trigger_text}

INTERPRETATION GUIDELINES:

Mood meanings:
- good/calm/neutral -> emotionally stable
- low/stressed/stressed -> emotional strain
- overwhelmed/frustrated -> tension or emotional pressure
- lonely/tired -> emotional depletion

Risk meanings:
- less -> stable overall emotional condition
- moderate -> noticeable emotional fluctuation
- high -> persistent or intense emotional strain

Score guidance:
- Higher positive score -> more stable emotional state
- Lower or negative score -> heavier emotional state

IMPORTANT:
- Use BOTH mood and risk together
- Do not overreact to a single trigger
- Prioritize the aggregated state over latest trigger
- If mood and risk conflict, risk level takes priority
- Avoid assuming severe distress unless risk is high

STRICT OUTPUT RULES:
- Return ONLY one sentence
- Maximum 18 words
- No quotation marks
- No emojis
- No diagnosis
- No crisis language
- No medical terminology
- No generic therapy advice
- No lists
- No explanations

STYLE:
- Calm
- Human
- Supportive
- Emotionally intelligent
- Natural sounding
- Brief but specific

LESS RISK RULES:
- Sound grounded and steady
- Reflect emotional balance or manageable fluctuation
- Keep tone reassuring
- Avoid emotional exaggeration

MODERATE RISK RULES:
- Acknowledge emotional pressure gently
- Suggest pacing or awareness indirectly
- Keep tone stable and non-alarming

HIGH RISK RULES:
- Show compassionate concern
- Encourage slowing down or rest naturally
- Never sound panicked or dramatic

NEVER USE THESE WORDS:
overwhelmed
struggling
breaking down
emotionally heavy
distressed
unstable
critical
severe
crisis

GOOD EXAMPLES:
- Your recent emotional patterns appear relatively steady today.
- Emotional shifts are present, though your overall state still seems manageable.
- Recent patterns suggest some emotional tension while maintaining moments of balance.
- Your emotional state appears calmer today compared to recent fluctuations.

BAD EXAMPLES:
- You're overwhelmed right now.
- Things seem emotionally difficult lately.
- You're struggling internally.
- You are in crisis.
"""

    msg = generate_response(prompt)

    return {
        "level": resolve_level(risk),
        "msg": msg,
        "risk": risk,
        "mood": mood,
        "score": score
    }