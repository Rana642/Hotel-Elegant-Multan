import { createServiceClient } from '@/lib/supabase/server';

// Interim advance-payment method (bank transfer) shown at checkout only
// when the applied promotion requires it — see supabase/migrations/
// 2026-09-15_advance_payment.sql. Swap this for a real payment gateway
// later; the `settings` keys are the only thing that would need to change.

export interface BankDetails {
  bankName: string;
  accountTitle: string;
  iban: string;
  accountNumber: string;
  branchCode: string;
  branchName: string;
}

const BANK_DETAIL_KEYS = {
  bankName: 'advance_payment_bank_name',
  accountTitle: 'advance_payment_account_title',
  iban: 'advance_payment_iban',
  accountNumber: 'advance_payment_account_number',
  branchCode: 'advance_payment_branch_code',
  branchName: 'advance_payment_branch_name',
} as const;

export async function getBankDetails(): Promise<BankDetails> {
  const service = createServiceClient();
  const { data } = await service
    .from('settings')
    .select('key, value')
    .in('key', Object.values(BANK_DETAIL_KEYS));

  const map: Record<string, string> = {};
  (data || []).forEach((row: { key: string; value: string | null }) => {
    if (row.value) map[row.key] = row.value;
  });

  return {
    bankName: map[BANK_DETAIL_KEYS.bankName] || '',
    accountTitle: map[BANK_DETAIL_KEYS.accountTitle] || '',
    iban: map[BANK_DETAIL_KEYS.iban] || '',
    accountNumber: map[BANK_DETAIL_KEYS.accountNumber] || '',
    branchCode: map[BANK_DETAIL_KEYS.branchCode] || '',
    branchName: map[BANK_DETAIL_KEYS.branchName] || '',
  };
}
