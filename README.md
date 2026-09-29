# Kilo global rules and helpers

This repository is the source of truth for your global Kilo rules and shared
Kilo helper scripts. chezmoi installs the global rules at
`~/.config/kilo/AGENTS.md`.

- To change a global rule, see [Change a global Kilo rule](#change-a-global-kilo-rule).
- To pull a change made on another machine, see [Pull changes from another machine](#pull-changes-from-another-machine).
- To set up a new computer, see [Set up a new computer](#set-up-a-new-computer).
- To diagnose a missing or stale rule, see [Troubleshooting](#troubleshooting).

For a persistent change, edit the tracked source file in this repository, run
`chezmoi apply`, then commit and push. Do not directly edit the installed
`~/.config/kilo/AGENTS.md` file unless you intend a temporary local change.

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

### What the global rules cover

The global `AGENTS.md` contains reusable rules, including:

- Commit-message formatting.
- Avoiding duplicate code and unnecessary churn.
- Resolving uncertainty with decisive tests or diagnostics rather than repeated
  speculation.
- Windows command-line safety and Git line-ending handling.
- Verifying runtime-loaded build artifacts.
- Obsidian plugin worktree and runtime-diagnostic workflows.
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

## Day-to-day use

There are two locations to keep distinct:

- **Source repository:** Usually `~/.local/share/chezmoi/`; a normal Git
  checkout of `https://github.com/notuntoward/kilo-dotfiles.git`. This is the
  authoritative version you edit and commit.
- **Installed copy:** `~/.config/kilo/AGENTS.md`; on Windows, normally
  `C:\Users\<user>\.config\kilo\AGENTS.md`. This is the file Kilo reads when a
  new session starts.

The normal pattern is:

1. Edit the source repository in VS Code or Emacs.
2. Save the edit.
3. Run `chezmoi apply` in a terminal.
4. Start a new Kilo session.
5. Commit and push the source-repository change.

## Change a global Kilo rule

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
- `chezmoi apply` copies the source file to the installed location Kilo reads.
- `chezmoi diff` should produce no output when the installed copy matches the
  source state.

### Start a new Kilo session

Kilo loads global rules when a session starts. Start a new Kilo session after
running `chezmoi apply`; an already running session continues using the rules it
loaded when it began.

### Commit and push

Still in the source repository:

```sh
git add dot_config/kilo/AGENTS.md
git commit -m "Update global Kilo rules"
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

## Verify Kilo's loaded rules

Inside a Kilo session, ask:

```text
Show me the exact set of agent rules you loaded.
```

Use this after a new-machine setup or an AGENTS.md update. The response should
include:

```text
~/.config/kilo/AGENTS.md
```

On Windows, it should include the equivalent path under your user profile.

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

1. Confirm you edited the source file:
   `dot_config/kilo/AGENTS.md`.
2. Run:

   ```sh
   chezmoi apply
   chezmoi diff
   ```

3. Start a new Kilo session.
4. Ask Kilo:

   ```text
   Show me the exact set of agent rules you loaded.
   ```

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
