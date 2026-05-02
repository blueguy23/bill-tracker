import type { Transaction } from '@/lib/simplefin/types';

const TRANSFER_DESCRIPTION_RE = /^(deposit from |transfer from |transfer to |online transfer|account transfer)/i;

export function buildTransferRe(): RegExp {
  const ownerName = process.env.TRANSFER_OWNER_NAME?.trim();
  if (!ownerName) return TRANSFER_DESCRIPTION_RE;
  const escaped = ownerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `^(deposit from |transfer from |transfer to |online transfer|account transfer)` +
    `|zelle.*${escaped}|${escaped}.*zelle`,
    'i',
  );
}

let _re: RegExp | null = null;
function getTransferRe(): RegExp {
  return (_re ??= buildTransferRe());
}

export function classifyTransfer(txn: Pick<Transaction, 'accountId' | 'amount' | 'description'>, creditAccountIds: Set<string>): boolean {
  if (creditAccountIds.has(txn.accountId) && txn.amount > 0) return true;
  return getTransferRe().test(txn.description);
}
