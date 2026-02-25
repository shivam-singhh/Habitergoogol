
ALTER TABLE public.habits ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Set initial sort_order based on created_at
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as rn
  FROM public.habits
)
UPDATE public.habits SET sort_order = ordered.rn FROM ordered WHERE public.habits.id = ordered.id;
