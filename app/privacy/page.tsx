/**
 * Privacy Policy Page
 *
 * Required for Meta (Facebook/Instagram) app verification
 * URL: https://www.regenr.app/privacy
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | ReGenr',
  description: 'Privacy Policy for ReGenr - Learn how we collect, use, and protect your data.',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'December 17, 2024';
  const contactEmail = 'privacy@regenr.app';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">1. Introduction</h2>
            <p className="text-gray-700">
              Welcome to ReGenr (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy
              and personal information. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our application and services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2. Information We Collect</h2>
            <p className="text-gray-700 mb-3">We may collect the following types of information:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>
                <strong>Account Information:</strong> When you create an account, we collect your
                email address, name, and password.
              </li>
              <li>
                <strong>Social Media Data:</strong> When you connect your social media accounts
                (Instagram, TikTok, etc.), we access data authorized by you, including profile
                information, posts, and analytics.
              </li>
              <li>
                <strong>Usage Data:</strong> We collect information about how you interact with
                our services, including features used, actions taken, and time spent.
              </li>
              <li>
                <strong>Device Information:</strong> We may collect information about your device,
                including IP address, browser type, and operating system.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-3">We use your information to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process and manage your social media content</li>
              <li>Generate analytics and insights for your accounts</li>
              <li>Communicate with you about updates and support</li>
              <li>Ensure security and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4. Data Sharing and Disclosure</h2>
            <p className="text-gray-700 mb-3">We do not sell your personal information. We may share your data with:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>
                <strong>Service Providers:</strong> Third-party vendors who assist in operating
                our services (e.g., hosting, analytics).
              </li>
              <li>
                <strong>Social Media Platforms:</strong> When you authorize us to post or access
                data on your behalf.
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law or to protect our rights.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5. Data Security</h2>
            <p className="text-gray-700">
              We implement appropriate technical and organizational measures to protect your
              personal information against unauthorized access, alteration, disclosure, or
              destruction. This includes encryption, secure servers, and regular security audits.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">6. Data Retention</h2>
            <p className="text-gray-700">
              We retain your information for as long as your account is active or as needed to
              provide services. You may request deletion of your data at any time by contacting
              us or through your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">7. Your Rights</h2>
            <p className="text-gray-700 mb-3">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify or update inaccurate information</li>
              <li>Delete your personal data</li>
              <li>Restrict or object to certain processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">8. Third-Party Services</h2>
            <p className="text-gray-700">
              Our service integrates with third-party platforms including Meta (Instagram, Facebook),
              TikTok, and others. Your use of these platforms is governed by their respective
              privacy policies. We encourage you to review their policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">9. Children&apos;s Privacy</h2>
            <p className="text-gray-700">
              Our services are not intended for individuals under 13 years of age. We do not
              knowingly collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">10. Changes to This Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">11. Contact Us</h2>
            <p className="text-gray-700">
              If you have questions about this Privacy Policy or our privacy practices, please
              contact us at:
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
