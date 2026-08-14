// ============================================================
//  auth.js — авторизация через Supabase (email + password)
// ============================================================

import { getSupabaseClient, waitForSupabase } from './supabase-client.js';

let supabase = null;

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ КЛИЕНТА (вызывается при первом импорте)
// ============================================================
async function initAuth() {
    if (supabase) return supabase;
    await waitForSupabase();
    supabase = getSupabaseClient();
    return supabase;
}

// ============================================================
//  РЕГИСТРАЦИЯ
// ============================================================
export async function signUp(email, password, username = '') {
    await initAuth();
    if (!supabase) {
        return { success: false, error: 'Supabase не инициализирован' };
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username: username || email.split('@')[0] }
            }
        });

        if (error) throw error;
        return { success: true, user: data.user };
    } catch (e) {
        console.error('Ошибка регистрации:', e.message);
        return { success: false, error: e.message };
    }
}

// ============================================================
//  ВХОД
// ============================================================
export async function signIn(email, password) {
    await initAuth();
    if (!supabase) {
        return { success: false, error: 'Supabase не инициализирован' };
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        return { success: true, user: data.user, session: data.session };
    } catch (e) {
        console.error('Ошибка входа:', e.message);
        return { success: false, error: e.message };
    }
}

// ============================================================
//  ВЫХОД
// ============================================================
export async function signOut() {
    await initAuth();
    if (!supabase) return { success: false, error: 'Supabase не инициализирован' };

    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (e) {
        console.error('Ошибка выхода:', e.message);
        return { success: false, error: e.message };
    }
}

// ============================================================
//  ПОЛУЧИТЬ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
// ============================================================
export async function getCurrentUser() {
    await initAuth();
    if (!supabase) return null;

    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return null;
        return user;
    } catch (e) {
        console.error('Ошибка получения пользователя:', e.message);
        return null;
    }
}

// ============================================================
//  ПРОВЕРКА, ЯВЛЯЕТСЯ ЛИ ПОЛЬЗОВАТЕЛЬ АДМИНИСТРАТОРОМ
// ============================================================
export async function isAdmin() {
    const user = await getCurrentUser();
    if (!user) return false;

    await initAuth();
    if (!supabase) return false;

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (error) throw error;
        return profile?.is_admin === true;
    } catch (e) {
        console.error('Ошибка проверки прав администратора:', e.message);
        return false;
    }
}