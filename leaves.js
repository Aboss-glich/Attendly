const LEAVE_KEY = 'attendly-leaves-v1';
const indiaDateParts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
const indiaDateValues = Object.fromEntries(indiaDateParts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
const today = `${indiaDateValues.year}-${indiaDateValues.month}-${indiaDateValues.day}`;
let leaves = JSON.parse(localStorage.getItem(LEAVE_KEY) || 'null');
if (!Array.isArray(leaves)) {
    leaves = [
        { id: 'leave-1', student: 'Meera Joshi', className: 'Class 10-A', from: '2026-08-24', to: '2026-08-25', reason: 'Medical leave', status: 'pending' },
        { id: 'leave-2', student: 'Aarav Sharma', className: 'Class 10-A', from: '2026-08-10', to: '2026-08-10', reason: 'Family emergency', status: 'approved' }
    ];
    localStorage.setItem(LEAVE_KEY, JSON.stringify(leaves));
}
let activeStatus = 'all';
const rows = document.querySelector('#leaveRows');
const search = document.querySelector('#leaveSearch');
const dialog = document.querySelector('#leaveDialog');
const form = document.querySelector('#leaveForm');
function save() {
    localStorage.setItem(LEAVE_KEY, JSON.stringify(leaves));
    fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leaves }) }).catch(() => {});
}
async function loadLeaves() {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) return;
        const data = await response.json();
        if (Array.isArray(data.leaves) && (data.leaves.length || !leaves.length)) {
            leaves = data.leaves;
            localStorage.setItem(LEAVE_KEY, JSON.stringify(leaves));
        } else if (leaves.length) {
            save();
        }
    } catch (error) {
        console.warn('Backend unavailable, using local leave data.', error);
    }
}
function daysBetween(from, to) { return Math.max(1, Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000) + 1); }
function formatDate(value) { return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
function initials(name) { return name.split(' ').map((part) => part[0]).join('').slice(0, 2); }
function render() {
    const query = search.value.toLowerCase();
    const visible = leaves.filter((leave) => (activeStatus === 'all' || leave.status === activeStatus) && `${leave.student} ${leave.className} ${leave.reason}`.toLowerCase().includes(query));
    rows.innerHTML = visible.map((leave) => `<tr><td><div class="student"><span class="student-avatar green">${initials(leave.student)}</span>${leave.student}</div></td><td>${leave.className.replace('Class ', '')}</td><td>${formatDate(leave.from)}${leave.from !== leave.to ? ` - ${formatDate(leave.to)}` : ''}<small class="table-subtext">${daysBetween(leave.from, leave.to)} day${daysBetween(leave.from, leave.to) === 1 ? '' : 's'}</small></td><td>${leave.reason}</td><td><span class="leave-status ${leave.status}">${leave.status[0].toUpperCase() + leave.status.slice(1)}</span></td><td><div class="leave-actions">${leave.status === 'pending' ? `<button class="approve" data-id="${leave.id}">Approve</button><button class="reject" data-id="${leave.id}">Reject</button>` : `<button class="delete-leave" data-id="${leave.id}" aria-label="Delete request">×</button>`}</div></td></tr>`).join('');
    document.querySelector('#leaveEmpty').hidden = visible.length > 0;
    const count = (status) => leaves.filter((leave) => leave.status === status).length;
    document.querySelector('#pendingCount').textContent = count('pending'); document.querySelector('#approvedCount').textContent = count('approved'); document.querySelector('#rejectedCount').textContent = count('rejected'); document.querySelector('#leaveDays').textContent = leaves.filter((leave) => leave.status === 'approved').reduce((sum, leave) => sum + daysBetween(leave.from, leave.to), 0);
    document.querySelector('#allLeaveCount').textContent = leaves.length; document.querySelector('#pendingFilterCount').textContent = count('pending'); document.querySelector('#approvedFilterCount').textContent = count('approved'); document.querySelector('#rejectedFilterCount').textContent = count('rejected');
}
function clearForm() { form.reset(); document.querySelector('#leaveFrom').value = today; document.querySelector('#leaveTo').value = today; }
function message(text) { const element = document.querySelector('#leaveMessage'); element.textContent = text; setTimeout(() => { element.textContent = ''; }, 3000); }
document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => { activeStatus = button.dataset.status; document.querySelectorAll('.filter').forEach((item) => item.classList.toggle('active', item === button)); render(); }));
search.addEventListener('input', render);
document.querySelector('#addLeaveButton').addEventListener('click', () => { clearForm(); dialog.showModal(); });
document.querySelector('#closeLeaveDialog').addEventListener('click', () => { dialog.close(); clearForm(); });
document.querySelector('#cancelLeaveDialog').addEventListener('click', () => { dialog.close(); clearForm(); });
rows.addEventListener('click', (event) => { const button = event.target.closest('button'); if (!button) return; const leave = leaves.find((item) => item.id === button.dataset.id); if (!leave) return; if (button.classList.contains('approve')) leave.status = 'approved'; if (button.classList.contains('reject')) leave.status = 'rejected'; if (button.classList.contains('delete-leave')) leaves = leaves.filter((item) => item.id !== leave.id); save(); render(); message(button.classList.contains('approve') ? 'Leave approved.' : button.classList.contains('reject') ? 'Leave rejected.' : 'Request deleted.'); });
form.addEventListener('submit', (event) => { event.preventDefault(); const from = document.querySelector('#leaveFrom').value; const to = document.querySelector('#leaveTo').value; if (to < from) { document.querySelector('#leaveTo').setCustomValidity('End date must be after start date.'); form.reportValidity(); document.querySelector('#leaveTo').setCustomValidity(''); return; } leaves.unshift({ id: `leave-${Date.now()}`, student: document.querySelector('#leaveStudent').value.trim(), className: document.querySelector('#leaveClass').value, from, to, reason: document.querySelector('#leaveReason').value, status: 'pending' }); save(); dialog.close(); clearForm(); render(); message('Leave request submitted.'); });
clearForm();
loadLeaves().then(() => loadClassOptions(['#leaveClass']).then(render));