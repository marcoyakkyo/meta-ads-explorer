let savedAds = new Map(); // Set to hold unique saved ad IDs as keys and their tags as values
let allTags = new Set(); // Store all available tags
let adCards = []; // Array to hold ad card objects

function computeAllTags() {
    allTags.clear();
    savedAds.forEach(tags => {
        tags.forEach(tag => {
            allTags.add(tag);
        });
    });
    console.log('All tags re-computed from saved ads, total = ', allTags.size);
}

export { savedAds, allTags, adCards, computeAllTags };
