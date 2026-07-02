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

**Self-check before outputting any commit message.** Re-read the
message you are about to output. Does every paragraph (every block of
text between blank lines) consist of exactly one line? If not, fix it
immediately. This rule is frequently violated by AIs that default to
hard-wrapping text at ~80 characters — the self-check is there to
catch that habit before the message reaches the user.

**Examples.**

```
BAD (hard-wrapped — do not do this):
This paragraph explains why the change was
made and wraps at roughly 80 characters like
a text editor would do automatically.

GOOD:
This paragraph explains why the change was made and does not wrap at any fixed width — it is one continuous line that each client reflows natively.
```

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

### When building an Obsidian plugin inside a git worktree

Obsidian's vault loads plugins from `<vault>/.obsidian/plugins/<id>`, which is
typically a Windows junction to the main checkout's plugin folder.  When the
agent builds `main.js` inside a worktree (`.kilo/worktrees/<name>/`), the
vault continues loading the main checkout's `main.js` — the user sees no
change.  The fix must point the vault junction at the freshly-built checkout.

When you need the user to reload a worktree build in real Obsidian, do one of:

1. **Prefer `local` mode for Agent Manager fan-outs.** Changes land in the
   main checkout and the existing junction keeps working. Only use
   `worktree` mode when session isolation is required (conflicting edits,
   multi-branch experiments).

2. **If the work is in an Agent Manager worktree and isolation was needed,**
   finish tests inside the worktree (Vitest/Playwright resolve to `main.ts`
   and are unaffected), then ask the user to run `Agent Manager Apply` and
   `npm run build` in the main checkout.

3. **If the vault must be re-pointed at the worktree now,** use the shared
   relink script:
   ```powershell
   & "$env:USERPROFILE\.config\kilo\tools\obsidian-relink.ps1" `
       -Source "$worktreePath"
   ```
   then tell the user to reload the plugin in Obsidian.  The vault path is
   auto-discovered from common locations or passed via `-Vault` if needed.

Always print the full filesystem path of the built `main.js` before the
user-reload instruction.  That way, if anything goes wrong, the user can
verify by inspection which build the vault is loading.

### What NOT to do

- Do NOT ask the user to manually remove a junction and create a new one in
  PowerShell.  The relink script exists for that and handles the edge cases.
- Do NOT assume a fresh build in a worktree automatically updated
  `<vault>/.obsidian/plugins/<id>/main.js`.
- Do NOT assume `git diff` against HEAD is sufficient evidence the bundle
  was built.  Grep the built `main.js` for a fingerprint of the change.

### What NOT to do

- Do NOT assume `npm run build` succeeded without checking its exit
  status.
- Do NOT declare a task done without grepping the built artifact for
  evidence that the change landed.
- Do NOT ask the user to test before you have verified the built
  artifact contains your edit.
- Do NOT rely only on `git diff` against HEAD — that shows source
   changes, not what the runtime loads.

## Rule: Git line endings on Windows

When you run git commands on Windows, you will often see warnings like:
`warning: LF will be replaced by CRLF the next time Git touches it`

This is **normal and expected**. The user's git is configured with `core.autocrlf=true`, which is standard for Windows. Git stores files with LF internally but converts them to CRLF when checking out to disk (so editors see Windows-style line endings). The warning fires whenever git stages a text file that lacks an explicit `.gitattributes` entry.

**What you must do:**

- **Ignore the warnings.** They are informational, not errors. Do not stop what you're doing, do not ask the user to fix them, and do not run `git config` commands to silence them.
- **Respect `.gitattributes`.** If the repo has a `.gitattributes` file, it defines explicit line-ending rules for different file types. Those rules override the global `core.autocrlf` setting and must be honored.
- **Never change the user's git config for line endings.** The global `core.autocrlf` setting is intentional. If a specific repo needs different behavior, the user should add a `.gitattributes` file to that repo, not change the global config mid-session.

**If you see CRLF-related errors (not just warnings):**

- EOL conversion errors (e.g., `fatal: LF would be replaced by CRLF`) mean `core.safecrlf` is set to `true` (strict mode). This is rare. Ask the user whether to relax it for that specific repo.
- If a file has mixed line endings that cause build or test failures, flag it to the user and suggest adding an explicit entry to `.gitattributes` (e.g., `*.sh text eol=lf` for shell scripts).
