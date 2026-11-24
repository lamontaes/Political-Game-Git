# Compare strikes and adds the same sentence: two more drawn places

Before is main's `billPageView` (`git checkout origin/main -- src/bench/bill-stage.ts`); after is this pull request's head with main merged in. Same seed and the same bill in each pair, 1440x900, Politics, Bills, Compare. Played as a member of a local body, two weeks run (`/api/dev/run-until`), by the browser check `src/bench/bill-compare-differs.browser.mjs`'s own steps.

## Rutledge, Tennessee, seed 3094853a-6711-4df7-bbb1-9b981d2ac9cb, Ordinance 2025-2

- Before: `compare-before-rutledge-tn.png`
- struck: 'Section 1. Be it ordained by the Grainger County Board of Commissioners, That the rules now in force on civilian oversight of police are repealed and shall have no further effect.'
  added: Section 1. Be it ordained by the Grainger County Board of Commissioners, That a board of residents who are not police officers shall review complaints against the police.
- struck: 'Section 2. And be it further ordained, That the rules now in force on highway money used for transit are repealed and shall have no further effect.'
  added: Section 2. And be it further ordained, That the rules now in force on highway money used for transit are repealed and shall have no further effect.
- struck: 'Section 3. And be it further ordained, That a reserve of at least the set minimum shall be kept in the treasury.'
  added: Section 3. And be it further ordained, That a reserve of at least the set minimum shall be kept in the treasury.
- After: `compare-after-rutledge-tn.png`
- struck: nothing
  added: Section 1. Be it ordained by the Grainger County Board of Commissioners, That a board of residents who are not police officers shall review complaints against the police.
- struck: nothing
  added: Section 2. And be it further ordained, That the rules now in force on highway money used for transit are repealed and shall have no further effect.
- struck: nothing
  added: Section 3. And be it further ordained, That a reserve of at least the set minimum shall be kept in the treasury.

## Ocean View, Delaware, seed f8e753a7-5d9d-4c62-9827-218994eb1b1c, Ordinance 2025-2 (Ocean View Town Council)

- Before: `compare-before-ocean-view-de.png`
- struck: 'Section 1. Be it ordained by the Ocean View Town Council, That the rules now in force on apartments in single-family zones are repealed and shall have no further effect.'
  added: Section 1. Be it ordained by the Ocean View Town Council, That apartment buildings shall be allowed in zones now limited to single-family houses.
- struck: 'Section 2. And be it further ordained, That the rules now in force on civilian oversight of police are repealed and shall have no further effect.'
  added: Section 2. And be it further ordained, That the rules now in force on civilian oversight of police are repealed and shall have no further effect.
- After: `compare-after-ocean-view-de.png`
- struck: nothing
  added: Section 1. Be it ordained by the Ocean View Town Council, That apartment buildings shall be allowed in zones now limited to single-family houses.
- struck: nothing
  added: Section 2. And be it further ordained, That the rules now in force on civilian oversight of police are repealed and shall have no further effect.

## The complaint this answers

The record holds no owner complaint about this screen. The item's source is the lead's own play walk as a council member on Nov 11, 2026 (Lino Lakes, Minnesota, seed 046d2235-27df-4daa-a680-423d6f24d0d7, Ordinance 2025-6): Compare "showed its one section struck through and then the same sentence, word for word, underlined as added". A CTO waiver of the owner-quote line is asked for on the pull request.
