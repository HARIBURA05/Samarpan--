'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  LayoutDashboard,
  Receipt,
  Users,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  HandHeart,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/receipts', label: 'Receipts', icon: Receipt },
  { href: '/volunteers', label: 'Volunteers', icon: Users },
  { href: '/festivals', label: 'Festivals', icon: Calendar },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mandalName, setMandalName] = useState<string>('');

  useEffect(() => {
    if (!user?.mandal_id || user.uid.startsWith('guest')) return;

    const unsub = onSnapshot(doc(db, 'mandals', user.mandal_id), (doc) => {
      if (doc.exists()) {
        setMandalName(doc.data().name || '');
      }
    });
    return () => unsub();
  }, [user?.mandal_id, user?.uid]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 5, scale: 1.05 }}
            className="w-11 h-11 bg-gradient-to-br from-sidebar-primary to-orange-600 rounded-xl flex items-center justify-center shadow-lg"
          >
            <HandHeart className="h-6 w-6 text-sidebar-primary-foreground" />
          </motion.div>
          <div>
            <h1 className="text-base font-bold leading-tight text-sidebar-foreground flex items-center gap-1">
              Samarpan
              <Sparkles className="h-3 w-3 text-sidebar-primary" />
            </h1>
            <p className="text-xs text-sidebar-foreground/60">Digital Receipt Generator</p>
          </div>
        </div>
      </div>

      {/* Mandal Name */}
      <div className="px-4 py-3 border-b border-sidebar-border/50">
        <p className="text-xs text-sidebar-foreground/50 truncate">
          {user?.uid.startsWith('guest') ? 'Demo Mode' : (mandalName || 'Loading Mandal...')}
        </p>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1.5">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <motion.div
                key={item.href}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={item.href}
                  onClick={onItemClick}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-sidebar-primary to-orange-600 text-sidebar-primary-foreground shadow-lg'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Quick Action */}
      <div className="p-3 border-t border-sidebar-border/50">
        <Link href="/volunteer" onClick={onItemClick}>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="w-full rounded-xl bg-gradient-to-r from-sidebar-primary to-orange-600 hover:opacity-90 shadow-lg" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Receipt
            </Button>
          </motion.div>
        </Link>
      </div>

      {/* User & Logout */}
      <div className="p-3 border-t border-sidebar-border/50">
        <div className="flex items-center justify-between glass rounded-xl p-2">
          <div className="min-w-0 ml-1">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-lg"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar with glassmorphism */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-50 border-r border-sidebar-border/30 backdrop-blur-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-dark border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-orange-600 rounded-xl flex items-center justify-center shadow-md">
              <HandHeart className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-foreground">Samarpan</span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-0">
              <SidebarContent onItemClick={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Mobile Bottom Navigation with glassmorphism */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/30">
        <div className="flex items-center justify-around py-2 px-1">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px]',
                  isActive 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
