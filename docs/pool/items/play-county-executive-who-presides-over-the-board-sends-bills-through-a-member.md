---
id: play-county-executive-who-presides-over-the-board-sends-bills-through-a-member
title: "In a commission county the 'county executive' is the board's own presiding probate judge, yet the bill menu makes them send a bill through a member (Etowah County, Alabama)"
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/play-presiding-executive-drafts-as-chair
branch: claude/play-presiding-executive-drafts-as-chair
standard: 2
after: play-bill-menu-for-mayors-and-governors
blocked-on:
lead: screens
source: Second words reader's read of the #8341 carry (PR #9151), Nov 14, 2026
model: opus
effort: medium
root: rc7-player-cannot-drive
checked: carrier thread 2026-11-14
---

**What.** A player who holds the county's "executive" office in a commission state sees the Draft a bill list and sends a bill to the county board by asking a member to carry it, although that office presides over the board and sits in its chair. The second words reader saw it in a played table: Ridgeville, Alabama, where the county executive is a probate judge sending a bill to the Etowah County Board of Commissioners. The class is every county whose executive presides over the body, not Alabama alone. Seen: Politics, Your office, Draft a bill, for a county's presiding executive.

**Cause.** Found in code: `proposalRight` (src/core2/modules/legislature.ts, line 3592) gives every office of kind county-executive a by-request right from one national row (executive-proposal.json, ESTIMATED, SG-GOV-local-executive-proposal), while the county data says the office presides over the body in commission states (data/research/local-government/county-governing-bodies.json, `executivePresidesOverBody: true`, AL "Probate judge"). The office row exists as a one-seat office (office:gus2025:122491:executive) beside the seven-seat board, so `bodiesOf` (src/bench/legislature.ts) offers the by-request path.

**Fix.** Read `executivePresidesOverBody` for the county's row when deciding the right: a presiding executive drafts as the body's chair through the member path (seatAct), a separate elected executive (a Puerto Rico municipio mayor, a county executive in an executive county) keeps the by-request path. Reuse the one draft card and engine; no second bill writer.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the county's own row decides, never a named state. Replace, never layer. No dice. Words come from the English engine and control names.

**Done when.** A second session plays a drawn county with a presiding executive and one with a separate executive (names places and seeds): the presiding one drafts as chair with no "asked" line, the separate one still asks a member. A pinned test names both places.

**Waits on.** PR #9151 (or #8341) folding into the train.

**Files.** src/core2/modules/legislature.ts, src/bench/legislature.ts, src/core2/data/legislature/executive-proposal.json

**Notes.** Look-first, Nov 14: searched docs/pool/items for probate, executive presiding and by-request; only the parent play-bill-menu-for-mayors-and-governors. The Puerto Rico municipio mayor (Vega Baja) is a separate elected executive over the Municipal Legislature, so that case is right as built.
