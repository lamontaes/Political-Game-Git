---
id: play-repeal-action-on-every-law-page
title: "An officeholder can repeal a law from its page: today the only Repeal button is in dev mode and a player repeals by typing 0 (Davenport, North Dakota)"
area: play
kind: feature
priority: 1
size: S
status: in-pr
claimed-by: pool/play-repeal-action-on-every-law-page
pr: #8284
after:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: rc7-player-cannot-drive
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "What a player sees" and "Size of the fix", root cause 7)
checked: fable 2026-11-10
claimed-at: 2026-11-10T23:27:16.446Z
branch: pool/play-repeal-action-on-every-law-page
---

**What.** A player in office has no way to say "repeal this law". The audit found on Nov 9 that there is no Repeal button outside dev mode and a player repeals by typing 0; in Davenport, North Dakota (three seats taken through Advanced, Play as; no seed given) the word repeal appears on none of the Your office screens. The one Repeal button is dev mode's, which introduces a bill for the chosen law with the value 0, and a law's own page shows what is in force, the statute, what changed and how members voted, with no action on it. Build the class, not one button: every law page shows a Repeal action to an officeholder whose body has the power over that law, and the action drafts the repeal bill through the one bill engine, the same call the seat and dev mode already use. Where the player's body has no power over the law, the page says which body does.

**Cause.** Found in code: `dev-repeal` in src/bench/ui/dev-bills.mjs (line 136) is the only Repeal control and introduces a bill with the value 0; the player's seat drafts only through `seatAct` in src/bench/legislature.ts (line 258, kind "draft") with a typed amount; and `lawPage` in src/bench/play.mjs (line 5059) offers no action. Read on Nov 10, not run.

**Fix.** Add a Repeal action to every law page for an officeholder whose body has the power, read from `billCatalog` in src/core2/bill-catalog.ts and the law chain, that drafts the repeal bill through the same bill call dev mode uses; where the body lacks the power the page names the body that has it. State what repeal writes for each kind of law (an amount law, a yes-or-no law answered No) and show it on the bill's paper. Put the action on the law page that play-issues-law-page-and-what-shows redraws, not a second page.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: which body may repeal a law is read from that place's bill catalog and law chain, never from a named state or town. Replace, never layer: the player's action and dev mode's button call the same bill engine code, and no second repeal path or second bill writer is added. The chain is the acceptance: the repeal is followed from the bill record to the law no longer in force and to one payment or rule that stopped for a named person. No hand-written player text: the action's label is a control name in src/bench/data/controls.json.

**Done when.** A second session (not the builder) starts the bench (`npm run bench`, play at /play), begins a new game with the Place field empty so it is a drawn place, writes down the place and seed, and through Advanced, Play as takes a council seat. It opens a law its council set, presses Repeal, and takes a screenshot of the drafted bill in Your office and on the council's next agenda. With dev mode's bill card it holds the vote and the signature, then opens the law page again: it shows the repeal in force at the council's level, and dev mode's reach for the law names one payment or rule that stopped, by record id. On a law only the state can change, the same council member sees no Repeal action and a worded line naming the body that has the power; a resident with no office sees no Repeal action. It repeats this as a state legislator and in Davenport, North Dakota (typed into the Place field). A bench test fails when a law page offers Repeal to someone whose body lacks the power, or offers none to someone whose body has it.

**Waits on.** Nothing. The mayor and governor need play-bill-menu-for-mayors-and-governors before they can send a repeal; for them the action appears once that item lands.

**Files.** src/bench/play.mjs, src/bench/legislature.ts, src/bench/ui/dev-bills.mjs, src/bench/data/controls.json, src/core2/bill-catalog.ts, src/core2/modules/legislature.ts

**Notes.** From the Fable audit, Pillar 2: "There is no Repeal button outside dev mode (src/bench/ui/dev-bills.mjs:134); a player repeals by typing 0", and its fix list, "Small: a Repeal action on every law page; a bill menu for single-seat executives." The audit's own repeals ran through dev mode and its sweep harness (a repeal after each of the 223 bills that passed in Marion, Mississippi, seed 7df73e53cd67), not through a player's screen.

Not verified: I did not open the screens on Nov 10's main; the reading above is from the code. I did not check what typing 0 does for an amount law as against a yes-or-no law (dev mode's comment says a yes-or-no law is repealed by a bill that answers it No), so the builder states what "repeal" writes for each kind of law and shows it on the bill's paper. The mayor and governor need play-bill-menu-for-mayors-and-governors before they can send a repeal; for them this item's action appears once that one lands.

Related: play-issues-law-page-and-what-shows (open, lead play-first; the redraw of this same law page, mock first: put the action on that page, not on a second one), play-bill-menu-for-mayors-and-governors and play-what-this-law-did-page (filed with this one), laws-bill-short-and-long-title-forms (open; the repeal clause's wording), dev-mode-bills-panel-policy-questions (open).

Claimed by next for muse-8740 (Muse Spark in Muse Code, tier mid) (2026-11-10 23:27 UTC) on branch pool/play-repeal-action-on-every-law-page.
