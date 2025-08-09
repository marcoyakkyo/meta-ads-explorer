import './utils/debug.js'; // Import debug module for console logging

import { allTags, savedAds } from './utils/globals.js';

import { insertSaveButtons } from './utils/save_buttons.js';

let lastFetchedAdsAt = 0; // Track last time stamp update to avoid unnecessary updates
let lastSetButtonsAt = 0; // Track last time buttons were set to avoid unnecessary updates


// // add a message listener that redirects messages to chrome runtime (act as a bridge from inject.js to background.js)
// window.addEventListener('message', (event) => {
//     if (event.data.type === 'GRAPHQL_RESPONSE') {
//         console.log('Received message from inject script', event.data.data);
//         chrome.runtime.sendMessage({
//             type: 'GRAPHQL_RESPONSE',
//             data: event.data.data
//         }, (response) => {
//             event.source.postMessage({
//                 type: 'GRAPHQL_RESPONSE_COMPLETED',
//                 correlationId: event.data.correlationId
//             }, event.origin);
//             console.log('Response sent back to inject script');
//         });
//     }
// });


async function fetchSavedAds(retries = 0) {
    if (Date.now() - lastFetchedAdsAt < 1000 * 10) {
        return true; // Return true to indicate success
    }
    lastFetchedAdsAt = Date.now();

    console.log('🔄 Fetching saved ads from content.js script');

    try {
        chrome.runtime.sendMessage(
            {
                type: 'GET_ALL_SAVED_ADS'
            },
            response => {
                if (response?.success) {
                    // Clear previous data
                    savedAds.clear();
                    allTags.clear();

                    console.log(`🔄 Fetched ${response.ads.length} saved ads from backend`);
                    console.log(`🔄 Fetched ${(response.tags || []).length} tags from backend`);

                    response.ads.forEach(ad => {
                        // Map ad ID to its tags
                        if (!savedAds.has(ad.ad_archive_id)) {
                            savedAds.set(ad.ad_archive_id, new Set());
                        }
                        else {
                            savedAds.get(ad.ad_archive_id).clear(); // Clear existing tags if any
                        }
                        if (ad.tags) {
                            ad.tags.forEach(tag => {
                                savedAds.get(ad.ad_archive_id).add(tag);
                            });
                        }
                    });

                    // Store all available tags
                    if (response.tags) {
                        response.tags.forEach(tag => {
                            allTags.add(tag);
                        });
                    } else {
                        // use the tags from savedAds if no tags were returned
                        savedAds.forEach(tags => {
                            tags.forEach(tag => allTags.add(tag));
                        });
                    }
                    console.log(`🔄 Total saved ads: ${savedAds.size}, total tags: ${allTags.size}`);
                } else {
                    console.warn('Failed to fetch ads from backend response:', response);
                    return false;
                } 
            }
        );
    } catch (error) {
        console.error('Error fetching saved ads:', error);
        if (retries < 3) {
            console.log(`Retrying to fetch saved ads (${retries + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 500 * (retries + 1)));
            return fetchSavedAds(retries + 1);
        }
        return false;
    }
    return true;
}

async function setupMutationObserver() {
    console.log('🔄 Setting up MutationObserver for ad card changes');

    const observer = new MutationObserver((mutations) => {
        mutations.forEach(async (mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // console.log('Mutation detected:', mutation, 're-loading ad cards');
                if (Date.now() - lastSetButtonsAt > 100) {
                    lastSetButtonsAt = Date.now();
                    await insertSaveButtons();
                }
            }
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    console.log('🔄 MutationObserver set up successfully');
}


async function waitForDocumentBody() {
    while (!document.body) {
        console.log('Waiting for document body to be available...');
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    console.log('Document body is now available');
}


(async () => {
    console.log('🔄 Initializing content script and fetching saved ads');
    await waitForDocumentBody();
    await fetchSavedAds();
    await setupMutationObserver();
    console.log('🔄 Inserting save buttons into ad cards');
    await insertSaveButtons();
    console.log('✅ Content script initialized successfully');

    // in a loop, every 10 seconds, fetch saved ads and re-insert save buttons
    setInterval(async () => {
        if (await fetchSavedAds()) {
            console.log('🔄 Re-inserting save buttons after fetching updated saved ads');
            await insertSaveButtons();
        } else {
            console.warn('Failed to fetch saved ads, skipping re-insertion of save buttons');
        }
    }, 1000 * 10); // every 10 seconds
})();
