// Supabase конфигурация
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// Инициализация Supabase клиента
const { createClient } = window.supabase;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    },
    realtime: {
        params: {
            eventsPerSecond: 2
        }
    }
});

// Глобальные переменные
window.supabaseClient = supabase;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
