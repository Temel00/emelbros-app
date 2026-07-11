# Agent buildout loop

How agent sessions work implementation tickets on this repo. Decided in [#15](https://github.com/Temel00/emelbros-app/issues/15); the testing/CI foundation (branch-then-PR, branch protection requiring CI green) was decided in [#13](https://github.com/Temel00/emelbros-app/issues/13).

## Model choice

The agent working a ticket picks the model at claim time, using its own judgment and preferring the more efficient model that can do the work:

- **Sonnet** — the default for implementation tickets.
- **Haiku** — mechanical work executing a locked spec: boilerplate, renames, config, rote CRUD where every decision is already made.
- **Opus-class** — escalate only when a ticket is cross-cutting or design-heavy. Note the escalation and the reason in the PR description.

## Ticket scoping

Implementation tickets are **agent-scoped**: one ticket = one PR = one self-contained vertical slice inside one module boundary.

- The ticket body must be workable from a fresh clone using only the ticket text, `CONTEXT.md`, and linked ADRs — never by reading other tickets.
- Target roughly **100K tokens of session context** per ticket. That can't be predicted exactly, so cut tickets by proxy: the spec is fully locked, the work stays inside one module, and it touches roughly ≤10 files.
- **Mis-scope tripwire**: if mid-ticket the agent hits an undecided architectural question, or its context passes about half the window with no end in sight, the ticket was cut wrong. Stop, comment on the issue with what was learned, and split the ticket rather than pushing through.

## Branch & PR flow

- Branch from `main`, named `<type>/<issue#>-<slug>` (e.g. `feat/23-darts-scoring`).
- Open a **draft PR at first push** so work in progress is visible.
- Work until CI is green and the ticket's acceptance criteria are met, then **flip the PR to Ready for review**. Draft means the agent is still working; ready means it's the owner's turn. The owner reviews and merges — nothing lands unreviewed.
- Every PR body carries:
  - `Closes #<ticket>`
  - a summary of what was built
  - any judgment calls made within the ticket's scope
  - the model used, and the reason if it escalated from the default
  - how the change was verified

## Review loop

Owner review comments on a PR are the work order for **any fresh agent session** — no dependence on the session that opened it. The session picks up the branch, addresses the comments, re-pushes, and flips the PR back to ready. The owner merges when satisfied.
