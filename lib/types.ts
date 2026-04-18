// User types
export type UserRole = 'admin' | 'volunteer';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  mandal_id: string;
  created_at: Date;
  status: 'active' | 'inactive';
}

// Mandal types
export interface Mandal {
  id: string;
  name: string;
  address: string;
  logo_url?: string;
  settings: MandalSettings;
}

export interface MandalSettings {
  currency_symbol: string;
  whatsapp_template: string;
  notification_preferences: {
    email_on_donation: boolean;
    daily_summary: boolean;
  };
}

// Festival types
export type FestivalStatus = 'upcoming' | 'active' | 'ended';

export interface Festival {
  id: string;
  mandal_id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  receipt_prefix: string;
  purposes: string[];
  status: FestivalStatus;
  created_at: Date;
  total_collected?: number;
  total_receipts?: number;
}

// Receipt types
export type PaymentMode = 'cash' | 'upi' | 'other';
export type ReceiptStatus = 'active' | 'void';

export interface Receipt {
  id: string;
  festival_id: string;
  mandal_id: string;
  volunteer_id: string;
  volunteer_name: string;
  devotee_name: string;
  contact: string;
  amount: number;
  purpose: string;
  payment_mode: PaymentMode;
  remarks?: string;
  receipt_number: string;
  status: ReceiptStatus;
  created_at: Date;
}

// Counter for receipt numbering
export interface Counter {
  festival_id: string;
  last_receipt_number: number;
}

// Auth context type
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
