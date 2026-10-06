# B14 Part 4 public-record reader evidence

## Fixture chain

The focused fixture uses a new seeded Kentucky scenario and records an M10
appointment with both a restricted appointment artifact and a public payroll
posting. An unrelated reader can discover only the public posting; the private
occurrence is not added to that reader's event knowledge. Repeated reads do not
duplicate discoveries. The reader then records a no-randomness decision to
refer the record or set it aside. Before a referral is processed, the record is
not linked to a matter and does not support a proceeding.

Seed: `b14-p4-public-record`

This is a controlled reader-contract fixture, not a natural contract-award
run. The current source tree has no public contract-award, disclosure-filing,
or payroll-posting producers for these misconduct acts, and the existing
oversight-body contract has no person identity for an NPC regulator to decide.
Reporter story creation from an artifact without a public event also remains
unwired. The fixture does not establish the assignment's random-place public
record → rival/regulator/reporter → proceeding chain.

## Verification

The focused test command was attempted through `npm run storage -- run test --`
with the repository storage guard. Admission refused it because the machine had
22 GiB available with a 25 GiB free-space reserve. No test result or natural
new-game proof is claimed. Resume the focused test when storage admission is
available, then run typecheck including tests and add a watched public-record
producer/reader chain before marking this part ready.
