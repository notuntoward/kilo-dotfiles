# Global agent rules

## Delta checkout authorization

I explicitly authorize agents to edit, test, and build directly in my original
repositories under `C:\Users\scott\repos` without attaching them to Delta.
This chooses direct editing under Delta's exception for user-authorized work
outside attached worktrees. Do not request attachment, select Existing Local
Checkout, or create another checkout.

On first use of each checkout/task, print the current directory, Git root and
branch. Cache that verified identity for subsequent operations in the same
checkout; recheck after a context/checkout change and before commit and push. If the thread starts in an
isolated Delta checkout, use its `local` remote to locate the original, then
run project commands from that original checkout.

For a runtime-loaded plugin, the vault link is not part of this check. Verify
the artifact in the repository root as described in "Build Obsidian plugins
(vault-independent)". Never search the machine for a vault.

A consumer reported missing from an isolated checkout is not evidence that
its original repository is unavailable. Check the original repository first.
Leave existing vault links and settings untouched. Ask for access only if the
required original checkout or runtime target is actually unavailable.

These rules apply to agent sessions that load this file through Kilo, Delta,
Gemini, Copilot, or OpenCode. Project-level `AGENTS.md` files are loaded after this file and may
supplement or override these rules.

## Rule: Conditional rules

A rule that names a technology, artifact, tool, package manager, or workflow
applies only after verifying that the current repository uses it.

When a rule does not apply, skip it silently. Do not install tools, create
configuration, or change project structure merely to satisfy an inapplicable
rule.

## Rule: Mandatory instruction preflight

Read the exact applicable AGENTS.md/AGENT.md once for the current checkout and
target paths; do not substitute memory of another session. Cache unchanged text
within this task, including through publication. Read referenced guides only for
the operation they govern, and only the relevant sections. After compaction,
restore missing instructions, not the entire hierarchy.

Identify the actual runtime artifact only when source/build inputs are affected.
If a required original checkout, instruction or artifact is unavailable, state
the blocker and ask for access; do not claim equivalent verification elsewhere.
At completion, report required checks or reused evidence and any manual/unrun
validation. A completion check is not a mandate to reread unchanged instructions.

## Efficient task workflow

This section governs workflow/check frequency; domain safety rules below still apply.
- Read exact applicable instructions once per checkout/task. Reuse that text while
  it remains in context and unchanged; reread only changed or missing sections after
  compaction, a checkout change, or an instruction edit. Referenced documents are
  conditional reading, not a recursive reading list.
- Classify the actual diff first. Docs/instructions-only: review text, links and
  relevant render/format checks; no application builds, tests, browser runs,
  dependency installs or consumer sweeps unless a declared documentation check needs them.
- Publication-only: reuse recorded green checks and verified artifacts for unchanged
  code, dependencies, build inputs and linked commons source. Say which results are
  reused. If pending source has not been validated, run its required checks once.
- Code changes: targeted tests during iteration, required final checks once after the
  last relevant edit. A composite build already covers its lint/typecheck/test/bundle
  steps; do not rerun those separately. Verify that bundle rather than rebuilding it.
- Record command, checkout, result and relevant input/artifact identity in session
  state, not new repository cache files. Invalidate only affected evidence when its
  inputs change; never invent a pass or skip a newly affected behavioral check.
- Batch independent reads and checkout/status probes. Inspect only affected diffs
  and relevant guide sections. Do not restart exploration or re-audit unchanged code
  merely because the next action is commit/push or the context was summarized.
- Resolve a concrete uncertainty with one discriminating check, not repeated
  speculation. Keep reasoning, output and tracking proportional to the task.

## Rule: Honor explicit task gates, scope, and checkout choices

Treat the user's explicit instructions about sequence, scope, and workspace as hard
constraints. If the user says to answer a question or state understanding before
taking other action, deliver that answer before using tools or editing. Do no other
work before delivering it. Afterward, continue only with actions the user already
authorized; do not infer permission for additional scope.

