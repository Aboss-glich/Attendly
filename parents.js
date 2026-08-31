const DATA_KEY = 'attendly-data-v2';
const PARENT_KEY = 'attendly-parents-v1';
let classes = [...DEFAULT_CLASSES];
const database = JSON.parse(localStorage.getItem(DATA_KEY) || '{"students":{},"attendance":{}}');
database.students = database.students || {};
let contacts = JSON.parse(localStorage.getItem(PARENT_KEY) || '{}');
let selectedClass = 'All classes';
let editKey = '';
const rows = document.querySelector('#parentRows');
const search = document.querySelector('#parentSearch');
const dialog = document.querySelector('#parentDialog');
const form = document.querySelector('#parentForm');
function save() {
    localStorage.setItem(DATA_KEY, JSON.stringify(database));
    localStorage.setItem(PARENT_KEY, JSON.stringify(contacts));
    fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...database, parents: contacts }) }).catch(() => {});
}
function allStudents() { return classes.flatMap((className) => (database.students[className] || []).map((student) => ({ className, student }))); }
function contactList() { return allStudents().map(({ className, student }) => { const key = `${className}|${student.roll}`; const contact = contacts[key] || (student.parentContact ? { name: 'Parent / guardian', phone: student.parentContact, lastContact: 'Imported' } : null); return { key, className, student, contact }; }).filter((item) => item.contact); }
function initials(name) { return name.split(' ').map((part) => part[0]).join('').slice(0, 2); }
function render() {
    const query = search.value.toLowerCase();
    const visible = contactList().filter(({ className, student, contact }) => (selectedClass === 'All classes' || className === selectedClass) && `${student.name} ${contact.name} ${contact.phone}`.toLowerCase().includes(query));
    rows.innerHTML = visible.map(({ key, className, student, contact }) => `<tr><td><div class="student"><span class="student-avatar parent-avatar">${initials(contact.name)}</span>${contact.name}</div></td><td>${student.name}</td><td>${className.replace('Class ', '')}</td><td class="parent-phone">${contact.phone}</td><td>${contact.lastContact || 'Not contacted'}</td><td><div class="parent-actions"><button class="edit-parent" data-key="${key}" aria-label="Edit ${contact.name}">✎</button><button class="delete-parent" data-key="${key}" aria-label="Delete ${contact.name}">×</button></div></td></tr>`).join('');
    document.querySelector('#parentEmpty').hidden = visible.length > 0;
    document.querySelector('#parentCount').textContent = contactList().length;
    document.querySelector('#phoneCount').textContent = contactList().filter(({ contact }) => contact.phone).length;
    document.querySelector('#missingCount').textContent = allStudents().filter(({ className, student }) => !contacts[`${className}|${student.roll}`] && !student.parentContact).length;
}
function clearForm() { form.reset(); editKey = ''; document.querySelector('#parentDialogTitle').textContent = 'Add parent contact'; }
function openEdit(item) { editKey = item.key; document.querySelector('#parentStudent').value = item.student.name; document.querySelector('#parentClass').value = item.className; document.querySelector('#parentName').value = item.contact.name; document.querySelector('#parentPhone').value = item.contact.phone; document.querySelector('#parentDialogTitle').textContent = 'Edit parent contact'; dialog.showModal(); }
function message(text) { const element = document.querySelector('#parentMessage'); element.textContent = text; setTimeout(() => { element.textContent = ''; }, 3000); }
document.querySelector('#classPicker').addEventListener('change', (event) => { selectedClass = event.target.value; render(); });
search.addEventListener('input', render);
document.querySelector('#addParentButton').addEventListener('click', () => { clearForm(); dialog.showModal(); });
document.querySelector('#closeParentDialog').addEventListener('click', () => { dialog.close(); clearForm(); });
document.querySelector('#cancelParentDialog').addEventListener('click', () => { dialog.close(); clearForm(); });
rows.addEventListener('click', (event) => { const button = event.target.closest('button'); if (!button) return; const item = contactList().find((entry) => entry.key === button.dataset.key); if (!item) return; if (button.classList.contains('edit-parent')) openEdit(item); if (button.classList.contains('delete-parent') && confirm(`Remove contact for ${item.student.name}?`)) { delete contacts[item.key]; const student = item.student; delete student.parentContact; save(); render(); message('Parent contact removed.'); } });
form.addEventListener('submit', (event) => { event.preventDefault(); const className = document.querySelector('#parentClass').value; const studentName = document.querySelector('#parentStudent').value.trim(); const student = (database.students[className] || []).find((item) => item.name.toLowerCase() === studentName.toLowerCase()); if (!student) { document.querySelector('#parentStudent').setCustomValidity('Student name was not found in this class.'); form.reportValidity(); document.querySelector('#parentStudent').setCustomValidity(''); return; } const key = `${className}|${student.roll}`; if (editKey && editKey !== key) delete contacts[editKey]; contacts[key] = { name: document.querySelector('#parentName').value.trim(), phone: document.querySelector('#parentPhone').value.trim(), lastContact: new Date().toLocaleDateString('en-IN') }; student.parentContact = contacts[key].phone; save(); dialog.close(); clearForm(); render(); message('Parent contact saved.'); });
async function loadBackendData() {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) return;
        const data = await response.json();
        if (data.students) {
            database.students = data.students;
            database.attendance = data.attendance || {};
            if (data.parents && Object.keys(data.parents).length) contacts = data.parents;
            localStorage.setItem(DATA_KEY, JSON.stringify(database));
            localStorage.setItem(PARENT_KEY, JSON.stringify(contacts));
        }
    } catch (error) {
        console.warn('Backend unavailable, using local parent data.', error);
    }
}
loadBackendData().then(() => loadClassOptions([{ selector: '#classPicker', includeAll: true }, '#parentClass']).then((loadedClasses) => {
    classes = loadedClasses;
    render();
}));