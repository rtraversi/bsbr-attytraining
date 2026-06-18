-- =============================================================================
-- 0003_quiz_questions.sql
-- Table: quiz_questions  (question pool for the certification quiz)
-- Satisfies: COURSE-06, COURSE-07, COURSE-09, COURSE-10
-- =============================================================================

-- =============================================================================
-- 11. quiz_questions
-- =============================================================================
create table public.quiz_questions (
  id             uuid    primary key default gen_random_uuid(),
  course_id      uuid    not null references public.courses (id) on delete cascade,
  question_text  text    not null,
  -- answers: JSON array of exactly 4 strings, e.g. ["Choice A", "Choice B", "Choice C", "Choice D"]
  answers        jsonb   not null,
  -- correct_index: 0-based index into the answers array
  correct_index  int     not null check (correct_index >= 0 and correct_index <= 3),
  -- explanation: shown to the employee after each attempt (on retake screen)
  explanation    text,
  -- section_tag: ties the question to a course section for coverage analysis
  section_tag    text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

create index idx_quiz_questions_course_id on public.quiz_questions (course_id);
-- Partial index: the scoring route only reads active questions
create index idx_quiz_questions_active on public.quiz_questions (course_id)
  where is_active = true;

alter table public.quiz_questions enable row level security;

-- No client-facing RLS policies.
-- The client never receives questions with correct_index — the quiz component
-- only receives question text + shuffled answer choices. Scoring is server-side only.
-- All reads/writes via service role (Route Handler + seed script).

-- =============================================================================
-- Seed: placeholder questions (replace with Rob's real pool before launch)
-- These are tagged PLACEHOLDER so they are easy to find and swap out.
-- =============================================================================
do $$
declare
  v_course_id uuid;
begin
  select id into v_course_id from public.courses limit 1;

  -- Only seed if the course exists and has no questions yet
  if v_course_id is not null and not exists (
    select 1 from public.quiz_questions where course_id = v_course_id
  ) then

    insert into public.quiz_questions
      (course_id, question_text, answers, correct_index, explanation, section_tag)
    values

    (v_course_id,
     'Under ABA Model Rule 5.3, which statement best describes an attorney''s duty regarding AI tools used by their staff?',
     '["Attorneys have no duty to supervise AI tools because they are not people","Attorneys must make reasonable efforts to ensure staff AI use is compatible with professional obligations","Supervision duties apply only to licensed paralegals, not other staff","AI tools are exempt from supervision requirements under all state bar rules"]',
     1,
     'Rule 5.3 requires attorneys to make reasonable efforts to ensure the conduct of non-lawyer assistants — including their use of AI tools — is compatible with the lawyer''s professional obligations.',
     'PLACEHOLDER:rule-5.3-basics'),

    (v_course_id,
     'A paralegal uses an AI tool to draft a client letter and sends it to the client without attorney review. Under Rule 5.3, this most likely creates:',
     '["No issue — the paralegal is responsible for their own work product","No issue if the firm has previously approved the AI tool","A potential ethics violation if the content is inaccurate or misleading","An issue only if the client complains in writing"]',
     2,
     'The attorney remains responsible for supervising non-lawyer work product, including AI-assisted drafts. Sending unreviewed AI output to a client can violate Rule 5.3 if the content causes harm.',
     'PLACEHOLDER:supervision'),

    (v_course_id,
     'Which is the most significant risk when staff use an AI tool to research case law?',
     '["AI research tools are slower than traditional legal databases","AI tools always produce perfectly accurate citations","AI-generated case citations may be fabricated — a phenomenon called hallucination","Research tasks are not subject to attorney supervision requirements"]',
     2,
     'AI language models can generate plausible-looking but entirely fictitious case citations. This has led to real sanctions in documented cases (e.g., Mata v. Avianca). Every AI-generated citation must be verified.',
     'PLACEHOLDER:hallucination'),

    (v_course_id,
     'Before allowing staff to use an AI tool that processes client information, the supervising attorney should:',
     '["Review only the tool''s pricing page","Require staff to sign a personal liability waiver","Notify the state bar and await written guidance","Evaluate the tool''s data retention practices, confidentiality protections, and terms of service"]',
     3,
     'Client data is subject to confidentiality obligations under Rule 1.6. An attorney must assess whether an AI vendor''s data handling practices are compatible with those obligations before allowing staff use.',
     'PLACEHOLDER:confidentiality'),

    (v_course_id,
     'A staff member uses an AI chatbot to respond to a client question about their legal matter without attorney review. The primary ethics concern is:',
     '["The client may prefer communicating with a human","The AI response may constitute unauthorized practice of law and risk exposing confidential client data","The AI chatbot may respond more slowly than a human","The client''s question might be too complex for the AI tool"]',
     1,
     'Having non-lawyer staff deliver legal advice via AI — even if the staff member is not themselves giving the advice — risks unauthorized practice of law and may expose privileged client communications to third-party AI systems.',
     'PLACEHOLDER:upl-confidentiality'),

    (v_course_id,
     'Under Rule 5.3, "reasonable supervision" of staff AI use most likely requires:',
     '["Reviewing every single AI-generated output before any use, regardless of task","Banning all AI tools firm-wide to eliminate supervision risk entirely","Establishing firm AI policies and periodically reviewing staff AI outputs","Delegating all supervision responsibility to the most senior paralegal"]',
     2,
     'Reasonable supervision is context-dependent. It typically means setting clear firm policies on approved AI tools and appropriate use cases, providing staff training, and spot-checking outputs — not reviewing every keystroke.',
     'PLACEHOLDER:reasonable-supervision'),

    (v_course_id,
     'If a staff member discovers that an AI tool has produced a significant error in a client document, the correct first step is:',
     '["Delete the document and start over with a different AI tool","Correct the error themselves without escalating to the attorney","Document the error internally and continue using the tool as normal","Immediately notify the supervising attorney"]',
     3,
     'Errors in client documents must be escalated to the supervising attorney promptly. The attorney bears responsibility under Rule 5.3 and must decide how to proceed — including whether to notify the client.',
     'PLACEHOLDER:error-escalation'),

    (v_course_id,
     'Which of the following is the most accurate description of an AI "hallucination" in a legal context?',
     '["An AI tool that produces visual content without authorization","Bias embedded in an AI model''s training data","An AI tool misreading scanned or handwritten documents","AI generating false or fabricated information presented confidently as fact"]',
     3,
     'Hallucination refers to AI systems generating information that sounds authoritative but is factually incorrect or entirely invented — such as case names, citations, statutes, or dates that do not exist.',
     'PLACEHOLDER:hallucination-definition');

  end if;
end;
$$;
