---
id: laws-nine-links-taxes
title: "Every taxes and public finance law passes all nine wiring links in a played year"
area: laws
lead: laws
kind: wiring
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr: #8372
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
after:
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-laws-nine-links-taxes
---

**What.** Two parts of the taxes and public finance family are still short of the nine wiring links: the estate tax, whose money cannot move until a played town has an estate above the exemption (people-estate-wealth-top-tail, open), and the local income tax grant's bill, whose Words row words-bill-section-local-income-tax-authority is now done. Ten laws landed in PR #5649 as laws-nine-links-taxes-ten. A law passes the nine links when it exists in all 56 places, a body can enact and repeal it, it reaches people and organizations, the engine it changes reads it, it moves money between real accounts, it moves its outcome-web measures, people learn of it only by a read, repeal stops it, and one code path serves every place. Seen: the tax a household or business pays after a tax law passes, on the bill card.

**Cause.** Design: the nine-link standard in docs/archive/2026-10-23/work-orders/lead-laws-2026-10-24.md. The estate tax cannot show money until people-estate-wealth-top-tail gives a played town an estate above the exemption.

**Fix.** Once people-estate-wealth-top-tail lands, rerun estate-tax in two drawn places on the checker and finish it; wire the local income tax grant's bill now that its Words row is done.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the engine that pays or decides reads the law and records whom it applied it to through `lawApplied`. One model, two tiers: counted groups take the same rule as full people, times the count. Ask why: a person attributes a change to the law only after news they received, a conversation, a notice or an ad. The chain is the acceptance: each law is followed to a named person and a dollar.

**Done when.** A second session, not the builder, replays this on main in the running game: in two drawn places on seeds nobody chose, dev mode and the law check follow each law still open in this item to a named person or household and a dollar, by `lawApplied` record id and journal entry. The builder's proof: In a played year (`buildBenchWorld`, every module installed) in two places drawn from all 56 with seeds the builder did not choose, named in the PR body, `scripts/law-wiring/check.ts` and `scripts/law-wiring/matrix.ts` grade every law in this family wired on all nine links in `docs/reports/law-wiring-matrix.json`. A link declared not applicable in `scripts/law-wiring/declared.json` with its statute or research reason counts; a registered stopgap does not. The family test names, for each law, its `lawApplied` record id, the journal entry of the money and the person or household reached. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Waits on.** Nothing for the local income tax grant's bill (words-bill-section-local-income-tax-authority is done): wire it now. The estate-tax half waits on people-estate-wealth-top-tail (open); leave it for a second pull request and say so.

**Files.** src/core2/modules/employer-taxes.ts, src/core2/budgets-treasury.ts, src/core2/law-reach/applied.ts

**Notes.** Split Oct 24 by the CTO from `laws-wiring-every-law` (the lead order: `docs/archive/2026-10-23/work-orders/lead-laws-2026-10-24.md`). Family PR state on Oct 23: open, #5649 (branch claude/law-wiring-taxes), sent back Oct 21 for corporate-tax arrears (item `laws-corporate-tax-arrears-by-jurisdiction`); the death-tax terms fix is #5744 (item `laws-death-tax-rate-only-terms`). A PR for this family names this item on line 1 (`Pool item: laws-nine-links-taxes`) and `Lead: laws` in its body, never the umbrella: family PRs looped because the umbrella's done-when is one no single family can meet, and a bare umbrella id on line 1 closes the umbrella on merge. The arrears and death-tax fixes are part of this family; land them with it.

Laws lead, Oct 25: PR #5649 now lands the eleven laws that are wired as `laws-nine-links-taxes-eleven`. This item stays for the estate tax, whose money cannot move until a played town has an estate above an exemption (`people-estate-wealth-top-tail`); once it does, rerun the estate tax in a drawn place on the checker and finish it here.

Laws lead, Oct 26: PR #5649 now lands ten as `laws-nine-links-taxes-ten`. This item stays open for the estate tax (blocked on `people-estate-wealth-top-tail`) and for the local income tax grant's bill, which waits on the Words row `words-bill-section-local-income-tax-authority`.

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:05 UTC) on branch claude/pool-laws-nine-links-taxes.

Released (2026-11-11): local income tax authority already graded wired in the matrix; only the estate half (people-estate-wealth-top-tail, open) remains. Continue on branch claude/pool-laws-nine-links-taxes.

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:16 UTC) on branch claude/pool-laws-nine-links-taxes.

Released (2026-11-11): re-offered by next after release; see PR 8372, grant half already wired. Continue on branch claude/pool-laws-nine-links-taxes.

Claimed by next for muse-8740 (Muse Spark in Muse Code, tier mid) (2026-11-11 00:19 UTC) on branch claude/pool-laws-nine-links-taxes.

Released (2026-11-11): grant half already wired on current code and estate half still waits on the open people-estate-wealth-top-tail. Continue on branch claude/pool-laws-nine-links-taxes and pull request #8372.

Claimed by next for muse-8740 (Muse Spark in Muse Code, tier mid) (2026-11-11 00:29 UTC) on branch claude/pool-laws-nine-links-taxes.

Released (2026-11-11): grant half already wired on current code and estate half still waits on the open people-estate-wealth-top-tail. Continue on branch claude/pool-laws-nine-links-taxes and pull request #8372.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:38 UTC) on branch claude/pool-laws-nine-links-taxes.

Released by next (2026-11-11): no push to claude/pool-laws-nine-links-taxes since 2026-11-11 00:06 UTC, more than twice its 4-hour time box. Continue on branch claude/pool-laws-nine-links-taxes and pull request #8372.

Account lead thread (second account), Nov 14: nothing left to build here. The committed matrix (docs/reports/law-wiring-matrix.json) grades every taxes-finance row wired except estate-tax money (n/a until people-estate-wealth-top-tail lands, PR #8698) and the federal debt-limit question (owned by gov-federal-questions-money-readers-part-4). The law-wiring-taxes red was the test, not the laws: it enacted the property-tax growth cap at the city where the state bars local caps (Burlington MA seed aa11, Gas KS seed bb22), and settled an estate for a non-resident official under the town state's inheritance row. Fixed in the test; the item stays open for the estate half only.
