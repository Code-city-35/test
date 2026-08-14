const SUPABASE_URL = 'https://gyjdhxknzijscmjfehbm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Iy1IDODIWq4HW24ncRGUdA_dT944nP4';

let supabaseClient = null;
let useSupabase = false;
let clientReady = false;
const readyCallbacks = [];

function initSupabase() {
    if (clientReady) return;
    if (!SUPABASE_URL || SUPABASE_URL === 'https://твой-проект.supabase.co') {
        clientReady = true;
        return;
    }

    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        useSupabase = true;
        clientReady = true;
        readyCallbacks.forEach(cb => cb());
        return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = () => {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        useSupabase = true;
        clientReady = true;
        readyCallbacks.forEach(cb => cb());
    };
    script.onerror = () => {
        clientReady = true;
        readyCallbacks.forEach(cb => cb());
    };
    document.head.appendChild(script);
}

initSupabase();

export function getSupabaseClient() {
    return supabaseClient;
}
export function isSupabaseReady() {
    return useSupabase && clientReady && supabaseClient !== null;
}
export function waitForSupabase() {
    return new Promise((resolve) => {
        if (clientReady) resolve();
        else readyCallbacks.push(resolve);
    });
}
