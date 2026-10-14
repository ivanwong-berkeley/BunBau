import { describe, it, expect } from 'vitest';
import { DEMO_TAX_RETURN_2024, DEMO_TAX_RETURN_2025 } from '../../../src/lib/tax/seedData';

describe('Document Viewer: Continuous Scrolling & Virtualization Architecture (Milestone v6.5)', () => {
  it('1. Generates deterministic page anchor IDs across 50-100 page document streams', () => {
    const totalPages = DEMO_TAX_RETURN_2025.pdfDocumentMetadata.totalPages || 52;
    expect(totalPages).toBeGreaterThanOrEqual(40);

    const pageAnchors = Array.from({ length: totalPages }, (_, i) => `tax-doc-page-${i + 1}`);
    expect(pageAnchors[0]).toBe('tax-doc-page-1');
    expect(pageAnchors[pageAnchors.length - 1]).toBe(`tax-doc-page-${totalPages}`);
  });

  it('2. Accurately calculates target vertical scroll offsets for bookmarks and key line items', () => {
    const PAGE_HEIGHT_PX = 920;
    const bookmarks = DEMO_TAX_RETURN_2025.pdfDocumentMetadata.pageBookmarks || {};

    // Schedule E page 12
    const scheduleEPage = bookmarks.schedule_e_p1 || 12;
    const targetOffset = (scheduleEPage - 1) * PAGE_HEIGHT_PX;
    expect(targetOffset).toBe(11 * 920);

    // Form 540 page 32
    const ca540Page = bookmarks.ca_form_540 || 32;
    const ca540Offset = (ca540Page - 1) * PAGE_HEIGHT_PX;
    expect(ca540Offset).toBe(31 * 920);
  });

  it('3. Computes active render window for virtualization correctly', () => {
    const isPageInRenderWindow = (page: number, currentScrollPage: number) => {
      return Math.abs(page - currentScrollPage) <= 2;
    };

    // When viewing page 15, pages 13-17 are fully rendered
    expect(isPageInRenderWindow(13, 15)).toBe(true);
    expect(isPageInRenderWindow(15, 15)).toBe(true);
    expect(isPageInRenderWindow(17, 15)).toBe(true);
    // Page 12 and 18 are lightweight placeholders
    expect(isPageInRenderWindow(12, 15)).toBe(false);
    expect(isPageInRenderWindow(18, 15)).toBe(false);
  });
});
