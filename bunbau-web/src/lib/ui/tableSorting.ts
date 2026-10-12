import { PositionAuditItem } from '../reports/reconciliationAuditor';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T = string> {
  key: T;
  direction: SortDirection;
}

/**
 * Smart sorting function for PositionAuditItems in Reconciliation Audit tables.
 * Default sort key is 'symbol' in 'asc' order.
 */
export function sortPositionAuditItems(
  items: PositionAuditItem[],
  sortKey: string,
  direction: SortDirection
): PositionAuditItem[] {
  return [...items].sort((a, b) => {
    let comparison = 0;

    switch (sortKey) {
      case 'symbol':
        comparison = a.symbol.localeCompare(b.symbol, undefined, { sensitivity: 'base' });
        break;

      case 'asset':
      case 'assetClass':
        comparison = (a.assetClass || '').localeCompare(b.assetClass || '', undefined, {
          sensitivity: 'base',
        });
        break;

      case 'status':
      case 'auditStatus': {
        // Discrepancies first in DESC, Matches first in ASC
        const statusWeight: Record<string, number> = {
          QUANTITY_MISMATCH: 4,
          VALUE_MISMATCH: 4,
          MISSING_IN_PORTFOLIO: 3,
          EXTRA_IN_PORTFOLIO: 3,
          OPTION_MISMATCH: 3,
          CASH_MISMATCH: 2,
          MATCHED: 1,
        };
        const weightA = statusWeight[a.status] || 0;
        const weightB = statusWeight[b.status] || 0;
        comparison = weightA - weightB;
        if (comparison === 0) {
          comparison = a.symbol.localeCompare(b.symbol, undefined, { sensitivity: 'base' });
        }
        break;
      }

      case 'statementQuantity': {
        const valA = a.statementQuantity !== undefined ? a.statementQuantity : -Infinity;
        const valB = b.statementQuantity !== undefined ? b.statementQuantity : -Infinity;
        comparison = valA - valB;
        break;
      }

      case 'portfolioQuantity': {
        const valA = a.portfolioQuantity !== undefined ? a.portfolioQuantity : -Infinity;
        const valB = b.portfolioQuantity !== undefined ? b.portfolioQuantity : -Infinity;
        comparison = valA - valB;
        break;
      }

      case 'statementValue': {
        const valA = a.statementValue !== undefined ? a.statementValue : -Infinity;
        const valB = b.statementValue !== undefined ? b.statementValue : -Infinity;
        comparison = valA - valB;
        break;
      }

      case 'portfolioValue': {
        const valA = a.portfolioValue !== undefined ? a.portfolioValue : -Infinity;
        const valB = b.portfolioValue !== undefined ? b.portfolioValue : -Infinity;
        comparison = valA - valB;
        break;
      }

      case 'notes':
      case 'auditNotes':
        comparison = (a.notes || '').localeCompare(b.notes || '', undefined, {
          sensitivity: 'base',
        });
        break;

      default:
        comparison = a.symbol.localeCompare(b.symbol, undefined, { sensitivity: 'base' });
        break;
    }

    return direction === 'asc' ? comparison : -comparison;
  });
}

/**
 * Generic Smart Sort for any tabular record array.
 */
export function sortGenericTable<T extends Record<string, any>>(
  rows: T[],
  key: string,
  direction: SortDirection
): T[] {
  return [...rows].sort((a, b) => {
    const valA = a[key];
    const valB = b[key];

    if (valA === undefined || valA === null) return direction === 'asc' ? 1 : -1;
    if (valB === undefined || valB === null) return direction === 'asc' ? -1 : 1;

    let comparison = 0;
    if (typeof valA === 'number' && typeof valB === 'number') {
      comparison = valA - valB;
    } else {
      comparison = String(valA).localeCompare(String(valB), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    }

    return direction === 'asc' ? comparison : -comparison;
  });
}
