import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy — Local Haven" };

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <nav className="privacy-navigation" aria-label="Privacy page navigation">
        <a href="/">← Back to Local Haven</a>
      </nav>
      <article className="privacy-policy">
        <h1>Local Haven Demo Privacy Policy</h1>
        <p>
          <strong>Last updated: September 9, 2026</strong>
        </p>
        <p>
          Local Haven is currently an early-stage demonstration and testing
          project. This Privacy Policy explains what personal information may be
          collected when you use the Local Haven demo and submit feedback.
        </p>
        <h2>1. Who operates Local Haven?</h2>
        <p>
          Local Haven is currently operated as an independent early-stage
          project.
        </p>
        <p>
          For questions about your personal data or this Privacy Policy,
          contact:
        </p>
        <p>
          <strong>[YOUR CONTACT EMAIL]</strong>
        </p>
        <h2>2. Information we collect</h2>
        <p>
          When you use the Local Haven demo, we may collect information that you
          voluntarily provide through the feedback form, including:
        </p>
        <ul>
          <li>your name, if provided;</li>
          <li>your email address, if provided;</li>
          <li>your feedback and written responses;</li>
          <li>
            whether you indicate that you would use a product like Local Haven;
            and
          </li>
          <li>the time your feedback was submitted.</li>
        </ul>
        <p>Providing your name and email address is optional.</p>
        <p>
          The tenant, property, conversation, and messaging information shown as
          part of the current demo is demonstration data and is not intended to
          represent real tenants or real communications.
        </p>
        <p>
          Please do not submit sensitive personal information through the
          feedback form.
        </p>
        <h2>3. Why we use this information</h2>
        <p>We use feedback information to:</p>
        <ul>
          <li>evaluate whether Local Haven is useful;</li>
          <li>
            understand how testers interact with and perceive the product;
          </li>
          <li>identify problems and potential improvements;</li>
          <li>develop and improve Local Haven; and</li>
          <li>
            contact you about your feedback if you voluntarily provide an email
            address.
          </li>
        </ul>
        <p>
          We do not use feedback email addresses for advertising or unrelated
          marketing without obtaining an appropriate legal basis first.
        </p>
        <h2>4. Legal basis</h2>
        <p>
          Where the GDPR applies, we process feedback submitted through the demo
          for the legitimate interests of evaluating, securing, and improving
          Local Haven as an early-stage product.
        </p>
        <p>
          Where you voluntarily provide contact information, we may use it to
          respond to or follow up on the feedback you submitted.
        </p>
        <p>
          You are not required to provide your name or email address in order to
          submit feedback.
        </p>
        <h2>5. Service providers</h2>
        <p>
          We use third-party service providers to operate the Local Haven demo.
        </p>
        <p>These currently include:</p>
        <ul>
          <li>
            <strong>Vercel</strong>, which hosts the web application;
          </li>
          <li>
            <strong>Supabase</strong>, which provides database and backend
            infrastructure; and
          </li>
          <li>
            <strong>Resend</strong>, which is used to deliver feedback
            submissions by email.
          </li>
        </ul>
        <p>
          These providers may process limited personal information on our behalf
          as necessary to provide their services.
        </p>
        <p>
          Some processing may take place outside the European Economic Area,
          including in the United States. Where required, appropriate safeguards
          provided under applicable data-protection law are used by our service
          providers for international transfers.
        </p>
        <h2>6. How long we keep information</h2>
        <p>
          Feedback and associated contact information will be retained only for
          as long as reasonably necessary to evaluate and improve the Local
          Haven demo.
        </p>
        <p>
          For this testing phase, we aim to delete identifiable feedback data no
          later than <strong>12 months after submission</strong>, unless we have
          a legitimate reason or legal obligation to retain it longer.
        </p>
        <p>
          We may retain anonymized feedback that can no longer reasonably be
          linked to an individual.
        </p>
        <h2>7. Sharing your information</h2>
        <p>We do not sell your personal information.</p>
        <p>
          Information may be shared with the service providers described above
          only as necessary to operate the demo and process feedback.
        </p>
        <p>
          We may also disclose information where required by applicable law.
        </p>
        <h2>8. Your rights</h2>
        <p>
          Depending on where you live, including if the GDPR applies to you, you
          may have rights relating to your personal data, including the right
          to:
        </p>
        <ul>
          <li>request access to your personal data;</li>
          <li>request correction of inaccurate data;</li>
          <li>request deletion of your data;</li>
          <li>request restriction of processing;</li>
          <li>object to certain processing;</li>
          <li>request data portability where applicable; and</li>
          <li>
            lodge a complaint with the relevant data-protection authority.
          </li>
        </ul>
        <p>
          To make a privacy request, contact{" "}
          <strong>[YOUR CONTACT EMAIL]</strong>.
        </p>
        <h2>9. Cookies and local storage</h2>
        <p>
          The Local Haven demo may use browser local storage or similar
          technology for essential functionality, such as remembering whether
          you have already completed or dismissed the demo onboarding
          experience.
        </p>
        <p>
          We do not currently use this information for targeted advertising.
        </p>
        <p>
          If analytics, advertising, or other non-essential tracking
          technologies are added later, this Privacy Policy and any required
          consent mechanisms will be updated before those technologies are used.
        </p>
        <h2>10. Security</h2>
        <p>
          We take reasonable measures to protect information processed through
          the Local Haven demo. However, no online service can guarantee
          absolute security.
        </p>
        <p>
          Because Local Haven is currently a testing environment, testers should
          not submit confidential, financial, health, or other sensitive
          information.
        </p>
        <h2>11. Changes to this policy</h2>
        <p>
          As Local Haven develops, our data practices may change. We may update
          this Privacy Policy accordingly.
        </p>
        <p>
          The latest version will be made available through the Local Haven
          website, with the date of the most recent update shown at the top.
        </p>
      </article>
    </main>
  );
}
