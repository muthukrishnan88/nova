// Simple icon generator using Node.js
const fs = require('fs');
const path = require('path');

console.log('Checking for logo...');

if (!fs.existsSync('logo.jpeg')) {
  console.error('ERROR: logo.jpeg not found in extension folder');
  process.exit(1);
}

console.log('✓ Logo found');
console.log('\nInstalling sharp package...');

// Try to use sharp for image conversion
try {
  const sharp = require('sharp');

  const sizes = [16, 48, 128];

  Promise.all(
    sizes.map(size => {
      return sharp('logo.jpeg')
        .resize(size, size, { fit: 'cover' })
        .png()
        .toFile(`icon${size}.png`)
        .then(() => {
          console.log(`✓ Created icon${size}.png`);
        });
    })
  ).then(() => {
    console.log('\n✓ All icons created successfully!');
    console.log('\nNext: Run load-extension.bat or load extension in Chrome');
  }).catch(err => {
    console.error('Error creating icons:', err.message);
    console.log('\nFallback: Use convert-logo.html in browser instead');
  });

} catch (err) {
  console.log('\nSharp not installed. Installing now...');
  console.log('Run: npm install sharp');
  console.log('Or use convert-logo.html in browser instead');
  process.exit(0);
}
