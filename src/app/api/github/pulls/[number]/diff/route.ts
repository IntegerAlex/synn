import { type NextRequest, NextResponse } from "next/server";
import { getGitHubAuth, githubFetch } from "@/lib/api/githubAuth";

/** GET /api/github/pulls/[number]/diff - Get the raw diff for a PR */
export async function GET(
request: NextRequest,
{ params }: { params: Promise<{ number: string }> },
) {
const authResult = await getGitHubAuth("pulls:diff");
if ("error" in authResult && authResult.error) return authResult.error;
const { token } = authResult as { token: string };

const { number } = await params;
const { searchParams } = new URL(request.url);
const repo = searchParams.get("repo");

if (!repo) {
return NextResponse.json({ error: "Repository required" }, { status: 400 });
}

try {
const response = await fetch(
`https://api.github.com/repos/${repo}/pulls/${number}`,
{
headers: {
Authorization: `Bearer ${token}`,
Accept: "application/vnd.github.v3.diff",
},
},
);

if (!response.ok) {
return NextResponse.json(
{ error: "Failed to fetch diff" },
{ status: response.status },
);
}

const diff = await response.text();
return NextResponse.json({ data: diff });
} catch (error) {
console.error("Error fetching PR diff:", error);
return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
}
