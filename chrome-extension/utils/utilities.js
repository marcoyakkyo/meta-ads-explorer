import { allTags, savedAds } from "./globals";

// Extract query parameters from current URL
function extractQueryParams() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const queryParams = {};

        for (const [key, value] of urlParams.entries()) {
            queryParams[key] = value;
        }
        return queryParams;
    } catch (error) {
        console.error('Error extracting query parameters:', error);
        return {};
    }
}

function saveAd(card, queryParams = null) {
    if (!card || !card.adId) {
        console.error('Invalid ad card provided for saving');
        return;
    }

    card.btn.textContent = 'Saving...';
    card.btn.style.cssText += `
        background-color: lightgray !important;
        color: black !important;
    `;
    card.btn.offsetHeight; // Force reflow
    
    chrome.runtime.sendMessage(
        {
            type: 'SAVE_AD',
            adId: card.adId,
            videoUrl: card.videoUrl || null, // Use video URL if found, otherwise null
            posterUrl: card.posterUrl || null, // Use poster URL if found, otherwise null
            imgUrl: card.imgUrl || null, // Use image URL if found, otherwise null
            query_params: queryParams || extractQueryParams(),
            full_text: card.element.textContent || '', // Include full text of the ad
            tags: Array.from(card.tags) // Include current tags when saving
        },
        response => {
            if (response?.success) {
                card.btn.textContent = 'Saved ✓';
                card.btn.style.cssText += `
                    background-color: lightgreen !important;
                    color: black !important;
                `;
                card.isSaved = true;

                // Add to our local saved ads set
                savedAds.set(card.adId, card.tags);

                // Update allTags with the tags from this ad
                card.tags.forEach(tag => allTags.add(tag));

                console.log(`Ad ${card.adId} saved with tags:`, card.tags, 'now total tags:', allTags.size, 'total saved ads:', savedAds.size);
            }
            else {
                console.error('Save failed', response?.error);
                // Reset button state on error
                card.btn.textContent = 'Save ad';
                card.btn.style.cssText += `
                    background-color: lightblue !important;
                    color: black !important;
                `;
            }
        }
    );
}


function unsaveAd(card) {
    if (!card || !card.adId) {
        console.error('Invalid ad card provided for unsaving');
        return;
    }
    card.btn.textContent = 'Unsaving...';
    card.btn.style.cssText += `
        background-color: lightgray !important;
        color: black !important;
    `;
    card.btn.offsetHeight; // Force reflow

    chrome.runtime.sendMessage(
        { 
            type: 'UNSAVE_AD',
            adId: card.adId
        },
        response => {
            if (response?.success) {
                card.btn.textContent = 'Save ad';
                card.btn.style.cssText += `
                    background-color: lightblue !important;
                    color: black !important;
                `;
                card.isSaved = false;
                card.tags.clear();

                savedAds.delete(card.adId);
                allTags.clear();
                for (const tags of savedAds.values()) {
                    tags.forEach(tag => allTags.add(tag));
                }
            }
            else {
                console.error('Unsave failed', response?.error);
                // Reset button state on error
                card.btn.textContent = 'Saved ✓';
                card.btn.style.cssText += `
                    background-color: lightgreen !important;
                    color: black !important;
                `;
            }
        }
    );
}


function updateAdTags(card) {
    if (!card || !card.adId) {
        console.error('Invalid ad card or tags provided for updating');
        return;
    }
    card.btn.textContent = 'Updating tags...';
    card.btn.style.cssText += `
        background-color: lightgray !important;
        color: black !important;
    `;
    card.btn.offsetHeight; // Force reflow

    chrome.runtime.sendMessage(
        { 
            type: 'UPDATE_AD_TAGS',
            adId: card.adId,
            tags: Array.from(card.tags) // Convert Set to Array before sending
        },
        response => {
            if (response?.success) {
                savedAds.set(card.adId, card.tags);
                card.tags.forEach(tag => allTags.add(tag));
                console.log('Tags updated successfully:', card.tags, 'for ad', card.adId);
            } else {
                console.error('Failed to update tags:', response?.error, 'for ad', card.adId);
            }
            
            // Always reset to final state after operation completes
            if (card.isSaved) {
                card.btn.textContent = 'Saved ✓';
                card.btn.style.cssText += `
                    background-color: lightgreen !important;
                    color: black !important;
                `;
            } else {
                card.btn.textContent = 'Save ad';
                card.btn.style.cssText += `
                    background-color: lightblue !important;
                    color: black !important;
                `;
            }
        }
    );
    if (card.isSaved) {
        card.btn.textContent = 'Saved ✓';
        card.btn.style.backgroundColor = 'lightgreen';
    }
    else {
        card.btn.textContent = 'Save ad';
        card.btn.style.backgroundColor = 'lightblue';
    }
    card.btn.offsetHeight;
}

export { extractQueryParams, saveAd, unsaveAd, updateAdTags };
