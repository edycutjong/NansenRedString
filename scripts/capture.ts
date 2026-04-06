import puppeteer from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import * as path from 'path';

async function capture() {
  const args = process.argv.slice(2);
  const mode = args.includes('--video') ? 'video' : 'ss';
  const fileArgs = args.filter(a => !a.startsWith('--'));

  const inputFile = fileArgs[0];
  if (!inputFile) {
    console.error('Usage: npx tsx scripts/capture.ts <path-to-html-file> [output-path] [--video|--ss]');
    process.exit(1);
  }

  const inputPath = path.resolve(inputFile);
  let outputPath = fileArgs[1] ? path.resolve(fileArgs[1]) : '';

  if (!outputPath) {
    if (mode === 'video') {
      outputPath = inputPath.replace('.html', '-video.mp4');
    } else {
      outputPath = inputPath.replace('.html', '-screenshot.png');
    }
  }

  console.log(`📸 Capturing ${mode.toUpperCase()} for ${inputPath}...`);
  
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    defaultViewport: {
      width: 1280,
      height: 720,
      deviceScaleFactor: 2, // Retina resolution for crisp text (2560x1440 output)
    }
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', (error: any) => console.log('BROWSER ERROR:', (error as Error).message));
  
  let recorder;
  if (mode === 'video') {
    recorder = new PuppeteerScreenRecorder(page, {
      fps: 30,
      videoFrame: { width: 2560, height: 1440 }
    });
    // Start recording before navigation to capture the cinematic boot
    await recorder.start(outputPath);
  }

  // Navigation waits for network to idle
  const fileUrl = `file://${inputPath}`;
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  // Wait for the cinematic boot sequence to finish
  console.log('⏳ Waiting for cinematic boot sequence to finish...');
  await page.waitForSelector('#loading.hidden', { timeout: 15000 });

  // Wait additional time for 3D physics structure to fully organize
  console.log('⏳ Waiting for 3D graph layout to settle...');
  
  if (mode === 'video') {
    console.log('🎥 Recording 8 seconds of graph animation...');
    await new Promise(r => setTimeout(r, 8000));
    await recorder?.stop();
    console.log(`✅ Video saved to ${outputPath}`);
  } else {
    // Wait for settling before snapshot
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: outputPath });
    console.log(`✅ Screenshot saved to ${outputPath}`);
    console.log(`   Dimensions: 1280x720 (Retina 2x -> 2560x1440 image)`);
  }

  await browser.close();
}

capture().catch(console.error);
