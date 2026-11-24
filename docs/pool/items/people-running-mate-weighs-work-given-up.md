---
id: people-running-mate-weighs-work-given-up
title: "A person asked to be a running mate weighs the work they would give up, as a person asked to take a post does"
area: people
kind: feature
priority: 2
size: S
status: open
standard: 2
root: none
claimed-by:
pr:
after: people-far-fill-in-holds-home-work
blocked-on:
lead: people
source: "Civic roles builder, Nov 15, building people-far-fill-in-holds-home-work"
model: sonnet
effort: medium
---

**What.** The ticket ask weighs a person's seat, their race, the question and how well they know the player, but not their job: a newcomer with a good job weighs it no more than someone out of work. A person asked to take a post already weighs it. Seen: when the player asks someone to run with them, their answer and the reason they give.

**Cause.** Found in code: `ticketStanding` in src/core2/modules/serve-asks.ts (line 254) has no pay or own-job term; postStanding has both.

**Fix.** Add the pay and own-job terms to ticketStanding through workHeld (src/core2/person-work.ts), with their weights beside the post seat's in the serve-ask weights (`w`). The Account lead ruled on Nov 15 that this is new design, filed and not built now.

**Time box.** 2 hours for one session.

**Rules.** No dice: the pull is a sliding scale on the person's own record. One model, two tiers.

**Done when.** A second session asks a running-mate newcomer with a well-paid job in a drawn place (named, with its seed) and sees them decline for the work they would leave.

**Waits on.** people-far-fill-in-holds-home-work.

**Files.** src/core2/modules/serve-asks.ts

**Notes.** Filed by hand by the civic roles builder.
