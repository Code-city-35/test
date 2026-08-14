import { getSupabaseClient, isSupabaseReady, waitForSupabase } from './supabase-client.js';

export async function getNews() {
    await waitForSupabase();
    if (!isSupabaseReady()) return [];
    try {
        const client = getSupabaseClient();
        const { data } = await client.from('news').select('*').order('date', { ascending: false });
        return data || [];
    } catch (e) {
        return [];
    }
}

export async function getLatestNews() {
    const news = await getNews();
    return news.length > 0 ? news[0] : null;
}

export async function addNews(item) {
    await waitForSupabase();
    if (!isSupabaseReady()) throw new Error('Supabase не подключён');
    const client = getSupabaseClient();
    const { data, error } = await client.from('news').insert([item]).select();
    if (error) throw error;
    return data[0];
}

export async function updateNews(id, updates) {
    await waitForSupabase();
    if (!isSupabaseReady()) throw new Error('Supabase не подключён');
    const client = getSupabaseClient();
    const { data, error } = await client.from('news').update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0];
}

export async function deleteNews(id) {
    await waitForSupabase();
    if (!isSupabaseReady()) throw new Error('Supabase не подключён');
    const client = getSupabaseClient();
    await client.from('news').delete().eq('id', id);
    return true;
}
