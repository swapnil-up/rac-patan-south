#!/usr/bin/env python3
import argparse
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SORTED = ROOT / "_sources" / "sorted"
CLUSTERS = SORTED / "clusters.json"
INVENTORY = SORTED / "inventory.json"
OUT_JSON = SORTED / "curated_events.json"
OUT_MD = SORTED / "curated_events.md"
UPLOAD_DIR = ROOT / "public" / "uploads" / "events"
CONTENT_DIR = ROOT / "content" / "events"

HIGH_CONFIDENCE = {"explicit", "same_day", "inferred_year", "unknown"}
EXTRA_EVENT_IDS = {
    "C0029", "C0036", "C0038", "C0043", "C0044", "C0053", "C0054", "C0056",
    "C0072", "C0073", "C0078", "C0086", "C0090", "C0097", "C0109", "C0147",
    "C0165", "C0188", "C0216", "C0224", "C0225", "C0226", "C0229", "C0242",
    "C0251", "C0287", "C0289", "C0295", "C0300",
}
MERGE = {
    "C0042": "C0041",
    "C0050": "C0045",
    "C0134": "C0133",
    "C0207": "C0201",
    "C0125": "C0126",
    "C0137": "C0136",
    "C0181": "C0182",
    "C0190": "C0191",
    "C0193": "C0194",
    "C0234": "C0235",
    "C0294": "C0293",
    "C0299": "C0298",
    "C0303": "C0220",
    "C0304": "C0220",
    "C0099": "C0098",
    "C0127": "C0126",
    "C0129": "C0128",
    "C0145": "C0143",
    "C0148": "C0142",
    "C0150": "C0149",
    "C0198": "C0199",
    "C0200": "C0199",
    "C0210": "C0211",
    "C0221": "C0220",
    "C0227": "C0229",
    "C0228": "C0229",
    "C0236": "C0235",
    "C0028": "C0029",
    "C0030": "C0029",
    "C0046": "C0045",
    "C0079": "C0078",
    "C0080": "C0078",
    "C0081": "C0078",
    "C0082": "C0078",
    "C0083": "C0078",
    "C0166": "C0165",
    "C0167": "C0165",
    "C0181": "C0188",
    "C0182": "C0188",
    "C0183": "C0188",
    "C0184": "C0188",
    "C0049": "C0047",
    "C0114": "C0115",
    "C0193": "C0192",
    "C0194": "C0192",
    "C0288": "C0289",
    "C0084": "C0062",
}
EXCLUDE = set()
SLUGS = {
    "C0214": "2025-01-17-racps-was-thrilled-to-organize-a-cv-writing-workshop-at-st-xavier-s-school-jawalakhel-wi",
}

