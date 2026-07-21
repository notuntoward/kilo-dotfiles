# Global agent rules

These rules apply to every Kilo session. Project-level `AGENTS.md` files are
loaded after this file and may supplement or override these rules.

## Rule: Conditional rules

A rule that names a technology, artifact, tool, package manager, or workflow
applies only after verifying that the current repository uses it.

When a rule does not apply, skip it silently. Do not install tools, create
configuration, or change project structure merely to satisfy an inapplicable
rule.

## Rule: Updating these global rules

This file is managed by the `notuntoward/kilo-dotfiles` repository through
chezmoi. When the user asks to add, remove, or revise a global rule, explain
that the canonical source and user instructions are in that repository's
`README.md`:

https://github.com/notuntoward/kilo-dotfiles

Do not edit the installed `~/.config/kilo/AGENTS.md` directly unless the user
explicitly requests a temporary local change. For a persistent change, edit the
tracked source file, apply it with chezmoi, commit it, and push it.

Do not run chezmoi commands, modify global Git configuration, commit, or push
this dotfiles repository unless the user explicitly asks.

## Rule: Resolve uncertainty; do not loop

Do not repeatedly speculate about a technical cause, solution, user intent, or
preference without taking action that could resolve the uncertainty.

When an important question blocks progress:

1. State the specific question or competing hypotheses internally and identify
   the cheapest reliable way to distinguish them.
2. Prefer existing automated tests, targeted unit tests, type checks, static
   inspection, repository search, documentation, or a minimal reproducible
   check over reasoning from assumptions.
3. If an existing test can answer the question, run it. If no suitable test
   exists, add a small, focused temporary or permanent test when that is
   proportionate to the change and supported by the project.
4. Use logging or other runtime instrumentation only when automated checks,
   static inspection, and existing tests cannot answer the question reliably.
5. Remove temporary diagnostic code before completion unless the user asks to
   retain it or it provides durable, low-noise observability.
6. If the answer requires an action only the user can perform, ask one focused
   question or request one specific diagnostic result. State exactly what the
   user should do, what output to provide, and how it will decide the next
   step.

Do not continue a back-and-forth of “maybe,” “wait,” “but,” or equivalent
speculation after a practical discriminating check or focused user question has
been identified.

When the uncertainty is about the user's desired behavior rather than a
technical fact, do not implement a guess after reasonable repository inspection
fails to resolve it. Ask the user the single question most likely to unblock the
decision.

## Rule: Prevent duplication and unnecessary churn

Before writing new logic, always check two layers in order:

1. **Platform and ecosystem libraries first** — prefer built-in APIs and
   well-established library methods over custom implementations. For example:
   use Obsidian's utility APIs and CodeMirror 6 (CM6) primitives when working
   in a plugin environment; use pandas, NumPy, or scikit-learn methods when
   doing data analysis in Python; use standard library modules before reaching
   for third-party packages.

2. **This repository second** — search for existing equivalent or closely
   related code before adding logic, a helper, or a utility.

- Reuse or extend existing code when it is a clean fit.
- Extract identical complex logic used in multiple locations into a cohesive,
  nearby shared helper.
- Keep trivial one- or two-line logic inline when an abstraction would add
  unnecessary complexity.
- If a broad refactor would touch many unrelated files, prefer a targeted
  local helper that limits the blast radius.
- Do not add a third copy of existing logic; when practical, consolidate
  existing duplicates as part of the change.

Before writing code, confirm that the same behavior doesn't already exist in
the platform libraries or this codebase, and that a later change won't require
maintaining multiple copies.

## Rule: Git commit messages

Before generating or creating a commit message, verify this rule again.

### Hook integrity is mandatory

Never use `--no-verify`, `--no-verify=true`, an environment-variable bypass,
a direct hook-invocation bypass, or any other mechanism that skips Git hooks.

A hook rejection is a validation failure, not permission to bypass validation.
Fix the commit message or ask the user for guidance. Do not use a bypass even
if the user previously mentioned a failed hook, a time constraint, or a desire
to commit quickly.

Before every `git commit`, inspect the command itself and confirm that it does
not contain `--no-verify` or another hook-bypass mechanism.

### Newlines and structure

Commit messages have two kinds of newlines, and they are unrelated to file
line-ending encoding (CRLF vs LF). CRLF/LF is about how *tracked files* store
line breaks on disk; it has nothing to do with how a commit *message* is
structured. Do not use CRLF/LF cleanup as a reason to add or remove newlines
inside a commit message.

