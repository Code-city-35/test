// ============================================================
//  admin.js — админка (только для авторизованных администраторов)
// ============================================================

import { getSupabaseClient, waitForSupabase } from './supabase-client.js';
import { getCurrentUser, signOut } from './auth.js';
import { getQuests, addQuest, updateQuest, deleteQuest, getQuestById, getCluesByQuestId } from './quests-data.js';
import { getNews, addNews, updateNews, deleteNews } from './news-data.js';

let supabase = null;
let editingQuestId = null;
let editingNewsId = null;

// ============================================================
//  ЗАГРУЗКА СТРАНИЦЫ
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    await waitForSupabase();
    supabase = getSupabaseClient();
    if (!supabase) {
        document.getElementById('adminContent').innerHTML = `
            <div style="text-align:center; padding:40px; color:var(--muted);">
                <p>⚠️ Ошибка подключения к базе данных</p>
            </div>
        `;
        return;
    }

    const user = await getCurrentUser();
    if (!user) {
        showAccessDenied('Для доступа к админке необходимо войти.');
        return;
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (error || !profile?.is_admin) {
        showAccessDenied('У вас нет прав администратора.');
        return;
    }

    renderAdminPanel();
});

function showAccessDenied(message) {
    document.getElementById('adminContent').innerHTML = `
        <div style="max-width:500px; margin:60px auto; padding:40px; background:var(--bg-card); border:1px solid var(--border); text-align:center; border-radius:12px;">
            <h2 style="color:var(--accent);">🚫 Доступ запрещён</h2>
            <p style="color:var(--muted); margin:16px 0;">${message}</p>
            <a href="index.html" class="btn btn-primary">На главную</a>
        </div>
    `;
}

// ============================================================
//  ПАНЕЛЬ УПРАВЛЕНИЯ
// ============================================================
function renderAdminPanel() {
    const container = document.getElementById('adminContent');
    container.innerHTML = `
        <div class="admin-panel">
            <div class="admin-toolbar">
                <h3 style="color:var(--accent);">⚙️ Админ-панель</h3>
                <div>
                    <button id="tabQuestsBtn" class="terminal-btn">📋 Квесты</button>
                    <button id="tabNewsBtn" class="terminal-btn">📰 Новости</button>
                    <button id="logoutBtn" class="terminal-btn danger">🚪 Выйти</button>
                </div>
            </div>
            <div id="adminTabContent"></div>
        </div>
    `;

    document.getElementById('tabQuestsBtn').addEventListener('click', () => switchTab('quests'));
    document.getElementById('tabNewsBtn').addEventListener('click', () => switchTab('news'));
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await signOut();
        location.reload();
    });

    switchTab('quests');
}

async function switchTab(tab) {
    const container = document.getElementById('adminTabContent');
    if (tab === 'quests') {
        await renderQuestsAdmin(container);
    } else if (tab === 'news') {
        await renderNewsAdmin(container);
    }
}

// ============================================================
//  КВЕСТЫ
// ============================================================
async function renderQuestsAdmin(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
            <h3 style="color:#fff;">📋 Квесты</h3>
            <button id="addQuestBtn" class="terminal-btn">➕ Добавить квест</button>
        </div>
        <div id="questList"></div>
    `;
    document.getElementById('addQuestBtn').addEventListener('click', () => openQuestModal());
    await loadQuestsList();
}

async function loadQuestsList() {
    const list = document.getElementById('questList');
    try {
        const quests = await getQuests();
        if (!quests || quests.length === 0) {
            list.innerHTML = `<p style="color:#5a6a80;">Нет квестов. Добавьте первый!</p>`;
            return;
        }
        let html = '';
        quests.forEach(q => {
            const count = q.clues ? q.clues.length : 0;
            html += `
                <div class="admin-item">
                    <div class="info">
                        <div class="title">${q.title}</div>
                        <div class="sub">${count} улик · ${q.is_paid ? q.price + ' ₽' : 'Бесплатно'}</div>
                    </div>
                    <div class="actions">
                        <button class="edit-quest" data-id="${q.id}">✏️</button>
                        <button class="delete-quest danger" data-id="${q.id}">🗑️</button>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
        list.querySelectorAll('.edit-quest').forEach(btn => {
            btn.addEventListener('click', () => openQuestModal(parseInt(btn.dataset.id)));
        });
        list.querySelectorAll('.delete-quest').forEach(btn => {
            btn.addEventListener('click', () => deleteQuestItem(parseInt(btn.dataset.id)));
        });
    } catch (e) {
        list.innerHTML = `<p style="color:#ff6b6b;">Ошибка: ${e.message}</p>`;
    }
}

