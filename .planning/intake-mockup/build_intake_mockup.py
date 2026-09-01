#!/usr/bin/env python3
"""Firm AI Policy intake — static mockup.

Dashboard theme, Stack Sans Headline only, real Iurix lockup on a permanently
white header block. No JS: the module switcher is CSS-only (sibling radios) and
the helper text is a hover/focus tooltip on an (i), so nothing here can drift
from what a static export would do.
"""
import base64
import html
import json
import pathlib
import re

# Read the real fonts and brand art out of the repo rather than carrying a
# base64 dump beside this file. Keeps the mockup honest — it can only ever show
# the typeface and mark the product actually ships.
REPO = pathlib.Path(__file__).resolve().parents[2]


def _b64(rel: str) -> str:
    path = REPO / rel
    if not path.exists():
        raise SystemExit(f"missing asset: {path}")
    return base64.b64encode(path.read_bytes()).decode()


class FB:
    STACK = _b64("public/fonts/StackSansHeadline-VariableFont_wght.ttf")
    MARK = _b64("public/brand/iurix-mark.png")
    WORD = _b64("public/brand/iurix-wordmark.png")

OUT = pathlib.Path(__file__).parent / "iurix-intake-mockup.html"
OUT_LIGHT = pathlib.Path(__file__).parent / "iurix-intake-mockup-light.html"

# module key, tab label, blurb
MODULES = [
    ("tools",    "Tools"),
    ("data",     "Data"),
    ("review",   "Review"),
    ("access",   "Access"),
    ("clients",  "Clients"),
    ("practice", "Practice"),
]

# module -> [(n, question, info, kind, opts)]
Q = {
 "tools": [
  ("1", "In the last 90 days, has anyone at the firm used a tool that drafts, summarises or rewrites text for client work?",
   "Include features inside tools you already pay for, such as research platforms. This is about the feature being used, not the product name.",
   "radio", ["Yes, regularly", "No", "I don’t know"]),
  ("2", "When someone uses one of those tools, what goes into it besides text they typed?",
   "An intake question phrased as “what do you put into it” gets an answer about typing. Uploads, attachments and pasted email threads all count.",
   "check", ["Client documents are uploaded", "Email threads are pasted in",
             "Case files or exhibits are attached", "Nothing but typed questions", "I don’t know"]),
  ("3", "How many people at the firm can reach these tools?",
   "Count everyone with a login, including anyone who shares one.",
   "number", ["0"]),
  ("4", "How confident are you that no client information has gone into a tool the firm has not approved?",
   "An honest low number here is more useful than a confident high one. It changes how strict the confidentiality section needs to be.",
   "scale", ["Not at all", "Completely"]),
  ("5", "Name the tools your firm actually uses, if you can.",
   "Product names let us check them against what their own terms of service permit. Skip it if you are unsure.",
   "text", ["For example: Westlaw Precision, Microsoft Copilot, Otter.ai…"]),
 ],
 "review": [
  ("6", "Which of these does the firm use? Tick everything, even if you would not call it AI.",
   "Most firms answer “no AI” and then tick three of these. Notetakers in particular are close to universal and almost never disclosed.",
   "check", ["E-discovery review or predictive coding", "Citator or authority-check flags",
             "Document assembly or template automation", "Meeting notetakers or transcription",
             "Client intake chatbot on the website", "None of these"]),
  ("7", "Before AI-assisted work leaves the firm, what is checked?",
   "Select every check that actually happens today, not what should happen.",
   "check", ["Every citation is verified against the source",
             "A supervising attorney reviews the substance",
             "Facts are checked against the file", "Nothing formal"]),
  ("8", "Has the firm approved a written list of permitted tools?",
   "A shared understanding is not a written list.",
   "radio", ["Yes, written and current", "Informally understood, not written", "No"]),
  ("9", "Who signs off when a new tool is brought in?",
   "If nobody does, say so. The policy will name a role rather than assume one exists.",
   "select", ["Select…", "A named partner", "The managing attorney", "Office manager or IT",
              "Whoever found the tool", "Nobody, in practice"]),
  ("10", "When was the last time staff were trained on any of this?",
   "An approximate date is fine. If it has never happened, leave it blank.",
   "date", [""]),
 ],
 "clients": [
  ("11", "In which state is the firm licensed to practise?",
   "If the firm practises in more than one, the strictest applicable rule governs, and the policy will be written to that standard.",
   "select", ["Select a state…", "North Carolina", "Virginia", "West Virginia", "Illinois",
              "California", "New Jersey", "New York", "Other / multiple"]),
  ("12", "Does any software send messages to clients or prospective clients before a person reads them?",
   "A website chatbot that answers questions or books consultations counts. Almost nobody answers “do you use agentic AI” accurately, so this asks about behaviour instead.",
   "radio", ["Yes", "No", "I don’t know"]),
  ("13", "How does the firm bill the work these tools touch?",
   "Hourly and value-based billing are treated very differently, and the difference is recent.",
   "radio", ["Hourly", "Flat or value-based", "A mix", "Contingency"]),
  ("14", "Do your engagement letters currently say anything about technology or AI?",
   "If you are not sure, answer that. It is a common gap and the policy supplies the language.",
   "radio", ["Yes", "No", "I don’t know"]),
  ("15", "Would the firm tell a client it used AI on their matter?",
   "There is no single right answer. States disagree, and this sets which way the consent section leans.",
   "radio", ["Proactively, every time", "Only if the client asks",
             "We have not decided"]),
  ("16", "Is there anything about how your firm uses AI that these questions did not capture?",
   "Anything unusual, anything you are uneasy about, or anything you want the policy to address directly.",
   "text", ["Write as much or as little as you like."]),
 ],
}


