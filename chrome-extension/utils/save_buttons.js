import { adCards, allTags, savedAds } from './globals.js';
import { extractQueryParams, saveAd, unsaveAd } from './utilities.js';

import { createTagDropdown } from './tag_dropdown.js';
import { findAdCards } from './html_parsing.js';

async function insertSaveButtons() {

    await findAdCards();

    if (adCards.length === 0) {
        console.log('No ad cards found to insert save buttons');
        return;
    }
    console.log(`🏁 insertSaveButtons started for ${adCards.length} ads`);

    const queryParams = extractQueryParams();

    adCards.forEach((card, index) => {

        if (card.element.querySelector('.my-save-button')) {
            return;  // avoid duplicates
        }

        // Check if this ad is in our saved ads list (from the backend)
        if (savedAds.has(card.adId)) {
            card.isSaved = true;
            card.tags = new Set(savedAds.get(card.adId)); // Get tags from savedAds
        }
        else {
            card.isSaved = false;
            card.tags = new Set();
        }

        // Create tag dropdown interface
        card.tagDropdown = createTagDropdown(card);

        // Verify the dropdown was created successfully
        if (!card.tagDropdown) {
            console.error(`❌ Failed to create tag dropdown for ad ${card.adId}`);
            return;
        }

        card.btn = document.createElement('button');
        card.btn.className = 'my-save-button';
        card.btn.style.cssText = `
            margin: 4px !important;
            border: 1px solid #ccc !important;
            padding: 4px 8px !important;
            cursor: pointer !important;
            border-radius: 4px !important;
            font-size: 12px !important;
            min-width: 80px !important;
            text-align: center !important;
            transition: all 0.2s ease !important;
        `;

        if (card.isSaved) {
          card.btn.textContent = 'Saved ✓';
          card.btn.style.backgroundColor = 'lightgreen';
          card.btn.style.color = 'black';
        }
        else {
          card.btn.textContent = 'Save ad';
          card.btn.style.backgroundColor = 'lightblue';
          card.btn.style.color = 'black';
        }

        card.btn.onclick = () => {
            card.isSaved ? unsaveAd(card) : saveAd(card, queryParams);
        };

        try {
            card.element.appendChild(card.tagDropdown);
            card.element.appendChild(card.btn);
        } catch (error) {
            console.error(`❌ Failed to add elements to ad ${card.adId}:`, error);
        }
    })
    console.log(`🏁 insertSaveButtons completed for ${adCards.length} ads`);
}

export { insertSaveButtons} ;
