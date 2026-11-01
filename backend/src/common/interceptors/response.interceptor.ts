import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

function serializeSafe(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (typeof input === 'bigint') return input.toString();
  if (input instanceof Date) return input.toISOString();
  if (
    typeof input === 'object' &&
    input !== null &&
    'd' in input &&
    'e' in input &&
    's' in input &&
    typeof (input as { toFixed?: unknown }).toFixed === 'function'
  ) {
    return (input as { toString: () => string }).toString();
  }
  if (Array.isArray(input)) {
    return input.map(serializeSafe);
  }
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (k === 'passwordHash' || k === 'twoFactorSecretEnc' || k === 'refreshTokenHash') {
        continue;
      }
      out[k] = serializeSafe(v);
    }
    return out;
  }
  return input;
}

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const rawId = (req as unknown as { id?: unknown })?.id;

    return next.handle().pipe(
      map((payload) => {
        if (
          payload &&
          typeof payload === 'object' &&
          '__rawStream' in (payload as Record<string, unknown>)
        ) {
          return undefined;
        }
        if (
          payload &&
          typeof payload === 'object' &&
          'success' in (payload as Record<string, unknown>)
        ) {
          return serializeSafe(payload);
        }
        return {
          success: true,
          data: serializeSafe(payload),
          meta: {
            requestId: rawId ? String(rawId) : undefined,
          },
        };
      }),
    );
  }
}
