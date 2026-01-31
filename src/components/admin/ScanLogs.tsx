import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import { 
  ClipboardList, Search, Download, Calendar, User, MapPin, 
  Loader2, CheckCircle2, Filter 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Scan, Checkpoint, Profile } from '@/types';

interface ScanLogsProps {
  limit?: number;
  showFilters?: boolean;
}

export function ScanLogs({ limit, showFilters = true }: ScanLogsProps) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [guards, setGuards] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    date: '',
    guardId: 'all',
    checkpointId: 'all',
    search: '',
  });

  useEffect(() => {
    fetchData();
  }, [filters.date, filters.guardId, filters.checkpointId]);

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch checkpoints
    const { data: checkpointsData } = await supabase
      .from('checkpoints')
      .select('*');
    if (checkpointsData) setCheckpoints(checkpointsData as Checkpoint[]);

    // Fetch guards (profiles with guard role)
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'guard');
    
    if (rolesData && rolesData.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', rolesData.map(r => r.user_id));
      if (profilesData) setGuards(profilesData as Profile[]);
    }

    // Build scans query
    let query = supabase
      .from('scans')
      .select('*')
      .order('scanned_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    if (filters.date) {
      const start = startOfDay(parseISO(filters.date));
      const end = endOfDay(parseISO(filters.date));
      query = query
        .gte('scanned_at', start.toISOString())
        .lte('scanned_at', end.toISOString());
    }

    if (filters.guardId !== 'all') {
      query = query.eq('guard_id', filters.guardId);
    }

    if (filters.checkpointId !== 'all') {
      query = query.eq('checkpoint_id', filters.checkpointId);
    }

    const { data: scansData } = await query;
    if (scansData) setScans(scansData as Scan[]);

    setIsLoading(false);
  };

  const exportCSV = () => {
    const headers = ['Guard Name', 'Checkpoint', 'Date/Time', 'Latitude', 'Longitude'];
    const rows = scans.map(scan => [
      scan.guard_name,
      scan.checkpoint_name,
      format(new Date(scan.scanned_at), 'yyyy-MM-dd HH:mm:ss'),
      scan.latitude || '',
      scan.longitude || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scan-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredScans = scans.filter(scan => 
    !filters.search || 
    scan.guard_name.toLowerCase().includes(filters.search.toLowerCase()) ||
    scan.checkpoint_name.toLowerCase().includes(filters.search.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Scan Logs</h2>
          <p className="text-sm sm:text-base text-muted-foreground">View all checkpoint scan records</p>
        </div>
        {showFilters && (
          <Button onClick={exportCSV} variant="outline" disabled={scans.length === 0} className="w-full sm:w-auto touch-feedback">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="glass-card p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9 h-10 sm:h-10"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                className="pl-9 h-10 sm:h-10"
              />
            </div>
            <Select
              value={filters.guardId}
              onValueChange={(value) => setFilters({ ...filters, guardId: value })}
            >
              <SelectTrigger className="h-10 sm:h-10">
                <User className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                <SelectValue placeholder="All Guards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Guards</SelectItem>
                {guards.map((guard) => (
                  <SelectItem key={guard.user_id} value={guard.user_id}>
                    {guard.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.checkpointId}
              onValueChange={(value) => setFilters({ ...filters, checkpointId: value })}
            >
              <SelectTrigger className="h-10 sm:h-10">
                <MapPin className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                <SelectValue placeholder="All Checkpoints" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Checkpoints</SelectItem>
                {checkpoints.map((cp) => (
                  <SelectItem key={cp.id} value={cp.id}>
                    {cp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredScans.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No scan records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="p-4 font-medium">Guard</th>
                  <th className="p-4 font-medium">Checkpoint</th>
                  <th className="p-4 font-medium">Date & Time</th>
                  <th className="p-4 font-medium hidden sm:table-cell">Location</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredScans.map((scan, index) => (
                  <motion.tr
                    key={scan.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">{scan.guard_name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {scan.checkpoint_name}
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {format(new Date(scan.scanned_at), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="p-4 text-muted-foreground hidden sm:table-cell">
                      {scan.latitude && scan.longitude ? (
                        <span className="text-xs">
                          {scan.latitude.toFixed(4)}, {scan.longitude.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium status-active">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
