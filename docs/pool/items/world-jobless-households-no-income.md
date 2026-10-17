---
id: world-jobless-households-no-income
title: "Households with no job and no cash have no income at all: 9 of the 20 largest living-cost arrears in a Utah town hold nothing and receive no pay or benefit"
area: world
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/jobless-households-no-income
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T16:03:32.814Z
---

**What.** In a Utah town (place 4972280, seed `ae7138d0fe23b58bb40b941cea599b2992632daa0debb935363661593218e275`, bench world, two-level, 90 days from the start, after the carried-arrears and pay-from-members changes in #4937 and #4939) the households with the largest unpaid living costs hold no cash and have no pay: of the nine with arrears above $200, eight have no job and no income contract at all (a couple born 2001 and 1999 with a child born 2022 owing two months, single adults born 1980, 1986 and 1998, a family of four), and one is a 75-year-old whose retirement of $1,469.52 a month goes to the rent first. Households that earn owe under a tenth of what they were asked. A household with no job, no cash and nothing coming in cannot pay anything, so its rent, living cost and every bill go unpaid month after month with nothing changing for it.

**Rules.** Research before building: what supports a household with no earnings (unemployment insurance, SNAP, TANF, SSI, family and savings) comes from the programs data, read by the same engines the player's laws change. No dice: eligibility comes from the person's record and the law in force. One model, two tiers.

**Done when.** In a one-year run of a drawn town (name place and seed), every household with no job either receives a named support (a record that moves money to its members, by program and law) or is shown by record to have none for a stated reason, and the share of living costs unpaid by households without a job is checked against the sourced rate of such households in poverty.

**Files.** src/core2/jobs-benefits.ts, src/core2/modules/jobs.ts, src/core2/modules/residents.ts

**Notes.** Found measuring #4937. The cause is not in the living-cost payment. First find who these people are (a student, someone disabled, someone not in the labor force, someone whose job ended) and which program should reach them; the programs tables in data/research/programs (SNAP, Medicaid, UI) are unread today. Left open for a session that takes the benefits line.
