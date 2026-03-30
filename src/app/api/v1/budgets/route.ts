import { getDb } from '@/adapters/db';
import { handleGetBudgets } from '@/handlers/budgets';

export async function GET() {
  const db = await getDb();
  return handleGetBudgets(db);
}
