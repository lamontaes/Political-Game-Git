# "Local Elementary School" — what a generated childhood is named, 2026-09-22

Tree: `claude/playtest-cwpd3o` at the schools commit, based on `main` at `d956b92a`.
Reported by lamontae: "when you check your school that you went to it says
Local Elementary school."

## What the player read

Personal ▸ Education, `[data-testid="personal-education"]`, projected by
`projectPersonalRecord`. For a thirty-four-year-old whose earlier life the game
summarized:

```
Local Elementary School, from 1996.
Local Middle School, from 2002.
Local High School, from 2005.
```

Three placeholders, in the one place a player looks up their own past. The
source is `generateQuickCharacterHistory` in `src/simulation/character-history.ts`,
which wrote those three literals into the organization profiles it creates —
in a file whose own comment says "A module keeping a private list of three
first names is how a whole cast ends up sharing them."

## Generated, not sourced — and why

The repository ships a real education directory, and using it here would be
wrong rather than better. `institutionDateReason` refuses it explicitly: "This
directory describes 2025-26. Existence and offerings at this date are not
established." `EducationInstitution.foundingDate` is typed `null`. A real
school's name on an attendance in 1996 would assert something no source in the
tree carries.

So the names are generated, through the same seeded stream every other
generated name goes through, and the organizations keep `generated`
provenance. This is the unresearched-jurisdiction rule applied to a school: a
realistic generated answer rather than a refusal or a placeholder.

lamontae's approval of the shape, 2026-09-22: "I am completely fine with the
generated schools. You can do a county one or you know, some famous person
like I'm just making it up like a Andrew Johnson High School or Davy Crockett
Middle School, anything like that, or Daniel Boone, or John Brown, anything
like that. Also, counties, etc. As long as they're realistic."

## What it says now

The same surface, same route, read on three of the twelve towns checked:

```
### Nashville, Tennessee
   Spring Hill Elementary School, from 1996.
   North Nashville Middle School, from 2002.
   Central Nashville High School, from 2005.
### Lexington, Kentucky
   Greenwood Elementary School, from 1996.
   East Lexington Middle School, from 2002.
   South Lexington High School, from 2005.
### Helena, Montana
   Rolling Hills Elementary School, from 1996.
   Riverside Middle School, from 2002.
   Helena High School, from 2005.
```

Four shapes, in the proportions American schools actually use them: a
historical figure, a piece of local landscape, a compass point on the town, or
the town itself. High schools lean on the town, elementary schools on people
and landscape. `src/simulation/school-names.ts` holds the corpus as data with
a version, beside `names-data.ts`.

## A second defect this exposed

The first draft produced "South Lexington-Fayette High School". A jurisdiction
record's `name` is allowed to be the filing name, because a jurisdiction is the
government and the Lexington-Fayette Urban County Government is a real body
with that real name — `run-a` asserts it. But anything naming the place a
person is FROM wants the resident's name. `residentNameForJurisdiction` reads
it, through the same three-step rule shipped for the Census place names.

## Not established

- Whether the seed varies anything about a summarized childhood beyond its
  names. `narrative-life` asserts it does not, deliberately, and this change
  does not touch that.
- The education lines carry a start year and no end. Not in scope here, and
  not measured.
- The same generator still writes "Community Service Club" and "Neighborhood
  Market" as literals. They are placeholders of the same kind, left alone
  because the report was about schools.

## Checks

- `src/simulation/school-names.test.ts` — 7 cases over 5 stems and hundreds of
  seeds: level suffix, no blanks, three distinct schools per childhood, no
  compass point in front of a county, determinism, corpus integrity.
- `src/presentation/generated-school-names.test.ts` — 15 cases across six
  states, none of them Kentucky: no placeholder, a name-shaped name, three
  different schools, the same schools in every save of one world, different
  towns not sharing one set, and no census filing label in a school's name.
