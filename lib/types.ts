// Full 70-column TourProduct interface
export interface TourProduct {
  // Internal tracking (not a sheet column)
  rowIndex: number; // 1-based sheet row number (row 1 = header, row 2 = first data row)

  // === LOCATION & IDENTITY (Cols 0-4) ===
  country: string;
  city: string;
  department: string | null;
  region: string | null;
  productType: string;

  // === PRODUCT INFO (Cols 5-10) ===
  link: string | null;
  duration: string | null;
  productStatus: string | null;
  productName: string | null;
  written: boolean;
  notes: string | null;

  // === CONTENT STATUS (Cols 11-13) ===
  isOk: string | null;
  ssOk: boolean;
  imageLinks: string | null;

  // === TOUR CONFIGURATION (Cols 14-24) ===
  maxPax: string | null;
  guide: boolean;
  driver: boolean;
  driverGuide: boolean;
  guideWhere: string | null;
  componentsOfTour: string | null;
  attractionIncluded: boolean;
  attractionOptional: boolean;
  transportation: string | null;
  attractionsIncluded: string | null;
  attractionLink: string | null;

  // === PROVIDER / BUYING (Cols 25-33) ===
  providerPrice: string | null;
  providerUrl: string | null;
  centralProviderLinks: string | null;
  centralTransportLinks: string | null;
  transportationPrice: string | null;
  vatYN: string | null;
  vatPercent: number | null;
  totalBuyingPrice: string | null;
  cancellation: string | null;

  // === ASSIGNMENT (Col 34) ===
  pic: string | null;

  // === SELLING PRICES (Cols 35-42) ===
  b2bPriceInstant: string | null;
  b2bPriceOnRequest: string | null;
  b2cPriceInstant: string | null;
  b2cPriceOnRequest: string | null;
  extraHrB2BInstant: string | null;
  extraHrB2BRequest: string | null;
  extraHrB2CInstant: string | null;
  extraHrB2CRequest: string | null;

  // === VALIDITY & CANCELLATION POLICY (Cols 43-48) ===
  tourValidityGeneral: string | null;
  tourValiditySpecific: string | null;
  cancelInstant: string | null;
  cutoffInstant: string | null;
  cancelOnRequest: string | null;
  cutoffOnRequest: string | null;

  // === NOTES & OTA MASTER (Cols 49-50) ===
  notesGeneral: string | null;
  otaMasterSheet: string | null;

  // === OTA DISTRIBUTION CHANNELS (Cols 51-63) ===
  otaTravmonde: string | null;
  otaBookableTours: string | null;
  otaViator: string | null;
  otaGyg: string | null;
  otaHotelbeds: string | null;
  otaProjectExpedition: string | null;
  otaAirbnb: string | null;
  otaBokun: string | null;
  otaTrekksoft: string | null;
  otaTuiMusement: string | null;
  otaKlook: string | null;
  otaToristy: string | null;
  otaTourHQ: string | null;

  // === UPLOAD WORKFLOW (Cols 64-69) ===
  qualityRemarks: string | null;
  readyForUpload: boolean;
  uploadedPic: string | null;
  dateOfDispatch: string | null;
  dateUploaded: string | null;
  productLink: string | null;
}

export type ProductStatus =
  | 'In Progress'
  | 'Completed'
  | 'In Progress - High priority'
  | 'On hold'
  | 'Ignored';

export type PIC = 'CM' | 'LG' | 'DS' | 'CC' | 'DV' | 'SB' | 'IS' | 'Hanieh' | 'RB';

export interface FiltersResponse {
  countries: string[];
  cities: string[];
  departments: string[];
  regions: string[];
  productTypes: string[];
  durations: string[];
  statuses: string[];
  isOkValues: string[];
  maxPaxValues: string[];
  guideWhereValues: string[];
  transportationValues: string[];
  vatValues: string[];
  vatPercentValues: string[];
  cancellationValues: string[];
  pics: string[];
  uploadedPics: string[];
  otaMasterSheetValues: string[];
  otaTravmondeValues: string[];
  otaBookableToursValues: string[];
  otaViatorValues: string[];
  otaGygValues: string[];
  otaHotelbedsValues: string[];
  otaProjectExpeditionValues: string[];
  otaAirbnbValues: string[];
  otaBokunValues: string[];
  otaTrekksoftValues: string[];
  otaTuiMusementValues: string[];
  otaKlookValues: string[];
  otaToristyValues: string[];
  otaTourHQValues: string[];
}

export interface StatsResponse {
  total: number;
  readyForUpload: number;
  uploaded: number;
  inProgress: number;
  completed: number;
  highPriority: number;
  onHold: number;
  ignored: number;
}

export interface ApiError {
  error: string;
}

export const ASSEMBLY_STAGES = [
  'In Review',
  '2nd Review',
  'Buying Price',
  'Selling Price',
  'Ready for Upload',
  'Uploaded',
] as const;

export type AssemblyStage = (typeof ASSEMBLY_STAGES)[number];

export interface AssemblyBatch {
  _id: string;
  name: string;
  stage: AssemblyStage;
  productRowIndexes: number[];
  createdAt: string;
}

export type AssemblyStageData = {
  batches: AssemblyBatch[];
};

export type AssemblyResponse = Record<AssemblyStage, AssemblyStageData>;

export interface ProductAssemblyInfo {
  stage: AssemblyStage;
  batchId: string;
  batchName: string;
}

export interface AppNotification {
  _id: string;
  recipientEmail: string;
  batchId: string;
  batchName: string;
  productCount: number;
  stage: AssemblyStage;
  createdAt: string; // ISO string
  read: boolean;
}

export interface NotificationSubscription {
  email: string;
  stages: AssemblyStage[];
}
