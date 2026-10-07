export type CheckoutType = "WEEKLY_CYCLED" | "MID_WEEK_CHECKOUT";
export type SettlementStatus = "PENDING" | "PAID";
export type AdvancePaymentMode = "CASH" | "UPI" | "BANK_TRANSFER";

export type StaffMember = {
  id: string;
  fullName: string;
  role: string;
  dailyBaseRate: number;
  hourlyRate: number;
};

export type AttendanceCell = {
  id: string;
  staffId: string;
  workDate: string;
  isPresent: boolean;
  overtimeHours: number;
  settlementId: string | null;
};

export type SettlementRow = {
  id: string;
  staffId: string;
  staffName: string;
  periodStart: string;
  periodEnd: string;
  daysPresent: number;
  totalOvertimeHours: number;
  basePay: number;
  overtimePay: number;
  grossPayable: number;
  grossEarned: number;
  priorBalanceCarryover: number;
  priorAdvanceCarryover: number;
  currentCycleAdvances: number;
  totalDeductions: number;
  netAmountDue: number;
  amountPaid: number;
  closingBalance: number;
  newBalanceCarryover: number;
  newAdvanceCarryover: number;
  checkoutType: CheckoutType;
  status: SettlementStatus;
  notes: string | null;
  basePayslipNumber: string;
  payslipNumber: string;
  version: number;
  createdAt: string;
};

export type AdvanceRow = {
  id: string;
  staffId: string;
  staffName: string;
  requestDate: string;
  amount: number;
  paymentMode: AdvancePaymentMode;
  notes: string | null;
  settlementId: string | null;
  createdAt: string;
};

export type PayrollSummaryRow = {
  staffId: string;
  fullName: string;
  role: string;
  dailyBaseRate: number;
  hourlyRate: number;
  daysPresent: number;
  totalOvertimeHours: number;
  basePay: number;
  overtimePay: number;
  grossPayable: number;
};

export type PayrollDashboard = {
  periodStart: string;
  periodEnd: string;
  staff: StaffMember[];
  attendance: AttendanceCell[];
  earlierUnsettled: AttendanceCell[];
  settlements: SettlementRow[];
  advances: AdvanceRow[];
  offline: boolean;
};

export type PayrollMutationResult = {
  success: boolean;
  offline?: boolean;
  message: string;
  settlement?: SettlementRow;
  settledLogIds?: string[];
  settledAdvanceIds?: string[];
  applied?: { settlement: SettlementRow; settledLogIds: string[] }[];
};

export type AttendanceBatch = {
  workDate: string;
  entries: { staffId: string; isPresent: boolean; overtimeHours: number }[];
};
