export function generateNumericVoucherNo(): string {
    // Use last 10 digits of timestamp + 2 random digits
    const timestampPart = Date.now().toString().slice(-10);
    const randomPart = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return timestampPart + randomPart;
}
