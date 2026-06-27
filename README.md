# Kilo agent rules: where things live and how they are managed

This repo holds the **global rules** that every Kilo session loads, plus a
thin bit of documentation so future-you (or a new machine) can set it up
again without guessing.

Everything lives in one source-of-truth location, tracked by chezmoi,
which keeps `~/.config/kilo/AGENTS.md` in sync with this repo on every
machine that runs `chezmoi apply`.

---

## 1. The four places Kilo reads rules from

Kilo merges rules from several layers, lower-precedence first:

| # | Layer | Path | What it does | Managed here? |
|---|---|---|---|---|
| 1 | **Global rules** | `~/.config/kilo/AGENTS.md` | Loaded in **every** session, across every project | **Yes** — this repo |
| 2 | Project rules | `<repo>/AGENTS.md` | Loaded only when Kilo opens that repo | No — each repo's own git |
| 3 | Subdirectory rules | `<repo>/src/AGENTS.md` etc. | Loaded only under that subpath | No — each repo's own git |
| 4 | `kilo.json` `instructions` | any path referenced there | Extra rule files loaded wherever you point | Optional, not used yet |

Precedence: **a later layer always wins over an earlier one**. So a
`<repo>/AGENTS.md` can override a global rule if you ever need to, but in
practice there is no reason to — the global rules are universal enough to
apply cleanly everywhere.

### What the global rules currently say

1. Commit messages must not have hard-wraps within paragraphs.
2. For projects that ship a pre-built runtime bundle (Obsidian plugins,
   browser extensions, VS Code extensions, compiled binaries), Kilo must
   rebuild and grep-verify the bundle after every source change.

Rule 1 applies to every repo (Python data science, notes, everything).
Rule 2 applies to any repo that ships a pre-built bundle; in repos that
don't, the rule simply never fires (no harm).

---

## 2. The files in this repo

```
.
├── .gitignore                  # keep OS junk out of the repo
├── README.md                   # the file you are reading
└── dot_config/
    └── kilo/
        └── AGENTS.md           # the global rules file
```

chezmoi maps paths under `dot_config/` to `~/.config/` (and similar).
When you run `chezmoi apply`, every file under `dot_config/` is written
to its matching installed location. That is the **only** thing chezmoi
does — it is a dumb synchronizer with git tracking attached.

Do **not** create files at `~/.config/kilo/...` by hand and wonder why
they disappear. Always edit the version inside this repo (or run
`chezmoi edit ~/.config/kilo/AGENTS.md`, which opens the installed copy
and, on save, copies the updated contents back into this repo).

### Why not keep global rules in `~/.config/kilo/AGENTS.md` directly?

Nothing stops Kilo from reading the file as it is — and it does. But
without chezmoi, the file is a lone copy on one machine, with no history,
no push-to-GitHub, no easy bootstrap on new machines. chezmoi gives you
all of that for free with a two-command bootstrap sequence.

---

## 3. Day-to-day operations

### Editing a global rule

```powershell
# Option A — edit the installed copy straight (chezmoi watches nothing,
# so it does not auto-pick up this change; you must commit manually)
notepad "$env:USERPROFILE\.config\kilo\AGENTS.md"

# Option B — chezmoi's convenience wrapper: opens the installed copy,
# waits for you to save, and on close copies it back into the source repo.
chezmoi edit "$env:USERPROFILE\.config\kilo\AGENTS.md"
```

Either way, after editing, commit and push the source repo:

```powershell
chezmoi cd           # opens a subshell inside the source repo
git add dot_config/kilo/AGENTS.md
git commit -m "global rules: <short reason>"
git push
exit
```

On other machines, a manual `chezmoi apply` (or `chezmoi update` on the
source repo) pulls the change and rewrites the installed file.

### Adding a new global dotfile (e.g. `kilo.jsonc` once you store prefs there)

```powershell
chezmoi add "$env:USERPROFILE\.config\kilo\kilo.jsonc"
# chezmoi copies the file into dot_config/kilo/
chezmoi cd
git add dot_config/kilo/kilo.jsonc
git commit -m "track kilo.jsonc"
git push
```

On a future machine, `chezmoi apply` will write `kilo.jsonc` into
`~/.config/kilo/` automatically.

### Asking Kilo what rules it loaded

Inside any Kilo session, paste:

```
show me the exact set of agent rules you loaded
```

Kilo will list every `AGENTS.md` it sees and the contents of each. Use
this to verify a new machine is bootstrapped correctly.

---

## 4. Creating a new repo

