const checkinButton = document.querySelector('#checkinButton');
const message = document.querySelector('#qrCheckinMessage');
const token = new URLSearchParams(window.location.search).get('token');

checkinButton.addEventListener('click', async () => {
    if (!token) { message.textContent = 'Invalid QR code.'; return; }
    checkinButton.disabled = true;
    const response = await fetch('/api/qr-checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    const result = await response.json();
    message.textContent = response.ok ? `Attendance marked for ${result.date}.` : result.error;
    if (!response.ok) checkinButton.disabled = false;
});