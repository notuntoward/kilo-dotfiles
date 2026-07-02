# Reject commit messages whose body paragraphs are hard-wrapped (contain
# internal newlines mid-paragraph).  This enforces the AGENTS.md rule:
# each paragraph must sit on a single line.
#
# Install once per machine (pick the right syntax for your platform):
#   Windows:  git config --global core.hooksPath "$env:USERPROFILE\.config\kilo\hooks"
#   macOS / Linux:  git config --global core.hooksPath "$HOME/.config/kilo/hooks"
#
# Then every 'git commit' in every repo is checked by this script.

param(
    [string]$CommitMsgFile = $args[0]
)

if (-not $CommitMsgFile -or -not (Test-Path -LiteralPath $CommitMsgFile)) {
    exit 0  # no commit message to check (e.g. --amend with no editor)
}

$lines = Get-Content -LiteralPath $CommitMsgFile

# Strip comment lines (lines starting with '#') — these are editor hints,
# not part of the actual commit message.
$messageLines = $lines | Where-Object { $_ -notmatch '^\s*#' }

# Split into paragraphs: a paragraph is a contiguous block of non-empty
# lines, separated by one or more blank lines.
$paragraphs = @()
$current = @()
foreach ($line in $messageLines) {
    if ($line.Trim() -eq '') {
        if ($current.Count -gt 0) {
            $paragraphs += ,($current -join "`n")
            $current = @()
        }
    } else {
        $current += $line
    }
}
if ($current.Count -gt 0) {
    $paragraphs += ,($current -join "`n")
}

$badParagraphs = @()
for ($i = 0; $i -lt $paragraphs.Count; $i += 1) {
    $p = $paragraphs[$i]
    # A paragraph that spans more than one line is hard-wrapped.
    # Exception: lines starting with "-", "*", or "1." are list items
    # (one line each is fine); a paragraph consisting entirely of list
    # items is not hard-wrapped.
    $pLines = $p -split "`n"
    if ($pLines.Count -le 1) { continue }

    # Check if every line in this paragraph is a list item.
    $allListItems = $true
    foreach ($pl in $pLines) {
        if ($pl -notmatch '^\s*[-*]\s|^\s*\d+[.)]\s') {
            $allListItems = $false
            break
        }
    }
    if ($allListItems) { continue }

    $badParagraphs += $i + 1
}

if ($badParagraphs.Count -gt 0) {
    $label = if ($badParagraphs.Count -eq 1) { "paragraph" } else { "paragraphs" }
    $joined = ($badParagraphs -join ", ")
    Write-Host "COMMIT REJECTED: $label $joined are hard-wrapped across multiple lines."
    Write-Host ""
    Write-Host "Each paragraph in a commit message must sit on a single line."
    Write-Host "Do not insert newlines mid-sentence.  Use blank lines between"
    Write-Host "paragraphs as usual.  If a paragraph is long, split it into"
    Write-Host "two paragraphs instead of wrapping one."
    Write-Host ""
    Write-Host "See ~/.config/kilo/AGENTS.md for the full rule."
    exit 1
}

exit 0