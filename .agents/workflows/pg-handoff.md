# PG Handoff Workflow

Update the current handoff named by the canonical Drive index with:

- timestamp;
- agent/model;
- absolute workspace;
- branch;
- local SHA;
- remote branch/ref;
- remote SHA;
- dirty tracked files;
- untracked files;
- current PR number/status if applicable;
- dev-server port;
- dev-server PID if known;
- tests actually run and results;
- screenshot/evidence paths;
- human acceptance status;
- remaining defects;
- exact next authorized action.

Include a LEARN section:

- unexpected problem;
- root cause;
- recurrence risk;
- durable mechanism changed, if any.

Never call a handoff clean while omitting dirty/untracked state.
