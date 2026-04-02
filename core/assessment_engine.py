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
    def evaluate(cls, test_type, answers):
        score = cls.calculate_score(answers)
        risk = cls.get_risk_level(test_type, score)

        return {
            "score": score,
            "risk_level": risk,
            "insight": cls.INTERPRETATION[risk],
            "disclaimer": cls.DISCLAIMER
        }