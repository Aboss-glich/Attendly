async function portalRequest(url, options) {
    const response = await fetch(url, { credentials: 'same-origin', ...options });
    if (response.status === 401) window.location.replace('/login.html');
    return response;
}

async function loadPortal() {
    const response = await portalRequest('/api/me');
    if (!response.ok) return;
    const { user } = await response.json();
    const title = document.querySelector('#portalTitle');
    const subtitle = document.querySelector('#portalSubtitle');
    if (title) title.textContent = `${user.name}'s portal`;
    if (subtitle && user.className) subtitle.textContent = `${user.className} · Your attendance record`;
    const studentForm = document.querySelector('#studentAccountForm');
    if (studentForm && user.role === 'teacher') {
        const dataResponse = await portalRequest('/api/data');
        const data = await dataResponse.json();
        const students = data.students[user.className] || [];
        document.querySelector('#accountStudent').replaceChildren(...students.map((student) => new Option(`${student.name} · Roll ${student.roll}`, JSON.stringify(student))));
        studentForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const student = JSON.parse(document.querySelector('#accountStudent').value);
            const response = await portalRequest('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: document.querySelector('#accountUsername').value, name: student.name, password: document.querySelector('#accountPassword').value, role: 'student', className: user.className, roll: student.roll }) });
            const result = await response.json();
            document.querySelector('#portalMessage').textContent = response.ok ? `Login created for ${student.name}.` : result.error;
            if (response.ok) studentForm.reset();
        });
    }
    const rows = document.querySelector('#studentAttendanceRows');
    if (!rows || user.role !== 'student') return;
    const dataResponse = await portalRequest('/api/data');
    const data = await dataResponse.json();
    const records = Object.entries(data.attendance || {}).sort(([first], [second]) => second.localeCompare(first));
    rows.innerHTML = records.map(([key, record]) => {
        const date = key.split('|')[1];
        const item = record[user.roll];
        if (!item) return '';
        return `<tr><td>${date}</td><td><span class="status ${item.status}">${item.status[0].toUpperCase() + item.status.slice(1)}</span></td><td>${item.checkIn || '—'}</td></tr>`;
    }).join('');
    if (!rows.innerHTML) document.querySelector('#portalMessage').textContent = 'No attendance records have been published yet.';
}

document.querySelector('#portalLogout')?.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.replace('/login.html');
});
loadPortal();
