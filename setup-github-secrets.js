#!/usr/bin/env node

/**
 * GitHub Secrets Setup Helper
 * 
 * This script helps you securely store your private key in GitHub Secrets
 * so GitHub Actions can sign your releases automatically.
 * 
 * Usage: node setup-github-secrets.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PRIVATE_KEY_PATH = path.join(__dirname, 'app/src-tauri/tauri.key');

function checkPrivateKey() {
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error('❌ Error: Private key not found at:', PRIVATE_KEY_PATH);
    console.error('   Make sure you\'ve run: npm run tauri build');
    process.exit(1);
  }
  
  const keyContent = fs.readFileSync(PRIVATE_KEY_PATH, 'utf-8');
  return keyContent;
}

function encodeBase64(str) {
  return Buffer.from(str).toString('base64');
}

function displaySetupInstructions(encodedKey) {
  console.log('\n✅ Private key found! Follow these steps:\n');
  
  console.log('1️⃣  Go to: https://github.com/JoshiNaidu/career-forges/settings/secrets/actions\n');
  
  console.log('2️⃣  Click "New repository secret"\n');
  
  console.log('3️⃣  Create secret #1:');
  console.log('   Name: TAURI_PRIVATE_KEY');
  console.log('   Value: (see below)\n');
  
  console.log('📋 Copy this entire value:');
  console.log('─'.repeat(80));
  console.log(encodedKey);
  console.log('─'.repeat(80));
  
  console.log('\n4️⃣  If your key has a PASSWORD, create secret #2:');
  console.log('   Name: TAURI_PRIVATE_KEY_PASSWORD');
  console.log('   Value: (your key password - if you set one)\n');
  
  console.log('5️⃣  Test the workflow:');
  console.log('   - Bump version in app/src-tauri/tauri.conf.json');
  console.log('   - Create a GitHub release with tag vX.X.X');
  console.log('   - GitHub Actions will automatically generate latest.json ✨\n');
  
  console.log('📚 Full docs: docs/AUTO_UPDATE_SYSTEM.md\n');
}

async function main() {
  try {
    console.log('🔐 GitHub Secrets Setup Helper\n');
    
    const privateKey = checkPrivateKey();
    const encodedKey = encodeBase64(privateKey);
    
    displaySetupInstructions(encodedKey);
    
    // Optional: Save instructions to file
    const instructions = `
Private Key for GitHub Secret (Base64 encoded):
${encodedKey}

Or raw:
${privateKey}

Setup steps:
1. Go to: https://github.com/JoshiNaidu/career-forges/settings/secrets/actions
2. New repository secret
3. Name: TAURI_PRIVATE_KEY
4. Value: Paste the Base64 encoded value above
5. Add secret

If your key has a password:
- Create another secret: TAURI_PRIVATE_KEY_PASSWORD
- Value: Your password
`;
    
    fs.writeFileSync('GITHUB_SECRETS_SETUP.txt', instructions);
    console.log('💾 Setup instructions saved to: GITHUB_SECRETS_SETUP.txt\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
