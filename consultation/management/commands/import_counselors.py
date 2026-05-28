from django.core.management.base import BaseCommand
from django.conf import settings
from consultation.models import Counselor
import os
from datetime import date,timedelta,time
from consultation.models import Slot


class Command(BaseCommand):

    help = "Import counselors from counsellors.txt"

    def handle(self, *args, **kwargs):

        file_path = os.path.join(
            settings.BASE_DIR,
            "consultation",
            "counsellors.txt"
        )

        if not os.path.exists(file_path):

            self.stdout.write(
                self.style.ERROR(
                    "counsellors.txt not found"
                )
            )

            return


        with open(
            file_path,
            "r",
            encoding="utf-8"
        ) as file:

            blocks = file.read().strip().split(
                "\n\n\n"
            )


        inserted = 0
        skipped = 0


        for block in blocks:

            lines = [

                x.strip()

                for x in block.split("\n")

                if x.strip()

            ]


            if len(lines) < 11:

                self.stdout.write(
                    self.style.WARNING(
                        "Invalid counselor block skipped"
                    )
                )

                continue


            try:

                name = lines[0]

                email = lines[1]

                designation = lines[2]

                specialization = lines[3]

                experience = int(lines[4])

                consultation_fee = float(lines[5])

                rating = float(lines[6])

                total_sessions = int(lines[7])

                mode = lines[8].lower()

                office_address=lines[9]

                google_map_link=lines[10]


                if mode not in [
                    "online",
                    "offline"
                ]:

                    self.stdout.write(
                        self.style.WARNING(
                            f"Invalid mode for {name}"
                        )
                    )

                    continue


                counselor, created = (
                    Counselor.objects.get_or_create(

                        name=name,

                        defaults={

                            "email":email,

                            "designation":designation,

                            "specialization":specialization,

                            "experience":experience,

                            "consultation_fee":consultation_fee,
                            
                            "rating":rating,

                            "total_sessions":total_sessions,

                            "mode":mode,

                            "office_address":office_address,

                            "google_map_link":google_map_link,

                            "available":True
                        }
                    )
                )


                if created:

                    default_times=[

                        time(9,0),
                        time(10,0),
                        time(11,0),
                        time(14,0),
                        time(15,0)

                    ]

                    for day in range(60):

                        current_date=date.today()+timedelta(days=day)

                        for slot_time in default_times:

                            Slot.objects.get_or_create(

                                counselor=counselor,
                                date=current_date,
                                time=slot_time,

                                defaults={

                                    "mode":counselor.mode,
                                    "booked":False

                                }
                            )

                    inserted += 1

                else:

                    skipped += 1


            except Exception as e:

                self.stdout.write(
                    self.style.ERROR(
                        f"Error: {str(e)}"
                    )
                )


        self.stdout.write(

            self.style.SUCCESS(

                f"""
Import completed

Inserted: {inserted}
Skipped duplicates: {skipped}
                """

            )

        )