// ============================================================
//  МОДАЛКА КВЕСТА
// ============================================================
async function openQuestModal(id = null) {
    editingQuestId = id;
    let quest = null;
    let title = '➕ Новый квест';
    if (id) {
        quest = await getQuestById(id);
        if (quest) title = '✏️ Редактировать квест';
    }

    const clues = quest ? quest.clues || [] : [];
    let cluesHtml = '';
    if (clues.length === 0) {
        cluesHtml = generateClueBlock(0, null);
    } else {
        clues.forEach((c, idx) => {
            cluesHtml += generateClueBlock(idx, c);
        });
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'questModal';
    modal.innerHTML = `
        <div class="modal">
            <h3>${title}</h3>
            <div class="field">
                <label>Название</label>
                <input type="text" id="qTitle" value="${quest ? escapeHtml(quest.title) : ''}" placeholder="Тайник у моста">
            </div>
            <div class="field">
                <label>Описание</label>
                <input type="text" id="qDesc" value="${quest ? escapeHtml(quest.description) : ''}" placeholder="Краткое описание">
            </div>
            <div class="field">
                <label>Уровень сложности</label>
                <select id="qLevel">
                    <option value="легкий" ${quest && quest.level === 'легкий' ? 'selected' : ''}>Легкий</option>
                    <option value="средний" ${quest && quest.level === 'средний' ? 'selected' : ''}>Средний</option>
                    <option value="сложный" ${quest && quest.level === 'сложный' ? 'selected' : ''}>Сложный</option>
                </select>
            </div>
            <div class="field">
                <label>Тип доступа</label>
                <div style="display:flex; gap:12px; align-items:center;">
                    <label><input type="checkbox" id="qIsPaid" ${quest && quest.is_paid ? 'checked' : ''}> Платный</label>
                    <span style="color:#4a5a6e; font-size:13px;">(отключено = бесплатно)</span>
                </div>
            </div>
            <div class="field" id="priceField" style="${quest && quest.is_paid ? 'display:block;' : 'display:none;'}">
                <label>Цена (₽)</label>
                <input type="number" id="qPrice" value="${quest && quest.is_paid ? quest.price : 0}" min="0" step="50">
            </div>
            <div class="field">
                <label>Финальные координаты</label>
                <input type="text" id="qFinalCoords" value="${quest ? escapeHtml(quest.final_coords || '') : ''}" placeholder="59.1200, 37.9050">
            </div>
            <div class="field">
                <label>Улики</label>
                <div id="cluesContainer">${cluesHtml}</div>
                <button type="button" id="addClueBtn" style="margin-top:8px;">➕ Добавить улику</button>
            </div>
            <div class="modal-actions">
                <button class="cancel" id="closeQuestModalBtn">Отмена</button>
                <button class="save" id="saveQuestBtn">💾 Сохранить</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('closeQuestModalBtn').addEventListener('click', () => modal.remove());
    document.getElementById('saveQuestBtn').addEventListener('click', saveQuest);

    const paidCheckbox = document.getElementById('qIsPaid');
    const priceField = document.getElementById('priceField');
    paidCheckbox.addEventListener('change', function() {
        priceField.style.display = this.checked ? 'block' : 'none';
    });

    document.getElementById('addClueBtn').addEventListener('click', () => {
        const container = document.getElementById('cluesContainer');
        const index = container.children.length;
        container.insertAdjacentHTML('beforeend', generateClueBlock(index, null));
    });

    document.querySelectorAll('.clue-block .remove-clue').forEach(btn => {
        btn.addEventListener('click', function() {
            const block = this.closest('.clue-block');
            const container = document.getElementById('cluesContainer');
            if (container.children.length <= 1) {
                alert('Должна быть хотя бы одна улика');
                return;
            }
            block.remove();
            container.querySelectorAll('.clue-block').forEach((el, i) => {
                const label = el.querySelector('.clue-index');
                if (label) label.textContent = `Улика #${i+1}`;
            });
        });
    });
}

