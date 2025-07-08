# FB Ad Saver Chrome Extension

This Chrome extension allows users to save Facebook ads from the Ad Library with custom tags for better organization.

## Features

### Tag Management System
- **Dropdown Tag Selection**: Interactive dropdown interface for selecting tags when saving ads
- **Add New Tags**: Users can add new tags directly from the dropdown interface
- **Remove Tags**: Click the × next to any tag to remove it from an ad
- **Tag Persistence**: All tags are saved to the backend and shared across all ads
- **Global Tag Management**: Manage all available tags from the extension options page

### Ad Saving Features
- **Save/Unsave Ads**: Toggle button to save or unsave ads from the Facebook Ad Library
- **Video URL Extraction**: Automatically extracts video URLs from ads when available
- **Query Parameter Capture**: Saves search parameters along with ads for context

## Installation

1. Load the extension in Chrome by going to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this folder

## Configuration

1. Click on the extension icon and select "Options"
2. Enter your API token in the configuration section
3. Optionally manage your tags from the options page

## Usage

### On Facebook Ad Library
1. Navigate to https://www.facebook.com/ads/library/
2. Browse ads as normal
3. Each ad will show:
   - A tag dropdown to select/add/remove tags
   - A "Save ad" button (changes to "Saved ✓" when saved)

### Tag Management
- **Adding Tags**: Click the tag dropdown and either:
  - Select from existing tags in the list
  - Type a new tag name and click "Add Tag"
- **Removing Tags**: Click the × next to any tag to remove it
- **Global Management**: Use the options page to view and manage all available tags

## API Integration

The extension communicates with a backend API for:
- `GET /meta-ads/all-saved-ads` - Fetch all saved ads and available tags
- `POST /meta-ads/save` - Save a new ad with metadata
- `POST /meta-ads/unsave` - Remove a saved ad
- `POST /meta-ads/update-tags` - Update tags for a specific ad

## File Structure

- `manifest.json` - Extension configuration
- `content.js` - Main content script that runs on Facebook Ad Library
- `background.js` - Service worker for API communication
- `options.html` - Options page for configuration and tag management
- `options.js` - Options page functionality

## Tag Dropdown Features

The tag dropdown system includes:
- **Visual Tag Display**: Selected tags appear as colored chips with remove buttons
- **Available Tags List**: Dropdown shows all available tags not currently selected
- **Add New Tags**: Input field to add new tags that don't exist yet
- **Real-time Updates**: Changes are immediately synced to the backend
- **Cross-Card Sync**: Adding a tag in one dropdown makes it available in all others

## Notes

- The extension only works on `https://www.facebook.com/ads/library/*`
- Requires a valid API token to be configured
- Tags are shared globally across all ads
- Changes are automatically saved to the backend when made
