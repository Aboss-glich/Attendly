const SETTINGS_KEY = 'attendly-settings-v1';
const defaults = {
    schoolName: 'Attendly School',
    schoolEmail: '',
    adminName: 'Anmol Kumar',
    schoolPhone: '',
    academicYear: '2026-27',
    workingDays: '5',
    lateAfter: '09:00',
    minimumAttendance: '75',
    language: 'English',
    theme: 'light',
    notifications: true,
    confirmClear: true
};

const form = document.querySelector('#settingsForm');
const fields = ['schoolName', 'schoolEmail', 'adminName', 'schoolPhone', 'academicYear', 'workingDays', 'lateAfter', 'minimumAttendance', 'language', 'theme', 'notifications', 'confirmClear'];
let settings = { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };

function applySettings() {
    fields.forEach((field) => {
        const input = document.querySelector(`#${field}`);
        if (input.type === 'checkbox') input.checked = Boolean(settings[field]);
        else input.value = settings[field];
    });
    document.body.dataset.theme = settings.theme;
}

function readSettings() {
    fields.forEach((field) => {
        const input = document.querySelector(`#${field}`);
        settings[field] = input.type === 'checkbox' ? input.checked : input.value;
    });
}

function showMessage(text) {
    const message = document.querySelector('#settingsMessage');
    message.textContent = text;
    setTimeout(() => { message.textContent = ''; }, 3000);
}

form.addEventListener('submit', (event) => {
    event.preventDefault();
    readSettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings }) }).catch(() => {});
    applySettings();
    showMessage('Settings saved successfully.');
});

document.querySelector('#resetSettings').addEventListener('click', () => {
    settings = { ...defaults };
    applySettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings }) }).catch(() => {});
    showMessage('Default settings restored.');
});

document.querySelector('#theme').addEventListener('change', (event) => {
    document.body.dataset.theme = event.target.value;
});

document.querySelector('#downloadBackup').addEventListener('click', async () => {
    const response = await fetch('/api/backup');
    if (!response.ok) return showMessage('Backup download failed.');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(await response.json(), null, 2)], { type: 'application/json' }));
    link.download = `attendly-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    showMessage('Backup downloaded successfully.');
});

document.querySelector('#restoreBackup').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file || !confirm('Restore this backup? Current data will be replaced.')) { event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const backup = JSON.parse(reader.result);
            const response = await fetch('/api/restore', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(backup) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Restore failed.');
            showMessage(result.message);
            setTimeout(() => window.location.reload(), 700);
        } catch (error) {
            showMessage(error.message || 'Invalid backup file.');
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
});

document.querySelector('#changePasswordButton').addEventListener('click', async () => {
    const newPassword = document.querySelector('#newPassword').value;
    if (newPassword !== document.querySelector('#confirmPassword').value) return showMessage('New passwords do not match.');
    const response = await fetch('/api/change-password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: document.querySelector('#currentPassword').value, newPassword }) });
    const result = await response.json();
    if (!response.ok) return showMessage(result.error || 'Password change failed.');
    showMessage(result.message);
    setTimeout(() => window.location.replace('/login.html'), 800);
});

const userForm = document.querySelector('#userForm');
const userRole = document.querySelector('#userRole');
const userClass = document.querySelector('#userClass');
const userRoll = document.querySelector('#userRoll');

async function loadUsers() {
    const [classesResponse, usersResponse] = await Promise.all([fetch('/api/classes'), fetch('/api/users')]);
    if (!classesResponse.ok || !usersResponse.ok) return;
    const classes = (await classesResponse.json()).classes;
    userClass.replaceChildren(...classes.map((name) => new Option(name, name)));
    const users = (await usersResponse.json()).users;
    document.querySelector('#userList').innerHTML = users.map((user) => `<div class="user-item"><span><strong>${user.name}</strong> <small>@${user.username} · ${user.role}${user.className ? ` · ${user.className}` : ''}</small></span><button type="button" class="row-action reset-user" data-username="${user.username}">Reset password</button></div>`).join('');
}

userRole.addEventListener('change', () => { const student = userRole.value === 'student'; userRoll.required = student; userClass.required = student; });
userForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const response = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: document.querySelector('#userUsername').value, name: document.querySelector('#userName').value, password: document.querySelector('#userPassword').value, role: userRole.value, className: userClass.value, roll: userRoll.value, subject: document.querySelector('#userSubject').value, email: document.querySelector('#userEmail').value, phone: document.querySelector('#userPhone').value }) });
    const result = await response.json();
    if (!response.ok) return showMessage(result.error || 'Account creation failed.');
    userForm.reset();
    userRole.dispatchEvent(new Event('change'));
    showMessage('Account created successfully.');
    loadUsers();
});
document.querySelector('#userList').addEventListener('click', async (event) => {
    const button = event.target.closest('.reset-user');
    if (!button) return;
    const password = prompt('Enter a new password (minimum 8 characters):');
    if (!password) return;
    const response = await fetch(`/api/users/${encodeURIComponent(button.dataset.username)}/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    const result = await response.json();
    showMessage(result.error || result.message);
});
loadUsers();

async function loadBackendSettings() {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) return;
        const data = await response.json();
        if (data.settings && Object.keys(data.settings).length) {
            settings = { ...defaults, ...data.settings };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        }
    } catch (error) {
        console.warn('Backend unavailable, using local settings.', error);
    }
    applySettings();
}
loadBackendSettings();