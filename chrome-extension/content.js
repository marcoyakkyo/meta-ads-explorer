// Global variable to store saved ads
let savedAdIds = new Set();
let adCards = []; // Array to hold ad card objects
let allTags = new Set(); // Store all available tags
let mappedAds = []; // Store mapped ads with tags


// add a message listener that redirects messages to chrome runtime
window.addEventListener('message', (event) => {
    if (event.data.type === 'GRAPHQL_RESPONSE') {
        console.log('Received message from inject script', event.data.data);

        // Send a ping to the background script to check if it's up
        chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
            if (response && response.success) {
                // Send the data to the background script
                chrome.runtime.sendMessage({
                    type: 'GRAPHQL_RESPONSE',
                    data: event.data.data
                });

                // “Reply” by posting back to the same window
                window.postMessage({
                    type: 'GRAPHQL_RESPONSE_COMPLETED',
                    correlationId: event.data.correlationId
                }, "*");

            } else {
                console.error('Background script is not responding');
                return;
            }
        });
    }
});

async function findImgSrc(adCardElement, targetAdId) {
  // find the tag img and get its src attribute if exists
  function extractImgSrc(imgElement) {
    if (!imgElement) return null;
    
    // Method 1: Try direct property access
    if (imgElement.src) {
    //   console.log('Found image URL via .src property:', imgElement.src);
      return imgElement.src;
    }
    
    // Method 2: Try getAttribute
    const srcAttr = imgElement.getAttribute('src');
    if (srcAttr) {
    //   console.log('Found image URL via getAttribute:', srcAttr);
      return srcAttr;
    }
    
    // Method 3: Check all attributes manually
    const attributes = imgElement.attributes;
    for (let i = 0; i < attributes.length; i++) {
      if (attributes[i].name === 'src') {
        // console.log('Found image URL via attributes collection:', attributes[i].value);
        return attributes[i].value;
      }
    }
    
    // Method 4: Parse from outerHTML
    const outerHTML = imgElement.outerHTML;
    // console.log('Image element outerHTML:', outerHTML);
    const srcMatch = outerHTML.match(/src=["']([^"']+)["']/);
    if (srcMatch && srcMatch[1]) {
    //   console.log('Found image URL via regex parsing:', srcMatch[1]);
      return srcMatch[1];
    }
    
    return null;
  }
  // Wait a bit for dynamic content to load
  async function waitAndExtract(imgElement, attempts = 0) {
    const url = extractImgSrc(imgElement);
    if (url || attempts >= 5) {
      return url;
    } else {
      await new Promise(resolve => setTimeout(resolve, 200));
      return waitAndExtract(imgElement, attempts + 1);
    }
  }
  // Your original traversal logic
  let currentElement = adCardElement;
  while (currentElement && currentElement !== document.body) {
    const libraryIdMatches = currentElement.textContent.match(/Library ID:\s+\d+/g) || currentElement.textContent.match(/ID libreria:\s+\d+/g);
    
    if (libraryIdMatches && libraryIdMatches.length > 1) {
      break;
    } else if (libraryIdMatches && libraryIdMatches.length === 1 && !libraryIdMatches[0].includes(targetAdId)) {
      break;
    } else if (libraryIdMatches && libraryIdMatches.length === 1 && libraryIdMatches[0].includes(targetAdId)) {
      const imgElement = currentElement.querySelector('img');
      if (imgElement) {
        // console.log('Found image element:', imgElement);
        
        // Try to extract URL immediately
        const immediateUrl = extractImgSrc(imgElement);
        if (immediateUrl) {
          return immediateUrl;
        }
        
        // If immediate extraction fails, wait and try again
        return await waitAndExtract(imgElement);
      }
    }
    
    currentElement = currentElement.parentElement;
  }
  return null;
}
      

