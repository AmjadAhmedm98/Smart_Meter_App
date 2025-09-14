/*
  # إنشاء المستخدمين الافتراضيين

  1. إنشاء المستخدمين
    - مدير النظام (admin)
    - موظف تجريبي (employee1)
  
  2. تشفير كلمات المرور
    - admin: admin123
    - employee1: 123456
  
  3. تعيين الأدوار والصلاحيات
*/

-- إنشاء المستخدمين الافتراضيين
INSERT INTO app_users (id, username, password_hash, role, full_name, department, position, is_active) VALUES
(
  gen_random_uuid(),
  'admin',
  crypt('admin123', gen_salt('bf')),
  'ADMIN',
  'مدير النظام',
  'الإدارة العامة',
  'مدير النظام',
  true
),
(
  gen_random_uuid(),
  'employee1',
  crypt('123456', gen_salt('bf')),
  'METER_READER',
  'أحمد محمد علي',
  'قسم المقاييس',
  'فني مقاييس',
  true
)
ON CONFLICT (username) DO NOTHING;