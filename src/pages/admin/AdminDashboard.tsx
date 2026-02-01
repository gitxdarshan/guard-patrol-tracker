import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, LogOut, Users, MapPin, ClipboardList, 
  Plus, Download, Search, Filter, Calendar, Radio
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GuardManagement } from '@/components/admin/GuardManagement';
import { CheckpointManagement } from '@/components/admin/CheckpointManagement';
import { ScanLogs } from '@/components/admin/ScanLogs';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { LiveGuardMap } from '@/components/admin/LiveGuardMap';
import { InstallButton } from '@/components/InstallButton';
import { Scan, Checkpoint, Profile, UserRole } from '@/types';

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalGuards: 0,
    totalCheckpoints: 0,
    todayScans: 0,
    coveragePercent: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Get guard count
    const { count: guardCount } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'guard');

    // Get checkpoint count
    const { count: checkpointCount } = await supabase
      .from('checkpoints')
      .select('*', { count: 'exact', head: true });

    // Get today's scans
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: scanCount } = await supabase
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .gte('scanned_at', today.toISOString());

    // Get unique checkpoints scanned today
    const { data: todayCheckpoints } = await supabase
      .from('scans')
      .select('checkpoint_id')
      .gte('scanned_at', today.toISOString());

    const uniqueCheckpoints = new Set(todayCheckpoints?.map(s => s.checkpoint_id)).size;
    const coverage = checkpointCount ? Math.round((uniqueCheckpoints / checkpointCount) * 100) : 0;

    setStats({
      totalGuards: guardCount || 0,
      totalCheckpoints: checkpointCount || 0,
      todayScans: scanCount || 0,
      coveragePercent: coverage,
    });
  };

  return (
    <div className="min-h-screen flex flex-col safe-area-top bg-gradient-to-b from-background via-background to-background/95">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50 safe-area-x">
        <div className="flex items-center justify-between max-w-7xl mx-auto px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-foreground text-base sm:text-lg tracking-tight">Guard Patrol</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{profile?.full_name || 'Admin'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <InstallButton />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={signOut} 
              className="text-muted-foreground hover:text-foreground hover:bg-destructive/10 h-10 w-10 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 max-w-7xl mx-auto w-full safe-area-x safe-area-bottom">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5 sm:space-y-6">
          {/* Clean Tabs Navigation */}
          <TabsList className="w-full h-auto p-1 bg-card/80 backdrop-blur-sm rounded-lg border border-border/60 grid grid-cols-5 gap-1">
            <TabsTrigger 
              value="overview" 
              className="flex items-center justify-center gap-1.5 rounded-md py-2.5 px-2 text-xs sm:text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tracking" 
              className="flex items-center justify-center gap-1.5 rounded-md py-2.5 px-2 text-xs sm:text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
            >
              <Radio className="w-4 h-4" />
              <span className="hidden sm:inline">Live</span>
            </TabsTrigger>
            <TabsTrigger 
              value="guards" 
              className="flex items-center justify-center gap-1.5 rounded-md py-2.5 px-2 text-xs sm:text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Guards</span>
            </TabsTrigger>
            <TabsTrigger 
              value="checkpoints" 
              className="flex items-center justify-center gap-1.5 rounded-md py-2.5 px-2 text-xs sm:text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
            >
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Points</span>
            </TabsTrigger>
            <TabsTrigger 
              value="logs" 
              className="flex items-center justify-center gap-1.5 rounded-md py-2.5 px-2 text-xs sm:text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-0">
            <DashboardStats stats={stats} />
            <ScanLogs limit={5} showFilters={false} />
          </TabsContent>

          <TabsContent value="tracking" className="mt-0">
            <LiveGuardMap />
          </TabsContent>

          <TabsContent value="guards" className="mt-0">
            <GuardManagement onUpdate={fetchStats} />
          </TabsContent>

          <TabsContent value="checkpoints" className="mt-0">
            <CheckpointManagement onUpdate={fetchStats} />
          </TabsContent>

          <TabsContent value="logs" className="mt-0">
            <ScanLogs showFilters={true} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
