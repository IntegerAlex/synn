import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/db';
import { usersTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import { syncUserRepos } from '@/lib/services/githubSync';

export async function POST(req: Request) {
  // Get the Svix headers for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return new Response('Webhook secret not configured', {
      status: 500,
    });
  }
  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id: clerkUserId, email_addresses, external_accounts } = evt.data;

    try {
      // Get Clerk client to fetch OAuth tokens
      const client = await clerkClient();
      
      // Find GitHub OAuth account
      const githubAccount = external_accounts?.find(
        (account) => account.provider === 'oauth_github'
      );

      if (!githubAccount) {
        console.log(`No GitHub OAuth account found for user ${clerkUserId}`);
        return new Response('No GitHub account linked', { status: 200 });
      }

      // Get OAuth access token
      const tokenResponse = await client.users.getUserOauthAccessToken(
        clerkUserId,
        'github'
      );

      const accessToken = tokenResponse.data[0]?.token;
      const refreshToken = (tokenResponse.data[0] as any)?.refreshToken || null;
      const expiresAt = tokenResponse.data[0]?.expiresAt
        ? new Date(tokenResponse.data[0].expiresAt * 1000)
        : null;

      // Fetch user data from GitHub API
      const githubUserResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!githubUserResponse.ok) {
        throw new Error('Failed to fetch GitHub user data');
      }

      const githubUser = await githubUserResponse.json();

      // Prepare OAuth metadata
      const oauthMetadata = {
        provider: 'github',
        providerAccountId: githubAccount.provider_user_id,
        scope: githubAccount.approved_scopes || [],
        account: {
          id: githubAccount.id,
          username: githubAccount.username,
          verified: githubAccount.verification?.status === 'verified',
        },
      };

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.clerkUserId, clerkUserId))
        .limit(1);

      const userData = {
        clerkUserId,
        name: githubUser.name || githubUser.login,
        email: email_addresses?.[0]?.email_address || githubUser.email,
        githubId: githubUser.id,
        githubUsername: githubUser.login,
        githubAccessToken: accessToken,
        githubRefreshToken: refreshToken || null,
        githubTokenExpiresAt: expiresAt,
        oauthMetadata,
        updatedAt: new Date(),
      };

      if (existingUser.length > 0) {
        // Update existing user
        await db
          .update(usersTable)
          .set(userData)
          .where(eq(usersTable.clerkUserId, clerkUserId));
      } else {
        // Create new user
        await db.insert(usersTable).values({
          ...userData,
          createdAt: new Date(),
        });
      }

      // Sync repositories for this user
      if (accessToken) {
        const userRecord = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.clerkUserId, clerkUserId))
          .limit(1);

        if (userRecord.length > 0) {
          await syncUserRepos(userRecord[0].id, accessToken);
        }
      }

      return new Response('User data synced successfully', { status: 200 });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return new Response('Error processing webhook', { status: 500 });
    }
  }

  return new Response('Webhook processed', { status: 200 });
}

