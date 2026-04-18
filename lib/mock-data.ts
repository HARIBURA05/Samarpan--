import type { User, Mandal, Festival, Receipt, PaymentMode } from './types';

// Empty data - will be populated from Firebase
export const users: User[] = [];
export const receipts: Receipt[] = [];
export const festivals: Festival[] = [];

// Default mandal settings - will be fetched from Firebase
export const defaultMandal: Mandal = {
  id: '',
  name: 'Your Mandal Name',
  address: 'Your Address',
  logo_url: undefined,
  settings: {
    currency_symbol: '\u20B9',
    whatsapp_template:
      'Receipt No: {receipt_number}\n{mandal_name}\nDevotee: {devotee_name}\nAmount: \u20B9{amount}\nPurpose: {purpose}\nPayment: {payment_mode}\nDate: {date}\n\nThank you for your donation!',
    notification_preferences: {
      email_on_donation: true,
      daily_summary: true,
    },
  },
};

// Payment modes constant
export const paymentModes: PaymentMode[] = ['cash', 'upi', 'other'];

// Helper functions - these will work with Firebase data when integrated
export function formatIndianCurrency(amount: number): string {
  return '\u20B9' + amount.toLocaleString('en-IN');
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function generateReceiptNumber(prefix: string, counter: number): string {
  return `${prefix}-${String(counter).padStart(5, '0')}`;
}

// Placeholder functions for Firebase integration
// TODO: Replace these with actual Firebase queries

export async function getVolunteerReceipts(volunteerId: string, date?: Date): Promise<Receipt[]> {
  // TODO: Firebase query
  // const q = query(
  //   collection(db, 'receipts'),
  //   where('volunteer_id', '==', volunteerId),
  //   where('created_at', '>=', startOfDay(date)),
  //   where('created_at', '<=', endOfDay(date)),
  //   orderBy('created_at', 'desc')
  // );
  // return getDocs(q).then(snap => snap.docs.map(d => d.data() as Receipt));
  console.log('[v0] getVolunteerReceipts called:', volunteerId, date);
  return [];
}

export async function getTodaysTotal(): Promise<{ amount: number; count: number }> {
  // TODO: Firebase aggregation query
  console.log('[v0] getTodaysTotal called');
  return { amount: 0, count: 0 };
}

export async function getVolunteerStats(volunteerId: string): Promise<{ today: number; total: number; count: number }> {
  // TODO: Firebase aggregation query
  console.log('[v0] getVolunteerStats called:', volunteerId);
  return { today: 0, total: 0, count: 0 };
}

export async function getActiveFestival(mandalId: string): Promise<Festival | null> {
  // TODO: Firebase query
  console.log('[v0] getActiveFestival called:', mandalId);
  return null;
}

export async function getAllReceipts(festivalId: string): Promise<Receipt[]> {
  // TODO: Firebase query
  console.log('[v0] getAllReceipts called:', festivalId);
  return [];
}

export async function createReceipt(receipt: Omit<Receipt, 'id' | 'created_at'>): Promise<Receipt> {
  // TODO: Firebase addDoc
  console.log('[v0] createReceipt called:', receipt);
  const newReceipt: Receipt = {
    ...receipt,
    id: `temp-${Date.now()}`,
    created_at: new Date(),
  };
  return newReceipt;
}

export async function voidReceipt(receiptId: string): Promise<void> {
  // TODO: Firebase updateDoc
  console.log('[v0] voidReceipt called:', receiptId);
}
