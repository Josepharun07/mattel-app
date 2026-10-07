export function isLowStock(currentStock: number, minSafetyThreshold: number): boolean {
  return currentStock <= minSafetyThreshold;
}
