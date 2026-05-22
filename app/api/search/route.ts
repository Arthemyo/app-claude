import { NextRequest, NextResponse } from 'next/server';
import { sanitizeQuery } from '@/lib/validation';
import { runSearch } from '@/lib/search';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('q') ?? '';
  const query = sanitizeQuery(raw);

  if (!query) {
    return NextResponse.json(
      { error: 'Invalid query', code: 'INVALID_QUERY' },
      { status: 400 }
    );
  }

  const response = await runSearch(query);
  return NextResponse.json(response);
}
