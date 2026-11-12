# Approved menu mocks, Nov 7, 2026

The owner approved four screens in this clickable mock on Nov 7, 2026. They are the reference for building those screens into the game, and they must be built exactly as shown here: layout, sections, outlines, fonts, busts and states. On Nov 7 at about 9:15 p.m. he said: "you can add the approved ones already."

## The approved examples (build these exactly)

Open `menu-examples.html` in a browser, served from this folder so `img/` loads (the fonts come from Google Fonts). The top strip picks an example; the second strip sets Name, Close and Glow.

| Screen      | Pick in the mock                                                                                                                                   | Key                                     | Direct link                                                       | His words (RULINGS-nov5.md)      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------- | -------------------------------- |
| You         | The "Mix: strips" You build with the "Middles + fades down" outline (the Outlines button "Middles + fades down"), with Name A, Close A and Glow On | `you-ol-g`                              | `menu-examples.html#you-ol-g~name-a~close-a~glow-on`              | item 53                          |
| Person card | Person, "Margaret Hale"                                                                                                                            | `per-hale`                              | `menu-examples.html#per-hale`                                     | item 54, "perfect"               |
| Government  | Government, Local, State and Federal                                                                                                               | `gov-local`, `gov-state`, `gov-federal` | `menu-examples.html#gov-local` (and `#gov-state`, `#gov-federal`) | item 55, "These are acceptable." |
| Budgets     | Budgets, "Mix: strips"                                                                                                                             | `bud-strips`                            | `menu-examples.html#bud-strips`                                   | item 56, "approved"              |

The options for every approved screen are Name A (Playfair Display), Close A (the small X) and Glow On. These are the mock's defaults.

What each approved screen holds, in short (the full rules are in `MENU-LOOK.md`):

- **You:** section strips with the broken "middles plus fades down" gold outline (CSS `.ol-g .sec.strips::after` and the `.ol-g` strip overrides in `ex.css`), written in first person, a bust that ends in a soft fade, the name in Playfair Display 600, perks with their strengths (shown only on your own screen), quotes with a short gold tag naming what each says about you, and names inside sentences. The small X and the glow stay as they are.
- **Person card (Margaret Hale):** the You build in your voice about them, only the traits you've seen and no strength levels, a "Between us" section, tagged quotes, and only the people you'd know of.
- **Government (Local, State, Federal):** painted body headers, section strips with the outline, leaders as fading busts with "What he wants" dash lines, seats as big party-color numbers, and every name and vote opening its card.
- **Budgets ("Mix: strips"):** departments with their heads named in words, the open department as a typed page (dot leaders, Asked and Last year on one smaller line, the head's signature), the money typed the same way, "Who wrote it" with the executive's bust, and the fiscal year line in Courier Prime capitals.

The names, numbers, quotes and places in the mock are sample data. The game shows its own people, places and numbers from its real records. The owner hasn't judged the mock's English yet (item 43: "I haven't been judging the English at all on these"), so match the look and structure, not the sample sentences.

## Not approved

- **Calendar is not approved yet.** Its five examples (Strips, B Week, C Day planner, D With places, E Typed) are still under review. Don't build any of them.
- **Every other example is a rejected option, kept for reference only.** Don't build them:
  - You: "Mix: strips" without the chosen outline, "Mix: panes", "Mix: layered", "Crusader Kings 3", "Suzerain", "Wildermyth", "Disco Elysium".
  - Outlines: "Fades down", "Corners", "Middles", "Open corners", "Rails", "Dotted".
  - Budgets: "Mix", "Victoria 3", "Democracy 4", "Suzerain", "The Political Process".
  - Paper: "Mix", "Paper in the room's light", "Dark objects", "Panels instead".
  - Name B and C, Close B and C, Glow Off.

## The owner's words

His words, verbatim and dated, are items 33 to 58 of `RULINGS-nov5.md`. Items 1 to 32 are the Nov 5 rulings that set the look. `MENU-LOOK.md` is a copy of the CTO's menu-look skill: every menu rule he has set, in one place. Where it points at `cto-notes/menus/examples/`, the same files are in this folder.

## The files

- `menu-examples.html`: the clickable mock. `build.py` writes it from `base-proto.css`, `ex.css` and `ex.js` (run `python3 build.py` in this folder).
- `base-proto.css`, `ex.css`, `ex.js`: the mock's styles and screens. `ex.js` opens with a line that turns off the repository's linter, because it is a design mock that runs in a browser, not game code.
- `img/`: the rooms, the panel texture and the people. Every face is a crop of a pack v4 person (`img/people/`).
- `MENU-LOOK.md` and `RULINGS-nov5.md`: the look rules and the owner's words.

The files here were formatted with the repository's Prettier, so they differ from the CTO's working copies only in spacing.
