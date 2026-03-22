const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new", dumpio: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  console.log("Navigating to http://localhost:3000...");
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(console.error);
  
  // wait another sec for react render
  await new Promise(r => setTimeout(r, 1500));

  const content = await page.evaluate(() => document.getElementById('root')?.innerHTML);
  console.log("\n--- ROOT CONTENT AT DASH ---");
  console.log(content ? content.substring(0, 500) : "NO ROOT");

  console.log("Navigating to ScanResultPage...");
  await page.goto('http://localhost:3000/scan/5e2f1c58-fb5a-4b0c-bc77-84331e2f5fb1', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(console.error);
  
  await new Promise(r => setTimeout(r, 1500));

  const content2 = await page.evaluate(() => document.getElementById('root')?.innerHTML);
  console.log("\n--- ROOT CONTENT AT SCAN ---");
  console.log(content2 ? content2.substring(0, 500) : "NO ROOT");

  await browser.close();
})();

