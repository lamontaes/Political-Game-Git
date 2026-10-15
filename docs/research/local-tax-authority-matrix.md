# Local tax authority: one lookup for all 56 places

The game now answers, for any county or city in any of the 56 places, whether
the state lets that level levy a property, sales, payroll or corporate-income
tax. The source is the 92N national state and local fiscal authority matrix.
Method and location follow at the end.

## How an answer is chosen

1. A production record (today only the twelve Alaska records in
   `data/source/state-local-fiscal-authority/corpus.json`) overrides the matrix.
   These are not estimated.
2. Otherwise the state's 92N row answers, marked ESTIMATED.
3. D.C. and the territories have no 92N row, so they take the national
   most-common answer (property allowed, sales allowed, income and payroll
   prohibited), status `unknown-estimated`, marked ESTIMATED FROM AVERAGE.

## Payroll and corporate-income taxes

Only 13 states can land a city or county payroll or corporate-income term.
Their 92N rows are the only ones that do not prohibit local income or payroll
taxes: AL (allowed), CO (allowed), DE (specific), IN (piggyback), KY (allowed), MD (piggyback), MI (specific), MO (specific), NJ (specific), NY (allowed), OH (allowed), OR (allowed), PA (allowed).
Everywhere else a payroll or corporate term is refused with the status in the
message. A landed term records its status (general, specific or piggyback) in
the saved power evidence.

Property and sales terms use the same lookup in every place.

## Method and location

The 92N file is `data/source/state-local-fiscal-authority/research-input/92N_NATIONAL_STATE_LOCAL_FISCAL_AUTHORITY.json`.
The generator script projects it into the money research folder, and its
`--check` mode fails on drift.
