export type RiskTolerance = 'Conservative' | 'Moderate' | 'Aggressive';

export type AssetCategory = 'Cash' | 'CD' | 'Bond/SGOV' | 'Stock' | 'ETF' | 'Option' | 'Crypto';

export interface Position {
  symbol: string;
  name: string;
  category: AssetCategory;
  quantity: number;
  costBasis: number;
  currentValue: number;
  apy?: number;
  maturityDate?: string; // ISO String
  strike?: number;
  expiry?: string;
}

export interface Account {
  id: string; // md5(userId + institution + maskedAccount)
  institution: string;
  maskedAccount: string;
  accountType: string;
  positions: Position[];
  updatedAt: string; // ISO string
}

export interface Snapshot {
  id: string;
  timestamp: string; // ISO string
  totalNetWorth: number;
  accounts: Account[];
}

export interface AlertSettings {
  urgentDays: number;
  warningDays: number;
  optionsUrgentDays: number;
  optionsWarningDays: number;
  optionsUrgentMoneynessPct: number;
  optionsWarningMoneynessPct: number;
  notifyCsp: boolean;
  notifyCc: boolean;
  notifyCdTreasury: boolean;
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  urgentDays: 7,
  warningDays: 21,
  optionsUrgentDays: 7,
  optionsWarningDays: 14,
  optionsUrgentMoneynessPct: 2.0,
  optionsWarningMoneynessPct: 5.0,
  notifyCsp: true,
  notifyCc: true,
  notifyCdTreasury: true,
};

export type LlmVendor = 'Gemini' | 'Anthropic' | 'OpenAI' | 'Ollama';

export interface VendorConfig {
  encryptedKey: string;      // AES-256-GCM ciphertext + salt + iv
  maskedKey: string;         // e.g. "sk-ant••••••••366A"
  validated: boolean;
  tier1Model: string;        // e.g. "claude-3-5-sonnet-20241022" or "gemini-2.5-pro"
  tier2Model: string;        // e.g. "claude-3-5-haiku-20241022" or "gemini-2.5-flash"
  availableModels: string[]; // cached list of validated models
  updatedAt: string;         // ISO timestamp
}

export interface MultiVendorVault {
  activeVendor: LlmVendor;
  vendors: Partial<Record<LlmVendor, VendorConfig>>;
}

export interface UserTimezoneSettings {
  homeTimezone: string;           // IANA timezone, e.g. 'America/Los_Angeles'
  travelAutoDetect: boolean;     // Prompt/show travel banner when device TZ != home TZ (default: true)
  preferredMode: 'home' | 'device'; // Default active mode when traveling (default: 'home')
}

export const DEFAULT_TIMEZONE_SETTINGS: UserTimezoneSettings = {
  homeTimezone: 'America/Los_Angeles',
  travelAutoDetect: true,
  preferredMode: 'home',
};

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  phoneNumber?: string;
  theme?: 'light' | 'dark' | 'system';
  riskTolerance: RiskTolerance;
  byokProvider?: string;
  byokKey?: string;
  byokModel?: string;
  llmConfig?: {
    tier1: { vendor: string; model: string };
    tier2: { vendor: string; model: string };
  };
  llmVault?: MultiVendorVault;
  /** 2 = Tier 1 is the lighter model and Tier 2 the most powerful (v5.2). Missing = legacy meaning. */
  llmTierVersion?: number;
  alertSettings?: AlertSettings;
  timezoneSettings?: UserTimezoneSettings;
}


