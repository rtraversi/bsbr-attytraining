export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="mk-display flex h-9 w-9 items-center justify-center rounded-xl text-lg"
            style={{
              backgroundColor: "color-mix(in oklch, var(--mk-amber) 24%, transparent)",
              color: "var(--primary)",
            }}
            aria-hidden="true"
          >
            §
          </span>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Staff Compliance
          </span>
        </div>

        <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
          Responsible AI training for law firms. Educational content only — not legal advice.
        </p>

        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Staff Compliance
        </p>
      </div>
    </footer>
  )
}
