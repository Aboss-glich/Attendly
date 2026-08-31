const STORAGE_KEY = 'attendly-data-v2';
const seedStudents = [
	{ name: 'Aarav Sharma', roll: '01', color: 'green', rate: 96 }, { name: 'Diya Patel', roll: '02', color: 'pink', rate: 94 },
	{ name: 'Kabir Singh', roll: '03', color: 'blue', rate: 89 }, { name: 'Meera Joshi', roll: '04', color: 'purple', rate: 82 },
	{ name: 'Rohan Verma', roll: '05', color: 'orange', rate: 98 }, { name: 'Ishita Rao', roll: '06', color: 'yellow', rate: 91 }
];
let classes = [...DEFAULT_CLASSES];
function indiaDateKey(date = new Date()) { const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date); const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])); return `${values.year}-${values.month}-${values.day}`; }
function localDateKey(date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
const today = indiaDateKey();
const classSeeds = {
	'Class 10-A': seedStudents,
	'Class 10-B': [{ name: 'Vivaan Mehta', roll: '01', color: 'blue', rate: 93 }, { name: 'Anaya Shah', roll: '02', color: 'pink', rate: 97 }, { name: 'Arjun Nair', roll: '03', color: 'orange', rate: 88 }, { name: 'Sara Khan', roll: '04', color: 'purple', rate: 91 }],
	'Class 9-A': [{ name: 'Aditya Rao', roll: '01', color: 'green', rate: 90 }, { name: 'Myra Kapoor', roll: '02', color: 'yellow', rate: 95 }, { name: 'Reyansh Das', roll: '03', color: 'blue', rate: 86 }]
};
let database = null;

async function loadDatabase() {
	try {
		const response = await fetch('/api/data');
		if (response.ok) {
			const backendData = await response.json();
			if (backendData && typeof backendData === 'object') {
				database = backendData;
				localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
				return;
			}
		}
	} catch (error) {
		console.warn('Backend unavailable, falling back to localStorage.', error);
	}

	database = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || { students: Object.fromEntries(classes.map((className) => [className, classSeeds[className]])), attendance: {} };
	database.students = database.students || {};
	classes.forEach((className) => { if (!Array.isArray(database.students[className])) database.students[className] = classSeeds[className]; });
	database.attendance = database.attendance || {};
		const legacyStudents = database.students['Class 10-A'];
		if (!database.attendance[`Class 10-A|${today}`] && legacyStudents.some((student) => student.status && student.status !== 'unmarked')) {
			database.attendance[`Class 10-A|${today}`] = Object.fromEntries(legacyStudents.filter((student) => student.status).map((student) => [student.roll, { status: student.status, checkIn: student.checkIn || '—' }]));
	}
	localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
}

function syncDatabaseToServer() {
	if (!database) return;
	fetch('/api/data', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(database)
	}).catch((error) => console.warn('Could not sync to backend.', error));
}

let currentClass = 'Class 10-A';
let currentFilter = 'all';
const rows = document.querySelector('#studentRows');
const searchInput = document.querySelector('#searchInput');
const datePicker = document.querySelector('#datePicker');

