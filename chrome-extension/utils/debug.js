// Debug function - you can call this manually in the console

import { adCards, allTags, savedAds } from "./globals";

window.fbAdSaverDebug = {
  checkStatus: () => {

    const buttons = document.querySelectorAll('button, a, [role="button"]');

    const targetButtons = Array.from(buttons).filter(btn => {
      const text = btn.textContent.trim();
      return text.includes('See ad details') || text.includes('See summary details') || text.includes('Vedi i dettagli di riepilogo') || text.includes("Vedi dettagli dell'inserzione");
    });

    const libraryIds = document.body.textContent.match(/Library ID:\s+\d+/g) || document.body.textContent.match(/ID libreria:\s+\d+/g);
    
    return {
      url: window.location.href,
      savedAdsIds: Array.from(savedAds.keys()),
      adCardsCount: adCards.length,
      allTags: Array.from(allTags),
      targetButtonsCount: targetButtons.length,
      libraryIdsCount: libraryIds ? libraryIds.length : 0
    };
  },
  
  reinitialize: async () => {
    adCards.length = 0; // Clear existing cards
    await fetchSavedAds();
    await insertSaveButtons();
    return window.fbAdSaverDebug.checkStatus();
  },

  testButtonAdd: () => {
    // console.log('🧪 Testing button addition...');
    const testDiv = document.createElement('div');
    testDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 9999; background: red; color: white; padding: 10px;';
    testDiv.textContent = 'FB Ad Saver Test Button';
    document.body.appendChild(testDiv);
    
    setTimeout(() => {
      document.body.removeChild(testDiv);
    }, 3000);

    return 'Test button should appear in top-right corner for 3 seconds';
  }
};
