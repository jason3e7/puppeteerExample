'use strict';

const puppeteer = require('puppeteer');
const chromeArgs = [
	'--no-sandbox',
	'--disable-setuid-sandbox',
	'--disable-gpu',
	'--hide-scrollbars',
	'--mute-audio',
	'--ignore-certificate-errors',
	'--ignore-certificate-errors-spki-list',
	'--ssl-version-max=tls1.3',
	'--ssl-version-min=tls1',
	'--disable-web-security',
	'--allow-running-insecure-content',
	'--proxy-bypass-list=<-loopback>',
	'--window-size=1024,768'
];

(async () => {
  // chromeArgs.push("--proxy-server=127.0.0.1:8080");
  const browser = await puppeteer.launch({
    // slowMo: 100,
    // headless: false, 
    // devtools: true, 
    args: chromeArgs, ignoreHTTPSErrors:true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 768 });

  // await page.setJavaScriptEnabled(false);
  // await page.setRequestInterception(true);
  // page.on('request', request => {
  //   if (request.resourceType() === 'document')
  //     request.continue();
  //   else
  //     request.abort();
  // });

  const delay = 500;
  await page.setDefaultTimeout(0);
  await page.goto("https://github.com/", {waitUntil: 'domcontentloaded'});
  // await page.waitFor(delay);

  const selector = '.header-search-input'
  await page.waitForSelector(selector);

  await page.type(selector, 'puppeteer');
  await page.type(selector, String.fromCharCode(13));
  // await page.waitFor(delay);
  
  await page.waitForSelector('div.f4.text-normal a');
  await page.evaluate(() => {
    document.querySelector('div.f4.text-normal a').click();
  });
  await page.waitForSelector('.text-gray-dark.mr-2');
  // await page.waitFor(delay);
  
  const text = await page.$eval('.text-gray-dark.mr-2', e => e.innerText);
  console.log("Hello " + text);

  await page.waitFor(3500);
  await browser.close();
})();


