import { formatUnits, parseUnits } from 'viem';

const TX_HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function isValidBscTxHash(txHash: string): boolean {
  if (!txHash || /^https?:\/\//i.test(txHash.trim())) {
    return false;
  }
  return TX_HASH_PATTERN.test(txHash.trim());
}

export function isValidBep20Address(address: string): boolean {
  if (!address) return false;
  return ADDRESS_PATTERN.test(address.trim());
}

export function normalizeHex(hex: string): string {
  return hex.trim().toLowerCase();
}

export function addressesEqual(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return normalizeHex(a) === normalizeHex(b);
}

export function parseTokenAmountToUnits(amountDecimal: string, decimals = 18): bigint {
  const clean = amountDecimal.trim();
  return parseUnits(clean, decimals);
}

export function formatUnitsToDecimal(raw: bigint, decimals = 18): string {
  return formatUnits(raw, decimals);
}

