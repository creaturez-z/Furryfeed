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
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  sender_email: string;
  sender_name: string;
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

async function sendSMTPEmail(
  settings: EmailSettings,
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create the email message in RFC 5322 format
    const message = [
      `From: ${settings.sender_name} <${settings.sender_email}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ].join('\r\n');

    // Encode message in base64
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const base64Message = btoa(String.fromCharCode(...data));

    // Connect to SMTP server
    const conn = await Deno.connect({
      hostname: settings.smtp_host,
      port: settings.smtp_port,
    });

    const reader = conn.readable.getReader();
    const writer = conn.writable.getWriter();

    // Helper to read response
    const readResponse = async (): Promise<string> => {
      const { value } = await reader.read();
      return new TextDecoder().decode(value);
    };

    // Helper to send command
    const sendCommand = async (command: string) => {
      await writer.write(new TextEncoder().encode(command + '\r\n'));
    };

    try {
      // Read greeting
      await readResponse();

      // EHLO
      await sendCommand(`EHLO ${settings.smtp_host}`);
      await readResponse();

      // STARTTLS
      await sendCommand('STARTTLS');
      await readResponse();

      // Close current connection and upgrade to TLS
      reader.releaseLock();
      writer.releaseLock();
      conn.close();

      // Reconnect with TLS
      const tlsConn = await Deno.connectTls({
        hostname: settings.smtp_host,
        port: settings.smtp_port,
      });

      const tlsReader = tlsConn.readable.getReader();
      const tlsWriter = tlsConn.writable.getWriter();

      const tlsReadResponse = async (): Promise<string> => {
        const { value } = await tlsReader.read();
        return new TextDecoder().decode(value);
      };

      const tlsSendCommand = async (command: string) => {
        await tlsWriter.write(new TextEncoder().encode(command + '\r\n'));
      };

      // EHLO again after TLS
      await tlsSendCommand(`EHLO ${settings.smtp_host}`);
      await tlsReadResponse();

      // AUTH LOGIN
      await tlsSendCommand('AUTH LOGIN');
      await tlsReadResponse();

      // Send username (base64 encoded)
      await tlsSendCommand(btoa(settings.smtp_username));
      await tlsReadResponse();

      // Send password (base64 encoded)
      await tlsSendCommand(btoa(settings.smtp_password));
      await tlsReadResponse();

      // MAIL FROM
      await tlsSendCommand(`MAIL FROM:<${settings.sender_email}>`);
      await tlsReadResponse();

      // RCPT TO
      await tlsSendCommand(`RCPT TO:<${to}>`);
      await tlsReadResponse();

      // DATA
      await tlsSendCommand('DATA');
      await tlsReadResponse();

      // Send message
      await tlsSendCommand(message + '\r\n.');
      await tlsReadResponse();

      // QUIT
      await tlsSendCommand('QUIT');
      await tlsReadResponse();

      tlsReader.releaseLock();
      tlsWriter.releaseLock();
      tlsConn.close();

      return { success: true };
    } catch (error) {
      reader.releaseLock();
      writer.releaseLock();
      conn.close();
      throw error;
    }
  } catch (error) {
    console.error('SMTP Error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
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
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const payload: EmailPayload = await req.json();
    const { eventType, variables } = payload;

    if (!eventType || !variables) {
      throw new Error('Missing required fields: eventType and variables');
    }

    // Get email settings
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

    // Check if email system is enabled
    if (!settings.is_enabled) {
      return new Response(
        JSON.stringify({ success: false, message: 'Email system is disabled' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get email template
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

    // Check if template is enabled
    if (!template.is_enabled) {
      return new Response(
        JSON.stringify({ success: false, message: `Email disabled for event: ${eventType}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get active recipients
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

    // Replace variables in subject and body
    const subject = replaceVariables(template.subject, variables);
    const body = replaceVariables(template.body, variables);

    // Send email to all active recipients
    const results = [];
    for (const recipient of recipients) {
      const result = await sendSMTPEmail(settings, recipient.email, subject, body);
      
      // Log the email attempt
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