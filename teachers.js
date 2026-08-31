const TEACHER_KEY = 'attendly-teachers-v1';
let teachers = JSON.parse(localStorage.getItem(TEACHER_KEY) || 'null');
if (!Array.isArray(teachers)) {
    teachers = [
        { id: 'teacher-1', name: 'Priya Sharma', subject: 'Mathematics', className: 'Class 10-A', phone: '+91 98765 43210' },
        { id: 'teacher-2', name: 'Rahul Verma', subject: 'Science', className: 'Class 10-B', phone: '+91 98111 22334' },
        { id: 'teacher-3', name: 'Neha Kapoor', subject: 'English', className: '', phone: '' }
    ];
    localStorage.setItem(TEACHER_KEY, JSON.stringify(teachers));
}
let editingId = '';
const rows = document.querySelector('#teacherRows');
const search = document.querySelector('#teacherSearch');
const filter = document.querySelector('#teacherFilter');
const dialog = document.querySelector('#teacherDialog');
const form = document.querySelector('#teacherForm');
function save() {
    localStorage.setItem(TEACHER_KEY, JSON.stringify(teachers));
    fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teachers }) }).catch(() => {});
}
function initials(name) { return name.split(' ').map((part) => part[0]).join('').slice(0, 2); }
function render() {
    const query = search.value.toLowerCase();
    const visible = teachers.filter((teacher) => (filter.value === 'all' || (filter.value === 'assigned' ? teacher.className : !teacher.className)) && `${teacher.name} ${teacher.subject} ${teacher.className}`.toLowerCase().includes(query));
    rows.innerHTML = visible.map((teacher) => `<tr><td><div class="student"><span class="student-avatar teacher-avatar">${initials(teacher.name)}</span>${teacher.name}</div></td><td>${teacher.subject}</td><td>${teacher.className || 'Not assigned'}</td><td>${teacher.phone || '—'}</td><td><span class="teacher-status ${teacher.className ? '' : 'unassigned'}">${teacher.className ? 'Assigned' : 'Unassigned'}</span></td><td><div class="teacher-actions"><button class="edit-teacher" data-id="${teacher.id}" aria-label="Edit ${teacher.name}">✎</button><button class="delete-teacher" data-id="${teacher.id}" aria-label="Delete ${teacher.name}">×</button></div></td></tr>`).join('');
    document.querySelector('#teacherEmpty').hidden = visible.length > 0;
    document.querySelector('#teacherCount').textContent = teachers.length;
    document.querySelector('#assignedCount').textContent = teachers.filter((teacher) => teacher.className).length;
    document.querySelector('#subjectCount').textContent = new Set(teachers.map((teacher) => teacher.subject.toLowerCase())).size;
}
function clearForm() { form.reset(); editingId = ''; document.querySelector('#teacherDialogTitle').textContent = 'Add teacher'; }
function openEdit(teacher) { editingId = teacher.id; document.querySelector('#teacherName').value = teacher.name; document.querySelector('#teacherSubject').value = teacher.subject; document.querySelector('#teacherClass').value = teacher.className; document.querySelector('#teacherPhone').value = teacher.phone; document.querySelector('#teacherDialogTitle').textContent = 'Edit teacher'; dialog.showModal(); }
function message(text) { const element = document.querySelector('#teacherMessage'); element.textContent = text; setTimeout(() => { element.textContent = ''; }, 3000); }
search.addEventListener('input', render); filter.addEventListener('change', render);
document.querySelector('#addTeacherButton').addEventListener('click', () => { clearForm(); dialog.showModal(); });
document.querySelector('#closeTeacherDialog').addEventListener('click', () => { dialog.close(); clearForm(); });
document.querySelector('#cancelTeacherDialog').addEventListener('click', () => { dialog.close(); clearForm(); });
rows.addEventListener('click', (event) => { const button = event.target.closest('button'); if (!button) return; const teacher = teachers.find((item) => item.id === button.dataset.id); if (!teacher) return; if (button.classList.contains('edit-teacher')) openEdit(teacher); if (button.classList.contains('delete-teacher') && confirm(`Delete ${teacher.name}?`)) { teachers = teachers.filter((item) => item.id !== teacher.id); save(); render(); message('Teacher deleted.'); } });
form.addEventListener('submit', (event) => { event.preventDefault(); const values = { name: document.querySelector('#teacherName').value.trim(), subject: document.querySelector('#teacherSubject').value.trim(), className: document.querySelector('#teacherClass').value, phone: document.querySelector('#teacherPhone').value.trim() }; if (editingId) Object.assign(teachers.find((teacher) => teacher.id === editingId), values); else teachers.push({ id: `teacher-${Date.now()}`, ...values }); save(); dialog.close(); clearForm(); render(); message('Teacher saved.'); });
async function loadBackendData() {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) return;
        const data = await response.json();
        if (Array.isArray(data.teachers) && data.teachers.length) {
            teachers = data.teachers;
            localStorage.setItem(TEACHER_KEY, JSON.stringify(teachers));
        } else if (teachers.length) save();
    } catch (error) {
        console.warn('Backend unavailable, using local teacher data.', error);
    }
}
loadBackendData().then(() => loadClassOptions(['#teacherClass']).then(render));