import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];

    const { data: dailyItems, error: itemsError } = await supabase
      .from('subscription_daily_items')
      .select(`
        *,
        subscriptions!inner(*)
      `)
      .eq('delivery_date', today)
      .eq('is_delivered', false)
      .eq('subscriptions.status', 'active');

    if (itemsError) {
      throw new Error(`Failed to fetch daily items: ${itemsError.message}`);
    }

    const results = [];
    const processed = new Set<string>();

    for (const item of dailyItems || []) {
      const key = `${item.subscription_id}-${item.delivery_date}`;
      if (processed.has(key)) {
        continue;
      }
      processed.add(key);

      const subscription = item.subscriptions;
      const profileId = subscription.customer_id;

      const { data: wallet, error: walletError } = await supabase
        .from('subscription_wallets')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (walletError || !wallet) {
        results.push({
          subscription_id: item.subscription_id,
          success: false,
          error: 'Subscription wallet not found',
        });
        continue;
      }

      const { data: todayItems, error: todayItemsError } = await supabase
        .from('subscription_daily_items')
        .select('price')
        .eq('subscription_id', item.subscription_id)
        .eq('delivery_date', today)
        .eq('is_delivered', false);

      if (todayItemsError) {
        results.push({
          subscription_id: item.subscription_id,
          success: false,
          error: todayItemsError.message,
        });
        continue;
      }

      const dailyAmount = todayItems.reduce((sum, item) => sum + (item.price || 0), 0);

      if (wallet.balance < dailyAmount) {
        results.push({
          subscription_id: item.subscription_id,
          success: false,
          error: 'Insufficient subscription wallet balance',
          required: dailyAmount,
          available: wallet.balance,
        });
        continue;
      }

      const newBalance = wallet.balance - dailyAmount;

      const { error: updateError } = await supabase
        .from('subscription_wallets')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id);

      if (updateError) {
        results.push({
          subscription_id: item.subscription_id,
          success: false,
          error: updateError.message,
        });
        continue;
      }

      const { error: transactionError } = await supabase
        .from('subscription_wallet_transactions')
        .insert({
          subscription_wallet_id: wallet.id,
          profile_id: profileId,
          subscription_id: item.subscription_id,
          transaction_type: 'debit',
          amount: dailyAmount,
          description: `Daily meal deduction for ${today}`,
          balance_after: newBalance,
        });

      if (transactionError) {
        console.error('Failed to record transaction:', transactionError);
      }

      const { error: subError } = await supabase
        .from('subscriptions')
        .update({
          last_daily_deduction_date: today,
        })
        .eq('id', item.subscription_id);

      if (subError) {
        console.error('Failed to update subscription:', subError);
      }

      results.push({
        subscription_id: item.subscription_id,
        success: true,
        amount_deducted: dailyAmount,
        new_balance: newBalance,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        processed: results.length,
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