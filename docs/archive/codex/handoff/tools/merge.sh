#!/bin/zsh
# Approve-and-merge with guards. Usage: merge.sh <pr> <tested-head-prefix> "<approval text>"
# Refuses unless the PR's base is main and its live head matches the head that was tested.
R=lamontaes/Political-Game-Git; PR=$1; TESTED=$2; TEXT=$3
read BASE HEAD <<< $(gh pr view $PR --repo $R --json baseRefName,headRefOid --jq '"\(.baseRefName) \(.headRefOid)"')
[ "$BASE" != "main" ] && { echo "REFUSED: #$PR targets $BASE, not main"; exit 1; }
[[ "$HEAD" != ${TESTED}* ]] && { echo "REFUSED: #$PR head is ${HEAD:0:9}, tested ${TESTED}"; exit 1; }
# Owner, Oct 1: no hard-coded laws or places and no duplicate systems before merge. I am the only line of defense.
python3 "${0:A:h}/design_check.py" $PR "$TEXT" || { echo "REFUSED: #$PR failed the design check (see above)"; exit 1; }
gh pr comment $PR --repo $R --body "CLAUDE CTO APPROVED FOR MERGE at $HEAD — $TEXT" >/dev/null || exit 1
gh pr ready $PR --repo $R >/dev/null 2>&1
for i in 1 2 3; do gh pr merge $PR --repo $R --merge --match-head-commit $HEAD >/dev/null 2>&1; [ "$(gh pr view $PR --repo $R --json state --jq .state)" = MERGED ] && { echo "MERGED #$PR into main"; exit 0; }; sleep 5; done
echo "MERGE FAILED #$PR"; exit 1
