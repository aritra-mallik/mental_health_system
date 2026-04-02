from django import forms
from django.contrib.auth.password_validation import validate_password


class RegistrationForm(forms.Form):
    full_name = forms.CharField(max_length=150)
    email = forms.EmailField()
    phone = forms.CharField(max_length=15)

    password = forms.CharField(widget=forms.PasswordInput)
    confirm_password = forms.CharField(widget=forms.PasswordInput)

    def clean(self):
        cleaned = super().clean()
        password = cleaned.get("password")
        confirm = cleaned.get("confirm_password")

        if password != confirm:
            raise forms.ValidationError("Passwords do not match")

        validate_password(password)
        return cleaned


class OTPForm(forms.Form):
    otp = forms.CharField(max_length=6)


class ConsentForm(forms.Form):
    data_policy = forms.BooleanField()
    ai_disclaimer = forms.BooleanField()
    encryption_policy = forms.BooleanField()
    accepted_terms = forms.BooleanField()
