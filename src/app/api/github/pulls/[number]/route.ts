import { type NextRequest, NextResponse } from "next/server";
import { getGitHubAuth, githubFetch } from "@/lib/api/githubAuth";

/** GET /api/github/pulls/[number] - Get PR details with files */
export async function GET(
request: NextRequest,
{ params }: { params: Promise<{ number: string }> },
) {
const authResult = await getGitHubAuth("pulls:detail");
if ("error" in authResult && authResult.error) return authResult.error;
const { token } = authResult as { token: string };

const { number } = await params;
const { searchParams } = new URL(request.url);
const repo = searchParams.get("repo");

if (!repo) {
return NextResponse.json({ error: "Repository required" }, { status: 400 });
}

try {
// Fetch PR details and first page of files in parallel
const [prRes, filesRes] = await Promise.all([
githubFetch(`https://api.github.com/repos/${repo}/pulls/${number}`, token),
githubFetch(
`https://api.github.com/repos/${repo}/pulls/${number}/files?per_page=100`,
token,
),
]);

if (!prRes.ok) {
return NextResponse.json(
{ error: "Failed to fetch pull request" },
{ status: prRes.status },
);
}

const pr = await prRes.json();
let files: any[] = filesRes.ok ? await filesRes.json() : [];

// Paginate remaining files if there are more than 100
if (filesRes.ok && files.length === 100) {
let page = 2;
const maxPages = 10; // Safety limit: max 1000 files
while (page <= maxPages) {
const nextRes = await githubFetch(
`https://api.github.com/repos/${repo}/pulls/${number}/files?per_page=100&page=${page}`,
token,
);
if (!nextRes.ok) break;
const nextFiles = await nextRes.json();
if (nextFiles.length === 0) break;
files = files.concat(nextFiles);
page++;
}
}

  return NextResponse.json({
  data: {
    number: pr.number,
    title: pr.title,
    body: pr.body,
    state: pr.state,
    draft: pr.draft,
    merged: pr.merged,
    mergeable: pr.mergeable,
    mergeable_state: pr.mergeable_state,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    merged_at: pr.merged_at,
    closed_at: pr.closed_at,
    user: { login: pr.user.login, avatar_url: pr.user.avatar_url },
    head: { ref: pr.head.ref, sha: pr.head.sha },
    base: { ref: pr.base.ref, sha: pr.base.sha },
    commits: pr.commits,
    additions: pr.additions,
    deletions: pr.deletions,
    changed_files: pr.changed_files,
    labels: pr.labels.map((l: any) => ({ name: l.name, color: l.color })),
    assignees: (pr.assignees ?? []).map((a: any) => ({
      login: a.login,
      avatar_url: a.avatar_url,
    })),
    requested_reviewers: (pr.requested_reviewers ?? []).map((r: any) => ({
      login: r.login,
      avatar_url: r.avatar_url,
    })),
    files: files.map((f: any) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch: f.patch,
    })),
  },
  });
} catch (error) {
console.error("Error fetching PR details:", error);
return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
}

/** PATCH /api/github/pulls/[number] - Update PR (close/edit) */
export async function PATCH(
request: NextRequest,
{ params }: { params: Promise<{ number: string }> },
) {
const authResult = await getGitHubAuth("pulls:update");
if ("error" in authResult && authResult.error) return authResult.error;
const { token } = authResult as { token: string };

const { number } = await params;

try {
const body = await request.json();
const { repo, state, title, body: prBody } = body;

if (!repo) {
return NextResponse.json({ error: "Repository required" }, { status: 400 });
}

const updatePayload: Record<string, unknown> = {};
if (state !== undefined) updatePayload.state = state;
if (title !== undefined) updatePayload.title = title;
if (prBody !== undefined) updatePayload.body = prBody;

const response = await githubFetch(
`https://api.github.com/repos/${repo}/pulls/${number}`,
token,
{
method: "PATCH",
body: JSON.stringify(updatePayload),
},
);

if (!response.ok) {
const errorData = await response.json();
return NextResponse.json(
{ error: errorData.message || "Failed to update PR" },
{ status: response.status },
);
}

const pr = await response.json();
return NextResponse.json({
data: { number: pr.number, title: pr.title, state: pr.state },
});
} catch (error) {
console.error("Error updating PR:", error);
return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
}
