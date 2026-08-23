import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";
import { SELLER_NAME } from "@/components/SiteFooter";
import { LegalPage, Section } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Notice — The Last Person" },
      {
        name: "description",
        content:
          "What personal data The Last Person collects, why, who it is shared with, how long it is kept, and your rights.",
      },
      { property: "og:title", content: "Privacy Notice — The Last Person" },
      { property: "og:description", content: "How we handle your personal data." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <LegalPage title="Privacy Notice" updated="23 August 2026">
        <Section n="01" t="Who we are">
          {SELLER_NAME}, operator of The Last Person, is the data controller for the personal data
          described here. That means we decide why and how your data is processed.
        </Section>
        <Section n="02" t="What we collect and why">
          Account data (email address, hashed password or Google sign-in identifier, and your chosen
          username) to create and secure your account — necessary to perform our contract with you.
          Gameplay data (presses, timestamps, season participation, wins) to run the game and show public
          season history — necessary to perform our contract. Technical data (IP address, device and
          browser information, log and error data) for security, fraud prevention and reliability — our
          legitimate interest in keeping the service safe and working. Support messages you send us, to
          answer you. Membership status, so we know which presses you are entitled to. We do not collect
          or store card details; Paddle handles payment data as the Merchant of Record.
        </Section>
        <Section n="03" t="What is public">
          Your username, presses, season participation and wins are publicly visible — that is the point
          of the game. Your email address is never shown publicly.
        </Section>
        <Section n="04" t="Who we share it with">
          Service providers who host and operate the service on our behalf (cloud hosting, database,
          authentication and error logging); Paddle.com as Merchant of Record for the sale of
          memberships, subscription management, payments, tax compliance and invoicing; professional
          advisers such as legal and accounting; and authorities where we are legally required to
          disclose.
        </Section>
        <Section n="05" t="Retention">
          Account and gameplay data are kept while your account is active. If you delete your account, we
          delete or anonymise your personal data within 90 days, except records we must keep for legal,
          tax or fraud-prevention reasons, and anonymised season history which no longer identifies you.
        </Section>
        <Section n="06" t="Your rights">
          Depending on where you live you may have the right to access, correct, delete, restrict or port
          your data, to object to processing based on legitimate interests, and to withdraw consent. To
          exercise these rights, contact us through the support channel listed on our site; we respond
          within one month. If you are in the UK or EEA you can also complain to your local supervisory
          authority.
        </Section>
        <Section n="07" t="International transfers">
          Our providers may process data in the United States and other countries. Where data leaves the
          UK or EEA we rely on appropriate safeguards such as Standard Contractual Clauses or adequacy
          decisions.
        </Section>
        <Section n="08" t="Security">
          We use appropriate technical and organisational measures, including encryption in transit,
          access controls, and row-level database permissions so players can only reach their own account
          data.
        </Section>
        <Section n="09" t="Cookies and local storage">
          We use strictly necessary cookies and browser storage to keep you signed in, remember your
          sound preference, and to let our payment provider run checkout securely. We do not use
          advertising cookies. You can clear this storage in your browser at any time, though you will be
          signed out.
        </Section>
        <Section n="10" t="Changes">
          We may update this notice. Material changes will be posted here with a new date.
        </Section>
      </LegalPage>
    </div>
  );
}
