"use client";

import { KeyRound, Loader2, ShieldCheck, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

async function fetchChallenge() {
  const res = await fetch("/api/auth/pk/challenge", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to get challenge");
  return res.json() as Promise<{ challengeId: string; challenge: string }>;
}

async function postSignature(body: { challengeId: string; signature: string }) {
  const res = await fetch("/api/auth/pk/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || "Verification failed");
  }
  return res.json();
}

async function signChallengeWithPrivateKey(challenge: string, pem: string) {
  // Import PEM private key into WebCrypto
  const pkcs8 = pemToArrayBuffer(pem);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const enc = new TextEncoder();
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    enc.encode(challenge),
  );
  return bufferToBase64(signature);
}

function pemToArrayBuffer(pem: string) {
  const clean = pem
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(clean);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buffer;
}

function bufferToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export default function DashboardForbiddenPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePk = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!uploadKey) {
      setStatus("Please upload a private key.");
      return;
    }
    try {
      setLoading(true);
      setStatus("Requesting challenge…");
      const { challengeId, challenge } = await fetchChallenge();
      setStatus("Signing challenge…");
      const signature = await signChallengeWithPrivateKey(challenge, uploadKey);
      setStatus("Verifying…");
      await postSignature({ challengeId, signature });
      setStatus("Verified. Redirecting…");
      router.push("/dashboard");
    } catch (error: any) {
      setStatus(error?.message || "Failed to verify key");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    const text = await file.text();
    setUploadKey(text);
    setStatus(`Loaded ${file.name}`);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center p-8">
      <div className="max-w-2xl w-full grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Access</h1>
            <p className="text-gray-400">
              Authenticate using your private key.
            </p>
          </div>
          <form
            onSubmit={handlePk}
            className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-4"
          >
            <label className="text-sm text-gray-300 block">
              Private Key (PEM)
              <input
                ref={fileInputRef}
                type="file"
                accept=".pem,.key"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <div className="mt-3 rounded-lg border border-dashed border-[#30363d] bg-[#0f131a] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400">Key file</span>
                    <span className="text-sm text-gray-200">
                      {uploadKey ? "Loaded" : "No file chosen"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[#30363d] text-sm hover:bg-[#1c222b]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4" />
                    Choose file
                  </button>
                </div>
              </div>
              {status && <p className="text-xs text-gray-300 mt-2">{status}</p>}
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-md text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              Sign & Continue
            </button>
          </form>
        </div>

        <div className="space-y-3 bg-[#161b22] border border-[#30363d] rounded-lg p-5">
          <div className="flex items-center gap-2 text-emerald-300">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-sm font-semibold">Secure key login</span>
          </div>
          <p className="text-sm text-gray-400">
            Sign the challenge with your private key to receive a 1-hour session
            token.
          </p>
        </div>
      </div>
    </div>
  );
}
