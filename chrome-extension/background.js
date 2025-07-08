// Store for intercepted ad data from Facebook GraphQL responses
let interceptedAdsData = new Map(); // Using Map for O(1) lookup by ad_archive_id

// Function to recursively search for objects with ad_archive_id and snapshot
function findAdsInResponse(obj, found = []) {
    if (obj === null || typeof obj !== 'object') {
        return found;
    }
    // Check if current object has the required properties
    if (obj.hasOwnProperty('ad_archive_id') && 
        obj.ad_archive_id !== null && 
        obj.hasOwnProperty('snapshot') && 
        obj.snapshot !== null && 
        typeof obj.snapshot === 'object' && 
        Object.keys(obj.snapshot).length > 0) {

        // Store the ad data with ad_archive_id as key
        interceptedAdsData.set(String(obj.ad_archive_id), obj);
        found.push(obj.ad_archive_id);
    }

    // Recursively search in object properties
    if (Array.isArray(obj)) {
        obj.forEach(item => findAdsInResponse(item, found));
    } else {
        Object.values(obj).forEach(value => findAdsInResponse(value, found));
    }

    return found;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('Received message', msg);

    // Handle ping requests from content script
    if (msg.type === 'PING') {
        sendResponse({ success: true });
        return true;
    }

    // Handle intercepted GraphQL data from content script
    if (msg.type === 'GRAPHQL_RESPONSE') {
        try {
            const foundAds = findAdsInResponse(msg.data);
            if (foundAds.length > 0) {
                console.log(`Found ${foundAds.length} ads in GraphQL response:`, foundAds);
                console.log(`Total intercepted ads: ${interceptedAdsData.size}`);
            }
        } catch (error) {
            console.error('Error processing GraphQL response:', error);
        }
        sendResponse({ success: true });
        return true;
    }

    chrome.storage.local.get('apiToken', ({apiToken}) => {
        const api_token = apiToken;

        if (!api_token) {
            console.error('No API token configured!');
            sendResponse({ success: false, error: 'No API token configured' });
            return;
        }

        // implement a 'PING' message to check if the extension is working
        if (msg.type === 'PING') {
            console.log('Received PING message');
            sendResponse({ success: true, message: 'Extension is working' });
            return true; // Keep the message channel open for async response
        }
        if (msg.type === 'GET_ALL_SAVED_ADS') {
            fetch('https://mcp-test.yakkyo.com/meta-ads/all-saved-ads', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'x-api-key': `${api_token}` },
            })
            .then(res => res.json())
            .then(data => {sendResponse({ ads: data.ads, tags: data.tags || [], error: data.error ? data.error : null });})
            .catch(err => sendResponse({ ads: null, tags: [], error: err.message }));
        }
        else if (msg.type === 'SAVE_AD') {
            // Check if we have intercepted data for this ad, try with both int and string type
            const extraData = interceptedAdsData.get(msg.adId) || interceptedAdsData.get(String(msg.adId)) || null;

            const requestBody = { 
                adId: msg.adId,
                videoUrl: msg.videoUrl || null, // optional video URL
                imgUrl: msg.imgUrl || null, // optional image URL
                query_params: msg.query_params || {},
                tags: msg.tags || [] // optional tags array
            };

            // Add extra_data if we have intercepted data for this ad
            if (extraData) {
                requestBody.extra_data = extraData;
                console.log(`Including intercepted data for ad ${msg.adId}`);
            }

            fetch('https://mcp-test.yakkyo.com/meta-ads/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': `${api_token}` },
                body: JSON.stringify(requestBody)
            })
            .then(res => res.json())
            .then(data => sendResponse({ success: data.success, error: data.error? data.error : null }))
            .catch(err => sendResponse({ success: false, error: err.message }));
            // mock the response
            // sendResponse({ success: true, data: { adId: msg.adId, status: 'mocked' } });
        }
        else if (msg.type === 'UNSAVE_AD') {
            fetch ('https://mcp-test.yakkyo.com/meta-ads/unsave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': `${api_token}` },
                body: JSON.stringify({ adId: msg.adId })
            })
            .then(res => res.json())
            .then(data => sendResponse({ success: true, error: data.error ? data.error : null }))
            .catch(err => sendResponse({ success: false, error: err.message }));
            // mock the response
            // sendResponse({ success: true, data: { adId: msg.adId, status: 'mocked' } });
        }
        else if (msg.type === 'UPDATE_AD_TAGS') {
            fetch('https://mcp-test.yakkyo.com/meta-ads/update-tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': `${api_token}` },
                body: JSON.stringify({ 
                    adId: msg.adId,
                    tags: msg.tags || [] // Ensure tags is always an array
                })
            })
            .then(res => res.json())
            .then(data => sendResponse({ success: data.success, error: data.error ? data.error : null }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        }
        else if (msg.type === 'MANAGE_GLOBAL_TAG') {
            fetch('https://mcp-test.yakkyo.com/meta-ads/manage-tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': `${api_token}` },
                body: JSON.stringify({ 
                    action: msg.action, // 'add' or 'remove'
                    tag: msg.tag
                })
            })
            .then(res => res.json())
            .then(data => sendResponse({ success: data.success, error: data.error ? data.error : null }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        }
        else if (msg.type === 'GET_AVAILABLE_TAGS') {
            fetch('https://mcp-test.yakkyo.com/meta-ads/available-tags', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'x-api-key': `${api_token}` },
            })
            .then(res => res.json())
            .then(data => sendResponse({ tags: data.tags || [], error: data.error ? data.error : null }))
            .catch(err => sendResponse({ tags: [], error: err.message }));
        }
        else {
            console.error('Unknown message type', msg.type);
            sendResponse({ success: false, error: 'Unknown message type' });
        }
    });

    return true; // Keep the message channel open for async response
});