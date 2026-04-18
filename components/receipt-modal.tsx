'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Receipt } from '@/lib/types';
import { formatIndianCurrency, defaultMandal } from '@/lib/mock-data';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Share2, Printer, X, HandHeart, CheckCircle } from 'lucide-react';

interface ReceiptModalProps {
  receipt: Receipt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptModal({ receipt, open, onOpenChange }: ReceiptModalProps) {
  const [whatsappTemplate, setWhatsappTemplate] = useState<string>(defaultMandal.settings.whatsapp_template);
  const [mandalName, setMandalName] = useState<string>('Samarpan');

  useEffect(() => {
     if (!receipt || !receipt.mandal_id) return;

     const fetchMandalSettings = async () => {
         try {
             // Fetch real-time settings for the current mandal
             const mandalDoc = await getDoc(doc(db, 'mandals', receipt.mandal_id));
             if (mandalDoc.exists()) {
                 const data = mandalDoc.data();
                 if (data.settings?.whatsapp_template) {
                     setWhatsappTemplate(data.settings.whatsapp_template);
                 }
                 if (data.name) {
                     setMandalName(data.name);
                 }
             }
         } catch (error) {
             console.error("Error fetching mandal settings:", error);
         }
     }

     fetchMandalSettings();
  }, [receipt]);

  if (!receipt) return null;
  
  const handleWhatsAppShare = () => {
    const message = whatsappTemplate
      .replace('{receipt_number}', receipt.receipt_number)
      .replace('{mandal_name}', mandalName)
      .replace('{devotee_name}', receipt.devotee_name)
      .replace('{amount}', receipt.amount.toLocaleString('en-IN'))
      .replace('{purpose}', receipt.purpose)
      .replace('{payment_mode}', receipt.payment_mode.toUpperCase())
      .replace('{date}', format(receipt.created_at, 'dd MMM yyyy, hh:mm a'));
    
    // Use the devotee's contact number if available, strictly using digits
    const phone = receipt.contact ? receipt.contact.replace(/\D/g, '') : '';
    const phoneParam = phone ? `91${phone}` : '';
    
    // If phoneParam is missing, the API defaults to allowing the user to select a contact manually in WhatsApp
    const whatsappUrl = phoneParam 
        ? `https://api.whatsapp.com/send?phone=${phoneParam}&text=${encodeURIComponent(message)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
  };

  const handlePrint = () => {
    window.print();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
        <DialogHeader className="no-print">
          <DialogTitle className="sr-only">Donation Receipt</DialogTitle>
        </DialogHeader>
        
        <AnimatePresence>
          {/* Receipt Content - This is what gets printed */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="print-receipt"
          >
            {/* Success Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-center mb-4 no-print"
            >
              <div className="mx-auto w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="h-10 w-10 text-success" />
              </div>
              <p className="text-sm font-medium text-success">Receipt Generated!</p>
            </motion.div>

            {/* Header */}
            <div className="text-center space-y-2 mb-6">
              <motion.div 
                initial={{ rotate: -10 }}
                animate={{ rotate: 0 }}
                className="mx-auto w-14 h-14 bg-gradient-to-br from-primary to-orange-600 rounded-2xl flex items-center justify-center shadow-lg"
              >
                <HandHeart className="h-7 w-7 text-primary-foreground" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground">{mandalName}</h2>
              <p className="text-xs text-muted-foreground">Digital Receipt Generator</p>
              <p className="text-sm font-semibold text-primary">Official Donation Receipt</p>
            </div>
            
            {/* Receipt Number & Date */}
            <div className="flex justify-between items-center mb-4 p-3 bg-muted/60 rounded-xl border border-border/50">
              <div>
                <p className="text-xs text-muted-foreground">Receipt No.</p>
                <p className="font-bold text-foreground">{receipt.receipt_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Date & Time</p>
                <p className="font-medium text-foreground">
                  {format(receipt.created_at, 'dd MMM yyyy')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(receipt.created_at, 'hh:mm a')}
                </p>
              </div>
            </div>

            <Separator className="my-4 opacity-50" />
            
            {/* Details Table */}
            <div className="space-y-3">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Devotee Name</span>
                <span className="font-medium text-foreground text-right">{receipt.devotee_name}</span>
              </div>
              
              {receipt.contact && (
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Contact</span>
                  <span className="font-medium text-foreground">{receipt.contact}</span>
                </div>
              )}
              
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Purpose</span>
                <span className="font-medium text-foreground">{receipt.purpose}</span>
              </div>
              
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Payment Mode</span>
                <Badge className={`${getPaymentModeBadgeClass(receipt.payment_mode)} rounded-lg`}>
                  {receipt.payment_mode.toUpperCase()}
                </Badge>
              </div>
              
              {receipt.remarks && (
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Remarks</span>
                  <span className="text-foreground text-right max-w-[60%]">{receipt.remarks}</span>
                </div>
              )}
            </div>
            
            <Separator className="my-4 opacity-50" />
            
            {/* Amount - Prominent */}
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center py-5 bg-gradient-to-br from-primary/10 to-orange-500/10 rounded-2xl"
            >
              <p className="text-sm text-muted-foreground mb-1">Donation Amount</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
                {formatIndianCurrency(receipt.amount)}
              </p>
            </motion.div>
            
            {/* Thank You */}
            <div className="text-center mt-6 pt-4 border-t border-dashed border-border/50">
              <p className="text-sm font-medium text-foreground">
                Thank you for your generous donation.
              </p>
              <p className="text-primary font-bold mt-1 text-lg">Jay Ganesh!</p>
            </div>
          </motion.div>
        </AnimatePresence>
        
        {/* Action Buttons - Hidden when printing */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-3 mt-6 no-print"
        >
            <Button 
            variant="outline" 
            className="flex-1 rounded-xl h-12 border-border hover:bg-muted/50"
            onClick={handleWhatsAppShare}
          >
            <Share2 className="mr-2 h-4 w-4" />
            WhatsApp
          </Button>
          <Button 
            className="flex-1 rounded-xl h-12 bg-gradient-to-r from-primary to-orange-600 hover:opacity-90 shadow-lg"
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </motion.div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-4 top-4 no-print rounded-full hover:bg-muted/50"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
