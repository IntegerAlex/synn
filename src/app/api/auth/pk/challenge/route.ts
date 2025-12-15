import { NextResponse } from 'next/server';
import { createChallenge } from '@/lib/utils/pkAuth';

export async function GET() {
  const { id, challenge, expiresAt } = createChallenge();
  return NextResponse.json({ challengeId: id, challenge, expiresAt }, { status: 200 });
}

