import { describe, it, expect } from 'vitest';
import {
  orderScreenshotsInDataset,
  extractSequenceNumber,
} from '../../../src/lib/portfolio/webullStitching';

describe('WeBull Screenshot Dataset Sequencing & Natural Ordering', () => {
  it('extracts sequence numbers accurately from standardized filenames', () => {
    expect(extractSequenceNumber({ fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6696_20261007.png' })).toBe(6696);
    expect(extractSequenceNumber({ fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6699_20261007.png' })).toBe(6699);
    expect(extractSequenceNumber({ fileName: 'Webull_Rollover-IRA_CVS8QSX4_IMG_6700_20261007.png' })).toBe(6700);
    expect(extractSequenceNumber({ fileName: 'Webull_Rollover-IRA_CVS8QSX4_IMG_6703_20261007.png' })).toBe(6703);
    expect(extractSequenceNumber({ imageSeq: 'IMG_6701' })).toBe(6701);
  });

  it('orders randomly shuffled screenshots into their exact ascending natural sequence', () => {
    const shuffledScreenshots = [
      { fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6699_20261007.png', tag: 'Bottom' },
      { fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6696_20261007.png', tag: 'Top' },
      { fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6698_20261007.png', tag: 'Mid2' },
      { fileName: 'Webull_Individual-Cash_CUX5XLW4_IMG_6697_20261007.png', tag: 'Mid1' },
    ];

    const ordered = orderScreenshotsInDataset(shuffledScreenshots);

    expect(ordered.map((s) => s.tag)).toEqual(['Top', 'Mid1', 'Mid2', 'Bottom']);
    expect(ordered[0].fileName).toContain('IMG_6696');
    expect(ordered[1].fileName).toContain('IMG_6697');
    expect(ordered[2].fileName).toContain('IMG_6698');
    expect(ordered[3].fileName).toContain('IMG_6699');
  });

  it('anchors overview screenshot with Net Account Value or My Positions first even if unordered', () => {
    const items = [
      {
        fileName: 'screen_scrolled_middle.png',
        netAccountValue: undefined,
        myPositionsCount: undefined,
      },
      {
        fileName: 'screen_overview_top.png',
        netAccountValue: 59148.0,
        myPositionsCount: 21,
      },
      {
        fileName: 'screen_scrolled_end.png',
        netAccountValue: undefined,
        myPositionsCount: undefined,
      },
    ];

    const ordered = orderScreenshotsInDataset(items);

    expect(ordered[0].fileName).toBe('screen_overview_top.png');
    expect(ordered[0].netAccountValue).toBe(59148.0);
  });
});
