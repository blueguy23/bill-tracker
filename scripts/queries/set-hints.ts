import type { StrictDB } from 'strictdb';

const HINTS: Record<string, string> = {
  'Anthropic': 'CLAUDE.AI',
  'Att*Bill Payment': 'ATT',
  'Visible': 'VISIBLESERV',
};

export default {
  name: 'set-hints',
  description: 'Set paymentDescriptionHint on bills that need it for auto-pay detection',
  async run(db: StrictDB) {
    const bills = await db.queryMany('bills', { isRecurring: true }, { limit: 500 }) as any[];

    for (const bill of bills) {
      const hint = HINTS[bill.name];
      if (!hint) continue;
      if (bill.paymentDescriptionHint === hint) {
        console.log(`  SKIP ${bill.name} — already set to "${hint}"`);
        continue;
      }
      await db.updateOne('bills', { _id: bill._id } as any, { $set: { paymentDescriptionHint: hint } });
      console.log(`  SET  ${bill.name} → "${hint}"`);
    }
  },
};
