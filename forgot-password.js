const forgotForm = document.querySelector('#forgotForm');
const forgotMessage = document.querySelector('#forgotMessage');
forgotForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = document.querySelector('#forgotPassword').value;
    if (password !== document.querySelector('#forgotConfirm').value) { forgotMessage.textContent = 'Passwords do not match.'; return; }
    const response = await fetch('/api/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: document.querySelector('#forgotUsername').value, email: document.querySelector('#forgotEmail').value, newPassword: password }) });
    const result = await response.json();
    forgotMessage.textContent = result.message || 'Please contact the school administrator.';
});