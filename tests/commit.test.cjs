'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const helper = path.resolve(__dirname, '../dot_config/kilo/tools/commit.cjs');
const hooks = path.resolve(__dirname, '../dot_config/kilo/hooks');

function run(command, args, cwd) {
    const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 30000 });
    if (result.error) throw result.error;
    return result;
}

function fixture(callback) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kilo-commit-test-'));
    const git = (...args) => {
        const result = run('git', args, dir);
        assert.equal(result.status, 0, result.stderr);
        return result.stdout;
    };
    try {
        git('init');
        git('config', 'user.name', 'Commit Test');
        git('config', 'user.email', 'commit-test@example.com');
        git('config', 'core.hooksPath', hooks);
        fs.writeFileSync(path.join(dir, 'first.txt'), 'first\n');
        git('add', 'first.txt');
        callback(dir, git);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

const args = ['--subject', 'Document the change', '--overview', 'Explain the change in one line.'];

test('previews the staged diff and exact message without committing', () => fixture((dir, git) => {
    const result = run(process.execPath, [
        helper, '--subject', "Preserve 'quotes' and $HOME", '--overview', 'Keep `backticks` and \\ paths.',
    ], dir);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Branch: /);
    assert.match(result.stdout, /Author: Commit Test/);
    assert.match(result.stdout, /diff --git a\/first.txt b\/first.txt/);
    assert.ok(result.stdout.includes("Preserve 'quotes' and $HOME\n\nKeep `backticks` and \\ paths.\n"));
    assert.match(result.stdout, /Preview only/);
    assert.equal(run('git', ['rev-parse', '--verify', 'HEAD'], dir).status, 128);
    assert.match(git('status', '--short'), /^A\s+first\.txt/m);
}));

test('rejects newlines, prohibited attribution, and invalid multi-file messages before committing', () => fixture((dir, git) => {
    const multiline = run(process.execPath, [helper, '--subject', 'Bad\nsubject', ...args.slice(2), '--commit'], dir);
    assert.notEqual(multiline.status, 0);
    assert.match(multiline.stderr, /one physical line/);

    const attribution = run(process.execPath, [
        helper, '--subject', 'Document the change', '--overview', 'Generated with Copilot', '--commit',
    ], dir);
    assert.notEqual(attribution.status, 0);
    assert.match(attribution.stderr, /ATTRIBUTION POLICY REJECTED/);

    fs.writeFileSync(path.join(dir, 'second.txt'), 'second\n');
    git('add', 'second.txt');
    const missingBullets = run(process.execPath, [helper, ...args, '--commit'], dir);
    assert.notEqual(missingBullets.status, 0);
    assert.match(missingBullets.stderr, /at least 2/);
    assert.equal(run('git', ['rev-parse', '--verify', 'HEAD'], dir).status, 128);
}));

test('commits the exact structured message and keeps Git hooks active', () => fixture((dir, git) => {
    fs.writeFileSync(path.join(dir, 'second.txt'), 'second\n');
    git('add', 'second.txt');
    const messageArgs = [...args, '--bullet', 'Add the first item', '--bullet', 'Add the second item'];
    const result = run(process.execPath, [helper, ...messageArgs, '--commit'], dir);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(git('log', '-1', '--format=%B'), [
        'Document the change', '', 'Explain the change in one line.', '',
        '- Add the first item', '- Add the second item', '', '',
    ].join('\n'));

    const fixtureHooks = path.join(dir, 'rejecting-hooks');
    fs.mkdirSync(fixtureHooks);
    fs.writeFileSync(path.join(fixtureHooks, 'pre-commit'), '#!/bin/sh\necho fixture-hook-rejected >&2\nexit 1\n', { mode: 0o755 });
    git('config', 'core.hooksPath', fixtureHooks);
    fs.writeFileSync(path.join(dir, 'first.txt'), 'changed\n');
    git('add', 'first.txt');
    const rejected = run(process.execPath, [helper, ...args, '--commit'], dir);
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /fixture-hook-rejected/);
    assert.match(git('status', '--short'), /^M\s+first\.txt/m);
}));