async function findVideoSrc(adCardElement, targetAdId) {
  // Helper function to extract video URL with multiple methods
  function extractVideoUrl(videoElement) {
    if (!videoElement) return null;
    
    // Method 1: Try direct property access
    if (videoElement.src) {
    //   console.log('Found video URL via .src property:', videoElement.src);
      return videoElement.src;
    }
    
    // Method 2: Try getAttribute
    const srcAttr = videoElement.getAttribute('src');
    if (srcAttr) {
    //   console.log('Found video URL via getAttribute:', srcAttr);
      return srcAttr;
    }
    
    // Method 3: Try currentSrc (for actively playing videos)
    if (videoElement.currentSrc) {
    //   console.log('Found video URL via .currentSrc:', videoElement.currentSrc);
      return videoElement.currentSrc;
    }
    
    // Method 4: Check all attributes manually
    const attributes = videoElement.attributes;
    for (let i = 0; i < attributes.length; i++) {
      if (attributes[i].name === 'src') {
        // console.log('Found video URL via attributes collection:', attributes[i].value);
        return attributes[i].value;
      }
    }
    
    // Method 5: Parse from outerHTML (your original approach)
    const outerHTML = videoElement.outerHTML;
    // console.log('Video element outerHTML:', outerHTML);
    const srcMatch = outerHTML.match(/src=["']([^"']+)["']/);
    if (srcMatch && srcMatch[1]) {
    //   console.log('Found video URL via regex parsing:', srcMatch[1]);
      return srcMatch[1];
    }
    
    // Method 6: Check if video has source children
    const sourceElements = videoElement.getElementsByTagName('source');
    if (sourceElements.length > 0) {
      const sourceUrl = sourceElements[0].src || sourceElements[0].getAttribute('src');
      if (sourceUrl) {
        // console.log('Found video URL via source element:', sourceUrl);
        return sourceUrl;
      }
    }
    
    return null;
  }
  
  // Wait a bit for dynamic content to load
  async function waitAndExtract(videoElement, attempts = 0) {
    const url = extractVideoUrl(videoElement);
    if (url || attempts >= 5) {
      return url;
    } else {
      await new Promise(resolve => setTimeout(resolve, 200));
      return waitAndExtract(videoElement, attempts + 1);
    }
  }
  
  // Your original traversal logic
  let currentElement = adCardElement;
  while (currentElement && currentElement !== document.body) {
    const libraryIdMatches = currentElement.textContent.match(/Library ID:\s+\d+/g) || currentElement.textContent.match(/ID libreria:\s+\d+/g);
    
    if (libraryIdMatches && libraryIdMatches.length > 1) {
      break;
    } else if (libraryIdMatches && libraryIdMatches.length === 1 && !libraryIdMatches[0].includes(targetAdId)) {
      break;
    } else if (libraryIdMatches && libraryIdMatches.length === 1 && libraryIdMatches[0].includes(targetAdId)) {
      const videoElement = currentElement.querySelector('video');
      if (videoElement) {
        // console.log('Found video element:', videoElement);
        
        // Try to extract URL immediately
        const immediateUrl = extractVideoUrl(videoElement);
        if (immediateUrl) {
          return immediateUrl;
        }
        
        // If immediate extraction fails, wait and try again
        return await waitAndExtract(videoElement);
      }
    }
    
    currentElement = currentElement.parentElement;
  }
  
  return null;
}