function generateClueBlock(index, clue) {
    const type = clue ? clue.type : 'photo';
    const value = clue ? escapeHtml(clue.value || '') : '';
    const caption = clue ? escapeHtml(clue.caption || '') : '';
    const code = clue ? escapeHtml(clue.code || '') : '';
    const question = clue ? escapeHtml(clue.question || '') : '';
    const answer = clue ? escapeHtml(clue.answer || '') : '';

    return `
        <div class="clue-block" data-index="${index}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span class="clue-index" style="color:#4a5a6e; font-size:12px;">Улика #${index+1}</span>
                <button type="button" class="remove-clue" style="background:transparent; border:1px solid #ff6b6b; color:#ff6b6b; padding:0 8px; cursor:pointer;">✕</button>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <div>
                    <label>Тип</label>
                    <select class="clue-type">
                        <option value="photo" ${type==='photo'?'selected':''}>Фото</option>
                        <option value="text" ${type==='text'?'selected':''}>Текст</option>
                        <option value="coords" ${type==='coords'?'selected':''}>Координаты</option>
                        <option value="video" ${type==='video'?'selected':''}>Видео</option>
                        <option value="audio" ${type==='audio'?'selected':''}>Аудио</option>
                    </select>
                </div>
                <div>
                    <label>Код (QR)</label>
                    <input type="text" class="clue-code" value="${code}" placeholder="MOST-01">
                </div>
            </div>
            <div style="margin-top:4px;">
                <label>Значение</label>
                <input type="text" class="clue-value" value="${value}" placeholder="assets/photo.jpg">
            </div>
            <div style="margin-top:4px;">
                <label>Подпись</label>
                <input type="text" class="clue-caption" value="${caption}" placeholder="Найди место со снимка">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:4px;">
                <div>
                    <label>Вопрос</label>
                    <input type="text" class="clue-question" value="${question}" placeholder="Какой год на табличке?">
                </div>
                <div>
                    <label>Ответ</label>
                    <input type="text" class="clue-answer" value="${answer}" placeholder="1905">
                </div>
            </div>
        </div>
    `;
}

async function saveQuest() {
    const title = document.getElementById('qTitle').value.trim();
    const desc = document.getElementById('qDesc').value.trim();
    const level = document.getElementById('qLevel').value;
    const isPaid = document.getElementById('qIsPaid').checked;
    const price = parseInt(document.getElementById('qPrice').value) || 0;
    const finalCoords = document.getElementById('qFinalCoords').value.trim();

    if (!title) { alert('Введите название'); return; }

    const clueBlocks = document.querySelectorAll('.clue-block');
    const clues = [];
    let valid = true;
    clueBlocks.forEach(block => {
        const type = block.querySelector('.clue-type').value;
        const value = block.querySelector('.clue-value').value.trim();
        const caption = block.querySelector('.clue-caption').value.trim();
        const code = block.querySelector('.clue-code').value.trim() || `CODE-${String(Math.floor(Math.random()*10000)).padStart(4,'0')}`;
        const question = block.querySelector('.clue-question').value.trim();
        const answer = block.querySelector('.clue-answer').value.trim();
        if (!value) { valid = false; return; }
        clues.push({ type, value, caption, code, question, answer });
    });
    if (!valid) { alert('Заполните все улики'); return; }
    if (clues.length === 0) { alert('Добавьте улики'); return; }

    const questData = { title, description: desc, level, is_paid: isPaid, price, final_coords: finalCoords, clues };

    try {
        if (editingQuestId) {
            await updateQuest(editingQuestId, questData);
        } else {
            await addQuest(questData);
        }
        document.getElementById('questModal').remove();
        await loadQuestsList();
        alert('✅ Квест сохранён!');
    } catch (e) {
        alert('❌ Ошибка: ' + e.message);
    }
}

async function deleteQuestItem(id) {
    if (!confirm('Удалить квест?')) return;
    try {
        await deleteQuest(id);
        await loadQuestsList();
        alert('✅ Квест удалён');
    } catch (e) {
        alert('❌ Ошибка: ' + e.message);
    }
}

