import { type NextRequest, NextResponse } from "next/server";
import { getGitHubAuth, githubFetch } from "@/lib/api/githubAuth";

/** POST /api/github/pulls/merge - Merge a pull request */
export async function POST(request: NextRequest) {
const authResult = await getGitHubAuth("pulls:merge");
if ("error" in authResult && authResult.error) return authResult.error;
const { token } = authResult as { token: string };

try {
const body = await request.json();
const { repo, pull_number, merge_method, commit_title, commit_message } = body;

if (!repo || !pull_number) {
return NextResponse.json(
{ error: "Repository and pull_number are required" },
{ status: 400 },
);
}

const mergePayload: Record<string, unknown> = {
merge_method: merge_method || "merge",
};
if (commit_title) mergePayload.commit_title = commit_title;
if (commit_message) mergePayload.commit_message = commit_message;

const response = await githubFetch(
`https://api.github.com/repos/${repo}/pulls/${pull_number}/merge`,
token,
{
method: "PUT",
body: JSON.stringify(mergePayload),
},
);

if (!response.ok) {
const errorData = await response.json();
return NextResponse.json(
{ error: errorData.message || "Failed to merge pull request" },
{ status: response.status },
);
}

const result = await response.json();
return NextResponse.json({
data: {
merged: result.merged,
message: result.message,
sha: result.sha,
},
});
} catch (error) {
console.error("Error merging PR:", error);
return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
}
