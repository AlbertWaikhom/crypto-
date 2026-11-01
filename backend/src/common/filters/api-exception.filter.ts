import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@navrix/database';
import { AppException } from '../errors/app.exception';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected server error occurred. Please try again.';

    if (exception instanceof AppException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        code = typeof b.code === 'string' ? b.code : this.mapStatusToCode(status);
        if (Array.isArray(b.message)) {
          message = b.message.join(' ');
        } else if (typeof b.message === 'string') {
          message = b.message;
        }
      } else {
        code = this.mapStatusToCode(status);
      }
      if (code === 'INTERNAL_SERVER_ERROR') {
        code = this.mapStatusToCode(status);
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        const target = JSON.stringify(exception.meta?.target ?? '');
        if (target.includes('transaction_hash')) {
          code = 'DUPLICATE_TRANSACTION_HASH';
          message =
            'This blockchain transaction hash has already been submitted and cannot be reused.';
        } else if (target.includes('period_key')) {
          code = 'DUPLICATE_INTEREST_PERIOD';
          message = 'Interest has already been credited for this investment period.';
        } else if (target.includes('email')) {
          code = 'EMAIL_ALREADY_REGISTERED';
          message = 'An account with this email address already exists.';
        } else {
          code = 'DUPLICATE_RECORD';
          message = 'A duplicate record conflict occurred.';
        }
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        code = 'RESOURCE_NOT_FOUND';
        message = 'The requested record could not be found.';
      } else {
        this.logger.error(
          `Prisma error [${exception.code}] on ${req.method} ${req.originalUrl}: ${exception.message}`,
        );
      }
    } else {
      this.logger.error(
        `Unhandled error on ${req.method} ${req.originalUrl}: ${
          exception instanceof Error ? exception.message : 'Unknown error'
        }`,
      );
    }

    res.status(status).json({
      success: false,
      error: {
        code,
        message,
      },
    });
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_EXCEEDED';
      default:
        return 'REQUEST_FAILED';
    }
  }
}