**You probably do not need to do anything.** The global rules load in
every project automatically. A new repo's first Kilo session will already
see the commit-message and bundle-verify rules.

Add a **project-level `<repo>/AGENTS.md`** only when the new repo has
something genuinely repo-specific to communicate to Kilo — for example:

- An Obsidian plugin with a known-frogile cursor-correction ordering
- A Python project that uses Poetry + Black + a specific test runner
- A repo with an unusual build command or deployment flow

When you do add a project-level `AGENTS.md`, put it at the repo root.
Kilo walks up from the edited file to find the nearest one. Subdirectory
rules (`<repo>/src/AGENTS.md`) apply only under that subpath and are not
commonly needed.

### Recommended project `AGENTS.md` shape

```markdown
# Agent Instructions for <repo-name>

## Critical: <one-line description of the fragile thing>
Explain the bug pattern, the root cause, how to verify (point at
the exact test suite), and an explicit "What NOT to do" list.

## Build & test
List the commands the agent must run to verify its work:
- `npm run build && npm run test:run`
- `poetry run pytest`
- whatever the repo uses

## Conventions worth repeating
Anything local that Kilo's general-purpose instructions might miss.
```

The two `obsidian-*-links` repos each have roughly this shape.

---

## 5. Reinstalling Kilo / setting up a new computer

**No prerequisites.** `chezmoi apply` creates every parent directory
(`~/.config/`, `~/.config/kilo/`, etc.) automatically, so nothing needs
to exist beforehand. Order also does not strictly matter: running
chezmoi before or after Kilo is installed produces the same result,
because each step creates directories idempotently and neither side
clobbers the other (`kilo.jsonc` lives next to `AGENTS.md` on disk but
is a different file).

The recommended sequence matches the natural order of setting up a
fresh machine:

```powershell
# 1. Install VS Code, then the Kilo Code extension from the Marketplace.
#    Opening Kilo once creates ~/.config/kilo/ with a default kilo.jsonc.
#    (If you skip this, chezmoi below will create the directory for you.)

# 2. Install chezmoi (one-time per machine)
winget install twpayne.chezmoi --accept-source-agreements

# If winget does not update PATH in the current shell, start a new
# PowerShell before continuing.

# 3. Bootstrap all managed dotfiles from this repo
chezmoi init https://github.com/notuntoward/kilo-dotfiles.git
chezmoi apply

# 4. Verify
chezmoi status        # empty output == installed == source, no diff
chezmoi diff          # also empty on a clean setup

# 5. Restart Kilo. The global rules load on next session start.
```

That is everything. Do not also copy Kilo's config directories from the
old machine — `chezmoi init` pulls only what this repo tracks. Anything
else in `~/.config/kilo/` (like `kilo.jsonc` with default settings) is
not managed by this repo and can sit alongside the tracked file without
conflict.

**A subtle point about ordering.** If you run `chezmoi apply` before
Kilo has ever launched, it will cleanly create `~/.config/kilo/` and
drop `AGENTS.md` in place. When you later install Kilo and open your
first session, Kilo sees the file and loads it; it does not overwrite
it. Conversely, if you let Kilo land first and then run `chezmoi apply`,
Kilo's existing `kilo.jsonc` is ignored by chezmoi and left alone. The
only thing to track manually if you care about it is `kilo.jsonc` — see
Section 3 ("Adding a new global dotfile") if you want to do that.

---

## 6. Troubleshooting

**Q: A change I made in Kilo is not taking effect.**
Check `chezmoi status`. If the installed file (`~/.config/kilo/AGENTS.md`)
does not match the source state, run `chezmoi apply`. Kilo reloads the
rules at session start; opening a new session picks up the new version.

**Q: Kilo's session still doesn't see the rule.**
Ask Kilo directly: `show me the exact set of agent rules you loaded`. If
the list does not include `~/.config/kilo/AGENTS.md`, the filename is
wrong or in the wrong directory. Kilo is exact about the path:
`~/.config/kilo/AGENTS.md` (Windows: `C:\Users\<user>\.config\kilo\AGENTS.md`).

**Q: `chezmoi apply` overwrote a change I wanted to keep outside this repo.**
chezmoi is authoritative: any untracked edit to an installed file gets
clobbered on `apply`. Edit only the copy inside the source repo (or use
`chezmoi edit`, which handles the round-trip).

**Q: I added `$HOME/.config/kilo/other-file` by hand and want it tracked.**
See Section 3, "Adding a new global dotfile." `chezmoi add` is a one-liner.
