import type { Transaction } from '@/lib/simplefin/types';

const TRANSFER_DESCRIPTION_RE = /^(deposit from |transfer from |transfer to |online transfer|account transfer)/i;

export function buildTransferRe(ownerName?: string | null): RegExp {
  const name = ownerName?.trim();
  if (!name) return TRANSFER_DESCRIPTION_RE;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `^(deposit from |transfer from |transfer to |online transfer|account transfer)` +
    `|zelle.*${escaped}|${escaped}.*zelle`,
    'i',
  );
}

export function classifyTransfer(
  txn: Pick<Transaction, 'accountId' | 'amount' | 'description'>,
  creditAccountIds: Set<string>,
  transferRe?: RegExp,
): boolean {
  if (creditAccountIds.has(txn.accountId) && txn.amount > 0) return true;
  return (transferRe ?? TRANSFER_DESCRIPTION_RE).test(txn.description);
}
