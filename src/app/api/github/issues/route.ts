import { auth, clerkClient } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { githubRateLimiter } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const rateLimitResult = githubRateLimiter.check(`github:issues:${userId}`);
	if (!rateLimitResult.success) {
		return NextResponse.json(
			{ error: { code: "RATE_LIMIT_EXCEEDED", message: "Rate limit exceeded" } },
			{ status: 429 },
		);
	}

	const client = await clerkClient();
	const tokenResponse = await client.users.getUserOauthAccessToken(userId, "github");
	const token = tokenResponse.data[0]?.token;

	if (!token) {
		return NextResponse.json({ error: "GitHub token not found" }, { status: 400 });
	}

	const { searchParams } = new URL(request.url);
	const repo = searchParams.get("repo");
	const state = searchParams.get("state") || "open";
	const page = searchParams.get("page") || "1";
	const perPage = searchParams.get("per_page") || "30";

	if (!repo) {
		return NextResponse.json({ error: "Repository required" }, { status: 400 });
	}

	try {
		const response = await fetch(
			`https://api.github.com/repos/${repo}/issues?state=${state}&page=${page}&per_page=${perPage}&sort=updated&direction=desc`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/vnd.github.v3+json",
				},
			},
		);

		if (!response.ok) {
			return NextResponse.json(
				{ error: "Failed to fetch issues from GitHub" },
				{ status: response.status },
			);
		}

		const issues = await response.json();

		// Filter out pull requests (GitHub API returns PRs as issues too)
		const filteredIssues = issues
			.filter((issue: any) => !issue.pull_request)
			.map((issue: any) => ({
				number: issue.number,
				title: issue.title,
				state: issue.state,
				created_at: issue.created_at,
				updated_at: issue.updated_at,
				closed_at: issue.closed_at,
				labels: issue.labels.map((l: any) => ({
					name: l.name,
					color: l.color,
				})),
				user: {
					login: issue.user.login,
					avatar_url: issue.user.avatar_url,
				},
				comments: issue.comments,
				body: issue.body,
				assignees: issue.assignees.map((a: any) => ({
					login: a.login,
					avatar_url: a.avatar_url,
				})),
			}));

		const linkHeader = response.headers.get("Link");
		const totalCount = response.headers.get("X-Total-Count");

		return NextResponse.json({
			data: filteredIssues,
			pagination: {
				page: Number.parseInt(page),
				per_page: Number.parseInt(perPage),
				has_next: linkHeader?.includes('rel="next"') ?? false,
				total_count: totalCount ? Number.parseInt(totalCount) : undefined,
			},
		});
	} catch (error) {
		console.error("Error fetching issues:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
