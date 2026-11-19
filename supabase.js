import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';


const SUPABASE_URL = 'https://grdnedgajbyvnjgthgmn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fzfIkVQU17ZdxtRk-OXjlg_XlyK0mO9';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);