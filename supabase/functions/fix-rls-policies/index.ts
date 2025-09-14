import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
      keyPreview: supabaseServiceKey ? `${supabaseServiceKey.substring(0, 10)}...` : 'MISSING'
    })
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing environment variables:', {
        SUPABASE_URL: !!supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey
      })
      console.error('📝 Please set these environment variables in Supabase Dashboard:')
      console.error('   1. Go to Edge Functions > fix-rls-policies > Settings')
      console.error('   2. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
      console.error('   3. Get values from Project Settings > API')
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error - Missing environment variables',
          details: 'Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Edge Function settings',
          instructions: 'Go to Supabase Dashboard > Edge Functions > fix-rls-policies > Settings > Environment Variables'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🔧 بدء إصلاح سياسات RLS...')

    // إنشاء الدوال المساعدة أولاً
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
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
      `
    })

    // إصلاح سياسات app_users
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- حذف السياسات القديمة
        DROP POLICY IF EXISTS "admin_can_manage_all_users" ON app_users;
        DROP POLICY IF EXISTS "users_can_read_own_data" ON app_users;
        
        -- إنشاء سياسات جديدة
        CREATE POLICY "admin_can_manage_all_users" ON app_users
          FOR ALL TO authenticated
          USING (is_admin())
          WITH CHECK (is_admin());
          
        CREATE POLICY "users_can_read_own_data" ON app_users
          FOR SELECT TO authenticated
          USING (id = auth.uid());
      `
    })

    // إصلاح سياسات subscribers
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- حذف السياسات القديمة
        DROP POLICY IF EXISTS "subscribers_select_policy" ON subscribers;
        DROP POLICY IF EXISTS "subscribers_insert_policy" ON subscribers;
        DROP POLICY IF EXISTS "subscribers_update_policy" ON subscribers;
        DROP POLICY IF EXISTS "subscribers_delete_policy" ON subscribers;
        
        -- إنشاء سياسات جديدة
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
      `
    })

    // إصلاح سياسات records
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- حذف السياسات القديمة
        DROP POLICY IF EXISTS "records_select_policy" ON records;
        DROP POLICY IF EXISTS "records_insert_policy" ON records;
        DROP POLICY IF EXISTS "records_update_policy" ON records;
        DROP POLICY IF EXISTS "records_delete_policy" ON records;
        
        -- إنشاء سياسات جديدة
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
      `
    })

    // إصلاح سياسات feeders
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- حذف السياسات القديمة
        DROP POLICY IF EXISTS "feeders_select_policy" ON feeders;
        DROP POLICY IF EXISTS "feeders_insert_policy" ON feeders;
        DROP POLICY IF EXISTS "feeders_update_policy" ON feeders;
        DROP POLICY IF EXISTS "feeders_delete_policy" ON feeders;
        
        -- إنشاء سياسات جديدة
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
      `
    })

    // إصلاح سياسات meters
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- حذف السياسات القديمة
        DROP POLICY IF EXISTS "users_can_manage_meters" ON meters;
        
        -- إنشاء سياسات جديدة
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
      `
    })

    // إصلاح سياسات tasks
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- حذف السياسات القديمة
        DROP POLICY IF EXISTS "users_can_manage_tasks" ON tasks;
        
        -- إنشاء سياسات جديدة
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
      `
    })

    // إصلاح سياسات التخزين
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- حذف السياسات القديمة للتخزين
        DROP POLICY IF EXISTS "Allow authorized users to upload subscriber images" ON storage.objects;
        DROP POLICY IF EXISTS "Allow image access" ON storage.objects;
        DROP POLICY IF EXISTS "Allow image uploads" ON storage.objects;
        DROP POLICY IF EXISTS "Allow image deletion" ON storage.objects;
        
        -- إنشاء سياسة رفع الصور
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
          
        -- إنشاء سياسة الوصول للصور
        CREATE POLICY "Allow image access" ON storage.objects 
          FOR SELECT TO authenticated 
          USING (
            bucket_id = 'meter-images' AND
            get_user_role() = ANY (ARRAY['ADMIN', 'METER_READER', 'GENERAL_READER'])
          );
          
        -- إنشاء سياسة حذف الصور
        CREATE POLICY "Allow image deletion" ON storage.objects 
          FOR DELETE TO authenticated 
          USING (
            bucket_id = 'meter-images' AND
            (is_admin() OR get_user_role() = ANY (ARRAY['METER_READER', 'GENERAL_READER']))
          );
      `
    })

    console.log('✅ تم إصلاح جميع سياسات RLS بنجاح')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم إصلاح سياسات RLS بنجاح' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ خطأ في إصلاح سياسات RLS:', error)
    return new Response(
      JSON.stringify({ 
        error: 'فشل في إصلاح سياسات RLS',
        details: error instanceof Error ? error.message : 'خطأ غير معروف'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})