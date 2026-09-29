# Codex wave 1: the plan (draft for Lamontae's approval)

Written by Claude CTO at 5:20 p.m. on September 29, 2026. Nothing launches until Lamontae approves it on the docket.

## Rules for the whole wave (Lamontae, September 29)

1. **Coordinator:** runs on **Astra Light**. It starts only **Sol 6.1 Low or Medium** chats, plus **exactly one Sol 6.1 High** chat (team 2). Effort is set per team below and never raised.
2. **Seven teams at once.** A team may **not** start another team; only Lamontae adds teams. Each team may start **one Sol 6.1 Low agent for research** (finding and reading sources), and nothing else.
3. **Teams never merge.** Each opens pull requests; Claude CTO checks and merges them. A hand-back goes in `docs/codex/handbacks/<team>.md`, in the format of `docs/codex/README.md`.
4. **One writer per file.** Before editing, a team lists its files in `docs/codex/claims.md` (team, files, time). A file claimed by another team is left alone until that team's pull request merges; the conflict goes in the hand-back.
5. The standing rules in `AGENTS.md` apply to every team:
   - no dice;
   - one rule for all 56 places;
   - sliding scales, not thresholds;
   - causes, not chances;
   - estimate, never "unknown";
   - wire to the world;
   - the speed budget (no year more than 20% slower than main);
   - the local gate, not the full suite.
6. **Questions go to Lamontae through Claude CTO.** A team writes its question under NEEDS LAMONTAE in its hand-back, with options and a recommendation, and keeps working on anything the question doesn't block.

## The seven teams

### Team 1: finish the laws (Sol 6.1 Medium)

**State at 5:16 p.m.**

- Branch `codex/wire-last-ten-laws`, in `/private/tmp/wt-main`, is **not pushed** and has **no pull request**.
- 3 laws are committed: curriculum, student loans, public land.
- 7 are written but **uncommitted**: photo ID, lobbying cooling-off, library materials, immigration, disaster cost share, federal mandatory minimums, the stock ban.
- All 9 law test files pass (18 tests), and the allowlist is empty, so the count reads 92 of 92.
- The proof run (`npm run laws:proof`) exists but has run **0 of 92**.
- A backup of all of it is in `cto-notes/codex/backup-wire-last-ten-laws-1716/`.

**Do, in order:**

1. Commit the 7 remaining laws, one commit per law.
2. Push, and open one pull request.
3. Run `npm run laws:proof` for all 92 laws.
4. For every law that moves nothing in its year, fix it or list why.
5. Run the local gate.
6. Write the hand-back, with the proof table.

**Done when:**

- the proof table has 92 rows;
- every law moves money, people or places, or has a named reason it doesn't;
- the gate passes.

**Files:** only the ones already changed on the branch, plus `scripts/laws-proof/`.

### Team 2: every state governs, and Congress votes from principles (Sol 6.1 **High**, the only one)

**Prompt:** `docs/codex/02-every-state-governs.md`, all of it.

**Waits:** leave `officeholder-principles.ts` alone until team 1's pull request merges (team 1 changed it).

**Done when:**

- a 5-year watched world in a random place shows laws passing in at least 45 of the 50 states, each within a realistic yearly range, with the bill counts by stage in the hand-back;
- a partisan House vote lands near party lines, not 356 to 76;
- one reconciliation bill passes the Senate on a simple majority;
- midterms can unseat incumbents;
- Vermont's legislature comes out near its real 87 D and 56 R.

### Team 3: towns built from census counts, then work and money, then elections (Sol 6.1 Medium, plus 1 Low research agent)

**Prompts:** `04-towns-from-census.md`, then `05-town-work-and-money.md`, then `11-elections-and-places.md`, in that order.

**The Low agent** collects census counts (2020 Decennial Census and ACS 5-year, 2020 Island Areas) for every place the game opens.

**Done when:**