# Codex, 2026-08-25: six one-word sections instead of three long ones, so the
# tab labels sit on one line at any width. The questions themselves did not
# change — only which section each belongs to. Re-keyed here rather than by hand
# so the question text stays in one place and the split stays legible.
_ASSIGN = {
    "1": "tools",  "2": "tools",  "3": "tools",
    "4": "data",   "5": "data",   "6": "data",
    "7": "review", "8": "review", "9": "review",
    "10": "access", "11": "access",
    "12": "clients", "13": "clients", "14": "clients",
    "15": "practice", "16": "practice",
}
_flat = [q for group in Q.values() for q in group]
assert sorted(int(q[0]) for q in _flat) == list(range(1, len(_flat) + 1)), "question numbering broke"
Q = {k: [q for q in _flat if _ASSIGN[q[0]] == k] for k, _ in MODULES}
assert sum(len(v) for v in Q.values()) == len(_flat), "a question was lost in the split"


def info(txt):
    return (f'<span class="info" tabindex="0" role="note" aria-label="More information">'
            f'<span class="glyph">i</span><span class="tip">{html.escape(txt)}</span></span>')


def control(kind, opts, qn):
    if kind == "text":
        return f'<textarea class="ta" rows="4" placeholder="{html.escape(opts[0])}"></textarea>'
    if kind == "number":
        return f'<input class="sel num" type="number" min="0" placeholder="{html.escape(opts[0])}">'
    if kind == "date":
        return '<input class="sel num" type="date">'
    if kind == "select":
        o = "".join(f"<option>{html.escape(x)}</option>" for x in opts)
        return f'<select class="sel">{o}</select>'
    if kind == "scale":
        pills = "".join(
            f'<label class="pill"><input type="radio" name="q{qn}"><span>{i}</span></label>'
            for i in range(1, 6))
        return (f'<div class="scale">{pills}</div>'
                f'<div class="anchors"><span>{html.escape(opts[0])}</span>'
                f'<span>{html.escape(opts[1])}</span></div>')
    tag = "radio" if kind == "radio" else "checkbox"
    rows = "".join(
        f'<label class="opt"><input type="{tag}" name="q{qn}"><span>{html.escape(x)}</span></label>'
        for x in opts)
    # A closed list cannot anticipate every firm, and the design risk here is
    # under-reporting, so a written escape beats rounding to the nearest tickbox.
    if kind == "check":
        rows += (f'<label class="opt"><input type="checkbox" name="q{qn}">'
                 f'<span class="otherwrap">Something else'
                 f'<input class="inline" type="text" placeholder="describe it"></span></label>')
    return f'<div class="opts">{rows}</div>'


