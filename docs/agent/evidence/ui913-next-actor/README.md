# UI9-13: the working bill, and who has it next

Local review run, `/opt/pw-browsers/chromium` 141.0.7390.37 at 1440x900 — not
`npm run test:e2e`. The regression that hosted CI runs is
`tests/e2e/ui-core-news.spec.ts`, "the office names the bill being worked on
and who has it next".

Seed `ui-connect2-news`, age 38, the route
`tests/e2e/support/legislative-entry.ts` takes. Nothing injected.

## What the run did, and what it found

Standing for the seat is not optional here, and finding that out was the useful
part. Starting with `office-start` gives an office JOB, and the drafting table
refused to file:

> Filing requires a supported member seat. This character holds no active
> legislative member seat. Staff may prepare a draft, but an office job does
> not authorize introduction.

That is the game being right, so the run campaigned instead — file candidacy,
fundraise, canvass, pass days to the result:

```
afterword: "Jessica Zamora won. The seat is theirs, and so is everything that
            came before it."
```

With the seat, the drafting table enabled filing, and after filing a transit
access pilot the office read:

```
working band: "WORKING ON: TRANSIT ACCESS PILOT"
next actor:   "Committee on Committees has it next. Committee on Committees
               decides which committee takes the measure."
```

Screenshot: `office-selected.png`.

## Where the answer comes from

`measureGate(world, measureId)` — the canonical answer to what controls a
measure's next step, and the same one the bill workspace has been printing as
"who decides next" all along, behind "Look at what is moving". No phase is
mapped to an actor in the shell: what the chamber's own rule pack calls the
referral authority, the committee or the leadership is what the office says.

The browser regression asserts that a canonical actor is named and that the
sentence reads "has it next", rather than pinning a particular rule pack's
wording into a test.

## A vacuous leg, caught rather than reported

The first pass of this route reached the office, saw the docket, and read
`active-measure: 0`. That was true and meant nothing: the life had filed
nothing, so there was no working measure to name. Reporting it either as a pass
or as a defect would have been wrong. The run files a bill before it measures.
