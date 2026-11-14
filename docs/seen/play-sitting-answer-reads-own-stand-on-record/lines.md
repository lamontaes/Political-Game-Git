# A debate answer outside the filed platform reads the player's own stand

Replay: Wetumpka, Alabama (0181720), seed `replay-stand-1:2` (draws 0 and 1, Kingsport TN and Lakeview LA, had no race to enter and were passed over). The player files for the race with **no platform handed in** (as a filing that states nothing on the questions asked), plays week by week to the debate's invitation, says yes, and opens the moderator's conversation. For each question the menu of replies is listed, then the plain reply is taken. No vote was recorded by hand. Run on #9140's head (0d5a44ec) for "before" and on #9152's head for "after", same seed. Script: `/mnt/project-files/platform-at-filing/replay-stand.ts` (copy into `scripts/dev-tests/` to run: `node --import tsx scripts/dev-tests/replay-stand.ts 3`).

## Before (#9140 alone)

```
Q end-cash-bail
   [plain] My platform doesn't cover ending cash bail.
   [brief] Nothing to add on that.
Q limit-power-plant-carbon
   [turn] Richard Patrick is against limits on power plant carbon. Ask them why.
   [plain] I haven't taken a position on limits on power plant carbon.
   [brief] Nothing to add on that.
Q raise-handgun-purchase-age
   [plain] I haven't taken a position on a higher age to buy a handgun.
   [brief] Nothing to add on that.
Q increase-foreign-aid
   [turn] Richard Patrick is against more foreign aid. Ask them why.
   [plain] My platform doesn't cover more foreign aid.
   [brief] No position yet.
```

## After (#9152)

```
Q end-cash-bail
   [plain] I oppose ending cash bail.
   [brief] No. I'd vote against it.
Q limit-power-plant-carbon
   [plain] I oppose limits on power plant carbon.
   [brief] No. I'd vote against it.
Q raise-handgun-purchase-age
   [plain] I'm against a higher age to buy a handgun.
   [brief] I'm against it.
Q increase-foreign-aid
   [plain] I'm against more foreign aid.
   [brief] I'm against it.
```

The "turn" replies about Richard Patrick are gone because the player's own stand now agrees with his on those two, so there is no differing stand to throw back. Every line is from the existing conversation bank; no line was added or changed.