- **Structural newlines are required.** Use them for the blank line after the
  subject, paragraph boundaries, and the beginning of every bullet item.
- **Typographic hard-wrap newlines are forbidden.** Do not insert a newline
  merely to keep a paragraph or bullet within a screen-width limit. A long
  paragraph or bullet is one physical line no matter how wide it looks;
  whatever terminal or viewer displays it wraps it visually on its own.

Never solve a hard-wrap-hook failure by collapsing multiple bullets, paragraphs,
or distinct changes into one prose paragraph. Preserve the logical structure of
the message and remove only prohibited line breaks within individual paragraphs
or individual bullet items.

### Minimal example of correct structure

```text
Fix login redirect looping on expired sessions

Expired-session requests were redirected back to the same protected page instead of the login page, which caused an infinite redirect loop.

- Redirect to /login when the session check fails
- Add a regression test for the expired-session redirect path
```

Each of the three body elements above (the overview paragraph and each bullet)
is one single physical line in the real file, however long, with terminal
wrapping doing the rest. This is the shape to match even when a model finds it
hard to keep a long line from being broken up.

### Required structure

1. Use an imperative subject line of 72 characters or fewer.
2. Follow the subject with exactly one blank line.
3. Use a concise one-line overview paragraph when it adds useful context,
   written from the user's point of view: state what changed for the user,
   with a hint of how the change was accomplished.
4. When a commit contains two or more independent material changes, the body
   must contain a bullet list with one bullet for each material change.
5. Put each bullet on its own physical line, beginning with `- `.
6. Each prose paragraph and each bullet item must occupy exactly one physical
   line in the literal Git message payload.
7. Separate an overview paragraph from a bullet list with exactly one blank
   line.
8. Do not replace a required bullet list with a single long summary paragraph.
9. Do not merge bullets, omit bullets, or combine distinct changes merely to
   shorten the message or avoid a hard-wrap failure.
10. Visual terminal wrapping is not a newline. Only actual newline characters
    in the submitted message count as lines.

### Required body patterns

Use a one-paragraph body only when there is one cohesive change:

```text
Improve global Kilo rule documentation

Clarify how chezmoi-managed global rules are edited, applied, and verified.
```

Use an overview plus bullets when the commit contains multiple distinct changes:

```text
Improve global Kilo rules and documentation

Clarify the global-rule workflow and make technology-specific instructions conditional.

- Reorganize AGENTS.md around conditional rules and completion checks
- Add uncertainty-resolution guidance that favors decisive tests over speculation
- Document Obsidian runtime diagnostics and runtime-artifact verification
- Rewrite README.md with editor-first chezmoi, setup, and troubleshooting instructions
```

The bullets are separate structural elements. They must remain separate lines
even if the hook rejects another paragraph for hard wrapping.

### Mandatory pre-commit message preflight

Before running `git commit`, inspect the exact message text that will be passed
to Git. Do not infer correctness from an outline, summary, or visually wrapped
terminal display.

For every prose paragraph in the body:

- It must occupy exactly one physical line in the Git message payload.
- If it is too long, shorten it or split it into two separate paragraphs with a
  blank line between them.
- Never press Enter inside a prose paragraph.
- Never rely on terminal visual wrapping as an actual newline check.

For every bullet item:

- It must start on its own physical line with `- `.
- It must occupy exactly one physical line in the Git message payload.
- Do not merge separate bullet items to avoid a hard-wrap rejection.

Before committing, verify this exact structure:

- One subject line.
- One blank line after the subject.
- Zero or more one-line prose paragraphs, separated by blank lines.
- Zero or more one-line bullets, each on its own line.
- No other newlines.
- No hook-bypass option or mechanism.

### Commit command construction

When the message contains a bullet list, multiple body paragraphs, or any
intentional structural newline, create a temporary commit-message file and use
`git commit -F <file>`.

Do not use a single multiline `git commit -m "..."` argument for a structured
message. Do not collapse a required bullet list into one `-m` paragraph.

Before committing, print or inspect the message file line by line. Confirm:

- The subject is one line.
- The next line is blank.
- Every prose paragraph is one physical line.
- Every bullet starts with `- ` and occupies one physical line.
- Blank lines are the only non-bullet structural lines after the subject.
- The commit command does not include `--no-verify`.

After a successful commit, delete the temporary message file.

### Required shell pattern for structured messages

Use whichever shell is actually available and driving the session — do not
force PowerShell on a bash/zsh session or vice versa. Both patterns produce
the same result: a temporary message file passed to `git commit -F`.

