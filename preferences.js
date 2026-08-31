const savedPreferences = JSON.parse(localStorage.getItem('attendly-settings-v1') || '{}');
if (savedPreferences.theme) document.body.dataset.theme = savedPreferences.theme;
if (savedPreferences.schoolName) document.body.dataset.schoolName = savedPreferences.schoolName;

async function protectPage() {
	try {
		const response = await fetch('/api/me');
		if (!response.ok) { window.location.replace('/login.html'); return; }
		const data = await response.json();
		const profile = document.querySelector('.profile-mini');
		if (profile && data.user) {
			const name = profile.querySelector('strong');
			const role = profile.querySelector('small');
			if (name) name.textContent = data.user.name;
			if (role) role.textContent = data.user.role[0].toUpperCase() + data.user.role.slice(1);
		}
		const topbar = document.querySelector('.topbar');
		if (topbar && !topbar.querySelector('.logout-button')) {
			const logout = document.createElement('button');
			logout.className = 'logout-button';
			logout.textContent = 'Log out';
			logout.type = 'button';
			logout.addEventListener('click', async () => { await fetch('/api/logout', { method: 'POST' }); window.location.replace('/login.html'); });
			topbar.append(logout);
		}
	} catch (error) {
		window.location.replace('/login.html');
	}
}
protectPage();

function updateLiveClock() {
	const clock = document.querySelector('.live-clock');
	if (!clock) return;
	const now = new Date();
	const indiaOptions = { timeZone: 'Asia/Kolkata' };
	clock.textContent = `${now.toLocaleDateString('en-IN', { ...indiaOptions, day: '2-digit', month: 'short', year: 'numeric' })} · ${now.toLocaleTimeString('en-IN', { ...indiaOptions, hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST`;
	clock.dateTime = now.toISOString();
}

const topbar = document.querySelector('.topbar');
if (topbar && !topbar.querySelector('.live-clock')) {
	const clock = document.createElement('time');
	clock.className = 'live-clock';
	clock.setAttribute('aria-label', 'Current local date and time');
	topbar.appendChild(clock);
	updateLiveClock();
	setInterval(updateLiveClock, 1000);
}
