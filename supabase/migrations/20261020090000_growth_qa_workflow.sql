BEGIN;

CREATE TABLE IF NOT EXISTS public.growth_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization text NOT NULL,
  contact_name text,
  email text,
  phone text,
  segment text NOT NULL DEFAULT 'school' CHECK (segment IN ('school','software_qa','software_development','other')),
  stage text NOT NULL DEFAULT 'new' CHECK (stage IN ('new','contacted','meeting_booked','proposal_sent','won','lost')),
  next_follow_up date,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS growth_leads_stage_idx ON public.growth_leads(stage);
CREATE INDEX IF NOT EXISTS growth_leads_follow_up_idx ON public.growth_leads(next_follow_up);
CREATE INDEX IF NOT EXISTS growth_leads_assigned_idx ON public.growth_leads(assigned_to);

ALTER TABLE public.growth_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS growth_leads_staff_all ON public.growth_leads;
CREATE POLICY growth_leads_staff_all ON public.growth_leads
  FOR ALL TO authenticated USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

CREATE TABLE IF NOT EXISTS public.qa_test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  test_type text NOT NULL DEFAULT 'functional' CHECK (test_type IN ('functional','regression','usability','security','performance','acceptance','other')),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','passed','failed','blocked')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date date,
  steps text,
  expected_result text,
  actual_result text,
  evidence_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qa_test_cases_status_idx ON public.qa_test_cases(status);
CREATE INDEX IF NOT EXISTS qa_test_cases_project_idx ON public.qa_test_cases(project_id);
CREATE INDEX IF NOT EXISTS qa_test_cases_due_idx ON public.qa_test_cases(due_date);

ALTER TABLE public.qa_test_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qa_test_cases_staff_all ON public.qa_test_cases;
CREATE POLICY qa_test_cases_staff_all ON public.qa_test_cases
  FOR ALL TO authenticated USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

CREATE TABLE IF NOT EXISTS public.qa_defects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  test_case_id uuid REFERENCES public.qa_test_cases(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','triaged','in_progress','fixed','retest','closed','wont_fix')),
  description text NOT NULL,
  reproduction_steps text,
  assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  evidence_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qa_defects_status_idx ON public.qa_defects(status);
CREATE INDEX IF NOT EXISTS qa_defects_severity_idx ON public.qa_defects(severity);
CREATE INDEX IF NOT EXISTS qa_defects_project_idx ON public.qa_defects(project_id);

ALTER TABLE public.qa_defects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qa_defects_staff_all ON public.qa_defects;
CREATE POLICY qa_defects_staff_all ON public.qa_defects
  FOR ALL TO authenticated USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

COMMIT;