If the user designates an existing checkout or says not to create a Delta
workspace, use that checkout and do not create or switch to another workspace.
Verify checkout identity when needed. Do not inspect unrelated repositories or
tools unless the request or an applicable instruction requires it; explain that
dependency when relevant.

Keep code changes focused on the requested behavior. Preserve existing code and
formatting; do not re-indent files or run broad formatters unless requested or
required for correctness.

## Rule: Updating these global rules

This file is managed by the `notuntoward/kilo-dotfiles` repository through
chezmoi. It is the canonical source for Kilo, Delta, Gemini, Copilot, and OpenCode global rules;
chezmoi templates install generated copies at `~/.config/delta/AGENTS.md`,
`~/.gemini/config/AGENTS.md`, `~/.copilot/copilot-instructions.md`, and
`~/.config/opencode/AGENTS.md`.
Delta reads its copy as Personal AGENTS.md. Copilot CLI and Copilot sessions
in VS Code discover their copy as personal, always-on instructions. OpenCode
CLI and desktop discover their global AGENTS.md. Keep
the generated copies sourced from this file. When the user asks to add, remove,
or revise a global rule, explain that the canonical source and user instructions
are in that repository's `README.md`:

https://github.com/notuntoward/kilo-dotfiles

To add another AI harness, follow "Adding another AI harness" in that repository's
`README.md`: create a template that includes this file, run `chezmoi apply`, and
verify the rendered copy. Kilo's non-rule configuration (the Git Bash `shell`
setting and the permission cleanup) is recorded in `docs/kilo-config.md`.

Do not edit the installed `~/.config/kilo/AGENTS.md` directly unless the user
explicitly requests a temporary local change. For a persistent change, edit the
tracked source file, apply it with chezmoi, commit it, and push it.

Do not run chezmoi commands, modify global Git configuration, commit, or push
this dotfiles repository unless the user explicitly asks.

When the user explicitly asks you to change, move, or add a global rule (that
request is the authorization to run chezmoi and to commit and push this
dotfiles repository), follow exactly this procedure:

1. Find the source repository with `chezmoi source-path` (normally
   `~/.local/share/chezmoi`). Work there, not in a worktree under its
   `.kilo/worktrees/` directory and not in any project repository.
2. For rule changes, edit ONLY `dot_config/kilo/AGENTS.md` in that source repository.
   Change templates or documentation only when the user requests integration changes. Never write
   to the installed files `~/.config/kilo/AGENTS.md`,
   `~/.config/delta/AGENTS.md`, `~/.gemini/config/AGENTS.md`, or
   `~/.copilot/copilot-instructions.md`, or `~/.config/opencode/AGENTS.md`.
   Templates only `include` the Kilo source.
3. Preserve the file's existing line endings (check before editing).
4. Run `chezmoi apply` with no path, which renders all five installed copies.
   Applying only the Kilo path leaves the other copies stale.
5. Verify: `chezmoi diff` prints nothing, and a distinctive phrase from the
   change is present in all five installed files.
6. Commit the source repository change following the "Git commit messages" rule
   (use the commit helper; no hook bypass), then `git push`. Report
   the commit hash and that a new Kilo/Delta/Gemini/Copilot/OpenCode session is needed to load
   the updated rules.
7. Do not touch the project repository's own `AGENTS.md` as part of this; move
   or delete project-level copies only when the user asks.

If `COPILOT_HOME` overrides `~/.copilot`, verify that Copilot's actual home
receives the generated instructions before claiming its rules are refreshed.
Use `/instructions` in a new Copilot CLI session to confirm the personal file
is discovered and enabled. Local files do not configure GitHub-hosted agents
or other AI products that do not discover these paths. On another machine,
run `chezmoi update` to pull the committed source and apply all managed copies.
## Debugging

Read the relevant subsection when investigating a failure, not during unrelated
documentation/publication work. Choose the cheapest discriminating check:
static inspection/existing tests -> focused repro/test -> read-only runtime probe
-> targeted temporary logs -> flight recorder -> out-of-process watchdog.
UI/DOM state starts with a read-only probe when tests cannot answer it; intermittent
failures without a repro need a flight recorder; an unresponsive hang also needs
a separate watcher. Do not blame activity merely coinciding with the failure.

