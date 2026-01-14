import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailPayload {
  eventType: string;
  variables: Record<string, string>;
}

interface EmailSettings {
  email_provider: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  sender_email: string;
  sender_name: string;
  resend_api_key: string | null;
  is_enabled: boolean;
}

interface EmailTemplate {
  subject: string;
  body: string;
  is_enabled: boolean;
}

interface EmailRecipient {
  email: string;
  name: string;
  is_active: boolean;
}

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

async function sendEmailViaResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from,
        to: [to],
        subject: subject,
        html: body,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send email via Resend');
    }

    return { success: true };
  } catch (error) {
    console.error('Resend Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: EmailPayload = await req.json();
    const { eventType, variables } = payload;

    if (!eventType || !variables) {
      throw new Error('Missing required fields: eventType and variables');
    }

    const { data: settingsData, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      throw new Error(`Failed to fetch email settings: ${settingsError.message}`);
    }

    if (!settingsData) {
      throw new Error('Email settings not configured');
    }

    const settings: EmailSettings = settingsData;

    if (!settings.is_enabled) {
      return new Response(
        JSON.stringify({ success: false, message: 'Email system is disabled' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (settings.email_provider === 'resend' && !settings.resend_api_key) {
      throw new Error('Resend API key not configured');
    }

    if (settings.email_provider === 'smtp') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'SMTP is not supported in Edge Functions. Please use Resend provider instead.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const { data: templateData, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('event_type', eventType)
      .maybeSingle();

    if (templateError) {
      throw new Error(`Failed to fetch email template: ${templateError.message}`);
    }

    if (!templateData) {
      throw new Error(`Email template not found for event: ${eventType}`);
    }

    const template: EmailTemplate = templateData;

    if (!template.is_enabled) {
      return new Response(
        JSON.stringify({ success: false, message: `Email disabled for event: ${eventType}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const { data: recipientsData, error: recipientsError } = await supabase
      .from('email_recipients')
      .select('*')
      .eq('is_active', true);

    if (recipientsError) {
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    if (!recipientsData || recipientsData.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No active recipients configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const recipients: EmailRecipient[] = recipientsData;

    const subject = replaceVariables(template.subject, variables);
    const body = replaceVariables(template.body, variables);

    const fromAddress = `${settings.sender_name} <${settings.sender_email}>`;

    const results = [];
    for (const recipient of recipients) {
      const result = await sendEmailViaResend(
        settings.resend_api_key!,
        fromAddress,
        recipient.email,
        subject,
        body
      );

      await supabase.from('email_logs').insert({
        event_type: eventType,
        recipient_email: recipient.email,
        subject: subject,
        status: result.success ? 'success' : 'failed',
        error_message: result.error || null,
      });

      results.push({
        recipient: recipient.email,
        success: result.success,
        error: result.error,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Emails processed',
        results: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});