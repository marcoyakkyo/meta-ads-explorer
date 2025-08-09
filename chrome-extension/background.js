// Store for intercepted ad data from Facebook GraphQL responses
let interceptedAdsData = new Map();
let api_token = null;
let backendUrl = null;

function getApiToken() {
    // Handle other messages directed to our backend API
    chrome.storage.local.get('apiToken', ({apiToken}) => {
        if (!apiToken) {
            console.error('No API token configured!');
            sendResponse({ success: false, error: 'No API token configured' });
            return false;
        }
        api_token = apiToken;
        console.log('API token set to a string of size', api_token.length);
        return true;
    });
}

function getBackendUrl() {
    // Handle other messages directed to our backend API
    chrome.storage.local.get('url', ({url}) => {
        if (!url) {
            console.error('No backend URL configured!');
            sendResponse({ success: false, error: 'No backend URL configured' });
            return false;
        }
        backendUrl = url;
        console.log('Backend URL set to a string of size', backendUrl.length);
        return true;
    });
}

// // Function to recursively search for objects with ad_archive_id and snapshot
// function findAdsInResponse(obj) {
//     if (obj === null || typeof obj !== 'object') {
//         return ;
//     }

//     // Check if current object has the required properties
//     if (obj.hasOwnProperty('ad_archive_id') && 
//         obj.ad_archive_id !== null && 
//         obj.hasOwnProperty('snapshot') && 
//         obj.snapshot !== null && 
//         typeof obj.snapshot === 'object' && 
//         Object.keys(obj.snapshot).length > 0) {
//         // Store the ad data with ad_archive_id as key
//         interceptedAdsData.set(String(obj.ad_archive_id), obj);
//     }

//     // Recursively search in object properties
//     if (Array.isArray(obj)) {
//         obj.forEach(item => findAdsInResponse(item));
//     } else {
//         Object.values(obj).forEach(value => findAdsInResponse(value));
//     }

//     return ;
// }

// add this to the manifest later
    // {
    //   "matches":  ["*://*.facebook.com/ads/library/*"],
    //   "js": ["./inject.js"],
    //   "run_at": "document_start",
    //   "world": "MAIN"
    // }

//  and un-comment the event listener in the content.js file (at the beginning of the file)


chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('Received message', msg);

    // Handle intercepted GraphQL data from content script
    // if (msg.type === 'GRAPHQL_RESPONSE') {
    //     try {
    //         const foundAds = findAdsInResponse(msg.data);
    //         if (foundAds.length > 0) {
    //             console.log(`Found ${foundAds.length} ads in GraphQL response:`, foundAds);
    //             console.log(`Total intercepted ads: ${interceptedAdsData.size}`);
    //         }
    //     } catch (error) {
    //         console.error('Error processing GraphQL response:', error);
    //     }
    //     sendResponse({ success: true });
    //     return true;
    // }

    // Handle API token retrieval
    if (!api_token || !backendUrl) {
        getApiToken();
        getBackendUrl();
        if (!api_token || ! backendUrl) {
            console.error('Invalid configuration, go to the options page and try again.');
            sendResponse({ success: false, error: 'Invalid configuration, go to the  options page and try again.'});
            return true; // Keep the message channel open for async response
        }
    }

    // implement a 'PING' message to check if the extension is working
    if (msg.type === 'PING') {
        console.log('Received PING message');
        sendResponse({ success: true, message: 'Extension is working' });
        return true; // Keep the message channel open for async response
    }

    else if (msg.type === 'GET_ALL_SAVED_ADS') {
        fetch(backendUrl + '/meta-ads/all-saved-ads', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'x-api-key': `${api_token}` },
        })
        .then(res => res.json())
        .then(data => {sendResponse({ success: true, ads: data.ads, tags: data.tags || [], error: data.error ? data.error : null });})
        .catch(err => sendResponse({ success: false, ads: [], tags: [], error: err.message }));
    }

    else if (msg.type === 'SAVE_AD') {
        const requestBody = {
            adId: msg.adId,
            videoUrl: msg.videoUrl || null, // optional video URL
            posterUrl: msg.posterUrl || null, // optional poster URL for video
            imgUrl: msg.imgUrl || null, // optional image URL
            query_params: msg.query_params || {},
            full_html_text: msg.full_text || '', // optional full text of the ad
            tags: msg.tags || [] 
        };

        // Check if we have intercepted data for this ad, try with both int and string type
        const extraData = interceptedAdsData.get(msg.adId) || interceptedAdsData.get(String(msg.adId)) || null;
        if (extraData) {
            requestBody.extra_data = extraData;
            console.log(`Eureka! Including intercepted data for ad ${msg.adId} in 'SAVE_AD' request`);
        }

        fetch(backendUrl + '/meta-ads/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': `${api_token}` },
            body: JSON.stringify(requestBody)
        })
        .then(res => res.json())
        .then(data => sendResponse({ success: data.success, error: data.error? data.error : null }))
        .catch(err => sendResponse({ success: false, error: err.message }));
    }

    else if (msg.type === 'UNSAVE_AD') {
        fetch (backendUrl + '/meta-ads/unsave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': `${api_token}` },
            body: JSON.stringify({ adId: msg.adId })
        })
        .then(res => res.json())
        .then(data => sendResponse({ success: true, error: data.error ? data.error : null }))
        .catch(err => sendResponse({ success: false, error: err.message }));
    }

    else if (msg.type === 'UPDATE_AD_TAGS') {
        fetch(backendUrl + '/meta-ads/update-tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': `${api_token}` },
            body: JSON.stringify({ 
                adId: msg.adId,
                tags: msg.tags || []
            })
        })
        .then(res => res.json())
        .then(data => sendResponse({ success: data.success, error: data.error ? data.error : null }))
        .catch(err => sendResponse({ success: false, error: err.message }));
    }

    else {
        console.error('Unknown message type', msg.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }

    return true; // Keep the message channel open for async response
});
