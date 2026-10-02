# Our Civic Duty: UI and logo wiring brief (from Claude CTO, Oct 2, 2026)

**The job:** wire the approved **kit12** UI theme into the game, and put the approved **logo** into the title screen, the app and window icon, and the Steam folder. The owner approves pixels: show full-screen screenshots of every main screen before calling anything done. Game repo: `lamontaes/Political-Game-Git` (main). The full rules are in the repo at `docs/codex/handoff/HANDOFF-TO-CODEX-2026-10-02.md` (sections 11D, 11E and 12E are the UI and art rules).

## What's in this folder
- `01_kit12_ui/`, the approved UI:
  - `kit12.css`: the spec, including tokens, components and the LIE CONTROL block;
  - `final.html` / `final.png`: the conversation screen;
  - `final-lying.png` and `final-pair.png`: the lie on and off;
  - `s1-title`: the title screen;
  - `s2-play`: the play HUD;
  - `s3-lying`;
  - `s4-dossier` / `s4-people`;
  - `s5-money` / `s5-ledger`;
  - `s6-news` / `s6-paper`;
  - `s7-options`;
  - `scales-level.svg` / `scales-tipped.svg`: the lie icons;
  - `portrait3-sheet.png`: the portrait treatment.
- `02_logo/`:
  - `box-nolock-1.png`: the final ballot-box art, on ivory;
  - `emblem-final.png`: the transparent cut-out of the box;
  - `library-logo-1280x720.png`: the box plus the stacked wordmark, transparent;
  - `community-icon-184x184.png`.
- `03_steam_capsules/`: every Steam size in the approved option C. `build_c.py` + `render_c.mjs` rebuild them (HTML + Playwright).
- `04_key_art/keyart-collage-v1-2752x1536.png`: the comic-panel key art (convention, Oval Office, Supreme Court, Senate floor, press briefing).

## Locked UI decisions (do not change)
1. **Fonts** (kit12 tokens):
   - **Cinzel 800** for names and titles (the title "Our Civic Duty" is Cinzel, letter-spacing 0.07em, gold `#d6bd84`);
   - **Andada Pro** for speech and prose;
   - **Fira Sans** for UI labels.
   - Other colors: brass `#9c8350`, iron `#1c1a18`, strong text `#f6f1e8`.
2. **No navy anywhere in the game UI** and no remnants of the old navy theme. The spirit is Crusader Kings and The Sims, Steam-storefront polish. Menus are low-key and sleek and complement the game art (not Apple-native, not cartoony, no bulky boxes). The art takes center stage.
3. **Conversation box:** serious and political, not video-gamey.
   - The panel sits between translucent and transparent, heavier, with a tight shadow, not too brown.
   - The speakers' **portraits sit top-left**.
   - Replies are numbered, with no chevrons.
4. **Lie control = scales of justice:**
   - brass line art, no box, **34px in the UPPER RIGHT** of the conversation box;
   - level at rest; it **tips and glows red** when lying;
   - dim and level when nothing false can be said;
   - lying replies glow soft red (text `#ffc9bd`, red numeral);
   - **the word "Lie" never appears**: no label, no tag.

   The spec is the LIE CONTROL block in kit12.css.
5. **Radial menu** comes back (restyled; it must not bundle or cover the portrait). The **player portrait sits next to the clock** (bottom-left). **The date and time appear in ONE place only**, the player card. Check every screen for duplicated info.
6. **Glossary underlines MUST SHIP:** civic terms get a tiny underline, hover shows the definition, and clicking "Mark as learned" removes the underline (the term stays in the glossary).
7. **Hover:** people and buttons get a smooth white glow (red for a lie). People glow softly on hover.
8. **Dossier:** the full-body figure on the left, tabs, sections (mock 22 layout); clear bounded glass (mock 18 look); menu shape of tabs across the top, a list on the left, detail on the right (mock 27).
9. **Title screen:**
   - a civic scene, never apartments, and **never the community-meeting painting** (PG_TITLE_BG_COMMUNITY_MEETING_HERO_SLOT_02);
   - with a save, it shows the most recent character in a hero pose for their role;
   - saves and options stay visible;
   - no hard-coded version string.
10. **Live surfaces:** TVs, newspapers, posters and notes in scenes are live slots (headlines, the TV news fitted to the TV).
11. **Remove:**
    - empty or premature tabs ("Waiting on you", "Your office" until the player holds one);
    - duplicate screens;
    - busywork prompts;
    - the day-in-review popping up unasked;
    - developer screens;
    - any citation, "estimate" or "fictional world" text in player-facing copy.
12. **Build mockups from real game screenshots** and real records, never generic scenes.

## Logo rules
- The **ballot box**: navy with brass corners, **no lock**, front square to the camera, looking down at the lid, a thin-outline ballot, about 6/10 realism (not photoreal, not cartoony), no hands or skin.
- **Wherever "OUR CIVIC DUTY" is spelled out next to the box, the ballot is BLANK** (owner: words on the ballot look like AI slop). The words are set in **Cinzel 900**, gold gradient `#f0d9a4 → #d6bd84 → #a87a48`, with a dark navy outline and shadow.
- Use `emblem-final.png` for the icon and title lockup. Use `library-logo-1280x720.png` where a transparent stacked logo is needed.
- The navy box is a branding pick; it does not break the "no navy in the game UI" rule.

## Steam
Option C is approved: the full comic collage fading to navy, with the title along the bottom. All sizes are ready in `03_steam_capsules/`. Still to do: gameplay screenshots once kit12 is wired, at 1920×1080, at least 5 real gameplay shots. The library hero is upscaled, so a wider key-art version would sharpen it.

## How to verify (required)
- A full-screen screenshot of each screen: title, play HUD, conversation (lie on and off), dossier, people, money, news, options.
- Check: no navy, no duplicated date, glossary underline working, scales behaving.
- Small PRs.
- Every change gated:
  - typecheck;
  - changed tests;
  - one new game in a random place;
  - no new placeholders.
