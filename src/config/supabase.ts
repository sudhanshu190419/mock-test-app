import {createClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://ztxhiuxftoaxatfxviql.supabase.co';
const supabaseAnonKey = 'sb_publishable_iTehfjhGI-S-C8Ff0TRd5w_E6-quYlX';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);