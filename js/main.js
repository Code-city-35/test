import { getQuests } from './quests-data.js';

document.addEventListener('DOMContentLoaded', async function() {
    const catalogContainer = document.getElementById('catalogList');
    if (catalogContainer) {
        await renderCatalog(catalogContainer);
    }
    const statEl = document.getElementById('totalQuests');
    if (statEl) {
        const quests = await getQuests();
        statEl.textContent = quests.length;
    }
});

async function renderCatalog(container) {
    try {
        const quests = await getQuests();
        if (!quests || quests.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px; color:#5a6a80;">
                    <p style="font-size:20px;">📭 Нет доступных квестов</p>
                    <a href="admin.html" class="btn btn-primary" style="margin-top:16px; display:inline-block;">⚙️ Перейти в админку</a>
                </div>
            `;
            return;
        }
        let html = '';
        quests.forEach(box => {
            const levelClass = box.level === 'легкий' ? 'easy' : box.level === 'средний' ? 'medium' : 'hard';
            const levelLabel = box.level === 'легкий' ? '🟢 Лёгкий' : box.level === 'средний' ? '🟡 Средний' : '🔴 Сложный';
            const priceText = box.is_paid ? `${box.price} ₽` : 'Бесплатно';
            const priceClass = box.is_paid ? '' : 'free';
            html += `
                <div class="quest-card fade-up">
                    <div class="corner-mark tl"></div>
                    <div class="corner-mark tr"></div>
                    <div class="corner-mark bl"></div>
                    <div class="corner-mark br"></div>
                    <span class="level-badge ${levelClass}">${levelLabel}</span>
                    <h3>${escapeHtml(box.title)}</h3>
                    <p class="desc">${escapeHtml(box.description || '')}</p>
                    <div class="footer">
                        <span class="price ${priceClass}">${priceText}</span>
                        <a href="box.html?id=${box.id}" class="btn btn-small">Начать</a>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<p style="color:#ff6b6b;">Ошибка: ${e.message}</p>`;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