function initials(name) { return name.split(' ').map((part) => part[0]).join(''); }
function saveDatabase() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
	syncDatabaseToServer();
}
function list() { return database.students[currentClass] || []; }
function dayKey() { return `${currentClass}|${datePicker.value}`; }
function records() { return database.attendance[dayKey()] || {}; }
function approvedLeave(student) { const leaves = database.leaves || JSON.parse(localStorage.getItem('attendly-leaves-v1') || '[]'); return leaves.some((leave) => leave.status === 'approved' && leave.student === student.name && leave.className === currentClass && datePicker.value >= leave.from && datePicker.value <= leave.to); }
function statusOf(student) { return approvedLeave(student) ? 'leave' : records()[student.roll]?.status || 'unmarked'; }
function checkInOf(student) { return records()[student.roll]?.checkIn || '—'; }
function currentLocalTime() { return `${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST`; }
function setStatus(student, status) { if (!database.attendance[dayKey()]) database.attendance[dayKey()] = {}; database.attendance[dayKey()][student.roll] = { status, checkIn: status === 'unmarked' || status === 'absent' ? '—' : checkInOf(student) === '—' ? currentLocalTime() : checkInOf(student) }; saveDatabase(); }
function attendanceRate(student) { const history = Object.entries(database.attendance).filter(([key]) => key.startsWith(`${currentClass}|`)).map(([, day]) => day[student.roll]?.status).filter((value) => value === 'present' || value === 'late' || value === 'absent'); return history.length ? Math.round((history.filter((value) => value === 'present').length + history.filter((value) => value === 'late').length * .75) / history.length * 100) : student.rate || 0; }
function render() {
	const query = searchInput.value.toLowerCase();
	const visible = list().filter((student) => (currentFilter === 'all' || statusOf(student) === currentFilter) && student.name.toLowerCase().includes(query));
	rows.innerHTML = visible.map((student) => { const status = statusOf(student); const label = status === 'unmarked' ? 'Not marked' : status[0].toUpperCase() + status.slice(1); return `<tr><td><div class="student"><span class="student-avatar ${student.color}">${initials(student.name)}</span>${student.name}</div></td><td>${student.roll}</td><td>${checkInOf(student)}</td><td><div class="rate-cell"><span>${attendanceRate(student)}%</span><i><b style="width: ${attendanceRate(student)}%"></b></i></div></td><td><span class="status ${status}">${label}</span></td><td><select class="status-select" data-roll="${student.roll}" aria-label="Change status for ${student.name}"><option value="unmarked" ${status === 'unmarked' ? 'selected' : ''}>Not marked</option><option value="present" ${status === 'present' ? 'selected' : ''}>Present</option><option value="late" ${status === 'late' ? 'selected' : ''}>Late</option><option value="absent" ${status === 'absent' ? 'selected' : ''}>Absent</option></select></td></tr>`; }).join('');
	document.querySelector('#emptyState').hidden = visible.length > 0;
	updateCounts();
	updateReports();
	document.querySelector('#footerText').textContent = `Showing ${visible.length} of ${list().length} students`;
}

function updateCounts() {
	const count = (status) => list().filter((student) => statusOf(student) === status).length;
	document.querySelector('#presentCount').textContent = count('present');
	document.querySelector('#lateCount').textContent = count('late');
	document.querySelector('#absentCount').textContent = count('absent');
	document.querySelector('#totalCount').textContent = list().length;
	document.querySelector('#allFilterCount').textContent = list().length;
	document.querySelector('#presentFilterCount').textContent = count('present');
	document.querySelector('#lateFilterCount').textContent = count('late');
	document.querySelector('#absentFilterCount').textContent = count('absent');
	document.querySelector('#leaveFilterCount').textContent = count('leave');
	document.querySelector('#unmarkedFilterCount').textContent = count('unmarked');
}

function updateReports() {
	const reportYear = document.querySelector('#reportYear');
	if (!reportYear) {
		updateWeeklyReport();
		return;
	}
	const days = Object.entries(database.attendance).filter(([key]) => key.startsWith(`${currentClass}|`) && key.split('|')[1].startsWith(reportYear.value));
	const values = days.flatMap(([, day]) => Object.values(day).map((record) => record.status)).filter((value) => value && value !== 'unmarked');
	const average = values.length ? Math.round((values.filter((value) => value === 'present').length + values.filter((value) => value === 'late').length * .75) / values.length * 100) : 0;
	document.querySelector('#yearAverage').textContent = `${average}%`; document.querySelector('#markedDays').textContent = new Set(days.map(([key]) => key.split('|')[1])).size;
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const monthly = months.map((month, index) => { const monthValues = days.filter(([key]) => Number(key.split('|')[1].slice(5, 7)) === index + 1).flatMap(([, day]) => Object.values(day).map((record) => record.status)).filter((value) => value && value !== 'unmarked'); const value = monthValues.length ? Math.round((monthValues.filter((item) => item === 'present').length + monthValues.filter((item) => item === 'late').length * .75) / monthValues.length * 100) : 0; return { month, value }; });
	const best = monthly.filter((item) => item.value).sort((a, b) => b.value - a.value)[0]; document.querySelector('#bestMonth').textContent = best ? `${best.month} · ${best.value}%` : '—'; document.querySelector('#monthGrid').innerHTML = monthly.map((item) => `<div class="month-card"><strong>${item.month}</strong><span>${item.value ? `${item.value}%` : '—'}</span><i><b style="width:${item.value}%"></b></i></div>`).join('');
	updateWeeklyReport();
}

