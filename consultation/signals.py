from django.db.models.signals import post_migrate
from django.dispatch import receiver
from .models import Counselor, MentalHealthCategory, ConsultationType, AvailabilitySlot
from datetime import date, timedelta, time


@receiver(post_migrate)
def seed_data(sender, **kwargs):

    if sender.name != "consultation":
        return

    if Counselor.objects.exists():
        return

    # Categories
    anxiety, _ = MentalHealthCategory.objects.get_or_create(name="Anxiety")
    depression, _ = MentalHealthCategory.objects.get_or_create(name="Depression")
    stress, _ = MentalHealthCategory.objects.get_or_create(name="Stress")
    relationship, _ = MentalHealthCategory.objects.get_or_create(name="Relationship")
    trauma, _ = MentalHealthCategory.objects.get_or_create(name="Trauma")

    # Consultation types
    video, _ = ConsultationType.objects.get_or_create(
        name="Video Consultation",
        defaults={"description": "Online video session"}
    )

    chat, _ = ConsultationType.objects.get_or_create(
        name="Chat Consultation",
        defaults={"description": "Text-based consultation"}
    )

    counselors = [

        {
            "name": "Dr. Ananya Sen",
            "designation": "Clinical Psychologist (Anxiety Specialist)",
            "experience": 10,
            "categories": [anxiety, stress],
            "hospital": "Apollo Clinic, Kolkata",
        },

        {
            "name": "Dr. Rahul Mehta",
            "designation": "Psychiatrist (Depression Specialist)",
            "experience": 12,
            "categories": [depression, anxiety],
            "hospital": "Fortis Hospital, Kolkata",
        },

        {
            "name": "Dr. Priya Sharma",
            "designation": "Relationship Therapist",
            "experience": 8,
            "categories": [relationship, stress],
            "hospital": "AMRI Hospital, Kolkata",
        },

        {
            "name": "Dr. Arjun Roy",
            "designation": "Trauma & PTSD Specialist",
            "experience": 15,
            "categories": [trauma, anxiety],
            "hospital": "Medica Superspecialty, Kolkata",
        },

        {
            "name": "Dr. Neha Kapoor",
            "designation": "Child Psychologist",
            "experience": 9,
            "categories": [stress, anxiety],
            "hospital": "Apollo Clinic, Kolkata",
        },

        {
            "name": "Dr. Vikram Das",
            "designation": "Addiction & Behavioral Therapist",
            "experience": 11,
            "categories": [stress, depression],
            "hospital": "Fortis Hospital, Kolkata",
        },

        {
            "name": "Dr. Sneha Iyer",
            "designation": "Cognitive Behavioral Therapist",
            "experience": 7,
            "categories": [anxiety, depression],
            "hospital": "AMRI Hospital, Kolkata",
        },

        {
            "name": "Dr. Amit Verma",
            "designation": "Mental Health Consultant",
            "experience": 13,
            "categories": [stress, relationship],
            "hospital": "Medica Hospital, Kolkata",
        },
    ]

    for c in counselors:

        counselor = Counselor.objects.create(
            name=c["name"],
            designation=c["designation"],
            bio="Experienced and verified mental health professional",

            education="PhD in Clinical Psychology",
            university="Delhi University",

            experience_years=c["experience"],
            patients_treated=500,
            success_rate=92,

            consultation_fee=800,
            session_duration=30,

            hospitals=c["hospital"],
            achievements="Recognized mental health expert",
            research_work="Published research in psychotherapy",
            innovations="Applied CBT and AI-assisted therapy methods",

            is_verified=True
        )

        counselor.categories.add(*c["categories"])
        counselor.consultation_types.add(video, chat)

        for i in range(5):
            for t in [time(10, 0), time(12, 0), time(15, 0)]:

                mode = 'offline' if "Hospital" in c["hospital"] else 'online'

                AvailabilitySlot.objects.create(
                    counselor=counselor,
                    date=date.today() + timedelta(days=i),
                    time=t,
                    duration=30,
                    mode=mode,

                    chamber_name=c["hospital"],
                    location="Kolkata",
                )