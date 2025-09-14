import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-username',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface CreateUserRequest {
  username: string
  password: string
  full_name?: string
  department?: string
  position?: string
  role?: 'ADMIN' | 'EMPLOYEE'
}

interface UpdateUserRequest {
  userId: string
  username?: string
  password?: string
  full_name?: string
  department?: string
  position?: string
  role?: 'ADMIN' | 'EMPLOYEE'
  is_active?: boolean
}

interface DeleteUserRequest {
  userId: string
}

interface SeedDataRequest {
  type: 'seed_data'
}
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables with fallbacks
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
      console.error('   1. Go to Edge Functions > admin-users > Settings')
      console.error('   2. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
      console.error('   3. Get values from Project Settings > API')
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error - Missing environment variables',
          details: 'Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Edge Function settings',
          instructions: 'Go to Supabase Dashboard > Edge Functions > admin-users > Settings > Environment Variables'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Test database connection
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .from('app_users')
        .select('count')
        .limit(1)
      
      if (testError) {
        console.error('Database connection test failed:', testError)
        return new Response(
          JSON.stringify({ 
            error: 'Database connection failed',
            details: testError.message
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (dbError) {
      console.error('Database test error:', dbError)
      return new Response(
        JSON.stringify({ 
          error: 'Database connection error',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user authentication info
    const authHeader = req.headers.get('Authorization')
    const userHeader = req.headers.get('X-User-Username')
    
    console.log('Auth check:', {
      hasAuthHeader: !!authHeader,
      userHeader: userHeader,
      method: req.method
    })

    // For now, allow requests without strict auth validation to test the connection
    // In production, you should validate the auth properly
    
    const method = req.method

    // Parse request body for all operations
    let requestBody: any = {}
    try {
      if (req.method === 'POST') {
        requestBody = await req.json()
      }
    } catch (parseError) {
      console.error('Error parsing request body:', parseError)
      // Continue with empty body for GET-like operations
    }

    // Determine action from body or default to method-based logic
    const action = requestBody.action || (method === 'GET' ? 'GET' : method)
    
    console.log('Processing action:', action, 'with body:', requestBody)

    if (action === 'GET') {
      try {
        // جلب قائمة المستخدمين
        const { data, error } = await supabaseAdmin
          .from('app_users')
          .select('id, username, role, full_name, department, position, is_active, created_at, updated_at')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching users:', error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('Users fetched successfully:', data?.length || 0)

        return new Response(
          JSON.stringify({ data: data || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (fetchError) {
        console.error('Fetch users error:', fetchError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch users',
            details: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (action === 'POST' || action === 'seed_data') {
      try {
        // التحقق من نوع الطلب
        if (requestBody.type === 'seed_data') {
          // تهيئة البيانات الأساسية
          try {
            // إدراج الأدوار الأساسية مع تجنب التكرار
            const basicRoles = [
              { name: 'admin', display_name: 'مدير النظام', description: 'صلاحيات كاملة لإدارة النظام' },
              { name: 'employee', display_name: 'موظف', description: 'صلاحيات محدودة لإدخال البيانات' },
              { name: 'meter_reader', display_name: 'قارئ المقاييس', description: 'صلاحيات قراءة وتنفيذ المهام' }
            ]

            for (const role of basicRoles) {
              await supabaseAdmin
                .from('roles')
                .upsert(role, { onConflict: 'name' })
            }

            // إدراج الصلاحيات الأساسية مع تجنب التكرار
            const basicPermissions = [
              { resource: 'overview', action: 'view', display_name: 'عرض النظرة العامة' },
              { resource: 'records', action: 'view', display_name: 'عرض محاضر الاستلام' },
              { resource: 'records', action: 'create', display_name: 'إنشاء محضر استلام' },
              { resource: 'subscribers', action: 'view', display_name: 'عرض مقاييس المشتركين' },
              { resource: 'subscribers', action: 'create', display_name: 'إضافة قراءة مشترك' },
              { resource: 'feeders', action: 'view', display_name: 'عرض مقاييس المغذيات' },
              { resource: 'feeders', action: 'create', display_name: 'إضافة قراءة مغذي' },
              { resource: 'tasks', action: 'view', display_name: 'عرض المهام' },
              { resource: 'tasks', action: 'execute', display_name: 'تنفيذ مهمة' }
            ]

            for (const permission of basicPermissions) {
              await supabaseAdmin
                .from('permissions')
                .upsert(permission, { onConflict: 'resource,action' })
            }

            return new Response(
              JSON.stringify({ success: true, message: 'Basic data seeded successfully' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          } catch (seedError) {
            console.error('Seed data error:', seedError)
            return new Response(
              JSON.stringify({ 
                error: 'Failed to seed basic data',
                details: seedError instanceof Error ? seedError.message : 'Unknown seed error'
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }

        // إنشاء مستخدم جديد
        const userData = requestBody.userData || requestBody
        const { username, password, full_name, department, position, role = 'EMPLOYEE' }: CreateUserRequest = userData

        console.log('Creating user:', { username, role, full_name })

        // التحقق من صحة البيانات
        if (!username || !password) {
          return new Response(
            JSON.stringify({ error: 'Username and password are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // التحقق من صحة اليوزرنيم
        if (!/^[a-zA-Z0-9]+$/.test(username) || username.length < 3 || username.length > 20) {
          return new Response(
            JSON.stringify({ error: 'Invalid username format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // التحقق من عدم وجود اليوزرنيم مسبقاً
        const { data: existingUser } = await supabaseAdmin
          .from('app_users')
          .select('id')
          .eq('username', username)
          .limit(1)

        if (existingUser && existingUser.length > 0) {
          return new Response(
            JSON.stringify({ error: 'Username already exists' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // تشفير كلمة المرور وإنشاء المستخدم
        // إنشاء المستخدم في نظام المصادقة أولاً
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: `${username}@system.local`, // استخدام إيميل وهمي
          password: password,
          email_confirm: true
        })
        
        if (authError) {
          console.error('Auth user creation error:', authError)
          return new Response(
            JSON.stringify({ error: 'Auth user creation failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // تشفير كلمة المرور للتخزين في app_users
        const { data: hashedPassword, error: hashError } = await supabaseAdmin.rpc('hash_password', { password })
        
        if (hashError) {
          console.error('Password hashing error:', hashError)
          return new Response(
            JSON.stringify({ error: 'Password hashing failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: newUser, error: insertError } = await supabaseAdmin
          .from('app_users')
          .insert([{
            id: authUser.user.id, // استخدام نفس ID من نظام المصادقة
            username,
            password_hash: hashedPassword,
            role,
            full_name: full_name || null,
            department: department || null,
            position: position || null
          }])
          .select()
          .single()

        if (insertError) {
          console.error('User creation error:', insertError)
          return new Response(
            JSON.stringify({ error: insertError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // إرجاع البيانات بدون كلمة المرور
        const { password_hash, ...userWithoutPassword } = newUser
        return new Response(
          JSON.stringify({ user: userWithoutPassword }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (createError) {
        console.error('Create user error:', createError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create user',
            details: createError instanceof Error ? createError.message : 'Unknown create error'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (action === 'PUT') {
      try {
        // تحديث مستخدم
        const userData = requestBody.userData || requestBody
        const userId = requestBody.userId || userData.userId
        const { username, full_name, department, position, role, is_active }: UpdateUserRequest = userData

        const updateData: any = {}
        if (username !== undefined) {
          // التحقق من صحة اليوزرنيم الجديد
          if (!/^[a-zA-Z0-9]+$/.test(username) || username.length < 3 || username.length > 20) {
            return new Response(
              JSON.stringify({ error: 'Invalid username format' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          updateData.username = username
        }
        if (password !== undefined && password.trim() !== '') {
          // تشفير كلمة المرور الجديدة
          const { data: hashedPassword, error: hashError } = await supabaseAdmin.rpc('hash_password', { password })
          if (hashError) {
            return new Response(
              JSON.stringify({ error: 'Password hashing failed' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          updateData.password_hash = hashedPassword
        }
        if (full_name !== undefined) updateData.full_name = full_name
        if (department !== undefined) updateData.department = department
        if (position !== undefined) updateData.position = position
        if (role !== undefined) updateData.role = role
        if (is_active !== undefined) updateData.is_active = is_active

        const { error } = await supabaseAdmin
          .from('app_users')
          .update(updateData)
          .eq('id', userId)

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (updateError) {
        console.error('Update user error:', updateError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update user',
            details: updateError instanceof Error ? updateError.message : 'Unknown update error'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (action === 'DELETE') {
      try {
        // حذف مستخدم
        const userId = requestBody.userId

        // منع حذف الأدمن الرئيسي
        const { data: user } = await supabaseAdmin
          .from('app_users')
          .select('username')
          .eq('id', userId)
          .single()

        if (user && user.username === 'admin') {
          return new Response(
            JSON.stringify({ error: 'Cannot delete main admin user' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabaseAdmin
          .from('app_users')
          .delete()
          .eq('id', userId)

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (deleteError) {
        console.error('Delete user error:', deleteError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to delete user',
            details: deleteError instanceof Error ? deleteError.message : 'Unknown delete error'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Admin users function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})