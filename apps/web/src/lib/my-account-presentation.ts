export function maskPassengerDocumentNumber(value: string): string {
  const documentNumber = value.trim();

  if (!documentNumber) {
    return "Chưa cập nhật";
  }

  if (documentNumber.length <= 4) {
    return "••••";
  }

  return `••••••${documentNumber.slice(-4)}`;
}
