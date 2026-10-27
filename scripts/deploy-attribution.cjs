'use strict';

// Deploy policy-only remote commits without changing dirty consumer checkouts.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { findViolation } = require('../dot_config/kilo/hooks/ai-attribution.cjs');

function command(program, args, options = {}) {
    return execFileSync(program, args, {
        encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024, ...options,
    }).trim();
}

function api(method, endpoint, data) {
    const args = ['api', '--method', method, endpoint];
    if (data !== undefined) args.push('--input', '-');
    const result = command('gh', args, data === undefined ? {} : { input: JSON.stringify(data) });
    return result ? JSON.parse(result) : null;
}

function workflow(ref) {
    return `name: Attribution policy

on:
  pull_request_target:
    types: [opened, edited, reopened, synchronize, ready_for_review]
  workflow_dispatch:

permissions:
  contents: read
  pull-requests: read
  statuses: write

concurrency:
  group: attribution-\${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  policy:
    uses: notuntoward/kilo-dotfiles/.github/workflows/no-ai-attribution.yml@${ref}
    with:
      policy-ref: ${ref}
`;
}

function inventory(root) {
    const repos = new Set(['notuntoward/kilo-dotfiles']);
    for (const dir of fs.readdirSync(root, { withFileTypes: true })) {
        const cwd = path.join(root, dir.name);
        if (!dir.isDirectory() || !fs.existsSync(path.join(cwd, '.git'))) continue;
        const result = spawnSync('git', ['remote', '-v'], { cwd, encoding: 'utf8', timeout: 10000 });
        if (result.status !== 0) throw new Error(`Cannot inspect remotes in ${cwd}: ${result.stderr}`);
        for (const line of result.stdout.trim().split('\n')) {
            const match = line.match(/github\.com[:/](notuntoward\/[^/\s]+?)(?:\.git)?\s+\(fetch\)/i);
            if (match) repos.add(match[1]);
        }
    }
    return [...repos].sort();
}

function protect(repo) {
    const name = 'Require attribution policy';
    const rules = api('GET', `repos/${repo}/rulesets?per_page=100`);
    const existing = rules.find((rule) => rule.name === name);
    const data = {
        name, target: 'branch', enforcement: 'active', bypass_actors: [],
        conditions: { ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] } },
        rules: [{
            type: 'required_status_checks',
            parameters: {
                required_status_checks: [{ context: 'No AI attribution', integration_id: 15368 }],
                strict_required_status_checks_policy: true,
                do_not_enforce_on_create: false,
            },
        }],
    };
    const rule = api(existing ? 'PUT' : 'POST',
        `repos/${repo}/rulesets${existing ? `/${existing.id}` : ''}`, data);
    const verified = api('GET', `repos/${repo}/rulesets/${rule.id}`);
    if (verified.enforcement !== 'active' || verified.bypass_actors.length ||
        !verified.rules.some((item) => item.type === 'required_status_checks' &&
            item.parameters.required_status_checks.some((check) =>
                check.context === 'No AI attribution' && check.integration_id === 15368))) {
        throw new Error('Required-check ruleset verification failed');
    }
    return rule.id;
}

function optionalGet(endpoint) {
    try {
        return api('GET', endpoint);
    } catch (error) {
        if (String(error.stderr).includes('HTTP 404')) return null;
        throw error;
    }
}

function deployContent(repo, ref, identity, branch, endpoint) {
    const existing = optionalGet(`${endpoint}?ref=${encodeURIComponent(branch)}`);
    const text = workflow(ref);
    let commit;
    if (!existing || Buffer.from(existing.content, 'base64').toString('utf8') !== text) {
        const message = 'Enforce attribution policy on pull requests\n\nCheck PR metadata and commit messages using the shared pinned policy.';
        if (findViolation(message)) throw new Error('Deployment commit violates policy');
        const result = api('PUT', endpoint, {
            message, content: Buffer.from(text).toString('base64'), branch,
            ...(existing ? { sha: existing.sha } : {}), author: identity, committer: identity,
        });
        commit = result.commit.sha;
    }
    const verified = api('GET', `${endpoint}?ref=${encodeURIComponent(branch)}`);
    if (Buffer.from(verified.content, 'base64').toString('utf8') !== text) {
        throw new Error('Installed workflow content verification failed');
    }
    let ruleset;
    let protectionError;
    try {
        ruleset = protect(repo);
    } catch (error) {
        protectionError = error.message;
    }
    return { repo, branch, commit, workflow: true, ruleset, protectionError };
}

if (require.main === module) {
    const [root, ref, reportPath] = process.argv.slice(2);
    if (!root || !/^[a-f0-9]{40}$/i.test(ref || '') || !reportPath) {
        throw new Error('Usage: node scripts/deploy-attribution.cjs <repos-root> <policy-commit> <report-json>');
    }
    const identityText = command('git', ['var', 'GIT_AUTHOR_IDENT']);
    const match = identityText.match(/^(.*?) <([^>]+)> /);
    if (!match) throw new Error('Cannot resolve configured Git identity');
    const identity = { name: match[1], email: match[2] };
    const results = [];
    for (const repo of inventory(root)) {
        try {
            const metadata = api('GET', `repos/${repo}`);
            if (metadata.owner.login.toLowerCase() !== 'notuntoward' || !metadata.permissions.admin) {
                throw new Error('Ownership/admin permission mismatch');
            }
            const result = metadata.archived
                ? { repo, skipped: 'Archived repository' }
                : deployContent(repo, ref, identity, metadata.default_branch,
                    `repos/${repo}/contents/.github/workflows/no-ai-attribution-pr.yml`);
            results.push(result);
            console.log(JSON.stringify(result));
        } catch (error) {
            const result = { repo, error: error.message };
            results.push(result);
            console.error(JSON.stringify(result));
        }
        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2) + '\n');
    }
    if (results.some((result) => result.error || result.protectionError)) process.exitCode = 1;
}

module.exports = { workflow, inventory };
