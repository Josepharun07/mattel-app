import { roundMoney } from "@/lib/money";
import type { DraftLine, LedgerItem } from "@/lib/invoicing/types";

export function linesToLedgerItems(lines: DraftLine[]): LedgerItem[] {
  return lines
    .filter((line) => line.selected)
    .map((line) => ({
      id: line.id,
      materialName: line.materialName,
      quantity: line.quantity,
      unitType: line.unitType,
      centralRate: line.centralRate,
      overrideRate: line.overrideRate,
      totalPrice: roundMoney(line.quantity * line.overrideRate),
    }));
}