// we need to find ad cards by first finding buttons with 'See ad details' or 'See summary details', then going up to find Library ID
async function findAdCards(adCards = []) {
//   console.log('🔍 findAdCards: Starting search for ad cards...');

  // First, find all buttons/links with the target text
  const allButtons = document.querySelectorAll('button, a, [role="button"]');
  //   console.log(`🔘 Found ${allButtons.length} total buttons/links on page`);
  
  let targetButtons = 0;
  
  for (const button of allButtons) {
    const text = button.textContent.trim();
    if (text.includes('See ad details') || text.includes('See summary details') || text.includes('Vedi i dettagli di riepilogo') || text.includes("Vedi dettagli dell'inserzione")) {
      targetButtons++;
    //   console.log(`🎯 Found target button ${targetButtons}: "${text}"`);
      
      // Found a target button, now traverse up to find the Library ID
      let currentElement = button;
      let adCardElement = null;
      let adId = null;
      
      // Traverse up the DOM tree to find the Library ID
      while (currentElement && currentElement !== document.body) {
        // Check if this element or any of its children contains Library ID
        const libraryIdMatch = currentElement.textContent.match(/Library ID:\s+(\d+)/) || currentElement.textContent.match(/ID libreria:\s+(\d+)/);
        if (libraryIdMatch) {
          adCardElement = currentElement;
          adId = libraryIdMatch[1];
          break;
        }
        currentElement = currentElement.parentElement;
      }
      
      // Only add to adCards if we found both the button and the Library ID
      if (adCardElement && adId) {
        // Check if we already have this ad (avoid duplicates)
        const existingAd = adCards.find(card => card.adId === adId);
        let imgUrl = null; // Initialize imgUrl to null
        if (!existingAd) {
        //   console.log(`📝 Processing new ad: ${adId}`);

          let videoUrl = await findVideoSrc(adCardElement, adId);
          if (!videoUrl) {
            imgUrl = await findImgSrc(adCardElement, adId);
            // console.log(`🖼️ Image URL for ad ${adId}:`, imgUrl || 'None found');
          }
        //   console.log(`🎬 Video URL for ad ${adId}:`, videoUrl || 'None found');
          let obj = {
            adId: adId, // Use video URL if found, otherwise null
            element: adCardElement,
            isSaved: false, // initial state
            btn: null // will be set later
          };
          if (imgUrl) {
            obj.imgUrl = imgUrl;
          } // Add imgUrl if found
          if (videoUrl) {
            obj.videoUrl = videoUrl; // Use video URL if found, otherwise null
          }
          adCards.push(obj);
        }
      } else {
        // console.log(`❌ Failed to find ad ID for button: "${text}"`);
      }
    }
  }
  
//   console.log(`📊 findAdCards summary: Found ${targetButtons} target buttons, ${adCards.length} total ad cards`);
  return adCards;
}

async function fetchSavedAds() {
    try {
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
                { type: 'GET_ALL_SAVED_ADS' },
                resolve
            );
        });
        if (response?.ads) {
          // [{"ad_archive_id": "1234567890", "tags": ["tag1", "tag2"]}, {"ad_archive_id": "0987654321", "tags": ["tag3"]}]
            savedAdIds = new Set(response.ads.map(ad => ad.ad_archive_id));
            // savedAds = response.ads; // Store the full ad objects if needed
            mappedAds = response.ads.map(ad => ({
                adId: ad.ad_archive_id,
                tags: ad.tags || [] // Ensure tags is always an array
            }));
            
            // Store all available tags
            if (response.tags) {
                allTags = new Set(response.tags);
            }
            
            // console.log('Fetched saved ads:', savedAdIds);
            // console.log('Available tags:', allTags);
        } else {
            // console.error('Failed to fetch saved ads:', response?.error);
            savedAdIds = new Set(); // Reset to empty set on error
            savedAds = []; // Reset saved ads array
            allTags = new Set(); // Reset tags
        }
    } catch (error) {
        // console.error('Error fetching saved ads:', error);
        savedAdIds = new Set();
        savedAds = []; // Reset saved ads array
        allTags = new Set(); // Reset tags
    }
}


