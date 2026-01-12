import { supabase } from '../lib/supabase';

export async function logActivity(
  adminName: string,
  action: string,
  actionType: 'subscription' | 'order' | 'user' | 'invoice' | 'settings',
  entityId?: string,
  entityType?: string,
  details?: any
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from('activity_logs').insert({
      admin_id: user.id,
      admin_name: adminName,
      action,
      action_type: actionType,
      entity_id: entityId,
      entity_type: entityType,
      details: details || {},
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}
