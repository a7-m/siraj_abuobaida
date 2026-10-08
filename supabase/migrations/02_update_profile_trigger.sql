CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, grade, section, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'grade', 
    new.raw_user_meta_data->>'section', 
    'student'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;