TITLES = {
    "C0001": "Panauti Eco-Farm Project",
    "C0002": "Rotary Awareness Campaign",
    "C0003": "Charity Show 2012",
    "C0009": "Cancer Awareness Flash Mob 2013",
    "C0004": "Seminar on Biogas and Rainwater Harvesting",
    "C0005": "Deusi Bhailo Program",
    "C0006": "Blood Donation Camp",
    "C0007": "Community Service at Sparks Orphanage",
    "C0008": "Designing Your Future: The Power of Goal Setting",
    "C0010": "Installation Ceremony 2013-14",
    "C0011": "Self Management for Excellent Achievement",
    "C0012": "Charter Presentation",
    "C0013": "Kavre Fellowship",
    "C0015": "Friendly Futsal with RAC Patan",
    "C0016": "Installation Ceremony 2014-15",
    "C0017": "Rotaract Public Speaking Forum and Friendly Futsal",
    "C0026": "International Yoga Day Session",
    "C0034": "Know the Law: First Session",
    "C0035": "Know the Law: 12-Day Online Training",
    "C0037": "Charter Day 2020",
    "C0039": "Know the Law: Session with Zone Clubs",
    "C0040": "Panel Discussion on the Machhindranath Jatra",
    "C0041": "Suicide Prevention Awareness Week 2020",
    "C0045": "Know the Inner Calmness and Peace Webinar",
    "C0051": "Book and Clothes Drive",
    "C0052": "Know the Law: Insurance Principles and Cases",
    "C0055": "Know the Law: Right to Safe Abortion in Nepal",
    "C0057": "Blood Donation Camp 2021",
    "C0062": "Book Donation Campaign for Jaleshwar Library",
    "C0058": "Know the Law: Writ Procedure in Nepal",
    "C0061": "Hike to Tarebhir",
    "C0063": "13th Rotaract District Conference, Pokhara",
    "C0066": "Goodwill Visit to Zone Clubs",
    "C0068": "ZRR Visit 2020-21",
    "C0069": "Twin Fellowship with RAC Patan",
    "C0070": "Mental Health Session on Stress Management",
    "C0071": "DRR Visit",
    "C0074": "Fellowship with RAC Dharan",
    "C0076": "Final General Meeting 2021",
    "C0087": "Fundraiser with Rotary Club of Patan South",
    "C0104": "Zonal Blood Donation Program",
    "C0115": "Know the Law: Rape Laws in Nepal",
    "C0124": "12th Installation Ceremony",
    "C0138": "Rtr. Pooja Wagle at RAC Jawalakhel Manjushree Inaugural Event",
    "C0139": "Equal Pay Day: Know the Law Session and Symposium",
    "C0152": "International Dignified Menstruation Day Webinar",
    "C0161": "Joint Meeting of 8 Zones of Kathmandu Valley",
    "C0163": "Poetry Saanjh 2024: First Edition",
    "C0168": "Eye, Dental and ENT Health Camp at Roshi, Kavre",
    "C0169": "Academic Boot Camp at Red Rose English Boarding School, Hetauda",
    "C0172": "17th Rotaract District Assembly, DLTS and Recognition Ceremony",
    "C0180": "ViduShe: Insights from Sajal Pradhan",
    "C0191": "ViduShe: Insights from Dr. Manusheela Pokharel",
    "C0170": "Adjourned General Meeting RY 2023-24",
    "C0192": "Stress Management Session with Shuvashree Dhungana",
    "C0195": "Post-Halloween Celebration 2024",
    "C0196": "उपहार: Wig Donation for Cancer Patients",
    "C0201": "Late Rtr. Santosh Memorial Nationwide Rota Quiz 2024",
    "C0206": "Rota Quiz Zonal Round 2024",
    "C0211": "Poetry Saanjh 2024: Second Edition",
    "C0212": "17th Rotaract District Conference, Butwal",
    "C0218": "World Rotaract Week 2025: Day 1",
    "C0220": "Rota Jatra 2025: Bisket Jatra Celebration",
    "C0229": "18th Rotaract District Assembly & DLTS 2025",
    "C0248": "Penlink Phase 2: Reading and Connecting Across Borders",
    "C0289": "15th Charter Day and Rasuwa Flood Relief Donation",
    "S_FINAL_ZONAL": "Final Zonal Meeting of Zone 8, 2021",
    "S_PENLINK_3": "Penlink Phase 3: Joint General Meeting with RAC University of Colombo",
    "C0088": "Cleaning Campaign at Mohani Jharana",
    "C0094": "11th Installation Ceremony",
    "C0096": "Blood Donation Program with King's College",
    "C0102": "Rotary Club of Patan South 25th Charter Day",
    "S_RACPS_10TH": "RACPS 10th Charter Day",
    "S_SACHIN_10TH": "10th Late Rtr. Sachin Memorial Blood Donation",
    "S_LAST_GM": "Last General Meeting RY 2025-26",
    "C0110": "Blood Donation Program with Interact Club of SXJ",
    "C0117": "VERSENY 4.0 Financial Literacy Session",
    "C0133": "Dengue Awareness Webinar",
    "C0136": "Public Speaking Event: AI in Education",
    "C0142": "Blood Donation at Pathshala Nepal, Bagdol",
    "C0143": "Valmiki MUN 2023",
    "C0147": "Blood Donation with Red Cross Pulchowk",
    "C0144": "Public Speaking Session with Zone Clubs",
    "C0146": "Gender-Based Violence Discussion",
    "C0151": "Secret Santa 2023",
    "C0149": "School Wall Painting",
    "C0160": "PS Meet and PETS/SETS in Damak",
    "C0162": "Twin Club MOU with RAC Bhadgaon",
    "C0156": "16th Rotaract District Conference",
    "C0158": "Joint Meeting with Rotary Club of Patan South, RAC KUSOM and Interact Club of SXJ",
    "C0165": "Break the Taboos: Menstrual Health Awareness Campaign",
    "C0173": "Kaksha-Kaksha Ma Shikshya: Menstrual Hygiene",
    "C0174": "Eco-Entrepreneurship with Eco Sathi Nepal",
    "C0175": "13th Installation Ceremony",
    "C0185": "Orphanage Visit and Momo Party",
    "C0188": "Rota Naach 2024",
    "C0197": "11th Late Rtr. Sachin Memorial Blood Donation",
    "C0202": "Zonal Picnic 2024",
    "C0205": "Vidushe: Insights from Dr. Stuti Wagle",
    "C0208": "Blood Donation Program with Rotary Club of Patan South",
    "C0126": "Breastfeeding Week Celebration",
    "C0128": "RACPS Fantasy League 2023-24",
    "C0086": "9th Charter Day",
    "C0097": "Food Donation at The Orphan Homes",
    "C0109": "Secret Santa 2022",
    "C0029": "Quarantine Art Festival",
    "C0036": "Online Fellowship: Bingo and Scavenger Hunt",
    "C0038": "Trans Women Rights Webinar with Miss Universe Nepal",
    "C0043": "International Literacy Week 2020",
    "C0044": "1st Virtual PS Meet 2020-21",
    "C0047": "Entrepreneurship Series: तीन दृष्टिकोण with Denim Krishna Shrestha",
    "C0053": "Diabetes Awareness Project and Twin-Club MOU",
    "C0054": "Public Speaking Session: The Festival Story",
    "C0056": "Cycle Safety Awareness Campaign",
    "C0072": "Know the Law Session VI: Struggle for Nijgadh's Survival",
    "C0073": "Sindhupalchok Flood Relief Fundraiser",
    "C0078": "A Shot of Hope: COVID-19 Vaccination Awareness Campaign",
    "C0090": "Annual Book Reading Campaign 2022",
    "C0199": "Pawprint of Love 2024",
    "C0209": "Secret Santa 2024",
    "C0213": "International Cultural Exchange 2025",
    "C0214": "CV Writing Workshop at St. Xavier's School, Jawalakhel",
    "C0216": "NAARI: A Women's History Month Symposium",
    "C0215": "KARUNA: Menstrual Health and Hygiene",
    "C0217": "Nationwide Cleaning Campaign 2025",
    "C0222": "Hike and Clean: Bishnudwar Trail",
    "C0235": "14th Installation Ceremony",
    "C0237": "Vidushe 2.0: First Session",
    "C0224": "ViduShe: Insights from Rupa Aryal",
    "C0226": "Twinship Signing with Rotaract Club of Bhadgaon",
    "C0225": "DRR Visit 2025",
    "C0239": "Book Donation to Harisiddhi Secondary School",
    "C0240": "Penlink Phase 1",
    "C0241": "Dashain Celebration at The Orphan Homes",
    "C0245": "SEARIC Summit Nepal",
    "C0247": "Secret Santa 2025",
    "C0244": "RACPS Fantasy Premier League 2025-26",
    "C0249": "Kaksha-Kaksha Ma Shikshya 25/26: Menstrual Health",
    "C0256": "RACPS in Birgunj",
    "C0242": "Know the Law: Tracing the Path of Democracy",
    "C0250": "18th Rotaract District Conference, Sauraha",
    "C0251": "AI-Aware: E-Gyaan Digital Literacy",
    "C0252": "Mind and Me: Phase I",
    "C0254": "General Meeting and Goodwill Visit with RAC KUSOM and RAC Mahabouddha",
    "C0259": "Goodwill Visit and Letterhead Exchange",
    "C0263": "Health, Hygiene, and You",
    "C0264": "Nationwide Cleaning Campaign 2026",
    "C0265": "Poetry Saanjh 2026",
    "C0267": "Project Sahayata 2026",
    "C0268": "Joint DRR Visit 2026",
    "C0269": "Final Zonal Meeting 2026",
    "C0271": "Zone 13 ZRR Welcome",
    "C0272": "19th Rotaract District Assembly",
    "C0282": "15th Installation Ceremony",
    "C0286": "ViduShe 3.0: Mental Health Session",
    "C0287": "RACPS FPL 2026",
    "C0288": "15th Charter Day",
    "C0290": "First Joint Meeting RY 2026-27",
    "C0293": "Badminton Fellowship",
    "C0295": "Ghatasthapana and Jamara Planting 2026",
    "C0297": "Halloween Party",
    "C0298": "Hike Fellowship to Sundarijal",
    "C0300": "Nawami Visit to Manavsewa Ashram",
}

