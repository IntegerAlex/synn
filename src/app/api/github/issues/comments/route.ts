import { type NextRequest, NextResponse } from "next/server";
import { getGitHubAuth, githubFetch } from "@/lib/api/githubAuth";

/** GET /api/github/issues/comments - Get comments for an issue */
export async function GET(request: NextRequest) {
const authResult = await getGitHubAuth("issues:comments");
if ("error" in authResult && authResult.error) return authResult.error;
const { token } = authResult as { token: string };

const { searchParams } = new URL(request.url);
const repo = searchParams.get("repo");
const issueNumber = searchParams.get("issue_number");

if (!repo || !issueNumber) {
return NextResponse.json(
{ error: "Repository and issue_number required" },
{ status: 400 },
);
}

try {
const response = await githubFetch(
`https://api.github.com/repos/${repo}/issues/${issueNumber}/comments?per_page=100`,
token,
);

if (!response.ok) {
return NextResponse.json(
{ error: "Failed to fetch comments" },
{ status: response.status },
);
}

let comments: any[] = await response.json();

// Paginate remaining comments if there are more than 100
if (comments.length === 100) {
let page = 2;
const maxPages = 10; // Safety limit: max 1000 comments
while (page <= maxPages) {
const nextRes = await githubFetch(
`https://api.github.com/repos/${repo}/issues/${issueNumber}/comments?per_page=100&page=${page}`,
token,
);
if (!nextRes.ok) break;
const nextComments = await nextRes.json();
if (nextComments.length === 0) break;
comments = comments.concat(nextComments);
page++;
}
}

return NextResponse.json({
data: comments.map((c: any) => ({
id: c.id,
body: c.body,
created_at: c.created_at,
updated_at: c.updated_at,
user: {
login: c.user.login,
avatar_url: c.user.avatar_url,
},
})),
});
} catch (error) {
console.error("Error fetching comments:", error);
return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
}

/** POST /api/github/issues/comments - Add comment to an issue */
export async function POST(request: NextRequest) {
const authResult = await getGitHubAuth("issues:comment");
if ("error" in authResult && authResult.error) return authResult.error;
const { token } = authResult as { token: string };

try {
const body = await request.json();
const { repo, issue_number, body: commentBody } = body;

if (!repo || !issue_number || !commentBody) {
return NextResponse.json(
{ error: "Repository, issue_number, and body are required" },
{ status: 400 },
);
}

const response = await githubFetch(
`https://api.github.com/repos/${repo}/issues/${issue_number}/comments`,
token,
{
method: "POST",
body: JSON.stringify({ body: commentBody }),
},
);

if (!response.ok) {
const errorData = await response.json();
return NextResponse.json(
{ error: errorData.message || "Failed to add comment" },
{ status: response.status },
);
}

const comment = await response.json();
return NextResponse.json({
data: {
id: comment.id,
body: comment.body,
created_at: comment.created_at,
user: {
login: comment.user.login,
avatar_url: comment.user.avatar_url,
},
},
});
} catch (error) {
console.error("Error adding comment:", error);
return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
}
