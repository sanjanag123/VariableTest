// Handle navigation back to dashboard
function goBack() {
  window.location.href = "index.html";
}

console.log('Script loaded');

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded');
  
  // Get the category name
  const category = document.body.getAttribute('data-category');
  console.log('Category:', category);
  
  const fileInput = document.getElementById('fileInput');
  const gallery = document.getElementById('gallery');
  const counter = document.getElementById('counter');
  
  console.log('Elements found: fileInput=' + !!fileInput + ', gallery=' + !!gallery + ', counter=' + !!counter);
  
  // Only run on category pages
  if (!fileInput || !gallery || !counter) {
    console.log('Not a category page, skipping');
    return;
  }
  
  // Storage keys
  const storageKey = category + 'Images';
  const countKey = category + 'Count';
  
  // Load saved images
  function loadImages() {
    try {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading:', e);
      return [];
    }
  }
  
  // Save images
  function saveImages(images) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(images));
      localStorage.setItem(countKey, String(images.length));
      console.log('✅ Saved', images.length, 'images. Storage key:', storageKey);
    } catch (e) {
      console.error('❌ Error saving:', e);
    }
  }
  
  // Update counter
  function updateCounter(count) {
    counter.textContent = count;
    console.log('Counter updated to:', count);
  }
  
  // Compress image to reduce storage size
  function compressImage(imageSrc, maxWidth) {
    return new Promise(function(resolve) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Resize if too large
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG with 0.7 quality (smaller file size)
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        console.log('🗜️ Compressed image from', imageSrc.length, 'to', compressed.length, 'bytes');
        resolve(compressed);
      };
      img.src = imageSrc;
    });
  }
  
  // Add image to gallery
  function addImageToGallery(imageSrc) {
    const img = document.createElement('img');
    img.src = imageSrc;
    img.style.cursor = 'pointer';
    img.title = 'Click to delete';
    
    img.addEventListener('click', function() {
      if (confirm('Delete this image?')) {
        let images = loadImages();
        const index = images.indexOf(imageSrc);
        if (index > -1) {
          images.splice(index, 1);
          saveImages(images);
          updateCounter(images.length);
          img.remove();
        }
      }
    });
    
    gallery.appendChild(img);
  }
  
  // Load existing images on page load
  const savedImages = loadImages();
  console.log('Found', savedImages.length, 'saved images');
  savedImages.forEach(function(src) {
    addImageToGallery(src);
  });
  updateCounter(savedImages.length);
  
  // Handle file upload
  fileInput.addEventListener('change', function(e) {
    console.log('File input CHANGED! Files:', e.target.files.length);
    
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log('No files');
      return;
    }
    
    // Create an array of promises to read all files
    const filePromises = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.match('image.*')) {
        console.log('Not an image, skipping:', file.name);
        continue;
      }
      
      console.log('Queuing file:', file.name);
      
      // Create a promise for each file
      const promise = new Promise(function(resolve, reject) {
        const reader = new FileReader();
        
        reader.onload = function(event) {
          console.log('File loaded:', file.name);
          resolve(event.target.result);
        };
        
        reader.onerror = function() {
          console.error('Error reading:', file.name);
          reject(new Error('Failed to read ' + file.name));
        };
        
        reader.readAsDataURL(file);
      });
      
      filePromises.push(promise);
    }
    
    // Wait for all files to be read, then compress and save
    Promise.all(filePromises).then(function(newImages) {
      console.log('📦 All files loaded! New images:', newImages.length);
      
      // Compress all images
      console.log('🗜️ Compressing images...');
      const compressionPromises = newImages.map(function(imageSrc) {
        return compressImage(imageSrc, 800); // Max width 800px
      });
      
      return Promise.all(compressionPromises);
    }).then(function(compressedImages) {
      console.log('✅ All images compressed! Count:', compressedImages.length);
      
      // Load existing images
      let images = loadImages();
      console.log('📂 Existing images in storage:', images.length);
      
      // Add all compressed images
      compressedImages.forEach(function(imageSrc) {
        images.push(imageSrc);
        addImageToGallery(imageSrc);
      });
      
      console.log('📊 Total images now (before save):', images.length);
      
      // Save once with all images
      saveImages(images);
      updateCounter(images.length);
      
      // Verify it was saved correctly
      const verified = loadImages();
      console.log('✔️ Verification: Storage now has', verified.length, 'images');
      if (verified.length !== images.length) {
        console.error('⚠️ WARNING: Mismatch! Expected', images.length, 'but storage has', verified.length);
      }
    }).catch(function(error) {
      console.error('❌ Error processing files:', error);
    });
    
    fileInput.value = '';
  });
  
  console.log('Setup complete');
});
  