#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const brands = String.raw`(?:github[\s-]*copilot|copilot|chatgpt|openai|anthropic|claude(?:[\s-]+code)?|gemini|cursor|codeium|windsurf|aider|devin|codex|kilo(?:[\s-]+code)?|grok|qwen|deepseek|amazon[\s-]*q|tabnine|replit|sweep|augment(?:[\s-]+code)?|ai[\s-]+(?:assistant|agent|model))`;
const namedAgent = new RegExp(String.raw`^\s*${brands}\s*(?:<|$)`, 'i');
const agentAddress = new RegExp(String.raw`(?:^|[<\s])(?:\d+\+)?${brands}(?:\[bot\])?@|@(?:[^\s<>.]+\.)*(?:openai|anthropic|cursor|codeium|windsurf|aider|devin)\.(?:com|ai|sh)|\b(?:copilot|claude|codex|devin|sweep)\[bot\]`, 'i');
const credit = new RegExp(String.raw`\b(?:generated|co[\s-]*authored|authored|written|created|produced|powered|assisted|built|made|implemented|developed)\s+(?:(?:in\s+)?(?:collaboration|partnership)\s+)?(?:by|with|using|via)\s+(?:(?:the|an?|github)\s+)*(?:\[[^\]]*\]\([^)]*\)|${brands})(?=$|[\s<([.!,:;/-])`, 'i');
const creditLabel = /(?:^|\n)\s*(?:co-authored-by|signed-off-by|generated-by|assisted-by|ai-attribution|ai-assisted-by)\s*:\s*([^\n]*)/gi;

function findViolation(text) {
    const normalized = text.normalize('NFKC')
        .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[*`]/g, '');
    for (const match of normalized.matchAll(creditLabel)) {
        if (namedAgent.test(match[1]) || agentAddress.test(match[1]) || /\b(?:AI|LLM)\b/i.test(match[1])) {
            return 'AI attribution trailer';
        }
    }
    // Product names alone are allowed: technical discussion is not attribution.
    for (const line of normalized.split(/\r?\n/)) {
        const plain = line.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '');
        if (credit.test(plain)) return 'AI generation or promotional credit';
        if (/^\s*(?:AI|LLM)[ -](?:generated|authored|assisted)(?:\s+(?:commit|PR|pull request|change|code))?\s*[.!]?\s*$/i.test(plain)) {
            return 'AI generation label';
        }
    }
    return null;
}

function git(args, options = {}) {
    return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options }).trim();
}

function checkCommits(shas) {
    for (const sha of shas) {
        const reason = findViolation(git(['show', '-s', '--format=%B', sha]));
        if (reason) throw new Error(`${reason} in commit ${sha}. Remove the credit before pushing.`);
    }
}

function checkPush(remote, input) {
    const zeros = /^0+$/;
    let remoteTips;
    for (const line of input.trim().split(/\r?\n/).filter(Boolean)) {
        const fields = line.split(/\s+/);
        if (fields.length !== 4) throw new Error('Malformed pre-push ref input.');
        const [, localSha, , remoteSha] = fields;
        if (zeros.test(localSha)) continue;
        if (!/^[a-f0-9]{40,64}$/i.test(localSha) || !/^[a-f0-9]{40,64}$/i.test(remoteSha)) {
            throw new Error('Invalid object ID in pre-push input.');
        }
        let exclusions;
        if (!zeros.test(remoteSha)) {
            exclusions = [remoteSha];
        } else {
            if (!remoteTips) {
                remoteTips = [...new Set(git(['ls-remote', '--heads', '--tags', remote])
                    .split('\n').filter(Boolean).map((ref) => ref.split(/\s+/)[0]))];
            }
            exclusions = remoteTips;
        }
        for (const sha of exclusions) {
            try {
                git(['cat-file', '-e', `${sha}^{commit}`], { stdio: ['ignore', 'pipe', 'pipe'] });
            } catch {
                throw new Error(`Remote history ${sha} is unavailable locally. Fetch the destination's branches and tags, then retry.`);
            }
        }
        const revisions = [localSha, ...exclusions.map((sha) => `^${sha}`)].join('\n') + '\n';
        const commits = git(['rev-list', '--stdin'], { input: revisions }).split('\n').filter(Boolean);
        checkCommits(commits);
    }
}

module.exports = { findViolation, checkPush, checkCommits };

if (require.main === module) {
    try {
        const [mode, arg] = process.argv.slice(2);
        if (mode === 'message') {
            if (!arg) throw new Error('A commit message file is required.');
            const reason = findViolation(fs.readFileSync(arg, 'utf8'));
            if (reason) throw new Error(reason);
        } else if (mode === 'push') {
            if (!arg) throw new Error('A push destination is required.');
            checkPush(arg, fs.readFileSync(0, 'utf8'));
        } else {
            throw new Error('Usage: ai-attribution.cjs message <file> | push <remote>');
        }
    } catch (error) {
        console.error(`ATTRIBUTION POLICY REJECTED: ${error.message}`);
        process.exitCode = 1;
    }
}
