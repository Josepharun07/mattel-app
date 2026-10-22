import type { AccessRole } from "@/lib/settings/appearance";

export type JobRole = {
  id: string;
  name: string;
  builtIn: boolean;
};

export type StaffPhone = {
  id: string;
  label: string;
  number: string;
};

export type StaffRecord = {
  id: string;
  fullName: string;
  address: string;
  phones: StaffPhone[];
  email: string;
  panNumber: string;
  aadhaarNumber: string;
  upiId: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  dailyBaseRate: number;
  hourlyRate: number;
  joiningDate: string;
  bloodGroup: string;
  notes: string;
  roleIds: string[];
  deletedAt: string | null;
};

export type StaffDirectory = {
  roles: JobRole[];
  staff: StaffRecord[];
};

export type StaffDraft = Omit<StaffRecord, "id" | "deletedAt" | "roleIds"> & { roleIds?: string[] };

const builtInNames = [
  "Manager",
  "Supervisor",
  "Mason",
  "Helper",
  "Operator",
  "Driver",
  "Heavy vehicle driver",
  "Owner",
  "Admin",
] as const;

export function canAssignStaffRoles(role: AccessRole) {
  return role === "OWNER" || role === "SUPER_ADMIN";
}

export function seedRoles(): JobRole[] {
  return builtInNames.map((name) => ({
    id: `role-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    builtIn: true,
  }));
}

export function seedDirectory(): StaffDirectory {
  const roles = seedRoles();
  const supervisor = roles.find((role) => role.name === "Supervisor");
  const driver = roles.find((role) => role.name === "Heavy vehicle driver");
  return {
    roles,
    staff: [
      {
        id: "staff-rajesh",
        fullName: "Rajesh Kumar",
        address: "Kaloor, Kochi",
        phones: [{ id: "phone-rajesh", label: "Mobile", number: "9847001122" }],
        email: "",
        panNumber: "",
        aadhaarNumber: "",
        upiId: "",
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        emergencyName: "",
        emergencyPhone: "",
        emergencyRelation: "",
        dailyBaseRate: 900,
        hourlyRate: 120,
        joiningDate: "2024-06-01",
        bloodGroup: "",
        notes: "",
        roleIds: supervisor ? [supervisor.id] : [],
        deletedAt: null,
      },
      {
        id: "staff-suresh",
        fullName: "Suresh P.",
        address: "",
        phones: [],
        email: "",
        panNumber: "",
        aadhaarNumber: "",
        upiId: "",
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        emergencyName: "",
        emergencyPhone: "",
        emergencyRelation: "",
        dailyBaseRate: 1100,
        hourlyRate: 150,
        joiningDate: "2025-01-15",
        bloodGroup: "",
        notes: "",
        roleIds: driver ? [driver.id] : [],
        deletedAt: null,
      },
    ],
  };
}

function clean(value: string) {
  return value.trim();
}

function money(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round(value * 100) / 100;
}

export function roleNames(directory: StaffDirectory, roleIds: string[]) {
  return roleIds
    .map((id) => directory.roles.find((role) => role.id === id)?.name)
    .filter((name): name is string => Boolean(name));
}

export function validateStaffDraft(draft: StaffDraft, roles: JobRole[]) {
  const fullName = clean(draft.fullName);
  if (!fullName) {
    return { ok: false as const, message: "Enter the staff member's name." };
  }
  const dailyBaseRate = money(draft.dailyBaseRate);
  const hourlyRate = money(draft.hourlyRate);
  if (dailyBaseRate === null || hourlyRate === null) {
    return { ok: false as const, message: "Base pay and the hourly rate must be zero or more." };
  }
  const email = clean(draft.email);
  if (email && !email.includes("@")) {
    return { ok: false as const, message: "Enter a valid email address, or leave it blank." };
  }
  const panNumber = clean(draft.panNumber).toUpperCase();
  if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) {
    return { ok: false as const, message: "PAN should look like ABCDE1234F, or stay blank." };
  }
  const aadhaarNumber = clean(draft.aadhaarNumber).replace(/\s/g, "");
  if (aadhaarNumber && !/^[0-9]{12}$/.test(aadhaarNumber)) {
    return { ok: false as const, message: "Aadhaar should be 12 digits, or stay blank." };
  }
  const ifscCode = clean(draft.ifscCode).toUpperCase();
  if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
    return { ok: false as const, message: "IFSC should look like SBIN0001234, or stay blank." };
  }
  const known = new Set(roles.map((role) => role.id));
  const roleIds = [...new Set(draft.roleIds ?? [])];
  if (roleIds.some((id) => !known.has(id))) {
    return { ok: false as const, message: "Choose roles from the list." };
  }
  const phones = draft.phones
    .map((phone) => ({ ...phone, label: clean(phone.label), number: clean(phone.number) }))
    .filter((phone) => phone.number);
  return {
    ok: true as const,
    value: {
      fullName,
      address: clean(draft.address),
      phones,
      email,
      panNumber,
      aadhaarNumber,
      upiId: clean(draft.upiId),
      bankName: clean(draft.bankName),
      accountNumber: clean(draft.accountNumber),
      ifscCode,
      emergencyName: clean(draft.emergencyName),
      emergencyPhone: clean(draft.emergencyPhone),
      emergencyRelation: clean(draft.emergencyRelation),
      dailyBaseRate,
      hourlyRate,
      joiningDate: clean(draft.joiningDate),
      bloodGroup: clean(draft.bloodGroup),
      notes: clean(draft.notes),
      roleIds,
    },
  };
}

export function saveStaffMember(directory: StaffDirectory, draft: StaffDraft, id?: string) {
  const checked = validateStaffDraft(draft, directory.roles);
  if (!checked.ok) {
    return checked;
  }
  const existing = id ? directory.staff.find((person) => person.id === id && !person.deletedAt) : undefined;
  const record: StaffRecord = {
    id: existing?.id ?? id ?? `staff-${crypto.randomUUID()}`,
    ...checked.value,
    roleIds: existing?.roleIds ?? [],
    deletedAt: null,
  };
  const staff = existing
    ? directory.staff.map((person) => (person.id === existing.id ? record : person))
    : [record, ...directory.staff];
  return { ok: true as const, directory: { ...directory, staff }, record };
}

export function assignStaffRoles(
  directory: StaffDirectory,
  staffId: string,
  roleIds: string[],
  actor: AccessRole,
) {
  if (!canAssignStaffRoles(actor)) {
    return { ok: false as const, message: "Only an owner or a super admin can assign roles." };
  }
  const person = directory.staff.find((item) => item.id === staffId && !item.deletedAt);
  if (!person) {
    return { ok: false as const, message: "Choose a staff member." };
  }
  const known = new Set(directory.roles.map((role) => role.id));
  const nextIds = [...new Set(roleIds)];
  if (nextIds.some((id) => !known.has(id))) {
    return { ok: false as const, message: "Choose roles from the list." };
  }
  const staff = directory.staff.map((item) => (item.id === person.id ? { ...item, roleIds: nextIds } : item));
  return { ok: true as const, directory: { ...directory, staff } };
}

export function createJobRole(directory: StaffDirectory, name: string, actor: AccessRole) {
  if (!canAssignStaffRoles(actor)) {
    return { ok: false as const, message: "Only an owner or a super admin can create roles." };
  }
  const label = clean(name);
  if (!label) {
    return { ok: false as const, message: "Enter a role name." };
  }
  if (directory.roles.some((role) => role.name.toLowerCase() === label.toLowerCase())) {
    return { ok: false as const, message: "That role already exists." };
  }
  const role: JobRole = { id: `role-${crypto.randomUUID()}`, name: label, builtIn: false };
  return { ok: true as const, directory: { ...directory, roles: [...directory.roles, role] }, role };
}

export function removeJobRole(directory: StaffDirectory, roleId: string, actor: AccessRole) {
  if (!canAssignStaffRoles(actor)) {
    return { ok: false as const, message: "Only an owner or a super admin can remove roles." };
  }
  const role = directory.roles.find((item) => item.id === roleId);
  if (!role) {
    return { ok: false as const, message: "Choose a role." };
  }
  if (role.builtIn) {
    return { ok: false as const, message: "Built-in roles stay on the list." };
  }
  return {
    ok: true as const,
    directory: {
      roles: directory.roles.filter((item) => item.id !== role.id),
      staff: directory.staff.map((person) => ({
        ...person,
        roleIds: person.roleIds.filter((id) => id !== role.id),
      })),
    },
  };
}