DATES = {
    "C0026": "2020-06-21",
    "C0143": "2023-11-17",
    "C0195": "2024-11-08",
    "C0222": "2025-03-22",
    "C0250": "2026-02-06",
    "C0286": "2026-08-15",
    "C0072": "2021-06-12",
    "C0216": "2025-03-15",
    "C0225": "2025-04-26",
    "C0229": "2025-06-14",
    "C0242": "2025-11-11",
    "C0251": "2026-02-19",
    "C0003": "2012-09-27",
    "C0009": "2013-02-04",
    "C0015": "2014-07-19",
    "C0220": "2025-04-14",
    "S_FINAL_ZONAL": "2021-06-29",
    "S_PENLINK_3": "2026-01-29",
    "C0053": "2020-11-14",
    "C0044": "2020-09-26",
    "C0165": "2024-05-28",
    "C0188": "2024-09-28",
    "C0156": "2024-01-19",
    "S_RACPS_10TH": "2022-08-23",
    "S_SACHIN_10TH": "2023-12-27",
    "S_LAST_GM": "2026-06-29",
}

CATEGORIES = {
    "C0052": "professional_development",
    "C0055": "professional_development",
    "C0058": "professional_development",
    "C0222": "community_service",
    "C0239": "community_service",
    "C0241": "community_service",
    "C0248": "professional_development",
    "C0288": "club_service",
    "C0036": "fellowship",
    "C0043": "professional_development",
    "C0054": "professional_development",
    "C0072": "professional_development",
    "C0073": "fundraiser",
    "C0086": "club_service",
    "C0090": "fellowship",
    "C0097": "community_service",
    "C0147": "community_service",
    "C0109": "fellowship",
    "C0216": "partnership",
    "C0224": "professional_development",
    "C0225": "meeting",
    "C0229": "meeting",
    "C0242": "professional_development",
    "C0251": "professional_development",
    "C0287": "fellowship",
    "C0289": "community_service",
    "C0029": "fellowship",
    "C0038": "partnership",
    "C0044": "meeting",
    "C0053": "community_service",
    "C0056": "community_service",
    "C0078": "community_service",
    "C0165": "community_service",
    "C0188": "fellowship",
    "C0226": "international_service",
    "S_RACPS_10TH": "club_service",
    "S_SACHIN_10TH": "community_service",
    "S_LAST_GM": "meeting",
    "C0295": "fellowship",
    "C0300": "community_service",
    "C0062": "community_service",
    "C0195": "fellowship",
    "C0289": "community_service",
    "S_FINAL_ZONAL": "meeting",
    "S_PENLINK_3": "meeting",
}

