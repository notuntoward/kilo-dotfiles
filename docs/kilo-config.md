# Kilo shell and permission configuration

This document records the machine-level Kilo configuration that the global
rules depend on. It is not installed by chezmoi; it describes how to reproduce
the setup on a new machine.

## File

`~/.config/kilo/kilo.jsonc` (Windows:
`C:\Users\<user>\.config\kilo\kilo.jsonc`).

The file is deliberately unmanaged because it contains machine-specific
`external_directory` paths. The portable rules live in
`dot_config/kilo/AGENTS.md`.

## What changed

The global rules require Git Bash and forbid PowerShell. Two settings make that
enforceable instead of advisory:

1. The top-level `shell` setting points Kilo's bash tool at Git Bash.
2. The `permission.bash` allowlist no longer allows PowerShell cmdlets, and
   explicit `deny` rules block them.

Before this change the file allowed `powershell *`, `? *`, `find *`, and about
50 PowerShell cmdlets, so a disk-wide `find` was auto-approved.

## Minimal configuration

Merge this into `kilo.jsonc`. Keep the safe `allow` entries you already use.

```jsonc
{
  "$schema": "https://app.kilo.ai/config.json",
  "shell": "C:\\Program Files\\Git\\bin\\bash.exe",
  "permission": {
    "bash": {
      "powershell *": "deny",
      "pwsh *": "deny",
      "*.ps1": "deny",
      "Get-*": "deny",
      "Set-*": "deny",
      "Out-*": "deny",
      "New-*": "deny",
      "Remove-*": "deny",
      "Copy-Item *": "deny",
      "Move-Item *": "deny",
      "Rename-Item *": "deny",
      "Test-Path *": "deny",
      "Select-*": "deny",
      "Where-Object *": "deny",
      "ForEach-Object *": "deny",
      "Write-*": "deny",
      "Format-*": "deny",
      "Resolve-Path *": "deny",
      "Join-Path *": "deny",
      "Split-Path *": "deny",
      "Measure-*": "deny",
      "Invoke-*": "deny",
      "Add-Type *": "deny",
      "ConvertFrom-Json *": "deny",
      "ConvertTo-Json *": "deny",
      "Start-Process *": "deny",
      "Stop-Process *": "deny",
      "Start-Sleep *": "deny",
      "tasklist *": "deny",
      "findstr *": "deny",
      "fsutil *": "deny",
      "dir *": "deny"
    }
  }
}
```

## Entries to remove

Keep your existing safe `allow` entries for `git`, `npm`, `node`, `npx`,
`python`, `uv`, `rg`, `grep`, `ls`, `cat`, `sed`, `head`, `tail`, `wc`,
`chezmoi`, `gh`, `where.exe`, `wsl.exe`, and the Git Bash launcher.

Remove every PowerShell cmdlet entry and these broad or accidental entries:

`? *`, `find *`, `f *`, `from *`, `then *`, `else *`, `fi *`, `done *`,
`e= *`, `Rep *`, `short *`, `print *`, `const *`, `console.log *`,
`JSON.stringify *`, `charCodeAt *`, `loadConfigFromFile *`, `node.get *`,
`scannedPages: *`, `ItemMatchSpan\ *`, `file-open *`, `Switching *`,
`advance\ *`, `"kind" *`, `"community" *`, `"args":"after-used" *`,
`"backward"\ *`, `direction: *`, `.60.1 *`, `.70.0 *`, `enabled? *`,
`2>/dev/null *`, `% *`, `Extract *`, `Repl *`, `Out-String *`, `Out-Null *`,
`Format-Hex *`, `Format-Table *`, `Format-List *`, `Get-*`, `Set-*`, `New-*`,
`Remove-*`, `Copy-Item *`, `Move-Item *`, `Test-Path *`, `Select-*`,
`Where-Object *`, `ForEach-Object *`, `Write-*`, `Measure-*`, `Start-*`,
`Stop-*`, `Invoke-*`, `Resolve-Path *`, `Join-Path *`, `Split-Path *`,
`ConvertFrom-Json *`, `ConvertTo-Json *`, `Add-Type *`, `Set-Variable *`,
`Get-Item *`, `Get-Property *`, `New-Object *`, `Normalize-LF *`,
`powershell *`, `pwsh *`, `tasklist *`, `findstr *`, `fsutil *`, `dir *`,
`.github\workflows *`, and `*.ps1`.

## Verify

Run `kilo config check` if the installed Kilo provides it.

Start a new Kilo session and run:

```sh
printf 'shell=%s\n' "$BASH_VERSION"
```

It must print a bash version. If it prints nothing, the `shell` setting did not
load: confirm the path exists and restart Kilo.

Then confirm a PowerShell command is denied:

```sh
powershell -Command "Get-Location"
```

The tool must refuse it. Do not bypass the deny rule.

## New machine checklist

1. Install Git for Windows and Kilo.
2. Create `~/.config/kilo/kilo.jsonc` with the snippet above, or merge the
   `shell` and deny rules into an existing file.
3. Add the safe `allow` entries you use.
4. Start a new session and run the two verification commands.
5. Run `chezmoi apply` from the kilo-dotfiles checkout so the global rules are
   installed.
