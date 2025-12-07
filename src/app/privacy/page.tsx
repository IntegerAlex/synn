"use client"

import Link from "next/link"
import Image from "next/image"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Synn" width={40} height={40} />
            <span className="font-bold text-xl">Synn</span>
          </Link>
          <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
            Terms of Service
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 7, 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to Synn (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). This Privacy Policy explains how we collect, 
              use, disclose, and safeguard your information when you use our Git visualization service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium mt-6 mb-3">2.1 Information from GitHub</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you sign in with GitHub OAuth, we access:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Your GitHub username and profile information</li>
              <li>Your email address</li>
              <li>List of repositories you have access to</li>
              <li>Repository metadata (names, descriptions, visibility)</li>
              <li>OAuth access tokens (encrypted and stored securely)</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.2 Activity Data</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We collect information about how you use our service:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Repositories you view</li>
              <li>Actions you perform (viewing commits, branches, etc.)</li>
              <li>Timestamps of your activities</li>
              <li>API request logs</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.3 Device Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may collect device and browser information including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>IP address (encrypted)</li>
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>Device type</li>
              <li>Device fingerprint for session management</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the collected information for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Providing and maintaining our Git visualization service</li>
              <li>Authenticating your identity and managing your account</li>
              <li>Accessing your GitHub repositories on your behalf</li>
              <li>Improving our service and user experience</li>
              <li>Detecting and preventing fraud or abuse</li>
              <li>Complying with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We implement robust security measures to protect your data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Encryption:</strong> Sensitive data (tokens, IP addresses, user agents) is encrypted using RSA/AES hybrid encryption</li>
              <li><strong>Secure Storage:</strong> Data is stored in encrypted databases with access controls</li>
              <li><strong>Token Security:</strong> GitHub OAuth tokens are encrypted before storage</li>
              <li><strong>No Local Code Storage:</strong> We never download or store your repository code</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We retain your data according to the following policies:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Account Data:</strong> Retained while your account is active</li>
              <li><strong>Activity Logs:</strong> Retained for 90 days</li>
              <li><strong>API Request Logs:</strong> Retained for 30 days</li>
              <li><strong>Fingerprint Data:</strong> Retained for 30 days after last activity</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You can request deletion of all your data at any time through our GDPR tools.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights (GDPR)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Under GDPR, you have the following rights:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Right to Access:</strong> Request a copy of all your personal data</li>
              <li><strong>Right to Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Right to Erasure:</strong> Request deletion of all your data (&quot;Right to be Forgotten&quot;)</li>
              <li><strong>Right to Data Portability:</strong> Export your data in a machine-readable format</li>
              <li><strong>Right to Object:</strong> Object to processing of your data</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, use the following API endpoints while authenticated:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><code className="bg-muted px-2 py-1 rounded">GET /api/gdpr/export</code> - Export all your data</li>
              <li><code className="bg-muted px-2 py-1 rounded">DELETE /api/gdpr/delete</code> - Delete all your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the following third-party services to operate the Service:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>GitHub:</strong> For OAuth authentication and repository access via GitHub API</li>
              <li><strong>Clerk:</strong> For user authentication, session management, and user account services</li>
              <li><strong>Neon DB:</strong> For database hosting and data storage (PostgreSQL)</li>
              <li><strong>Vercel:</strong> For hosting and deployment infrastructure</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4 mb-4">
              Each of these services has their own privacy policy and terms of service that govern their use of your data.
            </p>
            <div className="bg-muted/50 border border-border rounded-lg p-4 mt-4">
              <p className="text-muted-foreground leading-relaxed font-medium">
                <strong>Third-Party Service Disclaimer:</strong> We are not responsible for, and expressly disclaim all 
                liability for, any data breaches, security incidents, service outages, or other failures or lapses 
                that may occur with third-party services including but not limited to Clerk, GitHub, or Neon DB. 
                Any issues arising from third-party service failures are subject to the terms and policies of those 
                respective services. We recommend reviewing the privacy policies and terms of service of all 
                third-party services we use.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies for authentication and session management. We also use device 
              fingerprinting for security purposes (fraud detection, session validation). We do not 
              use third-party advertising cookies or tracking pixels.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our service is not intended for children under 13 years of age. We do not knowingly 
              collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us through our 
              GitHub repository or the contact information provided on our website.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link href="/" className="text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  )
}

