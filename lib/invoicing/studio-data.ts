export const UNIT_TYPES = [
  "Loads",
  "Bags",
  "CFT",
  "Tons",
  "Hours",
  "Days",
  "Trips",
] as const;

export type StudioProject = {
  id: string;
  clientId: string;
  title: string;
  clientName: string;
  address: string;
  invoiceType: "CONSTRUCTION" | "RESORT";
};

export type StudioClient = {
  id: string;
  name: string;
  address: string;
  phone: string;
};

export const studioClients: StudioClient[] = [
  {
    id: "client-abc",
    name: "ABC Constructions",
    address: "Kochi, Kerala",
    phone: "",
  },
  {
    id: "client-coastal",
    name: "Coastal Stays",
    address: "Alappuzha, Kerala",
    phone: "",
  },
];

export const studioProjects: StudioProject[] = [
  {
    id: "project-abc-site",
    clientId: "client-abc",
    title: "Compound Wall & Yard Fill",
    clientName: "ABC Constructions",
    address: "Kochi, Kerala",
    invoiceType: "CONSTRUCTION",
  },
  {
    id: "project-resort-lease",
    clientId: "client-coastal",
    title: "Guest Villa Monthly Lease",
    clientName: "Coastal Stays",
    address: "Alappuzha, Kerala",
    invoiceType: "RESORT",
  },
];

export type InventoryItem = {
  itemName: string;
  unitType: string;
  standardUnitRate: number;
};

export const centralRateBook: InventoryItem[] = [
  { itemName: "Quarry Aggregates", unitType: "CFT", standardUnitRate: 120 },
  { itemName: "M-Sand", unitType: "Loads", standardUnitRate: 4500 },
  { itemName: "OPC 53 Cement", unitType: "Bags", standardUnitRate: 420 },
  { itemName: "River Sand", unitType: "Tons", standardUnitRate: 2800 },
];

export const companyProfile = {
  name: "Mattel Infrastructures",
  tagline: "Building Tomorrow's Foundation",
};

export type EditorLine = {
  id: string;
  selected: boolean;
  materialName: string;
  quantity: string;
  unitType: string;
  centralRate: number;
  overrideRate: string;
  transitPassNumber: string;
  ewayBillNumber: string;
  vehicleNumber: string;
};

export function createSeedLines(): EditorLine[] {
  return [
    {
      id: "line-aggregates",
      selected: true,
      materialName: "Quarry Aggregates",
      quantity: "20",
      unitType: "CFT",
      centralRate: 120,
      overrideRate: "120",
      transitPassNumber: "",
      ewayBillNumber: "",
      vehicleNumber: "",
    },
    {
      id: "line-msand",
      selected: true,
      materialName: "M-Sand",
      quantity: "10",
      unitType: "Loads",
      centralRate: 4500,
      overrideRate: "4200",
      transitPassNumber: "",
      ewayBillNumber: "",
      vehicleNumber: "",
    },
  ];
}

export function createResortLines(): EditorLine[] {
  return [
    {
      id: "line-lease",
      selected: true,
      materialName: "Guest villa monthly lease",
      quantity: "1",
      unitType: "Days",
      centralRate: 45000,
      overrideRate: "45000",
      transitPassNumber: "",
      ewayBillNumber: "",
      vehicleNumber: "",
    },
  ];
}

export function blankLine(): EditorLine {
  return {
    id: crypto.randomUUID(),
    selected: true,
    materialName: "",
    quantity: "1",
    unitType: "CFT",
    centralRate: 0,
    overrideRate: "0",
    transitPassNumber: "",
    ewayBillNumber: "",
    vehicleNumber: "",
  };
}
