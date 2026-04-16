# ml/input_schema.py

class MentalHealthInput:
    """
    Standardized input schema for AI_MH pipeline
    """

    def __init__(
        self,
        text: str,
        sentiment: float,
        phq_score: int,
        gad_score: int,
        history_len: int = 0
    ):
        self.text = text
        self.sentiment = sentiment
        self.phq_score = phq_score
        self.gad_score = gad_score
        self.history_len = history_len

        self._validate()

    def _validate(self):
        """
        Basic validation to prevent runtime errors
        """

        if not isinstance(self.text, str):
            raise ValueError("text must be a string")

        if not isinstance(self.sentiment, (int, float)):
            raise ValueError("sentiment must be numeric")

        if not isinstance(self.phq_score, int):
            raise ValueError("phq_score must be integer")

        if not isinstance(self.gad_score, int):
            raise ValueError("gad_score must be integer")

        if not isinstance(self.history_len, int):
            raise ValueError("history_len must be integer")

    def to_dict(self):
        """
        Convert to dictionary (useful later for logging / APIs)
        """
        return {
            "text": self.text,
            "sentiment": self.sentiment,
            "phq_score": self.phq_score,
            "gad_score": self.gad_score,
            "history_len": self.history_len
        }