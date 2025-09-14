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
- `SUPABASE_URL`: https://exbfjwkcpmkjrjsgmyiq.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YmZqd2tjcG1ranJqc2dteWlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzYxNDU2OSwiZXhwIjoyMDczMTkwNTY5fQ.4m1xUGf2tTD2jCsxJ18ue6_Ib5B9CzIayyq3aBxynQ0

### 3. إنشاء Edge Function لإدارة المستخدمين
1. إنشاء دالة جديدة: `admin-users`
2. انسخ الكود من `supabase/functions/admin-users/index.ts`
3. أضف نفس متغيرات البيئة

## بعد الانتهاء:
- جرب تسجيل الدخول بـ: `admin` / `admin123`
- أو: `employee1` / `123456`

النظام سيعمل بشكل كامل! 🚀