### Resolve uncertainty; do not loop

State the competing explanations, choose one check that distinguishes them, and
act. Prefer existing tests/types/search over instrumentation. Add a small focused
test/repro when supported and proportionate. Stop speculating while waiting for
a result. For desired behavior, ask one focused question instead of implementing
a guess. Remove temporary diagnostics after they answer the question.

### Targeted logs and Obsidian console probes

- Use the smallest diagnostic with a unique greppable marker and decision inputs.
  Build/fingerprint runtime-loaded code before requesting reload/reproduction.
  Ask for one bounded action/output, and read it yourself when possible.
- Prefer an Obsidian read-only developer-console expression (Ctrl+Shift+I) when
  automated checks cannot observe the needed live state. Return one compact
  object/array rather than many logs. Name the exact main/pop-out window: each has
  its own document, DOM and app/window state.
- State preconditions; transient menus/hover state often disappear on console
  focus, so inspect persistent equivalents. Explain how each result decides the
  next step. Do not request a manual console check just for convenience.
- Plugin console output appears in MAIN-window DevTools even for pop-out work.
  A frozen window cannot open DevTools or execute a new console snippet.
- Fall back to code logging for timing/order or paths leaving no persistent state.
  Remove diagnostics unless the user agrees to retain useful low-noise logging.

### Flight recorder for intermittent failures

When reasonable static investigation cannot explain a non-reproducible failure:
- Append synchronously/durably, one timestamped line with session id and sequence;
  cap/rotate at startup, keep out of Git, and use a discoverable artifact-side path.
- Bracket every entry point with BEGIN/END and duration; STEP asynchronous stages.
  Centralize command wrappers; safely wrap host dispatch if useful, restore on unload.
  Log relevant events, storm counts, uncaught errors and unhandled rejections.
- Record relevant file/view identity and compact structural snapshots before/after
  mutation; log invariant anomalies. Common failing data may matter more than commands.
- Detect delayed timers only while visible. Hidden Chromium windows throttle timers;
  log visibility/focus changes rather than misreporting throttling as a freeze.
- Diagnostics must not break the product: startup failures disable logging safely,
  respecting forbidden APIs. Tell the user exactly which log/tail to supply;
  inspect earlier sessions too for a repeating signature.

### Watchdog and pre-attached debugger for hangs

- The app writes a heartbeat each second with time, visibility and in-flight work.
  A separate Node/Bash/native watcher polls it, reports stale visible heartbeats,
  periodically repeats FREEZE reports and logs recovery/process disappearance.
- Sample every app process over two seconds: CPU delta, response state, priority,
  memory and thread count. One busy core suggests a loop; idle processes suggest
  blocking/deadlock. Efficiency mode/low priority may be a consequence, not a cause.
- Choose a watcher the environment can actually run; never author PowerShell.
  Do not assume Electron runs plain Node; test any launch flag with a timeout.
- For Electron, launch with --remote-debugging-port=9222 on 127.0.0.1. Attach to
  EVERY page while healthy, send Debugger.enable and keep draining WebSockets.
  A hung page cannot reliably accept a new debugger session.
- At freeze, send Debugger.pause, record ~15 call frames, resume, repeat ~3 times.
  Resume unsolicited pauses too. If pause is not delivered within ~10 seconds,
  record that native code may be hung; do not invent a JavaScript stack.
- Obsidian's port is OFF by default. Close existing instances before the flagged
  launch (a second launch normally hands off); verify the listening port and a
  debugger-attached log per window before relying on capture. A normal Start/menu
  launch omits the flag; suggest a shortcut retaining it. No port means CPU-only
  diagnosis, not stack capture. The page list is http://127.0.0.1:9222/json.
- Windows default launch from Git Bash:
  "${LOCALAPPDATA}\\Programs\\Obsidian\\Obsidian.exe" --remote-debugging-port=9222
  Adjust only when the actual installation differs. Never advise opening stock
  DevTools after a freeze as though the unresponsive window could accept input.
