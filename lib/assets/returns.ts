export function isReturnOverdue(
  expectedReturnDate: string,
  actualReturnDate: string,
  today: string,
): boolean {
  if (actualReturnDate) {
    return false;
  }

  return expectedReturnDate < today;
}
