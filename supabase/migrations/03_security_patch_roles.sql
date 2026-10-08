-- Security patch to prevent Profile privilege escalation via raw PostgREST requests
-- Because RLS allows users to update their own profile row, they could theoretically patch their own `role` enum.
-- This trigger enforces that any REST API request (identified by having JWT claims) silently drops role-change attempts.

CREATE OR REPLACE FUNCTION restrict_role_update()
RETURNS trigger AS $$
BEGIN
  -- Check if the request is coming via PostgREST (has JWT claims).
  -- If so, ignore the 'role' column update and revert it to what it previously was.
  IF NULLIF(current_setting('request.jwt.claims', true), '') IS NOT NULL THEN
    NEW.role = OLD.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS restrict_role_update_trigger ON profiles;

CREATE TRIGGER restrict_role_update_trigger
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE PROCEDURE restrict_role_update();