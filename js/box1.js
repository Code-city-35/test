import { getQuestById, getCluesByQuestId } from './quests-data.js';

let currentBox = null;
let currentStep = 0;
let timerSeconds = 0;
let timerInterval = null;
let isFinished = false;
let isLocked = false;

(function injectStyles() {
    if (document.getElementById('box-styles')) return;
    const style = document.createElement('style');
    style.id = 'box-styles';
    style.textContent = `
        .terminal { background: rgba(16,24,44,0.4); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.05); padding: 30px 28px; max-width: 700px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.2); font-family: 'Inter', sans-serif; color: #e8edf2; }
        .terminal .line { margin-bottom: 10px; line-height: 1.6; font-size: 16px; color: #e8edf2; }
        .terminal .line.dim { color: #5a6a80; }
        .terminal .line .error { color: #ff6b6b; }
        .terminal .line .success { color: #6fcf97; }
        .terminal .line .highlight { color: #ff6b35; }
        .terminal .input-row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
        .terminal .input-row input { flex: 1; background: rgba(8,12,26,0.6); border: 1px solid rgba(255,255,255,0.06); color: #e8edf2; padding: 10px 14px; font-family: 'Inter', sans-serif; font-size: 16px; min-width: 140px; }
        .terminal .input-row input:focus { border-color: #ff6b35; outline: none; }
        .terminal .input-row input:disabled { opacity: 0.5; }
        .terminal .input-row button { padding: 10px 24px; font-weight: 600; font-size: 16px; background: #ff6b35; color: #080c1a; border: none; cursor: pointer; font-family: 'Inter', sans-serif; }
        .terminal .input-row button:hover { background: #ff8a5c; }
        .terminal .input-row button:disabled { opacity: 0.4; pointer-events: none; }
        .terminal .clue-block { background: rgba(16,24,44,0.4); backdrop-filter: blur(10px); padding: 20px; margin: 16px 0; border: 1px solid rgba(255,255,255,0.05); }
        .terminal .clue-block .clue-label { color: #5a6a80; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
        .terminal .clue-block .clue-content { margin-top: 8px; font-size: 16px; color: #e8edf2; }
        .terminal .clue-block .clue-content img, .terminal .clue-block .clue-content video { max-width: 100%; border: 1px solid rgba(255,255,255,0.05); }
        .terminal .terminal-link { color: #ff6b35; text-decoration: none; border-bottom: 1px dashed rgba(255,107,53,0.2); transition: 0.2s; }
        .terminal .terminal-link:hover { border-bottom-color: #ff6b35; }
        .terminal .terminal-btn { display: inline-block; padding: 10px 28px; font-weight: 600; font-size: 16px; background: #ff6b35; color: #080c1a; border: none; cursor: pointer; font-family: 'Inter', sans-serif; text-decoration: none; transition: 0.2s; }
        .terminal .terminal-btn:hover { background: #ff8a5c; }
        .terminal .terminal-btn.danger { background: transparent; color: #ff6b6b; border: 1px solid #ff6b6b; }
        .terminal .terminal-btn.danger:hover { background: #ff6b6b; color: #080c1a; }
    `;
    document.head.appendChild(style);
})();

document.addEventListener('DOMContentLoaded', async function() {
    const params = new URLSearchParams(window.location.search);
    const boxId = parseInt(params.get('id'));
    if (boxId) {
        try {
            currentBox = await getQuestById(boxId);
            if (!currentBox) {
                document.getElementById('boxContent').innerHTML = `
                    <div class="line error">> Ошибка: бокс не найден</div>
                    <a href="catalog.html" class="terminal-link">← Вернуться в каталог</a>
                `;
                return;
            }
            if (!currentBox.clues || currentBox.clues.length === 0) {
                currentBox.clues = await getCluesByQuestId(boxId);
            }
            renderBox();
        } catch (e) {
            document.getElementById('boxContent').innerHTML = `
                <div class="line error">> Ошибка загрузки квеста: ${e.message}</div>
                <a href="catalog.html" class="terminal-link">← Вернуться в каталог</a>
            `;
        }
    } else {
        document.getElementById('boxContent').innerHTML = `
            <div class="line error">> Не указан ID бокса</div>
            <a href="catalog.html" class="terminal-link">← Вернуться в каталог</a>
        `;
    }
});

