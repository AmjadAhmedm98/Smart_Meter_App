# نظام إدارة المقاييس

نظام متكامل لإدارة قراءة مقاييس الكهرباء والمياه للمشتركين والمغذيات مع إمكانية تصدير التقارير واستيراد البيانات.

## التثبيت والإعداد

### 1. تثبيت التبعيات
```bash
npm install
```

### 2. إعداد قاعدة البيانات (Supabase)

1. إنشاء مشروع جديد في [Supabase](https://supabase.com)
2. نسخ ملف `.env.example` إلى `.env`
3. تحديث متغيرات البيئة في ملف `.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_nrV9ZOSld29-tAKs26c6lA_6eOTqPlr
```

### 3. تطبيق المايجريشن

في لوحة تحكم Supabase، انتقل إلى SQL Editor وقم بتشغيل:
- `supabase/migrations/complete_setup.sql`

### 4. إعداد Edge Functions

في لوحة تحكم Supabase، انتقل إلى Edge Functions وقم بإنشاء:

1. دالة `auth-login` - انسخ محتوى `supabase/functions/auth-login/index.ts`
2. دالة `admin-users` - انسخ محتوى `supabase/functions/admin-users/index.ts`

**مهم جداً - إعداد متغيرات البيئة لكل Edge Function:**

لكل دالة، أضف في Settings > Environment Variables:
- `SUPABASE_URL`: انسخ من Project Settings > API
- `SUPABASE_SERVICE_ROLE_KEY`: انسخ من Project Settings > API

### 5. تشغيل النظام

```bash
npm run dev
```

## بيانات تسجيل الدخول الافتراضية

- **المدير:** `admin` / `admin123`
- **الموظف:** `employee1` / `123456`

## الميزات

- ✅ إدارة محاضر الاستلام والتسليم
- ✅ إدارة قراءات مقاييس المشتركين
- ✅ إدارة قراءات مقاييس المغذيات
- ✅ نظام المهام للموظفين
- ✅ خريطة المهام المنجزة
- ✅ إدارة المستخدمين والأدوار
- ✅ تصدير التقارير (Excel)
- ✅ استيراد البيانات (Excel)
- ✅ رفع وعرض صور المقاييس
- ✅ الوضع المظلم/المضيء
- ✅ تصميم متجاوب

## الأدوار والصلاحيات

### مدير النظام (ADMIN)
- جميع الصلاحيات
- إدارة المستخدمين
- عرض جميع البيانات
- تصدير التقارير

### قارئ المقاييس (METER_READER)
- إدخال قراءات المشتركين والمغذيات
- تنفيذ المهام المكلف بها
- عرض بياناته فقط

### قارئ عام (GENERAL_READER)
- إدخال قراءات المغذيات
- تنفيذ المهام المكلف بها
- عرض بياناته فقط

---

**شركة أبراج الأنوار للتجارة والمقاولات العامة**  
جميع الحقوق محفوظة © 2025