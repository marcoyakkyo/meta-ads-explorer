import { allTags, savedAds } from "./globals";
import { extractQueryParams, saveAd, updateAdTags } from "./utilities";

function addTag(card, tag) {
    if (card.tags.has(tag)) {
        return; // Tag already exists
    }

    card.tags.add(tag);
    updateSelectedTagsDisplay(card); // Only update selected tags display
    filterAvailableTags(card, ''); // Refresh the available tags without closing dropdown

    // Update server immediately
    if (!card.isSaved) saveAd(card, extractQueryParams()); // Save ad with new tag
    else updateAdTags(card);
}


// Function to update only the selected tags display without affecting dropdown state
function updateSelectedTagsDisplay(card) {

    card.selectedTagsDiv.innerHTML = '';

    if (card.tags.size === 0) {
        card.selectedTagsDiv.innerHTML = '<span style="color: #999;">Click to select tags...</span>';
        return ; // No tags to display
    }
    const queryParams = extractQueryParams();

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
            updateSelectedTagsDisplay(card); // Update display
            filterAvailableTags(card, ''); // Refresh available tags to show the removed tag

            if (card.isSaved) updateAdTags(card);
            else saveAd(card, queryParams);
            return false;
        };
        card.selectedTagsDiv.appendChild(tagSpan);
    });
}


// Filter available tags based on search term
function filterAvailableTags(card, searchTerm = '') {
    card.tagsListDiv.innerHTML = '';

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
                if (card.selectedTagsDiv) {
                    card.selectedTagsDiv.innerHTML = '';
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
                        card.selectedTagsDiv.appendChild(tagSpan);
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
                
                // Update server immediately
                if (!card.isSaved) {
                    saveAd(card, extractQueryParams());
                } else {
                    updateAdTags(card);
                }
            }
        };
        card.tagsListDiv.appendChild(tagDiv);
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
        card.tagsListDiv.appendChild(noResultsDiv);
    }
}


// Initialize the dropdown with existing tags
function initializeDropdown(card) {
    updateSelectedTagsDisplay(card);
    filterAvailableTags(card, '');
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

    // Selected tags display, but first erase the previous selected tags div if it exists
    if (card.selectedTagsDiv) {
        card.selectedTagsDiv.remove();
    }

    card.selectedTagsDiv = document.createElement('div');
    card.selectedTagsDiv.className = 'selected-tags';
    card.selectedTagsDiv.style.cssText = `
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
    if (card.tagsListDiv) {
        card.tagsListDiv.remove(); // Remove previous tags list if it exists
    }
    card.tagsListDiv = document.createElement('div');
    card.tagsListDiv.className = 'tags-list';

    dropdownContent.appendChild(newTagInput);
    dropdownContent.appendChild(addTagBtn);
    dropdownContent.appendChild(card.tagsListDiv);

    container.appendChild(card.selectedTagsDiv);
    container.appendChild(dropdownContent);

    // Event handlers
    card.selectedTagsDiv.onclick = () => {
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
        if (dropdownContent.style.display === 'block') {
            initializeDropdown(card); // Refresh the available tags when opening
            newTagInput.value = ''; // Clear search
            addTagBtn.style.display = 'none'; // Hide add button
            newTagInput.focus(); // Focus on search input for immediate typing
        }
    };

    // Search functionality
    newTagInput.oninput = () => {
        const searchTerm = newTagInput.value.trim().toLowerCase();
        filterAvailableTags(card, searchTerm);
        
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
            addTag(card, newTag);
            newTagInput.value = '';
            addTagBtn.style.display = 'none';
            filterAvailableTags(card, ''); // Reset filter to show all available tags
            // Keep dropdown open for multiple selections
        }
    };

    newTagInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            const searchTerm = newTagInput.value.trim().toLowerCase();
            const exactMatch = Array.from(allTags).find(tag => tag.toLowerCase() === searchTerm);
            
            if (exactMatch && !card.tags.has(exactMatch)) {
                // Select existing tag
                addTag(card, exactMatch);
                newTagInput.value = '';
                filterAvailableTags(card, ''); // Reset filter to show all available tags
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

    // Initialize
    initializeDropdown(card);
    return container;
}

export { createTagDropdown };