async function insertSaveButtons() {
    // console.log('🔍 insertSaveButtons called - searching for ad cards...');
    
    await findAdCards(adCards);
    // console.log(`📊 Total ad cards found: ${adCards.length}`);
    
    if (adCards.length === 0) {
        // console.log('⚠️ No ad cards found. This could mean:');
        // console.log('   1. Page is still loading');
        // console.log('   2. Facebook changed their HTML structure');
        // console.log('   3. Not on the correct Facebook Ad Library page');
        // console.log('   4. No ads are currently displayed');
        return;
    }

    adCards.forEach((card, index) => {
        // console.log(`🎯 Processing ad card ${index + 1}/${adCards.length} - Ad ID: ${card.adId}`);
        
        if (card.element.querySelector('.my-save-button')) {
            return;  // avoid duplicates
        }

        // Check if this ad is in our saved ads list
        card.isSaved = savedAdIds.has(card.adId);
        card.tags = mappedAds.find(ad => ad.adId === card.adId)?.tags || [];
        
        // console.log(`🏷️ Ad ${card.adId} - Saved: ${card.isSaved}, Tags: [${card.tags.join(', ')}]`);
        // console.log(`📋 Available tags for dropdowns: [${Array.from(allTags).join(', ')}]`);
        
        // Create tag dropdown interface
        card.tagDropdown = createTagDropdown(card);
        
        // Verify the dropdown was created successfully
        if (!card.tagDropdown) {
            // console.error(`❌ Failed to create tag dropdown for ad ${card.adId}`);
            return; // Skip this card if dropdown creation failed
        }

        card.btn = document.createElement('button');
        card.btn.className = 'my-save-button';
        card.btn.style.margin = '4px';
        card.btn.style.border = '1px solid #ccc';
        card.btn.style.padding = '4px 8px';

        if (card.isSaved) {
          card.btn.textContent = 'Saved ✓';
          card.btn.style.backgroundColor = 'lightgreen';
        }
        else {
          card.btn.textContent = 'Save ad';
          card.btn.style.backgroundColor = 'lightblue';
        }

        card.btn.onclick = () => {
            // Extract query parameters from current URL
            const urlParams = new URLSearchParams(window.location.search);
            const queryParams = {};
            for (const [key, value] of urlParams.entries()) {
                queryParams[key] = value;
            }

            if (!card.isSaved) {
                
                // console.log('Saving ad:', {
                //     adId: card.adId,
                //     videoUrl: card.videoUrl || null, // Use video URL if found, otherwise null
                //     imgUrl: card.imgUrl || null, // Use image URL if found, otherwise null
                // });
                chrome.runtime.sendMessage(
                    { 
                        type: 'SAVE_AD',
                        adId: card.adId,
                        videoUrl: card.videoUrl || null, // Use video URL if found, otherwise null
                        imgUrl: card.imgUrl || null, // Use image URL if found, otherwise null
                        query_params: queryParams,
                        full_text: card.element.textContent || '', // Include full text of the ad
                        tags: card.tags || [] // Include current tags when saving
                    },
                    response => {
                        if (response?.success) {
                            card.btn.textContent = 'Saved ✓';
                            card.btn.style.backgroundColor = 'lightgreen';
                            card.isSaved = true;
                            // Add to our local saved ads set
                            savedAdIds.add(card.adId);
                        }
                        // else console.error('Save failed', response?.error);
                    });
            }
            else {
                // unsave the ad
                chrome.runtime.sendMessage(
                    { 
                        type: 'UNSAVE_AD',
                        adId: card.adId
                    },
                    response => {
                        if (response?.success) {
                            card.btn.textContent = 'Save ad';
                            card.btn.style.backgroundColor = 'lightblue';
                            card.isSaved = false;
                            // Remove from our local saved ads set
                            savedAdIds.delete(card.adId);
                        }
                        // else console.error('Unsave failed', response?.error);
                    });
            }
        };

        // console.log(`✅ Adding UI elements to ad ${card.adId}`);
        // console.log(`📍 Target element:`, card.element);
        
        try {
            card.element.appendChild(card.tagDropdown);
            card.element.appendChild(card.btn);
            // console.log(`🎉 Successfully added tag dropdown and save button to ad ${card.adId}`);
        } catch (error) {
            // console.error(`❌ Failed to add elements to ad ${card.adId}:`, error);
        }
    });
    
    // console.log(`🏁 insertSaveButtons completed for ${adCards.length} ads`);
}

