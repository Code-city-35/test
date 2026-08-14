import { getSupabaseClient, isSupabaseReady, waitForSupabase } from './supabase-client.js';

export async function getQuests() {
    await waitForSupabase();
    if (!isSupabaseReady()) return [];
    try {
        const client = getSupabaseClient();
        const { data, error } = await client.from('quests').select('*').order('id');
        if (error) throw error;
        if (!data || data.length === 0) return [];
        const result = [];
        for (const q of data) {
            const { data: clues } = await client.from('clues').select('*').eq('quest_id', q.id).order('order_index');
            result.push({ ...q, clues: clues || [] });
        }
        return result;
    } catch (e) {
        return [];
    }
}

export async function getQuestById(id) {
    const quests = await getQuests();
    return quests.find(q => q.id === id) || null;
}

export async function getCluesByQuestId(questId) {
    await waitForSupabase();
    if (!isSupabaseReady()) return [];
    try {
        const client = getSupabaseClient();
        const { data } = await client.from('clues').select('*').eq('quest_id', questId).order('order_index');
        return data || [];
    } catch (e) {
        return [];
    }
}

export async function addQuest(questData) {
    await waitForSupabase();
    if (!isSupabaseReady()) throw new Error('Supabase не подключён');
    const client = getSupabaseClient();
    const { clues, ...questWithoutClues } = questData;
    const { data: quest, error } = await client.from('quests').insert([questWithoutClues]).select();
    if (error) throw error;
    const questId = quest[0].id;
    if (clues && clues.length > 0) {
        const cluesWithQuest = clues.map((c, i) => ({ ...c, quest_id: questId, order_index: i }));
        await client.from('clues').insert(cluesWithQuest);
    }
    return { ...quest[0], clues: clues || [] };
}

export async function updateQuest(id, questData) {
    await waitForSupabase();
    if (!isSupabaseReady()) throw new Error('Supabase не подключён');
    const client = getSupabaseClient();
    const { clues, ...questWithoutClues } = questData;
    await client.from('quests').update(questWithoutClues).eq('id', id);
    await client.from('clues').delete().eq('quest_id', id);
    if (clues && clues.length > 0) {
        const cluesWithQuest = clues.map((c, i) => ({ ...c, quest_id: id, order_index: i }));
        await client.from('clues').insert(cluesWithQuest);
    }
    return { ...questWithoutClues, id, clues: clues || [] };
}

export async function deleteQuest(id) {
    await waitForSupabase();
    if (!isSupabaseReady()) throw new Error('Supabase не подключён');
    const client = getSupabaseClient();
    await client.from('clues').delete().eq('quest_id', id);
    await client.from('quests').delete().eq('id', id);
    return true;
}

export function getBoxes() { return getQuests(); }
export function getBoxById(id) { return getQuestById(id); }
