const tokenInput = document.getElementById('token');
const urlInput = document.getElementById('url');
const nameInput = document.getElementById('name');
const idInput = document.getElementById('id');
const backendUrlInput = document.getElementById('backendUrl');
const btn = document.getElementById('save');
const configStatus = document.getElementById('config-status');

// Load existing configuration
chrome.storage.local.get(['apiToken', 'url'], (result) => {
  if (result.apiToken) tokenInput.value = result.apiToken;
  if (result.url) urlInput.value = result.url;
});

// Save configuration
btn.onclick = () => {
  const config = {
    apiToken: tokenInput.value,
    url: urlInput.value
  };
  
  chrome.storage.local.set(config, () => {
    configStatus.innerHTML = '<div class="success-message">Configuration saved!</div>';
    setTimeout(() => configStatus.innerHTML = '', 3000);
  });
};

// Allow Enter key to save configuration from any input field
const inputs = [tokenInput, urlInput];
inputs.forEach(input => {
  input.onkeypress = (e) => {
    if (e.key === 'Enter') {
      btn.click();
    }
  };
});