// Helper function to create tag dropdown interface
function createTagDropdown(card) {
    const container = document.createElement('div');
    container.className = 'tag-dropdown-container';
    container.style.cssText = `
        margin: 4px;
        position: relative;
        display: inline-block;
        min-width: 200px;
    `;

    // Selected tags display
    const selectedTagsDiv = document.createElement('div');
    selectedTagsDiv.className = 'selected-tags';
    selectedTagsDiv.style.cssText = `
        border: 1px solid #ccc;
        padding: 4px;
        min-height: 24px;
        background: white;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
    `;

    // Dropdown content
    const dropdownContent = document.createElement('div');
    dropdownContent.className = 'dropdown-content';
    dropdownContent.style.cssText = `
        display: none;
        position: absolute;
        background-color: white;
        min-width: 100%;
        box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
        z-index: 1000;
        border: 1px solid #ccc;
        border-radius: 4px;
        max-height: 200px;
        overflow-y: auto;
    `;

    // Add new tag input
    const newTagInput = document.createElement('input');
    newTagInput.type = 'text';
    newTagInput.placeholder = 'Add new tag...';
    newTagInput.style.cssText = `
        width: 100%;
        padding: 8px;
        border: none;
        border-bottom: 1px solid #eee;
        outline: none;
    `;

    // Add tag button
    const addTagBtn = document.createElement('button');
    addTagBtn.textContent = 'Add Tag';
    addTagBtn.style.cssText = `
        width: 100%;
        padding: 8px;
        border: none;
        background-color: #4CAF50;
        color: white;
        cursor: pointer;
        border-bottom: 1px solid #eee;
    `;

    // Available tags list
    const tagsList = document.createElement('div');
    tagsList.className = 'tags-list';

    dropdownContent.appendChild(newTagInput);
    dropdownContent.appendChild(addTagBtn);
    dropdownContent.appendChild(tagsList);

    container.appendChild(selectedTagsDiv);
    container.appendChild(dropdownContent);

    // Functions to manage the dropdown
    function updateSelectedTags() {
        initializeDropdown();
    }

    function updateAvailableTags() {
        initializeDropdown();
    }

    function addTag(tag) {
        if (!card.tags.includes(tag)) {
            card.tags.push(tag);
            allTags.add(tag);
            initializeDropdown(); // Use local initialization
            updateTagsOnServer();
        }
    }

    function updateTagsOnServer() {
        // console.log('Updating tags for ad:', card.adId, card.tags);
        
        // If the ad is not saved yet, save it first with the tags
        if (!card.isSaved) {
            // console.log('Ad not saved yet, saving with tags:', card.tags);
            
            // Extract query parameters from current URL
            const urlParams = new URLSearchParams(window.location.search);
            const queryParams = {};
            for (const [key, value] of urlParams.entries()) {
                queryParams[key] = value;
            }
            
            chrome.runtime.sendMessage(
                { 
                    type: 'SAVE_AD',
                    adId: card.adId,
                    videoUrl: card.videoUrl || null, // Use video URL if found, otherwise null
                    imgUrl: card.imgUrl || null, // Use image URL if found, otherwise null
                    query_params: queryParams,
                    tags: card.tags
                },
                response => {
                    if (response?.success) {
                        // console.log('Ad saved successfully with tags:', card.tags);
                        // Update UI to show saved state
                        card.btn.textContent = 'Saved ✓';
                        card.btn.style.backgroundColor = 'lightgreen';
                        card.isSaved = true;
                        // Add to our local saved ads set
                        savedAdIds.add(card.adId);
                        // Update the global allTags set with any new tags
                        card.tags.forEach(tag => allTags.add(tag));
                        // Update all other dropdowns to show the new tags
                        updateAllDropdowns();
                    } else {
                        // console.error('Failed to save ad with tags:', response?.error);
                    }
                }
            );
        } else {
            // Ad is already saved, just update the tags
            chrome.runtime.sendMessage(
                { 
                    type: 'UPDATE_AD_TAGS',
                    adId: card.adId,
                    tags: card.tags
                },
                response => {
                    if (response?.success) {
                        // console.log('Tags updated successfully:', card.tags);
                        // Update the global allTags set with any new tags
                        card.tags.forEach(tag => allTags.add(tag));
                        // Update all other dropdowns to show the new tags
                        updateAllDropdowns();
                    } else {
                        // console.error('Failed to update tags:', response?.error);
                    }
                }
            );
        }
    }

    // Event handlers
    selectedTagsDiv.onclick = () => {
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
        initializeDropdown(); // Refresh the available tags when opening
    };

    addTagBtn.onclick = () => {
        const newTag = newTagInput.value.trim();
        if (newTag && !card.tags.includes(newTag)) {
            addTag(newTag);
            newTagInput.value = '';
        }
    };

    newTagInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            addTagBtn.click();
        }
    };

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            dropdownContent.style.display = 'none';
        }
    });

    // Initialize the dropdown with existing tags
    function initializeDropdown() {
        // Display existing tags
        selectedTagsDiv.innerHTML = '';
        if (card.tags.length === 0) {
            selectedTagsDiv.innerHTML = '<span style="color: #999;">Click to select tags...</span>';
        } else {
            card.tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.style.cssText = `
                    background-color: #e1f5fe;
                    color: #01579b;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    display: inline-flex;
                    align-items: center;
                    margin: 1px;
                `;
                tagSpan.innerHTML = `${tag} <span style="margin-left: 4px; cursor: pointer; font-weight: bold;">&times;</span>`;
                
                // Remove tag on click
                tagSpan.querySelector('span').onclick = (e) => {
                    e.stopPropagation();
                    card.tags = card.tags.filter(t => t !== tag);
                    initializeDropdown(); // Re-initialize display
                    
                    // Update server - handle both saved and unsaved ads
                    if (!card.isSaved) {
                        // If ad is not saved yet, save it with the updated tags
                        const urlParams = new URLSearchParams(window.location.search);
                        const queryParams = {};
                        for (const [key, value] of urlParams.entries()) {
                            queryParams[key] = value;
                        }
                        
                        chrome.runtime.sendMessage(
                            { 
                                type: 'SAVE_AD',
                                adId: card.adId,
                                videoUrl: card.videoUrl || null, // Use video URL if found, otherwise null
                                imgUrl: card.imgUrl || null, // Use image URL if found, otherwise null
                                query_params: queryParams,
                                tags: card.tags
                            },
                            response => {
                                if (response?.success) {
                                    // console.log('Ad saved with updated tags:', card.tags);
                                    card.btn.textContent = 'Saved ✓';
                                    card.btn.style.backgroundColor = 'lightgreen';
                                    card.isSaved = true;
                                    savedAdIds.add(card.adId);
                                } else {
                                    // console.error('Failed to save ad with updated tags:', response?.error);
                                }
                            }
                        );
                    } else {
                        // Ad is already saved, just update tags
                        chrome.runtime.sendMessage(
                            { 
                                type: 'UPDATE_AD_TAGS',
                                adId: card.adId,
                                tags: card.tags
                            },
                            response => {
                                if (response?.success) {
                                    // console.log('Tags updated successfully:', card.tags);
                                } else {
                                    // console.error('Failed to update tags:', response?.error);
                                }
                            }
                        );
                    }
                };
                
                selectedTagsDiv.appendChild(tagSpan);
            });
        }
        
        // Display available tags (not currently selected)
        tagsList.innerHTML = '';
        Array.from(allTags).forEach(tag => {
            if (!card.tags.includes(tag)) {
                const tagDiv = document.createElement('div');
                tagDiv.textContent = tag;
                tagDiv.style.cssText = `
                    padding: 8px;
                    cursor: pointer;
                    border-bottom: 1px solid #eee;
                `;
                tagDiv.onmouseover = () => tagDiv.style.backgroundColor = '#f5f5f5';
                tagDiv.onmouseout = () => tagDiv.style.backgroundColor = 'white';
                tagDiv.onclick = () => addTag(tag);
                tagsList.appendChild(tagDiv);
            }
        });
    }

    // Initialize
    initializeDropdown();

    return container;
}