LOCATIONS = {
    "C0034": "Zoom",
    "C0045": "Zoom",
    "C0052": "Zoom",
    "C0055": "Zoom",
    "C0058": "Zoom",
    "C0061": "Tarebhir",
    "C0063": "Pokhara",
    "C0074": "Dharan",
    "C0088": "Mohani Jharana",
    "C0094": "Fuse-On Pizza Hub & Cafe, Kamalpokhari",
    "C0096": "King's College, Bijuli Bazar, Kathmandu",
    "C0133": "Google Meet",
    "C0142": "Pathshala Nepal, Bagdol",
    "C0146": "Nepal Law Campus",
    "C0160": "Damak, Jhapa",
    "C0163": "Asado 88, Jhamsikhel",
    "C0185": "Bal Samrakhshan Abhiyan Nepal, Kuleshwor",
    "C0195": "Asado 88, Jhamsikhel",
    "C0197": "Mangal Bazaar, Patan",
    "C0201": "Godavari Botanical Garden",
    "C0202": "Godavari Botanical Garden",
    "C0205": "Google Meet",
    "C0211": "Asado Pub & Grill",
    "C0212": "Butwal",
    "C0213": "Virtual",
    "C0215": "HIV/AIDS Center for Girls, Godavari",
    "C0217": "Banglamukhi Mandir",
    "C0222": "Bishnudwar Trail",
    "C0239": "Harisiddhi Secondary School, Lalitpur",
    "C0240": "Harisiddhi Secondary School, Lalitpur",
    "C0241": "The Orphan Homes, Lalitpur",
    "C0245": "Hotel Pokhara Grande",
    "C0248": "Harisiddhi Secondary School, Lalitpur",
    "C0249": "Harisiddhi Secondary School, Lalitpur",
    "C0250": "Sauraha, Chitwan",
    "C0254": "Kathmandu",
    "C0263": "Shree Motibinayak Lower Secondary School",
    "C0265": "Doko Deli Restaurant, Jhamsikhel",
    "C0267": "Shree Motibinayak Lower Secondary School, Dholahiti",
    "C0269": "NSET, Bhaisepati",
    "C0216": "St. Xavier's School, Jawalakhel",
    "C0229": "Kathmandu",
    "C0242": "Google Meet",
    "C0251": "Google Meet",
    "C0038": "Online",
    "C0044": "Online",
    "C0078": "Online",
    "S_SACHIN_10TH": "Patan Multiple Campus",
    "S_LAST_GM": "Doko Deli Restaurant, Jhamsikhel",
    "C0156": "Nepal Academy Hall, Kathmandu",
    "C0272": "BICC, Butwal",
    "C0282": "Pulchowk Library Hall",
    "S_PENLINK_3": "Zoom",
}

