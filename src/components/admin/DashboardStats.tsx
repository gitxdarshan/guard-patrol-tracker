import { motion } from 'framer-motion';
import { Users, MapPin, Scan, Target, TrendingUp, TrendingDown } from 'lucide-react';

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
      gradient: 'from-blue-500/20 to-blue-600/10',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/20',
    },
    {
      label: 'Checkpoints',
      value: stats.totalCheckpoints,
      icon: MapPin,
      gradient: 'from-purple-500/20 to-purple-600/10',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-500/20',
    },
    {
      label: "Today's Scans",
      value: stats.todayScans,
      icon: Scan,
      gradient: 'from-primary/20 to-primary/10',
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
      borderColor: 'border-primary/20',
    },
    {
      label: 'Coverage',
      value: `${stats.coveragePercent}%`,
      icon: Target,
      gradient: stats.coveragePercent >= 80 
        ? 'from-success/20 to-success/10' 
        : stats.coveragePercent >= 50 
        ? 'from-primary/20 to-primary/10' 
        : 'from-destructive/20 to-destructive/10',
      iconBg: stats.coveragePercent >= 80 
        ? 'bg-success/20' 
        : stats.coveragePercent >= 50 
        ? 'bg-primary/20' 
        : 'bg-destructive/20',
      iconColor: stats.coveragePercent >= 80 
        ? 'text-success' 
        : stats.coveragePercent >= 50 
        ? 'text-primary' 
        : 'text-destructive',
      borderColor: stats.coveragePercent >= 80 
        ? 'border-success/20' 
        : stats.coveragePercent >= 50 
        ? 'border-primary/20' 
        : 'border-destructive/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {statItems.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
          className={`relative overflow-hidden rounded-xl border ${stat.borderColor} bg-gradient-to-br ${stat.gradient} backdrop-blur-sm p-4 sm:p-5 hover:scale-[1.02] transition-all duration-300 cursor-default`}
        >
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground/80 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {stat.value}
              </p>
            </div>
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${stat.iconBg} flex items-center justify-center flex-shrink-0 shadow-lg`}>
              <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.iconColor}`} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}