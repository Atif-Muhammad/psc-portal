export function generateNumericVoucherNo(): string {
  // Use last 10 digits of timestamp + 2 random digits
  const timestampPart = Date.now().toString().slice(-10);
  const randomPart = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, '0');
  return timestampPart + randomPart;
}

export function generateConsumerNumber(voucherId: number): string {
  const prefix = process.env.KUICKPAY_PREFIX || '25430';
  const voucherIdStr = voucherId.toString();
  const totalLength = 18;
  const paddingLength = totalLength - prefix.length - voucherIdStr.length;

  if (paddingLength < 0) {
    throw new Error(
      `Consumer number would exceed 18 digits. Prefix: ${prefix.length}, VoucherId: ${voucherIdStr.length}`,
    );
  }

  const padding = '0'.repeat(paddingLength);
  return `${prefix}${padding}${voucherIdStr}`;
}
