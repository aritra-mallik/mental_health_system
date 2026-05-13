#core/assessment_engine.py

class AssessmentEngine:

    CONFIG = {
        "who5": {
            "max_score": 25,
            "ranges": [
                (0, 13, "low_wellbeing"),
                (14, 25, "good_wellbeing"),
            ],
        },
        "pss": {
            "max_score": 40,
            "ranges": [
                (0, 13, "less"),
                (14, 26, "moderate"),
                (27, 40, "high"),
            ],
        },
        "isi": {
            "max_score": 28,
            "ranges": [
                (0, 7, "no_insomnia"),
                (8, 14, "subthreshold"),
                (15, 21, "moderate"),
                (22, 28, "severe"),
            ],
        },
        "wemwbs": {
            "max_score": 70,
            "ranges": [
                (14, 42, "low_wellbeing"),
                (43, 59, "average_wellbeing"),
                (60, 70, "high_wellbeing"),
            ],
        }
    }

    INTERPRETATION = {
        "less": "low level",
        "moderate": "Moderate level",
        "high": "High level",
        "severe": "Severe level",
        "low_wellbeing": "Low wellbeing",
        "average_wellbeing": "Average wellbeing",
        "good_wellbeing": "Good wellbeing",
        "high_wellbeing": "High wellbeing",
        "no_insomnia": "No significant sleep issues",
        "subthreshold": "Mild sleep issues",
    }

    DISCLAIMER = "This is not a diagnosis. This is only a screening tool."

    # =========================
    # GENERIC SCORE
    # =========================
    @classmethod
    def calculate_score(cls, answers, test_type):
        if test_type == "who5":
            valid = all(isinstance(a, int) and 0 <= a <= 5 for a in answers)
        elif test_type == "wemwbs":
            valid = all(isinstance(a, int) and 1 <= a <= 5 for a in answers)
        else:
            valid = all(isinstance(a, int) and 0 <= a <= 4 for a in answers)

        if not valid:
            raise ValueError("Invalid answer range")

        return sum(answers)

    # =========================
    # PSS FIX
    # =========================
    @classmethod
    def apply_pss_reverse_scoring(cls, answers):
        reverse_idx = [3, 4, 6, 7]

        return [
            (4 - val) if i in reverse_idx else val
            for i, val in enumerate(answers)
        ]

    # =========================
    # RANGE MAPPING
    # =========================
    @classmethod
    def get_risk_level(cls, config, score):
        for less, high, label in config["ranges"]:
            if less <= score <= high:
                return label
        return "unknown"

    # =========================
    # MAIN
    # =========================
    @classmethod
    def evaluate(cls, test_type, answers):
        config = cls.CONFIG.get(test_type)
        if not config:
            raise ValueError("Invalid assessment type")

        if test_type == "pss":
            answers = cls.apply_pss_reverse_scoring(answers)

        score = cls.calculate_score(answers, test_type)
        risk = cls.get_risk_level(config, score)
        
        return {
            "score": score,
            "risk_level": risk,
            "insight": cls.INTERPRETATION.get(risk, ""),
            "meta": {},
            "disclaimer": cls.DISCLAIMER
        }