PowerShell:

```powershell
$messageFile = ".git\kilo-commit-message.txt"
@'
Subject line in imperative mood

One-line overview paragraph, if useful.

- One material change per bullet, on one physical line
- Another material change, on one physical line
'@ | Set-Content -NoNewline $messageFile

Get-Content $messageFile
git commit -F $messageFile
Remove-Item $messageFile
```

bash/zsh:

```bash
messageFile=".git/kilo-commit-message.txt"
cat > "$messageFile" <<'EOF'
Subject line in imperative mood

One-line overview paragraph, if useful.

- One material change per bullet, on one physical line
- Another material change, on one physical line
EOF

cat "$messageFile"
git commit -F "$messageFile"
rm "$messageFile"
```

The quoted heredoc delimiter (`<<'EOF'`, not `<<EOF`) matters: it prevents the
shell from expanding `$variables`, backticks, or other content inside the
commit message body.

`Set-Content -NoNewline` (PowerShell) and a plain heredoc (bash/zsh) both avoid
adding a stray trailing newline; neither changes how many newlines are inside
the message body itself. Whether those inner newlines are LF or CRLF does not
matter for commit-message structure — Git accepts either. Do not add or remove
a newline in this file to "fix" a CRLF/LF warning; that warning is about
tracked source files, never about a commit-message file.

Do not add `--no-verify`. Do not use `git commit -m` for a structured message
when this pattern applies.

### Hook rejection procedure

If the commit hook identifies specific hard-wrapped paragraphs:

1. Identify whether each named item is a prose paragraph or one bullet item.
2. Rewrite only that named item as one physical line.
3. Keep blank lines, paragraph boundaries, and separate bullets unchanged.
4. Inspect the message file again before recommitting.
5. Re-run `git commit -F <message-file>` without a hook bypass.
6. Do not rewrite code because the commit-message hook rejected formatting.

## Rule: Windows command-line safety

Apply this rule only when the workspace runs on Windows.

Unix-style tools such as `sed`, `awk`, and `grep` may be available, but use
Windows-safe quoting and editing practices.

- Prefer double quotes for arguments passed to external Unix-style executables.
- Do not assume Bash single-quote behavior works in PowerShell or CMD.
- If a `sed -i` edit fails or risks an empty file, use an output-redirection
  approach or PowerShell's in-memory replacement instead.
- When embedding literal double quotes inside a double-quoted PowerShell string,
  escape them as `""`.
- Inspect the edited file after a destructive or in-place transformation.

Example:

```powershell
sed -i "s/foo/bar/g" file.txt
(Get-Content file.txt) -replace 'foo', 'bar' | Set-Content file.txt
sed -i "s/""foo""/""bar""/g" file.txt
```

## Rule: Git line endings

Honor `.gitattributes`, `.editorconfig`, and the repository's established
line-ending policy before changing Git configuration.

### Determine the policy before normalizing anything

Before normalizing any file's line endings, determine the repository's
established policy first — do not assume LF and do not run a normalization
command blindly. Re-run this check whenever it is unclear, not just once per
session:

1. Check `git config --get core.autocrlf` (local, then global), and inspect
   `.gitattributes` and `.editorconfig` for an explicit line-ending policy.
2. If none of those specify a policy, infer it from how the repository's
   existing tracked files are actually stored on disk.
3. If the result is LF (existing files, `.editorconfig`, or `.gitattributes`
   use LF, or `core.autocrlf=input`), this is an **LF-policy repository**.
4. If the result is CRLF (existing files are committed with CRLF, or
   `core.autocrlf=true`), this is a **CRLF-policy repository** — typically a
   Windows-oriented project.

The first time a repository is touched in a session, before the first `git
add` or commit, set this policy explicitly if it is not already configured:

- For an LF-policy repository, set `core.autocrlf=input` locally (on Windows
  and macOS/Linux alike) so Git never rewrites line endings on commit, only on
  checkout from the index.
- For a CRLF-policy repository, set `core.autocrlf=true` so checkout
  normalizes to CRLF on Windows but commits use CRLF.
- Use `git config --local`, never `--global`, so this only affects the
  repository being worked in. Do not touch the user's global Git config or
  override their preferred cross-platform line-ending policy.
- Re-normalize any files Git would otherwise rewrite with
  `git add --renormalize .` (or `git rm --cached` plus `git add` on older Git
  versions), staged as a separate, clearly labeled commit if it would
  otherwise pollute the user's diff.