// ============================================================
//  НОВОСТИ
// ============================================================
async function renderNewsAdmin(container) {
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
            <h3 style="color:#fff;">📰 Новости</h3>
            <button id="addNewsBtn" class="terminal-btn">➕ Добавить новость</button>
        </div>
        <div id="newsList"></div>
    `;
    document.getElementById('addNewsBtn').addEventListener('click', () => openNewsModal());
    await loadNewsList();
}

async function loadNewsList() {
    const list = document.getElementById('newsList');
    try {
        const news = await getNews();
        if (!news || news.length === 0) {
            list.innerHTML = `<p style="color:#5a6a80;">Нет новостей. Добавьте первую!</p>`;
            return;
        }
        let html = '';
        news.forEach(item => {
            html += `
                <div class="admin-item">
                    <div class="info">
                        <div class="title">${item.title}</div>
                        <div class="sub">${new Date(item.date).toLocaleDateString('ru-RU')} · ${(item.preview || item.content || '').substring(0, 80)}...</div>
                    </div>
                    <div class="actions">
                        <button class="edit-news" data-id="${item.id}">✏️</button>
                        <button class="delete-news danger" data-id="${item.id}">🗑️</button>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
        list.querySelectorAll('.edit-news').forEach(btn => {
            btn.addEventListener('click', () => openNewsModal(parseInt(btn.dataset.id)));
        });
        list.querySelectorAll('.delete-news').forEach(btn => {
            btn.addEventListener('click', () => deleteNewsItem(parseInt(btn.dataset.id)));
        });
    } catch (e) {
        list.innerHTML = `<p style="color:#ff6b6b;">Ошибка: ${e.message}</p>`;
    }
}

function openNewsModal(id = null) {
    editingNewsId = id;
    if (id) {
        getNews().then(news => {
            const item = news.find(n => n.id === id);
            if (item) {
                renderNewsModal(item, '✏️ Редактировать новость');
            } else {
                renderNewsModal(null, '➕ Новая новость');
            }
        });
    } else {
        renderNewsModal(null, '➕ Новая новость');
    }
}

function renderNewsModal(item, title) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'newsModal';
    modal.innerHTML = `
        <div class="modal">
            <h3>${title}</h3>
            <div class="field">
                <label>Заголовок</label>
                <input type="text" id="newsTitle" value="${item ? escapeHtml(item.title) : ''}" placeholder="Заголовок новости">
            </div>
            <div class="field">
                <label>Краткий текст (превью)</label>
                <textarea id="newsPreview" rows="2">${item ? escapeHtml(item.preview || '') : ''}</textarea>
            </div>
            <div class="field">
                <label>Полный текст</label>
                <textarea id="newsContent" rows="5">${item ? escapeHtml(item.content || '') : ''}</textarea>
            </div>
            <div class="field">
                <label>Ссылка на изображение</label>
                <input type="text" id="newsImage" value="${item ? escapeHtml(item.image || '') : ''}" placeholder="https://example.com/image.jpg">
            </div>
            <div class="modal-actions">
                <button class="cancel" id="closeNewsModalBtn">Отмена</button>
                <button class="save" id="saveNewsBtn">💾 Сохранить</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('closeNewsModalBtn').addEventListener('click', () => modal.remove());
    document.getElementById('saveNewsBtn').addEventListener('click', saveNewsItem);
}

async function saveNewsItem() {
    const title = document.getElementById('newsTitle').value.trim();
    const preview = document.getElementById('newsPreview').value.trim();
    const content = document.getElementById('newsContent').value.trim();
    const image = document.getElementById('newsImage').value.trim();
    if (!title) { alert('Введите заголовок'); return; }
    if (!content) { alert('Введите текст'); return; }

    const data = { title, content, preview, image };
    try {
        if (editingNewsId) {
            await updateNews(editingNewsId, data);
        } else {
            await addNews(data);
        }
        document.getElementById('newsModal').remove();
        await loadNewsList();
        alert('✅ Новость сохранена!');
    } catch (e) {
        alert('❌ Ошибка: ' + e.message);
    }
}

async function deleteNewsItem(id) {
    if (!confirm('Удалить новость?')) return;
    try {
        await deleteNews(id);
        await loadNewsList();
        alert('✅ Новость удалена');
    } catch (e) {
        alert('❌ Ошибка: ' + e.message);
    }
}

// ============================================================
//  ВСПОМОГАТЕЛЬНЫЕ
// ============================================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
