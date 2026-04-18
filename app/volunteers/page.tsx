'use client';

import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ReceiptModal } from '@/components/receipt-modal';
import type { User, Receipt, Festival } from '@/lib/types';
import { formatIndianCurrency } from '@/lib/mock-data';
import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  serverTimestamp, 
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';

// Demo data removed
import { format } from 'date-fns';
import {
  Plus,
  Users,
  Eye,
  MoreVertical,
  Mail,
  IndianRupee,
  Receipt as ReceiptIcon,
  Calendar,
  UserCheck,
  UserX,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

export default function VolunteersPage() {
  const { user: currentUser } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<User | null>(null);
  const [showVolunteerSheet, setShowVolunteerSheet] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Volunteers and receipts from Firebase
  const [volunteers, setVolunteers] = useState<User[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [activeFestivals, setActiveFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [newVolunteerName, setNewVolunteerName] = useState('');
  const [newVolunteerEmail, setNewVolunteerEmail] = useState('');
  const [newVolunteerPassword, setNewVolunteerPassword] = useState('');
  const [newVolunteerFestival, setNewVolunteerFestival] = useState('');

  const activeFestival = activeFestivals[0];

  useEffect(() => {
    if (!currentUser?.mandal_id) return;

    // Fetch volunteers
    const vQuery = query(
      collection(db, 'users'),
      where('mandal_id', '==', currentUser.mandal_id),
      where('role', '==', 'volunteer')
    );
    const vUnsub = onSnapshot(vQuery, (snap) => {
      setVolunteers(snap.docs.map(d => ({ 
        uid: d.id, 
        ...d.data(),
        created_at: d.data().created_at instanceof Timestamp ? d.data().created_at.toDate() : new Date(d.data().created_at)
      } as User)));
    });

    // Fetch receipts for stats
    const rQuery = query(
      collection(db, 'receipts'),
      where('mandal_id', '==', currentUser.mandal_id)
    );
    const rUnsub = onSnapshot(rQuery, (snap) => {
      setReceipts(snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        created_at: d.data().created_at instanceof Timestamp ? d.data().created_at.toDate() : new Date(d.data().created_at)
      } as Receipt)));
      setLoading(false);
    });

    // Fetch active festivals for assignment
    const fQuery = query(
      collection(db, 'festivals'),
      where('mandal_id', '==', currentUser.mandal_id),
      where('status', '==', 'active')
    );
    const fUnsub = onSnapshot(fQuery, (snap) => {
      setActiveFestivals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Festival)));
    });

    return () => {
      vUnsub();
      rUnsub();
      fUnsub();
    };
  }, [currentUser?.mandal_id]);

  const volunteerData = useMemo(() => {
    return volunteers.map(v => {
      // TODO: Calculate from Firebase data
      const volunteerReceipts = receipts.filter(r => r.volunteer_id === v.uid && r.status === 'active');
      const todayReceipts = volunteerReceipts.filter(r => {
        const today = new Date();
        const receiptDate = new Date(r.created_at);
        return (
          receiptDate.getDate() === today.getDate() &&
          receiptDate.getMonth() === today.getMonth() &&
          receiptDate.getFullYear() === today.getFullYear()
        );
      });
      return {
        ...v,
        receiptsToday: todayReceipts.length,
        collectedToday: todayReceipts.reduce((sum, r) => sum + r.amount, 0),
        totalCollected: volunteerReceipts.reduce((sum, r) => sum + r.amount, 0),
      };
    });
  }, [volunteers, receipts]);

  const selectedVolunteerReceipts = useMemo(() => {
    if (!selectedVolunteer) return [];
    // TODO: Replace with Firebase query
    return receipts
      .filter(r => r.volunteer_id === selectedVolunteer.uid)
      .slice(0, 50);
  }, [selectedVolunteer, receipts]);

  const handleAddVolunteer = async () => {
    if (!newVolunteerName || !newVolunteerEmail || !newVolunteerPassword) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!currentUser?.mandal_id) return;

    try {
      // Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, newVolunteerEmail, newVolunteerPassword);
      
      // Create Firestore entry
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: newVolunteerName,
        email: newVolunteerEmail,
        role: 'volunteer',
        mandal_id: currentUser.mandal_id,
        festival_id: newVolunteerFestival || '',
        created_at: serverTimestamp(),
        status: 'active',
      });

      toast.success(`Volunteer ${newVolunteerName} has been created`);
      setShowAddModal(false);
      setNewVolunteerName('');
      setNewVolunteerEmail('');
      setNewVolunteerPassword('');
      setNewVolunteerFestival('');
    } catch (err: any) {
      console.error('Error adding volunteer:', err);
      toast.error(err.message || 'Failed to create volunteer');
    }
  };

  const handleToggleStatus = async (volunteer: User) => {
    try {
      const newStatus = volunteer.status === 'active' ? 'inactive' : 'active';
      await setDoc(doc(db, 'users', volunteer.uid), { status: newStatus }, { merge: true });
      toast.success(`${volunteer.name} is now ${newStatus}`);
    } catch (err) {
      console.error('Error toggling status:', err);
      toast.error('Failed to update status');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Volunteers</h1>
            <p className="text-muted-foreground">
              Manage volunteer accounts and view their collection history
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Volunteer
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Volunteers</p>
                  <p className="text-2xl font-bold text-foreground">{volunteers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <UserCheck className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-foreground">
                    {volunteers.filter(v => v.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <UserX className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                  <p className="text-2xl font-bold text-foreground">
                    {volunteers.filter(v => v.status === 'inactive').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <ReceiptIcon className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Receipts Today</p>
                  <p className="text-2xl font-bold text-foreground">
                    {volunteerData.reduce((sum, v) => sum + v.receiptsToday, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Volunteers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Volunteer List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">Email</TableHead>
                    <TableHead className="font-semibold text-center">Receipts Today</TableHead>
                    <TableHead className="font-semibold text-right hidden md:table-cell">Collected Today</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volunteerData.map((volunteer) => (
                    <TableRow key={volunteer.uid}>
                      <TableCell className="font-medium">{volunteer.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {volunteer.email}
                      </TableCell>
                      <TableCell className="text-center">{volunteer.receiptsToday}</TableCell>
                      <TableCell className="text-right hidden md:table-cell font-semibold text-primary">
                        {formatIndianCurrency(volunteer.collectedToday)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={volunteer.status === 'active' ? 'default' : 'secondary'}
                          className={volunteer.status === 'active' ? 'bg-success text-success-foreground' : ''}
                        >
                          {volunteer.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedVolunteer(volunteer);
                              setShowVolunteerSheet(true);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View History
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(volunteer)}>
                              {volunteer.status === 'active' ? (
                                <>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Volunteer Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Volunteer</DialogTitle>
            <DialogDescription>
              Create a new volunteer account. They will use these credentials to log in.
            </DialogDescription>
          </DialogHeader>
            <div className="space-y-4"><div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={newVolunteerName}
                onChange={(e) => setNewVolunteerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="volunteer@example.com"
                value={newVolunteerEmail}
                onChange={(e) => setNewVolunteerEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter temporary password"
                value={newVolunteerPassword}
                onChange={(e) => setNewVolunteerPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="festival">Assign to Festival</Label>
              <Select value={newVolunteerFestival} onValueChange={setNewVolunteerFestival}>
                <SelectTrigger>
                  <SelectValue placeholder="Select festival" />
                </SelectTrigger>
                <SelectContent>
                  {activeFestivals.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddVolunteer}>
              Create Volunteer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Volunteer Detail Sheet */}
      <Sheet open={showVolunteerSheet} onOpenChange={setShowVolunteerSheet}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedVolunteer?.name}</SheetTitle>
            <SheetDescription>{selectedVolunteer?.email}</SheetDescription>
          </SheetHeader>
          
          {selectedVolunteer && (
            <div className="mt-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Today</p>
                        <p className="font-bold text-primary">
                          {formatIndianCurrency(
                            volunteerData.find(v => v.uid === selectedVolunteer.uid)?.collectedToday ?? 0
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold">
                          {formatIndianCurrency(
                            volunteerData.find(v => v.uid === selectedVolunteer.uid)?.totalCollected ?? 0
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Joined {format(selectedVolunteer.created_at, 'dd MMM yyyy')}
              </div>

              <Separator />

              {/* Receipt History */}
              <div>
                <h3 className="font-semibold mb-3">Receipt History</h3>
                <div className="space-y-2">
                  {selectedVolunteerReceipts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No receipts yet
                    </p>
                  ) : (
                    selectedVolunteerReceipts.map(receipt => (
                      <button
                        key={receipt.id}
                        onClick={() => {
                          setSelectedReceipt(receipt);
                          setShowReceiptModal(true);
                        }}
                        className="w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{receipt.devotee_name}</p>
                            <p className="text-xs text-muted-foreground">{receipt.receipt_number}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-primary">
                              {formatIndianCurrency(receipt.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(receipt.created_at, 'dd MMM, hh:mm a')}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Receipt Modal */}
      <ReceiptModal
        receipt={selectedReceipt}
        open={showReceiptModal}
        onOpenChange={setShowReceiptModal}
      />
    </AdminLayout>
  );
}
