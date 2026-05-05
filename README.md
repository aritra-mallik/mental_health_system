# Mental Health Digital Intervention System

A privacy-focused web-based Mental Health Digital Intervention System developed using **Django**.  
The system provides mental health awareness, self-assessment, encrypted journaling, and AI-assisted supportive guidance in a **non-diagnostic and ethical manner**.

**z_dev set up**
cd z_dev

npm init -y

npm install tailwindcss @tailwindcss/cli

**add this during the deployment in the input**
@import "tailwindcss" source(none);
@source "./templates/**/*.html";
@source "./apps/**/templates/**/*.html";


**Django secret key generation**

python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

**Django encryption key generation**

python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
