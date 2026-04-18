'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { collection, query, where, onSnapshot, Timestamp, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import {
  Search,
  Download,
  Eye,
  XCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  CalendarIcon,
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

const ITEMS_PER_PAGE = 20;

export default function ReceiptsPage() {
  const { user } = useAuth();
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [volunteerFilter, setVolunteerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [festivalFilter, setFestivalFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [voidConfirmReceipt, setVoidConfirmReceipt] = useState<Receipt | null>(null);

  // Firestore Data
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [volunteers, setVolunteers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const activeFestival = useMemo(() => {
    if (festivalFilter === 'all' && festivals.length > 0) {
      // Default to the first active festival if 'all' is selected
      return festivals.find(f => f.status === 'active') || festivals[0];
    }
    return festivals.find(f => f.id === festivalFilter);
  }, [festivalFilter, festivals]);

  useEffect(() => {
    if (!user?.mandal_id) return;

    // Fetch Receipts
    const q = query(
      collection(db, 'receipts'),
      where('mandal_id', '==', user.mandal_id),
      orderBy('created_at', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setReceipts(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        created_at: d.data().created_at instanceof Timestamp ? d.data().created_at.toDate() : new Date(d.data().created_at)
      } as Receipt)));
      setLoading(false);
    });

    // Fetch Festivals
    const festUnsub = onSnapshot(query(collection(db, 'festivals'), where('mandal_id', '==', user.mandal_id)), (snap) => {
      setFestivals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Festival)));
    });

    // Fetch Volunteers
    const volUnsub = onSnapshot(query(collection(db, 'users'), where('mandal_id', '==', user.mandal_id), where('role', '==', 'volunteer')), (snap) => {
      setVolunteers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
    });

    return () => {
      unsub();
      festUnsub();
      volUnsub();
    };
  }, [user?.mandal_id]);

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    return receipts.filter(receipt => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !receipt.devotee_name.toLowerCase().includes(query) &&
          !receipt.receipt_number.toLowerCase().includes(query) &&
          !receipt.contact.includes(query)
        ) {
          return false;
        }
      }
      if (festivalFilter !== 'all' && receipt.festival_id !== festivalFilter) return false;
      if (purposeFilter !== 'all' && receipt.purpose !== purposeFilter) return false;
      if (paymentFilter !== 'all' && receipt.payment_mode !== paymentFilter) return false;
      if (volunteerFilter !== 'all' && receipt.volunteer_id !== volunteerFilter) return false;
      if (statusFilter !== 'all' && receipt.status !== statusFilter) return false;
      if (dateRange?.from) {
        const receiptDate = new Date(receipt.created_at);
        const start = startOfDay(dateRange.from);
        const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        if (!isWithinInterval(receiptDate, { start, end })) return false;
      }
      return true;
    });
  }, [searchQuery, purposeFilter, paymentFilter, volunteerFilter, statusFilter, festivalFilter, dateRange, receipts]);

  const totalPages = Math.ceil(filteredReceipts.length / ITEMS_PER_PAGE);
  const paginatedReceipts = filteredReceipts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalAmount = filteredReceipts
    .filter(r => r.status === 'active')
    .reduce((sum, r) => sum + r.amount, 0);

  const handleExportCSV = () => {
    // Generate CSV content
    const headers = ['Receipt No', 'Devotee Name', 'Contact', 'Amount', 'Purpose', 'Payment Mode', 'Volunteer', 'Status', 'Date'];
    const rows = filteredReceipts.map(r => [
      r.receipt_number,
      r.devotee_name,
      r.contact,
      r.amount,
      r.purpose,
      r.payment_mode,
      r.volunteer_name,
      r.status,
      format(r.created_at, 'yyyy-MM-dd HH:mm'),
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const handleVoidReceipt = async (receipt: Receipt) => {
    try {
      const receiptRef = doc(db, 'receipts', receipt.id);
      await updateDoc(receiptRef, {
        status: 'void'
      });
      toast.success(`Receipt ${receipt.receipt_number} has been voided`);
    } catch (error) {
      console.error("Error voiding receipt:", error);
      toast.error("Failed to void receipt");
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

  const clearFilters = () => {
    setSearchQuery('');
    setPurposeFilter('all');
    setPaymentFilter('all');
    setVolunteerFilter('all');
    setStatusFilter('all');
    setFestivalFilter('all');
    setDateRange(undefined);
    setCurrentPage(1);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">All Receipts</h1>
            <p className="text-muted-foreground">
              {filteredReceipts.length} receipts | Total: {formatIndianCurrency(totalAmount)}
            </p>
          </div>
          <Button onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Receipt Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
              <div className="relative col-span-2 sm:col-span-3 lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, receipt no, or contact..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <span className="truncate">
                          {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd')}
                        </span>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Date Range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range);
                      setCurrentPage(1);
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              <Select value={festivalFilter} onValueChange={(v) => { setFestivalFilter(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Festival" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Festivals</SelectItem>
                  {festivals.map(fest => (
                    <SelectItem key={fest.id} value={fest.id}>{fest.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={purposeFilter} onValueChange={(v) => { setPurposeFilter(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Purposes</SelectItem>
                  {activeFestival?.purposes.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setCurrentPage(1); }}>
                <SelectTrigger>
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
                <SelectTrigger>
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

            <div className="flex gap-2 mb-4">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="void">Voided</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
                Clear Filters
              </Button>
            </div>

            {/* Table */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Receipt No</TableHead>
                    <TableHead className="font-semibold">Devotee Name</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Contact</TableHead>
                    <TableHead className="font-semibold text-right">Amount</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Purpose</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Payment</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Volunteer</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Date & Time</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedReceipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No receipts found matching your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedReceipts.map((receipt) => (
                      <TableRow
                        key={receipt.id}
                        className={receipt.status === 'void' ? 'bg-muted/30' : ''}
                      >
                        <TableCell className={cn('font-medium', receipt.status === 'void' && 'line-through')}>
                          {receipt.receipt_number}
                          {receipt.status === 'void' && (
                            <Badge variant="destructive" className="ml-2 text-xs">VOID</Badge>
                          )}
                        </TableCell>
                        <TableCell className={receipt.status === 'void' ? 'line-through' : ''}>
                          {receipt.devotee_name}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{receipt.contact || '-'}</TableCell>
                        <TableCell className={cn('text-right font-semibold', receipt.status === 'void' ? 'line-through text-muted-foreground' : 'text-primary')}>
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
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedReceipt(receipt);
                                setShowReceiptModal(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                            {receipt.status !== 'void' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setVoidConfirmReceipt(receipt)}
                              >
                                <XCircle className="h-4 w-4" />
                                <span className="sr-only">Void</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredReceipts.length > 0 ? ((currentPage - 1) * ITEMS_PER_PAGE) + 1 : 0} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredReceipts.length)} of{' '}
                {filteredReceipts.length} receipts
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        receipt={selectedReceipt}
        open={showReceiptModal}
        onOpenChange={setShowReceiptModal}
      />

      {/* Void Confirmation Dialog */}
      <AlertDialog open={!!voidConfirmReceipt} onOpenChange={() => setVoidConfirmReceipt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark receipt <strong>{voidConfirmReceipt?.receipt_number}</strong> as void.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
