---
id: law-levels-authority-null-build
impact: patch
section: Fixed
title: Fix the missing state-law return type in the build
---

A missing state-law row now returns the optional value declared by the authority reader, fixing the TypeScript build error without changing a body's powers.
