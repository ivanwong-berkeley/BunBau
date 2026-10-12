import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { builtinModules } from 'module';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const declared = new Set<string>([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]);
const builtins = new Set<string>([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);
// Next.js provides these at build time without a package.json entry of their own.
const PROVIDED = new Set(['next', 'react', 'react-dom']);

function walk(dir: string, out: string[] = []): string[] {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

function pkgName(spec: string): string {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

describe('T1 dependency guard', () => {
  it('every bare import in src/** is declared in package.json', () => {
    const missing = new Set<string>();
    const re = /(?:import|export)\s+(?:[^'"`;]*?\sfrom\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;
    for (const file of walk(SRC)) {
      const text = fs.readFileSync(file, 'utf8');
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        const spec = m[1] || m[2] || m[3];
        if (!spec || spec.startsWith('.') || spec.startsWith('@/') || spec.startsWith('/') || builtins.has(spec)) continue;
        const name = pkgName(spec);
        if (!declared.has(name) && !PROVIDED.has(name)) missing.add(`${name}  (${path.relative(ROOT, file)})`);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it('the new markdown packages are declared and locked', () => {
    expect(declared.has('react-markdown')).toBe(true);
    expect(declared.has('remark-gfm')).toBe(true);
    const lock = fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8');
    expect(lock).toContain('"node_modules/react-markdown"');
    expect(lock).toContain('"node_modules/remark-gfm"');
  });
});

describe('T2 ensure-deps.sh', () => {
  const script = path.join(ROOT, 'scripts/ensure-deps.sh');
  const setup = (lock = '{"a":1}') => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ensure-deps-'));
    fs.writeFileSync(path.join(d, 'package-lock.json'), lock);
    return d;
  };
  const run = (cwd: string, npm: string) => spawnSync('sh', [script], { cwd, env: { ...process.env, NPM_CMD: npm }, encoding: 'utf8' });

  it('installs when the stamp is missing, then skips when unchanged', () => {
    const d = setup();
    fs.mkdirSync(path.join(d, 'node_modules'));
    const first = run(d, 'echo FAKE-INSTALL');
    expect(first.status).toBe(0);
    expect(first.stdout).toContain('FAKE-INSTALL');
    expect(fs.existsSync(path.join(d, 'node_modules/.lock-hash'))).toBe(true);
    const second = run(d, 'echo FAKE-INSTALL');
    expect(second.stdout).toContain('up to date');
    expect(second.stdout).not.toContain('FAKE-INSTALL');
  });

  it('installs again when package-lock.json changes', () => {
    const d = setup();
    fs.mkdirSync(path.join(d, 'node_modules'));
    run(d, 'echo X');
    fs.writeFileSync(path.join(d, 'package-lock.json'), '{"a":2}');
    const r = run(d, 'echo REINSTALL');
    expect(r.stdout).toContain('REINSTALL');
  });

  it('a failed install exits non-zero and writes no stamp', () => {
    const d = setup();
    const r = run(d, 'false');
    expect(r.status).not.toBe(0);
    expect(fs.existsSync(path.join(d, 'node_modules/.lock-hash'))).toBe(false);
  });

  it('fails clearly without a lockfile', () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ensure-deps-'));
    const r = run(d, 'echo X');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('package-lock.json not found');
  });

  it('the Docker dev target runs the entrypoint', () => {
    const df = fs.readFileSync(path.join(ROOT, 'Dockerfile'), 'utf8');
    expect(df).toContain('scripts/dev-entrypoint.sh');
    expect(fs.readFileSync(path.join(ROOT, 'scripts/dev-entrypoint.sh'), 'utf8')).toContain('ensure-deps.sh');
  });
});
