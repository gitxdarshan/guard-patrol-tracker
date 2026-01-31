import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Users, QrCode, MapPin, ClipboardList, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: QrCode,
    title: 'QR-Based Scanning',
    description: 'Guards scan checkpoints using their mobile camera',
  },
  {
    icon: MapPin,
    title: 'GPS Tracking',
    description: 'Optional location data for each scan',
  },
  {
    icon: ClipboardList,
    title: 'Real-time Logs',
    description: 'Instant visibility into patrol activity',
  },
  {
    icon: Users,
    title: 'Guard Management',
    description: 'Create and manage security personnel',
  },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col safe-area-top">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div 
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(25 95% 55% / 0.4), transparent 70%)' }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-3xl space-y-6 sm:space-y-8 px-2"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center glow-primary"
          >
            <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-primary-foreground" />
          </motion.div>

          {/* Title */}
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="text-gradient-primary">Guard Patrol</span>
              <br />
              <span className="text-foreground">Security System</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl mx-auto px-2">
              QR-based checkpoint verification for security teams. 
              Track patrols, verify coverage, and ensure safety.
            </p>
          </div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              size="lg"
              onClick={() => navigate('/login')}
              className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg font-semibold bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity group touch-feedback"
            >
              Get Started
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="relative z-10 mt-8 sm:mt-16 w-full max-w-4xl px-2 safe-area-x"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="glass-card p-3 sm:p-5 text-left hover-lift touch-feedback"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-2 sm:mb-3">
                  <feature.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-xs sm:text-sm">{feature.title}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="p-4 sm:p-6 text-center safe-area-bottom">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Secure checkpoint verification system
        </p>
      </footer>
    </div>
  );
}
