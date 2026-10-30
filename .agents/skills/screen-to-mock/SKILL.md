---
name: screen-to-mock
description: Makes every change to how an Our Civic Duty screen looks follow the owner's approved mocks and one shared set of controls, instead of a new one-off renderer. Use for any PR that adds or changes a screen, panel, menu, card, toast or talk box in src/bench, and when reviewing one.
---

# Screens follow the mock, through shared parts

**Look first (`look-first`, owner Oct 27):** before building, fixing, filing or asking anything, run the look-first search (OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW, the sitting blocks, docs, the pool, Drive); a found ruling is built and cited, never asked again; a question without the reading line is sent back.

The owner's mocks are `docs/ui/mocks/screens-2026-10-14/README.md` (cited as MOCKS:NN) and `docs/play-first/LAW.md` section 1. Owner, Oct 26: "I've given a billion UI samples. Why the hell is this still a jumbled mess?" and "There's a bunch of independent UI things... This all needs to be unified... there's too much duplication."

## Rules

- Name the mock line the change serves (MOCKS:NN or a LAW.md section 1 line) in the PR body. No mock line, no screen change: the CTO finds the ruling first.
- Put the mock and the after screenshot side by side in the PR body (1440×900, drawn place and seed).
- One shared component per control (panel, card, list row, menu, toast, talk box, tab, button). Reuse it; never write a second renderer for the same control. If the shared part doesn't exist yet, make it its own module and move the existing copies onto it in the same PR (Replace, never layer).
- Cards where the mock has cards, never text rows. A list of people shows face, office and party, and every person is clickable to their card everywhere they appear.
- Many choices open a real menu or panel, never a long numbered list in the talk box (owner, Oct 26).
- One way to each screen: no rail icon and menu line that both open the same thing unless the mock shows both.
- Nothing on screen does nothing: a control with no effect, a toast with no way to close, an empty panel or heading is a defect.
- Panels fit the window and use their space: no large empty areas, no see-through text panels over busy art.
- **A screen PR lands in its stack's merge order, then merges main and sets the kit baseline from the guard.** Sibling screen PRs all edit `src/bench/play.mjs` and `tests/guards/kit-only-ui-baseline.json`, and mergers never hand-merge UI code, so each one that lands first sends the rest back. Merge main, keep both sides of `play.mjs`, run `tests/guards/kit-only-ui.test.ts`, set the baseline to the count the guard reports (it only shrinks), and rerun the screen's browser check in a drawn place (Oct 28: #6557, #6563, #6564 and #6594 each sent back for this one conflict in a two-hour window).
- **Browser checks write their screenshots into `docs/`** (`docs/reports/...`, `docs/play-first/shots/...`); after running one, `git checkout -- docs/reports docs/play-first/shots` before committing, so a check's draw never replaces another PR's evidence (Oct 29: the politics check rewrote #6832's shots twice).
- **A screen redesign updates the browser checks that read it in the same PR**, by running every `*.browser.mjs` that names the screen's old classes (`grep -l` the old selector); several were already stale on main after #6832 (card-history, politics-people, party, guide-menu) and only showed up when the next screen PR ran them.
- **Merger:** a screen change without a mock line, or with a second renderer for an existing control, is a send-back.
