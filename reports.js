const DATA_KEY = 'attendly-data-v2';
const SETTINGS_KEY = 'attendly-settings-v1';
let classes = [...DEFAULT_CLASSES];
const database = JSON.parse(localStorage.getItem(DATA_KEY) || '{"students":{},"attendance":{}}');
const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
const minimum = Number(settings.minimumAttendance || 75);
let selectedClass = 'All classes';

function classesInScope() { return selectedClass === 'All classes' ? classes : [selectedClass]; }
function dayEntries() { return Object.entries(database.attendance || {}).filter(([key]) => classesInScope().some((className) => key.startsWith(`${className}|`)) && key.split('|')[1]?.startsWith(document.querySelector('#reportYear').value)); }
function statusValues(entries) { return entries.flatMap(([, day]) => Object.values(day).map((record) => record.status)).filter((status) => status === 'present' || status === 'late' || status === 'absent'); }
function percentage(values) { return values.length ? Math.round((values.filter((value) => value === 'present').length + values.filter((value) => value === 'late').length * .75) / values.length * 100) : 0; }
function initials(name) { return name.split(' ').map((part) => part[0]).join('').slice(0, 2); }
function studentStats(className, student) {
    const entries = Object.entries(database.attendance || {}).filter(([key]) => key.startsWith(`${className}|`) && key.split('|')[1]?.startsWith(document.querySelector('#reportYear').value));
    const statuses = entries.map(([, day]) => day[student.roll]?.status).filter((status) => status === 'present' || status === 'late' || status === 'absent');
    return { rate: percentage(statuses), absent: statuses.filter((status) => status === 'absent').length, marked: statuses.length };
}
function render() {
    const entries = dayEntries();
    const values = statusValues(entries);
    document.querySelector('#yearAverage').textContent = `${percentage(values)}%`;
    document.querySelector('#markedDays').textContent = new Set(entries.map(([key]) => key.split('|')[1])).size;
    document.querySelector('#lateTotal').textContent = values.filter((value) => value === 'late').length;
    const allStudents = classesInScope().flatMap((className) => (database.students?.[className] || []).map((student) => ({ className, student, stats: studentStats(className, student) })));
    const attention = allStudents.filter((item) => item.stats.marked && item.stats.rate < minimum).sort((a, b) => a.stats.rate - b.stats.rate);
    document.querySelector('#needsAttention').textContent = attention.length;
    document.querySelector('#attentionRows').innerHTML = attention.map(({ className, student, stats }) => `<tr><td><div class="student"><span class="student-avatar ${student.color || 'green'}">${initials(student.name)}</span>${student.name}</div></td><td>${className.replace('Class ', '')}</td><td><div class="rate-cell"><span>${stats.rate}%</span><i><b style="width:${stats.rate}%"></b></i></div></td><td>${stats.absent}</td><td class="recommendation">Contact parent</td></tr>`).join('');
    document.querySelector('#attentionEmpty').hidden = attention.length > 0;
    renderMonths(entries);
    renderClasses();
}
function renderMonths(entries) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map((month, index) => { const monthEntries = entries.filter(([key]) => Number(key.split('|')[1].slice(5, 7)) === index + 1); return { month, rate: percentage(statusValues(monthEntries)) }; });
    const best = data.filter((item) => item.rate).sort((a, b) => b.rate - a.rate)[0];
    document.querySelector('#bestMonth').textContent = best ? `${best.month} · ${best.rate}%` : '—';
    document.querySelector('#monthChart').innerHTML = data.map((item) => `<div class="report-bar ${item.rate ? 'active' : ''}"><b>${item.rate ? `${item.rate}%` : ''}</b><i style="height:${Math.max(item.rate, 4)}%"></i><span>${item.month}</span></div>`).join('');
}
function renderClasses() {
    const values = classes.map((className) => ({ className, rate: percentage(statusValues(Object.entries(database.attendance || {}).filter(([key]) => key.startsWith(`${className}|`) && key.split('|')[1]?.startsWith(document.querySelector('#reportYear').value)))) }));
    document.querySelector('#classComparison').innerHTML = values.map((item) => `<div class="class-line"><span>${item.className.replace('Class ', '')}</span><i><b style="width:${item.rate}%"></b></i><strong>${item.rate}%</strong></div>`).join('');
}
function exportReport() {
    const lines = ['Student,Class,Year,Attendance,Absent Days'];
    classesInScope().forEach((className) => (database.students?.[className] || []).forEach((student) => { const stats = studentStats(className, student); lines.push(`${student.name},${className},${document.querySelector('#reportYear').value},${stats.rate}%,${stats.absent}`); }));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    link.download = `attendly-report-${document.querySelector('#reportYear').value}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    document.querySelector('#reportMessage').textContent = 'Report exported successfully.';
    setTimeout(() => { document.querySelector('#reportMessage').textContent = ''; }, 3000);
}
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
        console.warn('Backend unavailable, using local report data.', error);
    }
}
document.querySelector('#classPicker').addEventListener('change', (event) => { selectedClass = event.target.value; render(); });
document.querySelector('#reportYear').addEventListener('change', render);
document.querySelector('#exportReport').addEventListener('click', exportReport);
document.querySelector('#printReport').addEventListener('click', () => window.print());
loadBackendData().then(() => loadClassOptions([{ selector: '#classPicker', includeAll: true }]).then((loadedClasses) => {
    classes = loadedClasses;
    render();
}));