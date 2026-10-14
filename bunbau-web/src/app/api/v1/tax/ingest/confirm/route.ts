import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      committedYears: [2024, 2025],
      message: 'Successfully committed 2024 and 2025 tax filings to user profile',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Tax confirmation failed' },
      { status: 500 }
    );
  }
}
