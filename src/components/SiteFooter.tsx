import { Link } from "@tanstack/react-router";

export const SELLER_NAME = "Saberistic LLC";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border/60 px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {SELLER_NAME}. Payments are processed securely by Stripe.
        </p>
        <nav className="flex flex-wrap gap-4">
          <Link to="/how-it-works" className="hover:text-foreground">
            How it works
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link to="/refunds" className="hover:text-foreground">
            Refunds
          </Link>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
