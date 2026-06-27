# Obsidian plugin-relink helper
#
# Points your vault's plugin loader at one of your checkouts (main
# or an Agent Manager worktree) by removing the existing symlink/junction
# at <vault>/.obsidian/plugins/<pluginId> and replacing it with a fresh
# Windows junction to the requested source directory.
#
# The plugin id is read from the source path's manifest.json, so the same
# single invocation works for every Obsidian plugin repo.
#
# Install / location
# ------------------
# Distributed via the `kilo-dotfiles` chezmoi repo.  Once applied, this
# file lives at:
#     $env:USERPROFILE\.config\kilo\tools\obsidian-relink.ps1
# All Obsidian-plugin AGENTS.md rules reference it from that path so the
# Kilo agent can call it without knowing the underlying dotfiles layout.
#
# Usage examples
# --------------
#   # From the main checkout — relink the vault back at main
#   cd ~/repos/obsidian-steady-links
#   & "$env:USERPROFILE\.config\kilo\tools\obsidian-relink.ps1"
#
#   # After building inside a worktree — point the vault at the worktree
#   & "$env:USERPROFILE\.config\kilo\tools\obsidian-relink.ps1" `
#       -Source "C:\Users\scott\repos\obsidian-steady-links\.kilo\worktrees\feature-x"
#
#   # Vault can't be auto-discovered — point it explicitly
#   & "$env:USERPROFILE\.config\kilo\tools\obsidian-relink.ps1" `
#       -Vault "$env:USERPROFILE\MyVault"
#
# Notes
# -----
# - The vault must NOT have Obsidian open while the symlink is being
#   swapped.  Obsidian holds a lock on `main.js` via its plugin loader;
#   the delete step below will fail otherwise.  (Typical Kilo workflow
#   assumes the user will "reload the plugin" AFTER this command has
#   succeeded, which implicitly also means closing+reopening if needed.)
# - We use a Windows Junction, not a symbolic link, because a junction
#   is followed reliably by Obsidian's plugin loader and does not require
#   admin / Developer Mode to create.
# - After a successful relink, the user must reload the plugin inside
#   Obsidian to pick up the new `main.js`.  `App` > `Reload plugin` in
#   the community-plugins settings pane, or full Obsidian restart.
# - Running the script twice (with the same -Source) is idempotent: the
#   existing junction is removed and re-created.  No-op if the target is
#   already the requested path.

param(
    # Absolute path to the plugin checkout to link to.
    # When omitted, defaults to the plugin checkout nearest the current
    # working directory (walks up until it finds `manifest.json`).
    [string] $Source,

    # Absolute path to the vault root (the directory that contains
    # <vault>/.obsidian/plugins/).  When omitted, the script tries a
    # small list of common vault-parent locations and, if none match,
    # recurses one level deep under $env:USERPROFILE for the first
    # directory named `$PluginId` whose parent is `.obsidian/plugins`.
    [string] $Vault
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# ─── Resolve source ──────────────────────────────────────────────────
if (-not $Source) {
    $probe = Get-Location
    while ($probe) {
        $candidate = Join-Path -Path $probe -ChildPath manifest.json
        if (Test-Path -LiteralPath $candidate) { break }
        $newParent = Split-Path -LiteralPath $probe -Parent
        if ($newParent -eq $probe) {
            $probe = $null
            break
        }
        $probe = $newParent
    }
    if (-not $probe) {
        Write-Error "Could not find manifest.json in or above '$(Get-Location)'. " +
                    "Pass -Source <path-to-checkout-with-manifest.json>."
        exit 1
    }
    $Source = $probe
} else {
    $Source = Resolve-Path -LiteralPath $Source -ErrorAction Stop
}

$ManifestPath = Join-Path $Source manifest.json
if (-not (Test-Path -LiteralPath $ManifestPath)) {
    Write-Error "'$ManifestPath' not found. Is this a valid Obsidian plugin checkout?"
    exit 1
}
$manifest = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$PluginId = $manifest.id
if (-not $PluginId) {
    Write-Error "'$ManifestPath' has no 'id' field."
    exit 1
}

$BundlePath = Join-Path $Source main.js
if (-not (Test-Path -LiteralPath $BundlePath)) {
    Write-Error "main.js missing at '$BundlePath'. Run 'npm run build' in the checkout first."
    exit 1
}

# ─── Resolve vault ───────────────────────────────────────────────────
# Walk an ordered list of candidate vault parents; return the first path
# that contains `<parent>/.obsidian/plugins/<PluginId>`.
function Find-VaultByCandidates {
    param([string[]] $Parents, [string] $PluginId)
    foreach ($parent in $Parents) {
        if (-not $parent) { continue }
        try    { $parent = Resolve-Path -LiteralPath $parent -ErrorAction Stop }
        catch  { continue }
        $linkPath = Join-Path -Path $parent -ChildPath ".obsidian\plugins\$PluginId"
        if (Test-Path -LiteralPath $linkPath) { return $parent }
    }
    return $null
}

# Ordered defaults — most likely first.  Expand $env:USERPROFILE to avoid
# PowerShell's "~" literal.
$UserHome = $env:USERPROFILE
$candidates = @(
    "$UserHome\Obsidian Vault",
    "$UserHome\ObsidianVault",
    "$UserHome\Obsidian",
    "$UserHome\OneDrive\Obsidian Vault",
    "$UserHome\OneDrive\ObsidianVault",
    "$UserHome\OneDrive\Documents\Obsidian Vault",
    "$UserHome\OneDrive\Documents\ObsidianVault",
    "$UserHome\Documents\Obsidian Vault",
    "$UserHome\Documents\ObsidianVault"
)

if (-not $Vault) {
    $Vault = Find-VaultByCandidates -Parents $candidates -PluginId $PluginId
} else {
    # explicit: ensure it is a real vault
    $linkPath = Join-Path -Path (Resolve-Path -LiteralPath $Vault) `
                          -ChildPath ".obsidian\plugins\$PluginId"
    if (-not (Test-Path -LiteralPath $linkPath)) {
        Write-Error ("'$Vault' does not contain '.obsidian/plugins/$PluginId'. " +
                     "Check the vault path or omit -Vault to auto-discover.")
        exit 1
    }
}

if (-not $Vault) {
    # Auto-discovery fallback: walk one level deep under $home looking
    # for any `*/.obsidian/plugins/<PluginId>` directory or link.
    $hits = Get-ChildItem -LiteralPath $UserHome -Directory -ErrorAction SilentlyContinue |
        ForEach-Object {
            $linkPath = Join-Path -Path $_.FullName -ChildPath ".obsidian\plugins\$PluginId"
            if (Test-Path -LiteralPath $linkPath) { $_.FullName }
        } | Select-Object -First 2

    if (@($hits).Count -eq 1) {
        $Vault = $hits[0]
    } elseif (@($hits).Count -gt 1) {
        Write-Error ("Found $PluginId in multiple vaults:`n" +
                     ($hits | ForEach-Object { "  $_`n" }) +
                     "  Pass -Vault <path> to choose one.")
        exit 1
    } else {
        Write-Error ("Could not find '.obsidian/plugins/$PluginId' under any vault under $home. " +
                     "Pass -Vault <vault-root-path>.")
        exit 1
    }
}

