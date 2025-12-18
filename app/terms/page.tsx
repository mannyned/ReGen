/**
 * Terms of Service Page
 *
 * Required for app store and platform compliance
 * URL: https://www.regenr.app/terms
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | ReGenr',
  description: 'Terms of Service for ReGenr - Read our terms and conditions for using our services.',
};

export default function TermsOfServicePage() {
  const lastUpdated = 'December 17, 2024';
  const contactEmail = 'support@regenr.app';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">1. Agreement to Terms</h2>
            <p className="text-gray-700">
              By accessing or using ReGenr (&quot;Service&quot;), you agree to be bound by these Terms of
              Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use our Service.
              These Terms apply to all visitors, users, and others who access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2. Description of Service</h2>
            <p className="text-gray-700">
              ReGenr is a social media management platform that allows users to create, schedule,
              and analyze content across multiple social media platforms including Instagram,
              TikTok, and others. Our Service includes content generation tools, analytics,
              and account management features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3. Account Registration</h2>
            <p className="text-gray-700 mb-3">To use our Service, you must:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Be at least 13 years of age (or the minimum age in your jurisdiction)</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly notify us of any unauthorized use of your account</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4. Social Media Account Connections</h2>
            <p className="text-gray-700 mb-3">When you connect third-party social media accounts:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>You authorize us to access and manage your accounts as permitted by you</li>
              <li>You remain responsible for compliance with each platform&apos;s terms of service</li>
              <li>You grant us permission to post content on your behalf when scheduled</li>
              <li>You may disconnect accounts at any time through your settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5. Acceptable Use</h2>
            <p className="text-gray-700 mb-3">You agree NOT to use the Service to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights of others</li>
              <li>Post harmful, threatening, abusive, or hateful content</li>
              <li>Distribute spam, malware, or deceptive content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Impersonate others or misrepresent your affiliation</li>
              <li>Collect user data without consent</li>
              <li>Use automated systems to access the Service without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">6. Content Ownership</h2>
            <p className="text-gray-700 mb-3">
              <strong>Your Content:</strong> You retain ownership of all content you create or
              upload through our Service. By using our Service, you grant us a limited license
              to store, display, and transmit your content as necessary to provide the Service.
            </p>
            <p className="text-gray-700">
              <strong>Our Content:</strong> The Service, including its design, features, and
              content created by us, is protected by copyright, trademark, and other laws.
              You may not copy, modify, or distribute our content without permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7. AI-Generated Content</h2>
            <p className="text-gray-700">
              Our Service may use artificial intelligence to generate or suggest content.
              You are responsible for reviewing and approving all AI-generated content before
              publishing. We do not guarantee the accuracy, appropriateness, or originality
              of AI-generated suggestions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">8. Subscription and Payments</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Some features require a paid subscription</li>
              <li>Subscription fees are billed in advance on a recurring basis</li>
              <li>You may cancel your subscription at any time</li>
              <li>Refunds are provided in accordance with our refund policy</li>
              <li>We reserve the right to modify pricing with reasonable notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">9. Termination</h2>
            <p className="text-gray-700">
              We may suspend or terminate your access to the Service at any time, with or
              without cause, and with or without notice. Upon termination, your right to
              use the Service will immediately cease. You may also delete your account at
              any time through your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">10. Disclaimers</h2>
            <p className="text-gray-700">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY
              KIND, EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE
              UNINTERRUPTED, SECURE, OR ERROR-FREE. WE ARE NOT RESPONSIBLE FOR THE ACTIONS
              OF THIRD-PARTY PLATFORMS OR THEIR AVAILABILITY.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">11. Limitation of Liability</h2>
            <p className="text-gray-700">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, REGENR SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING
              LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
              OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU IN THE PAST
              TWELVE MONTHS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">12. Indemnification</h2>
            <p className="text-gray-700">
              You agree to indemnify and hold harmless ReGenr, its affiliates, and their
              respective officers, directors, employees, and agents from any claims, damages,
              losses, or expenses arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">13. Governing Law</h2>
            <p className="text-gray-700">
              These Terms shall be governed by and construed in accordance with the laws of
              the United States, without regard to its conflict of law provisions. Any disputes
              shall be resolved in the courts located in the United States.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">14. Changes to Terms</h2>
            <p className="text-gray-700">
              We reserve the right to modify these Terms at any time. We will notify users of
              material changes by posting the updated Terms on this page and updating the
              &quot;Last updated&quot; date. Your continued use of the Service after changes constitutes
              acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">15. Contact Us</h2>
            <p className="text-gray-700">
              If you have questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-gray-700 mt-2">
              <strong>Email:</strong>{' '}
              <a href={`mailto:${contactEmail}`} className="text-blue-600 hover:underline">
                {contactEmail}
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
