# إعداد Edge Functions في Supabase

## الخطوات المطلوبة:

### 1. إنشاء Edge Function للمصادقة
في Supabase Dashboard:
1. انتقل إلى Edge Functions
2. انقر "Create a new function"
3. اسم الدالة: `auth-login`
4. انسخ الكود من `supabase/functions/auth-login/index.ts`

### 2. إعداد متغيرات البيئة لدالة auth-login
في إعدادات الدالة:
- `SUPABASE_URL`: انسخ من Project Settings > API
- `SUPABASE_SERVICE_ROLE_KEY`: انسخ من Project Settings > API

### 3. إنشاء Edge Function لإدارة المستخدمين
1. إنشاء دالة جديدة: `admin-users`
2. انسخ الكود من `supabase/functions/admin-users/index.ts`
3. أضف نفس متغيرات البيئة

## بعد الانتهاء:
- جرب تسجيل الدخول بـ: `admin` / `admin123`
- أو: `employee1` / `123456`

النظام سيعمل بشكل كامل! 🚀