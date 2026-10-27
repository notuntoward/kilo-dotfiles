'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');
const { findViolation } = require('../dot_config/kilo/hooks/ai-attribution.cjs');
const hooks = path.resolve(__dirname, '../dot_config/kilo/hooks');
const bash = process.platform === 'win32' ? path.join(process.env.ProgramFiles, 'Git', 'bin', 'bash.exe') : 'bash';

for (const text of [
    'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>',
    'CO-AUTHORED-BY: Claude <claude@users.noreply.github.com>',
    'Co-authored-by: Claude Code <noreply@anthropic.com>',
    'Signed-off-by: OpenAI Codex <codex@openai.com>',
    'Generated-by: AI assistant',
    'Generated with [Claude Code](https://claude.ai/code)',
    '🤖 Generated with GitHub Copilot',
    'Built using Cursor.',
    'Powered by ChatGPT',
    'Co-authored-by: Co\u200bpilot <copilot@example.com>',
    'Co-authored-by: Ｃｏｐｉｌｏｔ <copilot@example.com>',
    'AI-generated',
    '**Co-authored-by:** [Copilot](https://github.com/features/copilot)',
    'Merge branch topic\n\nCo-authored-by: Copilot <copilot@example.com>',
    'Revert "Fix"\n\nGenerated with Claude Code',
]) {
    test(`rejects ${text}`, () => assert.ok(findViolation(text)));
}

for (const text of [
    'Fix Copilot integration\n\nHandle the OpenAI API response correctly.',
    'Co-authored-by: Jane Doe <jane@example.com>',
    'Co-authored-by: Claude Martin <claude.martin@example.com>',
    'Signed-off-by: Scott <scott@example.com>',
    'Document how to reject AI attribution',
    'Reject Generated-by trailers from AI tools',
    'Update generated files',
]) {
    test(`allows ${text}`, () => assert.equal(findViolation(text), null));
}

function run(command, args, options = {}) {
    return spawnSync(command, args, { encoding: 'utf8', timeout: 15000, ...options });
}

test('commit hook rejects attribution before merge/revert exceptions and retains formatting checks', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attribution-message-'));
    const file = path.join(dir, 'message.txt');
    try {
        for (const subject of ['Fix something', 'Merge branch topic', 'Revert "Fix"']) {
            fs.writeFileSync(file, `${subject}\n\nCo-authored-by: Copilot <copilot@example.com>\n`);
            const result = run(bash, [path.join(hooks, 'commit-msg'), file]);
            assert.equal(result.status, 1, result.stderr);
            assert.match(result.stderr, /ATTRIBUTION POLICY REJECTED/);
        }
        fs.writeFileSync(file, 'Fix something\n\nA complete single-line overview.\n\nCo-authored-by: Jane Doe <jane@example.com>\n');
        assert.equal(run(bash, [path.join(hooks, 'commit-msg'), file]).status, 0);
        fs.writeFileSync(file, 'Fix something\n\nA hard-wrapped\nbody paragraph.\n');
        assert.equal(run(bash, [path.join(hooks, 'commit-msg'), file]).status, 1);
        assert.equal(run(bash, [path.join(hooks, 'commit-msg'), path.join(dir, 'missing')]).status, 1);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('push guard checks all introduced commits, new branches, force updates, deletions and tag updates', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attribution-push-'));
    const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', timeout: 15000 }).trim();
    const zero = '0'.repeat(40);
    try {
        git('init', '--initial-branch=main');
        git('remote', 'add', 'origin', dir);
        const tree = execFileSync('git', ['mktree'], { cwd: dir, input: '', encoding: 'utf8' }).trim();
        const commit = (message, parent) => {
            const args = ['commit-tree', tree];
            if (parent) args.push('-p', parent);
            return execFileSync('git', args, {
                cwd: dir, input: message, encoding: 'utf8', timeout: 15000,
                env: {
                    ...process.env,
                    GIT_AUTHOR_NAME: 'Policy Test', GIT_AUTHOR_EMAIL: 'policy-test@example.com',
                    GIT_COMMITTER_NAME: 'Policy Test', GIT_COMMITTER_EMAIL: 'policy-test@example.com',
                },
            }).trim();
        };
        const legacy = commit('Historical commit\n\nCo-authored-by: Copilot <copilot@example.com>\n');
        git('update-ref', 'refs/heads/main', legacy);
        const clean = commit('Clean commit', legacy);
        const bad = commit('Bad commit\n\nGenerated with Claude Code', legacy);
        const afterBad = commit('Clean tip must not hide an earlier bad commit', bad);
        const check = (sha, remoteSha, ref = 'refs/heads/main') => run('node', [
            path.join(hooks, 'ai-attribution.cjs'), 'push', dir,
        ], { cwd: dir, input: `refs/heads/topic ${sha} ${ref} ${remoteSha}\n` });
        assert.equal(check(clean, legacy).status, 0);
        assert.equal(check(clean, zero, 'refs/heads/new').status, 0);
        assert.equal(check(bad, legacy).status, 1);
        assert.equal(check(afterBad, legacy).status, 1);
        assert.equal(check(bad, zero, 'refs/heads/new').status, 1);
        assert.equal(check(bad, clean).status, 1);
        assert.equal(check(zero, legacy).status, 0);
        assert.equal(check(bad, zero, 'refs/tags/new').status, 1);
        assert.equal(check(clean, 'f'.repeat(40)).status, 1);
        const pushHook = (sha) => run(bash, [path.join(hooks, 'pre-push'), 'origin', dir], {
            cwd: dir, input: `refs/heads/topic ${sha} refs/heads/main ${legacy}\n`,
        });
        const accepted = pushHook(clean);
        assert.equal(accepted.status, 0, accepted.stderr);
        const rejected = pushHook(bad);
        assert.equal(rejected.status, 1, rejected.stderr);
        assert.match(rejected.stderr, /ATTRIBUTION POLICY REJECTED/);
        assert.equal(run(bash, [path.join(hooks, 'pre-push'), 'origin', dir], { cwd: dir, input: '' }).status, 0);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