ITEM_EXCLUDE = {
    "C0217": {"ig:0128"},
    "C0137": {"ig:0305"},
    "C0086": {"ig:0371", "ig:0370", "ig:0369"},
    "C0195": {"ig:0187"},
    "C0201": {"ig:0172"},
}

ITEM_ADD = {
    "C0139": ["ig:0305"],
    "C0206": ["ig:0172"],
    "C0222": ["ig:0128"],
}

SPLITS = {
    "C0102": [{"id": "S_RACPS_10TH", "item_ids": ["ig:0349"], "date_confidence": "explicit"}],
    "C0142": [
        {
            "id": "S_SACHIN_10TH",
            "item_ids": ["ig:0284", "ig:0283", "ig:0282"],
            "date_confidence": "same_day",
        }
    ],
    "C0254": [{"id": "S_LAST_GM", "item_ids": ["ig:0057"], "date_confidence": "same_day"}],
    "C0076": [{"id": "S_FINAL_ZONAL", "item_ids": ["ig:0387"], "date_confidence": "explicit"}],
    "C0248": [{"id": "S_PENLINK_3", "item_ids": ["ig:0092"], "date_confidence": "explicit"}],
}

HANDLES = {
    "@bihanisocialventure": "Bihani Social Venture",
    "@susmriti_piggy": "Susmriti",
    "@prashantkalauni": "Prashant Kalauni",
    "@racpatansouth": "Rotaract Club of Patan South",
    "@nepalcyclesociety": "Nepal Cycle Society",
    "@nepal.runningclub": "Nepal Running Club",
    "@kings_college_nepal": "King's College Nepal",
    "@kings_socialandsocialization_": "King's College Social and Socialization Club",
    "@theorphanshomes.official": "The Orphan Homes",
    "@sairas__adhikari": "Sairas Adhikari",
    "@_prashantbhattarai_": "Prashant Bhattarai",
    "@rotaract.himalayapatan": "Rotaract Club of Himalaya Patan",
    "@rotaractpatandurbarsquare": "Rotaract Club of Patan Durbar Square",
    "@rac_mahabouddha": "Rotaract Club of Mahabouddha",
    "@racktmmetropolis": "Rotaract Club of KTM Metropolis",
    "@interactclubofsxj": "Interact Club of St. Xavier's School, Jawalakhel",
    "@racpatan": "Rotaract Club of Patan",
    "@raclalitpur": "Rotaract Club of Lalitpur",
    "@rac_yala": "Rotaract Club of Yala",
    "@rac_jawalakhel_manjushree": "Rotaract Club of Jawalakhel Manjushree",
    "@rackantipur": "Rotaract Club of Kantipur",
    "@kathmanduwest": "Rotaract Club of Kathmandu West",
    "@racvenugrambgm": "Rotaract Club of Venugram BGM",
    "@surakshyaa__": "Surakshya Niraula",
    "@rotaract_kusom": "Rotaract Club of KUSOM",
    "@rotaractbalajuofficial": "Rotaract Club of Balaju",
    "@rotaractclubofpdc": "Rotaract Club of PDC",
    "@rackmc_duwakot": "Rotaract Club of KMC Duwakot",
    "@samayakhadka1": "Samaya Khadka",
    "@sharingopportunities_": "Sharing Opportunities",
    "@no_comment_3.5": "",
    "@rac.bardibas": "Rotaract Club of Bardibas",
    "@racbirtamodemidtown_official": "Rotaract Club of Birtamode Midtown",
    "@raccharumati": "Rotaract Club of Charumati",
    "@rac_nmcth21525": "Rotaract Club of NMC Teaching Hospital",
    "@rac_shankaracharya": "Rotaract Club of Shankaracharya",
    "@united_rotaract_birgunj": "United Rotaract of Birgunj",
    "@racurlabari": "Rotaract Club of Urlabari",
    "@dokodeli": "",
}

MENTION_RE = re.compile(r"@[\w.]+")


