# kilocode-global

One repo, many machines: this holds the global Kilo Code agent rules
loaded from `~/.config/kilo/AGENTS.md`.

## Files tracked

| Source state path                       | Installed at (chezmoi applies to)   |
|----------------------------------------|-------------------------------------|
| `dot_config/kilo/AGENTS.md`             | `~/.config/kilo/AGENTS.md`          |
| `dot_config/kilo/kilo.jsonc` (future)  | `~/.config/kilo/kilo.jsonc`         |

See https://www.chezmoi.io for how `dot_config/...` maps to `~/.config/...`.

## On a new machine

```powershell
# 1. Install chezmoi (one-time per machine)
winget install twpayne.chezmoi --accept-source-agreements

# 2. Bootstrap all managed dotfiles from this repo
chezmoi init <your-clone-url>
chezmoi apply
```

The `AGENTS.md` file is now in place; Kilo picks it up on the next session
start. No further action.

## Editing a rule

Edit `dot_config/kilo/AGENTS.md` in this repo, commit, push. On this machine
only, also run `chezmoi apply` to update the installed file immediately. On
other machines, wait for the next `chezmoi apply` (or pull and apply).

Adding a new dotfile (e.g. `kilo.jsonc` once you have preferences stored):

```powershell
# add the installed file; chezmoi copies it into this repo's dot_config/
chezmoi add ~\.config\kilo\kilo.jsonc
# commit + push
git add --all
git commit -m 'track kilo.jsonc'
git push
```

## Repo rules (loaded into every Kilo session)

- **Commit messages:** no mid-paragraph hard-wraps
- **Pre-built bundles:** verify the bundle matches TypeScript edits before
  asking the user to test (generalized — applies to any repo that ships a
  pre-built artifact the runtime loads)
