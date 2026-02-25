-- Add active_days column to habits (array of day numbers: 0=Sun, 1=Mon, ..., 6=Sat)
-- Default is all 7 days
ALTER TABLE public.habits
ADD COLUMN active_days integer[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}'::integer[];

-- Add description column for environment design tips (e.g. "Keep book on bed")
ALTER TABLE public.habits
ADD COLUMN description text NOT NULL DEFAULT ''::text;