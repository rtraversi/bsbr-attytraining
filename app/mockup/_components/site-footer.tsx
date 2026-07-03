export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center border border-foreground/15 bg-card font-mono text-base font-semibold text-primary"
            aria-hidden="true"
          >
            §
          </span>
          <span className="mk-display text-sm font-semibold tracking-tight text-foreground">
            Staff Compliance
          </span>
        </div>

        <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
          Responsible AI training for law firms. Educational content only — not legal advice.
        </p>

        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          © {new Date().getFullYear()} Staff Compliance
        </p>
      </div>
    </footer>
  )
}