# Resolve again after fallback assignment
$Vault = Resolve-Path -LiteralPath $Vault
$PluginLoaderPath = Join-Path $Vault ".obsidian\plugins\$PluginId"

# ─── Relink ──────────────────────────────────────────────────────────
$Source = Resolve-Path -LiteralPath $Source

# Idempotency: if already a junction pointing at the requested location,
# exit.  Use OrdinalIgnoreCase equality, not -like — the worktree path
# contains the main-checkout path as a prefix, so a wildcard check would
# false-positive and leave the junction stuck on the main checkout while
# a worktree build is requested.
if ((Test-Path -LiteralPath $PluginLoaderPath) -and
    (Get-Item -LiteralPath $PluginLoaderPath -Force).LinkType -eq 'Junction') {
    $existingTarget = (Get-Item -LiteralPath $PluginLoaderPath -Force).Target[0]
    $samePath = [string]::Equals(
        $existingTarget.TrimEnd('\'),
        $Source.TrimEnd('\'),
        [System.StringComparison]::OrdinalIgnoreCase)
    if ($samePath) {
        Write-Output "$PluginId already linked to '$Source'. Nothing to do."
        exit 0
    }
}

# Remove old link if present.  Junction deletion on Windows requires the
# path to NOT end with a slash, and it must be done with Remove-Item -Force.
# Remove old link if present.  Junction deletion on Windows requires `rd`
# from cmd.exe — PowerShell's `Remove-Item` prompts because it cannot
# always tell a junction from a regular directory, and prompting fails in
# NonInteractive (agent) sessions.
# Remove old link if present.  We call `rd <path>` (NOT `rd /s /q`)
# because `/s` recurses INTO junctions and would DELETE the contents of
# the target directory (the actual plugin checkout).  `rd <path>` on a
# junction removes only the junction entry itself, leaving the target
# filesystem tree intact.
if (Test-Path -LiteralPath $PluginLoaderPath) {
    $removeResult = & cmd.exe /c rd "`"$PluginLoaderPath`"" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error ("Failed to remove '$PluginLoaderPath'. Is Obsidian running " +
                     "and locking it? Close Obsidian and try again.`n$removeResult")
        exit 1
    }
}# Create junction (not symlink — junctions don't require Developer Mode
# and are fully transparent to Obsidian's plugin loader on Windows).
try {
    New-Item -ItemType Junction -Path $PluginLoaderPath -Target $Source `
        | Out-Null
} catch {
    Write-Error "Failed to create junction at '$PluginLoaderPath'."
    Write-Error $_
    exit 1
}

Write-Output "OK: $PluginId"
Write-Output "  Vault    : $Vault"
Write-Output "  Link     : $PluginLoaderPath"
Write-Output "  Points to: $Source"
Write-Output "  Bundle   : $BundlePath"
Write-Output ""
Write-Output "Reload '$PluginId' in Obsidian to pick up the new main.js."
