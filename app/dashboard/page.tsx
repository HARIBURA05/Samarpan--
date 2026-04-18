'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReceiptModal } from '@/components/receipt-modal';
import type { Receipt, PaymentMode, Festival, User } from '@/lib/types';
import { formatIndianCurrency } from '@/lib/mock-data';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, Timestamp, where } from 'firebase/firestore';
import { format, startOfWeek, startOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Search,
  TrendingUp,
  Award,
  Calendar as CalendarIcon,
  Eye,
  XCircle,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Receipt as ReceiptIcon,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 20;

// Demo data removed - using Firestore

export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [volunteerFilter, setVolunteerFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [voidConfirmReceipt, setVoidConfirmReceipt] = useState<Receipt | null>(null);

  // Firestore Data
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [activeFestivals, setActiveFestivals] = useState<Festival[]>([]);
  const [mandalName, setMandalName] = useState('');
  const [loading, setLoading] = useState(true);
  const [graphDateRange, setGraphDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date())
  });

  const activeFestival = activeFestivals[0];

  useEffect(() => {
    if (!user?.mandal_id) return;

    // Fetch Mandal name
    const mandalUnsub = onSnapshot(doc(db, 'mandals', user.mandal_id), (doc) => {
      if (doc.exists()) setMandalName(doc.data().name || '');
    });

    // Fetch Active Festival
    const festQuery = query(
      collection(db, 'festivals'),
      where('mandal_id', '==', user.mandal_id),
      where('status', '==', 'active')
    );
    const festUnsub = onSnapshot(festQuery, (snap) => {
      setActiveFestivals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Festival)));
    });

    // Fetch Receipts
    const q = query(
      collection(db, 'receipts'),
      where('mandal_id', '==', user.mandal_id),
      orderBy('created_at', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data: Receipt[] = snap.docs.map((d) => {
        const raw = d.data();
        let created_at = new Date();
        if (raw.created_at) {
          created_at = raw.created_at instanceof Timestamp
            ? raw.created_at.toDate()
            : new Date(raw.created_at);
        }
        return { id: d.id, ...raw, created_at } as Receipt;
      });
      setReceipts(data);
      setLoading(false);
    }, (err) => {
      console.error('Dashboard receipts error:', err);
      setLoading(false);
    });

    return () => {
      mandalUnsub();
      festUnsub();
      unsub();
    };
  }, [user?.mandal_id]);

  // Derive unique volunteers from receipts
  const volunteers: User[] = useMemo(() => {
    const seen = new Map<string, User>();
    receipts.forEach(r => {
      if (!seen.has(r.volunteer_id)) {
        seen.set(r.volunteer_id, {
          uid: r.volunteer_id,
          name: r.volunteer_name,
          email: '',
          role: 'volunteer',
          mandal_id: r.mandal_id,
          created_at: new Date(),
          status: 'active',
        });
      }
    });
    return Array.from(seen.values());
  }, [receipts]);

  const activeReceipts = receipts.filter(r => r.status === 'active');

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today);
    const monthStart = startOfMonth(today);

    const todayReceipts = activeReceipts.filter(r =>
      format(r.created_at, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
    );

    const weekReceipts = activeReceipts.filter(r =>
      isWithinInterval(r.created_at, { start: weekStart, end: today })
    );

    const monthReceipts = activeReceipts.filter(r =>
      isWithinInterval(r.created_at, { start: monthStart, end: today })
    );

    // Purpose breakdown
    const purposeBreakdown: Record<string, number> = {};
    activeReceipts.forEach(r => {
      purposeBreakdown[r.purpose] = (purposeBreakdown[r.purpose] || 0) + r.amount;
    });
    const topPurpose = Object.entries(purposeBreakdown).sort((a, b) => b[1] - a[1])[0];

    return {
      today: { amount: todayReceipts.reduce((sum, r) => sum + r.amount, 0), count: todayReceipts.length },
      week: { amount: weekReceipts.reduce((sum, r) => sum + r.amount, 0), count: weekReceipts.length },
      month: { amount: monthReceipts.reduce((sum, r) => sum + r.amount, 0), count: monthReceipts.length },
      topPurpose: topPurpose ? { name: topPurpose[0], amount: topPurpose[1] } : null,
    };
  }, [activeReceipts]);

  // Volunteer collection data for chart based on selected range
  const volunteerCollectionData = useMemo(() => {
    const data = volunteers.map(v => {
      const volunteerReceipts = activeReceipts.filter(r => {
        const isThisVolunteer = r.volunteer_id === v.uid;
        if (!isThisVolunteer) return false;
        
        if (graphDateRange?.from) {
          const start = startOfDay(graphDateRange.from);
          const end = graphDateRange.to ? endOfDay(graphDateRange.to) : endOfDay(graphDateRange.from);
          return isWithinInterval(r.created_at, { start, end });
        }
        return true;
      });
      return {
        name: v.name.split(' ')[0],
        amount: volunteerReceipts.reduce((sum, r) => sum + r.amount, 0),
      };
    }).filter(v => v.amount > 0);
    
    console.log('Volunteer Collection Chart Dataset:', data);
    return data;
  }, [volunteers, activeReceipts, graphDateRange]);

  const maxCollection = useMemo(() => {
    return Math.max(...volunteerCollectionData.map(d => d.amount), 0);
  }, [volunteerCollectionData]);

  const formatYAxis = (value: number) => {
    if (value === 0) return '₹0';
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value}`;
  };

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    return receipts.filter(receipt => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !receipt.devotee_name.toLowerCase().includes(query) &&
          !receipt.receipt_number.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (purposeFilter !== 'all' && receipt.purpose !== purposeFilter) return false;
      if (paymentFilter !== 'all' && receipt.payment_mode !== paymentFilter) return false;
      if (volunteerFilter !== 'all' && receipt.volunteer_id !== volunteerFilter) return false;
      return true;
    });
  }, [receipts, searchQuery, purposeFilter, paymentFilter, volunteerFilter]);

  const totalPages = Math.ceil(filteredReceipts.length / ITEMS_PER_PAGE);
  const paginatedReceipts = filteredReceipts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleVoidReceipt = async (receipt: Receipt) => {
    try {
      await updateDoc(doc(db, 'receipts', receipt.id), { status: 'void' });
      toast.success(`Receipt ${receipt.receipt_number} has been voided`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to void receipt');
    } finally {
      setVoidConfirmReceipt(null);
    }
  };

  const getPaymentModeBadgeClass = (mode: PaymentMode) => {
    switch (mode) {
      case 'cash':
        return 'bg-warning text-warning-foreground';
      case 'upi':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <AdminLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {mandalName || 'Dashboard'}
              <Sparkles className="h-5 w-5 text-primary" />
            </h1>
            <p className="text-muted-foreground">
              {activeFestival ? activeFestival.name : 'Overview'}
            </p>
          </div>
          {activeFestival && (
            <Badge variant="outline" className="glass-card border-0 py-1.5 px-3 rounded-xl bg-primary/10 text-primary animate-pulse">
              Active Festival: {activeFestival.name}
            </Badge>
          )}
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card border-0 rounded-2xl overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-primary to-orange-600 rounded-xl shadow-lg">
                  <IndianRupee className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatIndianCurrency(stats.today.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.today.count} receipts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 rounded-2xl overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatIndianCurrency(stats.week.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.week.count} receipts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 rounded-2xl overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <CalendarIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatIndianCurrency(stats.month.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.month.count} receipts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 rounded-2xl overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl shadow-lg">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Top Purpose</p>
                  <p className="text-lg font-bold text-foreground truncate">
                    {stats.topPurpose?.name || 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.topPurpose ? formatIndianCurrency(stats.topPurpose.amount) : 'No data'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Live Collection Chart */}
        <motion.div variants={itemVariants}>
          <Card className="glass-card border-0 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ReceiptIcon className="h-5 w-5 text-primary" />
                  Collection by Volunteer
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn('justify-start text-left font-normal glass-card border-0 rounded-xl', !graphDateRange && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {graphDateRange?.from ? (
                        graphDateRange.to ? (
                          <>
                            {format(graphDateRange.from, 'LLL dd')} - {format(graphDateRange.to, 'LLL dd')}
                          </>
                        ) : (
                          format(graphDateRange.from, 'LLL dd, y')
                        )
                      ) : (
                        <span>Date Range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={graphDateRange?.from}
                      selected={graphDateRange}
                      onSelect={setGraphDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {volunteerCollectionData.length > 0 ? (
                <div className="h-[250px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volunteerCollectionData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'oklch(0.5 0.02 30)' }}
                      />
                      <YAxis 
                        tickFormatter={formatYAxis} 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'oklch(0.5 0.02 30)' }}
                        domain={[0, maxCollection > 0 ? 'auto' : 100]}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                        formatter={(value: number) => [formatIndianCurrency(value), 'Collection']}
                        contentStyle={{ 
                          borderRadius: '12px', 
                          background: 'rgba(255,255,255,0.95)', 
                          backdropFilter: 'blur(10px)',
                          border: 'none',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Bar 
                        dataKey="amount" 
                        fill="url(#primaryGradient)" 
                        radius={[6, 6, 0, 0]}
                        barSize={40}
                      >
                        {volunteerCollectionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fillOpacity={0.9} />
                        ))}
                      </Bar>
                      <defs>
                        <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="oklch(0.65 0.2 45)" />
                          <stop offset="100%" stopColor="oklch(0.6 0.2 45)" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                  <Users className="h-12 w-12 mb-3 opacity-50" />
                  <p>No collections yet today</p>
                  <p className="text-sm">Data will appear as receipts are generated</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Receipts Table */}
        <motion.div variants={itemVariants}>
          <Card className="glass-card border-0 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Recent Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or receipt no..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 rounded-xl bg-muted/30 border-border/50"
                  />
                </div>
                {activeFestival && (
                  <Select value={purposeFilter} onValueChange={(v) => { setPurposeFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="w-full sm:w-[150px] rounded-xl bg-muted/30 border-border/50">
                      <SelectValue placeholder="Purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Purposes</SelectItem>
                      {activeFestival.purposes.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[130px] rounded-xl bg-muted/30 border-border/50">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={volunteerFilter} onValueChange={(v) => { setVolunteerFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[150px] rounded-xl bg-muted/30 border-border/50">
                    <SelectValue placeholder="Volunteer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Volunteers</SelectItem>
                    {volunteers.map(v => (
                      <SelectItem key={v.uid} value={v.uid}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              {paginatedReceipts.length > 0 ? (
                <>
                  <div className="rounded-xl border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="font-semibold">Receipt No</TableHead>
                          <TableHead className="font-semibold">Devotee Name</TableHead>
                          <TableHead className="font-semibold text-right">Amount</TableHead>
                          <TableHead className="font-semibold hidden md:table-cell">Purpose</TableHead>
                          <TableHead className="font-semibold hidden sm:table-cell">Payment</TableHead>
                          <TableHead className="font-semibold hidden lg:table-cell">Volunteer</TableHead>
                          <TableHead className="font-semibold hidden lg:table-cell">Date & Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedReceipts.map((receipt) => (
                          <TableRow
                            key={receipt.id}
                            className={receipt.status === 'void' ? 'opacity-50 line-through' : ''}
                          >
                            <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                            <TableCell>{receipt.devotee_name}</TableCell>
                            <TableCell className="text-right font-semibold text-primary">
                              {formatIndianCurrency(receipt.amount)}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{receipt.purpose}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge className={getPaymentModeBadgeClass(receipt.payment_mode)}>
                                {receipt.payment_mode.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">{receipt.volunteer_name}</TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground">
                              {format(receipt.created_at, 'dd MMM, hh:mm a')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredReceipts.length)} of{' '}
                      {filteredReceipts.length} receipts
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="rounded-xl"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="rounded-xl"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <ReceiptIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No receipts found</p>
                  <p className="text-sm">Receipts will appear here once generated</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Receipt Modal */}
      <ReceiptModal
        receipt={selectedReceipt}
        open={showReceiptModal}
        onOpenChange={setShowReceiptModal}
      />

      {/* Void Confirmation Dialog */}
      <AlertDialog open={!!voidConfirmReceipt} onOpenChange={() => setVoidConfirmReceipt(null)}>
        <AlertDialogContent className="glass-card border-0 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Void this receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark receipt <strong>{voidConfirmReceipt?.receipt_number}</strong> as void.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              onClick={() => voidConfirmReceipt && handleVoidReceipt(voidConfirmReceipt)}
            >
              Void Receipt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
