# Doors strip, as played (T55, Nov 14 2026, second version after the Words lead's read)

Owner, Nov 14 2026, 03:05Z, decision card "Switch to asking for votes": once the petition holds the target plus a small cushion, doors become vote-asking visits.

No new string: the strip uses the existing labels (`controls.campaignResults`). It reads the same on both kinds of outing now:

- "answered" is every door that opened, whether it was asked for a signature or for the vote.
- "signed" shows on an outing where any door asked for a signature.
- "reached" is the people met in person (full people; a counted resident who opens stays a count, so reached is never more than answered). It shows on an outing where any door asked for the vote.
- The outing that crosses the target prints both: answered, signed, reached.

Edgar WI (place 5522550), needs 20, gathers 30:

- Knock on doors · 54 doors · 37 answered · 26 signed · 2 reached (crossing outing)
- Knock on doors · 54 doors · 32 answered · 4 reached
- Knock on doors · 54 doors · 28 answered · 3 reached

Acosta PA (place 4200276), needs 3, gathers 5:

- Knock on doors · 45 doors · 24 answered · 2 signed · 6 reached (crossing outing)
- Knock on doors · 45 doors · 17 answered · 6 reached
- Knock on doors · 45 doors · 12 answered · 8 reached

Otisville NY (place 3655673, seed 580915c5…), needs 23, gathers 35:

- Knock on doors · 45 doors · 28 answered · 24 signed
- Knock on doors · 45 doors · 20 answered · 8 signed · 6 reached (crossing outing)
- Knock on doors · 45 doors · 15 answered · 8 reached

Words lead's two labels (Nov 14), Otisville NY, 1440x900: the Campaign tab's Signatures row reads "0 of 5, due May 26, 2026" when filed (`campaign-tab-filed-…`) and "8 of 5, enough for the ballot" the day it fills (`campaign-tab-full-…`). The Knock on doors card on Travel has a row "Asking for" under "How long": "Signatures" while the petition is short (`travel-card-filed-…`), "Votes" once it is not (`travel-card-full-…`), and "Votes" in a race with no petition. The row is read from `petition.asksAtDoors`.

A rival or unattended candidate walks the same `walkWith` and the same `petitionAsksAtDoors`, and its pull toward the doors uses the same `signaturesToGather` target, so after its own target its doors ask for votes.
