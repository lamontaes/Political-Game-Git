# Session 14 formatting gate

Repository-owned `npx prettier --check --ignore-unknown` checks every added path from `git diff --name-only --diff-filter=A origin/main...HEAD`, plus this receipt. `--ignore-unknown` skips PNG/JPG/TTF/Python/plain-text files without a Prettier parser; those are still supplied explicitly. Repository ignore rules also apply. No format coverage is claimed for unsupported formats.

Formatting-only repairs: all evidence JSON parsed values were compared before/after and are identical. Existing SHA256 receipts describe the historical publication bytes; formatting changes their text source bytes, so they are not current-tree checksums. PNG/source-art bytes remain unchanged. The received card-content.js text is now formatted; its original exact bytes remain at d132cfdcb4d81486dcc9c5c64073328dec2763f8 and upstream 605033e361ef0e8f13e1e2c454537aea24842ea4. This does not imply owner pick or production READY.

Exact terminal command and result are recorded in terminal.txt. No additional full suite or source ownership transfer.
