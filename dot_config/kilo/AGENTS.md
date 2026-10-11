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

## Debugging

This section collects every rule about finding the cause of a bug, from
deciding what to check first to instrumenting a running program. Read the
whole section before adding logging or asking the user for diagnostics.

### Order of attack

Use the cheapest technique that can answer the question, and escalate only
when it cannot:

1. **Static inspection and existing tests.** Read the code, search the
   repository, run the existing tests, type checks, and linters.
2. **A new focused test** or a minimal reproducible check, when it is
   proportionate to the change and supported by the project.
3. **A read-only runtime probe** that needs no code change: a console snippet,
   a REPL session, or an attached debugger.
4. **Targeted temporary log markers** in the code (see "Debugging with logs").
5. **A flight recorder** (a durable, crash-safe log of everything the program
   does) for intermittent failures that cannot be reproduced on demand.
6. **An out-of-process watchdog with debugger capture** for hangs and freezes,
   where the program cannot log about itself.

Choose by symptom:

| Symptom | Start at step |
|---|---|
| Wrong value, wrong order, or a deterministic failure | 1, then 3 or 4 |
| A UI or DOM state question in a running app | 3 (console snippet) |
| An intermittent crash, wrong state, or freeze with no repro | 5 |
| The app hangs and ignores input (a busy loop or a deadlock) | 5, then 6 |

### Rule: Resolve uncertainty; do not loop

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

Do not continue a back-and-forth of "maybe," "wait," "but," or equivalent
speculation after a practical discriminating check or focused user question has
been identified.

When the uncertainty is about the user's desired behavior rather than a
technical fact, do not implement a guess after reasonable repository inspection
fails to resolve it. Ask the user the single question most likely to unblock the
decision.

Do not build a theory on a coincidence. In one real freeze investigation the
first suspects (a popout window, a layout command, a third-party plugin) were
all wrong, because they were only things that happened near the failure. Prefer
evidence captured at the moment of failure, and look for what is common to
every failure, such as the same file being open each time.

### Debugging with logs

#### Targeted log markers

Use these when a specific question needs one observation and the failure is
reproducible on demand.

- Add the smallest diagnostic that distinguishes the competing explanations.
  Give every message a unique, greppable marker, and log the inputs to the
  decision, not just that the code ran.
- If the project loads a generated artifact, build and verify it first (see
  the rule on runtime-loaded build artifacts) before asking the user to reload.
- Ask the user for one bounded action: reproduce the behavior and report the
  output matching the marker.
- If you can read the output yourself, do so instead of asking.
- Remove the diagnostic when it has served its purpose, unless it is useful
  permanent logging and the user agrees to keep it.

#### Obsidian plugins: read-only console snippets

Apply this only to Obsidian plugin repositories. When a question can be
answered only by observing runtime behavior in Obsidian:

1. First prefer a focused Vitest test, existing test harness, static inspection,
   or another automated check if it can answer the question with comparable
   confidence.
2. If a runtime observation is necessary, prefer a read-only console snippet
   that the user pastes into the Obsidian developer console (Ctrl+Shift+I)
   over editing code. Typical uses: count or locate elements with
   `document.querySelectorAll(...)`, read `getComputedStyle(el, pseudo)` values,
   `getBoundingClientRect()`, or inspect live objects such as
   `app.workspace` and `app.plugins.plugins['<id>']`. This needs no code change,
   build, or reload, so it is much faster than a log round-trip.
3. Write each snippet as one self-contained expression that returns a compact
   value (an object or array of short strings), not many `console.log` calls.
   Name the exact window to run it in (main window or a specific pop-out; each
   has its own console and `document`). Do not assume it can see another
   window's DOM.
4. State the preconditions the user must set up first. UI such as a modal, menu,
   or hover state usually closes or disappears when focus moves into the
   console, so prefer snippets that inspect state that persists (for example an
   always-present element with the same styling) rather than transient state.
5. Explain what each possible result will determine, for example: "If the
   count is 1, the class is applied and something is hiding it; if 0, the
   marking logic is not reaching that element." Ask for the output of one
   snippet at a time and do not keep speculating while waiting.
6. Fall back to code-level diagnostics (targeted log markers, above) only when
   a console snippet cannot observe the answer, for example event ordering,
   timing, or code paths that leave no persistent state.

Do not ask the user to perform a manual console check merely because it is
convenient. Use it only after determining that it is more informative than
available automated checks. A console snippet cannot help once the app is
frozen, because the window no longer responds to input, including opening
DevTools.

#### Flight recorder for intermittent failures

