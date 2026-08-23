import type { ReactNode } from "react";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold uppercase tracking-tight">{title}</h1>
      <p className="mt-2 label-caps text-[10px] text-muted-foreground">Last updated {updated}</p>
      <div className="mt-10 space-y-8">{children}</div>
    </main>
  );
}

export function Section({ n, t, children }: { n: string; t: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold uppercase tracking-tight">
        <span className="mr-2 font-mono text-xs text-primary">{n}</span>
        {t}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </section>
  );
}
