const DATA_KEY = 'attendly-data-v2';
const LEAVE_KEY = 'attendly-leaves-v1';
const indiaDateParts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
const indiaDateValues = Object.fromEntries(indiaDateParts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
const today = `${indiaDateValues.year}-${indiaDateValues.month}-${indiaDateValues.day}`;
let classes = [...DEFAULT_CLASSES];
const database = JSON.parse(localStorage.getItem(DATA_KEY) || '{"students":{},"attendance":{}}');
let leaves = JSON.parse(localStorage.getItem(LEAVE_KEY) || '[]');
function status(className, student) { if (leaves.some((leave) => leave.status === 'approved' && leave.student === student.name && leave.className === className && today >= leave.from && today <= leave.to)) return 'leave'; return database.attendance?.[`${className}|${today}`]?.[student.roll]?.status || 'unmarked'; }
function stats(className) { const students = database.students?.[className] || []; const statuses = students.map((student) => status(className, student)); return { total: students.length, present: statuses.filter((value) => value === 'present').length, late: statuses.filter((value) => value === 'late').length, absent: statuses.filter((value) => value === 'absent').length, leave: statuses.filter((value) => value === 'leave').length }; }
function renderDashboard() {
const allStats = classes.map(stats);
const total = allStats.reduce((sum, item) => sum + item.total, 0);
const present = allStats.reduce((sum, item) => sum + item.present, 0);
const late = allStats.reduce((sum, item) => sum + item.late, 0);
const absent = allStats.reduce((sum, item) => sum + item.absent, 0);
const marked = present + late + absent;
const rate = marked ? Math.round((present + late * .75) / marked * 100) : 0;
const pendingLeaves = leaves.filter((leave) => leave.status === 'pending').length;
document.querySelector('#dashPresent').textContent = present;
document.querySelector('#dashTotal').textContent = total;
document.querySelector('#dashLate').textContent = late;
document.querySelector('#dashAbsent').textContent = absent;
document.querySelector('#dashLeaves').textContent = pendingLeaves;
document.querySelector('#healthRate').textContent = `${rate}%`;
document.querySelector('#healthRingValue').textContent = `${rate}%`;
document.querySelector('.health-ring').style.setProperty('--health-angle', `${rate * 3.6}deg`);
document.querySelector('#legendPresent').textContent = present;
document.querySelector('#legendLate').textContent = late;
document.querySelector('#legendAbsent').textContent = absent;
document.querySelector('#dashboardClasses').innerHTML = classes.map((className, index) => { const item = allStats[index]; const classRate = item.present + item.late + item.absent ? Math.round((item.present + item.late * .75) / (item.present + item.late + item.absent) * 100) : 0; return `<div class="dash-class-line"><span>${className.replace('Class ', '')}</span><i><b style="width:${classRate}%"></b></i><strong>${classRate}%</strong></div>`; }).join('');
}
async function loadBackendData() {
	try {
		const response = await fetch('/api/data');
		if (!response.ok) return;
		const data = await response.json();
		if (data.students && data.attendance) {
			database.students = data.students;
			database.attendance = data.attendance;
			if (Array.isArray(data.leaves)) leaves = data.leaves;
			localStorage.setItem(DATA_KEY, JSON.stringify(database));
			localStorage.setItem(LEAVE_KEY, JSON.stringify(leaves));
		}
	} catch (error) {
		console.warn('Backend unavailable, using local dashboard data.', error);
	}
}
loadBackendData().then(() => loadClassOptions().then((loadedClasses) => {
	classes = loadedClasses;
	renderDashboard();
}));