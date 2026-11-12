---
name: menu-look
description: The owner's locked look for every in-game menu (Nov 5, 2026). Dark see-through textured panel, no boxes, glowing hover, lit selection, portraits in light, data not sliders, American English. Use before mocking, briefing or reviewing ANY menu, screen, button, tab, rail, card, tooltip or pop-up, so he never has to explain these again.
---

# The menu look (owner, Nov 5, 2026)

He chose every item here on Nov 5 while hovering mocks. The live reference is https://claude.ai/artifact/PiXNkaUHL9fAbEp1BSQdud (copy and pictures in `cto-notes/menus/hover-options/`; his words in `cto-notes/menus/RULINGS-nov5.md`). The reasons are in `reports/Game menu UI design study.md`. His standing rule: "take what you just learned from this initial round of stuff and apply it to everything else, so that way I don't have to keep re-explaining the same stuff."

## Surfaces

- **One dark panel per menu**, partly see-through (78% solid) so the room shows behind it, with a little texture. The panel color is darkened (about #1C1A17 under the texture) because gold text failed contrast in bright rooms.
- **Slim brass edge with small corners** on the panel; the corners are the only corner ornaments anywhere.
- **No box around every item** (Nov 5), but sections must be delineated (Nov 7, see below). Content never sits as a flat list straight on the panel. No framed plate per item, no hairline rectangles, no thin gold rules between sections (Kit 13). "i dont like the boxes being displayted like that."
- **Nothing hard-edged around anything.** A picture fades into the panel at its edges instead of sitting in a brass line box. A portrait sits in a soft pool of warm light that fades into the panel, never "a circle around there and then it's still the same blank background."

## States (one light language)

- **Hover = soft fill plus the fading frame with halo:** lines brightest mid-side that vanish before the corners, plus warm light around and inside. Never "a straight gold line and then a box." Fade in about 140 ms.
- **Selected or pressed = lit brass fill**, for buttons, tabs, rail buttons and list rows. No corner marks on any control, no chevrons, no left bar on rows.
- **Keyboard or controller focus** = a clear 2 px light outline, visible only in that mode.
- **Clickable things need a cue at rest** (brighter names, consistent places); hover only confirms. Names and labels on hover appear after about 250 ms.
- **Buttons and tab rails at rest** are recessed or raised glass with soft light, not a hairline ring.

## Portraits

- Every face or figure on a menu is a crop of the one people master at a set display size, never its own file. The slot table is in skill `people-engine`.
- **Only people that are in the game** (owner, Nov 5: "Only use the ones that are in the game"): crops of pack v4 figures (`art/people-engine/v4/`, head box from its manifest), never old mock folders, candidates or reference art. Replaced art is deleted with every reference, never kept (memory `replaced-means-deleted-nov5`).
- **One pack figure per named person** across a whole mock, and the player's figure never for anyone else (Nov 7: the president's figure reappeared as the police chief, the player's as two department heads). No distinct figure left means the title only, never a reused face. Run a duplicate check before showing.
- Busts use standing figures with arms down; a crop never shows a raised hand.
- Portraits are lit evenly and clearly; never a large face fading into darkness (owner, Nov 5, on the You screen: "I immediately get Until Dawn vibes").

## Data and type

- **Data, never sliders and never bar graphs:** "Those are too video game-like. I like data being shown." Real numbers in words and figures, this year beside last. Nov 5 review: no party split bars, no colored vote or poll bars, no little charts ("there's this green bar and stuff. No, I said that's not what I want"; "weird bar graphs"; Money "with the graphs and stuff, that's terrible"). No checkboxes ("not an approved style"); filters are lit toggle buttons.
- **Small text at least about 15 px** (labels about 14 px, all caps with letter spacing). Body 15 to 17 px.
- **Even numbers:** figures in the controls font (Fira Sans) with tabular, lining digits. Cinzel for titles only; Andada Pro for narrative only, never in numbers.
- **Color-blind mode is one global setting**, off by default, that every menu (including future ones) reads from one shared place. Never set colors per screen.
- **Menus never scroll as a page**; a long list is a list beside its detail (patch notes: click a build, see what it added, changed and fixed), a bounded box that scrolls inside itself. **No arrows and no "1 of N" anywhere** (owner, Nov 8: "like those shitty survey sites"; the CTO withdrew the old "page with arrows" rule). No dead space (the panel fits its content; nothing empty above or below), no subheadings, no Continue or Back, no developer text and no system math in player text ("about 6 weeks of bills... That's dev talk"). No page numbers on story text; fill the page.

## Words

- **American English only.** Never "ward" (use the place's record: district, at large), and no British words or spellings (no "-ise" or "-our" endings, no "local authority" or "elected member"). Check sample text in mocks too: "I know these are mock-ups, but take off" ward.
- The game's title never appears in anything outsiders see.

## Layout he ruled

- Bottom left: the player card (portrait opens You; name, town, date with the time under it, the only date on screen; Day and Week) and the rail above it: Journal, Calendar, Money, Politics, News, People, Travel, Guide. Options moves to Esc. A dot marks something unread.
- **In a scene (owner, Nov 7):** the player card and the menu buttons are gone, never dimmed. The talk box takes center stage: bottom center, wide, larger type, growing with its answers. No earlier lines float above it or over the room. The scene's name sits at the top center. News pop-ups wait until the scene ends.
- Politics tabs: Government, Elections (always there), Parties, Issues, Budgets, plus a how-your-place-is-doing tab (name not picked). Your office appears while you hold a seat, and the campaign board once you've filed.

## What "a list on a background" means (Nov 7, item 45, he has said it over and over)

"it looks like text is pasted directly on a shitty opaque background." Text set straight onto one flat panel fails, however good the words. Every screen needs visible delineation between its sections: each group gets its own surface or header (a section strip, an inset pane, a band of different depth), the way Victoria 3 uses party strips as headers. This narrows the Nov 5 "no boxes" rule. It means no box around every _item_, not no structure: sections must be delineated. Show him delineation options as examples before settling.

- **His pick (Nov 7, item 46): section strips with broken thin gold outlines.** Each section has a header strip of its own depth (lit bronze for the first, deeper brown down the screen), and a 1 px gold outline that isn't solid, "enough to where you can read the shape where your eye fills it in". His final pick (item 47, "middles mixed with fade down"): the top line brightest across the middle and fading before the corners, the sides fading in just below the top corners and out going down, and a faint short line under the middle. Nothing touches a corner. Then "a little too heavy on the tops" (item 48): the top line is faint (about 0.4) and peaks only at the center, and the header strips are soft with no top highlight. The CSS is `.ol-g .sec.strips::after` plus the `.ol-g` strip overrides in `cto-notes/menus/examples/ex.css`.
- **A person's name on their own screen** is Playfair Display 600, about 40 px, with a tight 1 px shadow, set apart from the Cinzel section headers. The screen title above it ("You") is small, quiet capitals (Nov 7, item 51).
- **Every quote about a person carries a short tag naming what it says about them**, in small gold capitals above the quote (Nov 7, item 52). Tags read character, like "Can't let a loss go" (his favorite). An issue tag like "Speaks up for renters" only appears when the person is known for it at that scale. Quotes and tags change with time and with how much each speaker matters (item 53).
- **Budgets is approved** (Nov 7, item 56): departments with heads in words, the open department as a typed page (dot leaders, Asked and Last year in one smaller line, the head's signature), the money typed the same way, "Who wrote it" with the executive's bust, and the fiscal year line typed in Courier Prime capitals (bud-strips).
- **Government is approved** (Nov 7, item 55, "These are acceptable"): painted body headers, section strips, leaders as fading busts with "What he wants" dash lines, seats as big party-color numbers, every name and vote clickable (Government examples gov-local, gov-state, gov-federal).
- **The person card is approved** (Nov 7, item 54, "perfect"): the You build in your voice about them, perceived traits with no strength levels and only those you've seen, a "Between us" section, tagged quotes, and only the people you'd know of. The reference is the Person example (per-hale).
- **The You screen is approved** (Nov 7, item 53). It is the reference for every other menu: `cto-notes/menus/examples/` (you-ol-g).
- **You is written in first person** ("I go to every board meeting...", "Who I am"). Quotes stay in other people's voices. (Nov 7, item 49.)
- **Menus show busts, never full bodies** (Nov 7, item 50: "let's just do the busts... The full body, we keep coming with problems with that"). A bust runs head to upper chest and ends in a soft fade, never a hard cut across the chest (item 49). He is unsure about the warm glow behind portraits (Nov 5's pool of light); show it on and off.
- **Traits:** levels (strong, moderate) show only on your own You screen. On other people's cards, traits are your perception of them.

## Start from a real game, every time (Nov 7, item 38)

"how many times do i ahve to say to look at thte research you did on ui/ux design and look at other game menus. what other games do you see list this info out loke this? none." Before designing any screen, open the named games' real screens (Game UI Database, dev diaries) and the study in `reports/Game menu UI design study.md`, and say which game each screen follows. Never invent a layout. **No timelines** on person cards or You (he has said it twice).

## Nov 7 review (his words in RULINGS-nov5.md item 36)

- **No subtitles anywhere:** no explaining or flavor line under an item, number or heading ("It goes into the campaign...", "in your account at Copiah Bank", "Campaign money stays apart...", "From his inaugural address, today"). Facts only: name, party, role, date, amount.
- **A real game menu, never "a list of stuff on a background":** every screen needs structure and pictures that belong to the game. Plain stacked lists and spreadsheet tables fail ("just an excel sheet").
- **No symbols or icons standing in for facts** (Nov 7, on the Crusader Kings 3 example: "I don't really like any of the like symbols it has on there"). Words and pictures of real things only.
- **Never a facts sheet:** labeled fact rows (Home, Work, School, Faith...) beside a figure is "exactly what i have been complaining about" (Nov 7, on You).
- **No paper sheets on a panel at all:** bright cream paper "sticks out like a sore thumb", and even darkened room-light paper "still looks pasted on" (Nov 7). A document feel comes from type set straight onto the panel: typewriter face, dot leaders, handwriting, a stamp. Never a rectangle of paper.
- **Calendar:** no phone-style colored event chips; today lines up with every other day; Today and Coming up look different; nothing runs past the frame.
- **Notifications:** slim, and a click dismisses one at once.
- **Leaders** (president, vice president and the like) show as full busts, not small face crops.
- **For the game:** every person, bill and vote on a menu opens its card or page.
- **Budgets:** never a table. Model The Political Process: departments with their heads' faces, each program with what it pays for, what was asked and last year, and running totals always in view (refs/tpp/ss14, ss15).

## Before showing him any menu mock

Check each line above, plus [chevron rule] and people-art rules. Then render at 1440x900 over a bright room (the courthouse or school hallway at midday) and look at it at full size. If anything breaks a line here, fix it before he sees it.

## No subtexts (owner, Nov 7 and Nov 8, repeated)

- No caption or explaining line under a heading, a control row, a quote or an item. Nov 7: "NONE OF THESE SUBTITLES ON MENUS". Nov 8: "remove all those subtexts... Only what the game offers her today... Kept. That's why she holds the tax... Fades about October... I already said I don't like those." Data and quotes stay; the line that explains them goes.
- Show the glossary's inline help wherever civic words appear in player text: the word underlined, hover or keyboard focus (after about 250 ms) shows its short definition and "Mark as learned"; a learned word loses its underline everywhere. Nov 8: "I've never seen any of the inline helping stuff for the glossary."
