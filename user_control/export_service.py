from accounts.models import User
import json

def export_user_data(user: User):
    data = {
        "profile": {
            "name": user.display_name,
            "email": user.email,
            "phone": user.phone,
        },
        "consents": {
            "data_policy": user.consent_data_policy,
            "ai_policy": user.consent_ai_policy,
        }
    }

    return json.dumps(data, indent=4)