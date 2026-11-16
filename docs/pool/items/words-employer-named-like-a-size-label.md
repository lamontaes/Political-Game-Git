---
id: words-employer-named-like-a-size-label
title: 'A business named for a family called Small reads as a size label: "Small Manufacturing"'
area: words
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Words builder B, Nov 14, play of #9072 at Waitsfield, Vermont (new life, card line "Works as a production worker at Small Manufacturing.")
lead: words
standard: 2
model: sonnet
effort: medium
root: design-words-machine
after:
---

**What.** On a person's card a business reads "Small Manufacturing" (Waitsfield, Vermont, new life), which a player takes for "a small manufacturer", not a company. Seen: the person card's work line and every Journal and news line that says the employer.

**Cause.** Found in code: `fillBusinessName` in `src/core2/business-names.ts` replaces `{family}` in the template `"{family} Manufacturing"` (`src/core2/data/business/names.json`, line 29) with the owner's family name, and "Small" is a surname in the name corpus (`src/core2/gov-rules/names-data.ts`). Other surnames that are ordinary words (Short, Snow, Sparks, Strong, Young) can read the same way.

**Fix.** `fillBusinessName` says a family name that is also a common adjective or noun in the possessive or family form the other owner-named businesses use ("Small's Manufacturing", "Small Family Manufacturing"). The list of such surnames is a data row beside `names.json`, not a place or person name in logic.

**Time box.** 2 hours, Sonnet.

**Rules.** No hand-written player text in code; one rule for all 56 places.

**Done when.** In three drawn places on fresh seeds (named), every business whose family name is on the list reads in the family form on the person card and in the Journal; a test names its drawn place and seed and fails on a business name equal to a size or quality word plus an industry. A second session, on main, opens the card of someone who works for such a business and sees the family form.

**Waits on.** Nothing.

**Files.** src/core2/business-names.ts, src/core2/data/business/names.json, src/core2/business-names.test.ts

**Notes.** Filed by Words builder B, Nov 14.