- Use platform-native equivalents outside Electron (Python faulthandler, JVM
  jstack, .NET dumps, Node --inspect). Keep attached reproduction scripts bounded.

### Verify, follow evidence, clean up

Test instrumentation against a small known delayed busy loop; verify its stack
names that loop before shipping. Bound all repros with small failing inputs,
timeouts and cleanup of specific processes you started. Trace top frames to the
actual owner, including third-party code; reproduce/minimize before assigning
blame or proposing an upstream fix. Remove instrumentation afterward or ask to
keep it opt-in/out of release builds. Report remaining processes, logs and flags.

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
- Preserve existing indentation and formatting outside the necessary change. Do
  not reformat whole files or perform unrelated style cleanup unless requested or
  required for correctness.

Before writing code, confirm that the same behavior doesn't already exist in
the platform libraries or this codebase, and that a later change won't require
maintaining multiple copies.

## Rule: Git identity and attribution

Use existing Git author/committer configuration; never override it with an AI
identity. Never add AI attribution, branding or promotional text to commits,
tags, notes, PR titles/descriptions or trailers (including Co-authored-by,
Signed-off-by and Generated-by). Commit/push/PR requests do not authorize it.
Preserve legitimate human attribution and Dependabot authorship; automatic
Sourcery/CI labels are allowed, not AI co-author trailers.

Before commit, inspect actual author/committer and complete literal message.
Before push, inspect every outgoing commit and any tags/notes being published;
before PR submission, inspect the exact title and full body. Never copy prohibited
attribution from history/templates. Cache a completed inspection for the same
immutable commit/message; inspect only new or changed payloads on the next step.
If existing attribution blocks publication, stop; never rewrite history without
explicit authorization. Local hooks/GitHub enforce this policy; never bypass,
disable, weaken or fake their checks.

## Rule: Protected default-branch publication

When the user explicitly asks to publish or push to the protected default branch
(`main`, `master` or its documented equivalent), or when the requested endpoint
necessarily requires publication there, treat that as authorization to create a
PR and use `gh pr merge --admin` if direct publication is blocked by its
required-branch rules. Use this only after the exact PR title, body, commits,
required checks, reviews and attribution policy have passed.
The authorization does not permit a failing or unresolved PR, a conflict, an
attribution-policy violation, removal of the protection, or a repository-rule
change. Do not use or simulate a nonexistent `git push --admin`; the admin flag
applies to the eligible GitHub PR merge command.

## Rule: Git commit messages

Apply this rule once to the actual staged diff/message; do not reread it before
every Git command. A hook pass does not replace literal-message inspection.

- Imperative subject <=72 characters, exactly one blank line, then a concise
  one-physical-line overview explaining the user-visible change.
- Use separate "- " bullets for independent material changes; multiple changed
  files also require a bullet list (the installed hook requires at least two).
  Separate overview and bullets with exactly one blank line.
- Each paragraph and bullet is ONE physical line. Only subjects, blank paragraph
  separators and the start of distinct bullets introduce structural newlines.
  Never hard-wrap for display width; visual terminal wrapping is not a newline.
- Never collapse distinct bullets/paragraphs to evade a rejection, omit material
  changes or confuse tracked-file CRLF/LF policy with message structure.
- Use `node ~/.config/kilo/tools/commit.cjs` with separate `--subject`,
  `--overview` and `--bullet` arguments and `--commit` for every commit. Never
  invoke `git commit` directly or use a fallback. Do not inspect the helper's
  output; check only its exit status. If it fails or is unavailable, stop and
  report failure.

Before commit, inspect the exact message line by line, staged scope and identities,
and confirm the command contains no hook/signing bypass. Never use --no-verify,
environment bypasses, direct hook bypasses or weaken hooks.

## Rule: Shell selection and command-line safety

Detect once per session with printf 'shell=%s\n' "$BASH_VERSION". In Bash, use
POSIX commands directly, not bash -c wrappers. Never use bare bash on Windows
(it may resolve to WSL).

