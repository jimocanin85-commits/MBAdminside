import { useState, useEffect } from 'react';
import { functions } from '@/integrations/api/client';
import { toast } from 'sonner';

export interface Trainer {
  id?: number;
  navn: string;
  email: string;
  telefon: string;
  foedselsdato: Date;
  aargang: string;
  rolle: string;
  kontaktperson: string;
  createdAt: Date;
  excelData?: any;
}

export function useTrainers() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrainers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: apiError } = await functions.invoke('trainers', {
        method: 'GET'
      });

      if (apiError) {
        throw new Error(typeof apiError === 'object' && apiError !== null && 'message' in apiError 
          ? String(apiError.message) 
          : String(apiError));
      }

      if (data?.success && Array.isArray(data.data)) {
        // Convert date strings to Date objects
        const trainersWithDates = data.data.map((trainer: any) => ({
          ...trainer,
          foedselsdato: new Date(trainer.foedselsdato),
          createdAt: new Date(trainer.createdAt || trainer.created_at)
        }));
        setTrainers(trainersWithDates);
      } else {
        // Fallback to localStorage if database not available
        const saved = localStorage.getItem('trainers');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const trainersWithDates = parsed.map((trainer: any) => ({
              ...trainer,
              foedselsdato: new Date(trainer.foedselsdato),
              createdAt: new Date(trainer.createdAt)
            }));
            setTrainers(trainersWithDates);
          } catch (e) {
            setTrainers([]);
          }
        } else {
          setTrainers([]);
        }
      }
    } catch (err) {
      console.error('Error loading trainers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trainers');
      
      // Fallback to localStorage
      const saved = localStorage.getItem('trainers');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const trainersWithDates = parsed.map((trainer: any) => ({
            ...trainer,
            foedselsdato: new Date(trainer.foedselsdato),
            createdAt: new Date(trainer.createdAt)
          }));
          setTrainers(trainersWithDates);
        } catch (e) {
          setTrainers([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const addTrainer = async (trainer: Trainer) => {
    try {
      const { data, error: apiError } = await functions.invoke('trainers', {
        method: 'POST',
        body: trainer
      });

      if (apiError) {
        throw new Error(typeof apiError === 'object' && apiError !== null && 'message' in apiError 
          ? String(apiError.message) 
          : String(apiError));
      }

      if (data?.success) {
        const newTrainer = {
          ...data.data,
          foedselsdato: new Date(data.data.foedselsdato),
          createdAt: new Date(data.data.createdAt || data.data.created_at)
        };
        setTrainers(prev => [...prev, newTrainer]);
        
        // Also save to localStorage as backup
        localStorage.setItem('trainers', JSON.stringify([...trainers, newTrainer]));
        
        return newTrainer;
      }
      throw new Error('Failed to create trainer');
    } catch (err) {
      console.error('Error adding trainer:', err);
      toast.error('Kunne ikke tilføje træner');
      throw err;
    }
  };

  const updateTrainer = async (id: number, updates: Partial<Trainer>) => {
    try {
      const { data, error: apiError } = await functions.invoke('trainers', {
        method: 'PUT',
        body: { ...updates, id }
      });

      if (apiError) {
        throw new Error(typeof apiError === 'object' && apiError !== null && 'message' in apiError 
          ? String(apiError.message) 
          : String(apiError));
      }

      if (data?.success) {
        const updated = {
          ...data.data,
          foedselsdato: new Date(data.data.foedselsdato),
          createdAt: new Date(data.data.createdAt || data.data.created_at)
        };
        setTrainers(prev => prev.map(t => t.id === id ? updated : t));
        
        // Also update localStorage as backup
        const updatedList = trainers.map(t => t.id === id ? updated : t);
        localStorage.setItem('trainers', JSON.stringify(updatedList));
        
        return updated;
      }
      throw new Error('Failed to update trainer');
    } catch (err) {
      console.error('Error updating trainer:', err);
      toast.error('Kunne ikke opdatere træner');
      throw err;
    }
  };

  const deleteTrainer = async (id: number) => {
    try {
      const { data, error: apiError } = await functions.invoke('trainers', {
        method: 'DELETE',
        body: { id }
      });

      if (apiError) {
        throw new Error(typeof apiError === 'object' && apiError !== null && 'message' in apiError 
          ? String(apiError.message) 
          : String(apiError));
      }

      setTrainers(prev => prev.filter(t => t.id !== id));
      
      // Also update localStorage as backup
      const filtered = trainers.filter(t => t.id !== id);
      localStorage.setItem('trainers', JSON.stringify(filtered));
      
      return true;
    } catch (err) {
      console.error('Error deleting trainer:', err);
      toast.error('Kunne ikke slette træner');
      throw err;
    }
  };

  useEffect(() => {
    loadTrainers();
  }, []);

  return {
    trainers,
    loading,
    error,
    loadTrainers,
    addTrainer,
    updateTrainer,
    deleteTrainer
  };
}
