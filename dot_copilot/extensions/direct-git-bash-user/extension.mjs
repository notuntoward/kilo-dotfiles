import { spawn } from "node:child_process";
import { joinSession } from "@github/copilot-sdk/extension";

const bashExecutable = String.raw`C:\Program Files\Git\bin\bash.exe`;
const maxOutputBytes = 32 * 1024 * 1024;
const gitBinDirectories = [
  String.raw`C:\Program Files\Git\usr\bin`,
  String.raw`C:\Program Files\Git\mingw64\bin`,
  String.raw`C:\Program Files\Git\cmd`,
];
const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
const inheritedPath = process.env[pathKey] ?? "";
const processEnv = {
  ...process.env,
  [pathKey]: [...gitBinDirectories, inheritedPath].filter(Boolean).join(";"),
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

  const args = mode === "script" ? ["-l", "-s"] : ["-lc", command];
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
        "Runs structured commands without PowerShell. Prefer argv for direct executables, use script for raw Bash source, and reserve command for short compatibility commands.",
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
              "Raw Bash source sent directly to a login Bash process through stdin, avoiding shell command-argument quoting.",
          },
          stdin: {
            type: "string",
            description:
              "Optional stdin for argv or command mode. It cannot be combined with script mode.",
          },
          cwd: {
            type: "string",
            description: "Absolute Windows working directory.",
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
