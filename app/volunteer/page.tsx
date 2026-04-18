'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import type { Receipt, PaymentMode, Festival } from '@/lib/types';
import { formatIndianCurrency } from '@/lib/mock-data';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  runTransaction,
  serverTimestamp,
  getDoc,
  setDoc,
  increment,
  Timestamp
} from 'firebase/firestore';
import { ReceiptModal } from '@/components/receipt-modal';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Loader2, 
  LogOut, 
  HandHeart, 
  Banknote, 
  Smartphone, 
  MoreHorizontal,
  Receipt as ReceiptIcon,
  Clock,
  Sparkles
} from 'lucide-react';

// Demo festival for guest mode - will be replaced with Firebase data
const demoFestival: Festival = {
  id: 'demo-festival',
  mandal_id: 'demo-mandal',
  name: 'Ganesh Chaturthi 2024',
  start_date: new Date('2024-09-07'),
  end_date: new Date('2024-09-17'),
  receipt_prefix: 'GAN2024',
  purposes: [
    'Ganpati Decoration',
    'Annadanam',
    'Cultural Program',
    'General Donation',
    'Other',
  ],
  status: 'active',
  created_at: new Date(),
  total_collected: 0,
  total_receipts: 0,
};

export default function VolunteerPage() {
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  
  const [devoteeName, setDevoteeName] = useState('');
  const [contact, setContact] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [todayReceipts, setTodayReceipts] = useState<Receipt[]>([]);
  const [receiptCounter, setReceiptCounter] = useState(1);
  
  // TODO: Replace with Firebase query for active festival
  const activeFestival = demoFestival;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    } else if (!loading && user?.role !== 'volunteer') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Real-time listener for today's receipts from Firestore
  useEffect(() => {
    if (!user || user.uid.startsWith('guest-')) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'receipts'),
      where('volunteer_id', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Receipt[] = [];
      snapshot.docs.forEach((d) => {
        const data = d.data();
        const date = data.created_at?.toDate ? data.created_at.toDate() : new Date();
        if (date >= todayStart) {
          fetched.push({
            id: d.id,
            ...data,
            created_at: date,
          } as Receipt);
        }
      });
      // Sort by descending created_at locally
      fetched.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      setTodayReceipts(fetched);
    }, (error) => {
      console.error("Error fetching today's receipts:", error);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!devoteeName.trim()) {
      toast.error('Please enter devotee name');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid donation amount');
      return;
    }
    
    if (!purpose) {
      toast.error('Please select a purpose');
      return;
    }

    if (contact && contact.length !== 10) {
      toast.error('Please enter a valid 10-digit contact number');
      return;
    }

    setIsSubmitting(true);

    try {
      // Use a Firestore transaction to atomically get counter and save receipt
      const counterRef = doc(db, 'counters', activeFestival.id);
      const newReceiptRef = doc(collection(db, 'receipts'));

      const newReceipt = await runTransaction(db, async (transaction) => {
        const counterSnap = await transaction.get(counterRef);
        const lastNumber = counterSnap.exists() ? (counterSnap.data().last_receipt_number as number) : 0;
        const nextNumber = lastNumber + 1;
        const receiptNumber = `${activeFestival.receipt_prefix}-${String(nextNumber).padStart(4, '0')}`;

        const receiptData = {
          festival_id: activeFestival.id,
          mandal_id: user.mandal_id,
          volunteer_id: user.uid,
          volunteer_name: user.name,
          devotee_name: devoteeName.trim(),
          contact: contact || '',
          amount: parseFloat(amount),
          purpose,
          payment_mode: paymentMode,
          remarks: remarks.trim() || '',
          receipt_number: receiptNumber,
          status: 'active' as const,
          created_at: serverTimestamp(),
        };

        transaction.set(newReceiptRef, receiptData);
        transaction.set(counterRef, { last_receipt_number: nextNumber, festival_id: activeFestival.id }, { merge: true });

        return {
          id: newReceiptRef.id,
          ...receiptData,
          created_at: new Date(),
        } as Receipt;
      });

      setSelectedReceipt(newReceipt);
      setShowReceiptModal(true);
      // (todayReceipts updates via onSnapshot listener automatically)

      // Reset form
      setDevoteeName('');
      setContact('');
      setAmount('');
      setPurpose('');
      setPaymentMode('cash');
      setRemarks('');
      
      toast.success('Receipt generated successfully!');
    } catch (error) {
      toast.error('Failed to generate receipt');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const openReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
  };

  const getPaymentModeBadgeClass = (mode: string) => {
    switch (mode) {
      case 'cash':
        return 'bg-warning text-warning-foreground';
      case 'upi':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const totalToday = todayReceipts.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Top Bar with glassmorphism */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 glass-primary shadow-lg"
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-md">
                <HandHeart className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-semibold leading-tight text-foreground">
                  Samarpan
                </h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {activeFestival.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">{user.name}</span>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-foreground hover:bg-primary/10"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="px-4 py-6 pb-24 max-w-lg mx-auto">
        {/* Stats Card with glassmorphism */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Today&apos;s Collection</p>
              <p className="text-2xl font-bold text-primary">{formatIndianCurrency(totalToday)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Receipts</p>
              <p className="text-2xl font-bold text-foreground">{todayReceipts.length}</p>
            </div>
          </div>
        </motion.div>

        {/* Receipt Form with glassmorphism */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card border-0 rounded-2xl shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-center flex items-center justify-center gap-2">
                <ReceiptIcon className="h-5 w-5 text-primary" />
                New Donation Receipt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Devotee Name */}
                <div className="space-y-2">
                  <Label htmlFor="devoteeName" className="text-sm font-medium">
                    Devotee Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="devoteeName"
                    placeholder="Enter devotee name"
                    value={devoteeName}
                    onChange={(e) => setDevoteeName(e.target.value)}
                    className="h-12 text-base rounded-xl bg-muted/30 border-border/50"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <Label htmlFor="contact" className="text-sm font-medium">
                    Contact Number
                  </Label>
                  <Input
                    id="contact"
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit mobile number"
                    value={contact}
                    onChange={(e) => setContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="h-12 text-base rounded-xl bg-muted/30 border-border/50"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Donation Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium">
                    Donation Amount ({'\u20B9'}) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    inputMode="numeric"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-14 text-xl font-semibold rounded-xl bg-muted/30 border-border/50"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Purpose */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Purpose <span className="text-destructive">*</span>
                  </Label>
                  <Select value={purpose} onValueChange={setPurpose} disabled={isSubmitting}>
                    <SelectTrigger className="h-12 text-base rounded-xl bg-muted/30 border-border/50">
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeFestival.purposes.map((p) => (
                        <SelectItem key={p} value={p} className="text-base py-3">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Mode */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Payment Mode</Label>
                  <ToggleGroup 
                    type="single" 
                    value={paymentMode} 
                    onValueChange={(value) => value && setPaymentMode(value as PaymentMode)}
                    className="grid grid-cols-3 gap-2"
                    disabled={isSubmitting}
                  >
                    <ToggleGroupItem 
                      value="cash" 
                      className="h-14 flex flex-col gap-1 rounded-xl border-border/50 data-[state=on]:bg-warning data-[state=on]:text-warning-foreground data-[state=on]:border-warning"
                    >
                      <Banknote className="h-5 w-5" />
                      <span className="text-xs">Cash</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="upi" 
                      className="h-14 flex flex-col gap-1 rounded-xl border-border/50 data-[state=on]:bg-success data-[state=on]:text-success-foreground data-[state=on]:border-success"
                    >
                      <Smartphone className="h-5 w-5" />
                      <span className="text-xs">UPI</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="other" 
                      className="h-14 flex flex-col gap-1 rounded-xl border-border/50 data-[state=on]:bg-muted-foreground data-[state=on]:text-background data-[state=on]:border-muted-foreground"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                      <span className="text-xs">Other</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Remarks */}
                <div className="space-y-2">
                  <Label htmlFor="remarks" className="text-sm font-medium">
                    Remarks <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Textarea
                    id="remarks"
                    placeholder="Any additional notes"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="min-h-[60px] text-base resize-none rounded-xl bg-muted/30 border-border/50"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Submit Button */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-orange-600 hover:opacity-90 shadow-lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ReceiptIcon className="mr-2 h-5 w-5" />
                        Generate Receipt
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Today's Receipts */}
        {todayReceipts.length > 0 && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              My Receipts Today
            </h2>
            <div className="space-y-2">
              {todayReceipts.map((receipt, index) => (
                <motion.button
                  key={receipt.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 * index }}
                  onClick={() => openReceipt(receipt)}
                  className="w-full p-3 glass-card rounded-xl hover:shadow-lg transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {receipt.devotee_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {receipt.receipt_number}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          {formatIndianCurrency(receipt.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(receipt.created_at, 'hh:mm a')}
                        </p>
                      </div>
                      <Badge className={`${getPaymentModeBadgeClass(receipt.payment_mode)} text-xs`}>
                        {receipt.payment_mode.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {todayReceipts.length === 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center py-8"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <ReceiptIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No receipts generated today</p>
            <p className="text-sm text-muted-foreground">Start collecting donations above!</p>
          </motion.div>
        )}
      </main>

      {/* Receipt Modal */}
      <ReceiptModal
        receipt={selectedReceipt}
        open={showReceiptModal}
        onOpenChange={setShowReceiptModal}
      />
    </div>
  );
}
