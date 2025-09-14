/*
  # إعداد النظام الكامل - نسخة نهائية ومبسطة

  1. الدوال المساعدة
    - دالة تشفير كلمة المرور
    - دالة التحقق من كلمة المرور  
    - دالة الحصول على دور المستخدم
    - دالة التحقق من صلاحيات المدير

  2. المستخدمين الافتراضيين
    - admin / admin123 (مدير)
    - employee1 / 123456 (موظف)

  3. سياسات الأمان (RLS)
    - سياسات app_users
    - سياسات records, subscribers, feeders
    - سياسات meters, tasks

  4. إعداد التخزين
    - bucket للصور
    - سياسات الوصول
*/

-- حذف السياسات القديمة أولاً
DROP POLICY IF EXISTS "admin_can_manage_all_users" ON app_users;
DROP POLICY IF EXISTS "users_can_read_own_data" ON app_users;
DROP POLICY IF EXISTS "subscribers_select_policy" ON subscribers;
DROP POLICY IF EXISTS "subscribers_insert_policy" ON subscribers;
DROP POLICY IF EXISTS "subscribers_update_policy" ON subscribers;
DROP POLICY IF EXISTS "subscribers_delete_policy" ON subscribers;
DROP POLICY IF EXISTS "records_select_policy" ON records;
DROP POLICY IF EXISTS "records_insert_policy" ON records;
DROP POLICY IF EXISTS "records_update_policy" ON records;
DROP POLICY IF EXISTS "records_delete_policy" ON records;
DROP POLICY IF EXISTS "feeders_select_policy" ON feeders;
DROP POLICY IF EXISTS "feeders_insert_policy" ON feeders;
DROP POLICY IF EXISTS "feeders_update_policy" ON feeders;
DROP POLICY IF EXISTS "feeders_delete_policy" ON feeders;
DROP POLICY IF EXISTS "meters_select_policy" ON meters;
DROP POLICY IF EXISTS "meters_insert_policy" ON meters;
DROP POLICY IF EXISTS "meters_update_policy" ON meters;
DROP POLICY IF EXISTS "meters_delete_policy" ON meters;
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;
DROP POLICY IF EXISTS "Allow image uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow image access" ON storage.objects;
DROP POLICY IF EXISTS "Allow image deletion" ON storage.objects;

-- حذف الدوال القديمة
DROP FUNCTION IF EXISTS hash_password(text);
DROP FUNCTION IF EXISTS verify_password(text, text);
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS is_admin();

-- إنشاء الدوال المساعدة
CREATE OR REPLACE FUNCTION hash_password(password text)
RETURNS text AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION verify_password(password text, hash text)
RETURNS boolean AS $$
BEGIN
  RETURN crypt(password, hash) = hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM app_users 
    WHERE id = auth.uid() 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM app_users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN' 
      AND is_active = true
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء المستخدمين الافتراضيين
DO $$
BEGIN
  -- حذف المستخدمين الموجودين إذا كانوا موجودين
  DELETE FROM app_users WHERE username IN ('admin', 'employee1');
  
  -- إنشاء المدير
  INSERT INTO app_users (username, password_hash, role, full_name, is_active)
  VALUES (
    'admin',
    hash_password('admin123'),
    'ADMIN',
    'مدير النظام',
    true
  );
  
  -- إنشاء الموظف
  INSERT INTO app_users (username, password_hash, role, full_name, is_active)
  VALUES (
    'employee1',
    hash_password('123456'),
    'METER_READER',
    'موظف تجريبي',
    true
  );
  
  RAISE NOTICE '✅ تم إنشاء المستخدمين الافتراضيين بنجاح';
  RAISE NOTICE '👤 المدير: admin / admin123';
  RAISE NOTICE '👤 الموظف: employee1 / 123456';
END $$;

-- إعداد سياسات app_users
CREATE POLICY "admin_can_manage_all_users" ON app_users
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "users_can_read_own_data" ON app_users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- إعداد سياسات subscribers
CREATE POLICY "subscribers_select_policy" ON subscribers
  FOR SELECT TO authenticated
  USING (
    app_user_id = auth.uid() OR 
    get_user_role() = ANY (ARRAY['ADMIN', 'METER_READER', 'GENERAL_READER'])
  );

CREATE POLICY "subscribers_insert_policy" ON subscribers
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['ADMIN', 'METER_READER', 'GENERAL_READER']) AND
    app_user_id = auth.uid()
  );

CREATE POLICY "subscribers_update_policy" ON subscribers
  FOR UPDATE TO authenticated
  USING (app_user_id = auth.uid() OR is_admin())
  WITH CHECK (app_user_id = auth.uid() OR is_admin());

CREATE POLICY "subscribers_delete_policy" ON subscribers
  FOR DELETE TO authenticated
  USING (app_user_id = auth.uid() OR is_admin());

-- إعداد سياسات records
CREATE POLICY "records_select_policy" ON records
  FOR SELECT TO authenticated
  USING (
    app_user_id = auth.uid() OR 
    get_user_role() = ANY (ARRAY['ADMIN', 'METER_READER', 'GENERAL_READER'])
  );

