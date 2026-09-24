// scripts/test-resend.mjs
//
// Sends one real message through Resend and reports exactly what came back.
//
// WHY THIS EXISTS
//
// Resend's failure mode is a lie by omission: DNS can be perfect, the dashboard
// can look verified, and the API still answers
//
//   403  The <domain> domain is not verified.
//
// It was in that state from 2026-08-07 to 2026-08-19 — through a session that
// checked the DNS records by hand and concluded they were "correct", which they
// were. The records were never the question. **The only test is a send.**
//
// The API key is send-only and cannot list domains, so there is no read-only
// way to ask "is this working?" — which is the whole reason this is a script
// and not a dashboard glance.
//
// WHERE IT SENDS
//
// delivered@resend.dev is Resend's own sink address. It always accepts, it
// never reaches a person, and it does not affect sending reputation. Pass an
// address as the first argument to send somewhere real instead:
//
//   dotenv -e .env.prod -- node scripts/test-resend.mjs
//   dotenv -e .env.prod -- node scripts/test-resend.mjs rob@example.com
//
// FROM must match lib/resend.ts:19 and workers/cert-worker/src/index.ts:166 —
// if those ever diverge, this script passes while the product still fails.

const FROM = 'IURIX <noreply@iurixaccreditation.com>';
const SINK = 'delivered@resend.dev';

const to = process.argv[2] || SINK;
const key = process.env.RESEND_API_KEY;

if (!key) {
  console.error('RESEND_API_KEY is not set. Run with: dotenv -e .env.prod -- node scripts/test-resend.mjs');
  process.exit(1);
}

// Which key is in play matters more than usual here: the domain and the key
// must belong to the SAME Resend account. Four characters is enough to tell two
// keys apart without putting a credential in a terminal scrollback.
console.log(`key      : ${key.slice(0, 3)}…${key.slice(-4)}  (${key.length} chars)`);
console.log(`from     : ${FROM}`);
console.log(`to       : ${to}${to === SINK ? '  (Resend sink — reaches nobody)' : '  ⚠ REAL RECIPIENT'}`);
console.log('');

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: FROM,
    to,
    subject: 'IURIX Resend connectivity check',
    text:
      'Sent by scripts/test-resend.mjs to prove the Resend domain is verified ' +
      'and the API key can send as noreply@iurixaccreditation.com.',
  }),
});

const body = await res.json().catch(() => null);

if (res.ok) {
  console.log(`✅ SENT — HTTP ${res.status}, message id ${body?.id ?? '(none returned)'}`);
  console.log('   The domain is verified and this key can send as the product does.');
  process.exit(0);
}

console.error(`❌ FAILED — HTTP ${res.status}`);
console.error(`   ${body?.message ?? JSON.stringify(body)}`);

// The two failures worth naming, because the fix differs completely.
if (res.status === 403 && /not verified/i.test(body?.message ?? '')) {
  console.error('');
  console.error('   The domain is not verified IN THE ACCOUNT THIS KEY BELONGS TO.');
  console.error('   Both must be the same account. Check which account holds');
  console.error('   iurixaccreditation.com, and issue the key from that one.');
} else if (res.status === 401) {
  console.error('');
  console.error('   The key itself was rejected — wrong, revoked, or truncated on paste.');
}

process.exit(1);
