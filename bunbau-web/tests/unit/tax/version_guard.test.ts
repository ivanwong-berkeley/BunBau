import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../../');
const SRC = path.resolve(__dirname, '../../../src');

describe('Tax Expert & Milestone v7.1: Application, Build & Architecture Version Guard', () => {
  // Required version tracking enforcement:
  // "You also need to update the application version/build/architecture version for every iteration build."
  const EXPECTED_APP_VERSION = '2.7.16';
  const EXPECTED_BUILD_NUMBER = 'Build 131';
  const EXPECTED_ARCH_VERSION = 'v2.9.9 High-Visibility Tactile Sub-Navigation, Two-Tier Advisory Box Accessibility & Multi-Year Audit Report/Chart/Scroll Workstation Architecture';

  it('1. Enforces application version 2.7.16 in package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.version).toBe(EXPECTED_APP_VERSION);
  });

  it('2. Enforces application and architecture version in AboutModal.tsx', () => {
    const aboutModal = fs.readFileSync(path.join(SRC, 'components/AboutModal.tsx'), 'utf8');
    expect(aboutModal).toContain(EXPECTED_APP_VERSION);
    expect(aboutModal).toContain(EXPECTED_ARCH_VERSION);
  });

  it('3. Enforces version 2.7.15 (Build 130) in page.tsx header badge', () => {
    const page = fs.readFileSync(path.join(SRC, 'app/page.tsx'), 'utf8');
    expect(page).toContain(`v${EXPECTED_APP_VERSION} (${EXPECTED_BUILD_NUMBER})`);
  });

  it('4. Enforces Tax Expert navigation item and view container in page.tsx', () => {
    const page = fs.readFileSync(path.join(SRC, 'app/page.tsx'), 'utf8');
    // Navigation item
    expect(page).toContain("id: 'tax', label: 'Tax Expert'");
    // View mount
    expect(page).toContain("activeTab === 'tax' && !loading && <TaxExpertView />");
    // Component import
    expect(page).toContain("import { TaxExpertView } from '../components/tax/TaxExpertView';");
  });
});
