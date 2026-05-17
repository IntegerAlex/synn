import { NextResponse } from "next/server";
import { issuePkToken, verifyPkSignature } from "@/lib/utils/pkAuth";

type VerifyBody = {
  challengeId: string;
  signature: string; // base64
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyBody;
    if (!body?.challengeId || !body?.signature) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Missing challengeId or signature",
          },
        },
        { status: 400 },
      );
    }

    const result = verifyPkSignature(body.challengeId, body.signature);
    if (!result.ok) {
      const reason = result.reason || "INVALID_SIGNATURE";
      return NextResponse.json(
        {
          error: {
            code: reason,
            message: "Signature invalid or challenge expired",
          },
        },
        { status: 401 },
      );
    }

    return issuePkToken(null);
  } catch (error: any) {
    console.error("PK_VERIFY_ERROR", error);
    return NextResponse.json(
      {
        error: {
          code: "PK_VERIFY_ERROR",
          message: error?.message || "Failed to verify signature",
        },
      },
      { status: 500 },
    );
  }
}
