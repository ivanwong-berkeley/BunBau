import { Position, RiskTolerance } from './models';

export interface StrategyRecommendation {
  action: string;
  rationale: string;
  estimatedApyImpact: number;
}

export interface YieldAnalysis {
  currentBlendedApy: number;
  targetApy: number;
  gap: number;
  recommendations: StrategyRecommendation[];
}

export function analyzeYieldGap(
  positions: Position[],
  targetApy: number,
  riskTolerance: RiskTolerance
): YieldAnalysis {
  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  if (totalValue === 0) return { currentBlendedApy: 0, targetApy, gap: targetApy, recommendations: [] };

  const totalAnnualYield = positions.reduce((sum, p) => {
    return sum + (p.currentValue * (p.apy || 0) / 100);
  }, 0);

  const currentBlendedApy = (totalAnnualYield / totalValue) * 100;
  const gap = targetApy - currentBlendedApy;

  const recommendations: StrategyRecommendation[] = [];

  const cashPositions = positions.filter(p => p.category === 'Cash');
  const totalCash = cashPositions.reduce((sum, p) => sum + p.currentValue, 0);
  const cashDragRatio = totalCash / totalValue;

  if (cashDragRatio > 0.05) {
    if (riskTolerance === 'Conservative') {
      recommendations.push({
        action: 'Deploy Excess Cash into Brokered CDs & SGOV',
        rationale: 'You have significant cash drag. Moving cash to safe fixed-income assets can instantly bump yield with minimal risk.',
        estimatedApyImpact: cashDragRatio * 4.5, 
      });
    } else if (riskTolerance === 'Moderate') {
      recommendations.push({
        action: 'Deploy Excess Cash into SGOV & Dividend ETFs',
        rationale: 'Blend safe Treasury yields with stable dividend payers to bridge the yield gap without excessive volatility.',
        estimatedApyImpact: cashDragRatio * 6.0,
      });
    } else {
      recommendations.push({
        action: 'Write Cash-Secured Puts (CSPs) on High-Conviction Equities',
        rationale: 'Utilize idle cash as collateral to generate elevated premium income.',
        estimatedApyImpact: cashDragRatio * 12.0,
      });
    }
  }

  if (gap > 2) {
    if (riskTolerance === 'Conservative') {
      recommendations.push({
        action: 'Implement Low-Delta Covered Calls on Broad Market Indexes',
        rationale: 'Generate additional yield with minimal risk of shares being called away.',
        estimatedApyImpact: 1.5,
      });
    } else if (riskTolerance === 'Moderate') {
      recommendations.push({
        action: 'Rotate Matured CDs into Higher-Yield Corporate Bond ETFs and Delta 0.2 Covered Calls',
        rationale: 'Take slightly more credit and equity risk to close the yield gap.',
        estimatedApyImpact: 3.0,
      });
    } else {
      recommendations.push({
        action: 'Tactical Covered Calls (Delta 0.3) & Credit Spreads',
        rationale: 'Aggressively monetize equity positions through options premiums.',
        estimatedApyImpact: 5.0,
      });
    }
  }

  return {
    currentBlendedApy: Number(currentBlendedApy.toFixed(2)),
    targetApy,
    gap: Number(gap.toFixed(2)),
    recommendations,
  };
}
