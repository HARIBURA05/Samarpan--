'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { formatIndianCurrency } from '@/lib/mock-data';
import type { Festival, FestivalStatus } from '@/lib/types';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  Timestamp,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';

// Demo data for guest mode - will be replaced with Firebase data
// Demo data removed, using Firestore
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Plus,
  Calendar as CalendarIcon,
  Receipt,
  IndianRupee,
  Edit,
  BarChart3,
  Play,
  X,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function FestivalsPage() {
  const { user } = useAuth();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFestival, setEditingFestival] = useState<Festival | null>(null);
  
  // Form state
  const [festivalName, setFestivalName] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [receiptPrefix, setReceiptPrefix] = useState('');
  const [purposes, setPurposes] = useState<string[]>(['General Donation', 'Other']);
  const [newPurpose, setNewPurpose] = useState('');

  useEffect(() => {
    if (!user?.mandal_id) return;

    const q = query(
      collection(db, 'festivals'),
      where('mandal_id', '==', user.mandal_id),
      orderBy('created_at', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const raw = d.data();
        return {
          id: d.id,
          ...raw,
          start_date: raw.start_date instanceof Timestamp ? raw.start_date.toDate() : new Date(raw.start_date),
          end_date: raw.end_date instanceof Timestamp ? raw.end_date.toDate() : new Date(raw.end_date),
          created_at: raw.created_at instanceof Timestamp ? raw.created_at.toDate() : new Date(raw.created_at),
        } as Festival;
      });
      setFestivals(data);
      setLoading(false);
    }, (err) => {
      console.error('Festivals error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.mandal_id]);

  const getStatusBadge = (status: FestivalStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success text-success-foreground">Active</Badge>;
      case 'upcoming':
        return <Badge variant="secondary">Upcoming</Badge>;
      case 'ended':
        return <Badge variant="outline">Ended</Badge>;
    }
  };

  const handleAddPurpose = () => {
    if (newPurpose.trim() && !purposes.includes(newPurpose.trim())) {
      setPurposes([...purposes, newPurpose.trim()]);
      setNewPurpose('');
    }
  };

  const handleRemovePurpose = (purpose: string) => {
    setPurposes(purposes.filter(p => p !== purpose));
  };

  const handleCreateFestival = async () => {
    if (!festivalName || !startDate || !endDate || !receiptPrefix) {
      toast.error('Please fill all required fields');
      return;
    }

    if (endDate < startDate) {
      toast.error('End date must be after start date');
      return;
    }

    if (!user?.mandal_id) {
      toast.error('Authentication error');
      return;
    }

    try {
      if (editingFestival) {
        await updateDoc(doc(db, 'festivals', editingFestival.id), {
          name: festivalName,
          start_date: Timestamp.fromDate(startDate),
          end_date: Timestamp.fromDate(endDate),
          receipt_prefix: receiptPrefix,
          purposes,
        });
        toast.success(`Festival "${festivalName}" updated successfully`);
      } else {
        await addDoc(collection(db, 'festivals'), {
          mandal_id: user.mandal_id,
          name: festivalName,
          start_date: Timestamp.fromDate(startDate),
          end_date: Timestamp.fromDate(endDate),
          receipt_prefix: receiptPrefix.toUpperCase(),
          purposes,
          status: 'upcoming',
          created_at: serverTimestamp(),
          total_collected: 0,
          total_receipts: 0,
        });
        toast.success(`Festival "${festivalName}" created successfully`);
      }
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      console.error('Error saving festival:', err);
      toast.error('Failed to save festival');
    }
  };

  const handleActivateFestival = async (festival: Festival) => {
    if (!user?.mandal_id) return;

    try {
      const batch = writeBatch(db);
      
      // Deactivate current active festivals for this mandal
      festivals.filter(f => f.status === 'active').forEach(f => {
        batch.update(doc(db, 'festivals', f.id), { status: 'ended' });
      });

      // Activate the selected one
      batch.update(doc(db, 'festivals', festival.id), { status: 'active' });
      
      await batch.commit();
      toast.success(`${festival.name} is now active`);
    } catch (err) {
      console.error('Error activating festival:', err);
      toast.error('Failed to activate festival');
    }
  };

  const handleSeedFestival = async () => {
    if (!user?.mandal_id) return;
    
    setLoading(true);
    try {
      const ganeshStartDate = new Date('2024-09-07');
      const ganeshEndDate = new Date('2024-09-17');
      
      await addDoc(collection(db, 'festivals'), {
        mandal_id: user.mandal_id,
        name: 'Ganesh Chaturthi 2024',
        start_date: Timestamp.fromDate(ganeshStartDate),
        end_date: Timestamp.fromDate(ganeshEndDate),
        receipt_prefix: 'GAN2024',
        purposes: ['Vargani', 'Annadanam', 'Decoration', 'General Donation', 'Other'],
        status: 'active',
        created_at: serverTimestamp(),
        total_collected: 0,
        total_receipts: 0,
      });
      toast.success('Ganesh Chaturthi 2024 festival restored');
    } catch (err) {
      console.error('Error seeding festival:', err);
      toast.error('Failed to restore festival');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFestivalName('');
    setStartDate(undefined);
    setEndDate(undefined);
    setReceiptPrefix('');
    setPurposes(['General Donation', 'Other']);
    setNewPurpose('');
  };

  const openEditModal = (festival: Festival) => {
    setEditingFestival(festival);
    setFestivalName(festival.name);
    setStartDate(festival.start_date);
    setEndDate(festival.end_date);
    setReceiptPrefix(festival.receipt_prefix);
    setPurposes(festival.purposes);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingFestival(null);
    resetForm();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Festivals</h1>
            <p className="text-muted-foreground">
              Manage festival events and donation purposes
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Festival
          </Button>
        </div>

        {/* Festival Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              Loading festivals...
            </div>
          ) : festivals.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/20">
              <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-foreground">No festivals created yet</p>
              <p className="text-sm mb-6">Click the button above to create your first festival or restore the default one.</p>
              <Button variant="outline" onClick={handleSeedFestival} disabled={loading}>
                Restore Ganesh Chaturthi 2024
              </Button>
            </div>
          ) : (
            festivals.map((festival) => (
            <Card key={festival.id} className={cn(
              'relative overflow-hidden',
              festival.status === 'active' && 'ring-2 ring-primary'
            )}>
              {festival.status === 'active' && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{festival.name}</CardTitle>
                    <CardDescription className="mt-1">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {format(festival.start_date, 'dd MMM')} - {format(festival.end_date, 'dd MMM yyyy')}
                      </span>
                    </CardDescription>
                  </div>
                  {getStatusBadge(festival.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded">
                        <IndianRupee className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Collected</p>
                        <p className="font-semibold text-sm">
                          {formatIndianCurrency(festival.total_collected || 0)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-muted rounded">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Receipts</p>
                        <p className="font-semibold text-sm">{festival.total_receipts || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Purposes Preview */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Donation Purposes</p>
                    <div className="flex flex-wrap gap-1">
                      {festival.purposes.slice(0, 3).map(p => (
                        <Badge key={p} variant="outline" className="text-xs">
                          {p}
                        </Badge>
                      ))}
                      {festival.purposes.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{festival.purposes.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {festival.status === 'upcoming' && (
                      <Button
                        size="sm"
                        onClick={() => handleActivateFestival(festival)}
                        className="flex-1"
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Activate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(festival)}
                      className={festival.status !== 'upcoming' ? 'flex-1' : ''}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Link href={`/reports?festival=${festival.id}`}>
                      <Button size="sm" variant="outline">
                        <BarChart3 className="mr-1 h-3 w-3" />
                        Report
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )))}
        </div>
      </div>

      {/* Create/Edit Festival Modal */}
      <Dialog open={showCreateModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFestival ? 'Edit Festival' : 'Create New Festival'}
            </DialogTitle>
            <DialogDescription>
              {editingFestival
                ? 'Update festival details and donation purposes.'
                : 'Set up a new festival event with donation purposes.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="festivalName">Festival Name *</Label>
              <Input
                id="festivalName"
                placeholder="e.g. Ganesh Chaturthi 2024"
                value={festivalName}
                onChange={(e) => setFestivalName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'dd MMM yyyy') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal', !endDate && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'dd MMM yyyy') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiptPrefix">Receipt Prefix *</Label>
              <Input
                id="receiptPrefix"
                placeholder="e.g. GAN2024"
                value={receiptPrefix}
                onChange={(e) => setReceiptPrefix(e.target.value.toUpperCase())}
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Used in receipt numbers: {receiptPrefix || 'PREFIX'}-00001
              </p>
            </div>

            <div className="space-y-3">
              <Label>Donation Purposes</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a custom purpose"
                  value={newPurpose}
                  onChange={(e) => setNewPurpose(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPurpose())}
                  className="rounded-xl"
                />
                <Button 
                  type="button" 
                  onClick={handleAddPurpose} 
                  variant="default"
                  className="rounded-xl px-6"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Quick Add:</p>
                <div className="flex flex-wrap gap-2">
                  {['Vargani', 'Annadanam', 'Murti', 'Decoration', 'Cultural Program'].map(p => (
                    <Button
                      key={p}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs rounded-full py-0 h-7"
                      onClick={() => !purposes.includes(p) && setPurposes([...purposes, p])}
                      disabled={purposes.includes(p)}
                    >
                      +{p}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t">
                {purposes.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No purposes added yet. Add at least one.</p>
                )}
                {purposes.map(p => (
                  <Badge key={p} variant="secondary" className="pr-1 pl-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary border-0 hover:bg-primary/20">
                    {p}
                    <button
                      type="button"
                      onClick={() => handleRemovePurpose(p)}
                      className="ml-2 p-0.5 rounded-full hover:bg-destructive hover:text-white transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleCreateFestival}>
              {editingFestival ? 'Save Changes' : 'Create Festival'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