def resolve_mentions(value):
    for _ in range(4):
        updated = re.sub(r"(@[\w.]+)\s+(?=@)", r"\1, ", value)
        if updated == value:
            break
        value = updated
    value = re.sub(r"(@[\w.]+)\s+and\s+(@[\w.]+)", r"\1, and \2", value)
    return MENTION_RE.sub(lambda match: HANDLES.get(match.group(0).lower(), ""), value)


BODY_OVERRIDES = {
    "C0165": (
        "Break the Taboos was RACPS's menstrual health awareness campaign, sharing common myths and facts "
        "about menstruation, personal period stories, and messages encouraging open conversation around menstrual health."
    ),
    "C0226": (
        "RACPS signed a twinship with Rotaract Club of Bhadgaon, strengthening the partnership between the two clubs."
    ),
    "C0214": (
        "RACPS was thrilled to organize a CV Writing Workshop at St. Xavier's School, Jawalakhel "
        "with Rotaract Club of Balaju, Rotaract Club of PDC, and Rotaract Club of KMC Duwakot as the co-host clubs.\n\n"
        "The workshop was hosted by Samaya Khadka, CEO of Sharing Opportunities. His guidance and expertise "
        "made the session immensely productive, serving as a valuable learning experience for all participants."
    ),
    "C0224": (
        "RACPS hosted ViduShe: Insights from Rupa Aryal, founder of Aama Chori Achar, "
        "for a conversation on her journey and work."
    ),
    "C0225": (
        "RACPS hosted the District Rotaract Representative (DRR) visit on 26 April 2025."
    ),
    "C0229": (
        "RACPS participated in the 18th Rotaract District Assembly and DLTS Recognition Ceremony, "
        "held in Kathmandu on 14 June 2025."
    ),
    "C0242": (
        "Know the Law: Tracing the Path of Democracy — From Voter Registration to the Election Results "
        "was held on 11 November 2025 via Google Meet, from 7:00 to 8:00 PM. "
        "The session was facilitated by Kramik Kafley and Oshin Maharjan of the Accountability Lab Nepal team."
    ),
    "C0289": (
        "RACPS marked its 15th Charter Day by turning the celebration into a Rasuwa flood relief donation drive, "
        "contributing support to those affected by the floods."
    ),
    "C0071": "RACPS hosted the District Rotaract Representative (DRR) visit on 29 May 2021.",
    "C0091": (
        "RACPS ran an election awareness campaign to encourage informed and active participation "
        "in the democratic process."
    ),
    "C0170": (
        "The final general meeting of RY 2023-24 was adjourned. The club wrapped up the year's remaining "
        "business and thanked members for their work."
    ),
    "C0297": "RACPS celebrated Halloween with a fellowship party.",
}

EMOJI_RE = re.compile(
    "["
    "\U0001F000-\U0001FAFF"
    "\U00002700-\U000027BF"
    "\U00002600-\U000026FF"
    "\U0001F1E6-\U0001F1FF"
    "\U0000FE0F"
    "\U0000200D"
    "]"
)


