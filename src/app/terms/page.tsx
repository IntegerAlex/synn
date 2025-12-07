"use client"

import Link from "next/link"
import Image from "next/image"

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Synn" width={40} height={40} />
            <span className="font-bold text-xl">Synn</span>
          </Link>
          <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
            Privacy Policy
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 7, 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              By accessing or using Synn (&quot;the Service&quot;), you acknowledge that you have read, understood, 
              and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree 
              to these terms, you must not use the Service.
            </p>
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="text-muted-foreground leading-relaxed font-medium">
                <strong>Important:</strong> Your use of the Service constitutes your acceptance of these Terms. 
                If you do not accept these Terms in their entirety, you are not authorized to access or use 
                the Service. Continued use of the Service after any modifications to these Terms constitutes 
                your acceptance of the modified Terms.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Synn is a Git visualization tool that allows you to visualize your GitHub repositories, 
              view commit history, branches, and other Git-related data. The Service requires GitHub 
              OAuth authentication to access your repositories.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To use the Service, you must:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Have a valid GitHub account</li>
              <li>Authorize our application to access your GitHub data</li>
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree NOT to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use automated systems to access the Service without permission</li>
              <li>Reverse engineer or attempt to extract source code</li>
              <li>Use the Service to access repositories you don&apos;t have permission to view</li>
              <li>Share your account credentials with others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Your Content:</strong> You retain all rights to your GitHub repositories and data. 
              By using the Service, you grant us a limited license to access and display your repository 
              data solely for the purpose of providing the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Our Content:</strong> The Service, including its design, code, and features, is 
              owned by us and protected by intellectual property laws. All rights reserved.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of the Service is also governed by our{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, 
              which describes how we collect, use, and protect your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Third-Party Services and Dependencies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The Service relies on the following third-party services to function:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li><strong>GitHub:</strong> For OAuth authentication and repository access via GitHub API. Your use must comply with{" "}
                <a 
                  href="https://docs.github.com/en/site-policy/github-terms/github-terms-of-service" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GitHub&apos;s Terms of Service
                </a>.
              </li>
              <li><strong>Clerk:</strong> For user authentication, session management, and account services.</li>
              <li><strong>Neon DB:</strong> For database hosting and data storage (PostgreSQL).</li>
            </ul>
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="text-muted-foreground leading-relaxed font-medium mb-2">
                <strong>Third-Party Service Liability Disclaimer:</strong>
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We are not responsible for, and expressly disclaim all liability for, any failures, outages, 
                data breaches, security incidents, or other lapses that may occur with third-party services 
                including but not limited to Clerk, GitHub, or Neon DB. Any issues, damages, or losses arising 
                from third-party service failures, including but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground mt-2">
                <li>Service outages or downtime</li>
                <li>Data breaches or security incidents</li>
                <li>API rate limiting or throttling</li>
                <li>Data loss or corruption</li>
                <li>Authentication failures</li>
                <li>Any other service disruptions</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                are subject to the terms, policies, and liability limitations of those respective third-party 
                services. We do not guarantee the availability, reliability, or security of any third-party 
                services and are not liable for any consequences resulting from their use or failure.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, 
              EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, 
              OR SECURE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, 
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, 
              PROFITS, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify and hold us harmless from any claims, damages, or expenses 
              arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We reserve the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Suspend or terminate your access to the Service at any time</li>
              <li>Modify or discontinue the Service without notice</li>
              <li>Refuse service to anyone for any reason</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You may delete your account and data at any time using our GDPR tools.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may modify these Terms at any time. Continued use of the Service after changes 
              constitutes acceptance of the new Terms. We will update the &quot;Last updated&quot; date when 
              changes are made.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable laws, 
              without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Severability</h2>
            <p className="text-muted-foreground leading-relaxed">
              If any provision of these Terms is found to be unenforceable, the remaining provisions 
              will continue in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us through our GitHub 
              repository or the contact information provided on our website.
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

