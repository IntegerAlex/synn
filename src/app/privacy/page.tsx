"use client"

import Link from "next/link"
import Image from "next/image"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
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

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Effective Date: December 7, 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>&quot;Service&quot;</strong> means the Synn Git visualization platform accessible at synn.gossorg.in</li>
              <li><strong>&quot;Personal Data&quot;</strong> means any information relating to an identified or identifiable natural person</li>
              <li><strong>&quot;Data Controller&quot;</strong> means the entity that determines the purposes and means of processing Personal Data</li>
              <li><strong>&quot;Data Processor&quot;</strong> means the entity that processes Personal Data on behalf of the Data Controller</li>
              <li><strong>&quot;You&quot; or &quot;User&quot;</strong> means the individual accessing or using the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Data Controller</h2>
            <p className="text-muted-foreground leading-relaxed">
              Synn operates as the Data Controller for Personal Data collected through the Service. 
              For inquiries regarding data processing, contact us through our GitHub repository.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Legal Basis for Processing (GDPR Article 6)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We process your Personal Data based on the following legal bases:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Consent (Article 6(1)(a)):</strong> You provide explicit consent by using the Service and authorizing GitHub OAuth</li>
              <li><strong>Contract Performance (Article 6(1)(b)):</strong> Processing necessary to provide the Service you requested</li>
              <li><strong>Legitimate Interests (Article 6(1)(f)):</strong> Security, fraud prevention, and service improvement</li>
              <li><strong>Legal Obligation (Article 6(1)(c)):</strong> Compliance with applicable laws and regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Categories of Personal Data Collected</h2>
            
            <h3 className="text-xl font-medium mt-6 mb-3">4.1 Identity Data</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>GitHub username and profile information</li>
              <li>Email address (from GitHub or Clerk)</li>
              <li>Name (if provided)</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">4.2 Technical Data</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>IP address (encrypted at rest)</li>
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>Device type and identifiers</li>
              <li>User agent string (encrypted at rest)</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">4.3 Usage Data</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Repositories accessed</li>
              <li>Actions performed (commits viewed, branches accessed)</li>
              <li>API request logs</li>
              <li>Session timestamps</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">4.4 Authentication Data</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>GitHub OAuth access tokens (encrypted at rest)</li>
              <li>GitHub OAuth refresh tokens (encrypted at rest)</li>
              <li>Session identifiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Purpose and Lawful Basis for Processing</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-2 text-left">Purpose</th>
                    <th className="border border-border p-2 text-left">Legal Basis</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr>
                    <td className="border border-border p-2">Service provision and authentication</td>
                    <td className="border border-border p-2">Contract performance, Consent</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">Security and fraud prevention</td>
                    <td className="border border-border p-2">Legitimate interests</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">Service improvement and analytics</td>
                    <td className="border border-border p-2">Legitimate interests</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">Legal compliance</td>
                    <td className="border border-border p-2">Legal obligation</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We retain Personal Data only for as long as necessary to fulfill the purposes outlined in this Policy:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Account Data:</strong> Retained while your account is active; deleted within 30 days of account deletion</li>
              <li><strong>Activity Logs:</strong> Retained for 90 days from creation</li>
              <li><strong>API Request Logs:</strong> Retained for 30 days from creation</li>
              <li><strong>Fingerprint Data:</strong> Retained for 30 days after last activity</li>
              <li><strong>Authentication Tokens:</strong> Retained until revoked or account deletion</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You may request deletion at any time. We may retain certain data longer if required by law or for legitimate business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights (GDPR Articles 15-22)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Under the General Data Protection Regulation (GDPR) and applicable data protection laws, you have the following rights:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
              <li><strong>Right of Access (Article 15):</strong> Request a copy of your Personal Data in a structured, machine-readable format. Exercise via <code className="bg-muted px-2 py-1 rounded">GET /api/gdpr/export</code></li>
              <li><strong>Right to Rectification (Article 16):</strong> Request correction of inaccurate or incomplete Personal Data</li>
              <li><strong>Right to Erasure (Article 17):</strong> Request deletion of your Personal Data (&quot;Right to be Forgotten&quot;). Exercise via <code className="bg-muted px-2 py-1 rounded">DELETE /api/gdpr/delete</code></li>
              <li><strong>Right to Restriction of Processing (Article 18):</strong> Request limitation of processing under certain circumstances</li>
              <li><strong>Right to Data Portability (Article 20):</strong> Receive your Personal Data in a portable format. Exercise via <code className="bg-muted px-2 py-1 rounded">GET /api/gdpr/export</code></li>
              <li><strong>Right to Object (Article 21):</strong> Object to processing based on legitimate interests</li>
              <li><strong>Right to Withdraw Consent (Article 7(3)):</strong> Withdraw consent at any time without affecting prior processing</li>
              <li><strong>Right to Lodge a Complaint (Article 77):</strong> File a complaint with your supervisory authority</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, contact us through our GitHub repository. We will respond within 30 days as required by GDPR.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. California Privacy Rights (CCPA/CPRA)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Right to Know:</strong> Request disclosure of categories and specific pieces of Personal Data collected</li>
              <li><strong>Right to Delete:</strong> Request deletion of Personal Data (subject to exceptions)</li>
              <li><strong>Right to Opt-Out:</strong> Opt-out of sale of Personal Data (we do not sell Personal Data)</li>
              <li><strong>Right to Non-Discrimination:</strong> Exercise your rights without discrimination</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We do not sell Personal Data. To exercise CCPA rights, use the same GDPR endpoints or contact us directly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We implement technical and organizational measures to protect Personal Data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>RSA/AES-256 hybrid encryption for sensitive data at rest</li>
              <li>Encrypted database connections (TLS/SSL)</li>
              <li>Access controls and authentication requirements</li>
              <li>Regular security assessments</li>
              <li>Secure token storage with encryption</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Despite these measures, no method of transmission or storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Your Personal Data may be transferred to and processed in countries outside the European Economic Area (EEA). 
              We ensure adequate protection through:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Standard Contractual Clauses (SCCs) with third-party processors</li>
              <li>Adequacy decisions where applicable</li>
              <li>Appropriate safeguards as required by GDPR Chapter V</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Third-party services (Clerk, GitHub, Neon DB) may process data in various jurisdictions. 
              Their privacy policies govern such processing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Third-Party Processors</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We engage the following Data Processors who process Personal Data on our behalf:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>GitHub, Inc.:</strong> OAuth authentication and repository access (United States)</li>
              <li><strong>Clerk, Inc.:</strong> User authentication and session management (United States)</li>
              <li><strong>Neon DB (Neon, Inc.):</strong> Database hosting and storage (United States/European Union)</li>
              <li><strong>Vercel, Inc.:</strong> Hosting and infrastructure (United States)</li>
            </ul>
            <div className="bg-muted/50 border border-border rounded-lg p-4 mt-4">
              <p className="text-muted-foreground leading-relaxed font-medium">
                <strong>Third-Party Liability Disclaimer:</strong> We are not responsible for, and expressly disclaim all 
                liability for, any data breaches, security incidents, service outages, or other failures occurring with 
                third-party processors. Such incidents are subject to the terms, policies, and liability limitations of 
                those respective services. We recommend reviewing their privacy policies and terms of service.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the following technologies:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Essential Cookies:</strong> Required for authentication and session management (cannot be disabled)</li>
              <li><strong>Device Fingerprinting:</strong> For security, fraud prevention, and session validation</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We do not use third-party advertising cookies, tracking pixels, or cross-site tracking technologies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not intended for individuals under 16 years of age (or 13 in jurisdictions where applicable). 
              We do not knowingly collect Personal Data from children. If you believe we have collected data from a child, 
              contact us immediately for deletion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy to reflect changes in our practices or legal requirements. 
              Material changes will be notified by updating the &quot;Effective Date&quot; and, where required by law, 
              by additional notice. Continued use after changes constitutes acceptance of the updated Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Supervisory Authority</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you are located in the EEA, you have the right to lodge a complaint with your local supervisory 
              authority if you believe our processing of your Personal Data violates GDPR. Contact information for 
              supervisory authorities can be found at{" "}
              <a 
                href="https://edpb.europa.eu/about-edpb/board/members_en" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                edpb.europa.eu
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions, requests, or complaints regarding this Privacy Policy or our data practices, 
              contact us through our GitHub repository. We will respond within 30 days as required by applicable law.
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
