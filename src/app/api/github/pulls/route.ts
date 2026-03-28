import { auth, clerkClient } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { githubRateLimiter } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const rateLimitResult = githubRateLimiter.check(`github:pulls:${userId}`);
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
			`https://api.github.com/repos/${repo}/pulls?state=${state}&page=${page}&per_page=${perPage}&sort=updated&direction=desc`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/vnd.github.v3+json",
				},
			},
		);

		if (!response.ok) {
			return NextResponse.json(
				{ error: "Failed to fetch pull requests from GitHub" },
				{ status: response.status },
			);
		}

		const pulls = await response.json();

		const simplifiedPulls = pulls.map((pr: any) => ({
			number: pr.number,
			title: pr.title,
			state: pr.state,
			draft: pr.draft,
			created_at: pr.created_at,
			updated_at: pr.updated_at,
			closed_at: pr.closed_at,
			merged_at: pr.merged_at,
			labels: pr.labels.map((l: any) => ({
				name: l.name,
				color: l.color,
			})),
			user: {
				login: pr.user.login,
				avatar_url: pr.user.avatar_url,
			},
			head: {
				ref: pr.head.ref,
				sha: pr.head.sha,
			},
			base: {
				ref: pr.base.ref,
				sha: pr.base.sha,
			},
			comments: pr.comments,
			review_comments: pr.review_comments,
			commits: pr.commits,
			additions: pr.additions,
			deletions: pr.deletions,
			changed_files: pr.changed_files,
			body: pr.body,
			assignees: pr.assignees.map((a: any) => ({
				login: a.login,
				avatar_url: a.avatar_url,
			})),
			requested_reviewers: pr.requested_reviewers.map((r: any) => ({
				login: r.login,
				avatar_url: r.avatar_url,
			})),
		}));

		const linkHeader = response.headers.get("Link");

		return NextResponse.json({
			data: simplifiedPulls,
			pagination: {
				page: Number.parseInt(page),
				per_page: Number.parseInt(perPage),
				has_next: linkHeader?.includes('rel="next"') ?? false,
			},
		});
	} catch (error) {
		console.error("Error fetching pull requests:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
