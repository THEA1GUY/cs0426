import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  name: string;
  department: string;
  job_title: string;
  role: 'new_employee' | 'department_head' | 'admin';
  skill_set: string[];
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
      setLoading(false);
    }

    fetchProfile();
  }, [userId]);

  return { profile, loading };
}