Never author/run PowerShell cmdlets, scripts, .ps1, powershell/pwsh or
-EncodedCommand, on ANY platform. Use file tools, Node or POSIX commands
(ls/cat/printf/grep/sed/awk/find/test/rm, $VAR, $? and &&/||).
Do not invoke PowerShell indirectly: never use a PowerShell-backed terminal
runner, API, extension, task or shell wrapper to launch Git Bash or any other
POSIX shell. On Windows, run shell-dependent work only through a tool that
starts Git Bash (or another explicitly verified POSIX shell) directly. If the
host exposes only a PowerShell-backed command runner, stop the shell-dependent
portion, state that limitation, and continue with direct file/API tools where
possible; do not request approval for a PowerShell-wrapped command.
Never send an absolute out-of-workspace path to a workspace file-view tool,
including for logs, session state, caches or home-directory files. That
creates repeated approval prompts. Read such paths through the direct
POSIX-shell tool when available; otherwise use the dedicated session/file-log
tool or stop and state the access limitation. Do not ask the user to approve
the same out-of-workspace file read repeatedly.
Never reload or edit extensions, hooks or permission policy to bypass an approval
prompt. Use an existing checkout-scoped/direct-shell tool, or stop and state the
access limitation. Never repeatedly ask for approval of the same operation.
Never use workspace-scoped file-view, file-search, glob, symbol or edit tools on
sibling repositories, home-directory files, caches, logs or other
out-of-workspace paths. This includes sending a sibling absolute path to a tool
such as view, rg or glob. For every sibling-repository read, search or mutation,
use the direct POSIX-shell tool or a dedicated extension scoped to that checkout;
do not route the operation through an approval-producing workspace tool.
PowerShell backticks corrupt text, old redirection corrupts UTF-8 and old hosts
lack POSIX heredocs/chaining. Keep file edits in dedicated tools.
If Git Bash is missing, stop and ask for Git for Windows; use another POSIX shell
only if available and say which. Never fall back to PowerShell or assume WSL exists.
Kilo's Git Bash setting/setup is documented in kilo-dotfiles docs/kilo-config.md.
Pass Windows paths as quoted CLI arguments to Node, not repeatedly escaped source
string literals through multiple shell layers.

## Rule: Permission-safe web research

Prefer canonical public URLs and official search results for public
documentation. Never navigate to or fetch backend or capability URLs containing
access tokens, signatures, session IDs, or other opaque authorization material
found in page source, preload metadata, redirects, browser storage or tool output.
Treat those values as credentials: do not paste them into tool arguments, logs
or responses. If the canonical source is unavailable, use an official public
alternative or state the limitation; never use a hidden or tokenized URL to work
around an approval prompt.

## Rule: Git line endings

Check .gitattributes/.editorconfig and local/global core.autocrlf once when
first staging in a checkout; infer established on-disk policy only if unspecified.
Cache it unless policy changes. Respect explicit policy; use local config only
(input for LF, true for established CRLF), never change global Git configuration.
Do not assume every Windows repository needs CRLF.

Git LF/CRLF replacement warnings are informational, not failures: do not retry,
rewrite files or run PowerShell normalization. Honor existing * text=auto eol=lf
when present. Do not introduce broad normalization/config churn for a small edit.
If normalization is genuinely requested/required, limit it to affected files;
preserve UTF-8 and established endings with file tools/Node. Stage any required
repository-wide renormalization separately, never silently mix it with the task.

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
3. **Completion gate for changed runtime inputs**: run the required final commands
   once. If the full build already bundles, verify its output; do not bundle again.
   Docs/publication-only tasks reuse unchanged verified artifacts and recorded checks.

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
- For a new build, record start time and verify its modification time is later.
  Reusing unchanged verified output does not require rebuilding just to refresh its age.

### Verification procedure

After changing source that affects a runtime-loaded artifact:

1. Run the repository's fast bundling command (or documented build command).
2. Check that the build command succeeded.
3. Inspect the generated artifact for a unique string or regex fingerprint of
   the change (or run the verification script).
