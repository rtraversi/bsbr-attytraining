# `ix-www522`

**Owner:** Rob · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **613 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

🔴 www.iurixaccreditation.com returns 522 and always has. Re-confirmed by curl 08-06: apex 200, www 522. No x-opennext header, so www is not bound to the Worker and Cloudflare has no origin to reach. Needs a custom-domain entry or a redirect rule in the dashboard.

---

## Full text, captured 2026-08-06

🔴 www.iurixaccreditation.com RETURNS 522 AND HAS DONE CONSISTENTLY. Re-confirmed by curl on 2026-08-06: apex 200, www 522. DNS resolves to Cloudflare, but the response carries NO x-opennext header, so www is not bound to the Worker the way the apex is. Cloudflare accepts the request and then has no origin to reach. Anyone who types the www. form gets a Cloudflare error page, which for a compliance product a firm was told to visit is a bad first impression. Independent of the redesign; promoting did not fix it and never would have. Needs a custom-domain entry or a redirect rule in the Cloudflare dashboard.
