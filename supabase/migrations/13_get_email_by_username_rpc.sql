-- ============================================================
-- Migration 13: RPC function to look up email by username
-- Enables students to log in using either Email or Username
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_clean text;
BEGIN
  IF p_username IS NULL OR trim(p_username) = '' THEN
    RETURN NULL;
  END IF;

  v_clean := lower(trim(p_username));

  -- 1. Direct match on username column in profiles
  SELECT email INTO v_email
  FROM public.profiles
  WHERE lower(trim(username)) = v_clean
  LIMIT 1;

  -- 2. If not found, check if it matches guest email format in profiles
  IF v_email IS NULL THEN
    SELECT email INTO v_email
    FROM public.profiles
    WHERE email = 'guest_' || v_clean || '@guest.siraj.om'
    LIMIT 1;
  END IF;

  -- 3. If still not found, check auth.users directly
  IF v_email IS NULL THEN
    SELECT email INTO v_email
    FROM auth.users
    WHERE email = 'guest_' || v_clean || '@guest.siraj.om'
    LIMIT 1;
  END IF;

  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;
