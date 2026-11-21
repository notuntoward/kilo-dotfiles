import { spawn } from "node:child_process";
import { accessSync, constants as fsConstants, statSync } from "node:fs";
import { basename, delimiter, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { joinSession } from "@github/copilot-sdk/extension";

const maxOutputBytes = 32 * 1024 * 1024;
const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
const inheritedPath = process.env[pathKey] ?? "";

function isFile(file) {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

function isExecutableFile(file) {
  if (!isFile(file)) return false;
  if (process.platform === "win32") return true;
  try {
    accessSync(file, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function unique(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = process.platform === "win32" ? value.toLowerCase() : value;
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function candidateNames(name) {
  if (process.platform !== "win32" || extname(name)) return [name];
  const extensions = (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM")
    .split(";")
    .filter(Boolean)
    .map((extension) => extension.toLowerCase());
  return unique([...extensions.map((extension) => `${name}${extension}`), name]);
}

function findExecutablesOnPath(name) {
  const found = [];
  for (const rawEntry of inheritedPath.split(delimiter)) {
    const entry = rawEntry.replace(/^"|"$/g, "");
    if (!entry) continue;
    for (const candidate of candidateNames(name)) {
      const file = resolve(entry, candidate);
      if (isExecutableFile(file)) found.push(file);
    }
  }
  return unique(found);
}

function isWslBashLauncher(file) {
  if (process.platform !== "win32") return false;
  const normalized = file.replace(/\\/g, "/").toLowerCase();
  return normalized.endsWith("/windows/system32/bash.exe") ||
    normalized.endsWith("/windows/sysnative/bash.exe") ||
    normalized.endsWith("/microsoft/windowsapps/bash.exe");
}

function resolveCommand(command) {
  if (isAbsolute(command) || command.includes("/") || command.includes("\\")) {
    return isExecutableFile(command) ? command : null;
  }
  return findExecutablesOnPath(command)[0] ?? null;
}

function ancestorDirectories(file, limit = 5) {
  const roots = [];
  let current = dirname(file);
  for (let index = 0; index < limit; index++) {
    roots.push(current);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return roots;
}

function bashCandidatesUnder(root) {
  if (process.platform === "win32") {
    return [join(root, "bin", "bash.exe"), join(root, "usr", "bin", "bash.exe")];
  }
  return [join(root, "bin", "bash")];
}

function discoverBashExecutable() {
  const candidates = [];
  const override = process.env.COPILOT_POSIX_BASH;
  if (override) candidates.push(resolveCommand(override));
  candidates.push(...findExecutablesOnPath("bash"));

  if (process.platform === "win32") {
    for (const gitExecutable of findExecutablesOnPath("git")) {
      for (const root of ancestorDirectories(gitExecutable)) {
        candidates.push(...bashCandidatesUnder(root));
      }
    }
    const installRoots = [
      process.env.GIT_INSTALL_ROOT,
      process.env.MSYS2_ROOT,
      process.env.CYGWIN_ROOT,
      process.env.COPILOT_POSIX_ROOT,
      process.env.ProgramW6432 && join(process.env.ProgramW6432, "Git"),
      process.env.ProgramFiles && join(process.env.ProgramFiles, "Git"),
      process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Programs", "Git"),
    ].filter(Boolean);
    for (const root of installRoots) candidates.push(...bashCandidatesUnder(root));
  } else {
    for (const configured of [process.env.SHELL, process.env.BASH]) {
      if (configured && /^bash(?:\.exe)?$/i.test(basename(configured))) {
        candidates.push(resolveCommand(configured));
      }
    }
  }

  for (const candidate of unique(candidates.filter(Boolean))) {
    const executable = resolveCommand(candidate);
    if (executable && !isWslBashLauncher(executable)) return executable;
  }
  return null;
}

function isDirectory(directory) {
  try {
    return statSync(directory).isDirectory();
  } catch {
    return false;
  }
}

function posixUtilityDirectories(shell) {
  if (!shell) return [];
  const directories = [dirname(shell)];
  for (const root of ancestorDirectories(shell)) {
    if (process.platform === "win32") {
      directories.push(
        join(root, "usr", "bin"),
        join(root, "mingw64", "bin"),
        join(root, "mingw32", "bin"),
        join(root, "bin"),
        join(root, "cmd"),
      );
    } else {
      directories.push(join(root, "bin"));
    }
  }
  return unique(directories.filter(isDirectory));
}

const bashExecutable = discoverBashExecutable();
const processEnv = {
  ...process.env,
  [pathKey]: unique([...posixUtilityDirectories(bashExecutable), inheritedPath]).filter(Boolean).join(delimiter),
  GIT_TERMINAL_PROMPT: "0",
  GIT_PAGER: "cat",
  PAGER: "cat",
};

function appendOutput(chunks, state, chunk, child) {
  const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  if (state.bytes + buffer.length > maxOutputBytes) {
    state.exceeded = true;
    child.kill();
    return;
  }
  state.bytes += buffer.length;
  chunks.push(buffer);
}

async function runProcess(executable, args, { cwd, stdin, timeoutMs }) {
  return await new Promise((resolve) => {
    const stdoutChunks = [];
    const stderrChunks = [];
    const stdoutState = { bytes: 0, exceeded: false };
    const stderrState = { bytes: 0, exceeded: false };
    let spawnError = null;
    let timedOut = false;
    let settled = false;

    const child = spawn(executable, args, {
      cwd,
      env: processEnv,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    const finish = (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        code,
        signal,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        spawnError,
        timedOut,
        outputExceeded: stdoutState.exceeded || stderrState.exceeded,
      });
    };

    child.stdout.on("data", (chunk) => appendOutput(stdoutChunks, stdoutState, chunk, child));
    child.stderr.on("data", (chunk) => appendOutput(stderrChunks, stderrState, chunk, child));
    child.on("error", (error) => {
      spawnError = error;
      finish(null, null);
    });
    child.on("close", finish);
    child.stdin.on("error", (error) => {
      if (error?.code !== "EPIPE" && !spawnError) spawnError = error;
    });
    child.stdin.end(stdin === undefined ? undefined : String(stdin));
  });
}

function combinedOutput(result) {
  return `${result.stdout}${result.stderr}`;
}

function failure(text) {
  return { resultType: "failure", textResultForLlm: text };
}

function executionFailure(result, label) {
  if (result.outputExceeded) {
    return failure(`${combinedOutput(result)}\n${label} failed: output exceeded ${maxOutputBytes} bytes.`);
  }
  if (result.timedOut) {
    return { resultType: "timeout", textResultForLlm: `${combinedOutput(result)}\n${label} timed out.` };
  }
  if (result.spawnError) {
    return failure(`${label} could not start: ${result.spawnError.message ?? result.spawnError}`);
  }
  if (result.code !== 0) {
    return failure(`${combinedOutput(result)}\n${label} exited with code ${result.code}${result.signal ? ` (signal ${result.signal})` : ""}.`);
  }
  return { resultType: "success", textResultForLlm: combinedOutput(result) };
}

function parseContext(source, stderr) {
  const match = /(?:^|\s)line\s+(\d+):/m.exec(stderr);
  if (!match) return "";
  const lineNumber = Number(match[1]);
  const line = source.replace(/\r\n?/g, "\n").split("\n")[lineNumber - 1];
  return line === undefined ? "" : `\nSource line ${lineNumber}: ${line}`;
}

async function preflightShell(source, cwd, timeoutMs, label) {
  if (!bashExecutable) {
    return failure(
      "No usable Bash executable was found. Set COPILOT_POSIX_BASH to an absolute path or make bash available on PATH. Direct argv mode remains available.",
    );
  }
  const result = await runProcess(bashExecutable, ["-n"], {
    cwd,
    stdin: source,
    timeoutMs,
  });
  if (result.timedOut) {
    return { resultType: "timeout", textResultForLlm: `${label} parse preflight timed out.` };
  }
  if (result.spawnError) {
    return failure(`${label} parse preflight could not start: ${result.spawnError.message ?? result.spawnError}`);
  }
  if (result.outputExceeded) {
    return failure(`${label} parse preflight exceeded ${maxOutputBytes} bytes of output.`);
  }
  if (result.code === 0) return null;
  return failure(
    `Shell parse error: ${label} was not executed.${parseContext(source, result.stderr)}\n${result.stderr}` +
      "Prefer argv for direct commands or script for raw Bash source.",
  );
}

async function run({ argv, command, script, stdin, cwd, timeoutMs = 300000 }) {
  const modes = [
    Array.isArray(argv) ? "argv" : null,
    typeof command === "string" ? "command" : null,
    typeof script === "string" ? "script" : null,
  ].filter(Boolean);

  if (modes.length !== 1) {
    return failure("Provide exactly one of argv, command, or script. Prefer argv for direct commands and script for multiline Bash source.");
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    return failure("timeoutMs must be a positive integer.");
  }

  const mode = modes[0];
  if (mode === "script" && stdin !== undefined) {
    return failure("stdin cannot be combined with script because script itself is supplied through Bash stdin. Embed input data in the script or use argv mode.");
  }

  if (mode === "argv") {
    if (argv.length === 0 || argv.some((value) => typeof value !== "string")) {
      return failure("argv must contain a non-empty executable followed by string arguments.");
    }
    const result = await runProcess(argv[0], argv.slice(1), { cwd, stdin, timeoutMs });
    return executionFailure(result, "Direct process");
  }

  const source = mode === "script" ? script : command;
  const label = mode === "script" ? "Bash script" : "Bash command";
  const parseFailure = await preflightShell(source, cwd, timeoutMs, label);
  if (parseFailure) return parseFailure;

  const args = mode === "script" ? ["-s"] : ["-c", command];
  const result = await runProcess(bashExecutable, args, {
    cwd,
    stdin: mode === "script" ? script : stdin,
    timeoutMs,
  });
  return executionFailure(result, label);
}

await joinSession({
  tools: [
    {
      name: "direct_git_bash",
      description:
        "Runs structured native commands. Prefer argv for direct executables, use script for raw POSIX Bash source, and reserve command for short compatibility commands.",
      skipPermission: true,
      parameters: {
        type: "object",
        properties: {
          argv: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
            description:
              "Direct executable and arguments, with no shell parsing or expansion. Example: ['git', 'status', '--short'].",
          },
          command: {
            type: "string",
            description:
              "Legacy short Bash command. It is syntax-checked before execution; prefer argv or script for new calls.",
          },
          script: {
            type: "string",
            description:
              "Raw Bash source sent through stdin to a discovered POSIX Bash, avoiding shell command-argument quoting.",
          },
          stdin: {
            type: "string",
            description:
              "Optional stdin for argv or command mode. It cannot be combined with script mode.",
          },
          cwd: {
            type: "string",
            description: "Absolute cross-platform working directory.",
          },
          timeoutMs: {
            type: "integer",
            description: "Execution timeout in milliseconds.",
            minimum: 1,
            default: 300000,
          },
        },
        required: ["cwd"],
      },
      handler: run,
    },
  ],
});
