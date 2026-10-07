---
id: income-tax-estimates-use-ranked-sources
impact: patch
section: Changed
title: Estimated income-tax schedules use sourced peers
---

The existing missing-rate fallback uses comparable sourced tax schedules instead
of a world-seed rate or deduction draw. It ranks peers by tax shape, region and
household income, preserving known deductions and the existing tax-year reader.
The result remains an estimate pending final enacted bracket-term admission.
