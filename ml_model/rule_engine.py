

def get_recommendation(risk_level):
    """
    Maps predicted risk to system response
    """

    if risk_level == 0:
        return {
            "level": "LOW",
            "message": "You're doing okay. Keep maintaining your routine.",
            "action": "reassure",
            "suggestions": [
                "Maintain your current habits",
                "Stay consistent with sleep and activity",
                "Keep checking in daily"
            ]
        }

    elif risk_level == 1:
        return {
            "level": "MEDIUM",
            "message": "You might be feeling some stress. Let's try to manage it.",
            "action": "coping",
            "suggestions": [
                "Try deep breathing (4-7-8 technique)",
                "Take a short walk",
                "Write down what's bothering you",
                "Talk to someone you trust"
            ]
        }

    elif risk_level == 2:
        return {
            "level": "HIGH",
            "message": "It seems like you're going through a tough time.",
            "action": "escalate",
            "suggestions": [
                "Consider reaching out to a trusted person",
                "Contact a mental health professional",
                "Use a helpline if needed",
                "You are not alone"
            ]
        }

    else:
        raise ValueError("Invalid risk level")