import { sendDaily } from '../services/chefeBruno.js';

async function main() {
  console.log('Testing sendDaily...');
  try {
    const result = await sendDaily();
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (e: any) {
    console.error('Error:', e.message);
    console.error(e.stack);
  }
  process.exit(0);
}

main();
