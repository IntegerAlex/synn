import { type NextRequest, NextResponse } from "next/server";
import { getGitHubAuth, githubFetch } from "@/lib/api/githubAuth";

/** PATCH /api/github/issues/[number] - Update issue (close/reopen/edit) */
export async function PATCH(
request: NextRequest,
{ params }: { params: Promise<{ number: string }> },
) {
const authResult = await getGitHubAuth("issues:update");
if ("error" in authResult && authResult.error) return authResult.error;
const { token } = authResult as { token: string };

const { number } = await params;

try {
const body = await request.json();
const { repo, state, title, body: issueBody, labels, assignees } = body;

if (!repo) {
return NextResponse.json({ error: "Repository required" }, { status: 400 });
}

const updatePayload: Record<string, unknown> = {};
if (state !== undefined) updatePayload.state = state;
if (title !== undefined) updatePayload.title = title;
if (issueBody !== undefined) updatePayload.body = issueBody;
if (labels !== undefined) updatePayload.labels = labels;
if (assignees !== undefined) updatePayload.assignees = assignees;

const response = await githubFetch(
`https://api.github.com/repos/${repo}/issues/${number}`,
token,
{
method: "PATCH",
body: JSON.stringify(updatePayload),
},
);

if (!response.ok) {
const errorData = await response.json();
return NextResponse.json(
{ error: errorData.message || "Failed to update issue" },
{ status: response.status },
);
}

const issue = await response.json();
return NextResponse.json({
data: {
number: issue.number,
title: issue.title,
state: issue.state,
html_url: issue.html_url,
},
});
} catch (error) {
console.error("Error updating issue:", error);
return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
}