4. Before declaring the task complete or asking the user to test, state the
   complete filesystem path of the verified artifact.

Do not treat `git diff` as evidence that the runtime-loaded artifact was built.



## Rule: Build Obsidian plugins (vault-independent)

For changed runtime inputs, build the documented production artifact in the
original checkout. Verify root main.js exists, is newer than that build's recorded
start and contains a unique changed literal (use npm run verify or a
line-length-safe Node check, never minified identifier grep). State its absolute
path. Reuse this evidence while source, linked libraries and build inputs remain
unchanged; README/AGENTS edits and commit/push do not invalidate the bundle.

Never scan above the repository for vaults or inbound links, hardcode/ask for a
vault path, require attachment, copy main.js from another checkout or repoint a
vault link to a worktree. The vault's existence/layout is irrelevant to building.
Keep vault links and settings untouched. If the app misses the verified change,
ask whether its plugin entry still points at this repo; inspect only a vault path
the user explicitly supplies. Relinking requires explicit authorization, the
obsidian-relink.mjs helper with that explicit path, and preservation of the
original target/settings; explain the changed settings location.

## Rule: Node build and test scripts

Apply this rule only in repositories that use npm and package their validation through scripts.

- Define `test` as a deterministic, non-watch unit/component test command (for example `vitest run`). Keep interactive/watch, coverage, UI and browser suites in separate named scripts.
- Define `typecheck` with the repository's existing compiler command.
- Define `check` as lint (when configured) plus typecheck, without bundling.
- For projects that produce a runtime bundle, define `bundle` as the production artifact command and define `build` as `npm run check && npm test && npm run bundle`.
- For source-only libraries with no runtime bundle, define `build` as `npm run check`; `check` already includes the library's required tests.
- If a package has only integration/E2E tests that require an external application or runtime, keep that command as `test:integration` or `test:browser` and report it separately. In that case `build` is `npm run check && npm run bundle`; do not pretend the integration gate ran.
- Add a build-alias-only change as `build = npm run check` for source-only libraries, never a no-op or hidden fallback.
- Keep browser/E2E suites separate (for example `test:browser`) and report them as a separate gate. Do not silently fold browser dependencies into every local build.
- When final-reporting validation, report build, unit-test count, and browser-suite status independently. Never report only `build passed` when the package declares a separate test suite.

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

Review the affected diff once, run required checks for changed inputs or report
which earlier results are reused, and verify any affected runtime artifact.
State unrun/manual checks and failures honestly. Documentation/instruction-only
work needs text/link/render/format validation, not application tests/builds.
After publication, verify the intended remote tip, branch and remaining dirty
status; do not restart implementation discovery. Never claim a check passed
unless it actually completed successfully for the relevant inputs.

## Rule: Obsidian settings tabs

Apply this rule to every Obsidian plugin whose `manifest.json` `minAppVersion` is 1.13.0 or newer.

- Implement plugin settings with the declarative API only: `getSettingDefinitions()`, plus `getControlValue` and `setControlValue` for custom storage.
- Never define `display()` in a `PluginSettingTab`. Obsidian 1.13 deprecated it and does not call it when `getSettingDefinitions()` returns a non-empty array; a `display()` implementation silently diverges from the live settings.
- Never build settings rows with `new Setting()` inside a `PluginSettingTab` or its `display()`. Use `control` entries, or `render` callbacks for custom rows; `new Setting()` remains fine in modals and other UI.
- Refresh dynamic settings with `this.update()`, not `this.display()`. Call `update()` after mutating state that changes `visible`, `disabled`, or the row set.
- Enforce it in ESLint with `obsidianmd/settings-tab/no-deprecated-display`, `obsidianmd/settings-tab/prefer-setting-definitions`, and `obsidianmd/settings-tab/prefer-update-over-display` set to `error`.
- This applies to every Obsidian plugin repository, including new plugins from the template. Project-level `AGENTS.md` files may add constraints but must not weaken it.

## Rule: Obsidian pop-out windows

