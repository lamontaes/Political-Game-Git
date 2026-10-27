---
name: screen-to-mock
description: Makes every change to how an Our Civic Duty screen looks follow the owner's approved mocks and one shared set of controls, instead of a new one-off renderer. Use for any PR that adds or changes a screen, panel, menu, card, toast or talk box in src/bench, and when reviewing one.
---

# Screens follow the mock, through shared parts

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
- **Merger:** a screen change without a mock line, or with a second renderer for an existing control, is a send-back.
