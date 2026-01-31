import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, User, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Profile, UserRole } from '@/types';

interface GuardWithRole extends Profile {
  role?: string;
}

interface GuardManagementProps {
  onUpdate: () => void;
}

export function GuardManagement({ onUpdate }: GuardManagementProps) {
  const [guards, setGuards] = useState<GuardWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGuard, setNewGuard] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchGuards();
  }, []);

  const fetchGuards = async () => {
    setIsLoading(true);
    try {
      // Get all guard roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'guard');

      if (!roles || roles.length === 0) {
        setGuards([]);
        setIsLoading(false);
        return;
      }

      // Get profiles for these guards
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profiles) {
        const guardsWithRoles = profiles.map(p => ({
          ...p,
          role: 'guard',
        })) as GuardWithRole[];
        setGuards(guardsWithRoles);
      }
    } catch (err) {
      console.error('Error fetching guards:', err);
    }
    setIsLoading(false);
  };

  const createGuard = async () => {
    setIsCreating(true);
    setError('');

    try {
      // Create auth user via edge function (to be created)
      // For now, we'll use admin API through edge function
      const response = await supabase.functions.invoke('create-guard', {
        body: {
          email: newGuard.email,
          password: newGuard.password,
          fullName: newGuard.fullName,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: 'Guard Created',
        description: `${newGuard.fullName} has been added successfully`,
      });

      setNewGuard({ fullName: '', email: '', password: '' });
      setDialogOpen(false);
      fetchGuards();
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to create guard');
    }
    setIsCreating(false);
  };

  const deleteGuard = async (userId: string, name: string) => {
    try {
      // Delete via edge function
      const response = await supabase.functions.invoke('delete-guard', {
        body: { userId },
      });

      if (response.error) throw response.error;

      toast({
        title: 'Guard Removed',
        description: `${name} has been removed`,
      });

      fetchGuards();
      onUpdate();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete guard',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Guard Management</h2>
          <p className="text-muted-foreground">Create and manage security guards</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-glow">
              <Plus className="w-4 h-4 mr-2" />
              Add Guard
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border">
            <DialogHeader>
              <DialogTitle>Create New Guard</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="John Smith"
                  value={newGuard.fullName}
                  onChange={(e) => setNewGuard({ ...newGuard, fullName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="guard@company.com"
                  value={newGuard.email}
                  onChange={(e) => setNewGuard({ ...newGuard, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newGuard.password}
                  onChange={(e) => setNewGuard({ ...newGuard, password: e.target.value })}
                />
              </div>
              <Button
                onClick={createGuard}
                disabled={isCreating || !newGuard.fullName || !newGuard.email || !newGuard.password}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Guard'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Guards List */}
      <div className="glass-card p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : guards.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No guards added yet</p>
            <p className="text-sm text-muted-foreground">Click "Add Guard" to create one</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {guards.map((guard, index) => (
                <motion.div
                  key={guard.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{guard.full_name}</p>
                      <p className="text-sm text-muted-foreground">Guard</p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Guard?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove {guard.full_name} and all their scan records.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteGuard(guard.user_id, guard.full_name)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
