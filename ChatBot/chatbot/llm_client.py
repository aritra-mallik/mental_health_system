from dotenv import load_dotenv
import os
from groq import Groq

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MODEL = "llama-3.1-8b-instant"

SYSTEM_PROMPT = """
You are a mental health support assistant.

RULES:
- Focus primarily on the last user message, but use context if needed for safety
- Keep responses between 2–4 sentences
- Ask at most ONE question
- Be empathetic but concise
- Do NOT provide medical or clinical advice
- Avoid generic responses
- For crisis situations, provide India-based helplines (not US numbers)
"""

def generate_response(prompt: str) -> str:
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.6,
            max_tokens=120
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print("LLM ERROR:", e)
        return "I'm here for you. Something went wrong—can you try again?"