---
id: people-cause-holder-contacts-sourced
title: "The weekly shortlist of ties a person with a cause weighs is sourced from pages fetched, and the owner-decision stopgap is retired"
area: people
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
standard: 2
lead: lives
model: sonnet
effort: medium
root: none
source: stand-in triage, Nov 10, 2026 (SG-PEOPLE-cause-holder-weekly-contacts)
claimed-at:
---

**What.** A person with a cause weighs reaching out to only a shortlist of their ties each week (15), a speed cut built on Oct 24 and never sourced. No ruling answers "do activists reach out only to people they know"; the simplest version that follows the rules (simulate it, don't ask) is a real limit on how many people a person keeps in weekly or monthly touch, from network research.

**Cause.** Found in code: src/core2/modules/people.ts line 108 (function weeklyContacts, marker SG-PEOPLE-cause-holder-weekly-contacts) reads the parameter causeHolderWeeklyContacts in src/core2/data/parameters.json (line 910), tagged TUNABLE, whose spread says "to be sourced from pages fetched by research".

**Fix.** Fetch and quote the personal-network layer studies (Dunbar and colleagues; Pew or GSS contact counts) and set the value and spread SOURCED or ESTIMATED with the pages named; if the sourced value moves it, run the long-save speed check once. Change the stopgap's kind from owner-decision to a sourced estimate and resolve it, with a note that the shortlist is a modeled limit on one person's attention, not a ruling on who activists contact. No new loop; the shortlist stays weekly.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building. Every number tagged with its source and spread. No dice. Speed bar: no more than 20 percent slower than base on npm run speed:year.

**Done when.** A second session finds causeHolderWeeklyContacts tagged SOURCED or ESTIMATED with two fetched pages quoted in src/core2/data/parameters.json, SG-PEOPLE-cause-holder-weekly-contacts resolved in people.json, and in a played year of buildBenchWorld in a drawn place (seed named) a person with a cause holding more ties than the value, weighing only the shortlist, by record id.

**Waits on.** Nothing.

**Files.** src/core2/data/parameters.json, src/core2/modules/people.ts, src/core2/data/stopgaps/people.json

**Notes.**
