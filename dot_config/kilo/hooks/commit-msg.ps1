# Enforce commit message structure and content rules from ~/.config/kilo/AGENTS.md.
param(
    [string]$CommitMsgFile = $args[0]
)

if (-not $CommitMsgFile -or -not (Test-Path -LiteralPath $CommitMsgFile)) {
    exit 0
}

$rawLines = Get-Content -LiteralPath $CommitMsgFile -Encoding UTF8
$lines = @($rawLines | Where-Object { $_ -notmatch '^\s*#' } | ForEach-Object { $_ -replace '\r$', '' })

while ($lines.Count -gt 0 -and $lines[0].Trim() -eq '') {
    $lines = @($lines[1..($lines.Count - 1)])
}
while ($lines.Count -gt 0 -and $lines[$lines.Count - 1].Trim() -eq '') {
    if ($lines.Count -eq 1) { $lines = @(); break }
    $lines = @($lines[0..($lines.Count - 2)])
}

if ($lines.Count -eq 0) { exit 0 }

$subject = $lines[0]
if ($subject -match '^Merge (branch|pull request|remote-tracking branch|tag) ' -or $subject -match '^Revert "') {
    exit 0
}

function Reject-Commit([string]$Reason) {
    Write-Host "COMMIT REJECTED: $Reason"
    Write-Host ""
    Write-Host "Required commit message format (use git commit -F, never git commit -m):"
    Write-Host "  Line 1: Imperative subject line (<= 72 chars)"
    Write-Host "  Line 2: Blank line"
    Write-Host "  Line 3: Single-line overview paragraph (1 physical line, no line wraps)"
    Write-Host "  Line 4: Blank line (required when 2+ files or changes are committed)"
    Write-Host "  Line 5+: Bullet list (- item), one physical line per bullet"
    exit 1
}

if ($subject.Length -gt 72) {
    Reject-Commit "Subject line is $($subject.Length) characters (maximum is 72)."
}
if ($lines.Count -lt 3) {
    Reject-Commit "Subject-only commit messages are forbidden. Include a blank line followed by a one-line overview paragraph (and a - bullet list when changing multiple files or items)."
}
if ($lines[1].Trim() -ne '') {
    Reject-Commit "Line 2 must be blank (separate the subject line from the body with one blank line)."
}

$paragraphs = @()
$current = @()
foreach ($line in $lines) {
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

if ($paragraphs.Count -lt 2) {
    Reject-Commit "Commit message must include a body after the subject line."
}

if ($paragraphs[1] -match '^\s*([-*]|\d+[.)])\s') {
    Reject-Commit "Body starts directly with a bullet list. Start the body with a one-line overview paragraph before the blank line and bullet list."
}

$badParagraphs = @()
$bulletCount = 0
for ($i = 0; $i -lt $paragraphs.Count; $i += 1) {
    $p = $paragraphs[$i]
    $pLines = $p -split "`n"
    if ($pLines.Count -le 1) {
        if ($i -ge 2 -and $pLines[0] -match '^\s*[-*]\s') {
            $bulletCount += 1
        }
        continue
    }
    $allListItems = $true
    foreach ($pl in $pLines) {
        if ($pl -notmatch '^\s*[-*]\s|^\s*\d+[.)]\s') {
            $allListItems = $false
            break
        }
    }
    if ($allListItems) {
        $bulletCount += $pLines.Count
        continue
    }
    $badParagraphs += $i + 1
}

if ($badParagraphs.Count -gt 0) {
    $joined = ($badParagraphs -join ", ")
    Reject-Commit "Paragraph(s) $joined are hard-wrapped across multiple lines. Every prose paragraph and every bullet item must sit on a single physical line."
}

$stagedFiles = 0
if ($env:KILO_TEST_STAGED_FILES) {
    $stagedFiles = [int]$env:KILO_TEST_STAGED_FILES
} else {
    try {
        $staged = @(git diff --cached --name-only 2>$null | Where-Object { $_ -ne '' })
        $stagedFiles = $staged.Count
    } catch { $stagedFiles = 0 }
}
if ($stagedFiles -ge 2 -and $bulletCount -lt 2) {
    Reject-Commit "Staged diff touches $stagedFiles files, so the commit body must include a bullet list (at least 2 '- ' bullets) after the overview paragraph."
}

exit 0
