---
id: play-repeal-action-on-every-law-page
title: "An officeholder can repeal a law from its page: today the only Repeal button is in dev mode and a player repeals by typing 0 (Davenport, North Dakota)"
area: play
kind: feature
priority: 1
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "What a player sees" and "Size of the fix", root cause 7)
---

**What.** A player in office has no way to say "repeal this law". Read by the audit on main as of Nov 9: there is no Repeal button outside dev mode, and a player repeals by typing 0. Measured by the audit in Davenport, North Dakota, with three seats taken through Advanced, Play as (a council member, the mayor and a state legislator; no seed given): the word "repeal" appears on none of their Your office screens. Checked by me on Nov 10's main (commit 8ac2262853), read only: the one Repeal button is dev mode's (`dev-repeal`, src/bench/ui/dev-bills.mjs:135), which introduces a bill for the chosen law with the value 0; the player's seat drafts only through the amount typed on the draft card (`seatAct`, src/bench/legislature.ts:258, kind "draft"); and a law's own page (`lawPage`, src/bench/play.mjs:5059) shows what is in force, the statute, the measure that enacted it, what is coming, what changed and how members voted, with no action on it. Build the class, not one button: every law page shows a Repeal action to an officeholder whose body has the power over that law, and the action drafts the repeal bill through the one bill engine, the same call the seat and dev mode already use. Where the player's body has no power over the law, the page says which body does.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: which body may repeal a law is read from that place's bill catalog and law chain (`billCatalog`, src/core2/bill-catalog.ts), never from a named state or town. Replace, never layer: the player's action and dev mode's button call the same bill engine code, and no second repeal path or second bill writer is added. No hand-written player text: the action's label is a control name in src/bench/data/controls.json and the bill's title comes from the English engine's repeal form, with no raw key, id or ISO date on the page. The chain is the acceptance: the repeal is followed from the bill record to the law no longer in force and to one payment or rule that stopped for a named person. Owner, Nov 7, 2026: "these should all be able to be reversed." At every level, by the body that has the power.

**Done when.** A different session starts the bench (`npm run bench`, play at /play), begins a new game with the Place field empty so it is a drawn place, writes down the place and seed, and through Advanced, Play as takes a council seat. It opens a law its council set, sees the Repeal action, presses it, and takes a screenshot of the drafted bill in Your office and on the council's next agenda. With dev mode's bill card it holds the vote and the signature, then opens the law page again: it shows the repeal in force at the council's level (the council's own row ended, or the question answered No, by the kind of law), and dev mode's reach for the law names one payment or rule that stopped, by record id. On a law only the state can change, the same council member sees no Repeal action and a worded line naming the body that has the power. A resident with no office sees no Repeal action. It repeats this as a state legislator, and then in the audit's place, Davenport, North Dakota (typed into the Place field; the audit gave no seed), as the council member and the state legislator. A bench test fails when a law page offers Repeal to someone whose body lacks the power, or offers none to someone whose body has it. The owner plays it: he opens a law he does not like, presses Repeal, and his bill to repeal it is on the agenda.

**Files.** src/bench/play.mjs, src/bench/legislature.ts, src/bench/ui/dev-bills.mjs, src/bench/data/controls.json, src/core2/bill-catalog.ts, src/core2/modules/legislature.ts

**Notes.** From the Fable audit, Pillar 2: "There is no Repeal button outside dev mode (src/bench/ui/dev-bills.mjs:134); a player repeals by typing 0", and its fix list, "Small: a Repeal action on every law page; a bill menu for single-seat executives." The audit's own repeals ran through dev mode and its sweep harness (a repeal after each of the 223 bills that passed in Marion, Mississippi, seed 7df73e53cd67), not through a player's screen.

Not verified: I did not open the screens on Nov 10's main; the reading above is from the code. I did not check what typing 0 does for an amount law as against a yes-or-no law (dev mode's comment says a yes-or-no law is repealed by a bill that answers it No), so the builder states what "repeal" writes for each kind of law and shows it on the bill's paper. The mayor and governor need play-bill-menu-for-mayors-and-governors before they can send a repeal; for them this item's action appears once that one lands.

Related: play-issues-law-page-and-what-shows (open, lead play-first; the redraw of this same law page, mock first: put the action on that page, not on a second one), play-bill-menu-for-mayors-and-governors and play-what-this-law-did-page (filed with this one), laws-bill-short-and-long-title-forms (open; the repeal clause's wording), dev-mode-bills-panel-policy-questions (open).
