# The depth sweep (owner, Nov 10, 2026)

Owner, Nov 10, about 6:41 p.m.: "commute time can just be, a slight estimation, but man, tracking actual land plots and stuff, I don't know what that means. Asking an office for public records, that's way too in depth. Way, way, way too in depth. And that's the kind of stuff that work is being wasted on."

He has said it before. Oct 11: "Keep it simple." Nov 7: "I'm not worried about the super detailed stuff, just make the systems work for now." The same day he asked for builders on "the stuff I actually click and play".

So every live pool item gets one test, and an item that fails it is dropped. This page is for a session, on any model or tool, that is given one list of items to sweep. It reads and writes pool files. It builds nothing. The lead (Fable B) reads every result before it merges.

## The one test

**Where does the player see or feel this, on the golden path or in something he has ruled?**

"Sees or feels" means one of these, named exactly:

- a screen, a card, a panel or a number he reads (a bill card, a budget, the Metrics tab, a person's card);
- a scene, a talk, a line, the paper or the Journal;
- a choice he is offered, or what a choice of his does (a bill passes, a law changes a paycheck he can open, an election he can win or lose);
- money or events in his own household and circle;
- the game running: it opens, it does not crash, a year takes under two minutes, a skip takes seconds.

"The golden path" is in `AGENTS.md`. "Something he has ruled" is a ruling in `docs/coordination/OWNER-DECISIONS.md`, `docs/coordination/prior-rulings/`, `docs/play-first/LAW.md`, the Oct 10 scope calls in `docs/ROADMAP.md`, or a system of The Political Process (`docs/roadmap/political-process-baseline.md`).

## The three answers

1. **Kept.** The player sees or feels it. Add one last sentence to the item's **What.** that begins `Seen:` and names where, in plain words ("Seen: the bill card's line for who the law reached, in dollars."). If the item is only a step toward something seen, the sentence begins `Feeds:` and names that item's id, and that item must itself be kept. An item that keeps the crew or the checks working (a test that guards main, a rule, a skill, a pool tool) begins `Guards:` and names what it keeps working.
2. **Dropped.** Seen nowhere, and no ruling asks for it. Set `status: dropped`, and add a Notes line: `Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). <one sentence: what it would have added and why no player sees it>.` Research that only adds precision nobody sees is dropped the same way: a number may stay an estimate.
3. **Borderline.** You cannot tell, or it is seen nowhere today but he might truly want it. The default is to drop it. Put it on your page's "Borderline, for the owner" list with one plain sentence on why he might want it, and leave the item's file alone. Keep the list short: he reads it.

## Rules for the sweep

- **A wrong result the player can reach is seen.** A law that pays out where it should collect, a town that empties, a crash, a red test on main: these are kept. The sweep drops depth, never defects in what already exists.
- **The critical path is kept:** the country tier and its clock, the life record, the words machine, and the play-first lane. Say where each is seen all the same.
- **The crime system waits** for the owner's start. Leave its items as they are and say "waits on the crime system".
- **Public-records requests and land parcels are dropped outright** (owner, Nov 10: "not in the game"). **Commute time** is one number a place at most, and only if something the player sees reads it.
- **Items somebody holds** (claimed or in-pr; list D12 has them) get a verdict on the page only. Do not edit their files. If the verdict is dropped, say so first on your page so the lead can stop the builder.
- **An item other items wait on** (search `docs/pool/items` for its id) is dropped only if every item that waits on it is dropped too. Otherwise it is kept with `Feeds:`.
- **Do not rewrite an item** beyond the one sentence and the Notes line. Do not change a Cause, a Fix, a priority or `checked:`.
- **One money system, and reuse before you build** (owner, Nov 10): if, on the way, you see an item whose Fix adds a second payment, tax or ledger path beside one that exists, say so on your page.

## What you write

One page, `docs/pool/depth-sweep-2026-11-10/<your list>.md`. At the top, the counts: kept, dropped, borderline. Then one table:

| Item | Answer | Where the player sees it, or why it is dropped |
| ---- | ------ | ---------------------------------------------- |

Then "Borderline, for the owner" (or "None."), and "Held by a builder and should stop" (or "None.").

## How you hand it in

- Before you start: `npm install` once (never `npm ci`), and every npm, npx or node command runs with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` set. Read `AGENTS.md` (the golden path, "Keep it simple", "This is a game, not a spreadsheet"), the top of `docs/coordination/OWNER-DECISIONS.md` through Nov 5, and the Oct 10 scope calls in `docs/ROADMAP.md`.
- Your list is `docs/pool/depth-sweep-2026-11-10/lists/<your list>.txt`. Work in its order. Make your branch from main.
- One draft pull request, opened after your first push, with a push after every twenty items. The first line of its body is `Touches pool item: none (depth sweep of <your list>; nothing built).` Then the counts and the five drops you were least sure of.
- Before each push: `npm run pool -- --check` and prettier on the files you changed. Add a release note (`docs/release/changes/<an id nobody has used>.md`, `impact: none`, one plain sentence).
- When the list is done, send one message to the session that started you: the pull request number and the counts.

## What you never do

- Change game code, tests or data. Build anything. Mark your pull request ready.
- Drop a defect, a crash, a red test, or anything on the critical path.
- Drop an item because it is hard. The test is whether the player sees it.
- Invent a place where the player "sees" something to save an item. If you cannot name the screen, the scene or the number, it is not seen.
