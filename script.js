const SCRIPT_URL = "const";

// Авторизация
const authSection = document.getElementById('authSection');
const roleSelectBlock = document.getElementById('roleSelectBlock');
const loginFormBlock = document.getElementById('loginFormBlock');
const formRoleTitle = document.getElementById('formRoleTitle');
const selectWorkerBtn = document.getElementById('selectWorkerBtn');
const selectManagerBtn = document.getElementById('selectManagerBtn');
const loginInput = document.getElementById('loginInput');
const passInput = document.getElementById('passInput');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const cancelAuthBtn = document.getElementById('cancelAuthBtn');

// Разделы и кнопки выхода
const workerSection = document.getElementById('workerSection');
const managerSection = document.getElementById('managerSection');
const workerExitBtn = document.getElementById('workerExitBtn');
const managerExitBtn = document.getElementById('managerExitBtn');

// Элементы сотрудника
const createBtn = document.getElementById('createBtn');
const finishBtn = document.getElementById('finishBtn');
const statusEl = document.getElementById('status');
const boxNumberEl = document.getElementById('boxNumber');
const uploadBlock = document.getElementById('uploadBlock');
const orderTypeSelect = document.getElementById('orderTypeSelect');
const mainOrderPhotos = document.getElementById('mainOrderPhotos');
const extraOrderPhotos = document.getElementById('extraOrderPhotos');

// Элементы менеджера
const refreshManagerBtn = document.getElementById('refreshManagerBtn');
const boxesList = document.getElementById('boxesList');

let selectedRole = null; 
let currentBox = null;

// Переключение формы загрузки (Основной заказ / Допы)
if (orderTypeSelect) {
    orderTypeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'main') {
            mainOrderPhotos.style.display = 'block';
            extraOrderPhotos.style.display = 'none';
        } else {
            mainOrderPhotos.style.display = 'none';
            extraOrderPhotos.style.display = 'block';
        }
    });
}

// --- 1. ПРОВЕРКА СОХРАНЕННОЙ СЕССИИ ПРИ ЗАГРУЗКЕ ---
document.addEventListener('DOMContentLoaded', () => {
    const savedRole = localStorage.getItem('apex_user_role');
    if (savedRole === 'worker' || savedRole === 'manager') {
        applyUserSession(savedRole);
    }
});

function applyUserSession(role) {
    authSection.style.display = 'none';

    if (role === 'worker') {
        workerSection.style.display = 'block';
        managerSection.style.display = 'none';
    } else if (role === 'manager') {
        managerSection.style.display = 'block';
        workerSection.style.display = 'none';
        loadManagerBoxes();
    }
}

// --- 2. ВЫБОР РОЛИ И ВХОД ---
selectWorkerBtn.addEventListener('click', () => showLoginForm('worker'));
selectManagerBtn.addEventListener('click', () => showLoginForm('manager'));

function showLoginForm(role) {
    selectedRole = role;
    roleSelectBlock.style.display = 'none';
    loginFormBlock.style.display = 'block';
    formRoleTitle.innerText = role === 'worker' ? 'Вход для Сотрудника:' : 'Вход для Менеджера:';
}

cancelAuthBtn.addEventListener('click', () => {
    selectedRole = null;
    loginFormBlock.style.display = 'none';
    roleSelectBlock.style.display = 'block';
    loginInput.value = '';
    passInput.value = '';
});

loginSubmitBtn.addEventListener('click', () => {
    const login = loginInput.value.trim();
    const pass = passInput.value.trim();

    if (login === '123' && pass === '123') {
        localStorage.setItem('apex_user_role', selectedRole);
        applyUserSession(selectedRole);
    } else {
        alert('Неверный логин или пароль! (Используйте 123 / 123)');
    }
});

// --- 3. ВЫХОД ИЗ СИСТЕМЫ ---
function logout() {
    localStorage.removeItem('apex_user_role');

    workerSection.style.display = 'none';
    managerSection.style.display = 'none';
    
    authSection.style.display = 'block';
    roleSelectBlock.style.display = 'block';
    loginFormBlock.style.display = 'none';
    
    loginInput.value = '';
    passInput.value = '';
    selectedRole = null;

    resetWorkerForm();
}

if (workerExitBtn) workerExitBtn.addEventListener('click', logout);
if (managerExitBtn) managerExitBtn.addEventListener('click', logout);

// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ СЖАТИЯ ФОТО ПЕРЕД ОТПРАВКОЙ ---
function compressAndConvertToBase64(file, defaultName, maxWidth = 1200, quality = 0.7) {
    return new Promise((resolve) => {
        if (!file) return resolve(null);

        if (!file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => resolve({
                name: defaultName || file.name,
                mimeType: file.type,
                data: reader.result.split(',')[1]
            });
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
            return;
        }

        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target.result;
        };

        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve({
                name: defaultName || file.name,
                mimeType: 'image/jpeg',
                data: dataUrl.split(',')[1]
            });
        };

        img.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

// --- 4. ЛОГИКА СОТРУДНИКА ---
createBtn.addEventListener('click', async () => {
    createBtn.disabled = true;
    statusEl.innerText = "Создание Box_ID...";

    try {
        const res = await fetch(`${SCRIPT_URL}?action=newBox`, { redirect: 'follow' });
        const data = await res.json();

        if (data.status === "success" || data.number) {
            currentBox = { 
                number: data.number, 
                folderId: data.folderId || data.folder, 
                folderUrl: data.folderUrl 
            };
            boxNumberEl.innerText = currentBox.number;
            statusEl.innerText = "Приёмка";

            createBtn.style.display = 'none';
            uploadBlock.style.display = 'block';
        } else {
            alert("Ошибка генерации коробки");
            statusEl.innerText = "Ожидание";
            createBtn.disabled = false;
        }
    } catch (err) {
        alert("Ошибка сети");
        statusEl.innerText = "Ошибка";
        createBtn.disabled = false;
    }
});

finishBtn.addEventListener('click', async () => {
    const isMainOrder = orderTypeSelect.value === 'main';
    let photoFiles = [];

    if (isMainOrder) {
        const fileMain = document.getElementById('photoMain').files[0];
        if (!fileMain) {
            alert("Загрузите визуальное фото товара!");
            return;
        }
        photoFiles = [{ file: fileMain, name: '01_Визуальное_фото.jpg' }];
    } else {
        photoFiles = [
            { file: document.getElementById('photo1').files[0], name: '01_Коробка.jpg' },
            { file: document.getElementById('photo2').files[0], name: '02_Общий_вид.jpg' },
            { file: document.getElementById('photo3').files[0], name: '03_Резина_1.jpg' },
            { file: document.getElementById('photo4').files[0], name: '04_Резина_2.jpg' },
            { file: document.getElementById('photo5').files[0], name: '05_Ступица_1.jpg' },
            { file: document.getElementById('photo6').files[0], name: '06_Ступица_2.jpg' },
            { file: document.getElementById('photo7').files[0], name: '07_Комплектность.jpg' }
        ];

        const missing = photoFiles.filter(p => !p.file);
        if (missing.length > 0) {
            alert("Пожалуйста, загрузите все 7 обязательных фото по чек-листу!");
            return;
        }
    }

    const storagePlace = document.getElementById('storagePlace').value.trim();

    finishBtn.disabled = true;
    statusEl.innerText = "Сжатие фото и передача менеджеру...";

    try {
        const convertedFiles = await Promise.all(
            photoFiles.map(p => compressAndConvertToBase64(p.file, p.name))
        );

        const payload = {
            action: "finishReceiving",
            folderId: currentBox.folderId,
            folderUrl: currentBox.folderUrl,
            boxNumber: currentBox.number,
            orderType: isMainOrder ? "Основной заказ" : "Допы",
            storagePlace: storagePlace || "S-01",
            files: convertedFiles.filter(f => f !== null)
        };

        await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        alert(`Коробка ${currentBox.number} успешно принята!`);
        resetWorkerForm();

    } catch (err) {
        console.error(err);
        alert("Ошибка при сохранении.");
        finishBtn.disabled = false;
    }
});

function resetWorkerForm() {
    currentBox = null;
    boxNumberEl.innerText = "----";
    statusEl.innerText = "Ожидание";
    
    const photoMain = document.getElementById('photoMain');
    if (photoMain) photoMain.value = "";

    for(let i = 1; i <= 7; i++) {
        const el = document.getElementById(`photo${i}`);
        if (el) el.value = "";
    }
    const sp = document.getElementById('storagePlace');
    if (sp) sp.value = "";
    
    uploadBlock.style.display = 'none';
    createBtn.style.display = 'block';
    createBtn.disabled = false;
    finishBtn.disabled = false;
}

// --- 5. ЛОГИКА МЕНЕДЖЕРА ---
refreshManagerBtn.addEventListener('click', loadManagerBoxes);

async function loadManagerBoxes() {
    boxesList.innerHTML = "<p class='status-msg'>Загрузка очереди...</p>";

    try {
        const res = await fetch(`${SCRIPT_URL}?action=getBoxes`, { redirect: 'follow' });
        const pendingBoxes = await res.json();

        if (!pendingBoxes || pendingBoxes.length === 0) {
            boxesList.innerHTML = "<p class='status-msg'>Нет коробок в очереди</p>";
            return;
        }

        boxesList.innerHTML = "";

        pendingBoxes.forEach(box => {
            const card = document.createElement('div');
            card.className = "card manager-card";

            let photosHtml = (box.photos || []).map((p, idx) => 
                `<a href="${p.url}" target="_blank" class="photo-link">Фото ${idx + 1}</a>`
            ).join(' ');

            let boxStatus = "На определении";
            if (box.invoiceUrl && box.invoiceUrl !== "") {
                boxStatus = "Отправлено";
            } else if (box.sku && box.orderNum) {
                boxStatus = "Готово к отправке";
            }

            let invoiceHtml = "";
            if (box.invoiceUrl) {
                invoiceHtml = `
                    <div style="margin-top: 10px; padding: 8px; background: rgba(0,200,0,0.1); border-radius: 6px;">
                        <strong>Накладная:</strong> <a href="${box.invoiceUrl}" target="_blank" class="photo-link">Открыть документ</a>
                    </div>
                `;
            } else {
                invoiceHtml = `
                    <div class="input-group" style="margin-top: 15px;">
                        <label>Загрузить накладную:</label>
                        <input type="file" id="invoice_${box.number}" accept="image/*,application/pdf">
                        <button onclick="uploadInvoice('${box.number}', '${box.folderId}')" style="margin-top: 5px; background-color: #17a2b8;">Прикрепить накладную</button>
                    </div>
                `;
            }

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>Коробка: ${box.number}</h3>
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #eee; color: #333;">${boxStatus}</span>
                </div>
                <p><strong>Тип:</strong> ${box.orderType || 'Не указан'}</p>
                <p><strong>Место хранения:</strong> ${box.place || '—'}</p>
                <div class="photos-block">${photosHtml}</div>

                <div class="input-group">
                    <label>Что внутри / SKU:</label>
                    <input type="text" id="sku_${box.number}" value="${box.sku || ''}" placeholder="Например: Мотарды Ступица KTM">
                </div>

                <div class="input-group">
                    <label>№ заказа Stage Apex:</label>
                    <input type="text" id="order_${box.number}" value="${box.orderNum || ''}" placeholder="Например: SS-5501">
                </div>

                <div class="input-group">
                    <label>Клиент:</label>
                    <input type="text" id="client_${box.number}" value="${box.client || ''}" placeholder="Имя клиента или @username">
                </div>

                <div class="input-group">
                    <label>Город:</label>
                    <input type="text" id="city_${box.number}" value="${box.city || ''}" placeholder="Москва">
                </div>

                <button onclick="identifyBox('${box.number}')">Подтвердить определение</button>

                <hr style="margin: 15px 0; border: 0; border-top: 1px solid #444;">
                ${invoiceHtml}
            `;

            boxesList.appendChild(card);
        });

    } catch (err) {
        boxesList.innerHTML = "<p class='status-msg'>Ошибка загрузки коробок.</p>";
    }
}

async function identifyBox(boxNum) {
    const sku = document.getElementById(`sku_${boxNum}`).value.trim();
    const orderNum = document.getElementById(`order_${boxNum}`).value.trim();
    const client = document.getElementById(`client_${boxNum}`).value.trim();
    const city = document.getElementById(`city_${boxNum}`).value.trim();

    if (!sku || !orderNum) {
        alert("Заполните 'Что внутри' и '№ заказа Stage Apex'!");
        return;
    }

    const payload = {
        action: "identifyBox",
        number: boxNum,
        sku: sku,
        orderNum: orderNum,
        client: client,
        city: city,
        status: "Готово к отправке"
    };

    try {
        await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
        alert(`Коробка ${boxNum} определена! Статус: Готово к отправке.`);
        loadManagerBoxes();
    } catch (err) {
        alert("Ошибка сохранения.");
    }
}

async function uploadInvoice(boxNum, folderId) {
    const fileInput = document.getElementById(`invoice_${boxNum}`);
    const file = fileInput ? fileInput.files[0] : null;

    if (!file) {
        alert("Выберите файл накладной!");
        return;
    }

    try {
        const fileData = await compressAndConvertToBase64(file, `Накладная_${boxNum}`);

        const payload = {
            action: "uploadInvoice",
            boxNumber: boxNum,
            folderId: folderId,
            file: fileData,
            status: "Отправлено"
        };

        await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
        alert(`Накладная прикреплена! Статус коробки ${boxNum}: Отправлено.`);
        loadManagerBoxes();

    } catch (err) {
        alert("Ошибка при загрузке накладной.");
    }
}

// --- ОБРАБОТКА НАЖАТИЯ ENTER И СТИРАНИЕ ФОКУСА (СНЯТИЕ КЛАВИАТУРЫ) ---
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const activeElement = document.activeElement;

        if (activeElement && activeElement.tagName === 'INPUT') {
            event.preventDefault(); 
            activeElement.blur();   

            const elementId = activeElement.id;
            if (elementId && (elementId.startsWith('sku_') || elementId.startsWith('order_') || elementId.startsWith('client_') || elementId.startsWith('city_'))) {
                const boxNum = elementId.split('_')[1];
                if (boxNum) {
                    identifyBox(boxNum);
                }
            }

            if (elementId === 'loginInput' || elementId === 'passInput') {
                loginSubmitBtn.click();
            }
        }
    }
});
