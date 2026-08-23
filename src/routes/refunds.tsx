import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { SELLER_NAME } from "@/components/SiteFooter";
import { LegalPage, Section } from "@/components/LegalPage";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Refund Policy — The Last Person" },
      {
        name: "description",
        content:
          "Our 30-day money-back guarantee for The Last Person membership, and how to request a refund through Paddle.",
      },
      { property: "og:title", content: "Refund Policy — The Last Person" },
      { property: "og:description", content: "30-day money-back guarantee on membership." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Refunds,
});

function Refunds() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <LegalPage title="Refund Policy" updated="23 August 2026">
        <Section n="01" t="30-day money-back guarantee">
          If you are not satisfied with your The Last Person membership, you can request a full refund
          within 30 days of your order date. This applies to your most recent monthly charge.
        </Section>
        <Section n="02" t="How to request a refund">
          Payments are processed by our reseller Paddle.com, the Merchant of Record. Request a refund at{" "}
          <a
            className="text-primary underline"
            href="https://paddle.net"
            target="_blank"
            rel="noopener noreferrer"
          >
            paddle.net
          </a>{" "}
          using the email address on your receipt, or contact {SELLER_NAME} support and we will raise it
          for you. Refunds are returned to the original payment method, typically within 5–10 business
          days once approved.
        </Section>
        <Section n="03" t="Cancelling instead of refunding">
          You can cancel your membership at any time from your account page. Cancellation stops future
          charges; your member presses stay available until the end of the period you already paid for.
        </Section>
        <Section n="04" t="Presses already used">
          Presses are part of the game and are consumed as you play. Using presses does not prevent a
          refund request within the 30-day window, but repeated purchase-and-refund cycles may be treated
          as abuse under our Terms.
        </Section>
      </LegalPage>
    </div>
  );
}
