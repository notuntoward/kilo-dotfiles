#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const bash = process.platform === 'win32'
    ? path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe')
    : 'bash';
const hook = path.join(__dirname, '..', 'hooks', 'commit-msg');

function run(command, args, options = {}) {
    const result = spawnSync(command, args, { encoding: 'utf8', ...options });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`${command} failed${result.status === null ? ` (${result.signal})` : ` (exit ${result.status})`}.${result.stderr ? `\n${result.stderr.trimEnd()}` : ''}`);
    }
    return result.stdout || '';
}

function usage() {
    console.log('Usage: node commit.cjs --subject <text> --overview <text> [--bullet <text> ...] [--commit]');
    console.log('Without --commit, validate and preview the staged diff and message.');
}

function parseArgs(args) {
    const parsed = { subject: null, overview: null, bullets: [], commit: false };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--help') {
            usage();
            return null;
        }
        if (arg === '--commit') {
            if (parsed.commit) throw new Error('--commit may only be specified once.');
            parsed.commit = true;
            continue;
        }
        if (!['--subject', '--overview', '--bullet'].includes(arg)) throw new Error(`Unknown argument: ${arg}`);
        const value = args[++i];
        if (value === undefined || !value.trim() || /[\r\n\0]/.test(value)) {
            throw new Error(`${arg} requires nonempty text on one physical line.`);
        }
        if (arg === '--bullet') {
            parsed.bullets.push(value);
        } else {
            const key = arg.slice(2);
            if (parsed[key] !== null) throw new Error(`${arg} may only be specified once.`);
            parsed[key] = value;
        }
    }
    if (parsed.subject === null || parsed.overview === null) {
        throw new Error('--subject and --overview are required.');
    }
    return parsed;
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    if (!options) return;
    const message = `${options.subject}\n\n${options.overview}\n`
        + (options.bullets.length ? `\n${options.bullets.map((bullet) => `- ${bullet}`).join('\n')}\n` : '');
    const git = (...args) => run('git', args, { maxBuffer: 64 * 1024 * 1024 });
    const root = git('rev-parse', '--show-toplevel').trim();
    const staged = git('diff', '--cached', '--name-only', '-z');
    if (!staged) throw new Error('No staged changes to commit.');

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kilo-commit-'));
    const messageFile = path.join(tempDir, 'message.txt');
    try {
        let delimiter;
        do {
            delimiter = `KILO_MESSAGE_${randomBytes(16).toString('hex')}`;
        } while (message.split('\n').includes(delimiter));
        const script = `cat > "$1" <<'${delimiter}'\n${message}${delimiter}\n`;
        run(bash, ['-c', script, 'kilo-commit-message', messageFile]);
        if (fs.readFileSync(messageFile, 'utf8') !== message) {
            throw new Error('The prepared message did not match the requested message.');
        }
        const env = { ...process.env };
        delete env.KILO_TEST_STAGED_FILES;
        run(bash, [hook, messageFile], { env });

        console.log(`Checkout: ${root}`);
        console.log(`Branch: ${git('branch', '--show-current').trim() || '(detached HEAD)'}`);
        console.log(`Author: ${git('var', 'GIT_AUTHOR_IDENT').trim()}`);
        console.log(`Committer: ${git('var', 'GIT_COMMITTER_IDENT').trim()}`);
        console.log(`\n--- Staged diff ---\n${git('diff', '--cached', '--no-ext-diff', '--no-color')}`);
        console.log(`--- Commit message ---\n${message}`);
        if (!options.commit) {
            console.log('Preview only. Review the diff, identity, and message, then repeat with --commit.');
            return;
        }
        run('git', ['commit', '--cleanup=verbatim', '-F', messageFile], { stdio: 'inherit', env });
    } finally {
        fs.rmSync(messageFile, { force: true });
        fs.rmdirSync(tempDir);
    }
}

try {
    main();
} catch (error) {
    console.error(`Commit helper: ${error.message}`);
    process.exitCode = 1;
}
