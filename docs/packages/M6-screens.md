# M6-screens: the real game screens, the opening and the art fixes

**Specs:** M6-01 to M6-04.
**Built by:** OPUS-PLAY, with the CTO's art pipeline for art, and OPUS-PEOPLE for the opening speech's words.

**How it works:** OPUS-PLAY builds each screen right away, in the simplest version that follows your decisions. You go through each redesigned screen before it ships (your Oct 8 rule), one at a time, in the order below. The art fixes start now.

## The order

1. The opening (first, as you chose on Oct 9).
2. Panel style and the menu shell with the player card.
3. The conversation box.
4. The person card.
5. Family.
6. The journal.
7. The filing office overlay.
8. Calendar and time.
9. News: TV and the newspaper.
10. The government map.
11. The bill paper.
12. The desk and the budget.
13. Campaigns, after you've played one.
14. The title and loading screens.

## What you'll see

**The opening.**

- It plays like a movie. The President's speech carries it: the inaugural address in an inauguration year, otherwise the State of the Union. It has the world's real numbers in it.
- As the speech addresses each level, the camera cuts to your senators and representative, your governor, your town, and your family watching at home. Then you, then day one.
- People are doing natural things wherever they are, and nothing is scripted.
- Every number lives in a ledger button.
- The whole opening loads during the loading screen. Escape opens only options and quit.
- Every opening differs, because the world ran before you arrived.
- The speech's words come from the engine, built from real inaugural and State of the Union addresses.

**The look.**

- Kit 12's frame and type, and Kit 13's letterpress look (`docs/ui/kit13/APPROVED-2026-10-04.md`).
- Thicker borders, corner ornaments inside the frame, outlines on unselected buttons.
- A chevron appears only on an activated button.

**The menu shell** (owner, Oct 20; replaces the Civilization VI shell of Oct 6):

- The scene is home. Menus are overlays that pause time; the people in the room stay visible behind them.
- Your player card at bottom left, with the clock and Day, Week and Until needed. The date and time appear only there. Clicking your portrait opens You (your character sheet), with Work and study as its second tab.
- A vertical icon rail directly above the card, names on hover: Journal, Calendar, Money, Politics, News, People, Travel.
- Politics tabs: Government, Issues, Budgets, Parties; Your office appears only while you hold a seat, Campaigns only once you've filed.
- Options, the guide and Quit to title open from the Esc key and the title screen, not the rail.
- Alerts: a toast top right for news that just reached you, a dot on a rail icon for something unread, a scene when something needs you. No top bar, no pop-up lists.
- Actions start from people, places and scenes, not menu lists. The campaign day has no list of acts: speeches, doors, interviews and debates are scenes.
- No scrolling on main screens.

**The screens.**

- **Conversation box:** smaller and at the bottom, like a lower third, with the scales Lie control in its upper right.
- **Person card:** a large figure, Skyrim-style, showing only what you could know.
- **Family:** everyone, each doing something, like your Mountain Glade reference.
- **Government map:** redesigned completely.
- **Campaigns:** no office list.
- **Calendar:** visual, not a spreadsheet.
- **Title screen:** the Lincoln Memorial or the White House at night, or a rally or convention.
- **Loading screen:** up to two minutes, with the journal writing itself, a year counter with headlines, and the map filling in. You see it first.
- Term underlines that open the glossary, live TV and newspapers, no goal on screen, and the bill paper.

**Custom world** (owner, Oct 12; M6-04).

- A new game starts from real data in a random place by default.
- Before starting, you can instead customize the world: the place, demographics, ideology, turnout, party strength, the economy and more, like _The Political Process_'s 80+ advanced options.
- The world then runs by the same rules.
- OPUS-PLAY builds the new-game screen; OPUS-CORE makes world generation honor the settings.

**Art fixes** (your Oct 8 list, starting now):

- Real seated poses.
- Formal clothes by role and place.
- Corner ornaments inside the frame.
- Cuff colors.
- The whole family.
- Congress shown once.
- A proper governor scene.
- White outlines and hair glitches fixed.
- Front, back and three-quarter poses.
- More clothes and shoes.
- A new Resolute desk.

## What gets built

- Every screen above on the new core: record data and control names, with engine text only.
- The opening sequence, its preload, and the ledger.
- The art fixes, through the art pipeline. Art goes straight into the game, and you curate while playing.
- **Use the art we have now** (owner, Oct 12). The tagged library (`art/backdrops/manifest.json` with its tags, the people engine's poses and outfits, the capitols and campuses) goes into every scene. Each scene uses the best-tagged match it can find, such as a generic government office for a county clerk. No scene waits for a perfect painting. The CTO keeps importing generated art that isn't in the repo yet.
- The custom-world screen, and world generation that honors its settings (with OPUS-CORE).

## How you'll know it works

You start a new game in a random place. The opening plays like a movie and ends on day one. Then you move through the redesigned screens in order, and each one has your sign-off before it ships.

## Your decisions it follows

- **Redesign, don't patch:** screens are redesigned one at a time with you, and nothing ships before you've gone through it (Oct 8). "Stop trying to fix it. Just redesign it" (Oct 9).
- **The opening:**
  - Opening first (Oct 9). From the country down to you (Oct 9).
  - The numbers sit in a ledger (Oct 9).
  - "More like a movie" (Oct 9). The bars were never literal (Oct 12).
  - The speech is whichever one the calendar gives (Oct 9). Cutaways look natural, with no scripted reactions (Oct 9).
  - The first speech batch went back as "reads like a stat sheet" (Oct 9).
  - Opening defects: it loads during the loading screen, Congress appears once, the whole family shows, officials wear formal clothes (Oct 8).
  - Escape during the intro opens options and quit only (Oct 4). Openings differ (Oct 9).
- **The look:**
  - Kit 12 is locked (Oct 2). Kit 13 approved (Oct 4).
  - Borders thicker, ornaments fixed, outlines on unselected buttons (Oct 8).
  - The chevron rule (Sept 29).
- **The layout:**
  - The menu shell: icon rail, portrait opens You, News on the rail, Options on Esc (Oct 20; replaces the Civilization VI shell of Oct 6).
  - No scrolling on main screens.
  - Date and time on the player card only (Oct 1).
- **Individual screens:**
  - The conversation box as a lower third (Oct 9).
  - Person card: Skyrim-style, showing only what you'd know (Oct 8).
  - Family "like Mountain Glade" (Oct 8).
  - Government map redesigned (Oct 8).
  - Campaigns designed after you play (Oct 8).
  - The calendar is visual (Oct 1).
  - Title screen (Oct 7).
  - The loading screen; you see it first (Oct 5).
  - Glossary and live surfaces (Oct 5).
- **Art:**
  - Art fixes start now (Oct 9).
  - Art goes in and you curate (Sept 28).
