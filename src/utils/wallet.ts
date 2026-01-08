import { supabase } from '../lib/supabase';

export async function ensureWalletExists(customerId: string) {
  const { data: existingWallet } = await supabase
    .from('wallets')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (!existingWallet) {
    const { data: newWallet, error } = await supabase
      .from('wallets')
      .insert({ customer_id: customerId, balance: 0 })
      .select()
      .single();

    if (error) throw error;
    return newWallet;
  }

  return existingWallet;
}

export async function getWalletBalance(customerId: string): Promise<number> {
  const wallet = await ensureWalletExists(customerId);
  return wallet.balance;
}

export async function creditWallet(
  customerId: string,
  amount: number,
  reason: string,
  referenceType: 'admin_adjustment' | 'recharge',
  adminId?: string
) {
  const wallet = await ensureWalletExists(customerId);

  const newBalance = parseFloat(wallet.balance.toString()) + amount;

  const { error: updateError } = await supabase
    .from('wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', wallet.id);

  if (updateError) throw updateError;

  const { error: transactionError } = await supabase
    .from('wallet_transactions')
    .insert({
      wallet_id: wallet.id,
      customer_id: customerId,
      type: 'credit',
      amount,
      reason,
      reference_type: referenceType,
      admin_id: adminId,
    });

  if (transactionError) throw transactionError;

  return newBalance;
}

export async function debitWallet(
  customerId: string,
  amount: number,
  reason: string,
  referenceType: 'admin_adjustment' | 'subscription_charge',
  referenceId?: string,
  adminId?: string
) {
  const wallet = await ensureWalletExists(customerId);

  const currentBalance = parseFloat(wallet.balance.toString());

  if (currentBalance < amount) {
    throw new Error('Insufficient wallet balance');
  }

  const newBalance = currentBalance - amount;

  const { error: updateError } = await supabase
    .from('wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', wallet.id);

  if (updateError) throw updateError;

  const { error: transactionError } = await supabase
    .from('wallet_transactions')
    .insert({
      wallet_id: wallet.id,
      customer_id: customerId,
      type: 'debit',
      amount,
      reason,
      reference_type: referenceType,
      reference_id: referenceId,
      admin_id: adminId,
    });

  if (transactionError) throw transactionError;

  return newBalance;
}

export function calculatePriceForPet(petWeight: number, weightSlabs: any[]): { price: number; foodQuantity: number; slab: any } | null {
  const petWeightKg = petWeight / 1000;

  const matchingSlab = weightSlabs.find(
    (slab) => petWeightKg >= slab.min_weight && petWeightKg <= slab.max_weight
  );

  if (!matchingSlab) {
    return null;
  }

  return {
    price: matchingSlab.price,
    foodQuantity: matchingSlab.food_quantity,
    slab: matchingSlab,
  };
}
