import { supabase } from '../lib/supabase';

export async function creditSubscriptionWallet(
  profileId: string,
  amount: number,
  subscriptionId: string | null,
  description: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: wallet, error: walletError } = await supabase
      .from('subscription_wallets')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (walletError) {
      return { success: false, error: walletError.message };
    }

    if (!wallet) {
      return { success: false, error: 'Subscription wallet not found for this profile' };
    }

    const newBalance = (wallet.balance || 0) + amount;

    const { error: updateError } = await supabase
      .from('subscription_wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    const { error: transactionError } = await supabase
      .from('subscription_wallet_transactions')
      .insert({
        subscription_wallet_id: wallet.id,
        profile_id: profileId,
        subscription_id: subscriptionId,
        transaction_type: 'credit',
        amount: amount,
        description: description,
        balance_after: newBalance,
      });

    if (transactionError) {
      return { success: false, error: transactionError.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to credit subscription wallet' };
  }
}

export async function debitSubscriptionWallet(
  profileId: string,
  amount: number,
  subscriptionId: string | null,
  description: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: wallet, error: walletError } = await supabase
      .from('subscription_wallets')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (walletError) {
      return { success: false, error: walletError.message };
    }

    if (!wallet) {
      return { success: false, error: 'Subscription wallet not found for this profile' };
    }

    if (wallet.balance < amount) {
      return { success: false, error: 'Insufficient subscription wallet balance' };
    }

    const newBalance = wallet.balance - amount;

    const { error: updateError } = await supabase
      .from('subscription_wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    const { error: transactionError } = await supabase
      .from('subscription_wallet_transactions')
      .insert({
        subscription_wallet_id: wallet.id,
        profile_id: profileId,
        subscription_id: subscriptionId,
        transaction_type: 'debit',
        amount: amount,
        description: description,
        balance_after: newBalance,
      });

    if (transactionError) {
      return { success: false, error: transactionError.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to debit subscription wallet' };
  }
}

export async function getSubscriptionWalletBalance(
  profileId: string
): Promise<{ balance: number; error?: string }> {
  try {
    const { data: wallet, error } = await supabase
      .from('subscription_wallets')
      .select('balance')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) {
      return { balance: 0, error: error.message };
    }

    return { balance: wallet?.balance || 0 };
  } catch (error: any) {
    return { balance: 0, error: error.message };
  }
}
