import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { reportError } from '@/lib/errorReporter';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (req: NextRequest, ctx?: any) => Promise<Response> | Response;

export function getRequestId(req: Request): string {
  return req.headers.get('x-request-id') ?? 'unknown';
}

export function withRequestLogging(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, ctx: unknown): Promise<Response> => {
    const start = Date.now();
    const requestId = req.headers.get('x-request-id') ?? Math.random().toString(36).slice(2, 10);

    const enrichedReq = new NextRequest(req.url, {
      method: req.method,
      headers: new Headers(req.headers),
      body: req.body,
    });
    enrichedReq.headers.set('x-request-id', requestId);

    let response: Response;
    try {
      response = await handler(enrichedReq, ctx);
    } catch (err) {
      const ms = Date.now() - start;
      if (err instanceof AppError) {
        logger[err.statusCode >= 500 ? 'error' : 'warn']('request', {
          requestId,
          method: req.method,
          path: req.nextUrl.pathname,
          status: err.statusCode,
          durationMs: ms,
          code: err.code,
        });
        const res = NextResponse.json(
          { error: err.message, ...(err.code ? { code: err.code } : {}) },
          { status: err.statusCode },
        );
        res.headers.set('x-request-id', requestId);
        return res;
      }
      reportError('request.unhandled', err);
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

    const res = new NextResponse(response.body, response);
    res.headers.set('x-request-id', requestId);
    return res;
  };
}