Apply this rule when writing or reviewing code for an Obsidian plugin.

Obsidian pop-out windows have their own `document`, `window`, `navigator`,
timers, and animation frames. The bare globals refer to the MAIN window. A
plugin that uses them works perfectly in the main window and fails silently only
when the user is working in a pop-out, so no type error or ordinary test will
catch it. Real failures traced to this: a search box attached to the wrong
window; the wrong leaf chosen as the target because `document.activeElement`
was read from the main document; focus bounced back to the original pane after
clicking another pane; a key-repeat (hold a key) feature that never ran because
its listeners were only on the main window; clipboard commands rejected because
`navigator.clipboard` was called on an unfocused window; and `requestAnimationFrame`
or timers that never fire because the main window was hidden.

- Never use bare `document` or `window` (or `navigator`) for focus checks,
  `activeElement`, `querySelector`, `body`, timers, `requestAnimationFrame`,
  `getSelection`, clipboard access, or event listeners. Use Obsidian's
  `activeDocument` / `activeWindow` for "the window the user is in", or derive
  the window from the element or event: `el.ownerDocument`,
  `el.ownerDocument.defaultView`, `evt.view`.
- Create and clear a timer on the SAME window: `win.setTimeout` /
  `win.clearTimeout`. A timer id from one window cannot be cleared on another.
- Register global listeners (`keydown`, `keyup`, `pointerdown`, `mousedown`,
  window `blur`) once per window, deduplicated, not only on the main document:
  hook the main window, every pop-out that already exists at
  `workspace.onLayoutReady` (via `iterateAllLeaves` and
  `containerEl.ownerDocument.defaultView`), and each later pop-out via the
  `window-open` workspace event.
- A handler that closes UI because focus left it (blur) must not steal focus
  back to the original editor when focus moved to a real element in another pane
  or window. Pass an explicit `refocus` flag, true only when focus landed on
  `body` or nowhere.
- Remember that code in a plugin always runs in the main window's JavaScript
  context, so `console.*` output appears in the MAIN window's DevTools, even for
  work done in a pop-out. Tell the user which window's console to open.

Add regression coverage whenever you touch this area:

1. A static source-scan test that fails on the forbidden bare globals in the
   plugin's source (comments stripped; deliberate main-document uses such as
   "hook the main document" must not match the patterns).
2. Behavior tests that use a second document from
   `document.implementation.createHTMLDocument()` as a stand-in pop-out. jsdom
   does not track focus there, so stub `activeElement` on that document with
   `Object.defineProperty`, and stub `activeDocument` / `activeWindow` globals.
3. Verify each new test fails against the pre-fix code.

A test cannot reproduce a real focused pop-out, so state that a manual check in
Obsidian is still needed.
## Rule: Obsidian shared library (`commons`)

Apply this rule only in Obsidian plugin repositories (and in the library repo
itself). The shared library is the repository `obsidian-commons` (GitHub:
`notuntoward/obsidian-commons`), normally checked out at
`C:\Users\scott\repos\obsidian-commons`; its package name is `commons`. Plugin
work must not duplicate what it owns, because duplicated copies drifted and
repeated the same bugs across plugins.

### What commons owns

- Windows, tab groups, tabs: the navigation model (`commons/workspace`), window
  resolution, main-window and sidebar tests, popout closing, focusing a leaf and
  its window, leaf recency.
- Per-window plumbing (`commons/windows`): `forEachWindow`, owner-window timers,
  clipboard, event windows.
- OS window raising/capture (`commons/os`), modal chooser helpers
  (`commons/modal`), picker search (`commons/search`), geometry
  (`commons/geometry`), page colors (`commons/color`; general parsing remains planned), line flash
  (`commons/flash`), test kit
  (`commons/testing`).
- The ONLY code allowed to read undocumented Obsidian fields (`leaf.id`,
  `leaf.detached`, `container.win`, `rootSplit/leftSplit/rightSplit/floatingSplit`,
  `tabHeaderEl`, `parent.children`, `loadIfDeferred`, `chooser.setSelectedItem`).
