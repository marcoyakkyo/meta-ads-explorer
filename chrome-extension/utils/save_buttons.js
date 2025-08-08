import {adCards, allTags, savedAds} from './globals.js';

import { findAdCards } from './html_parsing.js';

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

    // Search/Add new tag input
    const newTagInput = document.createElement('input');
    newTagInput.type = 'text';
    newTagInput.placeholder = 'Search tags or add new... (dropdown stays open)';
    newTagInput.style.cssText = `
        width: 100%;
        padding: 8px;
        border: none;
        border-bottom: 1px solid #eee;
        outline: none;
    `;

    // Add tag button (initially hidden)
    const addTagBtn = document.createElement('button');
    addTagBtn.textContent = 'Add New Tag';
    addTagBtn.style.cssText = `
        width: 100%;
        padding: 8px;
        border: none;
        background-color: #4CAF50;
        color: white;
        cursor: pointer;
        border-bottom: 1px solid #eee;
        display: none;
    `;

    // Available tags list
    const tagsList = document.createElement('div');
    tagsList.className = 'tags-list';

    dropdownContent.appendChild(newTagInput);
    dropdownContent.appendChild(addTagBtn);
    dropdownContent.appendChild(tagsList);

    container.appendChild(selectedTagsDiv);
    container.appendChild(dropdownContent);

    function addTag(tag) {
        if (!card.tags.has(tag)) {
            card.tags.add(tag);
            allTags.add(tag);
            updateSelectedTagsDisplay(); // Only update selected tags display
            filterAvailableTags(''); // Refresh the available tags without closing dropdown
            
            // Update server immediately - handle both saved and unsaved ads
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
                        videoUrl: card.videoUrl || null,
                        posterUrl: card.posterUrl || null,
                        imgUrl: card.imgUrl || null,
                        query_params: queryParams,
                        full_text: card.element.textContent || '',
                        tags: card.tags || []
                    },
                    response => {
                        if (response?.success) {
                            card.btn.textContent = 'Saved ✓';
                            card.btn.style.backgroundColor = 'lightgreen';
                            card.isSaved = true;
                            if (savedAds.has(card.adId)) {
                                savedAds.get(card.adId).add(tag);
                            }
                            else {
                                savedAds.set(card.adId, new Set([tag]));
                            }
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
    }

    // Function to update only the selected tags display without affecting dropdown state
    function updateSelectedTagsDisplay() {
        selectedTagsDiv.innerHTML = '';
        if (card.tags.size === 0) {
            selectedTagsDiv.innerHTML = '<span style="color: #999;">Click to select tags...</span>';
            return ; // No tags to display
        }
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
                
                card.tags.delete(tag);
                updateSelectedTagsDisplay(); // Update display
                filterAvailableTags(''); // Refresh available tags to show the removed tag

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
                            posterUrl: card.posterUrl || null, // Use poster URL if found, otherwise null
                            imgUrl: card.imgUrl || null, // Use image URL if found, otherwise null
                            query_params: queryParams,
                            full_text: card.element.textContent || '', // Include full text of the ad
                            tags: card.tags || [] // Include current tags when saving
                        },
                        response => {
                            if (response?.success) {
                                // console.log('Ad saved with updated tags:', card.tags);
                                card.btn.textContent = 'Saved ✓';
                                card.btn.style.backgroundColor = 'lightgreen';
                                card.isSaved = true;
                                if (savedAds.has(card.adId)) {
                                    savedAds.get(card.adId).add(tag);
                                }
                                else {
                                    savedAds.set(card.adId, new Set([tag]));
                                }
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

    // Event handlers
    selectedTagsDiv.onclick = () => {
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
        if (dropdownContent.style.display === 'block') {
            initializeDropdown(); // Refresh the available tags when opening
            newTagInput.value = ''; // Clear search
            addTagBtn.style.display = 'none'; // Hide add button
            newTagInput.focus(); // Focus on search input for immediate typing
        }
    };

    // Search functionality
    newTagInput.oninput = () => {
        const searchTerm = newTagInput.value.trim().toLowerCase();
        filterAvailableTags(searchTerm);
        
        // Show/hide add button based on whether the search term is an existing tag
        const exactMatch = Array.from(allTags).some(tag => tag.toLowerCase() === searchTerm);
        const alreadySelected = [...card.tags].some(tag => tag.toLowerCase() === searchTerm);
        
        if (searchTerm && !exactMatch && !alreadySelected) {
            addTagBtn.style.display = 'block';
            addTagBtn.textContent = `Add "${newTagInput.value.trim()}"`;
        } else {
            addTagBtn.style.display = 'none';
        }
    };

    addTagBtn.onclick = () => {
        const newTag = newTagInput.value.trim();
        if (newTag && !card.tags.has(newTag)) {
            addTag(newTag);
            newTagInput.value = '';
            addTagBtn.style.display = 'none';
            filterAvailableTags(''); // Reset filter to show all available tags
            // Keep dropdown open for multiple selections
        }
    };

    newTagInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            const searchTerm = newTagInput.value.trim().toLowerCase();
            const exactMatch = Array.from(allTags).find(tag => tag.toLowerCase() === searchTerm);
            
            if (exactMatch && !card.tags.has(exactMatch)) {
                // Select existing tag
                addTag(exactMatch);
                newTagInput.value = '';
                filterAvailableTags(''); // Reset filter to show all available tags
                // Keep dropdown open for multiple selections
            } else if (addTagBtn.style.display === 'block') {
                // Add new tag
                addTagBtn.click();
            }
        }
    };

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            dropdownContent.style.display = 'none';
        }
    });

    // Filter available tags based on search term
    function filterAvailableTags(searchTerm = '') {
        tagsList.innerHTML = '';
        const filteredTags = Array.from(allTags).filter(tag => {
            return !card.tags.has(tag) && 
                   tag.toLowerCase().includes(searchTerm.toLowerCase());
        });
        
        filteredTags.forEach(tag => {
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
                // Add tag to card directly
                if (!card.tags.has(tag)) {
                    card.tags.add(tag);

                    // Update only the selected tags display manually
                    const selectedTagsDiv = card.tagDropdown.querySelector('.selected-tags');
                    if (selectedTagsDiv) {
                        selectedTagsDiv.innerHTML = '';
                        card.tags.forEach(cardTag => {
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
                            tagSpan.innerHTML = `${cardTag} <span style="margin-left: 4px; cursor: pointer; font-weight: bold;">&times;</span>`;
                            selectedTagsDiv.appendChild(tagSpan);
                        });
                    }
                    
                    // Clear search and hide add button but keep dropdown open
                    const searchInput = card.tagDropdown.querySelector('input');
                    if (searchInput) {
                        searchInput.value = '';
                        const addBtn = card.tagDropdown.querySelector('button');
                        if (addBtn) addBtn.style.display = 'none';
                    }
                    
                    // Remove this tag from the current list by hiding it
                    tagDiv.style.display = 'none';
                    
                    // Update server immediately - handle both saved and unsaved ads
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
                                videoUrl: card.videoUrl || null,
                                posterUrl: card.posterUrl || null,
                                imgUrl: card.imgUrl || null,
                                query_params: queryParams,
                                full_text: card.element.textContent || '',
                                tags: card.tags || []
                            },
                            response => {
                                if (response?.success) {
                                    card.btn.textContent = 'Saved ✓';
                                    card.btn.style.backgroundColor = 'lightgreen';
                                    card.isSaved = true;
                                    if (savedAds.has(card.adId)) {
                                        savedAds.get(card.adId).add(tag);
                                    } else {
                                        savedAds.set(card.adId, new Set([tag]));
                                    }
                                    // Add tag to global tags set
                                    allTags.add(tag);
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
                                    // Add tag to global tags set
                                    allTags.add(tag);
                                } else {
                                    // console.error('Failed to update tags:', response?.error);
                                }
                            }
                        );
                    }
                }
            };
            tagsList.appendChild(tagDiv);
        });
        
        // Show message if no tags match the search
        if (filteredTags.length === 0 && searchTerm) {
            const noResultsDiv = document.createElement('div');
            noResultsDiv.textContent = 'No matching tags found';
            noResultsDiv.style.cssText = `
                padding: 8px;
                color: #999;
                font-style: italic;
                text-align: center;
            `;
            tagsList.appendChild(noResultsDiv);
        }
    }

    // Initialize the dropdown with existing tags
    function initializeDropdown() {
        // Update selected tags display
        updateSelectedTagsDisplay();
        // Display all available tags initially
        filterAvailableTags('');
    }
    // Initialize
    initializeDropdown();
    return container;
}


