# Data Provenance Log

A capstone reviewer or live-demo audience can cross-check every property in this build against the cited source. This document explains what is real, what is synthetic, and why.

**Last verified:** 2026-05-27. RERA numbers should be re-checked within 30 days of the demo if the projects' registration status could change.

## What is real (verifiable by the audience)

### 5 hero projects with verified RERA numbers

| # | Project | Developer | Locality | RERA Number | Possession | Source |
|---|---|---|---|---|---|---|
| 1 | DLF Privana West | DLF Limited | Sector 76, Gurugram | RC/REP/HARERA/GGM/819/551/2024/46 | Dec 2028 | [DLF official](https://www.dlf.in/homes/luxury/privananorth/) + HARERA portal |
| 2 | Lodha Supremus Lower Parel | Macrotech (Lodha) | Lower Parel, Mumbai | A51800000454 | Dec 2026 | [SquareYards listing](https://www.squareyards.com/mumbai-residential-property/lodha-supremus-lower-parel/107717/project) + MahaRERA |
| 3 | Kolte-Patil Life Republic | Kolte-Patil Developers | Hinjewadi Phase 2, Pune | P52100047317 | Dec 2027 | [Kolte-Patil official](https://www.koltepatil.com/pune/residential-properties/ongoing/life-republic) + MahaRERA |
| 4 | Prestige Park Grove | Prestige Group | Whitefield (Seegehalli), Bangalore | PRM/KA/RERA/1251/446/PR/100823/006141 | Dec 2027 | [99acres](https://www.99acres.com/prestige-park-grove-whitefield-bangalore-east-npxid-r410449) + K-RERA |
| 5 | Godrej Tropical Isle | Godrej Properties | Sector 146, Noida | UPRERAPRJ303390 | Feb 2030 | [SquareYards](https://www.squareyards.com/noida-residential-property/godrej-tropical-isle/227972/project) + UP-RERA |

To verify any RERA number live during demo:

- Maharashtra: https://maharera.maharashtra.gov.in → search by RERA number
- Karnataka: https://rera.karnataka.gov.in
- Haryana (Gurugram): https://haryanarera.gov.in
- UP (Noida): https://www.up-rera.in

### 10 supporting projects

Real developer + real locality + realistic price band (averaged from current 99acres and MagicBricks listings as of May 2026). RERA numbers on these rows are placeholder-format pending lookup if asked. Documented here for transparency:

- Trident Towers (M3M, Sector 65 Gurugram) — developer real, project name representative
- Riverdale Park (Mahindra Lifespaces, Mahalunge Pune) — developer real, project name representative
- Marina Bay (Hiranandani, Powai) — developer real, location real, project name representative of Hiranandani Gardens cluster
- Hebbal Greens (Sobha, Hebbal Bangalore) — developer real, project name representative
- Sarjapur Heights (Brigade, Sarjapur Road Bangalore) — developer real, project name representative
- Wagholi Springs (Kohinoor, Wagholi Pune) — developer real, project name representative
- Andheri Crest (Oberoi, Andheri West Mumbai) — developer real, project name representative
- Faridabad Greens (Puri, Sector 81 Faridabad) — developer real, project name representative
- Electronic City Pulse (Puravankara, EC Bangalore) — developer real, project name representative
- Hinjewadi Vista (Paranjape, Hinjewadi Phase 2 Pune) — developer real, project name representative

These are documented as "representative" inventory. The capstone PRD §8 explicitly allows simulated supporting data so the system can demonstrate scale beyond the 5 verified rows.

## What is synthetic by design (and why)

| Data | Reason |
|---|---|
| **Lead records (30)** | Real PII would violate the DPDP Act. The 30 leads include all source types, intent variations, and journey stages needed to demo the system. The 15 eval leads have hand-coded ground truth for the Section 8 validation widget. |
| **Lead phone numbers** | All synthetic Indian-format numbers (`+9198100123XX`). Twilio sandbox only sends to numbers that have opted in via the sandbox keyword, so no real person receives spam. |
| **Campaign metrics** | PRD §8 explicitly scopes out live Meta/Google API integration. Simulated CPL/impression/click data uses realistic ranges from public CPL benchmarks. |
| **Bookings (2)** | Real bookings require real buyers and developer agreements. The two booked leads (Deepak Choudhary, Priyanka Das) demonstrate the closed-loop attribution chain. |
| **Visit objections** | Real visit notes contain PII. The seeded notes are realistic vignettes that exercise the objection extraction prompt. |
| **Manager / executive names** | Priya and Rohit are placeholder names per the personas in PRD §3. |

## Optional: Kaggle-based mass import (not used, available as backup)

If the demo needs more breadth (e.g., reviewer asks "can it handle 500 properties?"), the user can import additional rows from a public Kaggle dataset:

- **Indian Housing Prices** dataset: https://www.kaggle.com/datasets/ruchi798/housing-prices-in-metropolitan-areas-of-india
  - Covers Mumbai, Bangalore, Hyderabad, Delhi NCR, Chennai, Kolkata
  - Fields: Area, Location, No. of Bedrooms, Price, plus 40 amenity flags
  - License: CC0 Public Domain
  - To import:
    1. Download the CSV
    2. Filter to our 4 cities
    3. Transform with the SQL template at `build/seed/kaggle_import_template.sql` (TODO if needed)
    4. Insert into `properties` with new UUIDs

This path is deferred because the 15 current rows (5 verified + 10 representative) cover the demo cleanly. Mass-import only if asked.

## Live demo claim Abhishek can make on stage

> "The five hero projects you'll see today are real, RERA-registered residential developments in Delhi NCR, Mumbai, Pune, and Bangalore. You can verify any RERA number on the respective state portal. Lead and conversation data is synthetic by design to comply with India's DPDP Act, but the AI behavior you'll see, scoring, message drafting, objection extraction, runs on the same Gemini and n8n stack a developer would deploy in production."

This is fact-checkable and audit-ready.
