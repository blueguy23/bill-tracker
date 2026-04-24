/**
 * withRequestLogging — wraps a Next.js Route Handler to emit a structured
 * log line per request: method, path, status, duration, and request ID.
 *
 * Usage (in any route.ts):
 *   export const GET = withRequestLogging(_GET);
 *
 * The X-Request-Id header is forwarded from the client when present;
 * otherwise a short random ID is generated so correlated log lines
 * can be traced through the stack.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

type RouteHandler = (req: NextRequest, ctx: unknown) => Promise<NextResponse> | NextResponse;

export function withRequestLogging(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, ctx: unknown): Promise<NextResponse> => {
    const start = Date.now();
    const requestId = req.headers.get('x-request-id') ?? Math.random().toString(36).slice(2, 10);

    let response: NextResponse;
    try {
      response = await handler(req, ctx);
    } catch (err) {
      const ms = Date.now() - start;
      logger.error('request.unhandled', {
        requestId,
        method: req.method,
        path: req.nextUrl.pathname,
        durationMs: ms,
        error: err instanceof Error ? err.message : String(err),
      });
      response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const ms = Date.now() - start;
    const status = response.status;
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    logger[level]('request', {
      requestId,
      method: req.method,
      path: req.nextUrl.pathname,
      status,
      durationMs: ms,
    });

    response.headers.set('x-request-id', requestId);
    return response;
  };
}
