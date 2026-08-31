const qrDialog = document.querySelector('#qrDialog');
const qrCode = document.querySelector('#qrCode');
const qrSubtitle = document.querySelector('#qrSubtitle');
const qrExpiry = document.querySelector('#qrExpiry');

async function generateAttendanceQr() {
    const className = document.querySelector('#classPicker').value;
    const date = document.querySelector('#datePicker').value;
    const response = await fetch('/api/attendance-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ className, date }) });
    const result = await response.json();
    if (!response.ok) { qrSubtitle.textContent = result.error || 'Unable to generate QR.'; return; }
    qrCode.replaceChildren();
    const checkinUrl = `${window.location.origin}/qr-checkin.html?token=${encodeURIComponent(result.token)}`;
    if (window.QRCode) new QRCode(qrCode, { text: checkinUrl, width: 220, height: 220, colorDark: '#18231f', colorLight: '#ffffff' });
    else qrCode.textContent = checkinUrl;
    qrSubtitle.textContent = `${className} · ${date}`;
    qrExpiry.textContent = 'This QR expires in 10 minutes.';
}

document.querySelector('#openQrButton').addEventListener('click', async () => { qrDialog.showModal(); await generateAttendanceQr(); });
document.querySelector('#refreshQrButton').addEventListener('click', generateAttendanceQr);
document.querySelector('#closeQrDialog').addEventListener('click', () => qrDialog.close());