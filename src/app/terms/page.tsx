"use client"

import Link from "next/link"
import Image from "next/image"

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
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

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Effective Date: December 7, 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) 
              and Synn (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) governing your access to and use of the Synn Git visualization service 
              (the &quot;Service&quot;) available at synn.gossorg.in.
            </p>
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="text-muted-foreground leading-relaxed font-medium">
                <strong>Acceptance Required:</strong> By accessing, browsing, or using the Service, you acknowledge that you have 
                read, understood, and agree to be bound by these Terms and our Privacy Policy, which is incorporated herein by 
                reference. If you do not agree to these Terms in their entirety, you must immediately cease all use of the Service 
                and may not access or use the Service.
              </p>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-4">
              If you are using the Service on behalf of an organization, you represent and warrant that you have authority to bind 
              that organization to these Terms, and &quot;you&quot; will include both you and the organization.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>&quot;Service&quot;</strong> means the Synn platform, including all features, functionality, and content</li>
              <li><strong>&quot;User Content&quot;</strong> means any data, information, or content you provide through the Service</li>
              <li><strong>&quot;Third-Party Services&quot;</strong> means external services we integrate with, including GitHub, Clerk, and Neon DB</li>
              <li><strong>&quot;Account&quot;</strong> means your user account created through Clerk authentication</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Synn is a software-as-a-service platform that provides Git repository visualization tools. The Service allows users 
              to visualize GitHub repository data, including commit history, branches, and related metadata, through an interactive 
              web interface. The Service requires GitHub OAuth authentication and does not store repository code locally.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Eligibility and Account Requirements</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To use the Service, you must:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Be at least 16 years of age (or the age of majority in your jurisdiction)</li>
              <li>Have the legal capacity to enter into binding agreements</li>
              <li>Possess a valid GitHub account with appropriate repository access</li>
              <li>Authorize our application to access your GitHub data via OAuth</li>
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain the security and confidentiality of your account credentials</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You are responsible for all activities that occur under your account. You must immediately notify us of any 
              unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use Policy</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Violate any applicable local, state, national, or international law or regulation</li>
              <li>Infringe upon or violate our intellectual property rights or the rights of others</li>
              <li>Transmit any malicious code, viruses, or harmful data</li>
              <li>Attempt to gain unauthorized access to the Service, other accounts, or computer systems</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Use automated systems (bots, scrapers) to access the Service without express written permission</li>
              <li>Reverse engineer, decompile, or disassemble any portion of the Service</li>
              <li>Access repositories for which you do not have proper authorization</li>
              <li>Share, transfer, or sell your account credentials to any third party</li>
              <li>Use the Service to compete with us or to build a similar or competing service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Service Ownership:</strong> The Service, including all software, code, designs, graphics, text, and other 
              content (collectively, &quot;Service Content&quot;), is owned by us or our licensors and is protected by copyright, 
              trademark, patent, trade secret, and other intellectual property laws. All rights not expressly granted are reserved.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>User Content:</strong> You retain all ownership rights in your User Content, including GitHub repository data. 
              By using the Service, you grant us a limited, non-exclusive, royalty-free, worldwide license to access, use, process, 
              and display your User Content solely for the purpose of providing the Service to you. This license terminates when 
              you delete your account or remove the User Content.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Trademarks:</strong> &quot;Synn&quot; and related marks are our trademarks. You may not use our trademarks 
              without our prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Privacy and Data Protection</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of the Service is subject to our{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, which describes how we collect, 
              use, disclose, and protect your information. By using the Service, you consent to the collection and use of your 
              information as described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Third-Party Services and Dependencies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The Service integrates with and depends on the following third-party services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li><strong>GitHub, Inc.:</strong> OAuth authentication and repository access via GitHub API. Your use must comply with{" "}
                <a 
                  href="https://docs.github.com/en/site-policy/github-terms/github-terms-of-service" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GitHub&apos;s Terms of Service
                </a> and{" "}
                <a 
                  href="https://docs.github.com/en/site-policy/github-terms/github-api-terms-of-service" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GitHub API Terms
                </a>.
              </li>
              <li><strong>Clerk, Inc.:</strong> User authentication, session management, and account services.</li>
              <li><strong>Neon, Inc. (Neon DB):</strong> Database hosting and data storage services.</li>
            </ul>
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="text-muted-foreground leading-relaxed font-medium mb-2">
                <strong>Third-Party Service Liability Disclaimer:</strong>
              </p>
              <p className="text-muted-foreground leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE EXPRESSLY DISCLAIM ALL LIABILITY FOR ANY FAILURES, 
                OUTAGES, DATA BREACHES, SECURITY INCIDENTS, DATA LOSS, CORRUPTION, OR OTHER LAPSES THAT MAY OCCUR WITH THIRD-PARTY 
                SERVICES, INCLUDING BUT NOT LIMITED TO CLERK, GITHUB, OR NEON DB. ANY ISSUES, DAMAGES, OR LOSSES ARISING FROM 
                THIRD-PARTY SERVICE FAILURES, INCLUDING SERVICE OUTAGES, API RATE LIMITING, AUTHENTICATION FAILURES, OR DATA BREACHES, 
                ARE SUBJECT TO THE TERMS, POLICIES, AND LIABILITY LIMITATIONS OF THOSE RESPECTIVE THIRD-PARTY SERVICES. WE DO NOT 
                GUARANTEE THE AVAILABILITY, RELIABILITY, SECURITY, OR PERFORMANCE OF ANY THIRD-PARTY SERVICES AND SHALL NOT BE LIABLE 
                FOR ANY CONSEQUENCES RESULTING FROM THEIR USE OR FAILURE.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, 
              INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, 
              OR COURSE OF PERFORMANCE. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE FROM 
              VIRUSES OR OTHER HARMFUL COMPONENTS. WE DO NOT WARRANT THE ACCURACY, COMPLETENESS, OR USEFULNESS OF ANY INFORMATION 
              PROVIDED THROUGH THE SERVICE.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF IMPLIED WARRANTIES, SO THE ABOVE EXCLUSION MAY NOT APPLY TO YOU.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL WE, OUR AFFILIATES, LICENSORS, OR SERVICE PROVIDERS 
              BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>Loss of profits, revenue, data, or use</li>
              <li>Business interruption or loss of business opportunity</li>
              <li>Personal injury or property damage</li>
              <li>Costs of substitute services</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE SERVICE, REGARDLESS OF THE THEORY OF LIABILITY 
              (CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY, OR OTHERWISE) AND EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              OUR TOTAL LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNT 
              YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF INCIDENTAL OR CONSEQUENTIAL DAMAGES, SO THE ABOVE LIMITATION 
              OR EXCLUSION MAY NOT APPLY TO YOU.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless us, our affiliates, officers, directors, employees, agents, licensors, 
              and service providers from and against any and all claims, liabilities, damages, losses, costs, expenses, or fees (including 
              reasonable attorneys&apos; fees) arising out of or relating to: (a) your use of the Service; (b) your violation of these Terms; 
              (c) your violation of any rights of another party; or (d) your User Content. We reserve the right to assume the exclusive 
              defense and control of any matter subject to indemnification by you, in which event you will cooperate with us in asserting 
              any available defenses.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Termination by You:</strong> You may terminate your account and stop using the Service at any time by deleting your 
              account through our GDPR deletion tools or by contacting us.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Termination by Us:</strong> We reserve the right to suspend or terminate your access to the Service, with or without 
              notice, for any reason, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>Violation of these Terms or our policies</li>
              <li>Fraudulent, abusive, or illegal activity</li>
              <li>Extended periods of inactivity</li>
              <li>Requests by law enforcement or government agencies</li>
              <li>Discontinuation or material modification of the Service</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Upon termination, your right to use the Service will immediately cease. Sections of these Terms that by their nature should 
              survive termination (including but not limited to Intellectual Property, Limitation of Liability, and Indemnification) shall 
              survive termination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Modifications to Terms and Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. Material changes will be indicated by updating the &quot;Effective Date.&quot; 
              Your continued use of the Service after such modifications constitutes your acceptance of the modified Terms. If you do not agree 
              to the modified Terms, you must stop using the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We may modify, suspend, or discontinue the Service, or any part thereof, at any time with or without notice. We shall not be 
              liable to you or any third party for any modification, suspension, or discontinuation of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Governing Law and Jurisdiction</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which we operate, without 
              regard to its conflict of law provisions. Any legal action or proceeding arising out of or relating to these Terms or the 
              Service shall be brought exclusively in the courts of competent jurisdiction in that jurisdiction, and you consent to the 
              personal jurisdiction of such courts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Dispute Resolution</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Informal Resolution:</strong> Before filing a claim, you agree to contact us to attempt to resolve the dispute informally.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Binding Arbitration:</strong> If informal resolution fails, any dispute arising out of or relating to these Terms or 
              the Service shall be resolved through binding arbitration in accordance with the rules of a recognized arbitration organization, 
              except where prohibited by law. You waive any right to a jury trial and to participate in a class action lawsuit or class-wide 
              arbitration.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Severability</h2>
            <p className="text-muted-foreground leading-relaxed">
              If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the 
              validity, legality, and enforceability of the remaining provisions shall remain in full force and effect, and the invalid, 
              illegal, or unenforceable provision shall be modified to the minimum extent necessary to make it valid, legal, and enforceable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">17. Entire Agreement</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and us regarding the Service and 
              supersede all prior or contemporaneous communications, proposals, and agreements, whether oral or written, relating to the subject matter hereof.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">18. Waiver</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision. 
              Any waiver must be in writing and signed by us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">19. Assignment</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may not assign or transfer these Terms or your rights hereunder without our prior written consent. We may assign or 
              transfer these Terms, in whole or in part, without restriction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">20. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions regarding these Terms, contact us through our GitHub repository. We will respond to inquiries within a reasonable timeframe.
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
