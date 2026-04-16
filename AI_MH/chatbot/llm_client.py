#AI_MH/chatbot/llm_client.py
import requests

OLLAMA_URL = "http://localhost:11434/api/generate"

def generate_response(prompt):
    payload = {
        "model": "phi",
        "prompt": prompt,
        "stream": False
    }

    response = requests.post(OLLAMA_URL, json=payload)

    if response.status_code != 200:
        return "Error: Unable to reach local model"

    data = response.json()
    return data.get("response", "").strip() or "I'm here for you. Can you tell me more?"