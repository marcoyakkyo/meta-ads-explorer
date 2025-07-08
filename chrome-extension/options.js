const input = document.getElementById('token');
const btn = document.getElementById('save');
const tokenStatus = document.getElementById('token-status');

// Load existing token
chrome.storage.local.get('apiToken', ({apiToken}) => {
  if (apiToken) input.value = apiToken;
});

// Save token
btn.onclick = () => {
  chrome.storage.local.set({ apiToken: input.value }, () => {
    tokenStatus.innerHTML = '<div class="success-message">Token saved!</div>';
    setTimeout(() => tokenStatus.innerHTML = '', 3000);
  });
};

// Allow Enter key to save token
input.onkeypress = (e) => {
  if (e.key === 'Enter') {
    btn.click();
  }
};