CSS = """
@font-face{font-family:'Stack Sans Headline';src:url(data:font/ttf;base64,__STACK__) format('truetype');
  font-weight:100 900;font-display:swap}
:root{
  --bg:#FAFAF8; --card:#fff; --fg:#0A0A0A; --mute:#8A8A8A; --line:#E5EEF5;
  --dot:#C7CDD3; --brand:#0094FF; --brand-soft:#EAF6FF; --soft:#F6F9FB; --tipbg:#EDF0F3; --tipfg:#3D4A49;
  --bad:#E4705F; --warnbg:rgba(214,158,20,.13); --warnfg:#96700F;
}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){
  --bg:#08090B; --card:#0D0F12; --fg:#F5F7FA; --mute:#7A8189; --line:#1F2429;
  --dot:#3A4048; --brand:#32C7FF; --brand-soft:#0C2233; --soft:#111418; --tipbg:#1E242B; --tipfg:#C7CDD3;
  --bad:#F09287; --warnbg:rgba(245,206,107,.10); --warnfg:#E7C471;
}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);
  font:400 15px/1.6 'Stack Sans Headline',ui-sans-serif,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased}

/* Permanently white, in both themes: the mark is artwork with its own ground,
   and inverting the page underneath it made it read as a different logo. */
.masthead{background:#fff;border-bottom:1px solid #E5EEF5;padding:2.5rem 1.25rem}
.lockup{display:flex;align-items:center;justify-content:center;gap:.85rem}
.mark{height:6.75rem;width:6.75rem;flex:none;user-select:none}
.word{height:5.18rem;width:auto;flex:none;user-select:none}

.wrap{max-width:48rem;margin:0 auto;padding:2.5rem 1.5rem 6rem}
h1{font-size:1.9rem;font-weight:600;line-height:1.2;letter-spacing:-.01em;margin:0 0 .5rem}
.lede{color:var(--mute);font-size:14.5px;margin:0;max-width:34rem}

header.intro{border-bottom:1px solid var(--line);padding-bottom:1.5rem;margin-bottom:2rem}

.modbtn{flex:1;display:block;cursor:pointer;text-align:center;background:none;border:0;
  padding:0;font:inherit}
.bar{display:block;height:3px;border-radius:2px;background:var(--dot)}
.name{display:block;margin-top:.6rem;font-size:11px;font-weight:600;color:var(--mute);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.modbtn:hover .name{color:var(--fg)}
.modbtn:focus{outline:0}
.modbtn:focus-visible{outline:2px solid var(--brand);outline-offset:4px;border-radius:.35rem}
.modbtn.on .bar{background:var(--brand)}
.modbtn.on .name{color:var(--brand)}
.tabs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:.35rem;margin:0 0 1.4rem}
.card{display:none}
.card.on{display:block}
.qcount{margin:0 0 1rem;font-size:12px;font-weight:600;letter-spacing:.04em;color:var(--mute)}

.card{position:relative;background:var(--card);border:1px solid var(--line);
  border-radius:1rem;padding:1.4rem 1.5rem;margin:0 0 1.35rem}
.qnum{display:block;font-weight:600;font-size:3.1rem;line-height:.8;color:var(--brand);
  letter-spacing:-.03em;margin:0 0 .7rem}
.card[data-req="0"] .qnum{color:var(--dot)}
.card[data-req="0"] .qnum::after{content:"*";font-size:.55em;vertical-align:.35em;
  margin-left:.06em}
.qnum.miss{color:var(--bad)}
.alert{display:none;margin:1rem 0 0;padding:.85rem 1.3rem;border-radius:999px;
  background:var(--warnbg);color:var(--warnfg);font-size:13.5px}
.alert.on{display:block}
.q{position:relative;margin:0;font-size:16px;font-weight:600;line-height:1.45}

/* Helper text is on demand rather than under every question: at sixteen
   questions the page was more guidance than form. */
.info{display:inline-block;vertical-align:.05em;margin-left:.15rem;cursor:help;outline:none}
.glyph{display:grid;place-items:center;width:16px;height:16px;border-radius:50%;
  border:1px solid var(--dot);color:var(--mute);font-size:11px;font-weight:600;font-style:italic}
.info:hover .glyph,.info:focus .glyph{border-color:var(--brand);color:var(--brand)}
.tip{display:none;position:absolute;left:0;right:0;width:auto;bottom:calc(100% + .5rem);
  padding:.7rem .85rem;border-radius:.6rem;z-index:5;
  background:var(--tipbg);color:var(--tipfg);border:1px solid var(--line);
  font-size:12.5px;line-height:1.5;font-weight:400;box-shadow:0 6px 22px rgba(0,0,0,.10)}
.info:hover .tip,.info:focus .tip{display:block}

.opts{display:flex;flex-direction:column;gap:.1rem;margin:1.1rem 0 0}
.opt{display:flex;gap:.65rem;align-items:flex-start;padding:.5rem .7rem;border-radius:.6rem;
  border:1px solid transparent}
.opt:hover{border-color:var(--line);background:var(--soft)}
.opt input{margin:.25rem 0 0;accent-color:var(--brand);width:15px;height:15px;flex:none}
.opt span{font-size:14.5px}
.otherwrap{display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap;width:100%}
.inline{flex:1;min-width:9rem;padding:.25rem .5rem;font:inherit;font-size:14px;color:var(--fg);
  background:transparent;border:0;border-bottom:1px solid var(--line);border-radius:0}
.sel,.ta{margin:1.1rem 0 0;width:100%;padding:.65rem .8rem;font:inherit;font-size:14.5px;
  color:var(--fg);background:var(--bg);border:1px solid var(--line);border-radius:.6rem}
.num{max-width:14rem}
.ta{display:block;resize:vertical;line-height:1.55;min-height:5.5rem}
.ta::placeholder,.inline::placeholder,.num::placeholder{color:var(--mute)}

.scale{display:flex;gap:.5rem;margin:1.1rem 0 0}
.pill{flex:1;position:relative;cursor:pointer}
.pill input{position:absolute;opacity:0;width:0;height:0}
.pill span{display:grid;place-items:center;padding:.7rem 0;border:1px solid var(--line);
  border-radius:.6rem;font-size:15px;font-weight:600;color:var(--mute);background:var(--card)}
.pill:hover span{border-color:var(--brand);color:var(--brand)}
.pill input:checked+span{background:var(--brand);border-color:var(--brand);color:#fff}
.anchors{display:flex;justify-content:space-between;margin:.45rem 0 0;font-size:12px;color:var(--mute)}

.pagenav{display:flex;justify-content:flex-end;gap:.5rem;margin:.25rem 0 0}
.navbtn{display:grid;font:inherit;place-items:center;width:2.6rem;height:2.6rem;border-radius:50%;
  border:1px solid var(--line);background:var(--card);color:var(--fg);font-size:17px;
  cursor:pointer;user-select:none}
.navbtn:hover{border-color:var(--brand);color:var(--brand)}
.navbtn:disabled{color:var(--dot);border-color:var(--line);cursor:default}
.navbtn:disabled:hover{border-color:var(--line);color:var(--dot)}
.navbtn.off{color:var(--dot);border-color:var(--line);cursor:default}
.navbtn.off:hover{border-color:var(--line);color:var(--dot)}

.actions{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin:2.5rem 0 0}
.btn{padding:.7rem 1.5rem;border-radius:999px;font:600 14px 'Stack Sans Headline',sans-serif;
  border:1px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer}
.btn.pri{background:var(--brand);border-color:var(--brand);color:#fff}
.btn.ghost{background:transparent;border-color:transparent;color:var(--mute)}
.btn.ghost:hover{background:var(--soft);color:var(--fg)}
.status{display:none;margin:0 0 .25rem;padding:1rem 1.2rem;border:1px solid var(--line);
  border-radius:.9rem;background:var(--soft)}
.status.on{display:block}
.stitle{margin:0;font-size:14px;font-weight:600}
.sbody{margin:.3rem 0 0;font-size:13px;line-height:1.55;color:var(--mute);max-width:38rem}

@media(max-width:25rem){
  .tabs{gap:.25rem}
  .name{font-size:10px}
}
@media(max-width:46rem){
  .qnum{font-size:2.5rem}
  .actions{flex-direction:column-reverse;align-items:stretch}
}
"""


