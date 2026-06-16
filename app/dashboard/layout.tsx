export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          AI Staff Compliance Training
        </p>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Sign out
          </button>
        </form>
      </nav>
      {children}
    </div>
  )
}
