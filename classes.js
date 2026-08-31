const DATA_KEY = 'attendly-data-v2';
const CLASS_KEY = 'attendly-classes-v1';
const database = JSON.parse(localStorage.getItem(DATA_KEY) || '{"students":{},"attendance":{}}');
database.students = database.students || {};
database.attendance = database.attendance || {};
let metadata = JSON.parse(localStorage.getItem(CLASS_KEY) || 'null') || {};
const defaultClasses = ['Class 10-A', 'Class 10-B', 'Class 9-A'];
defaultClasses.forEach((className) => { if (!Array.isArray(database.students[className])) database.students[className] = []; if (!metadata[className]) metadata[className] = { teacher: 'Not assigned', room: 'Not assigned' }; });
let classNames = Object.keys(database.students);
const grid = document.querySelector('#classGrid');
const dialog = document.querySelector('#classDialog');
const form = document.querySelector('#classForm');
function save() {
    localStorage.setItem(DATA_KEY, JSON.stringify(database));
    localStorage.setItem(CLASS_KEY, JSON.stringify(metadata));
    fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...database, classMetadata: metadata }) }).catch(() => {});
}
function initials(name) { return name.split(' ').map((part) => part[0]).join('').slice(0, 2); }
function classAverage(className) { const students = database.students[className] || []; const values = students.map((student) => student.rate || 0).filter((rate) => rate > 0); return values.length ? Math.round(values.reduce((sum, rate) => sum + rate, 0) / values.length) : 0; }
function render() {
    classNames = Object.keys(database.students);
    const total = classNames.reduce((sum, className) => sum + database.students[className].length, 0);
    document.querySelector('#sectionCount').textContent = classNames.length;
    document.querySelector('#studentCount').textContent = total;
    document.querySelector('#averageSize').textContent = classNames.length ? Math.round(total / classNames.length) : 0;
    grid.innerHTML = classNames.map((className) => { const students = database.students[className]; const info = metadata[className] || {}; const average = classAverage(className); return `<article class="class-card"><div class="class-card-head"><div><h2>${className}</h2><p>${info.teacher || 'Not assigned'}</p></div><span class="class-menu">${info.room || 'Room —'}</span></div><div class="class-progress"><b style="width:${average}%"></b></div><div class="class-meta"><div><span>Students</span><strong>${students.length}</strong></div><div><span>Attendance</span><strong>${average ? `${average}%` : 'No data'}</strong></div></div><div class="class-actions"><button class="edit-class" data-class="${className}">Edit details</button><button class="remove-class" data-class="${className}">Delete</button></div></article>`; }).join('');
}
function clearForm() { form.reset(); document.querySelector('#editingClass').value = ''; document.querySelector('#classDialogTitle').textContent = 'Add class'; }
function openEdit(className) { const info = metadata[className] || {}; document.querySelector('#editingClass').value = className; document.querySelector('#className').value = className; document.querySelector('#classTeacher').value = info.teacher === 'Not assigned' ? '' : info.teacher; document.querySelector('#classRoom').value = info.room === 'Not assigned' ? '' : info.room; document.querySelector('#classDialogTitle').textContent = 'Edit class'; dialog.showModal(); }
function moveClass(oldName, newName) { database.students[newName] = database.students[oldName]; Object.keys(database.attendance).forEach((key) => { if (key.startsWith(`${oldName}|`)) database.attendance[key.replace(`${oldName}|`, `${newName}|`)] = database.attendance[key]; }); delete database.students[oldName]; delete metadata[oldName]; }
document.querySelector('#addClassButton').addEventListener('click', () => { clearForm(); dialog.showModal(); });
document.querySelector('#closeClassDialog').addEventListener('click', () => { dialog.close(); clearForm(); });
document.querySelector('#cancelClassDialog').addEventListener('click', () => { dialog.close(); clearForm(); });
grid.addEventListener('click', (event) => { const button = event.target.closest('button'); if (!button) return; const className = button.dataset.class; if (button.classList.contains('edit-class')) openEdit(className); if (button.classList.contains('remove-class') && confirm(`Delete ${className} and its attendance records?`)) { if (classNames.length === 1) return; delete database.students[className]; delete metadata[className]; Object.keys(database.attendance).forEach((key) => { if (key.startsWith(`${className}|`)) delete database.attendance[key]; }); save(); render(); } });
form.addEventListener('submit', (event) => { event.preventDefault(); const oldName = document.querySelector('#editingClass').value; const name = document.querySelector('#className').value.trim(); if (!name || (!oldName && database.students[name]) || (oldName !== name && database.students[name])) { document.querySelector('#className').setCustomValidity('This class already exists.'); form.reportValidity(); document.querySelector('#className').setCustomValidity(''); return; } if (oldName && oldName !== name) moveClass(oldName, name); if (!database.students[name]) database.students[name] = []; metadata[name] = { teacher: document.querySelector('#classTeacher').value.trim() || 'Not assigned', room: document.querySelector('#classRoom').value.trim() || 'Not assigned' }; save(); dialog.close(); clearForm(); render(); });
async function loadBackendData() {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) return;
        const data = await response.json();
        if (data.students) {
            database.students = data.students;
            database.attendance = data.attendance || {};
            if (data.classMetadata && Object.keys(data.classMetadata).length) metadata = data.classMetadata;
            localStorage.setItem(DATA_KEY, JSON.stringify(database));
            localStorage.setItem(CLASS_KEY, JSON.stringify(metadata));
        }
    } catch (error) {
        console.warn('Backend unavailable, using local class data.', error);
    }
}
loadBackendData().then(render);