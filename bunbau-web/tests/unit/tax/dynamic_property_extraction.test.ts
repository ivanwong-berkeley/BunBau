import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { sanitizeStoredTaxReturn } from '../../../src/lib/tax/taxStore';
import { generateSyntheticTaxReturnForYear } from '../../../src/lib/tax/seedData';

const SRC = path.resolve(__dirname, '../../../src');

describe('Milestone v7.2: Pure Dynamic Schedule E Real Property Extraction & Zero Hardcoding Guarantee', () => {
  it('1. Enforces ZERO occurrences of 742 Evergreen Terrace across entire src/ directory', () => {
    function searchDir(dir: string): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(searchDir(fullPath));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('742 Evergreen')) {
            results.push(fullPath);
          }
        }
      }
      return results;
    }

    const matches = searchDir(SRC);
    expect(matches).toEqual([]);
  });

  it('2. Enforces pure dynamic extraction from taxReturn.federal.rentalProperties in TaxSingleFormViewer.tsx', () => {
    const singleViewerCode = fs.readFileSync(path.join(SRC, 'components/tax/TaxSingleFormViewer.tsx'), 'utf8');
    // Ensure it binds to rentalProperties
    expect(singleViewerCode).toContain('const rentalProperties = taxReturn?.federal?.rentalProperties || [];');
    expect(singleViewerCode).toContain('rentalProperties.map(');
    expect(singleViewerCode).toContain('prop.address');

    // Ensure ZERO hardcoded address fallbacks exist in TaxSingleFormViewer.tsx
    expect(singleViewerCode).not.toContain('742 Evergreen');
    expect(singleViewerCode).not.toContain("'3343 Los Prados'");
    expect(singleViewerCode).not.toContain('"3343 Los Prados"');
  });

  it('3. Enforces pure dynamic extraction from activeReturn?.federal?.rentalProperties in OriginalTaxPdfViewerModal.tsx', () => {
    const originalPdfModalCode = fs.readFileSync(path.join(SRC, 'components/tax/OriginalTaxPdfViewerModal.tsx'), 'utf8');
    expect(originalPdfModalCode).toContain('const rentalProperties = activeReturn?.federal?.rentalProperties || [];');
    expect(originalPdfModalCode).toContain('rentalProperties.map(');
    expect(originalPdfModalCode).toContain('prop.address');

    // Ensure ZERO hardcoded address fallbacks exist in OriginalTaxPdfViewerModal.tsx
    expect(originalPdfModalCode).not.toContain('742 Evergreen');
    expect(originalPdfModalCode).not.toContain("'3343 Los Prados'");
    expect(originalPdfModalCode).not.toContain('"3343 Los Prados"');
  });

  it('4. Enforces pure dynamic extraction in PortfolioTaxStrategyCard.tsx', () => {
    const portfolioStrategyCode = fs.readFileSync(path.join(SRC, 'components/tax/PortfolioTaxStrategyCard.tsx'), 'utf8');
    expect(portfolioStrategyCode).toContain('rentalPropertyAddress');
    expect(portfolioStrategyCode).not.toContain('742 Evergreen');
  });

  it('5. Verifies sanitizeStoredTaxReturn cleanses legacy 742 Evergreen addresses in stored data', () => {
    const legacyReturn = generateSyntheticTaxReturnForYear(2025);
    // Inject legacy mock address to simulate legacy cached data
    legacyReturn.federal.rentalProperties = [
      {
        propertyId: 'prop-1',
        address: '742 Evergreen Terrace, San Francisco, CA 94107',
        propertyType: 'single_family',
        grossRents: 68400,
        totalExpenses: 89400,
        netRentalIncome: -21000,
        depreciationDeduction: 28400,
        daysRented: 365,
        daysPersonalUse: 0,
      },
    ];

    const sanitized = sanitizeStoredTaxReturn(legacyReturn);
    expect(sanitized.federal.rentalProperties[0].address).toBe('3343 Los Prados, San Mateo, CA 94403');
    expect(JSON.stringify(sanitized)).not.toContain('742 Evergreen');
  });
});
