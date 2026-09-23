# Our Civic Duty: research handoff for Claude

Prepared September 22, 2026, before the 10:30 p.m. Eastern handoff. Read this note first, then open the linked source files. These are research inputs and owner decisions, not a claim that engineering has implemented them. The game should offer deep systems while keeping detail optional for the player. Convey most consequences through people, records, and situations the character could know.

## Ready to use as sourced inputs

- [Nationwide Census place estimates](https://drive.google.com/file/d/1zjaI7WlwdLH5CXdsVWrWuFTFfI4nuwLh/view): 19,483 Vintage 2025 rows for the 50 states and D.C. The estimate date is July 1, 2025. One row, Urban Honolulu, is a CDP exception within Census summary level 162; it is flagged. Four estimates are truly zero. A Luna agent independently matched all rows against the Census source. See the [source note](https://drive.google.com/file/d/1ORHGjkWKy0aImCjBixUid5flMPWN-crv/view) and [independent review](https://drive.google.com/file/d/1PxXQ9x61bqQwarqiKXijAzbgEKV_rl_L/view).
- [Puerto Rico municipio estimates](https://drive.google.com/file/d/1NInP3qRq_0-lYpryv7_tbwlee0043n7A/view): all 78 municipios, with five-digit county/municipio FIPS IDs and Vintage 2025 estimates. They are not seven-digit incorporated-place GEOIDs. A Luna agent independently matched every estimate and ID against official Census files.
- [Nationwide tax intake](https://drive.google.com/file/d/1KjzlbwUK6EethB8R1W2NU-Fe9Kwi373P/view): all 50 states, D.C., five inhabited territories, plus a federal layer. The legal gaps are marked. It is a jurisdiction-wide research index, not a complete tax rule matrix or authorization to charge every person and business.
- [How people meet](https://drive.google.com/file/d/1abloYAFxqZc6uiSAtr2VLxTZMRUJBEEx/view): primary research on school, work, neighborhoods, friendships, family, and online settings. Shared settings create opportunities; the sources do not supply annual individual encounter rates. The online-friends denominator was independently corrected and reviewed.
- [Ordinary adult year source intake](https://drive.google.com/file/d/1r8GKHhoA1WHZOCEbfyBIBVeDqEtEWk2e/view): official national measures for work, mobility, births, marriage, civic activity, and daily time use. Keep their distinct populations and vintages separate. They provide broad settings, not a person's annual invitation or conflict rate.
- [Storm evidence source intake](https://drive.google.com/file/d/164GTIO8TMMiIhnxtre2_zfP3GfgXd9oC/view): official sources for observations, warnings, event reports, reported damage, and federal declarations. Each answers a different question; a county storm row does not establish that a town or character experienced damage.

## Owner decisions to preserve

- [Tax assessment, payment, and debt](https://drive.google.com/file/d/1_eyGk8KbFUeqavIRQY-THPx6-3Ip4oGh/view): assess people and businesses under applicable law. A lawful assessment may be zero. Record liability separately from actual payment. Unpaid balance persists; notices, plans, penalties, and enforcement follow the jurisdiction's sourced rules.
- [Journal and storm events](https://drive.google.com/file/d/12i7LhItsHFvwgaD2hdOa97pMe1UXNRCG/view): expressive narration may connect recorded events, but a named feeling or expectation needs a character record. Distinguish background weather, a felt storm, a damaging event, and a disaster. Actual local conditions and official emergency declarations are separate records.
- Player-facing precision: show an officeholder approval percentage only when an in-world poll measured it; news and voters react when information reaches them, and each person may respond differently. Routine work can be summarized without penalizing the player for choosing to simulate it.
- People card: add someone after an actual introduction or meaningful exchange. Merely sharing a school, job, neighborhood, or room creates a chance to meet; it does not establish that two people know each other.
- Population: modern Census numbers are references. Apply realistic drift when starting a game, then let the simulation's people and events determine subsequent population change. Do not present the source estimate as the fictional world's exact live count.
- Question process: gather candidate owner questions into a batch, check the decision log and past chats for existing answers, then ask only the unresolved questions together.

## Limits and next handoff

The Census files have source and row validation, but no claim that all game locations are matched to them. The tax intake is broad coverage with marked unknown legal details, as the owner requested. Do not fill missing legal rules with guesses or use a blanket Kentucky/Lexington example. More targeted research can proceed from the open questions.

The requested full-game walk was attempted as a setup but **NOT RUN**. The available workspace is a shared dirty integration checkout, and no disposable registered test workspace is available. No game or save was started. A source trace found Anchorage as a possible ordinary journey, but it does not establish a player-visible playthrough. The [test status report](https://drive.google.com/file/d/1ilkyJXSPhESOdyXXrSW0rXjHdtilzWWQ/view) records the blocker. The test needs a safe isolated workspace and a fresh run before anyone reports gameplay findings.