// Function to update all tag dropdowns when new tags are added
function updateAllDropdowns() {
    adCards.forEach(card => {
        if (!card.tagDropdown) {
            // console.warn('updateAllDropdowns: card.tagDropdown is undefined for card:', card.adId);
            return;
        }
        
        // Find the tags list in this dropdown and update it
        const tagsList = card.tagDropdown.querySelector('.tags-list');
        if (!tagsList) {
            // console.warn('updateAllDropdowns: .tags-list element not found for card:', card.adId);
            return;
        }
        
        // Clear and rebuild the available tags list
        tagsList.innerHTML = '';
        Array.from(allTags).forEach(tag => {
            if (!card.tags.includes(tag)) {
                const tagDiv = document.createElement('div');
                tagDiv.textContent = tag;
                tagDiv.style.cssText = `
                    padding: 8px;
                    cursor: pointer;
                    border-bottom: 1px solid #eee;
                `;
                tagDiv.onmouseover = () => tagDiv.style.backgroundColor = '#f5f5f5';
                tagDiv.onmouseout = () => tagDiv.style.backgroundColor = 'white';
                tagDiv.onclick = () => {
                    if (!card.tags.includes(tag)) {
                        card.tags.push(tag);
                        // Update this card's display
                        updateCardTags(card);
                        updateAllDropdowns();
                        
                        // Update server - handle both saved and unsaved ads
                        if (!card.isSaved) {
                            // If ad is not saved yet, save it with the tags
                            const urlParams = new URLSearchParams(window.location.search);
                            const queryParams = {};
                            for (const [key, value] of urlParams.entries()) {
                                queryParams[key] = value;
                            }
                            
                            chrome.runtime.sendMessage(
                                { 
                                    type: 'SAVE_AD',
                                    adId: card.adId,
                                    videoUrl: card.videoUrl,
                                    query_params: queryParams,
                                    tags: card.tags
                                },
                                response => {
                                    if (response?.success) {
                                        // console.log('Ad saved with tags:', card.tags);
                                        card.btn.textContent = 'Saved ✓';
                                        card.btn.style.backgroundColor = 'lightgreen';
                                        card.isSaved = true;
                                        savedAdIds.add(card.adId);
                                    } else {
                                        // console.error('Failed to save ad with tags:', response?.error);
                                    }
                                }
                            );
                        } else {
                            // Ad is already saved, just update tags
                            chrome.runtime.sendMessage(
                                { 
                                    type: 'UPDATE_AD_TAGS',
                                    adId: card.adId,
                                    tags: card.tags
                                },
                                response => {
                                    if (response?.success) {
                                        // console.log('Tags updated successfully:', card.tags);
                                    } else {
                                        // console.error('Failed to update tags:', response?.error);
                                    }
                                }
                            );
                        }
                    }
                };
                tagsList.appendChild(tagDiv);
            }
        });
    });
}

