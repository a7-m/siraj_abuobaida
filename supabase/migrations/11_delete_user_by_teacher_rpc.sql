-- Migration 11: Secure function for teachers to delete student accounts
CREATE OR REPLACE FUNCTION public.delete_user_by_teacher(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role text;
  target_role text;
  target_name text;
BEGIN
  -- 1. Verify caller is authenticated teacher
  caller_role := public.get_user_role();
  IF caller_role != 'teacher' THEN
    RAISE EXCEPTION 'غير مصرح: هذه العملية مخصصة للمعلمين فقط';
  END IF;

  -- 2. Cannot delete own account
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'لا يمكنك حذف حسابك الشخصي من هنا';
  END IF;

  -- 3. Get target details
  SELECT role, full_name INTO target_role, target_name
  FROM public.profiles
  WHERE id = target_user_id;

  IF target_role IS NULL THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;

  -- 4. Cannot delete another teacher
  IF target_role = 'teacher' THEN
    RAISE EXCEPTION 'لا يمكن حذف حساب معلّم آخر لأسباب أمنية وإدارية';
  END IF;

  -- 5. Check if author of content pages (foreign key RESTRICT)
  IF EXISTS (SELECT 1 FROM public.content_pages WHERE author_id = target_user_id) THEN
    RAISE EXCEPTION 'لا يمكن حذف المستخدم لأنه مرتبط بصفحات تعليمية منشورة';
  END IF;

  -- 6. Perform real deletion on auth.users (cascades to profiles and activities)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true, 'deleted_id', target_user_id, 'name', target_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_by_teacher(uuid) TO authenticated;