function updateWeeklyReport() {
	const selectedDay = new Date(`${datePicker.value}T00:00:00`);
	const mondayOffset = (selectedDay.getDay() + 6) % 7;
	selectedDay.setDate(selectedDay.getDate() - mondayOffset);
	const week = Array.from({ length: 7 }, (_, index) => { const day = new Date(selectedDay); day.setDate(selectedDay.getDate() + index); const dateKey = localDateKey(day); const key = `${currentClass}|${dateKey}`; const valuesForDay = Object.values(database.attendance[key] || {}).map((record) => record.status).filter((value) => value && value !== 'unmarked'); const value = valuesForDay.length ? Math.round((valuesForDay.filter((item) => item === 'present').length + valuesForDay.filter((item) => item === 'late').length * .75) / valuesForDay.length * 100) : 0; return { label: day.toLocaleDateString('en', { weekday: 'short' }), dateKey, value }; });
	const activeWeek = week.filter((item) => item.value); const range = `${week[0].dateKey.slice(8)} ${week[0].label} - ${week[6].dateKey.slice(8)} ${week[6].label}`; document.querySelector('#weekRange').textContent = `${range} · Click a date to open its register`; document.querySelector('#weeklyRate').textContent = activeWeek.length ? `${Math.round(activeWeek.reduce((sum, item) => sum + item.value, 0) / activeWeek.length)}%` : '0%'; document.querySelector('#weeklyChart').innerHTML = week.map((item) => `<button type="button" class="chart-day ${item.dateKey === indiaDateKey() ? 'today' : ''} ${item.dateKey === datePicker.value ? 'selected' : ''}" data-date="${item.dateKey}" aria-label="View attendance for ${item.dateKey}"><small>${item.label}<em>${item.dateKey.slice(5)}</em></small><strong>${item.value ? `${item.value}%` : 'Not marked'}</strong></button>`).join('');
}

