# Packet 5: Official 50-State State-Office Qualifications Corpus Plan

## Objective

Build a deterministic, source-backed qualifications corpus for elected STATE offices across all 50 states in an isolated sidecar tree.

## Scope & Office Families

Required office families:

- `STATE_LOWER_CHAMBER`: State lower legislative chamber member (e.g. State Representative / Assemblymember).
- `STATE_UPPER_CHAMBER`: State upper legislative chamber member (e.g. State Senator).
- `NEBRASKA_UNICAMERAL`: Nebraska Unicameral Senator (unique unicameral state office).
- `GOVERNOR`: State Governor.
- `LIEUTENANT_GOVERNOR`: Lieutenant Governor (where office exists).
- `ATTORNEY_GENERAL`: Attorney General (where elected or state constitutional officer).
- `SECRETARY_OF_STATE`: Secretary of State (where elected or state constitutional officer).

Selection types:

- `ELECTED_GENERAL`: Directly elected by voters in statewide or district general election.
- `ELECTED_LEGISLATURE`: Elected by state legislature (e.g. ME AG/SoS, NH SoS, TN AG selected by supreme court).
- `APPOINTED_GOVERNOR`: Appointed by Governor (e.g. NJ AG/SoS, AK AG, HI AG/SoS).
- `APPOINTED_COURT`: Appointed by State Supreme Court (e.g. TN AG).
- `EX_OFFICIO`: Ex-officio constitutional assignment (e.g. UT Lt Governor serves as chief election officer).
- `OFFICE_DOES_NOT_EXIST`: Office does not exist in state constitutional structure (e.g. ME Lt Gov, NH Lt Gov).

## Sourced Fact Invariants

- Status values: `KNOWN`, `UNKNOWN`, `NOT_APPLICABLE`, `NO_REQUIREMENT_FOUND`, `CONFLICTING_SOURCES`.
- Absence of a requirement is never coerced into zero or false.
- Legal interpretation beyond directly stated constitutional/statutory text flags `normalization_review_required: true`.
- All facts carry first-party citations (constitution article/section, statute, official SOS manual URL, retrieval date, vintage).

## System Tree

- Data: `data/state-office-qualifications/`
- Scripts: `scripts/state-office-qualifications/`
- Code API: `src/state_office_qualifications/`
- Tests: `tests/state_office_qualifications.test.ts`
