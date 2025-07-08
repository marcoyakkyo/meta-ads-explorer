let counter_correlationId = 0;
let dataToSend = new Map();

function parseJSONL(input) {
  return input
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.warn("Skipping invalid JSON line:", line);
        return null;
      }
    })
    .filter(obj => obj !== null);
}

(function() {
    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
        const xhr = new originalXHR();
        const originalOpen = xhr.open;
        const originalSend = xhr.send;
        
        let url = '';
        let method = '';
        
        xhr.open = function(m, u, ...args) {
            method = m;
            url = u;
            return originalOpen.call(this, m, u, ...args);
        };
        
        xhr.send = function(data) {
            if (method === 'POST' && url.includes('/api/graphql')) {
                const originalOnLoad = xhr.onload;
                xhr.onload = function() {
                    try {
                        let responseData = null;
                        try {
                            responseData = [JSON.parse(xhr.responseText)];
                        } catch (e) {
                            // sometimes the response is a JSONL , so we need to handle that, find for }\n{
                            responseData = parseJSONL(xhr.responseText);
                            if (responseData.length == 0) {
                                console.warn('No valid JSON found in response:', xhr.responseText);
                                return;
                            }
                        }
                        for (let i = 0; i < responseData.length; i++) {
                            if (responseData[i] && responseData[i].data && responseData[i].data.ad_library_main) {
                                console.log('Intercepted GraphQL XHR response:', url, responseData[i]);
                                dataToSend.set(String(counter_correlationId), responseData[i]);
                                counter_correlationId++;
                            }
                        }         
                    } catch (error) {
                        console.log('Failed to parse GraphQL XHR response:', error);
                    }
                    if (originalOnLoad) {
                        originalOnLoad.call(this);
                    }
                };
            }
            return originalSend.call(this, data);
        };
        return xhr;
    };
    console.log('🔗 Facebook GraphQL XHR interceptor installed');
})();


window.addEventListener('message', (event) => {
    if (event.data.type === 'GRAPHQL_RESPONSE_COMPLETED') {
        console.log('Received completed GraphQL response:', event.data);
        dataToSend.delete(String(event.data.correlationId));
    }
});

// make this script running forever, every second, to send data it have stored in dataToSend
setInterval(() => {
    if (dataToSend.size > 0) {
        for (const [correlationId, data] of dataToSend) {
            console.log('Sending GraphQL response data:', correlationId, data);
            window.postMessage({
                type: 'GRAPHQL_RESPONSE',
                correlationId: correlationId,
                data: data
            }, '*');
        }
    }
}, 1000);
