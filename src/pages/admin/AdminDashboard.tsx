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
    <div className="min-h-screen flex flex-col safe-area-top">
      {/* Header */}
      <header className="glass-card rounded-none border-x-0 border-t-0 p-3 sm:p-4 sticky top-0 z-50 safe-area-x">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground text-sm sm:text-base truncate">Guard Patrol</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{profile?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <InstallButton />
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-foreground touch-feedback h-9 w-9 sm:h-10 sm:w-10">
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full safe-area-x safe-area-bottom">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="glass-card p-1 w-full grid grid-cols-5 gap-0.5 sm:gap-1 h-auto">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2.5 sm:py-2 px-1 sm:px-3 touch-feedback">
              <ClipboardList className="w-4 h-4 sm:mr-2 hidden sm:block" />
              <span className="sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="tracking" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2.5 sm:py-2 px-1 sm:px-3 touch-feedback">
              <Radio className="w-4 h-4 sm:mr-2 hidden sm:block" />
              <span className="sm:inline">Live</span>
            </TabsTrigger>
            <TabsTrigger value="guards" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2.5 sm:py-2 px-1 sm:px-3 touch-feedback">
              <Users className="w-4 h-4 sm:mr-2 hidden sm:block" />
              <span className="sm:inline">Guards</span>
            </TabsTrigger>
            <TabsTrigger value="checkpoints" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2.5 sm:py-2 px-1 sm:px-3 touch-feedback">
              <MapPin className="w-4 h-4 sm:mr-2 hidden sm:block" />
              <span className="sm:inline">Points</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2.5 sm:py-2 px-1 sm:px-3 touch-feedback">
              <ClipboardList className="w-4 h-4 sm:mr-2 hidden sm:block" />
              <span className="sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <DashboardStats stats={stats} />
            <ScanLogs limit={5} showFilters={false} />
          </TabsContent>

          <TabsContent value="tracking">
            <LiveGuardMap />
          </TabsContent>

          <TabsContent value="guards">
            <GuardManagement onUpdate={fetchStats} />
          </TabsContent>

          <TabsContent value="checkpoints">
            <CheckpointManagement onUpdate={fetchStats} />
          </TabsContent>

          <TabsContent value="logs">
            <ScanLogs showFilters={true} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