JS = r"""
// The only script in the file. Required-ness is shown by consequence rather than
// by labelling every question: nothing is marked until Send is pressed, and then
// only what is actually missing turns red. Optional questions simply never do.
(function () {
  var answered = function (card) {
    // .opts covers radio and checkbox lists, .scale covers the 1-5 pills. Both
    // hold radios, and missing .scale here made that question silently pass.
    var group = card.querySelector('.opts, .scale');
    if (group) return !!group.querySelector('input:checked');
    var sel = card.querySelector('select');
    if (sel) return sel.selectedIndex > 0;
    var f = card.querySelector('input[type=number],input[type=date]');
    if (f) return f.value !== '';
    return true;
  };
  var clear = function (card) { card.querySelector('.qnum').classList.remove('miss'); };

  document.querySelectorAll('.card[data-req="1"]').forEach(function (card) {
    card.addEventListener('change', function () { if (answered(card)) clear(card); });
    card.addEventListener('input', function () { if (answered(card)) clear(card); });
  });


  // ── one question at a time ────────────────────────────────────────────────
  // Katy, 2026-08-25: several questions on screen at once "doesn't seem custom".
  // Progress stays per MODULE, not per question — a 1-of-16 counter makes the
  // form feel long, which is the opposite of what showing one at a time is for.
  var cards = [].slice.call(document.querySelectorAll('.card'));
  var tabsEl = document.getElementById('module-tabs');
  var mods = MODULES.map(function (module) {
    var button = document.createElement('button');
    button.className = 'modbtn';
    button.type = 'button';
    button.setAttribute('data-mod', module.id);
    button.setAttribute('aria-label', module.label + ' section');
    button.innerHTML = '<span class="bar"></span><span class="name">' + module.label + '</span>';
    tabsEl.appendChild(button);
    return button;
  });
  var prevBtn = document.getElementById('prev');
  var nextBtn = document.getElementById('next');
  var countEl = document.getElementById('qcount');
  var at = 0;

  function modOf(i) { return cards[i].getAttribute('data-mod'); }

  function render() {
    cards.forEach(function (c, i) { c.classList.toggle('on', i === at); });
    var m = modOf(at);
    mods.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mod') === m); });

    var inMod = cards.filter(function (c) { return c.getAttribute('data-mod') === m; });
    var pos = inMod.indexOf(cards[at]) + 1;
    countEl.textContent = pos + ' of ' + inMod.length;

    prevBtn.disabled = at === 0;
    nextBtn.disabled = at === cards.length - 1;
  }

  function go(i) {
    at = Math.max(0, Math.min(cards.length - 1, i));
    render();
    // Only scroll when the question is out of view; jumping the page on every
    // arrow press is disorienting when the card already fills the screen.
    var r = cards[at].getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) cards[at].scrollIntoView({ block: 'center' });
  }

  prevBtn.addEventListener('click', function () { go(at - 1); });
  nextBtn.addEventListener('click', function () { go(at + 1); });
  mods.forEach(function (b) {
    b.addEventListener('click', function () {
      var m = b.getAttribute('data-mod');
      for (var i = 0; i < cards.length; i++) if (modOf(i) === m) return go(i);
    });
  });
  render();

  document.querySelector('.btn.pri').addEventListener('click', function () {
    var missing = [];
    document.querySelectorAll('.card[data-req="1"]').forEach(function (card) {
      var n = card.querySelector('.qnum');
      if (answered(card)) { n.classList.remove('miss'); }
      else { n.classList.add('miss'); missing.push(card); }
    });
    var alertEl = document.getElementById('alert');
    alertEl.classList.toggle('on', missing.length > 0);

    if (missing.length) {
      // Jump to the first gap, switching section if it is on another one.
      go(cards.indexOf(missing[0]));
      return;
    }

    // Sent. The pending notice takes the place of the intro description, since
    // "here is what this form does" stops being the useful thing to say once the
    // form is done and the only open question is what happens next.
    document.getElementById('lede').style.display = 'none';
    document.getElementById('status').classList.add('on');
    window.scrollTo({ top: 0 });
  });
})();
"""