function renderBox() {
    const container = document.getElementById('boxContent');
    const box = currentBox;
    if (box.is_paid && !sessionStorage.getItem(`box_paid_${box.id}`)) {
        container.innerHTML = `
            <div class="line">> Этот бокс платный (${box.price} ₽)</div>
            <div class="line">> Для доступа необходимо оплатить.</div>
            <button class="terminal-btn" onclick="payBox(${box.id})">💳 Оплатить ${box.price} ₽</button>
            <div style="margin-top: 12px;">
                <a href="catalog.html" class="terminal-link">← Назад</a>
            </div>
        `;
        return;
    }
    let html = `
        <div class="line">> БОКС: ${box.title}</div>
        <div class="line dim">> Уровень: ${box.level}</div>
        <div class="line dim">> ${box.description || ''}</div>
        <div class="line" style="margin-top: 12px;">> Начинаем поиск...</div>
        <div id="stepContainer"></div>
        <div id="timerDisplay" class="line dim" style="margin-top: 12px;">⏱️ ${formatTime(timerSeconds)}</div>
        <div id="messageArea" style="margin-top: 12px;"></div>
        <div style="margin-top: 12px;">
            <a href="catalog.html" class="terminal-link">← Выйти из бокса</a>
        </div>
    `;
    container.innerHTML = html;
    if (timerInterval) clearInterval(timerInterval);
    timerSeconds = 0;
    timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerDisplay();
    }, 1000);
    currentStep = 0;
    showStep(currentStep);
}

