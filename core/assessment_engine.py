#core/assessment_engine.py

from core.ml_bridge import run_assessment
class AssessmentEngine:

    CONFIG = {
        "phq9": {
            "max_score": 27,
            "ranges": [
                (0, 4, "minimal"),
                (5, 9, "mild"),
                (10, 14, "moderate"),
                (15, 19, "moderately_severe"),
                (20, 27, "severe"),
            ],
        },
        "gad7": {
            "max_score": 21,
            "ranges": [
                (0, 4, "minimal"),
                (5, 9, "mild"),
                (10, 14, "moderate"),
                (15, 21, "severe"),
            ],
        },
    }

    INTERPRETATION = {
        "minimal": "No significant symptoms",
        "mild": "Monitor and practice self-care",
        "moderate": "Consider professional guidance",
        "moderately_severe": "Strongly consider professional help",
        "severe": "Seek professional support",
    }

    DISCLAIMER = "This is not a diagnosis. This is only a screening tool."

    @classmethod
    def calculate_score(cls, answers):
        if not all(0 <= a <= 3 for a in answers):
            raise ValueError("Answers must be between 0 and 3")
        return sum(answers)

    @classmethod
    def get_risk_level(cls, test_type, score):
        config = cls.CONFIG.get(test_type)

        for low, high, label in config["ranges"]:
            if low <= score <= high:
                return label

        raise ValueError("Invalid score")

      


    @classmethod
    def evaluate(cls, request, test_type, answers, message=""):
        score = cls.calculate_score(answers)

        # --- Store latest scores ---
        if test_type == "phq9":
            request.session["phq_score"] = score

        elif test_type == "gad7":
            request.session["gad_score"] = score

        # --- Get available scores ---
        phq_score = request.session.get("phq_score")
        gad_score = request.session.get("gad_score")

        # --- Always run ML with available data ---
        result = run_assessment(
            phq_score=phq_score,
            gad_score=gad_score,
            conversation = message   
        )

        # --- Decide which risk to show ---
        if phq_score is not None and gad_score is not None:
            final_risk = result["final_risk"]  # combined

        elif phq_score is not None:
            final_risk = result["phq_risk"]

        elif gad_score is not None:
            final_risk = result["gad_risk"]

        else:
            final_risk = "LOW"  # fallback

        # --- Map to existing labels ---
        RISK_MAP = {
            "LOW": "minimal",
            "MEDIUM": "moderate",
            "HIGH": "severe"
        }

        mapped_risk = RISK_MAP.get(final_risk, "minimal")

        return {
            "score": score,
            "risk_level": mapped_risk,
            "insight": cls.INTERPRETATION[mapped_risk],
            "disclaimer": cls.DISCLAIMER,
            "chat": result["chat_response"],
            "ml": result
        }