def build():
    tabs, panels = [], []
    radios = "".join(
        f'<input class="modradio" type="radio" name="mod" id="mod-{k}"'
        f'{" checked" if i == 0 else ""}>' for i, (k, _) in enumerate(MODULES))

    for k, label in MODULES:
        tabs.append(f'<button class="modbtn" type="button" data-mod="{k}">'
                    f'<span class="bar"></span>'
                    f'<span class="name">{html.escape(label)}</span></button>')
        cards = []
        for n, q, tip, kind, opts in Q[k]:
            cards.append(f"""
<section class="card" data-req="{0 if kind == "text" else 1}" data-mod="{k}">
  <span class="qnum">{n}</span>
  <p class="q">{html.escape(q)} {info(tip)}</p>
  {control(kind, opts, n)}
</section>""")
        panels.append("".join(cards))

    n_total = sum(len(v) for v in Q.values())
    mods_json = json.dumps([{'id': k, 'label': l} for k, l in MODULES])

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>IURIX — Firm AI Policy intake</title>
<style>{CSS.replace("__STACK__", FB.STACK)}</style></head><body>

<div class="masthead">
  <div class="lockup">
    <img class="mark" src="data:image/png;base64,{FB.MARK}" alt="">
    <img class="word" src="data:image/png;base64,{FB.WORD}" alt="Iurix Accreditation">
  </div>