def clean_text(value):
    if not value:
        return ""
    text = resolve_mentions(value)
    text = text.replace("\r", "\n").replace("\u00a0", " ")
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"www\.\S+", " ", text)
    text = re.sub(r"@[\w.]+", " ", text)
    text = re.sub(r"#\w+", " ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\bPS:.*$", "", text, flags=re.S | re.I)
    text = re.sub(r"^\s*RE\s*POST\s*:\s*", "", text, flags=re.I)
    text = EMOJI_RE.sub(" ", text)
    text = re.sub(r"[*_`>#]+", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    text = re.sub(r"\(\s*\)", "", text)
    text = re.sub(r"\s+([.,!?;:])", r"\1", text)
    text = re.sub(r"(,\s*){2,}", ", ", text)
    text = re.sub(r",\s*([.!?])", r"\1", text)
    text = re.sub(r"([.!?])\s*,", r"\1", text)
    text = re.sub(r"\.{4,}", "...", text)
    text = re.sub(r"(?<!\.)\.\.(?!\.)", ".", text)
    return text.strip(" \n-")


def dedupe_sentences(text):
    parts = re.split(r"(?<=[.!?])\s+", text)
    seen = set()
    kept = []
    for part in parts:
        key = re.sub(r"\W+", " ", part.lower()).strip()
        if not key or key in seen:
            continue
        seen.add(key)
        kept.append(part.strip())
    return " ".join(kept)


def shorten(text, limit=320):
    text = text.strip()
    if len(text) <= limit:
        return text
    cut = text[:limit]
    boundary = max(cut.rfind(". "), cut.rfind("; "), cut.rfind(" "))
    if boundary > limit * 0.55:
        cut = cut[:boundary]
    return cut.rstrip(" ,;:.") + "..."


def slugify(value):
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "event"


def rota_year(date_string):
    year = int(date_string[:4])
    start = year if int(date_string[5:7]) >= 7 else year - 1
    return f"{start}-{str(start + 1)[-2:]}"


def normalize_source_type(item):
    source_type = item.get("source_type") or "manual"
    if source_type == "post":
        return "instagram_post"
    if source_type == "reel":
        return "instagram_reel"
    if source_type == "repost":
        return "instagram_repost"
    if source_type == "archived":
        return "instagram_archived"
    return source_type


def source_url(item):
    if item.get("source_url"):
        return item["source_url"]
    if item.get("shortcode"):
        kind = "reel" if item.get("source_type") == "reel" else "p"
        return f"https://www.instagram.com/racpatansouth/{kind}/{item['shortcode']}/"
    return None


def collect_media(item_ids, inventory):
    media_items = []
    seen = set()
    for item_id in item_ids:
        item = inventory[item_id]
        for media in item.get("media") or []:
            if not media.get("exists"):
                continue
            if media.get("kind") not in {"image", "image_webp", "image_heic", "video"}:
                continue
            key = media.get("path")
            if key and key not in seen:
                seen.add(key)
                media_items.append(media)
    return media_items


def convert_media(media, target):
    source = ROOT / media["path"]
    if not source.exists():
        return None
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    if target.exists():
        return f"/uploads/events/{target.name}"
    if media.get("kind") == "video":
        command = [
            "ffmpeg", "-y", "-threads", "1", "-filter_threads", "1",
            "-ss", "1", "-i", str(source),
            "-frames:v", "1", "-vf", "scale='min(1600,iw)':-2", "-q:v", "3", str(target),
        ]
    else:
        command = [
            "convert", "-limit", "thread", "1", "-limit", "memory", "256MiB",
            str(source), "-auto-orient", "-resize", "1600x1600>",
            "-strip", "-quality", "82", str(target),
        ]
    env = {**os.environ, "MAGICK_THREAD_LIMIT": "1", "OMP_NUM_THREADS": "1", "MKL_NUM_THREADS": "1"}
    try:
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=45, env=env)
    except Exception:
        return None
    return f"/uploads/events/{target.name}" if target.exists() else None


def make_event_images(slug, media_items):
    converted = []
    for media in media_items[:7]:
        target = UPLOAD_DIR / (f"{slug}.jpg" if not converted else f"{slug}-{len(converted) + 1}.jpg")
        path = convert_media(media, target)
        if path:
            converted.append(path)
    if not converted:
        return None, []
    return converted[0], [{"image": path, "caption": ""} for path in converted[1:]]


def yaml_value(value):
    return json.dumps(value, ensure_ascii=False)


def make_event(event_id, item_ids, title, date, category, location, date_confidence, inventory):
    texts = []
    urls = []
    for item_id in item_ids:
        item = inventory[item_id]
        text = item.get("caption") or item.get("body_text") or ""
        cleaned = clean_text(text)
        if cleaned:
            texts.append(cleaned)
        url = source_url(item)
        if url and url not in urls:
            urls.append(url)
    body = BODY_OVERRIDES.get(event_id) or dedupe_sentences(" ".join(texts))
    description = shorten(body, 340) or title
    slug = SLUGS.get(event_id) or f"{date}-{slugify(title)}"
    media_items = collect_media(item_ids, inventory)
    image, photos = make_event_images(slug, media_items)
    return {
        "id": event_id,
        "item_ids": item_ids,
        "title": title,
        "slug": slug,
        "date": date,
        "category": category,
        "rotaYear": rota_year(date),
        "location": location,
        "description": description,
        "body": body,
        "image": image,
        "photos": photos,
        "sourceUrl": urls[0] if urls else None,
        "sourceType": normalize_source_type(inventory[item_ids[0]]),
        "item_count": len(item_ids),
        "media_count": sum(len(inventory[item_id].get("media") or []) for item_id in item_ids),
        "date_confidence": date_confidence,
    }


