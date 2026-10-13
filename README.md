# Global agent rules and helpers

This repository is the source of truth for global agent rules and shared Kilo
helper scripts. chezmoi installs the canonical rules at
`~/.config/kilo/AGENTS.md` and renders copies for Delta at
`~/.config/delta/AGENTS.md` and Antigravity (Gemini) at
`~/.gemini/config/AGENTS.md`. See [the copy map](#how-the-kilo-delta-and-gemini-copies-are-connected) for details.

- To change a global rule, see [Change a global agent rule](#change-a-global-agent-rule).
- To pull a change made on another machine, see [Pull changes from another machine](#pull-changes-from-another-machine).
- To set up a new computer, see [Set up a new computer](#set-up-a-new-computer).
- To diagnose a missing or stale rule, see [Troubleshooting](#troubleshooting).

For a persistent change, edit the canonical source file in this repository, run
`chezmoi apply`, then commit and push. Do not directly edit installed Kilo,
Delta, or Gemini copies unless you intend a temporary local change.

---
## Where Kilo reads rules

Kilo merges rules from several layers, from lower to higher precedence.

| Order | Layer | Path | Scope | Managed here? |
|---|---|---|---|---|
| 1 | Global rules | `~/.config/kilo/AGENTS.md` | Every Kilo session | Yes |
| 2 | Project rules | `<repo>/AGENTS.md` | That repository | No |
| 3 | Subdirectory rules | `<repo>/src/AGENTS.md` | That subdirectory and descendants | No |
| 4 | `kilo.json` instructions | Paths named in configuration | As configured | Optional |

A later, more specific layer can supplement or override an earlier layer. Use
the global file for durable cross-repository practices; use a project-level
`AGENTS.md` for repository-specific commands, conventions, or known hazards.

## Delta Personal AGENTS.md

Delta loads the first non-empty file at `~/.config/delta/AGENT.md` or
`~/.config/delta/AGENTS.md` as its Personal AGENTS.md. This repository manages
the second path from `dot_config/delta/AGENTS.md.tmpl`, which includes the
canonical `dot_config/kilo/AGENTS.md`; edit the canonical source, then run
`chezmoi apply` to refresh all copies.

Personal rules do not select or share a thread's checkout. Independent Delta
threads can use isolated worktrees even when they attach the same project. If
you want a thread to edit an existing local checkout, select **Existing Local
Checkout** in Project Settings when setting up the thread, or continue in the
thread already using that checkout. See [Delta thread workspaces and checkout identity](#delta-personal-agentsmd).

### What the global rules cover

The global `AGENTS.md` contains reusable rules, including:

- Commit-message formatting.
- Avoiding duplicate code and unnecessary churn.
- A single Debugging section: resolving uncertainty with decisive tests rather
  than repeated speculation, Obsidian console snippets, targeted log markers,
  a crash-safe flight recorder for intermittent failures, and an out-of-process
  watchdog with debugger stack capture for freezes.
- Windows command-line safety and Git line-ending handling.
- Verifying runtime-loaded build artifacts.
- Delta thread/worktree identity and Obsidian plugin worktree workflows.
- Obsidian pop-out window rules: no bare main-window globals, per-window listeners and timers, and no focus stealing on blur.
- Conditional Node/npm and Python repository rules.

Technology-specific rules are conditional: they apply only after Kilo verifies
that the current repository uses the relevant technology or workflow.

---

## Files in this repository

```text
.
├── .chezmoiignore              # Keeps repository-only files out of installed paths
├── .gitattributes              # Defines repository line-ending policy
├── .gitignore                  # Keeps OS and editor junk out of Git
├── README.md                   # This documentation
├── dot_config/
│   ├── delta/
│   │   └── AGENTS.md.tmpl      # Delta Personal AGENTS.md (includes the Kilo source)
│   └── kilo/
│       ├── AGENTS.md           # Global Kilo rules (source of truth)
│       ├── hooks/
│       │   ├── commit-msg      # Git hook entry point
│       │   └── commit-msg.ps1  # PowerShell hook implementation
│       └── tools/
│           └── obsidian-relink.ps1  # Obsidian plugin relinking helper
└── dot_gemini/
    └── config/
        └── AGENTS.md.tmpl      # Antigravity IDE global rules (includes dot_config/kilo/AGENTS.md)
```

chezmoi maps `dot_config/` in the source repository to `~/.config/` in the
installed state. For example:

```text
Source repository:  dot_config/kilo/AGENTS.md
Installed location: ~/.config/kilo/AGENTS.md
```

`chezmoi apply` writes the source state to the installed location. It does not
make a symlink: the installed file is a normal file that chezmoi manages.

### Why use chezmoi?

Kilo can read `~/.config/kilo/AGENTS.md` directly, but a manually maintained
file exists only on one machine. chezmoi provides a Git-tracked source of truth,
synchronization across machines, and a repeatable setup process for a new
computer.

---

## How the Kilo, Delta, and Gemini copies are connected

One tracked rules file feeds three installed files, so the rules are written
once:

```text
Source repository (~/.local/share/chezmoi/)      Installed file                    Read by
dot_config/kilo/AGENTS.md                  -->   ~/.config/kilo/AGENTS.md          Kilo
dot_config/delta/AGENTS.md.tmpl            -->   ~/.config/delta/AGENTS.md        Delta
  (one line: {{ include "dot_config/kilo/AGENTS.md" }})
dot_gemini/config/AGENTS.md.tmpl           -->   ~/.gemini/config/AGENTS.md        Antigravity (Gemini)
  (one line: {{ include "dot_config/kilo/AGENTS.md" }})
```

- The Delta and Gemini files are templates. Each includes the Kilo source, so
  chezmoi renders the same rules into the tool-specific Personal AGENTS.md path.
- The installed files are rendered copies, not symlinks or live references.
  Editing the Kilo source does not update them until `chezmoi apply` runs.
- Always apply the whole repository. `chezmoi apply` with no path updates all
  three rule files (and the other managed files) in one step. Applying only the
  Kilo path leaves the Delta and Gemini copies stale.

### Update all agent rule copies with one command

After editing `dot_config/kilo/AGENTS.md` in the source repository:

```sh
chezmoi apply
```

To fetch changes pushed to GitHub (from another machine or a PR) and update
every managed file:

```sh
chezmoi update
```

To check that nothing is pending, run `chezmoi status`; it prints nothing when
the installed files match the source. Start a new Kilo session or Delta thread
to load updated rules; an existing session keeps the instructions it already
loaded.

---
## Day-to-day use

There are two locations to keep distinct:

- **Source repository:** Usually `~/.local/share/chezmoi/`; a normal Git
  checkout of `https://github.com/notuntoward/kilo-dotfiles.git`. This is the
  authoritative version you edit and commit.
- **Installed copies:** `~/.config/kilo/AGENTS.md`, `~/.config/delta/AGENTS.md`,
  and `~/.gemini/config/AGENTS.md`. Kilo and Delta read their copy when a new
  session or thread starts; Gemini reads its rendered copy.

The normal pattern is:

1. Edit the source repository in VS Code or Emacs.
2. Save the edit.
3. Run `chezmoi apply` in a terminal.
4. Start a new Kilo session or Delta thread.
5. Commit and push the source-repository change.

## Change a global agent rule

Use this procedure to add, remove, or revise a global rule in `AGENTS.md`.

### Open the source repository

Open the **source repository** in your preferred editor. Do not open the
installed `~/.config/kilo/AGENTS.md` file for a persistent change.

### VS Code

From PowerShell, Command Prompt, macOS Terminal, Linux Terminal, or VS Code's
integrated terminal:

```sh
chezmoi cd
code .
```

`chezmoi cd` starts a shell at the source repository root. `code .` opens that
directory as a VS Code workspace.

You can then use VS Code's **Terminal > New Terminal**. The integrated terminal
should start in the repository root. If it does not, run:

```sh
chezmoi cd
```

### Emacs

Open the chezmoi source repository directory in Emacs, then edit:

```text
dot_config/kilo/AGENTS.md
```

Run the commands below with `M-x eshell`, `M-x shell`, an Emacs terminal
package, or your normal external terminal. The terminal must be at the source
repository root; run `chezmoi cd` if needed.

### Edit and save

Edit and save this tracked source file:

```text
dot_config/kilo/AGENTS.md
```

Do not directly edit this installed file:

```text
~/.config/kilo/AGENTS.md
```

On Windows, the installed path is normally:

```text
C:\Users\<your-user-name>\.config\kilo\AGENTS.md
```

A direct edit to the installed copy may affect a currently running Kilo session,
but the next `chezmoi apply` can overwrite it. The source file is the durable
version that belongs in Git.

### Review and apply

After saving your edit, run these commands in the source repository's terminal:

```sh
git diff -- dot_config/kilo/AGENTS.md
chezmoi apply
chezmoi diff
```

What they do:

- `git diff -- dot_config/kilo/AGENTS.md` shows the source change you made.
- `chezmoi apply` updates the installed Kilo file and renders the Delta and
  Gemini copies from the canonical source.
- `chezmoi diff` should produce no output when all installed copies match the
  source state.

### Start a new agent session

Kilo and Delta load their global rules when a session or thread starts. After
running `chezmoi apply`, start a new Kilo session or Delta thread; an existing
session continues using the rules it already loaded. Start a new Gemini
conversation to load its rendered copy.

### Commit and push

Still in the source repository:

```sh
git add dot_config/kilo/AGENTS.md dot_config/delta/AGENTS.md.tmpl README.md
git commit -m "Update global agent rules"
git push
```

If the change requires a commit-message body, follow the formatting rules
enforced by the installed commit-msg hook.

### Change README.md only

For a README-only edit, use the same editor workflow but do not run
`chezmoi apply`, because the README is not installed as a dotfile.

```sh
git diff -- README.md
git add README.md
git commit -m "Clarify Kilo rules documentation"
git push
```

### Recover an accidental installed-file edit

If you accidentally edited `~/.config/kilo/AGENTS.md` directly and want to
preserve that work, import it into the source repository before applying:

```sh
chezmoi re-add ~/.config/kilo/AGENTS.md
chezmoi cd
git diff -- dot_config/kilo/AGENTS.md
```

On PowerShell:

```powershell
chezmoi re-add "$env:USERPROFILE\.config\kilo\AGENTS.md"
chezmoi cd
git diff -- dot_config/kilo/AGENTS.md
```

Review the resulting source change carefully. Then follow the normal
**Review and apply**, **Start a new Kilo session**, and **Commit and push**
steps above.

If the direct installed-file edit was unwanted, discard it by running:

```sh
chezmoi apply
```

### Resolve a push conflict

If `git push` fails because another machine pushed first:

```sh
git pull --rebase
```

If Git reports a conflict in `dot_config/kilo/AGENTS.md`:

1. Open that file in VS Code or Emacs.
2. Resolve the conflict markers.
3. Save the file.
4. Continue the rebase and push:

```sh
git add dot_config/kilo/AGENTS.md
git rebase --continue
git push
```

If you resolve a conflict that changes the installed rule file, run
`chezmoi apply` again before starting a new Kilo session.

---

## Pull changes from another machine

To fetch, install, and apply changes already pushed to GitHub:

```sh
chezmoi update
```

`chezmoi update` updates the source repository and applies the resulting source
state to the installed locations.

To inspect the change before installing it:

```sh
chezmoi cd
git pull --rebase
exit
chezmoi diff
chezmoi apply
```

Start a new Kilo session after applying the update.

---

## Add a managed Kilo file

Use this when you want chezmoi to manage another Kilo configuration file, such
as `kilo.jsonc`.

First create or edit the installed file, then add it to chezmoi:

```sh
chezmoi add ~/.config/kilo/kilo.jsonc
```

chezmoi copies it into the source repository, typically as:

```text
dot_config/kilo/kilo.jsonc
```

Then commit and push it:

```sh
chezmoi cd
git add dot_config/kilo/kilo.jsonc
git commit -m "Track Kilo configuration"
git push
```

After that, `chezmoi apply` installs the file on every machine that uses this
repository.

Do not add a file to the managed set unless you want it synchronized across
machines. Unmanaged files can coexist in `~/.config/kilo/`.

---

## Shared scripts and hooks

This repository distributes helper scripts under `dot_config/kilo/`. They are
installed into `~/.config/kilo/` by `chezmoi apply`.

| File | Purpose | Platform |
|---|---|---|
| `hooks/commit-msg` | Git hook entry point that rejects hard-wrapped commit-message body paragraphs | All, with required shell/PowerShell support |
| `hooks/commit-msg.ps1` | PowerShell implementation for the commit-message check | Windows; PowerShell Core on macOS/Linux |
| `tools/obsidian-relink.ps1` | Repoints an Obsidian vault plugin path to a selected checkout | Windows primary; manual symlink workflow elsewhere |

To add a shared helper, add it under `dot_config/kilo/tools/`, test it, then
commit and push it. Do not place one-off copies in `~/.local/bin/`,
`C:\scripts\`, or another unmanaged location if the tool is intended to be
available consistently on multiple machines.

## Enable the Git commit-msg hook

The hook is installed at `~/.config/kilo/hooks/`, but Git must be told to use
that directory. Run this once per machine after `chezmoi apply`.

### Windows PowerShell

```powershell
git config --global core.hooksPath "$env:USERPROFILE\.config\kilo\hooks"
```

### macOS or Linux

```sh
git config --global core.hooksPath "$HOME/.config/kilo/hooks"
```

After this, Git invokes the commit-msg hook for commits in every repository on
the machine.

---

## Verify loaded agent rules

Inside Kilo or Delta, ask:

```text
Show me the exact set of agent rules you loaded.
```

After applying changes, start a new Kilo session or Delta thread. The loaded
paths should include the corresponding file below:

```text
Kilo:  ~/.config/kilo/AGENTS.md
Delta: ~/.config/delta/AGENTS.md
Gemini: ~/.gemini/config/AGENTS.md
```

On Windows, these paths are under your user profile. Delta may use
`~/.config/delta/AGENT.md` instead if that singular file exists and is
non-empty, because it takes precedence over `AGENTS.md`.

---

## Create a new project

Usually, no action is needed. The global rules load automatically for every
project.

Create a project-level `<repo>/AGENTS.md` only for information that is genuinely
specific to that repository, such as:

- A fragile ordering constraint in an Obsidian plugin.
- The exact Python environment manager, formatter, type checker, and test
  commands for a Python project.
- An unusual build, packaging, release, or deployment process.
- A repository-specific acceptance test or manually verifiable behavior.

Put project-level rules at the repository root. Use a subdirectory
`AGENTS.md` only when a subtree truly has different requirements.

A compact project-level file might look like:

```md
# Agent instructions for <repository>

## Critical behavior

Describe the repository-specific hazard, why it matters, and how to verify the
correct behavior.

## Build and test

Run:

- `npm run build`
- `npm run test:run`

## Local conventions

Describe conventions that the global rules cannot infer.
```

---

## Set up a new computer

No Kilo configuration directory needs to exist in advance. `chezmoi apply`
creates required parent directories, including `~/.config/kilo/`.

Install Kilo and chezmoi in either order. Kilo configuration files that are not
managed by this repository, such as an existing `kilo.jsonc`, can coexist with
the managed global `AGENTS.md`.

### Windows

Open PowerShell:

```powershell
# Install VS Code and then install the Kilo Code extension from the Marketplace.

# Install chezmoi.
winget install twpayne.chezmoi --accept-source-agreements

# If winget did not update PATH in this shell, open a new PowerShell window.

# Clone and apply the managed Kilo configuration.
chezmoi init https://github.com/notuntoward/kilo-dotfiles.git
chezmoi apply

# Enable the global Git commit-msg hook.
git config --global core.hooksPath "$env:USERPROFILE\.config\kilo\hooks"

# Verify that installed files match the source state.
chezmoi status
chezmoi diff
```

Start a new Kilo session after setup.

### macOS

Open Terminal:

```sh
# Install VS Code and then install the Kilo Code extension from the Marketplace.

# Install chezmoi.
brew install chezmoi

# Clone and apply the managed Kilo configuration.
chezmoi init https://github.com/notuntoward/kilo-dotfiles.git
chezmoi apply

# Enable the global Git commit-msg hook.
git config --global core.hooksPath "$HOME/.config/kilo/hooks"

# Verify that installed files match the source state.
chezmoi status
chezmoi diff
```

Start a new Kilo session after setup.

### Linux

Open a terminal:

```sh
# Install VS Code and then install the Kilo Code extension.

# Install chezmoi. See https://www.chezmoi.io/install/ for the current method.
sh -c "$(curl -fsLS get.chezmoi.io)"

# Clone and apply the managed Kilo configuration.
chezmoi init https://github.com/notuntoward/kilo-dotfiles.git
chezmoi apply

# Enable the global Git commit-msg hook.
git config --global core.hooksPath "$HOME/.config/kilo/hooks"

# Verify that installed files match the source state.
chezmoi status
chezmoi diff
```

Start a new Kilo session after setup.

---

## Troubleshooting

### A global-rule change is not taking effect

1. Confirm you edited the canonical source file:
   `dot_config/kilo/AGENTS.md`.
2. Run:

   ```sh
   chezmoi apply
   chezmoi diff
   ```

3. Start a new Kilo session or Delta thread.
4. Ask Kilo or Delta:

   ```text
   Show me the exact set of agent rules you loaded.
   ```

### Delta does not list the managed Personal AGENTS.md

Verify that `~/.config/delta/AGENTS.md` exists and that
`dot_config/delta/AGENTS.md.tmpl` still includes the canonical Kilo source.
Run `chezmoi apply`, then start a new Delta thread. Delta loads the first
non-empty file from `~/.config/delta/AGENT.md` and `AGENTS.md`; a non-empty
singular `AGENT.md` takes precedence.

If a fresh Delta thread does not show another thread's edits, inspect its
actual checkout. Independent threads can have separate isolated worktrees;
Personal AGENTS.md changes do not make their files shared. Continue in the
original thread or explicitly choose an existing local checkout when setting
up a new thread.

### Kilo does not list the global AGENTS.md file

Verify that the installed path exists:

```sh
ls ~/.config/kilo/AGENTS.md
```

On PowerShell:

```powershell
Test-Path "$env:USERPROFILE\.config\kilo\AGENTS.md"
```

If it does not exist, run:

```sh
chezmoi apply
```

If it still does not exist, confirm that the source repository contains:

```text
dot_config/kilo/AGENTS.md
```

### `chezmoi apply` overwrote an installed edit

That is expected when the installed edit was not first imported into the source
repository. If you still have the desired content, use the recovery procedure
in [Recover an accidental installed-file edit](#recover-an-accidental-installed-file-edit).

For future persistent edits, edit the source repository directly.

### I created a Kilo file by hand and want it tracked

Use:

```sh
chezmoi add ~/.config/kilo/<file-name>
```

Then review the new file under `dot_config/kilo/`, commit it, and push it.

### `git push` reports remote changes

Run:

```sh
git pull --rebase
```

Resolve any conflicts in your editor, then run:

```sh
git add <resolved-file>
git rebase --continue
git push
