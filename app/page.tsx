import CheckoutForm from "@/app/_components/checkout-form";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-gray-800 tracking-tight">
          Built Smart by Rob
        </span>
        <a
          href="/login"
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          Sign in
        </a>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center px-6 py-20">
        <div className="max-w-2xl w-full text-center">
          <p className="text-sm font-medium text-blue-600 uppercase tracking-widest mb-4">
            ABA Model Rule 5.3 Compliance
          </p>
          <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-6">
            AI Staff Compliance Training
          </h1>
          <p className="text-lg text-gray-600 mb-12">
            Certify your staff on proper AI use under ABA Model Rule 5.3.
            One annual fee, instant certificates — no operator involvement required.
          </p>

          {/* Pricing table */}
          <div className="grid grid-cols-3 gap-4 mb-12">
            <div className="border border-gray-200 rounded-xl p-6">
              <p className="text-sm text-gray-500 mb-1">1–9 users</p>
              <p className="text-3xl font-bold text-gray-900">$35</p>
              <p className="text-sm text-gray-500">per user / year</p>
            </div>
            <div className="border-2 border-blue-600 rounded-xl p-6 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                Most popular
              </span>
              <p className="text-sm text-gray-500 mb-1">10–24 users</p>
              <p className="text-3xl font-bold text-gray-900">$32</p>
              <p className="text-sm text-gray-500">per user / year</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-6">
              <p className="text-sm text-gray-500 mb-1">25+ users</p>
              <p className="text-3xl font-bold text-gray-900">$28</p>
              <p className="text-sm text-gray-500">per user / year</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-10">
            All seats billed at the band rate your headcount lands in. Billed annually.
          </p>

          {/* Checkout form */}
          <CheckoutForm />
        </div>

        {/* Feature bullets */}
        <div className="max-w-2xl w-full mt-20 grid grid-cols-1 gap-4 sm:grid-cols-3 text-left">
          {[
            {
              title: "20–30 min course",
              body: "Staff complete training on their own schedule — no scheduling required.",
            },
            {
              title: "Instant PDF certificate",
              body: "Certificates are generated and emailed automatically on completion.",
            },
            {
              title: "Audit-ready dashboard",
              body: "See completion status, scores, and cert expiry dates for every staff member.",
            },
          ].map((f) => (
            <div key={f.title} className="border border-gray-100 rounded-xl p-5">
              <p className="font-semibold text-gray-900 mb-1">{f.title}</p>
              <p className="text-sm text-gray-500">{f.body}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-6 flex items-center justify-center gap-6 text-xs text-gray-400">
        <span>© {new Date().getFullYear()} Built Smart by Rob</span>
        <a href="/privacy" className="hover:text-gray-600 transition-colors">
          Privacy Policy
        </a>
        <a href="/terms" className="hover:text-gray-600 transition-colors">
          Terms of Service
        </a>
      </footer>
    </div>
  );
}