- no place is hand-set or at 0;
- unemployment stays within real variation for 5 years in 3 random places (small, mid-size, big city) plus one territory;
- all pay flows through one money function;
- the four work rolls are gone, replaced by sliding scales;
- no two election cycles have identical counts;
- turnout differs by kind of election.

### Team 4: speed, then state names out of the code (Sol 6.1 Medium)

**Prompts:** `06-speed.md`, then group D of `03-dice.md`: the 27 places where a state or place is named in the code, moved into data.

**Done when:**

- `npm run speed:years` exists;
- year 10 takes no more than twice year 1, alone on the machine, with fingerprints identical to before;
- the 20% speed rule is in `AGENTS.md` and the gate;
- the dice allowlist drops by 27 lines.

### Team 5: canned content out, people's history, then playtest fixes (Sol 6.1 Medium)

**Prompts:** `07-canned-content-out.md`, then `12-people-history.md`, then `09-playtest-fixes.md` (only the items it routes to itself, not the UI restyle).

**Also remove from the game:**

- "Your choices here / Who is here with you, and what you can do";
- the developer notice "This is not you. Only your own appearance and wardrobe can be changed, from Personal."

**Done when:**

- a guard test blocks every removed canned sentence;
- the day-one paper carries the world's history from before January 5, 2026;
- meetings show the real attendees;
- every dead button works or is gone;
- the dossiers of the President, the governor, the mayor, a council member and a neighbor show record-backed history;
- the routing table covers all 149 playtest items;
- browser screenshots are in the hand-back.

### Team 6: research, who governs each policy topic (Sol 6.1 Medium lead, plus 1 Low research agent)

**Prompt:** `cto-notes/research/authorities/outline.md`, approved in full by Lamontae on September 29. Copy it into `docs/codex/research-outline.md` in the team's first pull request. The worked example is `transportation-infrastructure.md` in the same folder.

**This is research only; no game code.** Order: transportation first (verify every item marked **verify**, and fill in availability for all 56 places), then housing, labor, health, education, budget and taxes, justice, government, business, environment, agriculture, civil and family, technology, then the federal areas.

**Done when**, for each area:

- the schema validates;
- every decision cites a real example (2010 to 2026);
- every availability cell is sourced or marked "unresearched";
- every effect has a sourced size or says "no sized evidence";
- whole-system redesigns are broken into pieces that can be negotiated, with U.S. examples and other countries' systems as models.

### Team 7: art Firefly can't make, and image tagging (Sol 6.1 Low or Medium, for Lamontae to pick)

**Art:**

- babies and children (Firefly's rules block them);
- TV screens: a news desk, a debate stage, a local station;
- newspaper front pages, from a weekly to a big daily;
- matching the game's illustrated style.

Every piece works from a **visual reference Claude CTO supplies**: a painting from the game, a mockup or a screenshot. It never works from words alone. Kids are made as outfitted pose sheets like the adults' (three body sizes, blank faces, no hair).

**Tagging:** give every place painting and pose sheet from September 29 its metadata:

- places: kind, inside or outside, region and climate fit, time of day, weather;
- people: gender, pose, outfit, facing, body size, and temperament fit (a shy or a brash stance).

This is written as a data file, ready for the art import in job 08.

**Done when:**

- a kids' pose set (standing, seated; boys and girls; three ages) exists;
- TV and newspaper surfaces exist, each with its reference;
- every image delivered on September 29 is tagged;
- Claude CTO has reviewed a contact sheet of each set.

**Waits:** Claude CTO delivers the reference images and the September 29 image folder in the team's first message.

## Not in wave 1 (and why)

- **UI restyle (job 10):** Lamontae is workshopping the look in Antigravity with the UI kit (`~/Documents/OCD-UI-Kit`).
- **Every topic has laws (job 13):** waits for team 6's research, area by area.
- **Dice groups A, B and C (145 lines):** approved, but they touch the same files as teams 2, 3 and 5. They come in wave 2 once those merge.
- **Art into the game (job 08):** waits for team 7's tags and the image delivery.
- **The 13 older draft pull requests:** Claude CTO decides keep or close separately.
