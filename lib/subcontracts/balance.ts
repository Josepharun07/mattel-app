import { remainingContractBalance, totalAdvancesDrawn } from "@/lib/engines/subcontract-engine";

export function calculateContractBalance(
  totalContractAmount: number,
  draws: { amountPaid: number }[],
): { drawn: number; remaining: number } {
  const drawn = totalAdvancesDrawn(draws);
  return {
    drawn,
    remaining: remainingContractBalance(totalContractAmount, drawn),
  };
}
