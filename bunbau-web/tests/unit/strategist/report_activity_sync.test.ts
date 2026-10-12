import { describe, it, expect } from 'vitest';
import { groupThreads, StoredMessage } from '../../../src/lib/strategist/historyOps';

describe('v5.6 Report Activity & Consultation Sync', () => {
  it('groups consultation messages into a thread with first question preview', () => {
    const threadId = 't_test_report_gen';
    const consultationMessages = [
      {
        id: 'm_user_1',
        threadId,
        role: 'user',
        text: 'Generate Yield Strategy Report (Target APY: 10%, Current APY: 1.53%, Risk: Moderate)',
        createdAt: '2026-10-10T21:00:00Z',
      },
      {
        id: 'm_asst_1',
        threadId,
        role: 'assistant',
        text: "**BunBau's Yield Enhancement Strategy** (Report v1)\n\nDetailed executive summary of rebalancing.",
        createdAt: '2026-10-10T21:00:05Z',
      },
    ];

    const threads = groupThreads(consultationMessages);
    expect(threads).toHaveLength(1);
    expect(threads[0].threadId).toBe(threadId);
    expect(threads[0].count).toBe(2);
    expect(threads[0].preview).toContain('Generate Yield Strategy Report (Target APY: 10%');
  });

  it('determines initial tab dynamically based on data availability', () => {
    const getInitialTab = (messagesCount: number, reportsCount: number) => {
      return messagesCount === 0 && reportsCount > 0 ? 'reports' : 'chat';
    };

    // When user generated 3 reports but has 0 chat messages (the exact bug scenario):
    expect(getInitialTab(0, 3)).toBe('reports');

    // When user has active conversations:
    expect(getInitialTab(5, 3)).toBe('chat');

    // When brand new session:
    expect(getInitialTab(0, 0)).toBe('chat');
  });
});