### Normalizing edited files

Kilo's file tools may write CRLF on Windows regardless of the repository's
policy. Only normalize a file to LF when the repository's determined policy
(from the previous section) is LF. Never run the LF-normalization command
without first confirming the policy — doing so on a CRLF-policy repository
fights the repository's own established convention and produces the exact
"LF will be replaced by CRLF" warning this rule exists to prevent.

For an LF-policy repository, normalize a file to LF immediately after
creating or editing it with the Write or Edit tool, before running any git
command, rather than waiting for `git status` or `git diff` to report the
mismatch. On Windows, for a single file:

```powershell
$content = Get-Content -Raw -Path "path/to/file"
$content -replace "`r`n", "`n" | Set-Content -NoNewline -Path "path/to/file"
```

For a CRLF-policy repository, do not run that normalization, and do not treat
a "LF will be replaced by CRLF" warning as a problem — it means Git is
correctly applying the repository's own policy on commit.

### When a line-ending warning occurs mid-session

- Diagnose the file's actual line endings against the repository's determined
  policy before acting.
- If the file's endings already match the policy, the warning is
  informational; leave the file alone.
- If the file's endings do not match the policy, fix the offending file in
  place and re-stage it before continuing.
- Prefer `git add --renormalize .` when normalization is intended.
- Use `git config --local`, never `--global`, if a repository-specific Git
  setting is necessary.
- Do not suppress the warning by redirecting stderr, disabling Git advice (for
  example `advice.addIgnoredFile=false`), or changing global `core.autocrlf`.
- If normalization would create a broad unrelated diff, tell the user and keep
  it separate from the functional change.
- If `core.safecrlf=true` blocks the operation, ask the user before relaxing it.
- If mixed line endings affect builds or tests, flag the issue and recommend an
  explicit `.gitattributes` rule where appropriate.

For cross-platform repositories that store files with LF, prefer a local
`core.autocrlf=input` configuration only when it is consistent with the
repository's existing policy and necessary to prevent Git rewriting files.

## Rule: Verify runtime-loaded build artifacts

Apply this rule only when the runtime loads generated artifacts directly rather
than building source at install time or launch.

Examples include Obsidian plugins loading `main.js`, browser extensions loading
`dist/`, VS Code extensions loading `out/`, and compiled binaries.

After changing source that affects a runtime-loaded artifact:

1. Run the repository's documented build command.
2. Check that the build command succeeded.
3. Inspect the generated artifact for a fingerprint of the change, such as a
   string literal, identifier, regular expression, or relevant assertion.
4. Before declaring the task complete or asking the user to test, state the
   complete filesystem path of the verified artifact.

Do not treat `git diff` as evidence that the runtime-loaded artifact was built.

## Rule: Obsidian plugin worktrees

Apply this rule only when all of these are true:

- The repository is an Obsidian plugin.
- The plugin is loaded from `<vault>/.obsidian/plugins/<id>`.
- Work is occurring in a Git worktree rather than the checkout targeted by the
  vault's plugin path.

A build in a worktree can produce a correct worktree `main.js` while Obsidian
continues loading `main.js` from the main checkout.

- Prefer Agent Manager `local` mode when isolation is unnecessary.
- Use worktree mode only when isolation is needed, such as conflicting edits or
  multi-branch experiments.
- When worktree isolation was used, run tests in the worktree, then prefer
  Agent Manager Apply and a build in the main checkout before the user reloads.
- If the vault must load the worktree immediately, use the shared relink script:

```powershell
& "$env:USERPROFILE\.config\kilo\tools\obsidian-relink.ps1" `
    -Source "$worktreePath"
```

- Before asking the user to reload Obsidian, print the full path of the built
  `main.js` that the vault will load.
- Do not ask the user to remove or recreate a junction manually when the relink
  script is available.
- Do not assume a successful worktree build updated the vault-loaded artifact.

## Rule: Obsidian runtime diagnostics

Apply this rule only to Obsidian plugin repositories.

When a question can be answered only by observing runtime behavior in Obsidian:

1. First prefer a focused Vitest test, existing test harness, static inspection,
   or another automated check if it can answer the question with comparable
   confidence.
2. If a runtime observation is necessary, add the smallest targeted diagnostic,
   such as a uniquely identifiable `console.log`, only when it is safe and
   likely to distinguish the competing explanations.
3. Build and verify the artifact according to the runtime-artifact rule before
   requesting a reload or runtime check.
