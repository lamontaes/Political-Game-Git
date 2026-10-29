---
name: look-first
description: >
  The search every session of Our Civic Duty runs before it builds, fixes,
  files, registers a stopgap or asks the owner anything: the rulings log, the
  decision register, the prior-rulings digests, the lane's law, the docs, the
  pool and the owner's Drive. Use at the start of every item and before every
  question; a found ruling is built and cited, never asked again. Not a
  substitute for research into the real world (`researcher`).
---

# Look first

The owner, Oct 27, 2026: "Look at previous decisions. Search the drive. Search logs. I'm going to pull my hair out. I've talked about businesses and towns before. Find it... Not just the CTO, but every session. Every skill needs to have it... because I'm sick of seeing stuff fixed or asked that I've already done." Oct 14: "Look before you ask." Most of what looks open was decided.

## When

Before any of these, in any session (lead, lane, words, director, merger, fixer, pool worker, researcher, CTO, the owner's local session):

- building a feature, a screen, a scene or a rule;
- fixing a defect whose cause is a design choice;
- filing a pool item or registering a stopgap (`owner-decision` above all);
- sending the owner a question, a list of questions or a report that asks anything;
- ruling in the owner's place (the CTO).

## The search, in this order

1. `docs/coordination/OWNER-DECISIONS.md`, whole: the only rulings log. Newest at top.
2. `docs/coordination/DECISION-REGISTER.md`: the design decisions and their dates.
3. `docs/coordination/prior-rulings/*.md`: digests of the owner's Drive rulings by area (economy, words, elections, and the rest). Read the digest for your area whole.
4. `docs/play-first/LAW.md`: every ruling about play.
5. `docs/coordination/playtest/*.md`: the sitting blocks, his words verbatim; `docs/coordination/voice-notes/*.md`: his voice notes word for word (words, scenes, grading, the Oct 24 playtest). When a ruling and a voice note disagree, the voice note is what he said.
6. `rg -i` across `docs/` for the subject and its synonyms (a business is also an employer, a workplace, an establishment, a firm; a scene is also a talk, a moment, a beat).
7. `docs/pool/items/`: an item on the subject carries its Notes and its PRs.
8. The owner's Drive, when the session has the Drive connector: `search_files` with `fullText contains '<subject>'`; the CTO rulings docs there ("03 CTO RULINGS", "OVERNIGHT ORDERS", "RESEARCH FOR CTO REVIEW") are his words from September and October. A session without the connector reads the prior-rulings digests, which are made from them, and says so.

Stop at the first hit that answers; read it whole.

## What you do with what you find

- **A ruling exists:** build it. Cite it by file and date in the PR body, the item or the report ("owner, Sept 22, prior-rulings/economy.md R16: employers are generated to fit each town"). Never ask it again; never build the other way.
- **A ruling exists and the code does the opposite:** that is a defect, not a question. Fix it and cite the ruling.
- **Nothing found:** say so with the reading line, then ask or register the stopgap. The reading line names what you read and searched:
  `Read: OWNER-DECISIONS (through <date>), DECISION-REGISTER, prior-rulings/<area>.md, LAW; searched docs/ and pool for: <terms>; Drive: <searched | no connector>.`
  A question without the line is sent back (merger, CTO, the owner's local session).
- **Two rulings conflict:** the newer wins unless the older makes more sense; flag it in OWNER-DECISIONS under the CTO's hand.

## The owner's standing answers (so they are never asked again)

- Real data calibrates; the game is alternate history from the moment Start is pressed. No real statistic, date or name appears as itself in play (Oct 27: "none of that real data in there. Real data is just used to calibrate").
- Scenes are the game. Time passes without an indicator beyond the date and time in the HUD; a quiet week pops nothing; a scene stops time, or the player does; the rest is played through the regular screens (bills, talks) (Oct 27).
- Speeches, scenes and lines differ by the speaker's traits, party, wants and what is happening in the world; nothing reads the same in two worlds (Oct 27).
- Employers are generated to fit each town from calibrated business tables; no fixed list, no generic cooperatives, no real brands (Sept 22, Sept 28, Sept 29, in prior-rulings/economy.md and words.md and OWNER-DECISIONS).
- Developer ID, signing, licenses and rights are never raised (Oct 26, Oct 27).
- Election day is the player's choice; discrimination is simulated; the Wildermyth standard for scenes; one UI and one scene system (Oct 26).

## Self-check before you send anything to the owner

- [ ] I read OWNER-DECISIONS whole and the prior-rulings digest for my area.
- [ ] I searched docs/, the pool and Drive (or said the connector was missing) for the subject and its synonyms.
- [ ] Every question I still have ends with the reading line, and none of them is answered above.
- [ ] Every ruling I found is cited where I build on it.
