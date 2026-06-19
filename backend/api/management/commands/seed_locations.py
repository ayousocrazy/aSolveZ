"""
Seed Nepal's 7 provinces and 77 districts.
Source: Government of Nepal, Ministry of Federal Affairs and General Administration.
Province names are official names as gazetted.
"""
from django.core.management.base import BaseCommand
from api.models import Province, District

NEPAL_DATA = {
    1: {
        "name": "Koshi",
        "districts": [
            "Bhojpur", "Dhankuta", "Ilam", "Jhapa", "Khotang",
            "Morang", "Okhaldhunga", "Panchthar", "Sankhuwasabha",
            "Solukhumbu", "Sunsari", "Taplejung", "Terhathum", "Udayapur",
        ],
    },
    2: {
        "name": "Madhesh",
        "districts": [
            "Bara", "Dhanusha", "Mahottari", "Parsa", "Rautahat",
            "Saptari", "Sarlahi", "Siraha",
        ],
    },
    3: {
        "name": "Bagmati",
        "districts": [
            "Bhaktapur", "Chitwan", "Dhading", "Dolakha", "Kathmandu",
            "Kavrepalanchok", "Lalitpur", "Makwanpur", "Nuwakot",
            "Ramechhap", "Rasuwa", "Sindhuli", "Sindhupalchok",
        ],
    },
    4: {
        "name": "Gandaki",
        "districts": [
            "Baglung", "Gorkha", "Kaski", "Lamjung", "Manang",
            "Mustang", "Myagdi", "Nawalpur", "Parbat", "Syangja", "Tanahun",
        ],
    },
    5: {
        "name": "Lumbini",
        "districts": [
            "Arghakhanchi", "Banke", "Bardiya", "Dang", "Gulmi",
            "Kapilvastu", "Nawalparasi (Bardaghat Susta West)", "Palpa",
            "Pyuthan", "Rolpa", "Rupandehi", "Eastern Rukum",
        ],
    },
    6: {
        "name": "Karnali",
        "districts": [
            "Dolpa", "Humla", "Jajarkot", "Jumla", "Kalikot",
            "Mugu", "Salyan", "Surkhet", "Western Rukum",
        ],
    },
    7: {
        "name": "Sudurpashchim",
        "districts": [
            "Achham", "Baitadi", "Bajhang", "Bajura", "Dadeldhura",
            "Darchula", "Doti", "Kailali", "Kanchanpur",
        ],
    },
}


class Command(BaseCommand):
    help = "Seed Nepal provinces and districts (7 provinces, 77 districts)"

    def handle(self, *args, **options):
        total_districts = 0
        for number, data in NEPAL_DATA.items():
            province, created = Province.objects.get_or_create(
                number=number,
                defaults={"name": data["name"]}
            )
            if not created:
                province.name = data["name"]
                province.save()
            action = "Created" if created else "Updated"
            self.stdout.write(f"  {action} Province {number}: {data['name']}")

            for district_name in data["districts"]:
                _, d_created = District.objects.get_or_create(
                    name=district_name,
                    province=province,
                )
                if d_created:
                    total_districts += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. 7 provinces, {total_districts} new districts seeded "
            f"(total in DB: {District.objects.count()})."
        ))