// Function to update the selected tags display for a specific card
function updateCardTags(card) {
    if (!card.tagDropdown) {
        // console.warn('updateCardTags: card.tagDropdown is undefined for card:', card.adId);
        return;
    }
    
    const selectedTagsDiv = card.tagDropdown.querySelector('.selected-tags');
    if (!selectedTagsDiv) {
        // console.warn('updateCardTags: .selected-tags element not found for card:', card.adId);
        return;
    }
    
    selectedTagsDiv.innerHTML = '';
    if (card.tags.length === 0) {
        selectedTagsDiv.innerHTML = '<span style="color: #999;">Click to select tags...</span>';
    } else {
        card.tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.style.cssText = `
                background-color: #e1f5fe;
                color: #01579b;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                display: inline-flex;
                align-items: center;
                margin: 1px;
            `;
            tagSpan.innerHTML = `${tag} <span style="margin-left: 4px; cursor: pointer; font-weight: bold;">&times;</span>`;
            
            // Remove tag on click
            tagSpan.querySelector('span').onclick = (e) => {
                e.stopPropagation();
                card.tags = card.tags.filter(t => t !== tag);
                updateCardTags(card);
                updateAllDropdowns();
                
                // Update server - handle both saved and unsaved ads
                if (!card.isSaved) {
                    // If ad is not saved yet, save it with the updated tags
                    const urlParams = new URLSearchParams(window.location.search);
                    const queryParams = {};
                    for (const [key, value] of urlParams.entries()) {
                        queryParams[key] = value;
                    }
                    
                    chrome.runtime.sendMessage(
                        { 
                            type: 'SAVE_AD',
                            adId: card.adId,
                            videoUrl: card.videoUrl || null,
                            imgUrl: card.imgUrl || null, // Use image URL if found, otherwise null
                            query_params: queryParams,
                            tags: card.tags
                        },
                        response => {
                            if (response?.success) {
                                // console.log('Ad saved with updated tags:', card.tags);
                                card.btn.textContent = 'Saved ✓';
                                card.btn.style.backgroundColor = 'lightgreen';
                                card.isSaved = true;
                                savedAdIds.add(card.adId);
                            } else {
                                // console.error('Failed to save ad with updated tags:', response?.error);
                            }
                        }
                    );
                } else {
                    // Ad is already saved, just update tags
                    chrome.runtime.sendMessage(
                        { 
                            type: 'UPDATE_AD_TAGS',
                            adId: card.adId,
                            tags: card.tags
                        },
                        response => {
                            if (response?.success) {
                                // console.log('Tags updated successfully:', card.tags);
                            } else {
                                // console.error('Failed to update tags:', response?.error);
                            }
                        }
                    );
                }
            };
            
            selectedTagsDiv.appendChild(tagSpan);
        });
    }
}

