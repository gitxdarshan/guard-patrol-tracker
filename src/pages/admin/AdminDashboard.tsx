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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-card rounded-none border-x-0 border-t-0 p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-foreground">Guard Patrol Admin</p>
              <p className="text-sm text-muted-foreground">{profile?.full_name}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={signOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass-card p-1 w-full sm:w-auto grid grid-cols-5 sm:flex gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ClipboardList className="w-4 h-4 mr-2 hidden sm:block" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tracking" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Radio className="w-4 h-4 mr-2 hidden sm:block" />
              Live
            </TabsTrigger>
            <TabsTrigger value="guards" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2 hidden sm:block" />
              Guards
            </TabsTrigger>
            <TabsTrigger value="checkpoints" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MapPin className="w-4 h-4 mr-2 hidden sm:block" />
              Checkpoints
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ClipboardList className="w-4 h-4 mr-2 hidden sm:block" />
              Logs
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