function showStep(index) {
    const box = currentBox;
    const clues = box.clues;
    if (index >= clues.length) {
        finishBox();
        return;
    }
    const clue = clues[index];
    const container = document.getElementById('stepContainer');
    let html = `
        <div class="clue-block">
            <div class="clue-label">Улика ${index + 1} из ${clues.length}</div>
            <div class="clue-content">
    `;
    if (clue.type === 'photo') {
        const imgSrc = clue.value || 'assets/placeholder.jpg';
        html += `<img src="${imgSrc}" alt="Фото-улика" style="max-width: 100%; max-height: 300px;"><br>`;
        html += `<span style="color: #8aa3c0; font-size: 14px;">${clue.caption || ''}</span>`;
    } else if (clue.type === 'text') {
        html += `<span style="color: #ffb000;">${clue.value}</span>`;
        if (clue.caption) html += `<br><span style="color: #8aa3c0; font-size: 14px;">${clue.caption}</span>`;
    } else if (clue.type === 'coords') {
        html += `<span style="color: #00d4ff;">📍 Координаты: ${clue.value || 'не указаны'}</span>`;
        if (clue.caption) html += `<br><span style="color: #8aa3c0; font-size: 14px;">${clue.caption}</span>`;
    } else if (clue.type === 'video') {
        html += `<video controls src="${clue.value}" style="max-width: 100%; max-height: 300px;"></video><br>`;
        html += `<span style="color: #8aa3c0; font-size: 14px;">${clue.caption || ''}</span>`;
    } else if (clue.type === 'audio') {
        html += `<audio controls src="${clue.value}" style="width: 100%;"></audio><br>`;
        html += `<span style="color: #8aa3c0; font-size: 14px;">${clue.caption || ''}</span>`;
    } else {
        html += `<span style="color: #ffb000;">${clue.value}</span>`;
        if (clue.caption) html += `<br><span style="color: #8aa3c0; font-size: 14px;">${clue.caption}</span>`;
    }
    html += `
            </div>
        </div>
        <div style="margin-top: 16px;">
            <div class="line dim">> Найди на этом месте QR-код и введи его код:</div>
            <div class="input-row">
                <input type="text" id="codeInput" placeholder="Введи код с QR-стикера">
                <button class="terminal-btn" id="checkCodeBtn">🔍 Проверить</button>
            </div>
            <div id="codeMessage" style="margin-top: 8px;"></div>
        </div>
        <div id="questionBlock" style="display:none; margin-top:16px; border-top:1px solid #2a2a2a; padding-top:12px;">
            <div class="line">❓ ${clue.question || ''}</div>
            <div class="input-row">
                <input type="text" id="answerInput" placeholder="Введи ответ">
                <button class="terminal-btn" id="checkAnswerBtn">✅ Ответить</button>
            </div>
            <div id="answerMessage" style="margin-top: 8px;"></div>
        </div>
    `;
    container.innerHTML = html;
    const checkBtn = document.getElementById('checkCodeBtn');
    const codeInput = document.getElementById('codeInput');
    const codeMsg = document.getElementById('codeMessage');
    isLocked = false;
    const handleCode = () => {
        if (isLocked) return;
        const enteredCode = codeInput.value.trim().toUpperCase();
        if (!enteredCode) {
            codeMsg.innerHTML = `<span class="error">❌ Введи код с QR-стикера</span>`;
            return;
        }
        if (enteredCode === clue.code.toUpperCase()) {
            isLocked = true;
            codeMsg.innerHTML = `<span class="success">✅ Код верный!</span>`;
            codeInput.disabled = true;
            checkBtn.disabled = true;
            if (clue.question && clue.question.trim() !== '') {
                const questionBlock = document.getElementById('questionBlock');
                questionBlock.style.display = 'block';
                const answerInput = document.getElementById('answerInput');
                const answerBtn = document.getElementById('checkAnswerBtn');
                const answerMsg = document.getElementById('answerMessage');
                const handleAnswer = () => {
                    const userAnswer = answerInput.value.trim();
                    if (!userAnswer) {
                        answerMsg.innerHTML = `<span class="error">❌ Напиши ответ</span>`;
                        return;
                    }
                    if (userAnswer.toLowerCase() === clue.answer.toLowerCase()) {
                        answerMsg.innerHTML = `<span class="success">✅ Верно! Переходим к следующей улике...</span>`;
                        answerInput.disabled = true;
                        answerBtn.disabled = true;
                        setTimeout(() => {
                            currentStep++;
                            showStep(currentStep);
                        }, 1000);
                    } else {
                        answerMsg.innerHTML = `<span class="error">❌ Неверно. Попробуй ещё раз.</span>`;
                        answerInput.value = '';
                        answerInput.focus();
                    }
                };
                answerBtn.addEventListener('click', handleAnswer);
                answerInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') handleAnswer();
                });
                setTimeout(() => answerInput.focus(), 200);
            } else {
                setTimeout(() => {
                    currentStep++;
                    showStep(currentStep);
                }, 800);
            }
        } else {
            codeMsg.innerHTML = `<span class="error">❌ Неверный код. Попробуй ещё раз.</span>`;
            codeInput.value = '';
            codeInput.focus();
        }
    };
    checkBtn.addEventListener('click', handleCode);
    codeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleCode();
    });
    setTimeout(() => codeInput.focus(), 200);
}

function finishBox() {
    clearInterval(timerInterval);
    const container = document.getElementById('stepContainer');
    container.innerHTML = `
        <div class="clue-block">
            <div class="clue-label">🏆 ФИНАЛ</div>
            <div class="clue-content">
                <p style="font-size: 20px; color: #ffb000;">Вы нашли все коды!</p>
                <p>Финальные координаты клада:</p>
                <p style="font-size: 24px; color: #00d4ff;">${currentBox.final_coords || 'не указаны'}</p>
                <p style="color: #8aa3c0; font-size: 14px;">Отправляйся туда и забери свой приз!</p>
                <p style="margin-top: 12px;">⏱️ Ваше время: ${formatTime(timerSeconds)}</p>
            </div>
        </div>
        <a href="catalog.html" class="terminal-btn" style="margin-top: 12px;">📦 Вернуться в каталог</a>
    `;
    document.getElementById('timerDisplay').textContent = `⏱️ ${formatTime(timerSeconds)}`;
    isFinished = true;
}

function payBox(boxId) {
    if (confirm(`Оплатить ${currentBox.price} ₽? (демо-режим)`)) {
        sessionStorage.setItem(`box_paid_${boxId}`, 'true');
        renderBox();
    }
}

function updateTimerDisplay() {
    const el = document.getElementById('timerDisplay');
    if (el) el.textContent = `⏱️ ${formatTime(timerSeconds)}`;
}

function formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
}
