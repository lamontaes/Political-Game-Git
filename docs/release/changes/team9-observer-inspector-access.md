---
id: team9-observer-inspector-access
impact: patch
section: Changed
title: Observer inspector access reads the paused world
---

Observer clock access can open the developer inspector after its pause settles. The inspector reads that exact checkpoint, including its world identity, without substituting a demonstration world. Parent Observer admission and return wiring remain a separate receiving dependency.
