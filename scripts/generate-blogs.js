const https = require('http');

const productNames = [
  "ENSURE High Protein Health Drink, Chocolate 200g | Protein Drink for Active Adults | Muscle Recovery & Meal Replacement",
  "Ensure Chocolate Nutritional Supplement Drink | High Protein | 32 Nutrients | 950g | Adult Health"
];

const data = JSON.stringify({
  productNames: productNames
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/blogs/generate-for-products',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Generating blogs for products...');
console.log('Product 1:', productNames[0]);
console.log('Product 2:', productNames[1]);
console.log('\nSending request...\n');

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(responseData);
      console.log('Response:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('\n✅ Success!');
        console.log(`Summary:`);
        console.log(`  Total: ${result.summary.total}`);
        console.log(`  Found: ${result.summary.found}`);
        console.log(`  Not Found: ${result.summary.notFound}`);
        console.log(`  Errors: ${result.summary.errors}`);
        console.log(`  Titles Generated: ${result.summary.totalTitlesGenerated}`);
        console.log(`  Articles Generated: ${result.summary.totalArticlesGenerated}`);
      } else {
        console.log('\n❌ Failed:', result.error);
      }
    } catch (error) {
      console.error('Error parsing response:', error);
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(data);
req.end();

