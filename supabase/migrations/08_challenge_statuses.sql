-- Align challenge statuses with the teacher editor while preserving legacy rows.
DO $$
DECLARE
  status_attnum SMALLINT;
  status_constraint RECORD;
BEGIN
  SELECT attnum INTO status_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.challenges'::regclass
    AND attname = 'status'
    AND NOT attisdropped;

  FOR status_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.challenges'::regclass
      AND contype = 'c'
      AND status_attnum = ANY (conkey)
  LOOP
    EXECUTE format(
      'ALTER TABLE public.challenges DROP CONSTRAINT %I',
      status_constraint.conname
    );
  END LOOP;

  ALTER TABLE public.challenges
    ADD CONSTRAINT challenges_status_check
    CHECK (status IN ('active', 'inactive', 'draft', 'archived'));
END
$$;
