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

Campaign tab, 1440x900 (Otisville, a federal-level seat at the same place, needs 5): `campaign-tab-filed-1440x900-otisville.png` reads "Signatures … 0 of 5, due May 26, 2026"; `campaign-tab-full-1440x900-otisville.png`, the day the doors switched, reads "Signatures … 8 of 5, due May 26, 2026". The row has no "enough" wording and the Knock on doors card has no line saying what the outing asks for now; both are missing labels for the Words lead. The view now carries `asksAtDoors` (petitionView) for them to read.

A rival or unattended candidate walks the same `walkWith` and the same `petitionAsksAtDoors`, and its pull toward the doors uses the same `signaturesToGather` target, so after its own target its doors ask for votes.
