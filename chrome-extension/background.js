chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('Received message', msg);

    chrome.storage.local.get('apiToken', ({apiToken}) => {
        const api_token = apiToken;

        if (!api_token) {
            console.error('No API token configured!');
            sendResponse({ success: false, error: 'No API token configured' });
            return;
        }


// @app.get('/meta-ads/all-saved-ads')
// async def check_meta_ad():
//     ads = list(mongo.client['gigi_ads_saved'].find({}, {"ad_archive_id": 1, "tags": 1, "_id": 0}))
//     if not ads:
//         logger.info("No saved ads found.")
//         return {"success": True, "adIds": [], "error": None}
//     # tags = set()
//     # for ad in ads:
//     #     if 'tags' in ad:
//     #         tags.update(ad['tags'])

//     tags = {tag for ad in ads for tag in ad.get('tags', [])}
//     return {
//         "success": True,
//         "adIds": ads,
//         "tags": list(tags),
//         "error": None
//     }
        // if (msg.type === 'GET_ALL_SAVED_ADS') {
        //     fetch(`https://mcp-test.yakkyo.com/meta-ads/all-saved-ads`, {
        //         method: 'GET',
        //         headers: { 'Content-Type': 'application/json', 'x-api-key': `${api_token}` },
        //     })
        //     .then(res => res.json())
        //     .then(data => (console.log(data), sendResponse({ adIds: data.adIds, error: data.error ? data.error : null })))
        //     .catch(err => sendResponse({ adIds: null, error: err.message }));
        //     // mock the response
        //     // sendResponse({ isSaved: true, error: null });
        // }

        if (msg.type === 'GET_ALL_SAVED_ADS') {
            fetch('https://mcp-test.yakkyo.com/meta-ads/all-saved-ads', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'x-api-key': `${api_token}` },
            })
            .then(res => res.json())
            .then(data => {
                console.log(data);
                sendResponse({ ads: data.ads, tags: data.tags || [], error: data.error ? data.error : null });
            })
            .catch(err => sendResponse({ ads: null, tags: [], error: err.message }));
        }
        else if (msg.type === 'SAVE_AD') {
            fetch('https://mcp-test.yakkyo.com/meta-ads/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': `${api_token}` },
                body: JSON.stringify({ 
                    adId: msg.adId,
                    videoUrl: msg.videoUrl || null, // optional video URL
                    imgUrl: msg.imgUrl || null, // optional image URL
                    query_params: msg.query_params || {},
                    tags: msg.tags || [] // optional tags array
                })
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