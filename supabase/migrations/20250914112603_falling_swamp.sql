/*
  # إضافة دالة get_all_users المفقودة

  1. الدوال الجديدة
    - `get_all_users()` - لجلب جميع المستخدمين للمدير
    - `is_admin()` - للتحقق من صلاحيات المدير
    - `get_user_role()` - لجلب دور المستخدم الحالي

  2. الأمان
    - فقط المدير يمكنه جلب جميع المستخدمين
    - التحقق من صلاحيات المستخدم قبل الوصول للبيانات
*/

-- إنشاء دالة للتحقق من كون المستخدم مدير
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
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

-- إنشاء دالة للحصول على دور المستخدم
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM app_users 
    WHERE id = auth.uid() 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء دالة لجلب جميع المستخدمين (للمدير فقط)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id uuid,
  username text,
  role text,
  full_name text,
  department text,
  position text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  -- التحقق من أن المستخدم الحالي مدير
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.role,
    u.full_name,
    u.department,
    u.position,
    u.is_active,
    u.created_at,
    u.updated_at
  FROM app_users u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء دالة لتشفير كلمة المرور
CREATE OR REPLACE FUNCTION hash_password(password text)
RETURNS text AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء دالة للتحقق من كلمة المرور
CREATE OR REPLACE FUNCTION verify_password(password text, hash text)
RETURNS boolean AS $$
BEGIN
  RETURN (hash = crypt(password, hash));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;