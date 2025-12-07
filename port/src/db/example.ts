/**
 * Example usage of the database
 * This file demonstrates how to use Drizzle ORM with the users table
 */

import { db, schema } from './index';
import { eq } from 'drizzle-orm';

// Example: Create a new user (requires clerkUserId)
export async function createUser(
  clerkUserId: string,
  name?: string,
  email?: string,
  githubId?: number,
  githubUsername?: string
) {
  const newUser = await db.insert(schema.usersTable).values({
    clerkUserId,
    name,
    email,
    githubId,
    githubUsername,
  }).returning();
  
  return newUser[0];
}

// Example: Get all users
export async function getAllUsers() {
  return await db.select().from(schema.usersTable);
}

// Example: Get user by Clerk user ID
export async function getUserByClerkId(clerkUserId: string) {
  const users = await db
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.clerkUserId, clerkUserId));
  
  return users[0] || null;
}

// Example: Get user by email
export async function getUserByEmail(email: string) {
  const users = await db
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.email, email));
  
  return users[0] || null;
}

// Example: Get user by GitHub ID
export async function getUserByGitHubId(githubId: number) {
  const users = await db
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.githubId, githubId));
  
  return users[0] || null;
}

// Example: Update user
export async function updateUser(
  clerkUserId: string,
  updates: {
    name?: string;
    email?: string;
    githubUsername?: string;
    githubAccessToken?: string;
  }
) {
  const updated = await db
    .update(schema.usersTable)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(schema.usersTable.clerkUserId, clerkUserId))
    .returning();
  
  return updated[0] || null;
}

// Example: Delete user
export async function deleteUser(clerkUserId: string) {
  await db
    .delete(schema.usersTable)
    .where(eq(schema.usersTable.clerkUserId, clerkUserId));
}