Use a flight recorder when a failure is intermittent or depends on real user
actions, you cannot reproduce it, and static inspection has not found the
cause after reasonable effort. Typical cases: a freeze, a crash, or state that
becomes corrupt "sometimes". The goal is a log the user can hand back after
the failure, whose last lines show what was happening.

How to build one:

- **Write synchronously and durably.** Append one line per record with a
  synchronous file write (for example `appendFileSync`), so the last line on
  disk is the last thing that happened even if the process then hangs or is
  killed. Include an ISO timestamp, a per-session id, and a sequence number.
  Cap the file size and rotate it at startup. Put it next to the artifact or
  another place the user can find, and keep it out of Git.
- **Bracket every entry point.** Log `BEGIN` and `END` with the duration around
  each user-invoked operation. Wrap command registration in one place rather
  than editing every command. Where it is safe, also wrap the host app's
  command dispatcher so the host's own commands are logged, and restore the
  original on unload. A `BEGIN` with no `END` identifies what was running.
- **Log steps and events.** Add `STEP` lines inside multi-step or asynchronous
  operations. Log the host's events, with a counter that records a `STORM` line
  when too many arrive in a short window. Log uncaught errors and unhandled
  promise rejections.
- **Log identity and structure.** Record which user data is involved, such as
  the active file path and view type, because the common factor across several
  failures is often the data (a single note, file, or setting), not the code
  path. Log a compact snapshot of the relevant structure (for example the
  workspace tree) before and after each mutation, plus an `ANOMALY` line when
  an invariant is violated.
- **Detect stalls without false alarms.** A timer that logs when it fires late
  finds stalls that recover. Skip the check while the window is hidden:
  Chromium throttles hidden-window timers to about once per minute, which looks
  like a 59.5 second freeze but is not one. Log visibility and focus changes so
  the log shows which case it was.
- **Never let diagnostics break the product.** Wrap their startup in
  `try`/`catch` so a failure only disables logging. Respect project rules about
  forbidden APIs.
- **Tell the user exactly what to send back**: the log file, or its tail from
  the last session start. Read the tail yourself, and read earlier sessions too
  because the same signature may repeat.

#### Out-of-process watchdog for hangs

A hung process cannot log about itself. When the app freezes and ignores the
keyboard and mouse, add a separate watcher process:

1. **Heartbeat.** The app rewrites a small file every second with the time,
   whether the window is visible, and what it was doing (in-flight operations
   and the last event).
2. **Watcher.** A separate process polls the file. If it goes stale for several
   seconds while the window is visible, the watcher appends a `FREEZE` report
   to the log, repeats it periodically, and logs when the heartbeat resumes or
   the app disappears.
3. **Process sample.** In the report, sample every process of the app over two
   seconds: CPU time delta, whether Windows reports it as responding, priority,
   memory, and thread count. One process near one full core means a busy loop.
   All processes near zero means a deadlock or blocked I/O. A low priority or
   "Efficiency mode" label is Windows reacting to the spin, not the cause.
4. **Choose the watcher carefully.** On Windows, a PowerShell script passed with
   `-EncodedCommand` needs no extra install. Do not assume the app's own binary
   can run as plain Node: Electron apps often disable that. Test it safely
   with a timeout, because the wrong flag can launch the GUI.
5. **Capture the stack of the loop.** Start the app with a debugging port (for
   Electron, `--remote-debugging-port=9222`, bound to `127.0.0.1`). The watcher
   must attach to every page while the app is still healthy, send
   `Debugger.enable`, and keep the WebSocket open. A hung page cannot accept a
   new debugger session, but an attached session can still send
   `Debugger.pause` and interrupt JavaScript. At freeze time, send pause, read
   the `Debugger.paused` call frames, log the top 15 or so, resume, and repeat
   about three times. Keep draining messages, and resume any pause the watcher
   did not request. If the pause is not delivered within about 10 seconds, the
   loop is likely in native code rather than JavaScript, and the log should say
   so.
6. **Tell the user the launch command** and what to look for in the log (for
   example a `debugger attached` line after plugin load). If the user starts the
   app without the flag, the watcher should log that no stack is available,
   not fail silently.

**Obsidian: the debugging port is not on by default.** Obsidian must be
started with the flag, or the watchdog can detect a freeze and sample CPU but
cannot capture a stack. Give the user this exact command (Windows, default per-user install path; adjust if Obsidian was installed
elsewhere), and ask
them to start Obsidian this way every time until the cause is found:

```powershell
& "$env:LOCALAPPDATA\Programs\Obsidian\Obsidian.exe" --remote-debugging-port=9222
```

