---
id: trait-seeding-upbringing-packet
impact: patch
section: Fixed
title: Trait seeding shares one person's unchanged upbringing
---

Seeding a person's traits reuses one lazy reading of their existing upbringing
and its qualities while only trait records and catalog definitions change.
Core, registered and notable traits retain their values, record order, first
record dates and existing-record protection. Public trait readers and dated
family evidence retain their existing behavior; no reading is retained across
people, calls or other world changes.
