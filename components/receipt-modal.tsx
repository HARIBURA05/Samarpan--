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
import { Share2, Printer, X, HandHeart, CheckCircle, Download, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { useRef } from 'react';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

interface ReceiptModalProps {
  receipt: Receipt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptModal({ receipt, open, onOpenChange }: ReceiptModalProps) {
  const [whatsappTemplate, setWhatsappTemplate] = useState<string>(defaultMandal.settings.whatsapp_template);
  const [mandalName, setMandalName] = useState<string>('Samarpan');
  const [isExporting, setIsExporting] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

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
    try {
      const formattedDate = format(receipt.created_at, 'dd MMM yyyy, hh:mm a');
      
      // Exact message format requested by user
      const message = `🧾 Donation Receipt
संस्था: ${mandalName}

Receipt No: ${receipt.receipt_number}
Name: ${receipt.devotee_name}
Contact: ${receipt.contact || 'N/A'}
Purpose: ${receipt.purpose}
Payment Mode: ${receipt.payment_mode.toUpperCase()}
Amount: ₹${receipt.amount.toLocaleString('en-IN')}
Date: ${formattedDate}

Thank you for your donation 🙏
Ganpati Bappa Morya!`;
      
      // Clean phone number: remove all non-digits, ensuring no spaces or "+"
      const cleanPhone = receipt.contact ? receipt.contact.replace(/\D/g, '') : '';
      
      // Prepending 91 for India if exactly 10 digits
      const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      
      // Construct URL using wa.me as requested for better mobile/desktop handling
      const whatsappUrl = phoneParam 
          ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
          : `https://wa.me/?text=${encodeURIComponent(message)}`;

      console.log('Generated WhatsApp URL:', whatsappUrl);
      
      const newWindow = window.open(whatsappUrl, '_blank');
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        throw new Error('Pop-up blocked');
      }
    } catch (err) {
      console.error('WhatsApp redirect error:', err);
      alert('Unable to open WhatsApp. Please check if your browser is blocking pop-ups.');
    }
  };

  const handleExportImage = async () => {
    if (!receiptRef.current) return;
    
    setIsExporting(true);
    try {
      // Small delay to ensure any animations finish
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      const link = document.createElement('a');
      link.download = `receipt-${receipt.receipt_number}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Receipt image saved successfully!');
    } catch (err) {
      console.error('Failed to export image:', err);
      toast.error('Failed to save image. Please try taking a screenshot instead.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.querySelector('.print-receipt');
    if (!printContent) {
      window.print();
      return;
    }
    
    // Create an invisible iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      // Gather all stylesheets from the main document to preserve Tailwind styles
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((el) => el.outerHTML)
        .join('');
        
      iframeDoc.write(`
        <html>
          <head>
            <title>Print Receipt</title>
            ${styles}
            <style>
              @media print {
                body { margin: 0; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .no-print { display: none !important; }
                * { visibility: visible !important; }
              }
            </style>
          </head>
          <body>
            ${printContent.outerHTML}
          </body>
        </html>
      `);
      iframeDoc.close();
      
      // Focus and print after a short delay to allow styles to load
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        // Remove iframe after printing
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    } else {
      window.print();
    }
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
            className="print-receipt bg-card"
            ref={receiptRef}
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
              <p className="text-primary font-bold mt-1 text-lg">Ganpati Bappa Morya..!!</p>
            </div>
          </motion.div>
        </AnimatePresence>
        
        {/* Action Buttons - Hidden when printing */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-3 mt-6 no-print"
        >
          <div className="flex gap-3">
            <Button 
              className="flex-[2] rounded-xl h-12 bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg transition-colors font-semibold"
              onClick={handleWhatsAppShare}
            >
              <WhatsAppIcon className="mr-2 h-5 w-5" />
              Send to WhatsApp
            </Button>
            <Button 
              variant="outline"
              className="flex-1 rounded-xl h-12 border-border hover:bg-muted/50"
              onClick={handleExportImage}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
          
          <Button 
            className="w-full rounded-xl h-12 bg-gradient-to-r from-primary to-orange-600 hover:opacity-90 shadow-lg"
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
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
