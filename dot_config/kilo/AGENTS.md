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

### OS-specific paths and commands

Kilo runs on Windows, macOS, and Linux. When these instructions or repo-level AGENTS.md files refer to paths, environment variables, or shell syntax, use the appropriate form for the current platform:

| Concept | Windows (PowerShell) | macOS / Linux (Bash/zsh) |
|---------|----------------------|--------------------------|
| User home | `$env:USERPROFILE\` | `$HOME/` or `~/` |
| Config dir | `$env:USERPROFILE\.config\kilo\` | `~/.config/kilo/` |
| Shared tools | `& "$env:USERPROFILE\.config\kilo\tools\<script>.ps1"` | `$HOME/.config/kilo/tools/<script>.ps1` or equivalent |
| Vault plugin dir | `<vault>\.obsidian\plugins\<id>\` | `<vault>/.obsidian/plugins/<id>/` |
| Symlinks + junctions | junctions (`New-Item -ItemType Junction`) via PowerShell, or symlinks with `mklink /D` in cmd | symlinks (`ln -s target link`) |

When you need the user to run a command on their machine, use the form that matches their shell. If a repo ships a PowerShell helper (e.g., `obsidian-relink.ps1`), the macOS/Linux equivalent is usually a direct `ln -s` of the same target — see the Obsidian worktree section below for specifics.

### When building an Obsidian plugin inside a git worktree

Obsidian's vault loads plugins from `<vault>/.obsidian/plugins/<id>`, which is typically a link to the main checkout's plugin folder. On Windows, this is a **junction**; on macOS and Linux, it is a **symlink**. When the agent builds `main.js` inside a worktree (`.kilo/worktrees/<name>/`), the vault continues loading the main checkout's `main.js` — the user sees no change. The fix must point the link at the freshly-built checkout.

When you need the user to reload a worktree build in real Obsidian, do one of:

1. **Prefer `local` mode for Agent Manager fan-outs.** Changes land in the main checkout and the existing link keeps working. Only use `worktree` mode when session isolation is required (conflicting edits, multi-branch experiments).

2. **If the work is in an Agent Manager worktree and isolation was needed,** finish tests inside the worktree (Vitest/Playwright resolve to `main.ts` and are unaffected), then ask the user to run `Agent Manager Apply` and `npm run build` in the main checkout.

3. **If the vault must be re-pointed at the worktree now,** use the shared relink script:

   **Windows (PowerShell):**
   ```powershell
   & "$env:USERPROFILE\.config\kilo\tools\obsidian-relink.ps1" `
       -Source "$worktreePath"
   ```
   The vault path is auto-discovered from common locations, or pass `-Vault <path>` explicitly.

   **macOS / Linux:**
   There is currently no `obsidian-relink.sh`. Repoint the vault plugin link manually:
   ```sh
   # Remove the old link/symlink at <vault>/.obsidian/plugins/<id>,
   # then create a symlink to the worktree's plugin folder.
   ln -sfn "$worktreePath" "<vault>/.obsidian/plugins/<id>"
   ```
   Substitute your actual vault path for `<vault>` and plugin id for `<id>` (read from the worktree's `manifest.json` `id` field). On macOS, the vault is commonly in `~/Documents/` or via iCloud (`~/Library/Mobile Documents/...`); on Linux it is typically `~/Documents/`.

Always print the full filesystem path of the built `main.js` before the user-reload instruction. That way, if anything goes wrong, the user can verify by inspection which build the vault is loading.

### What NOT to do

- Do NOT ask the user to manually remove the existing link and create a new one, *unless* you've already given them the exact platform-appropriate command (PowerShell junction delete on Windows, `ln -sfn` on macOS/Linux). The Windows relink script exists and handles edge cases for junctions; do not invent your own Windows procedure on that platform.
- Do NOT assume a fresh build in a worktree automatically updated `<vault>/.obsidian/plugins/<id>/main.js`.
- Do NOT assume `npm run build` succeeded without checking its exit status.
- Do NOT declare a task done without grepping the built artifact for evidence that the change landed.
- Do NOT ask the user to test before you have verified the built artifact contains your edit.
- Do NOT rely only on `git diff` against HEAD — that shows source changes, not what the runtime loads.

## Rule: Git line-endings warnings

When you run git commands, you may see informational warnings about line-ending conversion. The direction depends on the platform's `core.autocrlf` (or `core.eol`) setting:

- **Windows** (`core.autocrlf=true` is standard): `warning: LF will be replaced by CRLF the next time Git touches it` — git stores LF internally but checks out CRLF so Windows editors see correct line endings.
- **macOS / Linux** (usually `core.autocrlf` unset or `input`): `warning: CRLF will be replaced by LF the next time Git touches it` — same idea in the opposite direction, typically hit when a repo contains files previously committed with CRLF.

Either way, this is **normal and expected** on both platforms. The warning fires whenever git stages a text file whose current on-disk EOL does not match what the repo's conversion rules say is canonical, and the file lacks an explicit `.gitattributes` entry pinning its EOL.

**What you must do:**

- **Ignore the warnings.** They are informational, not errors. Do not stop what you're doing, do not ask the user to fix them, and do not run `git config` commands to silence them.
- **Respect `.gitattributes`.** If the repo has a `.gitattributes` file, it defines explicit line-ending rules for different file types (e.g., `*.sh text eol=lf`, `*.bat text eol=crlf`). Those rules override the global config and must be honored.
- **Never change the user's git config for line endings.** The global `core.autocrlf` / `core.safecrlf` settings are intentional. If a specific repo needs different behavior, the user should add a `.gitattributes` entry to that repo, not change the global config mid-session.

**If you see EOL conversion *errors* (not just warnings):**

- Strict-safety errors (e.g., `fatal: LF would be replaced by CRLF`) mean `core.safecrlf` is set to `true`. This is rare and OS-dependent. Ask the user whether to relax it for that specific repo.
- If a file has mixed line endings that cause build or test failures, flag it to the user and suggest adding an explicit entry to `.gitattributes` (e.g., `*.sh text eol=lf` for shell scripts across all platforms).
