import { NextResponse } from 'next/server';
import { clearPkToken } from '@/lib/utils/pkAuth';

export async function POST() {
  const res = NextResponse.json({ success: true }, { status: 200 });
  clearPkToken(res);
  return res;
}

