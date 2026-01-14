import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateAdminPayload {
  action: 'create';
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'admin' | 'super_admin';
}

interface UpdateAdminPayload {
  action: 'update';
  userId: string;
  email?: string;
  password?: string;
  name: string;
  phone: string;
  role: 'admin' | 'super_admin';
}

type RequestPayload = CreateAdminPayload | UpdateAdminPayload;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      throw new Error('Insufficient permissions');
    }

    const payload: RequestPayload = await req.json();

    if (payload.action === 'create') {
      const { data: authData, error: signUpError } = await supabaseClient.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          name: payload.name,
          phone: payload.phone,
          role: payload.role,
        },
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .upsert({
            id: authData.user.id,
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            role: payload.role,
          });

        if (profileError) throw profileError;
      }

      return new Response(
        JSON.stringify({ success: true, user: authData.user }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } else if (payload.action === 'update') {
      const updates: any = {};

      if (payload.email) {
        updates.email = payload.email;
      }

      if (payload.password) {
        updates.password = payload.password;
      }

      if (Object.keys(updates).length > 0) {
        const { error: authUpdateError } = await supabaseClient.auth.admin.updateUserById(
          payload.userId,
          updates
        );

        if (authUpdateError) throw authUpdateError;
      }

      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({
          name: payload.name,
          email: payload.email || undefined,
          phone: payload.phone,
          role: payload.role,
        })
        .eq('id', payload.userId);

      if (profileError) throw profileError;

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('Error managing admin user:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
