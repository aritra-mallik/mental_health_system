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
                (0, 13, "low"),
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

        "burnout": {
            "max_score": 50,
            "ranges": [
                (0, 18, "low"),
                (19, 35, "moderate"),
                (36, 50, "high"),
            ],
        }
    }

    SEVERITY_ORDER = {
        "normal": 0,
        "mild": 1,
        "moderate": 2,
        "severe": 3,
        "extremely_severe": 4
    }

    INTERPRETATION = {
        "low": "Low level",
        "moderate": "Moderate level",
        "high": "High level",
        "severe": "Severe level",
        "low_wellbeing": "Low wellbeing",
        "good_wellbeing": "Good wellbeing",
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
        for low, high, label in config["ranges"]:
            if low <= score <= high:
                return label
        return "unknown"

    # =========================
    # DASS-21 (FIXED)
    # =========================
    @classmethod
    def evaluate_dass21(cls, answers):
        if len(answers) != 21:
            raise ValueError("DASS-21 requires 21 answers")

        depression_idx = [0,3,6,9,12,15,18]
        anxiety_idx = [1,4,7,10,13,16,19]
        stress_idx = [2,5,8,11,14,17,20]

        depression = sum(answers[i] for i in depression_idx) * 2
        anxiety = sum(answers[i] for i in anxiety_idx) * 2
        stress = sum(answers[i] for i in stress_idx) * 2

        def level(score, ranges):
            for low, high, label in ranges:
                if low <= score <= high:
                    return label
            return "unknown"

        depression_level = level(depression, [
            (0,9,"normal"), (10,13,"mild"),
            (14,20,"moderate"), (21,27,"severe"), (28,42,"extremely_severe")
        ])

        anxiety_level = level(anxiety, [
            (0,7,"normal"), (8,9,"mild"),
            (10,14,"moderate"), (15,19,"severe"), (20,42,"extremely_severe")
        ])

        stress_level = level(stress, [
            (0,14,"normal"), (15,18,"mild"),
            (19,25,"moderate"), (26,33,"severe"), (34,42,"extremely_severe")
        ])

        levels = [depression_level, anxiety_level, stress_level]

        overall = max(
            levels,
            key=lambda x: cls.SEVERITY_ORDER.get(x, 0)
        )

        return {
            "score": depression + anxiety + stress,
            "risk_level": overall,
            "meta": {
                "depression": depression,
                "anxiety": anxiety,
                "stress": stress,
                "levels": {
                    "depression": depression_level,
                    "anxiety": anxiety_level,
                    "stress": stress_level,
                }
            },
            "insight": "Composite emotional state analysis",
            "disclaimer": cls.DISCLAIMER
        }

    # =========================
    # MAIN
    # =========================
    @classmethod
    def evaluate(cls, test_type, answers):

        if test_type == "dass21":
            return cls.evaluate_dass21(answers)

        config = cls.CONFIG.get(test_type)
        if not config:
            raise ValueError("Invalid assessment type")

        if test_type == "pss":
            answers = cls.apply_pss_reverse_scoring(answers)

        score = cls.calculate_score(answers, test_type)
        risk = cls.get_risk_level(config, score)
        alert = cls.generate_alert(
            source="assessment",
            risk=risk
        )
        return {
            "score": score,
            "risk_level": risk,
            "alert": alert,
            "insight": cls.INTERPRETATION.get(risk, ""),
            "meta": {},
            "disclaimer": cls.DISCLAIMER
        }
    @classmethod
    def generate_alert(cls, source, risk=None, mood=None, text=None):

        if source == "assessment":
            if risk in ["high", "severe", "low_wellbeing"]:
                return {"level": "red", "msg": "High concern detected"}
            elif risk in ["moderate", "subthreshold"]:
                return {"level": "orange", "msg": "Some strain detected"}
            return {"level": "green", "msg": "You're doing okay"}

        if source == "mood":
            if mood in ["sad", "anxious", "angry"]:
                return {"level": "orange", "msg": "You're not feeling your best"}
            elif mood == "neutral":
                return {"level": "yellow", "msg": "Neutral day"}
            return {"level": "green", "msg": "You're feeling positive"}

        if source == "chat":
            t = text.lower()
            if any(x in t for x in ["hopeless", "can't go on", "worthless"]):
                return {"level": "red", "msg": "Lumi sensed distress"}
            if any(x in t for x in ["sad", "stress", "overwhelmed", "tired"]):
                return {"level": "yellow", "msg": "Something feels off"}
            return {"level": "green", "msg": "Conversation stable"}
        if source == "journal":
            # sentiment-driven mood already computed upstream
            if mood in ["sad", "angry"]:
                return {
                    "level": "orange",
                    "msg": "You seem a bit distressed"
                }
            elif mood == "anxious":
                return {
                    "level": "yellow",
                    "msg": "You seem a bit anxious"
                }
            elif mood in ["happy", "excellent"]:
                return {
                    "level": "green",
                    "msg": "You seem to be doing great"
                }
            else:
                return {
                    "level": "green",
                    "msg": "You're stable"
                }