</div>

<div class="wrap">
<header class="intro">
  <h1>Your firm&rsquo;s AI policy</h1>
  <div class="status" id="status">
    <p class="stitle">Pending attorney review</p>
    <p class="sbody">Your answers build a draft policy, which a licensed attorney reviews before it
    is released to your firm. You will be emailed when it is ready. Nothing is published in the
    meantime and you can still change your answers.</p>
  </div>
  <p class="lede" id="lede">Tell us how your firm uses AI. We&rsquo;ll use your answers to
  prepare a policy for attorney review.</p>
</header>

<nav class="tabs" id="module-tabs" aria-label="Policy sections"></nav>
<div class="panels">{"".join(panels)}</div>
<p class="qcount" id="qcount"></p>
<div class="pagenav">
  <button class="navbtn" id="prev" type="button" aria-label="Previous question">&larr;</button>
  <button class="navbtn" id="next" type="button" aria-label="Next question">&rarr;</button>
</div>

<div class="actions">
  <button class="btn pri">Send intake</button>
  <button class="btn ghost">Save and finish later</button>
</div>

<div class="alert" id="alert">Please fill in missing questions. The * means optional.</div>

</div>

<script>var MODULES = {mods_json};{JS}</script>
</body></html>
"""


if __name__ == "__main__":
    doc = build()
    OUT.write_text(doc, encoding="utf-8")

    # The light-only copy is the one that gets sent out: reviewers open it on
    # whatever machine they have, and a dark render of a legal-adjacent form
    # reads as broken rather than as a preference.
    light = re.sub(
        r"@media\(prefers-color-scheme:dark\)\{:root:not\(\[data-theme=light\]\)\{[^}]*\}\}\s*",
        "", doc, flags=re.S,
    ).replace(
        "<title>IURIX — Firm AI Policy intake</title>",
        "<title>IURIX — Firm AI Policy intake (light)</title>",
    )
    OUT_LIGHT.write_text(light, encoding="utf-8")

    for f in (OUT, OUT_LIGHT):
        print(f"wrote {f.name} ({f.stat().st_size:,} bytes)")