CREATE POLICY "records_insert_policy" ON records
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['ADMIN', 'METER_READER', 'GENERAL_READER']) AND
    app_user_id = auth.uid()
  );

CREATE POLICY "records_update_policy" ON records
  FOR UPDATE TO authenticated
  USING (app_user_id = auth.uid() OR is_admin())
  WITH CHECK (app_user_id = auth.uid() OR is_admin());

CREATE POLICY "records_delete_policy" ON records
  FOR DELETE TO authenticated
  USING (app_user_id = auth.uid() OR is_admin());

-- إعداد سياسات feeders
CREATE POLICY "feeders_select_policy" ON feeders
  FOR SELECT TO authenticated
  USING (
    app_user_id = auth.uid() OR 
    get_user_role() = ANY (ARRAY['ADMIN', 'METER_READER', 'GENERAL_READER'])
  );

CREATE POLICY "feeders_insert_policy" ON feeders
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['ADMIN', 'METER_READER', 'GENERAL_READER']) AND
    app_user_id = auth.uid()
  );

CREATE POLICY "feeders_update_policy" ON feeders
  FOR UPDATE TO authenticated
  USING (app_user_id = auth.uid() OR is_admin())
  WITH CHECK (app_user_id = auth.uid() OR is_admin());

CREATE POLICY "feeders_delete_policy" ON feeders
  FOR DELETE TO authenticated
  USING (app_user_id = auth.uid() OR is_admin());

-- إعداد سياسات meters
CREATE POLICY "meters_select_policy" ON meters
  FOR SELECT TO authenticated
  USING (
    app_user_id = auth.uid() OR 
    get_user_role() = ANY (ARRAY['ADMIN', 'METER_READER', 'GENERAL_READER'])
  );

CREATE POLICY "meters_insert_policy" ON meters
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = ANY (ARRAY['ADMIN', 'METER_READER', 'GENERAL_READER']) AND
    app_user_id = auth.uid()
  );

CREATE POLICY "meters_update_policy" ON meters
  FOR UPDATE TO authenticated
  USING (app_user_id = auth.uid() OR is_admin())
  WITH CHECK (app_user_id = auth.uid() OR is_admin());

CREATE POLICY "meters_delete_policy" ON meters
  FOR DELETE TO authenticated
  USING (app_user_id = auth.uid() OR is_admin());

-- إعداد سياسات tasks
CREATE POLICY "tasks_select_policy" ON tasks
  FOR SELECT TO authenticated
  USING (
    app_user_id = auth.uid() OR 
    assigned_by = auth.uid() OR 
    is_admin()
  );

CREATE POLICY "tasks_insert_policy" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    (assigned_by = auth.uid() OR is_admin()) AND
    get_user_role() = ANY (ARRAY['ADMIN', 'METER_READER', 'GENERAL_READER'])
  );

CREATE POLICY "tasks_update_policy" ON tasks
  FOR UPDATE TO authenticated
  USING (app_user_id = auth.uid() OR assigned_by = auth.uid() OR is_admin())
  WITH CHECK (app_user_id = auth.uid() OR assigned_by = auth.uid() OR is_admin());

CREATE POLICY "tasks_delete_policy" ON tasks
  FOR DELETE TO authenticated
  USING (app_user_id = auth.uid() OR assigned_by = auth.uid() OR is_admin());

-- إنشاء bucket التخزين إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public)
VALUES ('meter-images', 'meter-images', true)
ON CONFLICT (id) DO NOTHING;

-- إعداد سياسات التخزين
CREATE POLICY "Allow image uploads" ON storage.objects 
  FOR INSERT TO authenticated 
  WITH CHECK (
    bucket_id = 'meter-images' AND
    (
      storage.foldername(name) = ARRAY['subscribers'] OR
      storage.foldername(name) = ARRAY['feeders'] OR
      storage.foldername(name) = ARRAY['tasks']
    ) AND
    get_user_role() = ANY (ARRAY['ADMIN', 'METER_READER', 'GENERAL_READER'])
  );

CREATE POLICY "Allow image access" ON storage.objects 
  FOR SELECT TO authenticated 
  USING (
    bucket_id = 'meter-images' AND
    get_user_role() = ANY (ARRAY['ADMIN', 'METER_READER', 'GENERAL_READER'])
  );

CREATE POLICY "Allow image deletion" ON storage.objects 
  FOR DELETE TO authenticated 
  USING (
    bucket_id = 'meter-images' AND
    (is_admin() OR get_user_role() = ANY (ARRAY['METER_READER', 'GENERAL_READER']))
  );

-- رسائل النجاح
DO $$
BEGIN
  RAISE NOTICE '🎉 تم إعداد النظام بنجاح!';
  RAISE NOTICE '✅ الدوال المساعدة';
  RAISE NOTICE '✅ المستخدمين الافتراضيين';
  RAISE NOTICE '✅ سياسات الأمان';
  RAISE NOTICE '✅ إعداد التخزين';
  RAISE NOTICE '';
  RAISE NOTICE '🔑 بيانات تسجيل الدخول:';
  RAISE NOTICE '👤 المدير: admin / admin123';
  RAISE NOTICE '👤 الموظف: employee1 / 123456';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 النظام جاهز للاستخدام!';
END $$;