
# rules/rule_engine.py

from AI_MH.rules.safety import check_critical

def get_strategy(risk, is_critical, history_len=0):
    """
    Existing strategy logic (kept intact)
    """

    if is_critical:
        return "CRITICAL"

    if risk == "HIGH" and history_len > 3:
        return "ESCALATE"

    if risk == "HIGH":
        return "SUPPORT"

    if risk == "MEDIUM":
        return "GUIDANCE"

    return "NORMAL"


def combine_risk(phq_risk, gad_risk):

    priority = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
    reverse = {v: k for k, v in priority.items()}

    if phq_risk is None:
        return gad_risk
    if gad_risk is None:
        return phq_risk

    max_val = max(priority[phq_risk], priority[gad_risk])
    return reverse[max_val]

def evaluate_risk(
    text,
    sentiment,
    phq_risk,
    gad_risk,
    history_len=0
):
    """
    Main pipeline entry (NEW)
    """

    # Step 1: Critical detection
    is_critical = check_critical(text)

    # Step 2: Combine PHQ + GAD
    final_risk = combine_risk(phq_risk, gad_risk)

    # Step 3: Strategy
    strategy = get_strategy(final_risk, is_critical, history_len)

    return {
        "phq_risk": phq_risk,
        "gad_risk": gad_risk,
        "final_risk": final_risk,
        "sentiment": sentiment,
        "is_critical": is_critical,
        "strategy": strategy
    }