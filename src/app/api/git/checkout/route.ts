import { NextResponse } from "next/server";
import { z } from "zod";
import { getGitHubService } from "@/lib/services/githubApiHelper";
import { formatErrorResponse } from "@/lib/utils/errorHandler";

const CheckoutSchema = z.object({
  branch: z.string().min(1, "Branch name is required"),
  repo_full_name: z.string().min(1, "Repository name is required"),
});

// POST /api/git/checkout - Checkout branch (switch default branch)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { branch, repo_full_name } = CheckoutSchema.parse(body);
    const githubService = await getGitHubService(repo_full_name);
    await githubService.checkoutBranch(branch);
    const info = await githubService.getRepoInfo();
    return NextResponse.json({ data: info, message: `Switched to ${branch}` });
  } catch (error) {
    const response = formatErrorResponse(error);
    return NextResponse.json(response, { status: 400 });
  }
}
