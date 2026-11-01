export class ConfirmationService {
  public calculateConfirmations(
    txBlockNumber: bigint | null,
    currentBlockNumber: bigint,
  ): number {
    if (txBlockNumber === null || currentBlockNumber < txBlockNumber) {
      return 0;
    }
    return Number(currentBlockNumber - txBlockNumber + 1n);
  }

  public hasSufficientConfirmations(
    confirmationCount: number,
    requiredConfirmations: number,
  ): boolean {
    return confirmationCount >= requiredConfirmations;
  }
}

