from rest_framework import serializers
from accounts.models import User

class ProfileViewSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = [
            "first_name",
            "middle_name",
            "last_name",
            "display_name",
            "email",
            "phone",
            "is_phone_verified",
            "is_email_verified",
            "date_of_birth",  # view only
            "gender"  ,        # view only
            "is_onboarded",
            "preferred_language",
            "dark_mode",
            "font_size"
        ]
        read_only_fields = ["date_of_birth", "gender"]
        
    def get_display_name(self, obj):
            return " ".join(filter(None, [
                obj.first_name,
                obj.middle_name,
                obj.last_name
            ]))    
        

class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "first_name",
            "middle_name",
            "last_name",
            "preferred_language",
            "dark_mode",
            "font_size",
        ]
        
class ConsentSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "consent_data_policy",
            "consent_ai_policy",
            "consent_encryption",
            "consent_terms",
        ]