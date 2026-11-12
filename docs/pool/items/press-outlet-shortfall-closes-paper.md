---
id: press-outlet-shortfall-closes-paper
title: "A newspaper short of money cuts staff and closes by its own books, so the newspaper-closure turnout link can run"
area: people
kind: wiring
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
lead: governing
source: stand-in triage, Nov 10 (SG-WEB-voting-newspaper-closure; ruling Oct 25 in OWNER-DECISIONS.md, Press outlet shortfall)
claimed-at:
checked: fable 2026-11-10
---

**What.** The owner's ruling of Oct 25 (acting CTO, simulate it, don't ask) says an outlet short of money cuts staff, pages or closes by its own books, and the outside-audience top-up is removed. The top-up still runs, so no local newspaper ever loses money, none closes, and the newspaper-closure link into local turnout moves no one. Seen: in the paper, when a local newspaper that loses money cuts staff or closes, and in local turnout.

**Cause.** Found in code: src/core2/press-money.ts:370 still pays each outlet's shortfall from the outside customers' account each press week (reason key press.wider-audience, stopgap SG-PEOPLE-press-bureau-shortfall), so closedNewspapers (src/core2/modules/press.ts:955) counts zero and the "newspapers-closed" reader (src/core2/modules/outcome-web.ts:253, SG-WEB-voting-newspaper-closure) returns no closure.

**Fix.** Remove the wider-audience transfer at press-money.ts:370 and let the outlet's books show the loss; the press engine's existing staff cut and owner closing decision (press.ts already skips a closed outlet's pay at line 537) then act on it, and closedNewspapers counts the closing date. Do not add a closing rule: the owner's decision weighing operating losses already exists. Resolve SG-PEOPLE-press-bureau-shortfall and SG-WEB-voting-newspaper-closure. Check, in a drawn place, that the first-year layoffs and pay of town journalists stay sane (the sibling item business-local-press-closes-first-year was dropped for the opposite fault). Cheap: weekly by outlet, no new tables.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the closed paper is read by the web, which the voting engine reads. No dice: a paper closes from its books and its owner's traits, never a chance. One rule, all 56 places.

**Done when.** A second session, on main in a drawn place (place and seed named, not chosen by the builder), plays two years in dev mode, finds a local newspaper whose books show losses with no wider-audience transfer, sees its staff cut or its closing date by record id, and then sees a voter's turnout factor on a local-race day list the newspaper-closure link by the web record id. Both stand-ins are resolved.

**Waits on.** Nothing.

**Files.** src/core2/press-money.ts, src/core2/modules/press.ts, src/core2/modules/outcome-web.ts, src/core2/data/stopgaps/people.json, src/core2/data/stopgaps/web.json

**Notes.** From the Nov 10 stand-in triage (rest2). Another triage row, SG-PEOPLE-press-bureau-shortfall, closes with this same build; the session handling it should name this item instead of filing a twin. The press is basic at early access (Oct 10), so this may also wait.
