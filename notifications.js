const DATA_KEY = 'attendly-data-v2';
const LEAVE_KEY = 'attendly-leaves-v1';
const READ_KEY = 'attendly-notification-read-v1';
const indiaDateParts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
const indiaDateValues = Object.fromEntries(indiaDateParts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
const today = `${indiaDateValues.year}-${indiaDateValues.month}-${indiaDateValues.day}`;
const classes = ['Class 10-A', 'Class 10-B', 'Class 9-A'];
let database = JSON.parse(localStorage.getItem(DATA_KEY) || '{"students":{},"attendance":{}}');
let leaves = JSON.parse(localStorage.getItem(LEAVE_KEY) || '[]');
let readIds = JSON.parse(localStorage.getItem(READ_KEY) || '[]');
let activeType = 'all';
const search = document.querySelector('#notificationSearch');
function saveRead() { localStorage.setItem(READ_KEY, JSON.stringify(readIds)); }
function buildNotifications() {
    const notifications = [];
    classes.forEach((className) => (database.students?.[className] || []).forEach((student) => {
        const record = database.attendance?.[`${className}|${today}`]?.[student.roll];
        if (record?.status === 'absent') notifications.push({ id: `absence-${className}-${student.roll}-${today}`, type: 'absence', title: `${student.name} is absent`, body: `${student.name} from ${className.replace('Class ', '')} was marked absent today. Consider contacting the parent.`, time: 'Today · Attendance' });
    }));
    leaves.filter((leave) => leave.status === 'pending').forEach((leave) => notifications.push({ id: leave.id, type: 'leave', title: 'Leave request needs review', body: `${leave.student} (${leave.className.replace('Class ', '')}) requested leave for ${leave.from === leave.to ? leave.from : `${leave.from} to ${leave.to}`}.`, time: 'Pending request' }));
    classes.forEach((className) => {
        const students = database.students?.[className] || [];
        const records = database.attendance?.[`${className}|${today}`] || {};
        const marked = Object.values(records).filter((record) => record.status === 'present' || record.status === 'late' || record.status === 'absent');
        if (students.length && marked.length < students.length) notifications.push({ id: `incomplete-${className}-${today}`, type: 'attendance', title: `${className} register is incomplete`, body: `${students.length - marked.length} student record(s) are still not marked for today.`, time: 'Needs attention' });
    });
    return notifications;
}
function render() {
    const notifications = buildNotifications();
    const query = search.value.toLowerCase();
    const visible = notifications.filter((item) => (activeType === 'all' || item.type === activeType) && `${item.title} ${item.body}`.toLowerCase().includes(query));
    document.querySelector('#notificationList').innerHTML = visible.map((item) => `<article class="notification-item ${readIds.includes(item.id) ? '' : 'unread'}"><div class="notification-icon ${item.type}">${item.type === 'absence' ? '!' : item.type === 'leave' ? '◷' : '✓'}</div><div class="notification-body"><strong>${item.title}</strong><p>${item.body}</p><small>${item.time}</small></div><div class="notification-actions">${readIds.includes(item.id) ? '' : `<button class="mark-read" data-id="${item.id}">Mark read</button>`}<a class="row-action" href="${item.type === 'leave' ? 'leaves.html' : item.type === 'absence' ? 'index.html' : 'reports.html'}">Open</a></div></article>`).join('');
    document.querySelector('#notificationEmpty').hidden = visible.length > 0;
    const unread = notifications.filter((item) => !readIds.includes(item.id)).length;
    document.querySelector('#unreadCount').textContent = unread;
    document.querySelector('#absenceCount').textContent = notifications.filter((item) => item.type === 'absence').length;
    document.querySelector('#pendingLeaveCount').textContent = notifications.filter((item) => item.type === 'leave').length;
    document.querySelector('#allNotificationCount').textContent = notifications.length;
    document.querySelector('#absenceFilterCount').textContent = notifications.filter((item) => item.type === 'absence').length;
    document.querySelector('#leaveFilterCount').textContent = notifications.filter((item) => item.type === 'leave').length;
    document.querySelector('#attendanceFilterCount').textContent = notifications.filter((item) => item.type === 'attendance').length;
}
function showMessage(text) { const message = document.querySelector('#notificationMessage'); message.textContent = text; setTimeout(() => { message.textContent = ''; }, 3000); }
document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => { activeType = button.dataset.type; document.querySelectorAll('.filter').forEach((item) => item.classList.toggle('active', item === button)); render(); }));
search.addEventListener('input', render);
document.querySelector('#notificationList').addEventListener('click', (event) => { const button = event.target.closest('.mark-read'); if (!button) return; readIds.push(button.dataset.id); saveRead(); render(); showMessage('Notification marked as read.'); });
document.querySelector('#markAllRead').addEventListener('click', () => { readIds = buildNotifications().map((item) => item.id); saveRead(); render(); showMessage('All notifications marked as read.'); });
async function loadBackendData() {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) return;
        const data = await response.json();
        if (data.students && data.attendance) {
            database = { ...database, students: data.students, attendance: data.attendance };
            if (Array.isArray(data.leaves)) leaves = data.leaves;
            localStorage.setItem(DATA_KEY, JSON.stringify(database));
            localStorage.setItem(LEAVE_KEY, JSON.stringify(leaves));
        }
    } catch (error) {
        console.warn('Backend unavailable, using local notifications data.', error);
    }
}
loadBackendData().then(render);