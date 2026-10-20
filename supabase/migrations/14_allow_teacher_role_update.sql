-- Migration 14: Allow Teachers to Update User Roles & Secure RPC
-- Resolves issue where restrict_role_update trigger previously reverted all role changes unconditionally

CREATE OR REPLACE FUNCTION public.restrict_role_update()
RETURNS trigger AS $$
DECLARE
  caller_role text;
BEGIN
  -- Only intervene if the role column is actually being changed
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    caller_role := public.get_user_role();
    
    -- If caller is NOT a teacher, revert the role change
    IF caller_role != 'teacher' OR caller_role IS NULL THEN
      NEW.role = OLD.role;
    -- Also prevent a teacher from accidentally demoting their own account
    ELSIF NEW.id = auth.uid() AND NEW.role != 'teacher' THEN
      NEW.role = OLD.role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id uuid, new_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role text;
  old_role text;
  user_name text;
BEGIN
  -- 1. Verify caller is a teacher
  caller_role := public.get_user_role();
  IF caller_role != 'teacher' THEN
    RAISE EXCEPTION 'غير مصرح: تعديل الأدوار مخصص للمعلمين والإدارة فقط';
  END IF;

  -- 2. Verify target user exists
  SELECT role, full_name INTO old_role, user_name
  FROM public.profiles
  WHERE id = target_user_id;

  IF old_role IS NULL THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;

  -- 3. Prevent caller from demoting their own account
  IF target_user_id = auth.uid() AND new_role != 'teacher' THEN
    RAISE EXCEPTION 'لا يمكنك إلغاء صلاحية المعلم عن حسابك الشخصي';
  END IF;

  -- 4. Validate new role value
  IF new_role NOT IN ('student', 'teacher', 'admin') THEN
    RAISE EXCEPTION 'الدور المحدد غير صالح';
  END IF;

  -- 5. Update profile
  UPDATE public.profiles
  SET role = new_role, updated_at = now()
  WHERE id = target_user_id;

  -- 6. Synchronize auth metadata
  UPDATE auth.users
  SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', target_user_id,
    'name', user_name,
    'old_role', old_role,
    'new_role', new_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text) TO authenticated;
