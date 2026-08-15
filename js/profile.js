// ============================================================
//  profile.js — профиль с уникальными завершёнными квестами
// ============================================================

import { getSupabaseClient, waitForSupabase } from './supabase-client.js';
import { getCurrentUser, signOut, signIn, signUp } from './auth.js';

let supabase = null;
let currentUser = null;

// ============================================================
//  ЗАГРУЗКА СТРАНИЦЫ
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
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

    currentUser = await getCurrentUser();

    if (currentUser) {
        document.getElementById('authBlock').classList.remove('active');
        document.getElementById('profileBlock').classList.add('active');
        await loadProfile(currentUser.id);
    } else {
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
//  ЗАГРУЗКА ПРОФИЛЯ И СТАТИСТИКИ
// ============================================================
async function loadProfile(userId) {
    try {
        // 1. Основной профиль
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        // 2. УНИКАЛЬНЫЕ ЗАВЕРШЁННЫЕ КВЕСТЫ (только по одному разу на quest_id)
        const { data: completedData, error: completedError } = await supabase
            .from('quest_attempts')
            .select('quest_id')
            .eq('user_id', userId)
            .eq('status', 'completed');

        if (completedError) throw completedError;

        // Собираем уникальные quest_id
        const uniqueQuestIds = new Set();
        if (completedData) {
            completedData.forEach(row => uniqueQuestIds.add(row.quest_id));
        }
        const completedQuests = uniqueQuestIds.size;
        console.log('Уникальных завершённых квестов:', completedQuests);

        // 3. Все попытки для получения ID и расчёта статистики
        const { data: attempts } = await supabase
            .from('quest_attempts')
            .select('id, play_time_seconds, status, quest_id, started_at, completed_at, current_clue_index')
            .eq('user_id', userId)
            .order('started_at', { ascending: false });

        const attemptIds = attempts ? attempts.map(a => a.id) : [];

        // 4. Количество решённых кодов
        let solvedCodes = 0;
        if (attemptIds.length > 0) {
            const { count: codes } = await supabase
                .from('clue_progress')
                .select('*', { count: 'exact', head: true })
                .in('attempt_id', attemptIds)
                .eq('code_solved', true);
            solvedCodes = codes || 0;
        }

        // 5. Количество пройденных улик (ответы решены)
        let solvedAnswers = 0;
        if (attemptIds.length > 0) {
            const { count: answers } = await supabase
                .from('clue_progress')
                .select('*', { count: 'exact', head: true })
                .in('attempt_id', attemptIds)
                .eq('answer_solved', true);
            solvedAnswers = answers || 0;
        }

        // 6. Общее время в игре
        let totalTime = 0;
        if (attempts) {
            totalTime = attempts.reduce((sum, a) => sum + (a.play_time_seconds || 0), 0);
        }

        // 7. Достижения пользователя
        const { data: userAchievements } = await supabase
            .from('user_achievements')
            .select('*, achievements(*)')
            .eq('user_id', userId);

        // 8. Последние маршруты
        const recentAttempts = attempts ? attempts.slice(0, 5) : [];

        // 9. Активность
        const activities = attempts ? attempts.slice(0, 5) : [];

        // Отображаем всё
        renderProfile(profile, {
            completedQuests: completedQuests || 0,
            solvedCodes: solvedCodes || 0,
            solvedAnswers: solvedAnswers || 0,
            totalTime: totalTime,
            userAchievements: userAchievements || [],
            recentAttempts: recentAttempts,
            activities: activities
        });

        // Кнопка выхода
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await signOut();
                location.reload();
            });
        }

        // Ссылка на админку
        const adminLinkContainer = document.getElementById('adminLinkPlaceholder');
        if (adminLinkContainer) {
            if (profile.is_admin) {
                adminLinkContainer.innerHTML = `
                    <a href="admin.html" class="btn btn-secondary" style="border-color: var(--accent); color: var(--accent);">⚙️ Админ-панель</a>
                `;
            } else {
                adminLinkContainer.innerHTML = '';
            }
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
function renderProfile(profile, stats) {
    // --- ОСНОВНАЯ ИНФОРМАЦИЯ ---
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

    const currentXp = profile.xp || 0;
    const nextLevelXp = (profile.level || 1) * 1000;
    const progressPercent = Math.min(100, (currentXp / nextLevelXp) * 100);

    if (xpNext) xpNext.textContent = nextLevelXp;
    if (xpBar) xpBar.style.width = progressPercent + '%';

    // --- ПРОГРЕСС-БЛОК ---
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

    // --- СТАТИСТИКА ---
    const quests = document.getElementById('quests');
    const nodes = document.getElementById('nodes');
    const codes = document.getElementById('codes');
    const time = document.getElementById('time');

    if (quests) quests.textContent = stats.completedQuests || 0;
    if (nodes) nodes.textContent = stats.solvedAnswers || 0;
    if (codes) codes.textContent = stats.solvedCodes || 0;
    if (time) time.textContent = formatTime(stats.totalTime || 0);

    // --- ДОСТИЖЕНИЯ ---
    const achievementsContainer = document.getElementById('achievements');
    if (achievementsContainer) {
        const userAch = stats.userAchievements || [];
        if (userAch.length === 0) {
            achievementsContainer.innerHTML = `
                <div class="achievement locked">
                    <div class="badge">🔒</div>
                    <b>Нет достижений</b>
                    <p>Проходите квесты, чтобы открывать</p>
                </div>
            `;
        } else {
            let html = '';
            userAch.forEach(item => {
                const ach = item.achievements;
                const unlocked = item.unlocked_at !== null;
                html += `
                    <div class="achievement ${unlocked ? '' : 'locked'}">
                        <div class="badge">${ach.icon || '🏆'}</div>
                        <b>${ach.name}</b>
                        <p>${ach.description || ''}</p>
                        ${unlocked ? `<small>✅ РАЗБЛОКИРОВАНО</small>` : `<small>🔒 ${item.progress} / ${ach.condition_value || 1}</small>`}
                    </div>
                `;
            });
            achievementsContainer.innerHTML = html;
        }
    }

    // --- ПОСЛЕДНИЕ МАРШРУТЫ ---
    const routesContainer = document.getElementById('routes');
    if (routesContainer) {
        const attempts = stats.recentAttempts || [];
        if (attempts.length === 0) {
            routesContainer.innerHTML = `
                <div class="route-card panel">
                    <p style="color:var(--muted);">Нет пройденных маршрутов</p>
                </div>
            `;
        } else {
            let html = '';
            attempts.forEach(attempt => {
                const statusText = attempt.status === 'completed' ? '✅ Завершён' : '🔄 В процессе';
                html += `
                    <div class="route-card panel">
                        <div>
                            <h3>Квест #${attempt.quest_id || '?'}</h3>
                            <p>${statusText}</p>
                            <div class="route-meta">${formatTime(attempt.play_time_seconds || 0)}</div>
                        </div>
                        <div class="route-progress">
                            <strong>${attempt.current_clue_index || 0} улик</strong>
                            <span>${new Date(attempt.started_at).toLocaleDateString('ru-RU')}</span>
                        </div>
                    </div>
                `;
            });
            routesContainer.innerHTML = html;
        }
    }

    // --- АКТИВНОСТЬ ---
    const activityContainer = document.getElementById('activity');
    if (activityContainer) {
        const activities = stats.activities || [];
        if (activities.length === 0) {
            activityContainer.innerHTML = `
                <div class="activity-item">
                    <p style="color:var(--muted);">Нет недавней активности</p>
                </div>
            `;
        } else {
            let html = '';
            activities.slice(0, 5).forEach(attempt => {
                const date = new Date(attempt.started_at).toLocaleDateString('ru-RU');
                const action = attempt.status === 'completed' ? 'Завершил квест' : 'Начал квест';
                html += `
                    <div class="activity-item">
                        <div class="activity-dot"></div>
                        <div>
                            <b>${action}</b>
                            <p>Квест #${attempt.quest_id || '?'}</p>
                        </div>
                        <time>${date}</time>
                    </div>
                `;
            });
            activityContainer.innerHTML = html;
        }
    }

    // --- СОХРАНЁННЫЕ КВЕСТЫ (заглушка) ---
    const savedContainer = document.getElementById('saved');
    if (savedContainer) {
        savedContainer.innerHTML = `
            <div class="saved-card panel">
                <span>⭐</span>
                <h3>Нет сохранённых квестов</h3>
                <p>Добавляйте квесты в избранное</p>
            </div>
        `;
    }
}

// ============================================================
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================
function formatTime(seconds) {
    if (!seconds) return '00:00:00';
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}
