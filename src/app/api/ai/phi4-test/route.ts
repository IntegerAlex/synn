import { NextResponse } from "next/server";

/**
 * Simple smoke test for the Azure Phi-4 deployment.
 * Works with either the full inference URL (ending in /models/chat/completions)
 * or the base resource URL (https://<resource>.openai.azure.com) plus deployment name.
 *
 * Env vars (one of the keys is enough for API key):
 * - AZURE_PHI_4_ENDPOINT   (required)  e.g. https://.../models/chat/completions?api-version=2024-05-01-preview
 *   or https://<resource>.openai.azure.com
 * - AZURE_PHI_4_API_KEY    (preferred) or AZURE_PHI_4 (legacy)
 * - AZURE_PHI_4_DEPLOYMENT (optional) defaults to "phi-4"
 */
export async function GET() {
  const apiKey = process.env.AZURE_PHI_4_API_KEY || process.env.AZURE_PHI_4;
  const endpointEnv = process.env.AZURE_PHI_4_ENDPOINT;
  const deployment = process.env.AZURE_PHI_4_DEPLOYMENT || "phi-4";

  if (!endpointEnv || !apiKey) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Missing AZURE_PHI_4_ENDPOINT or AZURE_PHI_4_API_KEY (or legacy AZURE_PHI_4).",
      },
      { status: 500 },
    );
  }

  // Build the request URL:
  // If the provided endpoint already contains /models/chat/completions, use it as-is.
  // Otherwise, construct the standard Azure OpenAI path with the deployment name.
  let requestUrl: string;
  if (endpointEnv.includes("/models/chat/completions")) {
    requestUrl = endpointEnv;
  } else {
    // ensure no trailing slash
    const base = endpointEnv.replace(/\/+$/, "");
    requestUrl = `${base}/openai/deployments/${deployment}/chat/completions?api-version=2024-05-01-preview`;
  }

  try {
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Reply with: phi-4 smoke test ok" }],
        max_tokens: 50,
        temperature: 0,
        model: deployment,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const result = await response.json();
    const choice =
      result?.choices?.[0]?.message?.content ??
      result?.choices?.[0]?.text ??
      "";

    return NextResponse.json({
      ok: true,
      deployment,
      reply: choice,
    });
  } catch (error: any) {
    console.error("Azure Phi-4 smoke test failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Phi-4 smoke test failed",
        error: error?.message ?? "Unknown error",
        requestUrl,
      },
      { status: 500 },
    );
  }
}