document.addEventListener('change', (event) => {
	if (event.target.matches('.status-select')) {
		const student = list().find((item) => item.roll === event.target.dataset.roll);
		setStatus(student, event.target.value);
		render();
	}
});
searchInput.addEventListener('input', render);
document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => {
	currentFilter = button.dataset.filter;
	document.querySelectorAll('.filter').forEach((item) => item.classList.toggle('active', item === button));
	render();
}));
datePicker.value = today;
let followsToday = true;
function openRegisterDate(dateKey) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
	datePicker.value = dateKey;
	followsToday = dateKey === indiaDateKey();
	document.querySelector('#registerSubtitle').textContent = `${currentClass} · ${followsToday ? 'Today' : dateKey}`;
	render();
}
datePicker.addEventListener('change', () => openRegisterDate(datePicker.value));
function shiftDate(days) {
	const date = new Date(`${datePicker.value}T00:00:00`);
	date.setDate(date.getDate() + days);
	openRegisterDate(localDateKey(date));
}
document.querySelector('#previousDay').addEventListener('click', () => shiftDate(-1));
document.querySelector('#nextDay').addEventListener('click', () => shiftDate(1));
setInterval(() => {
	const currentDate = indiaDateKey();
	if (followsToday && datePicker.value !== currentDate) {
		datePicker.value = currentDate;
		document.querySelector('#registerSubtitle').textContent = `${currentClass} · Today`;
		render();
	}
}, 30000);
document.querySelector('#saveButton').addEventListener('click', () => {
	list().forEach((student) => { const status = statusOf(student); if (status === 'present' || status === 'late' || status === 'absent') setStatus(student, status); });
	const message = document.querySelector('#saveMessage');
	message.textContent = `Attendance saved for ${datePicker.value}.`;
	setTimeout(() => { message.textContent = ''; }, 3000);
});
document.querySelector('#exportButton').addEventListener('click', () => {
	const csv = ['Student,Roll No,Date,Check-in,Status', ...list().map((student) => `${student.name},${student.roll},${datePicker.value},${checkInOf(student)},${statusOf(student)}`)].join('\n');
	const link = document.createElement('a');
	link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
	link.download = `${currentClass}-${datePicker.value}-attendance.csv`;
	link.click();
	URL.revokeObjectURL(link.href);
});
const dialog = document.querySelector('#studentDialog');
document.querySelector('#addStudentButton').addEventListener('click', () => dialog.showModal());
document.querySelector('#closeStudentDialog').addEventListener('click', () => dialog.close());
document.querySelector('#cancelStudentDialog').addEventListener('click', () => dialog.close());
document.querySelector('#classPicker').addEventListener('change', (event) => {
	currentClass = event.target.value;
	currentFilter = 'all';
	document.querySelector('#registerSubtitle').textContent = `${currentClass} · ${datePicker.value}`;
	render();
});
document.querySelector('#reportYear')?.addEventListener('change', updateReports);
let chartDragStart = null;
let chartWasDragged = false;
let chartDragDistance = 0;
document.querySelector('#weeklyChart').addEventListener('click', (event) => {
	const day = event.target.closest('.chart-day');
	if (!day || chartWasDragged) {
		chartWasDragged = false;
		return;
	}
	openRegisterDate(day.dataset.date);
});
document.querySelector('#weeklyChart').addEventListener('pointerdown', (event) => {
	chartDragStart = event.clientX;
	chartDragDistance = 0;
	chartWasDragged = false;
});
document.querySelector('#weeklyChart').addEventListener('pointermove', (event) => {
	if (chartDragStart === null) return;
	chartDragDistance = event.clientX - chartDragStart;
	if (Math.abs(chartDragDistance) >= 12) chartWasDragged = true;
});
document.addEventListener('pointerup', (event) => {
	if (chartDragStart === null) return;
	const distance = chartDragDistance || event.clientX - chartDragStart;
	if (Math.abs(distance) >= 45) {
		chartWasDragged = true;
		shiftChart(distance < 0 ? 7 : -7);
	}
	chartDragStart = null;
	chartDragDistance = 0;
	setTimeout(() => { chartWasDragged = false; }, 100);
});
document.querySelector('#weeklyChart').addEventListener('pointercancel', () => { chartDragStart = null; chartDragDistance = 0; chartWasDragged = false; });
function shiftChart(days) {
	const date = new Date(`${datePicker.value}T00:00:00`);
	date.setDate(date.getDate() + days);
	datePicker.value = localDateKey(date);
	followsToday = datePicker.value === indiaDateKey();
	document.querySelector('#registerSubtitle').textContent = `${currentClass} · ${followsToday ? 'Today' : datePicker.value}`;
	render();
}
document.querySelector('#previousWeek').addEventListener('click', () => shiftChart(-7));
document.querySelector('#nextWeek').addEventListener('click', () => shiftChart(7));
document.querySelector('#markAllButton').addEventListener('click', () => {
	list().filter((student) => !approvedLeave(student)).forEach((student) => setStatus(student, 'present'));
	render();
});
document.querySelector('#clearAllButton').addEventListener('click', () => {
	const appSettings = JSON.parse(localStorage.getItem('attendly-settings-v1') || '{}');
	if (appSettings.confirmClear !== false && !confirm('Clear attendance for this date? Students will become Not marked.')) return;
	list().filter((student) => !approvedLeave(student)).forEach((student) => setStatus(student, 'unmarked'));
	render();
});
document.querySelector('#studentForm').addEventListener('submit', (event) => {
	event.preventDefault();
	const name = document.querySelector('#studentName').value.trim();
	const roll = document.querySelector('#studentRoll').value.trim();
	if (database.students[currentClass].some((student) => student.roll === roll)) {
		document.querySelector('#studentRoll').setCustomValidity('This roll number already exists in this class.');
		document.querySelector('#studentRoll').reportValidity();
		document.querySelector('#studentRoll').setCustomValidity('');
		return;
	}
	database.students[currentClass].push({ name, roll, color: 'green', rate: 0 });
	saveDatabase();
	dialog.close();
	event.target.reset();
	render();
});
document.querySelector('#backupButton')?.addEventListener('click', () => {
	const link = document.createElement('a');
	link.href = URL.createObjectURL(new Blob([JSON.stringify(database, null, 2)], { type: 'application/json' }));
	link.download = 'attendly-backup.json';
	link.click();
	URL.revokeObjectURL(link.href);
});
document.querySelector('#restoreInput')?.addEventListener('change', (event) => {
	const file = event.target.files[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onload = () => { try { database = JSON.parse(reader.result); saveDatabase(); render(); } catch { document.querySelector('#saveMessage').textContent = 'Invalid backup file.'; } };
	reader.readAsText(file);
});
loadDatabase().then(() => loadClassOptions(['#classPicker']).then((loadedClasses) => {
	classes = loadedClasses;
	if (!database.students[currentClass]) currentClass = classes[0];
	document.querySelector('#classPicker').value = currentClass;
	render();
}));
