import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that require authentication (admin APIs are password-gated separately)
const isProtectedRoute = createRouteMatcher([
  "/api/github(.*)",
  "/api/repo(.*)",
  "/api/git(.*)",
  "/api/gdpr(.*)", // GDPR endpoints require auth
  // '/api/admin(.*)',  // Allow password-based admin without Clerk auth
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
