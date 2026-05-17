const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function test() {
  const filePath = path.join(__dirname, '../docs/Customer Success Document 1_ Tier 1 Support Troubleshooting Matrix.pdf');
  const buffer = fs.readFileSync(filePath);
  
  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText();
  const text = textResult.text;
  console.log('Successfully parsed text! Length:', text.length);
  console.log('Preview text:\n', text.substring(0, 500));
}

test().catch(err => console.error('Error:', err));
