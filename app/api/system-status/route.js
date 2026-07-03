import { NextResponse } from 'next/server';
import { getAllowedUser } from '@/lib/user';
import { checkStatus } from '@/lib/status';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getAllowedUser();
  if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  return NextResponse.json(await checkStatus());
}
