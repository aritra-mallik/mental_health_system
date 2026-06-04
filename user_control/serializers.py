from rest_framework import serializers
from accounts.models import User

class ProfileViewSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    
    age = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = [
            "first_name",
            "middle_name",
            "last_name",
            "display_name",
            "email",
            "is_email_verified",
            "date_of_birth",  # view only
            "gender"  ,        # view only
            "age",            # view only
            "is_onboarded",
            "dark_mode",
            "font_size"
        ]
        read_only_fields = ["date_of_birth", "gender", "age"]
        
    def get_display_name(self, obj):
            return " ".join(filter(None, [
                obj.first_name,
                obj.middle_name,
                obj.last_name
            ]))    
            
    def get_age(self, obj):
        return obj.get_age() if hasattr(obj, 'get_age') else None
        

class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "first_name",
            "middle_name",
            "last_name",
            "dark_mode",
            "font_size",
        ]
        
class ConsentSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["consent_all_policies"]