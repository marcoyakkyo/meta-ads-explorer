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


async function fetchSavedAds() {
    if (Date.now() - lastFetchedAdsAt < 1000 * 10) {
        return true; // Return true to indicate success
    }

    console.log('🔄 Fetching saved ads from background script');
    try {
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
                { type: 'GET_ALL_SAVED_ADS' },
                resolve
            );
        });
        if (response?.ads) {
            savedAds.clear();
            allTags.clear();

            response.ads.forEach(ad => {
                // Map ad ID to its tags
                if (!savedAds.has(ad.ad_archive_id)) {
                    savedAds.set(ad.ad_archive_id, new Set());
                }
                if (ad.tags) {
                    ad.tags.forEach(tag => {
                        savedAds.get(ad.ad_archive_id).add(tag);
                        allTags.add(tag);
                    });
                }
            });
            
            // Store all available tags
            if (response.tags) {
                response.tags.forEach(tag => {
                    allTags.add(tag);
                });
            }

            lastFetchedAdsAt = Date.now();

        } else {
            console.warn('No ads found in response or response is undefined');
            return false;
        }
    } catch (error) {
        console.error('Error fetching saved ads:', error);
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
                    return true; // Indicate that buttons were set
                }
            }
        });
        return false; // Indicate no buttons were set
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
    let response = fetchSavedAds();

    console.log('🔄 Waiting for document body to be available');
    await waitForDocumentBody();

    await response; // Wait to have the actual saved ads from the user before inserting buttons

    console.log('🔄 Inserting save buttons into ad cards');
    await insertSaveButtons();

    await setupMutationObserver();
    console.log('✅ Content script initialized successfully');
})();
