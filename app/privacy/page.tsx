import Link from 'next/link'
import {
  LegalCallout,
  LegalPage,
  LegalSection,
  LegalSubheading,
  LegalTable,
} from '@/app/_components/legal-page'

export const metadata = {
  title: 'Privacy Policy — Iurix Accreditation',
}

// Published 2026-08-24 from .planning/legal/privacy-policy.md. The prose is the
// draft's, unchanged — this file is a transcription into the shared legal
// template, not an edit.
//
// Two substantive departures from the draft, both deliberate:
//
//   • §4 carried a paragraph claiming "the training course content is served
//     from our own infrastructure … Articulate does not receive, process, or
//     observe staff member activity during training", under a [PUBLICATION
//     GATE] noting it describes an intended end state and is NOT true today:
//     courses.rise_embed_url is a share.articulate.com URL. Publishing it would
//     have put a false statement in a legally operative document, so the
//     paragraph is DELETED and Articulate Global, LLC is listed as a
//     sub-processor instead — which is what is actually true. When the Rise
//     export is self-hosted behind a session-gated route, drop the row and
//     restore the paragraph, in the same commit as the routing change.
//   • Postal-address rows are omitted entirely rather than printed as [TBD],
//     and every contact slot resolves to info@iurixaccreditation.com.
//
// [CONFIRM] annotations sitting under finished text (state privacy regimes,
// analytics) are dropped; the text they annotate is kept verbatim. Katy reviews
// it live.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="Effective date: 24 August 2026" >
      <section>
        <p>
          Iurix Accreditation (“Iurix,” “we,” “us,” or “our”) provides AI-use training and
          certification for law firm staff (the “Service”). This Privacy Policy describes how
          we collect, use, disclose, and safeguard information about firm administrators and
          the staff members they enroll when you use our Service or visit our website at{' '}
          <a href="https://iurixaccreditation.com" className={LINK}>
            iurixaccreditation.com
          </a>{' '}
          (the “Site”).
        </p>
        <p>
          Iurix Accreditation is operated by <strong>BSBR Holdings, LLC d/b/a Iurix</strong>.
        </p>
        <p>
          By accessing or using the Service, you agree to the practices described in this
          Privacy Policy. If you do not agree, please do not use the Service.
        </p>
      </section>

      <LegalSection title="1. Who We Are and Our Role">
        <p>
          Iurix provides policy, training and certification services directly to law firms and
          to the individual staff members those firms enroll.
        </p>
        <p>
          <strong>
            Unlike a practice management or case management platform, Iurix does not hold your
            clients’ data.
          </strong>{' '}
          The Service contains no case files, no client records, no immigration or litigation
          documents, and no attorney work product. Nothing stored in Iurix is subject to
          attorney-client privilege, because no privileged material ever enters the Service.
        </p>
        <p>
          What we hold is a record of <em>training and certification</em> — who was enrolled,
          what they completed, how they scored, and what certificate was issued. For that
          data, <strong>Iurix acts as a data controller</strong>: we determine what is
          collected and how it is used, because the integrity of a certification record is the
          product itself.
        </p>
      </LegalSection>

      <LegalSection title="2. Information We Collect">
        <LegalSubheading>Firm and Administrator Information</LegalSubheading>
        <p>
          When a firm purchases seats and an administrator sets up an account, we collect:
        </p>
        <ul className={LIST}>
          <li>Firm name</li>
          <li>Administrator name and email address</li>
          <li>
            Billing information, processed by our payment processor.{' '}
            <strong>We never receive or store full payment card numbers</strong>
          </li>
          <li>Subscription details — seat count, billing period, and renewal date</li>
          <li>
            <strong>A record of acceptance:</strong> which version of these terms the
            administrator accepted, and the date and time they accepted it. We store the
            version rather than a simple yes, because an acceptance is only meaningful if it
            identifies the exact wording that was agreed to
          </li>
        </ul>

        <LegalSubheading>Staff Member Information</LegalSubheading>
        <p>When a firm administrator invites a staff member, we collect:</p>
        <ul className={LIST}>
          <li>Name and email address, as supplied by the administrator</li>
          <li>
            <strong>A record of acceptance:</strong> which version of these terms the staff
            member accepted when they set their password, and the date and time they accepted
            it
          </li>
        </ul>
        <p>
          We do <strong>not</strong> collect profile photographs or any other image of a staff
          member.
        </p>
        <LegalCallout label="Important">
          <p>
            Staff members are typically enrolled <em>by their employer</em>, not by their own
            choice. If you are a staff member and have questions about why you were enrolled,
            speak to your firm administrator in the first instance. You retain the rights
            described in Section 7 regardless.
          </p>
        </LegalCallout>

        <LegalSubheading>Training and Certification Records</LegalSubheading>
        <p>
          This is the core of what the Service exists to produce. For each enrolled staff
          member we record:
        </p>
        <ul className={LIST}>
          <li>
            Progress through the training content, including which lesson was last reached and
            total time spent
          </li>
          <li>
            Knowledge check and assessment attempts, including the score for each attempt and
            whether it passed
          </li>
          <li>
            The specific set of questions served in each assessment attempt. Each sitting draws
            from a larger pool, so we record which questions were actually asked; without that,
            a result cannot be re-examined against the exam the person actually sat
          </li>
          <li>A session record tying each attempt to the sitting it belongs to</li>
          <li>
            Certificate issuance — a unique certificate number, the issue date, and the expiry
            date
          </li>
          <li>The generated PDF certificate itself</li>
          <li>
            <strong>
              The IP address and browser user-agent captured at the moment of assessment
              submission
            </strong>
          </li>
        </ul>
        <p>
          That last item deserves explanation. When a staff member submits the certifying
          assessment, they make an identity attestation — a confirmation that they personally
          completed the training. We record the IP address and user-agent alongside that
          attestation because a certificate that cannot be tied to a submission event is not
          credible evidence of supervision. This data exists to make your compliance record
          defensible.
        </p>

        <LegalSubheading>Usage and Log Data</LegalSubheading>
        <p>
          We automatically collect limited operational data, including error reports,
          performance data, and request logs generated by our hosting infrastructure.
        </p>

        <LegalSubheading>Communications</LegalSubheading>
        <p>
          If you contact us for support, we retain a record of that correspondence in order to
          resolve the issue and improve our support.
        </p>

        <LegalSubheading>What We Do Not Collect</LegalSubheading>
        <ul className={LIST}>
          <li>We do not collect client data, case data, or any legal work product</li>
          <li>
            We do not use advertising cookies, cross-site trackers, or third-party marketing
            analytics
          </li>
          <li>
            We do not collect biometric data, precise geolocation, or data from third-party
            social accounts
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How We Use Your Information">
        <p>We use the information we collect to:</p>
        <ul className={LIST}>
          <li>Provision firm accounts and staff seats</li>
          <li>Deliver the training content and administer the certification assessment</li>
          <li>Score assessments and determine whether a passing standard was met</li>
          <li>Generate, store, and deliver certificates</li>
          <li>
            Give firm administrators a dashboard showing completion status, scores, and
            certificate validity
          </li>
          <li>
            Send transactional email — invitations, reminders, certificate delivery, and
            renewal notices
          </li>
          <li>Process payments and send billing correspondence</li>
          <li>Detect, prevent, and address security incidents or abuse</li>
          <li>Comply with applicable legal obligations</li>
        </ul>
        <p>
          <strong>
            We do not sell your information, and we do not sell or share the information of the
            staff members you enroll.
          </strong>
        </p>
        <p>
          <strong>We do not use your data to train artificial intelligence models.</strong> There
          is no artificial intelligence in the certification pathway: the assessment questions are
          fixed, scoring is deterministic and performed on our servers, and the answer key is
          human-written.
        </p>
      </LegalSection>

      <LegalSection title="4. Data Sharing and Sub-Processors">
        <p>
          We share data with a small number of vendors who provide the infrastructure the
          Service runs on. Each operates under its own data processing terms.
        </p>
        <LegalTable>
          <thead>
            <tr>
              <th className={TH}>Sub-processor</th>
              <th className={TH}>Purpose</th>
              <th className={TH}>Data involved</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={TDSTRONG}>Supabase</td>
              <td className={TD}>Database, authentication, and file storage</td>
              <td className={TD}>
                Account records, training and certification records, stored certificate PDFs
              </td>
            </tr>
            <tr>
              <td className={TDSTRONG}>Stripe</td>
              <td className={TD}>Payment processing and subscription management</td>
              <td className={TD}>
                Billing contact and payment details. Card data is handled by Stripe and is not
                stored on our systems
              </td>
            </tr>
            <tr>
              <td className={TDSTRONG}>Cloudflare</td>
              <td className={TD}>Application hosting, content delivery, and scheduled jobs</td>
              <td className={TD}>Request traffic and operational logs</td>
            </tr>
            <tr>
              <td className={TDSTRONG}>Resend</td>
              <td className={TD}>Transactional email delivery</td>
              <td className={TD}>Recipient email addresses and message content</td>
            </tr>
            <tr>
              <td className={TDSTRONG}>Articulate Global, LLC</td>
              <td className={TD}>Interactive training course delivery</td>
              <td className={TD}>Staff member activity during training</td>
            </tr>
          </tbody>
        </LegalTable>
        <p>
          We do not share training or certification data with any party beyond what is necessary
          to operate the Service.
        </p>

        <LegalSubheading>Sharing Within Your Firm</LegalSubheading>
        <p>
          By design,{' '}
          <strong>
            your firm administrator can see your training status, your assessment scores, and
            your certificate.
          </strong>{' '}
          This is the purpose of the Service — it exists so that a supervising attorney can
          document that their staff have been trained. Staff members should understand that
          their results are visible to their employer.
        </p>

        <LegalSubheading>Certificate Verification</LegalSubheading>
        <p>
          Every certificate carries a verification code and a QR code resolving to a page on our
          site. Anyone holding a certificate, or its code, can use that page to confirm the
          certificate is genuine. The page discloses the certificate number, the holder’s name,
          the firm name, the issue and expiry dates, the current status, and, where a
          certificate has been revoked, the reason recorded for the revocation. It does{' '}
          <strong>not</strong> disclose assessment scores.
        </p>
        <p>
          This is deliberate, and it is what makes a certificate worth anything: a credential
          nobody can check is not evidence. Presenting a certificate to a client, auditor or
          regulator therefore lets that party confirm its status independently. Someone who has
          not been given a certificate cannot look one up by guessing, because the manually
          typed route requires the holder’s surname alongside the certificate number.
        </p>

        <LegalSubheading>Legal Requirements</LegalSubheading>
        <p>
          We may disclose information where required by law, regulation, court order, or
          governmental authority, or where we believe in good faith that disclosure is necessary
          to protect the rights, property, or safety of Iurix, our customers, or others.
        </p>

        <LegalSubheading>Business Transfers</LegalSubheading>
        <p>
          If Iurix is involved in a merger, acquisition, or sale of assets, information may be
          transferred as part of that transaction. We will provide notice before your data
          becomes subject to a different privacy policy.
        </p>
      </LegalSection>

      <LegalSection title="5. Data Retention">
        <p>
          Retention here works differently from most software services, and the reason matters.
        </p>
        <p>
          <strong>
            Certification records are retained for a minimum of seven (7) years from the date of
            certificate issuance.
          </strong>{' '}
          A certificate is evidence that a firm trained a named person against its own AI policy
          and standards on a given date, and assessed them on it. That evidence has to survive
          longer than the subscription that produced it: a record that vanishes when a firm stops
          paying is worthless as a compliance artifact. Retained records include the certificate,
          the assessment result that produced it, and the attestation metadata described in
          Section 2.
        </p>
        <p>Other retention periods:</p>
        <ul className={LIST}>
          <li>
            <strong>Account and billing records</strong> — retained for the life of the
            subscription and afterwards as required by applicable tax and accounting law
          </li>
          <li>
            <strong>Operational logs</strong> — retained on a rolling short-term basis for
            security and troubleshooting
          </li>
          <li>
            <strong>Support correspondence</strong> — retained for as long as needed to resolve
            and audit the issue
          </li>
        </ul>

        <LegalSubheading>When a Staff Member Is Removed</LegalSubheading>
        <p>
          If a firm administrator deletes a staff member, we{' '}
          <strong>redact that person’s directly identifying information</strong> — their email
          address is replaced with a non-routable placeholder value and their account is marked
          deleted — while{' '}
          <strong>preserving the underlying training and certification record</strong>.
        </p>
        <p>
          This is deliberate, and we want to be plain about it: the firm’s compliance evidence
          survives the removal of the individual, but the individual is no longer identifiable
          within it in the ordinary course. If you need complete erasure of a record rather than
          redaction, contact us using the details in Section 10; we will assess the request
          against our and the firm’s retention obligations.
        </p>
      </LegalSection>

      <LegalSection title="6. Data Security">
        <p>
          We implement technical and organizational measures designed to protect your data,
          including:
        </p>
        <ul className={LIST}>
          <li>
            <strong>Encryption in transit</strong> — all traffic is served over TLS
          </li>
          <li>
            <strong>Encryption at rest</strong> — data is encrypted at the storage layer by our
            infrastructure providers
          </li>
          <li>
            <strong>Tenant isolation enforced at the database layer</strong> — every firm’s
            records are separated by row-level security policies, so a query issued on behalf of
            one firm cannot return another firm’s rows
          </li>
          <li>
            <strong>Role-based access</strong> — administrators and staff members see different
            data, enforced on the server rather than in the browser
          </li>
          <li>
            <strong>Private certificate storage</strong> — certificate PDFs are held in private
            storage and are reachable only through short-lived signed links, not public URLs
          </li>
          <li>
            <strong>Server-side scoring</strong> — assessments are scored on our servers. A score
            submitted by a browser is never trusted
          </li>
        </ul>
        <p>
          No method of transmission or storage is completely secure. If you become aware of a
          potential security incident involving your Iurix account, please notify us immediately
          at{' '}
          <a href="mailto:info@iurixaccreditation.com" className={LINK}>
            info@iurixaccreditation.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Your Rights and Choices">
        <p>You have the following rights in respect of your personal data:</p>
        <ul className={LIST}>
          <li>
            <strong>Access</strong> — request a copy of the data associated with you
          </li>
          <li>
            <strong>Correction</strong> — correct inaccurate account information, through the
            Service or by contacting us
          </li>
          <li>
            <strong>Deletion</strong> — request deletion of your data, subject to the
            certification retention obligations described in Section 5
          </li>
          <li>
            <strong>Portability</strong> — request your records in a structured,
            machine-readable format
          </li>
          <li>
            <strong>Objection and restriction</strong> — ask us to limit how we process your data
            in certain circumstances
          </li>
        </ul>
        <p>
          Firm administrators can exercise most of these directly in the dashboard. Staff members
          should contact their firm administrator first for account changes, and may contact us
          directly at any time.
        </p>

        <LegalSubheading>California Residents</LegalSubheading>
        <p>
          California residents have additional rights under the California Consumer Privacy Act,
          including the right to know what personal information is collected, the right to
          request deletion, and the right to opt out of the sale of personal information.{' '}
          <strong>Iurix does not sell personal information.</strong> To exercise these rights,
          contact us using the details in Section 10.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies">
        <p>
          The Site and Service use cookies that are strictly necessary for operation:
        </p>
        <ul className={LIST}>
          <li>
            <strong>Session cookies</strong> — maintain your signed-in state
          </li>
          <li>
            <strong>Persistent sign-in</strong> — where you choose “remember me,” a longer-lived
            session cookie is set
          </li>
          <li>
            <strong>Preference cookies</strong> — remember display settings such as your light or
            dark theme choice
          </li>
        </ul>
        <p>
          We do not use advertising cookies, cross-site tracking cookies, or third-party analytics
          scripts that collect personally identifiable information.
        </p>
      </LegalSection>

      <LegalSection title="9. Children’s Privacy">
        <p>
          The Service is intended for legal professionals and law firm staff in a workplace
          setting. We do not knowingly collect personal information from individuals under 18. If
          you believe we have inadvertently done so, contact us and we will promptly delete it.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact Us">
        <LegalTable>
          <tbody>
            <tr>
              <th className={THROW}>Privacy enquiries</th>
              <td className={TD}>
                <a href="mailto:info@iurixaccreditation.com" className={LINK}>
                  info@iurixaccreditation.com
                </a>
              </td>
            </tr>
            <tr>
              <th className={THROW}>Security incidents</th>
              <td className={TD}>
                <a href="mailto:info@iurixaccreditation.com" className={LINK}>
                  info@iurixaccreditation.com
                </a>
              </td>
            </tr>
          </tbody>
        </LegalTable>
        <p>We aim to respond to verifiable requests within 30 days.</p>
      </LegalSection>

      <LegalSection title="11. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. If we make material changes, we
          will notify account holders by email and post a prominent notice on the Site at least
          30 days before the changes take effect. Continued use of the Service after the
          effective date constitutes acceptance of the updated Policy.
        </p>
        <p>
          See also our{' '}
          <Link href="/terms" className={LINK}>
            Terms of Service
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  )
}

const LIST = 'ml-5 list-disc space-y-2 marker:text-gold'
const LINK = 'underline decoration-silver underline-offset-4 transition-colors hover:text-teal-mid'
const TH = 'border-b border-steel py-2.5 pr-4 text-left text-[13px] font-medium uppercase tracking-[0.12em] text-ink-mute'
const THROW = 'border-b border-silver py-3 pr-6 text-left align-top font-medium text-ink'
const TD = 'border-b border-silver py-3 pr-4 align-top'
const TDSTRONG = 'border-b border-silver py-3 pr-4 align-top font-medium text-ink'
