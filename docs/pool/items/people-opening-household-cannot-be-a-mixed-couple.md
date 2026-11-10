---
id: people-opening-household-cannot-be-a-mixed-couple
title: "Every opening household shares one origin, so a mixed couple cannot exist on day one and no record explains a sibling's different surname"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: lives
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 4, "Family looks")
---

**What.** The owner said on November 8: "I'm Mexican and my son is white." The crew's check that day found no origin record at all. One is on main now, and it overcorrects. Read in the code, not measured in play: a household shares one origin, drawn once by the household's id, and a newborn takes one parent's origin (`src/core2/opening-origin.ts`, near line 155). So a mixed couple cannot exist at the opening, in any household in any place, and a child of two origins is never both. No record explains a sibling's different surname either: nothing says a mother kept her name, a parent remarried or a child came from an earlier partner. The family then looks wrong in the other direction, every home one block of one origin, and where looks or names do differ the game cannot say why. Fix it at the cause: each adult's origin is their own, couples form across origins at the rate real couples do in that place, a child's origin and looks come from both parents, and a surname that differs inside a family follows from a recorded event in the family's past.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: the share of couples across origins starts from the place's real figure with a per-world spread, marked ESTIMATED with its source, and only decides who exists. One rule, all 56 places: the shares come from each place's own row, with the nation's where a territory has none, and no place is named in the logic. No dice: after the opening, who partners with whom follows the people's own lives; seeded generation of who exists is allowed and is all this item uses. Ask why: a sibling's different surname or a child's different looks answers why by a record (a parent's earlier partner, a name kept at marriage). Research before building: the intermarriage rates and the naming rates are fetched and quoted, never typed. Owner, November 8: "I'm Mexican and my son is white."

**Done when.** A second session, not the builder, runs this in the running game. Start the bench (`npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed. Start three lives in that place and two in a second drawn place. On the You screen and each household member's card, check every family: a parent and child whose looks differ share at least one parent's origin on the record, a couple of two origins appears in at least one of the towns' households (dev mode's person view lists each member's origin, with a count of mixed households on dev mode's Watch panel, added by the builder from the same records if no line shows it), and every surname that differs inside a household is explained on the card in a sentence from the family's record, by record id. Take a screenshot of one mixed household's cards side by side with the place and seed under it. The audit names no place or seed for this defect, so the repro is any new game on the Nov 9 code: no household holds two origins. A test draws a place, opens the world and fails if no household holds adults of two origins where the place's source rate says some should, or if a child's origin is neither parent's. The owner plays it: he makes a character, sees a partner or parent of another origin, a child who looks like both, and a line that says why a sister has another last name.

**Files.** src/core2/opening-origin.ts (`withOrigins`, line 96, where a household takes one draw; `childOrigin`, line 153; `originShares`, line 65, stopgap SG-LIVES-origin-state-shares), src/core2/opening-kin.ts, src/core2/modules/people.ts, src/bench/people-pack.ts, src/bench/ui/dev-person.mjs

**Notes.** From the Fable audit, Pillar 4, "Family looks", read in the code; the audit's played life in Blodgett Landing, New Hampshire shows the neighboring face defect (one person, two faces: "The You screen's bust has light brown hair and pale skin. The Your life tab shows a full figure with black hair and tan skin. Her mother's bust resembles neither of them"), which is a separate defect in how a face is drawn and is not part of this item. The audit did not count households by origin in any world and did not look for the surname records. Confirmed on main, Nov 10 (helper): `withOrigins` gives every person without a given origin their household's one draw (`householdOrigin`), kin outside the town take the nearest resident relative's, and `childOrigin` picks one of the known parents' origins by the child's id. Related: `play-stop-15-family-unexplained` (marked done, still shows in part: "My family is the Steins, I am Bo Snider, and nothing explains who they are"; the audit finds no record that explains a sibling's surname), `people-partnership-counted` (open: counted adults partner by the same rules as full people).
