#!/usr/bin/env bash
# Cancels queued pull_request runs whose commit is no longer the newest commit
# of an open pull request, so the build is not starved (skill merger, "Stale
# runs"; docs/pool/START-A-MERGER.md). Push and dispatch runs are never touched.
# It only lists what it would cancel; add --go to cancel.
#   bash scripts/merger/cancel-stale-runs.sh [--go]
set -euo pipefail
repo="lamontaes/Political-Game-Git"
go="${1:-}"
heads="$(gh api "repos/$repo/pulls?state=open&per_page=100" --paginate --jq '.[].head.sha')"
gh api "repos/$repo/actions/runs?status=queued&per_page=100" \
  --jq '.workflow_runs[] | select(.event == "pull_request") | "\(.id) \(.head_sha)"' |
  while read -r id sha; do
    if grep -qx "$sha" <<<"$heads"; then continue; fi
    if [ "$go" = "--go" ]; then
      gh api -X POST "repos/$repo/actions/runs/$id/force-cancel" >/dev/null && echo "cancelled $id ($sha)"
    else
      echo "would cancel $id ($sha)"
    fi
  done