- Close every running Obsidian first. Obsidian normally allows only one instance, so a
  second launch is likely to hand off to the running one and the port will not
  open. Check that the port is listening before relying on it.
- A normal start (Start menu, taskbar, or double-clicking a vault) does not use
  the flag. Suggest a desktop or taskbar shortcut whose target ends with
  `--remote-debugging-port=9222` so the flag is not forgotten. In one
  investigation the user started Obsidian normally twice, and the log said so.
- The port listens on `127.0.0.1` only. `http://127.0.0.1:9222/json` lists the
  pages (the main window and each pop-out) with their WebSocket URLs.
- Verify before the user works: the log must show one `debugger attached to
  page` line per open window shortly after plugin load. If it shows
  `no debugger port` instead, the flag was not used, and a freeze at that point
  gives no stack. Tell the user to restart with the flag.
- With the port open, the agent may also attach itself to drive or observe a
  reproduction (for example run a command and press keys over the protocol),
  which is useful when a hang is deterministic. Keep such scripts bounded with
  timeouts and kill any process started.
- Do not open the stock DevTools after a freeze. A frozen window ignores
  Ctrl+Shift+I, so advice to "open DevTools and click Pause" only works if
  DevTools was already open, and even then is not reliable. Use the
  pre-attached watchdog instead.

The same idea applies outside Electron: a Python process can dump all thread
stacks on a timer with `faulthandler.dump_traceback_later`, a JVM with
`jstack`, a .NET process with a dump, and Node with `--inspect` plus
`Debugger.pause`.

#### Verify, then follow the evidence

- **Test the instrumentation outside the real app first.** Run the watcher
  against a small script that loops after a delay (for example
  `node --inspect=9222`) and confirm the log names the looping function. Build
  and verify the shipped artifact before asking the user to reload.
- **Keep every test bounded.** Exponential or hanging inputs can run for
  minutes. Use input sizes where the broken code fails in seconds, cap spawned
  processes with a timeout, and kill any stray process you started. Do not
  leave a test that hangs when the bug is present.
- **Trace the top frames to their owner before blaming your own code.** Search
  the installed third-party code for the function name, reproduce the behavior
  standalone with timing, and shrink it to a minimal input. In the freeze that
  produced this section, the loop was a regular expression with catastrophic
  backtracking in a third-party plugin, triggered by one unclosed link in the
  user's note. A short repro and a proposed fix are what an upstream project
  can act on, and a pull request is better still when the user asks for one.
- **Clean up.** When the investigation is over, remove the instrumentation, or
  keep it behind an opt-in setting and out of release builds. Ask the user
  which, and mention any background process, log file, or debugger flag that
  remains.

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

### Fast inner-loop bundling vs final gate

Composite build commands (e.g. `npm run build`) often chain linters and typecheckers,
taking 15–30s. During iterative code edits, use the fastest path to bundle the artifact:

1. **Check `package.json` scripts**: Look for `bundle`, `build:fast`, or `compile`.
2. **Inspect composite `build` scripts**: If `build` is a chain (e.g. `npm run lint && tsc && node esbuild.config.mjs production`),
   invoke only the final bundler command directly during iteration (e.g., `node esbuild.config.mjs production`
   in standard Obsidian plugins takes < 1s).
3. **Completion gate**: Run the full repository validation commands (e.g. `npm run check`,
   `npm run test:run`, or `npm run build`) once before declaring the task done.

### Minification and fingerprint verification

- **Never grep for function or variable names in minified artifacts**:
  production bundlers (like `esbuild` or `webpack`) mangle identifiers
  (e.g., `myFunction` becomes `Ia` or `Rt`). Always verify against a unique
  string literal, UI text, error message, or regex snippet added by your edit.
- **Bypass line-length buffer limits**: Minified files often have single lines exceeding
  50KB–100KB, causing standard `grep`/`ripgrep` to report false-negative "No results found".
  - If the repo provides a verification tool (e.g., `npm run verify -- "<fingerprint>"`), use it.
  - Otherwise, verify with a line-length-agnostic check, e.g.:
    `node -e "console.log(fs.readFileSync('main.js','utf8').includes('your_literal'))"`
- Confirm the artifact's build timestamp or modification time updated recently.

### Verification procedure

After changing source that affects a runtime-loaded artifact:

1. Run the repository's fast bundling command (or documented build command).
2. Check that the build command succeeded.
3. Inspect the generated artifact for a unique string or regex fingerprint of
   the change (or run the verification script).
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