- The current plan, checklist and handoff log: `docs/PLAN.md`,
  `docs/CHECKLIST.md`, `docs/HANDOFF.md` in the commons repo.

### Classify the repository first

1. **Library** (the repo is `obsidian-commons`): follow its `AGENTS.md`; this
   rule's "Changing commons" section describes your workflow.
2. **Migrated plugin** (`package.json` lists a `commons` dependency): use
   commons for everything it owns. Never write a new `iterateAllLeaves` scan, a
   `Map` keyed on `leaf.parent`, a main-window test, a window lookup, or a
   private-field read in plugin code. If commons lacks something or has a bug,
   fix it in commons (below), never in a local copy.
3. **Unmigrated plugin** (no `commons` dependency): work exactly as the plugin's
   own `AGENTS.md` says; do not start a migration unprompted. But if the task
   touches window, tab group, popout, focus, modal-chooser, or color-parsing
   code, do that part through commons: follow `docs/MIGRATING.md` in the commons
   repo for that one area, as its own small step, instead of editing the local
   copy. Do not add new code for these areas to an unmigrated plugin when
   commons already provides it (check `src/<module>/index.ts` and
   `docs/CHECKLIST.md` first).

If the commons checkout is unavailable, say so and continue in the plugin only
when the task does not touch an owned area; otherwise stop and ask.

### Obsidian version and build settings for every plugin using commons

- `manifest.json` `minAppVersion` is `1.14.0`; `package.json` pins
  `"obsidian": "~1.14.4"` (not `latest`).
- `tsconfig.json` uses `"moduleResolution": "bundler"` and
  `"paths": { "obsidian": ["./node_modules/obsidian"] }`. Without `paths`,
  the plugin and commons get two copies of the `obsidian` types and TypeScript
  reports unrelated-type errors on `WorkspaceLeaf`.
- Vitest aliases `obsidian` to `commons/testing/obsidian-mock` (or a local mock
  that extends it).
- During migration the dependency is `"commons": "file:../obsidian-commons"`
  (a junction; edits are visible immediately). It is flipped to a git tag only
  at release (see the library's `docs/PLAN.md`). A plugin whose `commons`
  dependency is `file:` must not be released or tagged.

### Changing commons (you do this yourself and tell the user)

Docs/instructions/publication-only work does not trigger the library/consumer
build loop or consumer inventory sweeps. Read commons docs/exports only for an
owned-area change or an explicit library task; take the required branch from its
AGENTS.md. The following loop applies to changed library source/API/build inputs.

You decide when a change belongs in commons: it is window/tab/popout/modal/
color/test-kit code that one plugin needs and another plausibly will, or it
fixes a bug that exists in several copies. Then:

1. Work in the original commons checkout on the branch required by its AGENTS.md. Add or update a
   test that fails without the change; keep `tests/guardrails.test.ts` honest.
2. Run `npm run check` there (lint, typecheck, tests). Fix until green.
3. Update `docs/CHECKLIST.md` and add a `docs/HANDOFF.md` entry (newest first).
4. "Make it available": in local mode nothing to publish. Run the consumer's own
   full check against it (`node scripts/consumers.mjs check <name>` from the
   commons repo) and fix what breaks. Do the consumer-side adoption yourself.
5. Tag a release (`vX.Y.Z`, semver) only when the plan calls for it (first
   at the flip to tags, then for breaking or widely wanted changes); follow the
   git commit message rule; never skip hooks.
6. Install only if dependencies changed or a check proves existing tools missing.
   A source-only commons edit is already visible through the file: junction; no
   reinstall is needed. Build affected consumers once in their original checkouts
   and verify that output, not a second bundle.
7. Tell the user plainly what you did: which library files changed, what was
   tagged, which plugins were rebuilt, and anything that still needs their
   action (for example reloading Obsidian or a decision recorded in HANDOFF).

Record surprises in `docs/HANDOFF.md`. This rule and the plan are living
documents: when circumstances change, edit them (and say so) instead of working
around them.

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
