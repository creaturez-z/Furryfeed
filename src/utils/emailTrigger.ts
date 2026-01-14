export async function triggerEmail(
  eventType: string,
  variables: Record<string, string>
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      return { success: false, error: 'Missing Supabase configuration' };
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType,
          variables,
        }),
      }
    );

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error triggering email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to trigger email',
    };
  }
}
