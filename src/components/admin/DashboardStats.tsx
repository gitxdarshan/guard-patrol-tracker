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
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      label: 'Checkpoints',
      value: stats.totalCheckpoints,
      icon: MapPin,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
    {
      label: "Today's Scans",
      value: stats.todayScans,
      icon: Scan,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Coverage',
      value: `${stats.coveragePercent}%`,
      icon: Target,
      color: stats.coveragePercent >= 80 ? 'text-success' : stats.coveragePercent >= 50 ? 'text-primary' : 'text-destructive',
      bgColor: stats.coveragePercent >= 80 ? 'bg-success/10' : stats.coveragePercent >= 50 ? 'bg-primary/10' : 'bg-destructive/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      {statItems.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="glass-card p-3 sm:p-5 hover-lift touch-feedback"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{stat.label}</p>
              <p className="text-xl sm:text-3xl font-bold mt-0.5 sm:mt-1">{stat.value}</p>
            </div>
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${stat.bgColor} flex items-center justify-center flex-shrink-0`}>
              <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
