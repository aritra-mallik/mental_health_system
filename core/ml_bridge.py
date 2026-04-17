# core/ml_bridge.py

# --- ML ---
from AI_MH.ml.predict import predict_all
from AI_MH.ml.input_schema import MentalHealthInput
# --- Chatbot ---
from AI_MH.chatbot.llm_client import generate_response
from AI_MH.chatbot.prompt_builder import build_prompt
from AI_MH.features.sentiment import get_sentiment

def run_assessment(phq_score=None, gad_score=None, conversation=""):
    """
    Full pipeline:
    Django → ML → Strategy → Chatbot → Response
    """



    sentiment = get_sentiment(conversation) if conversation else 0

    # --- Create structured input ---
    mh_input = MentalHealthInput(
        text=conversation or "",
        sentiment=sentiment,
        phq_score=phq_score or 0,
        gad_score=gad_score or 0,
        history_len=0
    )

    # --- Use structured data ---
    result = predict_all(
        mh_input.sentiment,
        mh_input.phq_score if phq_score is not None else None,
        mh_input.gad_score if gad_score is not None else None,
        mh_input.text
    )

    # result contains:
    # phq_risk, gad_risk, final_risk, strategy, sentiment

    strategy = result["strategy"]

    # --- Step 3: Build prompt for chatbot ---
    prompt = build_prompt(
        conversation,
        strategy,
        result.get("is_critical", False)
    )

    # --- Step 4: Generate chatbot response ---
    chat_response = generate_response(prompt)

    # --- Step 5: Return everything ---
    return {
        "phq_risk": result["phq_risk"],
        "gad_risk": result["gad_risk"],
        "final_risk": result["final_risk"],
        "strategy": strategy,
        "chat_response": chat_response
    }