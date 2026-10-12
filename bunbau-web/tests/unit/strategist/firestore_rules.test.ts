import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('v5.4 Firestore Security Rules Verification', () => {
  const rulesPath = path.resolve(__dirname, '../../../firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  it('contains rules_version = 2', () => {
    expect(rulesContent).toContain("rules_version = '2'");
  });

  it('protects root user document by request.auth.uid == userId', () => {
    expect(rulesContent).toMatch(/match \/users\/\{userId\}\s*\{[\s\S]*?allow read, write: if request\.auth != null && request\.auth\.uid == userId;/);
  });

  it('covers strategyMessages subcollection', () => {
    expect(rulesContent).toContain('match /strategyMessages/{messageId}');
  });

  it('covers strategyReports subcollection', () => {
    expect(rulesContent).toContain('match /strategyReports/{reportId}');
  });

  it('covers strategyMemory subcollection', () => {
    expect(rulesContent).toContain('match /strategyMemory/{memoryId}');
  });

  it('contains recursive wildcard catch-all for user subcollections', () => {
    expect(rulesContent).toContain('match /{allSubcollections=**}');
  });

  it('preserves immutable snapshots rule', () => {
    expect(rulesContent).toContain('match /snapshots/{snapshotId}');
    expect(rulesContent).toContain('allow update: if false;');
  });
});
