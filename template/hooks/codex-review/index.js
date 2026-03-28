#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Environment variable toggle — exit early if not enabled
// Enable with: export CCSETUP_CODEX_REVIEW=1
const enabled = process.env.CCSETUP_CODEX_REVIEW;
if (!enabled || (enabled !== '1' && enabled.toLowerCase() !== 'true')) {
  console.log('{}');
  process.exit(0);
}

const PLAN_DIRS = ['plans'];
const PLAN_PATTERN = /plan.*\.md$/i;
const RECENCY_THRESHOLD_MS = 60 * 1000;

function findRecentlyModifiedPlans() {
  const now = Date.now();
  const recentPlans = [];

  for (const dir of PLAN_DIRS) {
    const fullDir = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullDir)) continue;

    try {
      const files = fs.readdirSync(fullDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = path.join(fullDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs < RECENCY_THRESHOLD_MS) {
          recentPlans.push(filePath);
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }

  // Also check for *plan*.md files in the project root
  try {
    const rootFiles = fs.readdirSync(process.cwd());
    for (const file of rootFiles) {
      if (PLAN_PATTERN.test(file)) {
        const filePath = path.join(process.cwd(), file);
        const stats = fs.statSync(filePath);
        if (stats.isFile() && now - stats.mtimeMs < RECENCY_THRESHOLD_MS) {
          recentPlans.push(filePath);
        }
      }
    }
  } catch (err) {
    // Skip if we can't read root
  }

  return recentPlans;
}

function hasGitChanges() {
  try {
    execSync('git diff HEAD --quiet', { stdio: 'pipe' });
    return false;
  } catch (err) {
    // Exit code 1 = diff found changes; other codes = command failed (e.g., no HEAD, not a repo)
    if (err.status === 1) return true;
    return false;
  }
}

// Main — reads from stdin as Claude Code provides
let inputData = '';

process.stdin.on('data', (chunk) => {
  inputData += chunk;
});

process.stdin.on('end', () => {
  try {
    const recentPlans = findRecentlyModifiedPlans();
    const gitChanges = hasGitChanges();
    let output = {};

    if (recentPlans.length > 0 && gitChanges) {
      const planNames = recentPlans.map(p => path.basename(p)).join(', ');
      output = {
        message: `Plan updated with code changes. Run /codex-review to validate implementation. (${planNames})`
      };
    } else if (recentPlans.length > 0) {
      const planNames = recentPlans.map(p => path.basename(p)).join(', ');
      output = {
        message: `Plan created. Run /codex-review for a second opinion from Codex CLI. (${planNames})`
      };
    } else if (gitChanges) {
      output = {
        message: `Code changes detected. Run /codex-review for a code review from Codex CLI.`
      };
    }

    console.log(JSON.stringify(output));
  } catch (error) {
    console.log('{}');
  }
});
