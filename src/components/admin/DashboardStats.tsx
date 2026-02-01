import { motion } from 'framer-motion';
import { Users, MapPin, Scan, Target } from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    totalGuards: number;
    totalCheckpoints: number;
    todayScans: number;
    coveragePercent: number;
  };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const statItems = [
    {
      label: 'Active Guards',
      value: stats.totalGuards,
      icon: Users,
      iconBg: 'bg-blue-500/15',
      iconColor: 'text-blue-400',
    },
    {
      label: 'Checkpoints',
      value: stats.totalCheckpoints,
      icon: MapPin,
      iconBg: 'bg-purple-500/15',
      iconColor: 'text-purple-400',
    },
    {
      label: "Today's Scans",
      value: stats.todayScans,
      icon: Scan,
      iconBg: 'bg-primary/15',
      iconColor: 'text-primary',
    },
    {
      label: 'Coverage',
      value: `${stats.coveragePercent}%`,
      icon: Target,
      iconBg: stats.coveragePercent >= 80 
        ? 'bg-success/15' 
        : stats.coveragePercent >= 50 
        ? 'bg-primary/15' 
        : 'bg-destructive/15',
      iconColor: stats.coveragePercent >= 80 
        ? 'text-success' 
        : stats.coveragePercent >= 50 
        ? 'text-primary' 
        : 'text-destructive',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {statItems.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          className="bg-card border border-border/60 rounded-lg p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide font-medium">
                {stat.label}
              </p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 text-foreground">
                {stat.value}
              </p>
            </div>
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg ${stat.iconBg} flex items-center justify-center flex-shrink-0`}>
              <stat.icon className={`w-5 h-5 sm:w-5 sm:h-5 ${stat.iconColor}`} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}