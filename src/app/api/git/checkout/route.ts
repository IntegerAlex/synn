import { NextResponse } from 'next/server';
import { z } from 'zod';
import { gitService } from '@/lib/git/GitService';
import { formatErrorResponse } from '@/lib/utils/errorHandler';

const CheckoutSchema = z.object({
    branch: z.string().min(1, 'Branch name is required'),
});

// POST /api/git/checkout - Checkout branch
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { branch } = CheckoutSchema.parse(body);
        await gitService.checkoutBranch(branch);
        const info = await gitService.getRepoInfo();
        return NextResponse.json({ data: info, message: `Checked out ${branch}` });
    } catch (error) {
        const response = formatErrorResponse(error);
        return NextResponse.json(response, { status: 400 });
    }
}
