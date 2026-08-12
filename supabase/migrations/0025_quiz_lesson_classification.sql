-- =============================================================================
-- 0025_quiz_lesson_classification.sql
-- ix-quizsubset: configurable certification-exam size and lesson coverage.
--
-- This migration is applied to STAGING only until the production cutover. The
-- eight seeded questions are classified solely from QUESTION-POOL.md's explicit
-- primary-lesson mapping; new questions may remain NULL until content review.
-- =============================================================================

alter table public.courses
  add column questions_per_attempt smallint not null default 8
    check (questions_per_attempt > 0);

comment on column public.courses.questions_per_attempt is
  'How many questions the server serves for one certification attempt. Defaults to 8.';

alter table public.quiz_questions
  add column lesson smallint
    check (lesson between 1 and 5);

comment on column public.quiz_questions.lesson is
  'Primary course lesson (1-5) used for stratified certification-question selection. NULL until classified.';

-- Existing seed mapping from .planning/QUESTION-POOL.md:53-158:
-- L1=rule-5.3-basics; L2=confidentiality; L3=supervision, hallucination,
-- error-escalation, hallucination-definition; L5=upl-confidentiality,
-- reasonable-supervision. Lesson 4 deliberately has no current question.
update public.quiz_questions
set lesson = case section_tag
  when 'PLACEHOLDER:rule-5.3-basics' then 1
  when 'PLACEHOLDER:confidentiality' then 2
  when 'PLACEHOLDER:supervision' then 3
  when 'PLACEHOLDER:hallucination' then 3
  when 'PLACEHOLDER:error-escalation' then 3
  when 'PLACEHOLDER:hallucination-definition' then 3
  when 'PLACEHOLDER:upl-confidentiality' then 5
  when 'PLACEHOLDER:reasonable-supervision' then 5
end
where section_tag in (
  'PLACEHOLDER:rule-5.3-basics',
  'PLACEHOLDER:confidentiality',
  'PLACEHOLDER:supervision',
  'PLACEHOLDER:hallucination',
  'PLACEHOLDER:error-escalation',
  'PLACEHOLDER:hallucination-definition',
  'PLACEHOLDER:upl-confidentiality',
  'PLACEHOLDER:reasonable-supervision'
);
