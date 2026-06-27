# Global agent rules

These rules apply to every Kilo session, regardless of project.
Project-level `AGENTS.md` files are loaded *after* this one and may
override or supplement any rule below.

## Rule: Commit messages — no hard-wrap within paragraphs

Each paragraph in a commit message must sit on a single line. Do not
insert newlines mid-sentence. Different clients (terminal git log,
GitHub web UI, GUI git clients) render commit messages at different
line widths; mid-paragraph hard-wraps produce ragged reflows across
these surfaces. Use blank lines between paragraphs as usual.

If your body paragraph is long, split it into two paragraphs instead
of wrapping one.

## Rule: When the runtime loads a pre-built bundle, verify the bundle
after every source change

If this project produces a pre-built artifact that the runtime loads
directly (not built at install time) — e.g. an Obsidian plugin's
`main.js`, a browser extension's `dist/`, a VS Code extension's
`out/`, a compiled binary — you MUST:

Run `npm run build` (or the relevant build command) after any edit to
source files.

Grep the built artifact for a fingerprint of your change: a new
string literal, an updated regex, a renamed identifier, a changed
test assertion. `git diff` against HEAD is not enough — you want
evidence that the *bundle on disk*, which is what the user's runtime
actually loads, reflects your change.

Do this before declaring the task complete or asking the user to
test. Both of the following failure modes have already happened in
real sessions and cost user time and agent credits:

- The agent edited TypeScript but did not build, so the user reloaded
  the plugin and saw no change.
- The agent ran `npm run build`, the build silently failed (lint or
  type error), the agent did not notice, and the bundle on disk was
  unchanged.

A post-build grep catches both.

### When the source lives in a git worktree

If your changes are in a git worktree (any source path containing
`.kilo/worktrees/`, `worktrees/`, or otherwise outside the main
checkout), the pre-built artifact at the canonical path in the main
checkout is NOT automatically updated. The user's runtime will still
load the main checkout's artifact, not the worktree's — the build
happened in a different working directory.

Before asking the user to load or test, one of:

- Apply the changes back to the main branch and rebuild there, OR
- Print the exact filesystem path of the built artifact in the
  worktree and confirm the user knows where to look.

Always print the full filesystem path of the built artifact before
any user-test instruction. This lets the user verify which checkout's
artifact is being loaded.

### What NOT to do

- Do NOT assume `npm run build` succeeded without checking its exit
  status.
- Do NOT declare a task done without grepping the built artifact for
  evidence that the change landed.
- Do NOT ask the user to test before you have verified the built
  artifact contains your edit.
- Do NOT rely only on `git diff` against HEAD — that shows source
  changes, not what the runtime loads.
