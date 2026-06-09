import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getRecentErrors, getErrorCount } from '@/lib/errorReporter';
import { withRequestLogging } from '@/lib/withRequestLogging';

async function _GET(_req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const mem = process.memoryUsage();
  return NextResponse.json({
    uptime: Math.round(process.uptime()),
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
    },
    errors: {
      total: getErrorCount(),
      recent: getRecentErrors(),
    },
  });
}

export const GET = withRequestLogging(_GET);
