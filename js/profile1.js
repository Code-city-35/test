// ============================================================
//  profile.js — профиль с авторизацией
// ============================================================

import { getSupabaseClient, waitForSupabase } from './supabase-client.js';
import { getCurrentUser, signOut, signIn, signUp } from './auth.js';

let supabase = null;
let currentUser = null;

// ============================================================
//  ЗАГРУЗКА СТРАНИЦЫ
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Ждём инициализацию Supabase
    await waitForSupabase();
    supabase = getSupabaseClient();

    if (!supabase) {
        document.getElementById('profileBlock').innerHTML = `
            <div style="text-align:center; padding:40px; color:var(--muted);">
                <p>⚠️ Ошибка подключения к базе данных</p>
            </div>
        `;
        return;
    }

    // Проверяем авторизацию
    currentUser = await getCurrentUser();

    if (currentUser) {
        // Пользователь авторизован — показываем профиль
        document.getElementById('authBlock').classList.remove('active');
        document.getElementById('profileBlock').classList.add('active');
        await loadProfile(currentUser.id);
    } else {
        // Пользователь не авторизован — показываем форму входа
        document.getElementById('authBlock').classList.add('active');
        document.getElementById('profileBlock').classList.remove('active');
        setupAuth();
    }
});

// ============================================================
//  НАСТРОЙКА ФОРМЫ ВХОДА/РЕГИСТРАЦИИ
// ============================================================
function setupAuth() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const emailInput = document.getElementById('authEmail');
    const passInput = document.getElementById('authPassword');
    const msg = document.getElementById('authMessage');

    if (!loginBtn || !registerBtn) return;

    loginBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passInput.value.trim();

        if (!email || !password) {
            msg.textContent = 'Заполните все поля';
            msg.style.color = '#ff6b6b';
            return;
        }

        const result = await signIn(email, password);
        if (result.success) {
            msg.textContent = '✅ Успешный вход!';
            msg.style.color = '#6fcf97';
            location.reload();
        } else {
            msg.textContent = '❌ ' + result.error;
            msg.style.color = '#ff6b6b';
        }
    });

    registerBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passInput.value.trim();

        if (!email || !password) {
            msg.textContent = 'Заполните все поля';
            msg.style.color = '#ff6b6b';
            return;
        }
        if (password.length < 6) {
            msg.textContent = 'Пароль минимум 6 символов';
            msg.style.color = '#ff6b6b';
            return;
        }

        const result = await signUp(email, password);
        if (result.success) {
            msg.textContent = '✅ Регистрация успешна! Войдите.';
            msg.style.color = '#6fcf97';
            // Автоматический вход после регистрации
            const loginResult = await signIn(email, password);
            if (loginResult.success) {
                location.reload();
            }
        } else {
            msg.textContent = '❌ ' + result.error;
            msg.style.color = '#ff6b6b';
        }
    });
}

// ============================================================
//  ЗАГРУЗКА ПРОФИЛЯ
// ============================================================
async function loadProfile(userId) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        renderProfile(profile);

        // Кнопка выхода
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await signOut();
                location.reload();
            });
        }

    } catch (e) {
        console.error('Ошибка загрузки профиля:', e);
        document.getElementById('profileBlock').innerHTML = `
            <div style="text-align:center; padding:40px; color:#ff6b6b;">
                <p>❌ Ошибка загрузки профиля</p>
                <p style="font-size:14px; color:var(--muted);">${e.message}</p>
            </div>
        `;
    }
}

// ============================================================
//  ОТОБРАЖЕНИЕ ПРОФИЛЯ
// ============================================================
function renderProfile(profile) {
    // Основные данные
    const username = document.getElementById('username');
    const researcherCode = document.getElementById('researcherCode');
    const level = document.getElementById('level');
    const xp = document.getElementById('xp');
    const xpNext = document.getElementById('xpNext');
    const xpBar = document.getElementById('xpBar');

    if (username) username.textContent = profile.username || 'Исследователь';
    if (researcherCode) researcherCode.textContent = profile.researcher_code || '--';
    if (level) level.textContent = profile.level || 1;
    if (xp) xp.textContent = profile.xp || 0;

    // XP прогресс
    const currentXp = profile.xp || 0;
    const nextLevelXp = (profile.level || 1) * 1000;
    const progressPercent = Math.min(100, (currentXp / nextLevelXp) * 100);

    if (xpNext) xpNext.textContent = nextLevelXp;
    if (xpBar) xpBar.style.width = progressPercent + '%';

    // Прогресс-блок (дублируем)
    const rankNumber = document.getElementById('rankNumber');
    const xpCurrent = document.getElementById('xpCurrent');
    const xpMax = document.getElementById('xpMax');
    const xpProgress = document.getElementById('xpProgress');
    const xpToNext = document.getElementById('xpToNext');

    if (rankNumber) rankNumber.textContent = profile.level || 1;
    if (xpCurrent) xpCurrent.textContent = currentXp + ' XP';
    if (xpMax) xpMax.textContent = nextLevelXp + ' XP';
    if (xpProgress) xpProgress.style.width = progressPercent + '%';
    if (xpToNext) xpToNext.textContent = (nextLevelXp - currentXp) + ' XP';

    // Статистика (заглушки, потом можно заменить реальными данными)
    const quests = document.getElementById('quests');
    const nodes = document.getElementById('nodes');
    const codes = document.getElementById('codes');
    const time = document.getElementById('time');

    if (quests) quests.textContent = '0';
    if (nodes) nodes.textContent = '0';
    if (codes) codes.textContent = '0';
    if (time) time.textContent = '00:00:00';

    // Достижения (заглушка)
    const achievements = document.getElementById('achievements');
    if (achievements) {
        achievements.innerHTML = `
            <div class="achievement locked">
                <div class="badge">🔒</div>
                <b>Нет достижений</b>
                <p>Проходите квесты, чтобы открывать</p>
            </div>
        `;
    }

    // Маршруты (заглушка)
    const routes = document.getElementById('routes');
    if (routes) {
        routes.innerHTML = `
            <div class="route-card panel">
                <p style="color:var(--muted);">Нет пройденных маршрутов</p>
            </div>
        `;
    }

    // Активность (заглушка)
    const activity = document.getElementById('activity');
    if (activity) {
        activity.innerHTML = `
            <div class="activity-item">
                <p style="color:var(--muted);">Нет недавней активности</p>
            </div>
        `;
    }

    // Сохранённые (заглушка)
    const saved = document.getElementById('saved');
    if (saved) {
        saved.innerHTML = `
            <div class="saved-card panel">
                <span>⭐</span>
                <h3>Нет сохранённых квестов</h3>
                <p>Добавляйте квесты в избранное</p>
            </div>
        `;
    }
}
