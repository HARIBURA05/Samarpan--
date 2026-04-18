'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { defaultMandal as mockMandal } from '@/lib/mock-data';
import { useAuth } from '@/lib/auth-context';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  Building2,
  Upload,
  IndianRupee,
  MessageSquare,
  Bell,
  Save,
  HandHeart,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const mandalId = user?.mandal_id || mockMandal.id;

  const [mandalName, setMandalName] = useState(mockMandal.name);
  const [mandalAddress, setMandalAddress] = useState(mockMandal.address);
  const [currencySymbol, setCurrencySymbol] = useState(mockMandal.settings.currency_symbol);
  const [whatsappTemplate, setWhatsappTemplate] = useState(mockMandal.settings.whatsapp_template);
  const [emailOnDonation, setEmailOnDonation] = useState(mockMandal.settings.notification_preferences.email_on_donation);
  const [dailySummary, setDailySummary] = useState(mockMandal.settings.notification_preferences.daily_summary);
  const [logoUrl, setLogoUrl] = useState(mockMandal.logo_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Load existing data from Firestore
  useEffect(() => {
    if (!mandalId) return;

    const fetchSettings = async () => {
      try {
        const mandalDoc = await getDoc(doc(db, 'mandals', mandalId));
        if (mandalDoc.exists()) {
          const data = mandalDoc.data();
          setMandalName(data.name || '');
          setMandalAddress(data.address || '');
          setLogoUrl(data.logo_url || '');

          if (data.settings) {
            setCurrencySymbol(data.settings.currency_symbol || '₹');
            setWhatsappTemplate(data.settings.whatsapp_template || '');
            setEmailOnDonation(data.settings.notification_preferences?.email_on_donation || false);
            setDailySummary(data.settings.notification_preferences?.daily_summary || false);
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    
    fetchSettings();
  }, [mandalId]);

  const handleSave = async () => {
    if (!user || user.uid.startsWith('guest-')) {
       toast.error('Settings cannot be saved in guest mode');
       return;
    }

    setIsSaving(true);

    try {
      await setDoc(doc(db, 'mandals', mandalId), {
        name: mandalName,
        address: mandalAddress,
        'settings.currency_symbol': currencySymbol,
        'settings.whatsapp_template': whatsappTemplate,
        'settings.notification_preferences.email_on_donation': emailOnDonation,
        'settings.notification_preferences.daily_summary': dailySummary,
      }, { merge: true });

      toast.success('Settings saved successfully');
    } catch (error) {
       console.error('Error saving settings:', error);
       toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user || user.uid.startsWith('guest-')) {
        toast.error('Logo upload is disabled in guest mode');
        return;
    }

    // Checking file size (< 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, `mandals/${mandalId}/logo_${Date.now()}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          toast.error('Failed to upload logo');
          setIsUploading(false);
          setUploadProgress(0);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Update firestore with new URL
            await setDoc(doc(db, 'mandals', mandalId), {
               logo_url: downloadURL 
            }, { merge: true });

            setLogoUrl(downloadURL);
            toast.success('Logo uploaded successfully');
          } catch (error) {
            console.error('Error post-upload:', error);
            toast.error('Logo uploaded but failed to save URL');
          } finally {
            setIsUploading(false);
            setUploadProgress(0);
          }
        }
      );
    } catch (error) {
      console.error('Error initiating upload:', error);
      toast.error('Failed to initiate upload');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Manage your mandal settings and preferences
          </p>
        </div>

        {/* Mandal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Mandal Information
            </CardTitle>
            <CardDescription>
              Basic information about your mandal that appears on receipts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mandalName">Mandal Name</Label>
              <Input
                id="mandalName"
                value={mandalName}
                onChange={(e) => setMandalName(e.target.value)}
                placeholder="Enter mandal name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mandalAddress">Address</Label>
              <Textarea
                id="mandalAddress"
                value={mandalAddress}
                onChange={(e) => setMandalAddress(e.target.value)}
                placeholder="Enter full address"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Receipt Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HandHeart className="h-5 w-5" />
              Receipt Logo
            </CardTitle>
            <CardDescription>
              Logo displayed on donation receipts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
                {logoUrl ? (
                    <img src={logoUrl} alt="Mandal Logo" className="w-full h-full object-cover" />
                ) : (
                    <HandHeart className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                    <Label htmlFor="logoUpload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 bg-background border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors justify-center text-sm font-medium">
                            <Upload className="h-4 w-4" />
                            {isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Upload Logo'}
                        </div>
                        <Input 
                            id="logoUpload" 
                            type="file" 
                            accept="image/png, image/jpeg, image/jpg" 
                            onChange={handleLogoUpload} 
                            disabled={isUploading} 
                            className="hidden" 
                        />
                    </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended: 200x200px, PNG or JPG (Max 2MB)
                </p>
                {isUploading && (
                    <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                        <div 
                          className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }} 
                        />
                    </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currency Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              Currency Settings
            </CardTitle>
            <CardDescription>
              Default currency symbol for amounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="currency">Currency Symbol</Label>
              <Input
                id="currency"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="₹"
                maxLength={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Template */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              WhatsApp Message Template
            </CardTitle>
            <CardDescription>
              Template used when sharing receipts via WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsappTemplate">Message Template</Label>
              <Textarea
                id="whatsappTemplate"
                value={whatsappTemplate}
                onChange={(e) => setWhatsappTemplate(e.target.value)}
                placeholder="Enter WhatsApp message template"
                rows={4}
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-2">Available Variables:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  '{receipt_number}',
                  '{mandal_name}',
                  '{devotee_name}',
                  '{amount}',
                  '{purpose}',
                  '{payment_mode}',
                  '{date}',
                ].map(v => (
                  <code key={v} className="text-xs bg-background px-2 py-1 rounded">
                    {v}
                  </code>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Configure when you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email on Donation</Label>
                <p className="text-sm text-muted-foreground">
                  Receive an email for each new donation
                </p>
              </div>
              <Switch
                checked={emailOnDonation}
                onCheckedChange={setEmailOnDonation}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Daily Summary</Label>
                <p className="text-sm text-muted-foreground">
                  Receive a daily summary of donations at 9 PM
                </p>
              </div>
              <Switch
                checked={dailySummary}
                onCheckedChange={setDailySummary}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            {isSaving ? (
              'Saving...'
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
