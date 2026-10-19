# Screen mockups, pass 2 (October 14, 2026)

Every screen from the owner's screen plan, rendered at full size (1440 x 900) in
the approved Kit 13 look (`docs/ui/kit13/APPROVED-2026-10-04.md`). This is the
picture of what the in-game screens should look like. Nothing here is wired into
the game yet; the words are sample records from one game in Latimer,
Mississippi. In the game they come from the records and the English engine.

- `shots/` has one PNG per screen. Start here.
- `page/index.html` is all the screens on one page (open it in a browser).
  `page/shot/<screen>.html` is each screen alone at native size.
- `source/` has the build scripts. Copy `source/*` next to `page/`, then run
  `bash rs.sh` to rebuild the HTML and screenshots with headless Chrome.
- The icons, node frames and other UI art these use are on main under
  `art/ui-kit13/` (PR 4310).

## What the owner said

After pass 1 the owner called it a "solid start" and gave notes. Pass 2 does all
of them. His reaction to pass 2: "good."

| Screen | Design |
| --- | --- |
| Play | Scene fills the window. The menu is a straight column of round icons, bottom left, above the player card; the name shows on hover. No radial menu. The toast (top right) is the pop-up when a story reaches you. |
| Conversation | Uses the existing Lie scales button from `play.html` (`.lie-scales`), top right of the talk box. Do not redesign it. Replies are numbered; Say nothing and Leave are small plain buttons under them. |
| People | Built on the old People web (`PeopleRelationshipWeb.tsx`): tabs All, Family, Friends, Work, Politics; the chosen group stays in color and the rest dim; lines colored by kind (family gold, household dashed, work steel blue, politics terracotta, others muted); a key; a search box. Clicking a face lights their lines and says in one sentence how you know them. No side info panel. |
| Person card | Tall and narrow, like Skyrim: small header (name, office, age, street, chips), a meter for what they think of you, then their public journal as a timeline. Tabs for you and them, and their record. Talk, Visit, Call. |
| Politics: Government | Each body: chamber picture, party split bar, members with party, recent votes as yes/no bars, what's coming up, the executive. |
| Politics: Issues | Law cards grouped by subject, like Democracy 4 and Crusader Kings 3: icon, the law in force in large type, a marker between the two extremes, who can change it, since when. The owner rejected a plain list ("like an Excel sheet"). |
| Charts | Not a screen of its own. One chart style (donuts, bars, this year against last) used anywhere numbers are compared: budget, money, votes. |
| Calendar | One month plus Coming up. Day tiles shorter than wide with small event icons, not printed text. Clicking a day slides a day panel open between the month and Coming up. |
| Journal | Approved as is ("solid"). |
| Who you are | Full-height portrait in front of a painting of your own home (no ribbon, no keyhole frame). Traits as round icons, then household, school, job, your views as cards. |
| Money | Big cash figure, six months of balances as bars, a donut of where the month went, things you own and owe as cards. |
| Jobs and study | Job card with the workplace painting, offers with Take it / Turn it down, schooling. |
| Travel | Approved as is. |
| News | The owner loved the front page idea and wants many looks. Four here: old broadsheet, modern color daily, tabloid, town weekly. Each paper gets its own fonts and layout. The game paints the photo of the actual story (the winner waving, the governor signing). |
| News you overhear | TV or radio speaks like anyone else: a small card in the conversation text style with a tiny radio/TV icon, the station, and the line. |
| Options | Approved as is. |

Known issue the owner noted but set aside: the brass corner ornaments on panels
don't sit right yet.

## Rules for building these into the game

- Use the Kit 13 tokens and controls already in `play.css`; no new looks.
- No hand-written player text: every word on these screens comes from records or
  the English engine. The sample words are only there to show layout.
- Never use real outlet names for papers or real business names.
