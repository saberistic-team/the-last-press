import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { SELLER_NAME } from "@/components/SiteFooter";
import { LegalPage, Section } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — The Last Person" },
      {
        name: "description",
        content:
          "The terms governing your use of The Last Person, including membership, acceptable use, and suspension.",
      },
      { property: "og:title", content: "Terms & Conditions — The Last Person" },
      { property: "og:description", content: "Terms governing use of The Last Person." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <LegalPage title="Terms & Conditions" updated="23 August 2026">
        <Section n="1" t="Who you are contracting with">
          The Last Person is operated by {SELLER_NAME} ("we", "us"). By creating an account, pressing
          the button, or continuing to use the site, you agree to these terms. If you are using the
          service on behalf of an organisation, you confirm you have authority to bind it. If you are
          using it as an individual, you confirm you are of legal age in your country.
        </Section>
        <Section n="2" t="What the service is">
          The Last Person is an online game built around a single shared countdown. Accounts receive a
          limited number of button presses each month. A paid membership adds ten further presses each
          month. Spectating is free. Presses have no cash value, cannot be exchanged for money, and are
          not transferable between accounts.
        </Section>
        <Section n="3" t="Your account">
          Keep your credentials confidential; you are responsible for everything done under your
          account. Provide accurate information and keep it current. One account per person — creating
          multiple accounts to gain extra presses is a breach of these terms.
        </Section>
        <Section n="4" t="Acceptable use">
          You must not use the service unlawfully; commit fraud, spam or payment abuse; infringe
          anyone's intellectual property; automate or script presses; probe, scrape, overload or
          otherwise interfere with the security or integrity of the service; or attempt to manipulate
          the outcome of a season by means other than pressing the button in the app.
        </Section>
        <Section n="5" t="Intellectual property">
          We retain all ownership of the service, including its software, design, branding and
          documentation. You get a limited, non-exclusive, non-transferable right to use the service
          within your plan. No reverse engineering, resale, redistribution, or circumvention of
          technical limits.
        </Section>
        <Section n="6" t="Service level">
          The service is provided on an "as is" and "as available" basis. We do not guarantee
          uninterrupted, timely or error-free operation, and to the fullest extent permitted by law we
          disclaim all implied warranties, including merchantability and fitness for a particular
          purpose. Seasons may be paused, reset or ended for maintenance or integrity reasons.
        </Section>
        <Section n="7" t="Payment, billing and subscriptions">
          Membership is billed monthly at the price shown at checkout and renews automatically until
          cancelled. You can cancel any time from your account page; access and member presses continue
          until the end of the paid period. Payment, billing, tax, cancellation and refund mechanics are
          handled by our payment processor, Stripe. Applicable sales tax or VAT is
          calculated and added at checkout where required.
        </Section>
        <Section n="8" t="Seller and payment processing">
          {SELLER_NAME} is the seller of record for all orders. Card payments, receipts and invoices are
          processed by Stripe; we never see or store your full card details. Billing questions, refunds
          and cancellations are handled by {SELLER_NAME} support.
        </Section>
        <Section n="9" t="Suspension and termination">
          We may suspend or terminate your access for material breach of these terms, non-payment,
          security or fraud risk, or repeated or serious policy violations. On termination your right to
          use the service ends; public season history and usernames may remain visible as part of the
          game record.
        </Section>
        <Section n="10" t="Liability">
          To the fullest extent permitted by law, our aggregate liability is capped at the fees you paid
          us in the twelve months before the claim, and we exclude indirect, consequential or special
          damages including loss of profits, data or goodwill. Nothing here limits liability for fraud,
          death or personal injury where the law does not allow it.
        </Section>
        <Section n="11" t="General">
          You indemnify us against claims arising from your unlawful use of the service or your breach
          of these terms. These terms are governed by the laws of the State of Washington, USA, and
          disputes are subject to the courts of that jurisdiction. You may not assign these terms; we may
          assign them as part of a merger or acquisition. Neither party is liable for delays caused by
          events beyond reasonable control. We may update these terms; material changes will be posted
          here with a new date.
        </Section>
        <Section n="12" t="Contact">
          Questions about these terms: contact {SELLER_NAME} through the support channel listed on our
          site. Billing and refund questions are handled by us directly.
        </Section>
      </LegalPage>
    </div>
  );
}
