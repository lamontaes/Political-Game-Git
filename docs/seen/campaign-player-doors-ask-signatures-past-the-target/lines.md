# Doors strip, as played (T55, Nov 14 2026)

Owner, Nov 14 2026, 03:05Z, decision card "Switch to asking for votes": once the petition holds the target plus a small cushion, doors become vote-asking visits.

No new string: the strip uses the existing "doors", "answered", "reached", "signed" and "No one signed" labels (`controls.campaignResults`). The strip text below is composed from the same fields `play.mjs` reads from `campaignDay`, one outing a day, the player filing for a local seat.

Edgar WI (place 5522550), needs 20, gathers 30:

- Knock on doors · 54 doors · 26 answered · 26 signed
- Knock on doors · 54 doors · 4 reached
- Knock on doors · 54 doors · 3 reached

Acosta PA (place 4200276), needs 3, gathers 5:

- Knock on doors · 45 doors · 2 answered · 2 signed (the circle brought the rest)
- Knock on doors · 45 doors · 6 reached
- Knock on doors · 45 doors · 8 reached

Otisville NY (place 3655673, seed 580915c5…), needs 23, gathers 35:

- Knock on doors · 45 doors · 28 answered · 24 signed
- Knock on doors · 45 doors · 10 answered · 8 signed (the outing that crosses the target: only the doors asked to sign are counted, the doors after it asked for the vote)
- Knock on doors · 45 doors · 8 reached

A rival or unattended candidate walks the same `walkWith` and the same `petitionAsksAtDoors`, and its pull toward the doors (`rivalDay`'s shortfall) uses the same `signaturesToGather` target, so after its own target its doors ask for votes and its day turns to the voters.
