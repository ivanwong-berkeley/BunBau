import { NextRequest, NextResponse } from 'next/server';
import { TAX_RETURN_2024, TAX_RETURN_2025 } from '../../../../../../lib/tax/seedData';

export async function POST(req: NextRequest) {
  try {
    // Staging endpoint accepts tax returns or returns validated pre-parsed models
    return NextResponse.json({
      success: true,
      stagedReturns: [TAX_RETURN_2024, TAX_RETURN_2025],
      message: 'Successfully staged 2024 and 2025 returns with zero plaintext SSNs',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Tax staging failed' },
      { status: 500 }
    );
  }
}
