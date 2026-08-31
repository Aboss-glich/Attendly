const DATA_KEY = 'attendly-data-v2';
let classes = [...DEFAULT_CLASSES];
let database = JSON.parse(localStorage.getItem(DATA_KEY) || 'null') || { students: {}, attendance: {} };
database.students = database.students || {};
database.attendance = database.attendance || {};
classes.forEach((className) => { if (!Array.isArray(database.students[className])) database.students[className] = []; });
let currentClass = 'Class 10-A';
const rows = document.querySelector('#studentRows');
const search = document.querySelector('#studentSearch');
const dialog = document.querySelector('#studentDialog');
const form = document.querySelector('#studentForm');

function save() {
    localStorage.setItem(DATA_KEY, JSON.stringify(database));
    fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(database) }).catch(() => {});
}
function list() { return database.students[currentClass]; }
function initials(name) { return name.split(' ').map((part) => part[0]).join('').slice(0, 2); }
function rate(student) {
    const statuses = Object.entries(database.attendance).filter(([key]) => key.startsWith(`${currentClass}|`)).map(([, day]) => day[student.roll]?.status).filter((status) => status === 'present' || status === 'late');
    return statuses.length ? Math.round((statuses.filter((status) => status === 'present').length + statuses.filter((status) => status === 'late').length * .75) / statuses.length * 100) : student.rate || 0;
}
function render() {
    const query = search.value.toLowerCase();
    const visible = list().filter((student) => `${student.name} ${student.roll}`.toLowerCase().includes(query));
    rows.innerHTML = visible.map((student) => `<tr><td><div class="student"><span class="student-avatar ${student.color || 'green'}">${initials(student.name)}</span>${student.name}</div></td><td>${student.roll}</td><td><div class="rate-cell"><span>${rate(student)}%</span><i><b style="width:${rate(student)}%"></b></i></div></td><td>${student.parentContact || '—'}</td><td>${student.added || 'Imported'}</td><td><div class="row-actions"><button class="row-action edit" data-roll="${student.roll}" aria-label="Edit ${student.name}">✎</button><button class="row-action delete" data-roll="${student.roll}" aria-label="Delete ${student.name}">×</button></div></td></tr>`).join('');
    document.querySelector('#emptyState').hidden = visible.length > 0;
    document.querySelector('#directoryCount').textContent = `${visible.length} of ${list().length} students`;
    document.querySelector('#totalStudents').textContent = list().length;
    const rates = list().map(rate).filter((value) => value > 0);
    document.querySelector('#averageRate').textContent = rates.length ? `${Math.round(rates.reduce((sum, value) => sum + value, 0) / rates.length)}%` : '—';
}
function clearForm() { form.reset(); document.querySelector('#editingRoll').value = ''; document.querySelector('#dialogTitle').textContent = 'Add student'; }
function openEdit(student) {
    document.querySelector('#editingRoll').value = student.roll;
    document.querySelector('#studentName').value = student.name;
    document.querySelector('#studentRoll').value = student.roll;
    document.querySelector('#parentContact').value = student.parentContact || '';
    document.querySelector('#studentNotes').value = student.notes || '';
    document.querySelector('#dialogTitle').textContent = 'Edit student';
    dialog.showModal();
}

document.querySelector('#classPicker').addEventListener('change', (event) => { currentClass = event.target.value; search.value = ''; render(); });
search.addEventListener('input', render);
document.querySelector('#addStudentButton').addEventListener('click', () => { clearForm(); dialog.showModal(); });
document.querySelector('#closeStudentDialog').addEventListener('click', () => { dialog.close(); clearForm(); });
document.querySelector('#cancelStudentDialog').addEventListener('click', () => { dialog.close(); clearForm(); });
rows.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const student = list().find((item) => item.roll === button.dataset.roll);
    if (button.classList.contains('edit')) openEdit(student);
    if (button.classList.contains('delete') && confirm(`Delete ${student.name} from ${currentClass}?`)) {
        database.students[currentClass] = list().filter((item) => item.roll !== student.roll);
        Object.keys(database.attendance).forEach((key) => { if (key.startsWith(`${currentClass}|`)) delete database.attendance[key][student.roll]; });
        save();
        render();
    }
});
form.addEventListener('submit', (event) => {
    event.preventDefault();
    const oldRoll = document.querySelector('#editingRoll').value;
    const name = document.querySelector('#studentName').value.trim();
    const roll = document.querySelector('#studentRoll').value.trim();
    const duplicate = list().some((student) => student.roll === roll && student.roll !== oldRoll);
    if (duplicate) { document.querySelector('#studentRoll').setCustomValidity('This roll number already exists in this class.'); form.reportValidity(); document.querySelector('#studentRoll').setCustomValidity(''); return; }
    const values = { name, roll, parentContact: document.querySelector('#parentContact').value.trim(), notes: document.querySelector('#studentNotes').value.trim(), color: 'green', added: new Date().toLocaleDateString('en-IN') };
    if (oldRoll) {
        const student = list().find((item) => item.roll === oldRoll);
        Object.assign(student, values);
        if (oldRoll !== roll) Object.keys(database.attendance).forEach((key) => { if (key.startsWith(`${currentClass}|`) && database.attendance[key][oldRoll]) { database.attendance[key][roll] = database.attendance[key][oldRoll]; delete database.attendance[key][oldRoll]; } });
    } else list().push(values);
    save();
    dialog.close();
    clearForm();
    render();
});
async function loadBackendData() {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) return;
        const data = await response.json();
        if (data.students && data.attendance) {
            database.students = data.students;
            database.attendance = data.attendance;
            localStorage.setItem(DATA_KEY, JSON.stringify(database));
        }
    } catch (error) {
        console.warn('Backend unavailable, using local student data.', error);
    }
}
loadBackendData().then(() => loadClassOptions(['#classPicker']).then((loadedClasses) => {
    classes = loadedClasses;
    if (!database.students[currentClass]) currentClass = classes[0];
    document.querySelector('#classPicker').value = currentClass;
    render();
}));