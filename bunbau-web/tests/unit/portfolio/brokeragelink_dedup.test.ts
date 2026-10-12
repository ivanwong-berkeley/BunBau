import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { FidelityCSVAdapter } from '../../../src/lib/ingestion/adapters/fidelityAdapter';
import { parseFilenameMetadata } from '../../../src/lib/ingestion/filenameParser';
import { reconcileLinkedSubAccounts } from '../../../src/lib/ingestion/reconcile';

describe('Oracle 401(k) and BrokerageLink Sub-Account Reconciliation (Zero Doubling)', () => {
  const oracleFile = path.resolve(__dirname, '../../fixtures/real_uploads/Fidelity/CSV/Fidelity_ORACLE-401K_35004_Portfolio_Positions_Oct-07-2026.csv');
  const brokerageLinkFile = path.resolve(__dirname, '../../fixtures/real_uploads/Fidelity/CSV/Fidelity_ORACLE-401K-BrokerageLink_652716847_Portfolio_Positions_Oct-07-2026.csv');

  it('keeps BROKERAGELINK container line when Oracle 401(k) is ingested alone', () => {
    const rawOracle = fs.readFileSync(oracleFile, 'utf-8');
    const metaOracle = parseFilenameMetadata('Fidelity_ORACLE-401K_35004_Portfolio_Positions_Oct-07-2026.csv');
    const adapter = new FidelityCSVAdapter();
    const result = adapter.parse(rawOracle, 'demo-user', metaOracle);

    expect(result.accounts.length).toBe(1);
    const oracleAcc = result.accounts[0];
    expect(oracleAcc.accountType).toBe('401(k)');
    expect(oracleAcc.totalValue).toBeCloseTo(785775.68, 2);

    // Reconcile alone -> container remains
    const reconciled = reconcileLinkedSubAccounts([oracleAcc]);
    expect(reconciled[0].totalValue).toBeCloseTo(785775.68, 2);
    expect(reconciled[0].positions.some(p => p.symbol === 'BROKERAGELINK')).toBe(true);
  });

  it('reconciles Oracle 401(k) + BrokerageLink together without double-counting', () => {
    const rawOracle = fs.readFileSync(oracleFile, 'utf-8');
    const metaOracle = parseFilenameMetadata('Fidelity_ORACLE-401K_35004_Portfolio_Positions_Oct-07-2026.csv');
    const rawLink = fs.readFileSync(brokerageLinkFile, 'utf-8');
    const metaLink = parseFilenameMetadata('Fidelity_ORACLE-401K-BrokerageLink_652716847_Portfolio_Positions_Oct-07-2026.csv');

    const adapter = new FidelityCSVAdapter();
    const resOracle = adapter.parse(rawOracle, 'demo-user', metaOracle);
    const resLink = adapter.parse(rawLink, 'demo-user', metaLink);

    const oracleAcc = resOracle.accounts[0];
    const linkAcc = resLink.accounts[0];

    expect(oracleAcc.totalValue).toBeCloseTo(785775.68, 2);
    expect(linkAcc.totalValue).toBeCloseTo(600322.83, 2);

    // Reconcile together
    const reconciled = reconcileLinkedSubAccounts([oracleAcc, linkAcc]);
    expect(reconciled.length).toBe(2);

    const reconciledOracle = reconciled.find(a => a.accountMaskedNumber.includes('5004'));
    const reconciledLink = reconciled.find(a => a.accountMaskedNumber.includes('6847'));

    expect(reconciledOracle).toBeDefined();
    expect(reconciledLink).toBeDefined();

    // BROKERAGELINK container position is superseded in Oracle 401(k)
    expect(reconciledOracle?.positions.some(p => p.symbol === 'BROKERAGELINK')).toBe(false);
    expect(reconciledOracle?.totalValue).toBeCloseTo(184707.68, 2);

    // Combined total is strictly $184k core + $601k sub = ~$785k (NOT $1.38M!)
    const combinedTotal = (reconciledOracle?.totalValue || 0) + (reconciledLink?.totalValue || 0);
    expect(combinedTotal).toBeCloseTo(785030.51, 0); // Within minor price rounding, ~785k
    expect(combinedTotal).toBeLessThan(800000); // Guarantees zero double counting to 1.38M!
  });
});