async function insertSaveButtons() {

    await findAdCards();

    if (adCards.length === 0) {
        console.log('No ad cards found to insert save buttons');
        return;
    }
    console.log(`🏁 insertSaveButtons started for ${adCards.length} ads`);

    // Extract query parameters from current URL
    const urlParams = new URLSearchParams(window.location.search);
    const queryParams = {};

    for (const [key, value] of urlParams.entries()) {
        queryParams[key] = value;
    }

    adCards.forEach((card, index) => {

        if (card.element.querySelector('.my-save-button')) {
            return;  // avoid duplicates
        }

        // Check if this ad is in our saved ads list
        card.isSaved = savedAds.has(card.adId);
        card.tags = savedAds.get(card.adId) || new Set(); // Use Set for unique tags

        // Create tag dropdown interface
        card.tagDropdown = createTagDropdown(card);

        // Verify the dropdown was created successfully
        if (!card.tagDropdown) {
            return;
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
            if (!card.isSaved) {
                chrome.runtime.sendMessage(
                    { 
                        type: 'SAVE_AD',
                        adId: card.adId,
                        videoUrl: card.videoUrl || null, // Use video URL if found, otherwise null
                        posterUrl: card.posterUrl || null, // Use poster URL if found, otherwise null
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
                            if (savedAds.has(card.adId)) {
                                savedAds.get(card.adId).add(...card.tags);
                            }
                            else {
                                savedAds.set(card.adId, new Set(card.tags));
                            }
                            console.log(`Ad ${card.adId} saved with tags:`, card.tags, 'now total tags:', allTags.size, 'total saved ads:', savedAds.size);
                        }
                        else console.error('Save failed', response?.error);
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
                            if (savedAds.has(card.adId)) {
                                savedAds.delete(card.adId);
                            }
                        }
                        else console.error('Unsave failed', response?.error);
                    });
            }
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



// // Function to update the selected tags display for a specific card
// function updateCardTags(card) {
//     if (!card.tagDropdown) {
//         // console.warn('updateCardTags: card.tagDropdown is undefined for card:', card.adId);
//         return;
//     }
    
//     const selectedTagsDiv = card.tagDropdown.querySelector('.selected-tags');
//     if (!selectedTagsDiv) {
//         // console.warn('updateCardTags: .selected-tags element not found for card:', card.adId);
//         return;
//     }
    
//     selectedTagsDiv.innerHTML = '';
//     if (card.tags.size === 0) {
//         selectedTagsDiv.innerHTML = '<span style="color: #999;">Click to select tags...</span>';
//     } else {
//         card.tags.forEach(tag => {
//             const tagSpan = document.createElement('span');
//             tagSpan.style.cssText = `
//                 background-color: #e1f5fe;
//                 color: #01579b;
//                 padding: 2px 8px;
//                 border-radius: 12px;
//                 font-size: 12px;
//                 display: inline-flex;
//                 align-items: center;
//                 margin: 1px;
//             `;
//             tagSpan.innerHTML = `${tag} <span style="margin-left: 4px; cursor: pointer; font-weight: bold;">&times;</span>`;
            
//             // Remove tag on click
//             tagSpan.querySelector('span').onclick = (e) => {
//                 e.stopPropagation();
//                 card.tags.delete(tag);
//                 updateCardTags(card);

//                 // Update server - handle both saved and unsaved ads
//                 if (!card.isSaved) {
//                     // If ad is not saved yet, save it with the updated tags
//                     const urlParams = new URLSearchParams(window.location.search);
//                     const queryParams = {};
//                     for (const [key, value] of urlParams.entries()) {
//                         queryParams[key] = value;
//                     }
                    
//                     chrome.runtime.sendMessage(
//                         { 
//                             type: 'SAVE_AD',
//                             adId: card.adId,
//                             videoUrl: card.videoUrl || null, // Use video URL if found, otherwise null
//                             posterUrl: card.posterUrl || null, // Use poster URL if found, otherwise null
//                             imgUrl: card.imgUrl || null, // Use image URL if found, otherwise null
//                             query_params: queryParams,
//                             full_text: card.element.textContent || '', // Include full text of the ad
//                             tags: card.tags || [] // Include current tags when saving
//                         },
//                         response => {
//                             if (response?.success) {
//                                 // console.log('Ad saved with updated tags:', card.tags);
//                                 card.btn.textContent = 'Saved ✓';
//                                 card.btn.style.backgroundColor = 'lightgreen';
//                                 card.isSaved = true;
//                                 if (savedAds.has(card.adId)) {
//                                     savedAds.get(card.adId).add(tag);
//                                 } else {
//                                     savedAds.set(card.adId, new Set([tag]));
//                                 }
//                             } else {
//                                 // console.error('Failed to save ad with updated tags:', response?.error);
//                             }
//                         }
//                     );
//                 } else {
//                     // Ad is already saved, just update tags
//                     chrome.runtime.sendMessage(
//                         { 
//                             type: 'UPDATE_AD_TAGS',
//                             adId: card.adId,
//                             tags: card.tags
//                         },
//                         response => {
//                             if (response?.success) {
//                                 // console.log('Tags updated successfully:', card.tags);
//                             } else {
//                                 // console.error('Failed to update tags:', response?.error);
//                             }
//                         }
//                     );
//                 }
//             };
            
//             selectedTagsDiv.appendChild(tagSpan);
//         });
//     }
// }