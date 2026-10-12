import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Scrollable Table Containers & Sticky Headers (v2.7)', () => {
  const componentsDir = path.resolve(__dirname, '../../src/components');

  it('TEST-UX-01: EquitiesTable has max-h scrollable container and sticky header', () => {
    const content = fs.readFileSync(path.join(componentsDir, 'EquitiesTable.tsx'), 'utf-8');
    expect(content).toContain('max-h-[300px]');
    expect(content).toContain('overflow-y-auto');
    expect(content).toContain('sticky top-0');
  });

  it('TEST-UX-02: ActiveOptionsTable has max-h scrollable container and sticky header', () => {
    const content = fs.readFileSync(path.join(componentsDir, 'ActiveOptionsTable.tsx'), 'utf-8');
    expect(content).toContain('max-h-[300px]');
    expect(content).toContain('overflow-y-auto');
    expect(content).toContain('sticky top-0');
  });

  it('TEST-UX-03: AssetAllocationTable has max-h scrollable container and sticky header', () => {
    const content = fs.readFileSync(path.join(componentsDir, 'DashboardCharts.tsx'), 'utf-8');
    expect(content).toContain('max-h-[300px]');
    expect(content).toContain('overflow-y-auto');
    expect(content).toContain('sticky top-0');
  });

  it('TEST-UX-04: CalendarView table representations have max-h scrollable container and sticky header', () => {
    const content = fs.readFileSync(path.join(componentsDir, 'CalendarView.tsx'), 'utf-8');
    expect(content).toContain('max-h-[340px]');
    expect(content).toContain('overflow-y-auto');
    expect(content).toContain('sticky top-0');
  });
});