// Debug function - you can call this manually in the console
window.fbAdSaverDebug = {
  checkStatus: () => {
    // console.log('=== FB Ad Saver Debug Status ===');
    // console.log('Current URL:', window.location.href);
    // console.log('Saved Ad IDs:', Array.from(savedAdIds));
    // console.log('Ad Cards found:', adCards.length);
    // console.log('All Tags:', Array.from(allTags));
    // console.log('Mapped Ads:', mappedAds);
    
    // Show detailed tag information for each ad card
    // console.log('--- Ad Cards Detail ---');
    adCards.forEach((card, index) => {
    //   console.log(`Ad ${index + 1}: ID=${card.adId}, Saved=${card.isSaved}, Tags=[${card.tags?.join(', ') || 'none'}], Button Text="${card.btn?.textContent || 'N/A'}"`);
    });
    
    // Check for target buttons
    const buttons = document.querySelectorAll('button, a, [role="button"]');
    const targetButtons = Array.from(buttons).filter(btn => {
      const text = btn.textContent.trim();
      return text.includes('See ad details') || text.includes('See summary details') || text.includes('Vedi i dettagli di riepilogo') || text.includes("Vedi dettagli dell'inserzione");
    });
    // console.log('Target buttons found:', targetButtons.length);
    
    // Check for Library IDs
    const libraryIds = document.body.textContent.match(/Library ID:\s+\d+/g) || document.body.textContent.match(/ID libreria:\s+\d+/g);

    // console.log('Library IDs found:', libraryIds);
    
    return {
      url: window.location.href,
      savedAdIds: Array.from(savedAdIds),
      adCardsCount: adCards.length,
      allTags: Array.from(allTags),
      targetButtonsCount: targetButtons.length,
      libraryIdsCount: libraryIds ? libraryIds.length : 0
    };
  },
  
  reinitialize: async () => {
    // console.log('🔄 Manual reinitialization...');
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

// console.log('🔧 Debug functions available: window.fbAdSaverDebug.checkStatus(), .reinitialize(), .testButtonAdd()');

// Watch for new ads loading - Wait for DOM to be ready
function setupMutationObserver() {
    if (document.body) {
        const observer = new MutationObserver(async () => {
            // console.log('🔄 DOM mutation detected, checking for new ads...');
            await insertSaveButtons();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        console.log('🔄 MutationObserver set up successfully');
    } else {
        // If body not ready, wait and try again
        setTimeout(setupMutationObserver, 100);
    }
}

// Set up the observer
setupMutationObserver();

// Initial pass - fetch saved ads first, then insert buttons
(async () => {
//   console.log('🎯 Starting FB Ad Saver initialization...');
//   console.log('📍 Current URL:', window.location.href);
  
  try {
    // console.log('📥 Fetching saved ads...');
    await fetchSavedAds();

    // console.log('⏱️ Waiting 3 seconds for page to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // console.log('🔍 Looking for ad cards...');
    await insertSaveButtons();

    // console.log('✅ FB Ad Saver initialization complete!');
  } catch (error) {
    // console.error('❌ FB Ad Saver initialization failed:', error);
  }
})();

