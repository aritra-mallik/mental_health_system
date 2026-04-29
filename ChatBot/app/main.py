from rules.safety import check_critical
from chatbot.prompt_builder import build_prompt
from chatbot.llm_client import generate_response


def main():
    print("Mental Health CLI (type 'exit' to quit)\n")

    history = []

    while True:
        user_input = input("You: ").strip()

        if user_input.lower() == "exit":
            break

        if not user_input:
            continue

        # --- Safety detection ---
        is_critical = check_critical(user_input)

        # --- Strategy ---
        strategy = "CRITICAL" if is_critical else "SUPPORT"

        # --- Maintain history ---
        history.append(f"User: {user_input}")
        history = history[-6:]

        conversation = "\n".join(history)

        # --- Prompt + response ---
        prompt = build_prompt(conversation, strategy, is_critical)
        response = generate_response(prompt)

        # --- Save bot reply ---
        history.append(f"Bot: {response}")
        history = history[-6:]

        # --- Output ---
        print(f"[Critical]: {is_critical}")
        print(f"Bot: {response}\n")


if __name__ == "__main__":
    main()