from features.feature_builder import build_features
from ml.phq_predict import predict_risk
from rules.rule_engine import get_strategy
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

     
        is_critical = check_critical(user_input)

        if is_critical:
            risk = "HIGH"
            features = None
        else:
            features = build_features(user_input)
            risk = predict_risk(features)

        strategy = get_strategy(risk, is_critical)

       
        history.append(f"User: {user_input}")
        history = history[-6:]  

        
        conversation = "\n".join(history)

        prompt = build_prompt(conversation, strategy, is_critical)

        response = generate_response(prompt)

       
        history.append(f"Bot: {response}")
        history = history[-6:]

       
        if features:
            print(f"[Sentiment]: {features['sentiment']}")
        else:
            print("[Sentiment]: N/A (safety override)")

        print(f"[Risk]: {risk}")
        print(f"Bot: {response}\n")


if __name__ == "__main__":
    main()