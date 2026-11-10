#!/usr/bin/env node
/**
 * Cross-platform k6 runner utility for NAVRIX performance test suites.
 * Automatically resolves k6 binary path on Windows, Linux, and macOS.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findK6Binary() {
  // 1. Check if k6 is directly in PATH
  const checkPath = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['k6'], {
    encoding: 'utf8',
  });
  if (checkPath.status === 0 && checkPath.stdout.trim()) {
    return 'k6';
  }

  // 2. Check common Windows paths
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\k6\\k6.exe',
      'C:\\Program Files (x86)\\k6\\k6.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'k6', 'k6.exe'),
      path.join(process.env.USERPROFILE || '', 'scoop', 'shims', 'k6.exe'),
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }
  }

  return null;
}

const k6Bin = findK6Binary();

if (!k6Bin) {
  console.error('\n❌ Error: k6 binary was not found on your system.');
  console.error('\nTo install k6 on Windows:');
  console.error('  • Via winget: winget install --id GrafanaLabs.k6');
  console.error('  • Via Chocolatey: choco install k6');
  console.error('  • Direct download: https://k6.io/docs/get-started/installation/\n');
  process.exit(1);
}

const args = process.argv.slice(2);
const scriptName = args[0] || 'health-test.js';
const extraArgs = args.slice(1);

const scriptPath = path.isAbsolute(scriptName)
  ? scriptName
  : path.join(__dirname, 'k6', scriptName);

if (!fs.existsSync(scriptPath)) {
  console.error(`\n❌ Error: Test script not found at ${scriptPath}\n`);
  process.exit(1);
}

const k6Args = ['run', scriptPath, ...extraArgs];

console.log(`\n🚀 Executing k6 performance test: ${path.basename(scriptPath)}`);
console.log(`   Binary : ${k6Bin}`);
console.log(`   Command: ${k6Bin} ${k6Args.join(' ')}\n`);

const child = spawnSync(k6Bin, k6Args, {
  stdio: 'inherit',
  env: process.env,
});

process.exit(child.status !== null ? child.status : 1);
