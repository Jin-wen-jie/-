export type Delivery = "ACCOUNT" | "TOPUP" | "API_QUOTA" | "INVITE_SEAT";
export type AccessMode = "EXCLUSIVE" | "SHARED";
export type Ownership = "TRANSFERRED" | "RETAINED" | "NOT_APPLICABLE";
export type FieldState = "NOT_APPLICABLE" | "UNDISCLOSED" | "PARSE_FAILED";

export interface ComparisonKeyInput {
  provider: string;
  productLine: string;
  plan: string;
  delivery: Delivery;
  accessMode: AccessMode;
  ownership: Ownership;
  region: string;
  qualification: string;
  validity: string;
  commitment: string;
  quota: string;
}

export interface PriceInput {
  id: string;
  packagePriceCny: string;
  bundleQty: number;
  minBundleCount: number;
}

export interface PriceRow {
  id: string;
  packagePriceCny: string;
  bundleQty: number;
  minBundleCount: number;
  requiredBundles: number;
  actualQty: number;
  totalCny: string;
  unitCny: string;
}

export type SupplyKind = "EXPLICIT" | "TEXT_IN_STOCK" | "BUTTON_AVAILABLE";

export interface SupplyExplicitInput {
  kind: "EXPLICIT";
  quantity: number;
  referenceStock: number;
  ageHours: number;
  consistentChecks: number;
  successfulChecks30d: number;
  totalChecks30d: number;
  siblingListings: number;
}

export interface SupplyInferredInput {
  kind: "TEXT_IN_STOCK" | "BUTTON_AVAILABLE";
  ageHours: number;
  consistentChecks: number;
  successfulChecks30d: number;
  totalChecks30d: number;
  siblingListings: number;
}

export type SupplyInput = SupplyExplicitInput | SupplyInferredInput;

export interface SupplyResult {
  score: number;
  confidence: number;
}