def build():
    inventory = {item["id"]: item for item in json.loads(INVENTORY.read_text())["items"]}
    clusters = {cluster["id"]: cluster for cluster in json.loads(CLUSTERS.read_text())}
    events = []
    for cluster in clusters.values():
        if cluster["content_kind"] != "event" and cluster["id"] not in EXTRA_EVENT_IDS:
            continue
        if cluster["date_confidence"] not in HIGH_CONFIDENCE:
            continue
        if cluster["id"] in EXCLUDE:
            continue
        primary = MERGE.get(cluster["id"], cluster["id"])
        if primary != cluster["id"]:
            continue
        member_clusters = [cluster]
        member_clusters.extend(clusters[cid] for cid, target in sorted(MERGE.items()) if target == cluster["id"])
        item_ids = [
            item_id
            for member in member_clusters
            for item_id in member["item_ids"]
            if item_id not in ITEM_EXCLUDE.get(member["id"], set())
        ]
        item_ids = [item_id for item_id in item_ids if item_id not in ITEM_EXCLUDE.get(cluster["id"], set())]
        item_ids.extend(item_id for item_id in ITEM_ADD.get(cluster["id"], []) if item_id not in item_ids)
        split_events = SPLITS.get(cluster["id"], [])
        moved_items = {item_id for split in split_events for item_id in split["item_ids"]}
        item_ids = [item_id for item_id in item_ids if item_id not in moved_items]
        date = DATES.get(cluster["id"], cluster["event_date"])
        raw_title = clean_text(cluster["title"])
        if len(raw_title) > 110:
            raw_title = raw_title[:110].rsplit(" ", 1)[0]
        title = TITLES.get(cluster["id"], raw_title.rstrip(" .,:;!?-"))
        category = CATEGORIES.get(cluster["id"], cluster["category"])
        location = LOCATIONS.get(cluster["id"]) or cluster.get("location")
        if item_ids:
            events.append(make_event(
                cluster["id"], item_ids, title, date, category, location,
                cluster["date_confidence"], inventory,
            ))
        for split in split_events:
            split_id = split["id"]
            events.append(make_event(
                split_id, split["item_ids"], TITLES[split_id], DATES[split_id],
                CATEGORIES[split_id], LOCATIONS.get(split_id), split["date_confidence"], inventory,
            ))
    events.sort(key=lambda event: (event["date"], event["slug"]))
    OUT_JSON.write_text(json.dumps(events, indent=2, ensure_ascii=False) + "\n")
    lines = [
        "# Curated Events",
        "",
        f"{len(events)} events. Dates marked unknown fall back to the Instagram post date.",
        "",
        "| Date | Title | Category | Rota Year | Source |",
        "|---|---|---|---|---|",
    ]
    for event in events:
        source = f"[{event['sourceType']}]({event['sourceUrl']})" if event["sourceUrl"] else "—"
        lines.append(
            f"| {event['date']} | {event['title']} | {event['category']} | {event['rotaYear']} | {source} |"
        )
    OUT_MD.write_text("\n".join(lines) + "\n")
    return events


def write_content(events):
    CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    desired = {f"{event['slug']}.md" for event in events}
    for path in CONTENT_DIR.glob("*.md"):
        if path.name not in desired:
            path.unlink()
    written = 0
    for event in events:
        frontmatter = [
            "---",
            f"title: {yaml_value(event['title'])}",
            f"slug: {yaml_value(event['slug'])}",
            f"date: {yaml_value(event['date'] + 'T00:00:00.000Z')}",
            'type: "past"',
        ]
        if event["location"]:
            frontmatter.append(f"location: {yaml_value(event['location'])}")
        frontmatter.extend([
            f"description: {yaml_value(event['description'])}",
            f"category: {yaml_value(event['category'])}",
            f"rotaYear: {yaml_value(event['rotaYear'])}",
            f"sourceType: {yaml_value(event['sourceType'])}",
        ])
        if event["sourceUrl"]:
            frontmatter.append(f"sourceUrl: {yaml_value(event['sourceUrl'])}")
        if event["image"]:
            frontmatter.append(f"image: {yaml_value(event['image'])}")
        if event.get("photos"):
            frontmatter.append("photos:")
            for photo in event["photos"]:
                frontmatter.append(f"  - image: {yaml_value(photo['image'])}")
                frontmatter.append(f"    caption: {yaml_value(photo['caption'])}")
        frontmatter.extend(['registrationLink: ""', "---"])
        body = event["body"] or event["description"]
        path = CONTENT_DIR / f"{event['slug']}.md"
        path.write_text("\n".join(frontmatter) + "\n\n" + body + "\n")
        written += 1
    return written


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    events = build()
    print(f"Wrote {len(events)} curated events to {OUT_JSON}")
    print(f"Wrote review table to {OUT_MD}")
    if args.write:
        written = write_content(events)
        print(f"Wrote {written} event markdown files to {CONTENT_DIR}")


if __name__ == "__main__":
    main()
