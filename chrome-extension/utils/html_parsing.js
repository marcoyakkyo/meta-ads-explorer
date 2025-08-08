import { adCards } from './globals.js';

// Helper function to extract video URL with multiple methods
function extractVideoUrl(videoElement) {
  if (!videoElement) return null;

  let posterUrl = videoElement.poster || videoElement.getAttribute('poster') || null;

  // Method 1: Try direct property access
  if (videoElement.src) {
  //   console.log('Found video URL via .src property:', videoElement.src);
      return {videoUrl:  videoElement.src, posterUrl: posterUrl};
  }

  // Method 2: Try getAttribute
  const srcAttr = videoElement.getAttribute('src');
  if (srcAttr) {
  //   console.log('Found video URL via getAttribute:', srcAttr);
      return { posterUrl: posterUrl, videoUrl: srcAttr};
  }

  // Method 3: Try currentSrc (for actively playing videos)
  if (videoElement.currentSrc) {
  //   console.log('Found video URL via .currentSrc:', videoElement.currentSrc);
      return {videoUrl: videoElement.currentSrc, posterUrl: posterUrl};
  }

  // Method 4: Check all attributes manually
  const attributes = videoElement.attributes;
  for (let i = 0; i < attributes.length; i++) {
      if (attributes[i].name === 'src') {
      // console.log('Found video URL via attributes collection:', attributes[i].value);
      return {posterUrl: posterUrl, videoUrl: attributes[i].value};
      }
  }

  // Method 5: Parse from outerHTML (your original approach)
  const outerHTML = videoElement.outerHTML;
  // console.log('Video element outerHTML:', outerHTML);
  const srcMatch = outerHTML.match(/src=["']([^"']+)["']/);
  if (srcMatch && srcMatch[1]) {
  //   console.log('Found video URL via regex parsing:', srcMatch[1]);
      return {posterUrl: posterUrl, videoUrl: srcMatch[1]};
  }

  // Method 6: Check if video has source children
  const sourceElements = videoElement.getElementsByTagName('source');
  if (sourceElements.length > 0) {
      const sourceUrl = sourceElements[0].src || sourceElements[0].getAttribute('src');
      if (sourceUrl) {
      // console.log('Found video URL via source element:', sourceUrl);
      return {posterUrl: posterUrl, videoUrl: sourceUrl};
      }
  }
  return null;
}


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
async function waitAndExtractVideo(videoElement, attempts = 0) {
    const results = extractVideoUrl(videoElement);
    if (results || attempts >= 5) {
        return results;
    } else {
        await new Promise(resolve => setTimeout(resolve, 200));
        return waitAndExtractVideo(videoElement, attempts + 1);
    }
}


// Wait a bit for dynamic content to load
async function waitAndExtractImg(imgElement, attempts = 0) {
    const url = extractImgSrc(imgElement);
    if (url || attempts >= 5) {
        return url;
    } else {
        await new Promise(resolve => setTimeout(resolve, 200));
        return waitAndExtractImg(imgElement, attempts + 1);
    }
}


async function findImgSrc(adCardElement, targetAdId) {
  // Your original traversal logic
  let currentElement = adCardElement;

  while (currentElement && currentElement !== document.body) {
    const libraryIdMatches = currentElement.textContent.match(/Library ID:\s+\d+/g) || currentElement.textContent.match(/ID libreria:\s+\d+/g);

    if (libraryIdMatches && libraryIdMatches.length > 1) {
      break;
    } else if (libraryIdMatches && libraryIdMatches.length === 1 && !libraryIdMatches[0].includes(targetAdId)) {
      break;
    } else if (libraryIdMatches && libraryIdMatches.length === 1 && libraryIdMatches[0].includes(targetAdId)) {

    // fetch all img and take the last 
      const imgElement = currentElement.querySelectorAll('img');

      if (imgElement && imgElement.length > 0) {
        // Try to extract URL immediately
        const immediateUrl = extractImgSrc(imgElement[imgElement.length - 1]);
        if (immediateUrl) {
          return immediateUrl;
        }
        // If immediate extraction fails, wait and try again
        return await waitAndExtractImg([imgElement.length - 1]);
      }
    }
    currentElement = currentElement.parentElement;
  }
  return null;
}


async function findVideoSrc(adCardElement, targetAdId) {
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

        const immediateUrl = extractVideoUrl(videoElement);
        if (immediateUrl && immediateUrl.videoUrl) {
          return immediateUrl;
        }

        // If immediate extraction fails, wait and try again
        return await waitAndExtractVideo(videoElement);
      }
    }
    currentElement = currentElement.parentElement;
  }
  return null;
}


// we need to find ad cards by first finding buttons with 'See ad details' or 'See summary details', then going up to find Library ID
async function findAdCards() {

  // First, find all buttons/links with the target text
  const allButtons = document.querySelectorAll('button, a, [role="button"]');

  let targetButtons = 0;
  
  for (const button of allButtons) {
    const text = button.textContent.trim();

    if (text.includes('See ad details') || text.includes('See summary details') || text.includes('Vedi i dettagli di riepilogo') || text.includes("Vedi dettagli dell'inserzione")) {
      targetButtons++;

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
      if (!adCardElement || !adId) {
        continue;
      }

      if (adCards.find(card => card.adId === adId)) {
        continue; // Skip if ad card already exists
      }
  
      let video_stuff = await findVideoSrc(adCardElement, adId);
      let imgUrl = null;

      if (!video_stuff || !video_stuff.videoUrl) {
        imgUrl = await findImgSrc(adCardElement, adId);
      }

      let obj = {
        adId: adId, 
        element: adCardElement,
        isSaved: false,
        btn: null,
        videoUrl: null,
        posterUrl: null,
        imgUrl: imgUrl
      };

      if (imgUrl) {
        obj.imgUrl = imgUrl;
      }
      if (video_stuff) {
        obj.videoUrl = video_stuff.videoUrl;
        obj.posterUrl = video_stuff.posterUrl;
      }

      adCards.push(obj);

    }
  }
  return adCards;
}

export { findAdCards} ;