4. If the agent can access and inspect the relevant console output, perform the
   check and use the result to proceed.
5. If the user must perform the check, do not continue speculating. Ask the
   user for one bounded action: reload the plugin, reproduce the behavior, and
   provide the output matching the unique diagnostic marker.
6. Explain what the requested result will determine, for example: “If this log
   appears, the command is registered; if it does not, registration is not
   reached.”
7. Remove the diagnostic after it has served its purpose unless it is useful
   permanent logging and the user agrees to retain it.

Do not ask the user to perform a manual Obsidian console check merely because it
is convenient. Use it only after determining that it is more informative than
available automated checks.

## Rule: Node dependency changes

Apply this rule only when the repository uses npm and its CI uses `npm ci`.

`npm install` is permissive and can silently rewrite the lockfile to resolve a
peer-dependency conflict, while `npm ci` installs strictly from the committed
lockfile and fails immediately on the same conflict. Catching that failure
locally avoids finding out only when CI goes red.

After editing `package.json` to add, remove, or change a dependency:

1. Run `npm install` to update `package-lock.json`.
2. Run `npm ci` to verify that the committed lockfile installs cleanly.
3. Run the repository's relevant build and test commands.
4. Commit `package.json` and `package-lock.json` together.

Do not treat a successful `npm install` as proof that `npm ci` will succeed.

Do not use `--legacy-peer-deps` or `--force` merely to bypass dependency
conflicts. Do not change dependency versions, peer-dependency strategy, or
package-manager choice beyond the task without user approval.

Skip this rule when the repository does not use npm, does not commit a
`package-lock.json`, or its CI does not use `npm ci`.

## Rule: Python repositories

Apply this rule when the repository is primarily Python.

Before adding or changing dependencies, inspect the repository's declared
workflow and lockfiles, such as `pyproject.toml`, `requirements*.txt`,
`uv.lock`, `poetry.lock`, `Pipfile.lock`, or equivalent files.

- Use the dependency manager and workflow already adopted by the repository.
- Do not introduce a second dependency manager without user approval.
- Update the applicable lockfile when the project's workflow requires one.
- After source changes, run the repository's documented formatter, linter,
  type checker, and relevant tests when available.
- Do not declare success based only on syntax checking, importing a module, or
  a partial test run unless that limitation is explicitly stated.

## Rule: Completion checks

Before declaring a task complete:

- Review the diff for unintended changes.
- Run the relevant validation commands for files changed.
- Confirm that required generated artifacts were rebuilt and verified.
- Report validation that was run and any validation that could not be run.
- Do not claim a test, build, installation, or artifact verification passed
  unless it actually completed successfully.

## Rule: A pre-push/pre-commit hook that runs `npm ci` can fail with EPERM on Windows and block the push

Apply this rule when a git push fails with an `EPERM`/`unlink` on a native
binary inside `node_modules`, or when `npm test`/`npm run build` cannot find
`vitest` after a failed `npm ci`.

On Windows, `npm ci` wipes `node_modules` and re-links native binaries such as
`@esbuild/win32-arm64/esbuild.exe`. Antivirus/EDR commonly holds those binaries
open, so `npm ci` fails with `EPERM ... unlink ... esbuild.exe` and the `set -e`
hook aborts the push even though the code is fine. Worse, the failed `npm ci`
has usually already pruned `node_modules`, so `vitest`/`eslint` are then missing
and a later `npm test` reports the binary "not recognized".

When this happens:

- Treat the push failure as a local hook/environment problem, not a code
  problem. Do not blame the commit.
- Restore dependencies with `npm install` (non-strict) rather than `npm ci`.
  `npm install` reuses the existing tree and avoids re-linking the locked
  binary, so it usually completes.
- Re-run `npm test` to confirm the code is actually green before pushing.

For git hooks you control (e.g. a `pre-push` that mirrors CI), prefer running
`npm test` directly against the already-installed `node_modules` instead of
`npm ci`. CI still runs `npm ci` strictly on every push, so the strictness
guarantee is preserved without risking the EPERM on the developer's machine.

### What NOT to do

- Do not keep a local hook that runs `npm ci` on every push on Windows — it
  will intermittently block pushes due to the locked native binary.
- Do not conclude the commit is broken just because the hook's `npm ci` hit an
  EPERM. The fix is `npm install`, then retry the push.
- Do not reach for `--legacy-peer-deps`/`--force` to get past the EPERM; that
  addresses the wrong failure (a lock, not a peer conflict).
