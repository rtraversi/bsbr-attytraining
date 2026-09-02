import Link from 'next/link'
import {
  LegalDisclaimer,
  LegalPage,
  LegalSection,
  LegalSubheading,
  LegalTable,
} from '@/app/_components/legal-page'

export const metadata = {
  title: 'Terms of Service: Iurix Accreditation',
}

// Published 2026-08-24 from .planning/legal/terms-of-service.md. The prose is
// the draft's, unchanged — this file is a transcription into the shared legal
// template, not an edit. Anything that reads like a rewrite is a bug.
//
// Four things the draft carried that this page does not:
//
//   • §16 "Dispute Resolution" was an empty [CONFIRM] asking counsel to decide
//     between inherited AAA arbitration and something else. It is DELETED
//     rather than shipped empty: silence means default law applies, which is a
//     deliberate outcome, whereas inheriting an arbitration clause nobody chose
//     is not. Everything after it is renumbered and §14's survival list was
//     updated to match (was "15 through 18", now "15 through 17").
//   • Postal-address rows are omitted entirely rather than printed as [TBD].
//   • [CONFIRM] annotations sitting under finished text are dropped; the text
//     they annotate is kept verbatim. Katy reviews it live.
//   • Every contact slot resolves to info@iurixaccreditation.com.
//
// 🔴 If you change a word of the operative text, bump CURRENT_TERMS_VERSION in
// lib/legal/terms.ts in the SAME commit. Acceptances are stored against that
// string, and a version that no longer pins the wording it was accepted under
// is worse than no version at all.
export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="Last updated: 24 August 2026">
      <section>
        <p>
          These Terms of Service (“Terms”) constitute a legally binding agreement between
          you (“Customer,” “you,” or “your”) and <strong>BSBR Holdings, LLC d/b/a Iurix</strong>{' '}
          (“Iurix,” “we,” “us,” or “our”) governing access to and use of the Iurix
          Accreditation training and certification service (the “Service”).
        </p>
        <p>
          By purchasing seats, creating an account, accepting an invitation, or otherwise
          using the Service, you agree to be bound by these Terms on behalf of yourself
          and, where applicable, your law firm.
        </p>
        <p>If you do not agree to these Terms, do not access or use the Service.</p>
      </section>

      <LegalSection title="1. Eligibility">
        <p>
          The Service is intended for law firms, licensed attorneys, and their staff in the
          United States. By using the Service you represent and warrant that:
        </p>
        <ul className={LIST}>
          <li>You are at least 18 years of age;</li>
          <li>
            You are purchasing on behalf of a law firm or legal practice, or you have been
            enrolled by a firm that has done so;
          </li>
          <li>
            Your use of the Service complies with applicable law and with the rules of
            professional conduct that apply to you; and
          </li>
          <li>
            If you are purchasing seats, you have authority to bind your firm to these
            Terms.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. The Service">
        <p>Iurix Accreditation provides:</p>
        <ul className={LIST}>
          <li>
            An interactive training course covering responsible use of artificial
            intelligence in legal practice
          </li>
          <li>A scored certification assessment</li>
          <li>
            A dated certificate of completion, issued on a passing result, bearing a unique
            certificate number
          </li>
          <li>
            An administrative dashboard through which a firm can monitor enrollment,
            completion, scores, and certificate validity, and can issue reminders
          </li>
        </ul>
        <p>
          Course content and assessment questions are revised periodically.{' '}
          <strong>The course is substantially updated each year</strong> to reflect
          developments in professional conduct guidance and case law, which is why
          certificates carry a fixed validity period rather than being permanent.
        </p>

        <LegalSubheading>What the Service Is Not</LegalSubheading>
        <p>
          <strong>Iurix is not a law firm and does not provide legal advice.</strong>{' '}
          Nothing in the Service, the course, or any certificate constitutes legal advice
          or a legal opinion.
        </p>
        <p>
          <strong>Certificates are not accreditation.</strong> A Iurix certificate records
          that a named individual completed a course of training and passed an assessment
          on a given date. It is <strong>not</strong> continuing legal education credit,{' '}
          <strong>not</strong> approved or endorsed by the American Bar Association or any
          state bar, and <strong>not</strong> a guarantee or determination that you or your
          firm are in compliance with ABA Model Rule 5.3 or any other rule.
        </p>
        <p>
          Whether the training you procure constitutes “reasonable efforts” to supervise
          nonlawyer assistants is a judgment that depends on your circumstances and remains
          yours to make. You may not represent to any client, court, regulator, or third
          party that Iurix has certified your firm’s compliance.
        </p>
      </LegalSection>

      <LegalSection title="3. Accounts and Access">
        <LegalSubheading>Firm Administrator</LegalSubheading>
        <p>
          The individual who purchases seats becomes the firm administrator. That person is
          responsible for maintaining the confidentiality of their credentials, for
          enrolling staff, and for all activity under the firm’s account.
        </p>

        <LegalSubheading>Enrolled Staff</LegalSubheading>
        <p>
          The firm administrator may enroll staff members (“Enrolled Users”) up to the number
          of seats purchased. You are responsible for ensuring Enrolled Users comply with
          these Terms, and for promptly removing any individual who should no longer have
          access.
        </p>
        <p>
          <strong>
            Enrolled Users should be aware that their training progress, assessment scores,
            and certificate status are visible to their firm administrator.
          </strong>{' '}
          This visibility is the purpose of the Service.
        </p>

        <LegalSubheading>Account Security</LegalSubheading>
        <p>
          You are responsible for the security of your credentials and for notifying us
          promptly of any unauthorized access.
        </p>
      </LegalSection>

      <LegalSection title="4. Assessment Integrity">
        <p>
          Certification depends on the assessment being taken honestly. You agree that:
        </p>
        <ul className={LIST}>
          <li>
            Each Enrolled User will personally complete their own training and assessment;
          </li>
          <li>No person will complete training or an assessment on behalf of another;</li>
          <li>
            Assessment questions and answers will not be recorded, distributed, or shared;
            and
          </li>
          <li>The identity attestation presented at submission will be made truthfully.</li>
        </ul>
        <p>
          At the point of submission we record the submitting user’s IP address and browser
          user-agent alongside the attestation, as described in our{' '}
          <Link href="/privacy" className={LINK}>
            Privacy Policy
          </Link>
          .
        </p>
        <p>
          <strong>We may revoke a certificate</strong> where we determine on reasonable
          grounds that it was obtained in breach of this section. Revocation does not
          entitle you to a refund. Where we revoke a certificate we will notify the firm
          administrator and, where appropriate, the affected individual.
        </p>
      </LegalSection>

      <LegalSection title="5. Fees and Payment">
        <LegalSubheading>Pricing</LegalSubheading>
        <p>
          Access is sold <strong>per staff member, per year</strong>, at volume rates
          determined by the total number of seats purchased:
        </p>
        <LegalTable>
          <thead>
            <tr>
              <th className={TH}>Seats</th>
              <th className={TH}>Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={TD}>1–9</td>
              <td className={TD}>$35 per seat, per year</td>
            </tr>
            <tr>
              <td className={TD}>10–24</td>
              <td className={TD}>$32 per seat, per year</td>
            </tr>
            <tr>
              <td className={TD}>25 or more</td>
              <td className={TD}>$28 per seat, per year</td>
            </tr>
          </tbody>
        </LegalTable>
        <p>
          <strong>
            All seats are billed at the rate for the band your total seat count falls into.
          </strong>{' '}
          A firm purchasing twelve seats pays twelve seats at the 10–24 rate, not a blend of
          rates. Fees are stated and charged in U.S. dollars, exclusive of applicable taxes.
        </p>

        <LegalSubheading>Billing and Renewal</LegalSubheading>
        <p>
          Subscriptions are billed annually in advance and{' '}
          <strong>renew automatically</strong> at the end of each annual term unless
          cancelled beforehand.
        </p>
        <p>
          <strong>The renewal rate is the same as the initial rate for your band.</strong>{' '}
          There is no introductory discount and no renewal discount. If your seat count
          changes such that you move into a different volume band, the rate for the new band
          applies.
        </p>
        <p>
          You may manage your subscription, including cancellation and payment method
          updates, through the billing portal accessible from your dashboard.
        </p>

        <LegalSubheading>Refunds</LegalSubheading>
        <p>
          <strong>
            Refunds are available within 14 days of purchase, and only if no certificate has
            yet been issued under the subscription. Once any certificate has been issued, the
            purchase is non-refundable.
          </strong>
        </p>
        <p>
          The reason is straightforward: a certificate, once issued, is a permanent record
          delivered to you, and it remains valid whether or not you continue as a customer.
        </p>
        <p>
          To request a refund, contact us at{' '}
          <a href="mailto:info@iurixaccreditation.com" className={LINK}>
            info@iurixaccreditation.com
          </a>
          .
        </p>

        <LegalSubheading>Failed Payment</LegalSubheading>
        <p>
          If a payment fails, we will attempt to collect and will notify the firm
          administrator. If payment is not received, the firm’s account may be suspended.{' '}
          <strong>Certificates already issued remain valid and accessible.</strong>{' '}
          Suspension prevents new enrollments and new assessments; it does not retroactively
          invalidate a completed certification.
        </p>
      </LegalSection>

      <LegalSection title="6. Certificates">
        <ul className={LIST}>
          <li>A certificate is issued automatically upon a passing assessment result</li>
          <li>
            Each certificate bears a <strong>unique certificate number</strong>, the
            recipient’s name, the issue date, and an expiry date
          </li>
          <li>
            <strong>Certificates are valid for 12 months from the date of issue</strong>
          </li>
          <li>
            Certificates may be downloaded at any time while the account is active, and are
            retained by us in accordance with the retention terms in our Privacy Policy
          </li>
          <li>
            <strong>A certificate reflects a point in time.</strong> Expiry does not mean a
            certificate was invalidated; it means the training it records is no longer
            current
          </li>
        </ul>
        <p>
          Assessments may be retaken without limit until a passing result is achieved. There
          is no additional charge for retakes.
        </p>
      </LegalSection>

      <LegalSection title="7. Acceptable Use">
        <p>You agree not to:</p>
        <ul className={LIST}>
          <li>Share, resell, or transfer access to the Service outside your firm;</li>
          <li>
            Reproduce, redistribute, or publish the course content or assessment materials;
          </li>
          <li>Complete training or an assessment on another person’s behalf;</li>
          <li>Misrepresent the meaning, scope, or authority of a certificate;</li>
          <li>
            Attempt to gain unauthorized access to the Service or to another firm’s data;
          </li>
          <li>Introduce malware or other harmful code;</li>
          <li>Scrape or systematically extract data from the Service; or</li>
          <li>Reverse engineer, decompile, or disassemble any component of the Service.</li>
        </ul>
        <p>
          We may investigate suspected violations and suspend or terminate access where a
          violation is confirmed.
        </p>
      </LegalSection>

      <LegalSection title="8. Intellectual Property">
        <LegalSubheading>Our Rights</LegalSubheading>
        <p>
          Iurix and its licensors own all right, title, and interest in the Service,
          including the course content, assessment questions, software, certificate
          templates, and trademarks. These Terms grant you a limited, non-exclusive,
          non-transferable right to access the Service for the number of seats purchased.
          They grant no ownership interest.
        </p>
        <p>
          The Iurix name, logo, and product names are our trademarks and may not be used
          without prior written permission.
        </p>

        <LegalSubheading>Your Certificate</LegalSubheading>
        <p>
          A certificate is issued to a named individual and records that they completed the
          training on a stated date.{' '}
          <strong>
            You may present it, and reproduce it as far as presenting it requires, to
            evidence that training:
          </strong>{' '}
          to a client, to a regulator or auditor, to a court or insurer, or in your firm’s
          own compliance records. That is what it is for.
        </p>
        <p>That permission is limited, and the limits are the point:</p>
        <ul className={LIST}>
          <li>
            <strong>Unaltered only.</strong> You may not modify, crop, re-typeset, redact,
            or remove any element of a certificate, including the recipient’s name, the
            certificate number, the issue and expiry dates, the score, and the verification
            code. An altered document is not a certificate issued by us and must not be
            presented as one.
          </li>
          <li>
            <strong>No accreditation or endorsement claims.</strong> A certificate records
            that a named person completed training. It does not make that person or your
            firm accredited, certified, endorsed, approved, or partnered by Iurix, and it
            must not be described that way.
          </li>
          <li>
            <strong>Your own certificates only.</strong> You may present certificates issued
            to you or to your Enrolled Users. You may not present, publish, or supply a
            certificate issued to anyone else.
          </li>
          <li>
            <strong>The mark travels with the document, not beyond it.</strong> The
            permission above covers the Iurix name and mark only as they appear on the
            certificate itself. It does not license the name or mark for any other use,
            including websites, advertising, directories, or firm marketing materials.
          </li>
          <li>
            <strong>Revoked and expired certificates.</strong> A certificate revoked under
            Section 4 must not be presented for any purpose once we have notified you. An
            expired certificate may be presented only as a record of training completed at
            that time, never as evidence of current training.
          </li>
        </ul>
        <p>
          Every certificate carries a verification code and a QR code resolving to a page on
          our site that reports its current status, including whether it has been revoked.
          Anyone you present a certificate to can check it independently.
        </p>

        <LegalSubheading>Feedback</LegalSubheading>
        <p>
          If you provide suggestions or feedback about the Service, you grant us a
          royalty-free, worldwide, perpetual license to use it without obligation to you.
        </p>
      </LegalSection>

      <LegalSection title="9. Professional Responsibility">
        <p>You retain full and sole professional responsibility for:</p>
        <ul className={LIST}>
          <li>
            Supervising your nonlawyer staff, including their use of AI tools, under the
            rules of professional conduct applicable to you;
          </li>
          <li>
            Determining whether the training procured through the Service is adequate for
            your circumstances;
          </li>
          <li>
            All work product produced by you or your staff, whether or not AI-assisted; and
          </li>
          <li>
            Your own compliance with all applicable bar rules and legal obligations.
          </li>
        </ul>
        <p>
          <strong>
            Procuring training through Iurix does not discharge, transfer, or reduce any
            professional obligation you hold.
          </strong>{' '}
          It is one piece of evidence that you took a supervisory step. It is not a defense,
          and it is not a substitute for supervision.
        </p>
      </LegalSection>

      <LegalSection title="10. Third-Party Services">
        <p>
          The Service depends on third-party infrastructure providers, identified in our{' '}
          <Link href="/privacy" className={LINK}>
            Privacy Policy
          </Link>
          . We are not responsible for the availability or performance of third-party
          services and make no warranty in respect of them.
        </p>
      </LegalSection>

      <LegalSection title="11. Warranties and Disclaimers">
        <p>
          We warrant that the Service will perform materially in accordance with its
          documentation under normal conditions, and that we will implement commercially
          reasonable security measures as described in our Privacy Policy.
        </p>
        <LegalDisclaimer>
          <p>
            The Service is provided “as is” and “as available.” Except for the express
            warranties above, Iurix disclaims all warranties, express or implied, including
            warranties of merchantability, fitness for a particular purpose, and
            non-infringement. Iurix does not warrant that the Service will be uninterrupted
            or error-free. <strong>
              Iurix makes no warranty that use of the Service will result in compliance with
              ABA Model Rule 5.3, any state bar rule, or any other legal or professional
              obligation, or that any certificate will be accepted as evidence by any court,
              regulator, or bar authority.
            </strong>
          </p>
        </LegalDisclaimer>
      </LegalSection>

      <LegalSection title="12. Limitation of Liability">
        <LegalDisclaimer>
          <p>
            To the maximum extent permitted by law, Iurix will not be liable for any
            indirect, incidental, special, consequential, or punitive damages, including
            lost profits, loss of data, loss of business,{' '}
            <strong>
              or any professional discipline, sanction, malpractice claim, or reputational
              harm
            </strong>
            , arising out of or related to these Terms or the Service, even if advised of the
            possibility of such damages.
          </p>
          <p>
            Iurix’s total cumulative liability arising out of or related to these Terms or
            the Service will not exceed the fees paid by you in the twelve (12) months
            preceding the claim.
          </p>
        </LegalDisclaimer>
        <p>
          Some jurisdictions do not permit certain limitations, so parts of the above may not
          apply to you.
        </p>
      </LegalSection>

      <LegalSection title="13. Indemnification">
        <p>
          You agree to indemnify and hold harmless Iurix and its officers, directors,
          employees, and agents from any claims, damages, losses, liabilities, costs, and
          expenses (including reasonable attorneys’ fees) arising out of: (a) your use of the
          Service in violation of these Terms; (b) your violation of applicable law or
          professional conduct rules; (c){' '}
          <strong>
            any representation you make to a third party about the meaning, scope, or effect
            of a certificate
          </strong>
          ; or (d) any claim by your staff or clients arising from your use of the Service.
        </p>
      </LegalSection>

      <LegalSection title="14. Term and Termination">
        <p>
          These Terms remain in effect for as long as you maintain an active account.
        </p>
        <p>
          <strong>Termination by you</strong>: you may cancel at any time through the
          billing portal. Cancellation takes effect at the end of the current annual term.
          Refunds are governed by Section 5.
        </p>
        <p>
          <strong>Termination by us</strong>: we may suspend or terminate an account for
          material breach, non-payment, a breach of Section 4 (assessment integrity), conduct
          posing a security risk, or as required by law. For non-material breaches we will
          give 30 days’ notice and an opportunity to cure.
        </p>
        <p>
          <strong>Effect of termination</strong>: access to the Service ceases.{' '}
          <strong>
            Certificates already issued remain valid for their stated term, and the
            underlying certification records are retained
          </strong>{' '}
          in accordance with Section 5 of the Privacy Policy. Sections 8, 9, 11, 12, 13, and
          15 through 17 survive termination.
        </p>
      </LegalSection>

      <LegalSection title="15. Governing Law">
        <p>
          These Terms are governed by the laws of the State of North Carolina, without regard
          to conflict of laws principles.
        </p>
      </LegalSection>

      <LegalSection title="16. Changes to These Terms">
        <p>
          We may update these Terms. If we make material changes, we will provide at least 30
          days’ advance notice by email and by posting a notice on the Site. Continued use
          after the effective date constitutes acceptance. If you do not agree, you must stop
          using the Service before that date.
        </p>
      </LegalSection>

      <LegalSection title="17. General Provisions">
        <p>
          <strong>Entire agreement</strong>: these Terms, with the Privacy Policy and any
          order form, constitute the entire agreement and supersede all prior agreements and
          representations.
        </p>
        <p>
          <strong>Severability</strong>: if any provision is held invalid or unenforceable,
          it will be limited to the minimum extent necessary and the remainder will continue
          in force.
        </p>
        <p>
          <strong>No waiver</strong>: failure to enforce a provision is not a waiver of it.
        </p>
        <p>
          <strong>Assignment</strong>: you may not assign these Terms without our written
          consent. We may assign in connection with a merger, acquisition, or sale of assets.
        </p>
        <p>
          <strong>Force majeure</strong>: neither party is liable for delays or failures
          caused by events beyond reasonable control.
        </p>
        <p>
          <strong>Notices</strong>: legal notices to us must be sent to{' '}
          <a href="mailto:info@iurixaccreditation.com" className={LINK}>
            info@iurixaccreditation.com
          </a>
          . Notices to you will be sent to the email address on your account.
        </p>
      </LegalSection>

      <LegalSection title="18. Contact">
        <LegalTable>
          <tbody>
            <tr>
              <th className={THROW}>General and legal enquiries</th>
              <td className={TD}>
                <a href="mailto:info@iurixaccreditation.com" className={LINK}>
                  info@iurixaccreditation.com
                </a>
              </td>
            </tr>
            <tr>
              <th className={THROW}>Billing</th>
              <td className={TD}>
                <a href="mailto:info@iurixaccreditation.com" className={LINK}>
                  info@iurixaccreditation.com
                </a>
              </td>
            </tr>
          </tbody>
        </LegalTable>
      </LegalSection>
    </LegalPage>
  )
}

const LIST = 'ml-5 list-disc space-y-2 marker:text-gold'
const LINK = 'underline decoration-silver underline-offset-4 transition-colors hover:text-teal-mid'
const TH = 'border-b border-steel py-2.5 pr-4 text-left text-[13px] font-medium uppercase tracking-[0.12em] text-ink-mute'
const THROW = 'border-b border-silver py-3 pr-6 text-left align-top font-medium text-ink'
const TD = 'border-b border-silver py-3 pr-4 align-top'
