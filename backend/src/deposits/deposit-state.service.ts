import { HttpStatus, Injectable } from '@nestjs/common';
import { DepositStatus as PrismaDepositStatus } from '@navrix/database';
import {
  canTransitionDepositStatus,
  DepositStatus as DomainDepositStatus,
} from '@navrix/types';
import { AppException } from '../common/errors/app.exception';

@Injectable()
export class DepositStateService {
  assertTransition(from: PrismaDepositStatus, to: PrismaDepositStatus): void {
    const allowed = canTransitionDepositStatus(
      from as unknown as DomainDepositStatus,
      to as unknown as DomainDepositStatus,
    );

    if (!allowed) {
      throw new AppException(
        'INVALID_DEPOSIT_STATUS_TRANSITION',
        `Illegal deposit status transition from ${from} to ${to}.`,
        HttpStatus.CONFLICT,
      );
    }
  }
}

