export type OptionUrgency = 'urgent' | 'soon' | 'safe' | 'pending';

export interface OptionMoneynessResult {
  moneynessPct: number;
  isItm: boolean;
  urgency: OptionUrgency;
  badgeLabel: string;
  marketPrice: number;
  strike: number;
}

/**
 * Calculates moneyness and GYR alert urgency for options:
 * - CSP (Cash-Secured Put / Short Put):
 *   - ITM if market <= strike -> Urgent (RED)
 *   - Cushion % = (market - strike) / strike * 100
 *   - <= 2% -> Urgent (RED)
 *   - 2% to 5% -> Approaching (YELLOW)
 *   - > 5% -> Safe OTM (GREEN)
 *
 * - Covered Call (Short Call):
 *   - ITM if market >= strike -> Urgent (RED - shares will be called away)
 *   - Buffer % = (strike - market) / strike * 100
 *   - <= 2% -> Urgent (RED)
 *   - 2% to 5% -> Approaching (YELLOW)
 *   - > 5% -> Safe OTM (GREEN)
 */
export function calculateOptionMoneyness(
  optionType: 'CSP' | 'CoveredCall' | string,
  strike: number,
  marketPrice: number
): OptionMoneynessResult {
  if (!strike || strike <= 0 || !marketPrice || marketPrice <= 0 || isNaN(marketPrice)) {
    return {
      moneynessPct: 0,
      isItm: false,
      urgency: 'pending',
      badgeLabel: 'Quote Pending',
      marketPrice: marketPrice || 0,
      strike: strike || 0,
    };
  }

  const isCsp = optionType === 'CSP';

  if (isCsp) {
    if (marketPrice <= strike) {
      const itmPct = ((strike - marketPrice) / strike) * 100;
      return {
        moneynessPct: Number(itmPct.toFixed(2)),
        isItm: true,
        urgency: 'urgent',
        badgeLabel: itmPct === 0 ? 'ATM (At-The-Money)' : `ITM (${itmPct.toFixed(1)}% In-The-Money)`,
        marketPrice,
        strike,
      };
    }

    const cushionPct = ((marketPrice - strike) / strike) * 100;
    const rounded = Number(cushionPct.toFixed(2));
    if (cushionPct <= 2.0) {
      return {
        moneynessPct: rounded,
        isItm: false,
        urgency: 'urgent',
        badgeLabel: `${rounded.toFixed(1)}% buffer (Urgent)`,
        marketPrice,
        strike,
      };
    }
    if (cushionPct <= 5.0) {
      return {
        moneynessPct: rounded,
        isItm: false,
        urgency: 'soon',
        badgeLabel: `${rounded.toFixed(1)}% buffer (Approaching)`,
        marketPrice,
        strike,
      };
    }
    return {
      moneynessPct: rounded,
      isItm: false,
      urgency: 'safe',
      badgeLabel: `+${rounded.toFixed(1)}% cushion (Safe OTM)`,
      marketPrice,
      strike,
    };
  } else {
    // Covered Call
    if (marketPrice >= strike) {
      const itmPct = ((marketPrice - strike) / strike) * 100;
      return {
        moneynessPct: Number(itmPct.toFixed(2)),
        isItm: true,
        urgency: 'urgent',
        badgeLabel: itmPct === 0 ? 'ATM (At-The-Money)' : `ITM (${itmPct.toFixed(1)}% In-The-Money)`,
        marketPrice,
        strike,
      };
    }

    const bufferPct = ((strike - marketPrice) / strike) * 100;
    const rounded = Number(bufferPct.toFixed(2));
    if (bufferPct <= 2.0) {
      return {
        moneynessPct: rounded,
        isItm: false,
        urgency: 'urgent',
        badgeLabel: `${rounded.toFixed(1)}% buffer (Urgent)`,
        marketPrice,
        strike,
      };
    }
    if (bufferPct <= 5.0) {
      return {
        moneynessPct: rounded,
        isItm: false,
        urgency: 'soon',
        badgeLabel: `${rounded.toFixed(1)}% buffer (Approaching)`,
        marketPrice,
        strike,
      };
    }
    return {
      moneynessPct: rounded,
      isItm: false,
      urgency: 'safe',
      badgeLabel: `+${rounded.toFixed(1)}% buffer (Safe OTM)`,
      marketPrice,
      strike,
    };
  }
}
