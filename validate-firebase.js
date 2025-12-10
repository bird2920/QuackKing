#!/usr/bin/env node

/**
 * Firebase Configuration Validator
 * Run: node validate-firebase.js
 */

import { readFileSync, existsSync } from 'fs';

console.log('🔍 Validating Firebase Configuration...\n');

const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const envKeyMap = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
};

const checks = {
  apiKey: /^AIza[0-9A-Za-z-_]{35}$/,
  authDomain: /\.firebaseapp\.com$/,
  projectId: /^[a-z0-9-]+$/,
  messagingSenderId: /^\d+$/,
  appId: /^1:\d+:web:[0-9a-f]+$/,
};

const parseEnvFile = (path) => {
  const values = {};
  const content = readFileSync(path, 'utf-8');
  content.split(/\r?\n/).forEach((line) => {
    if (!line || /^\s*#/.test(line)) return;
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!match) return;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  });
  return values;
};

const loadEnvConfig = () => {
  // Prefer process.env (already loaded when running via Vite or with dotenv) then .env.local
  const values = { ...process.env };
  if (existsSync('.env.local')) {
    Object.assign(values, parseEnvFile('.env.local'));
  }

  const config = {};
  required.forEach((key) => {
    const envKey = envKeyMap[key];
    if (values[envKey]) config[key] = values[envKey];
  });

  return config;
};

const loadConfigFromIndex = () => {
  let html;
  try {
    html = readFileSync('./index.html', 'utf-8');
  } catch (err) {
    return null;
  }

  const configStart = html.indexOf('window.__firebase_config = JSON.stringify({');
  if (configStart === -1) return null;

  let start = configStart + 'window.__firebase_config = JSON.stringify('.length;
  let braceCount = 0;
  let inString = false;
  let escape = false;
  let end = -1;

  for (let i = start; i < html.length; i++) {
    const char = html[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          end = i + 1;
          break;
        }
      }
    }
  }

  if (end === -1) return null;
  const configStr = html.substring(start, end);
  const jsonStr = configStr
    .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
    .replace(/,(\s*[}\]])/g, '$1');

  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
};

const firebaseConfig = (() => {
  const envConfig = loadEnvConfig();
  const hasEnvConfig = required.every((key) => envConfig[key]);
  if (hasEnvConfig) {
    console.log('✅ Found Firebase config in environment variables (.env.local / process.env)\n');
    return envConfig;
  }

  const indexConfig = loadConfigFromIndex();
  if (indexConfig) {
    console.log('ℹ️  Falling back to config in index.html (window.__firebase_config)\n');
    return indexConfig;
  }
  return {};
})();

const missing = required.filter((key) => !firebaseConfig[key] || firebaseConfig[key].startsWith('YOUR_'));
if (missing.length > 0) {
  console.error('❌ Missing or placeholder values in Firebase config:\n');
  missing.forEach((key) => {
    const value = firebaseConfig[key] || '(not set)';
    console.error(`   ${key}: ${value}`);
  });
  console.error('\n📖 Add the values to .env.local (recommended) or set window.__firebase_config in index.html.');
  console.error('   Get your real config from: Project Settings > Your apps > Web app > Config\n');
  process.exit(1);
}

const warnings = [];
Object.entries(checks).forEach(([key, pattern]) => {
  if (firebaseConfig[key] && !pattern.test(firebaseConfig[key])) {
    warnings.push(`   ${key}: "${firebaseConfig[key]}" - unusual format`);
  }
});

if (warnings.length > 0) {
  console.log('⚠️  Some values look unusual (but might still work):\n');
  warnings.forEach((w) => console.log(w));
  console.log('\n   Double-check these in Firebase Console if you have issues.\n');
}

// Success!
console.log('✅ Firebase config looks good!\n');
console.log('📋 Configuration found:');
console.log(`   Project: ${firebaseConfig.projectId}`);
console.log(`   Auth Domain: ${firebaseConfig.authDomain}`);
console.log(`   API Key: ${firebaseConfig.apiKey.substring(0, 12)}...`);

console.log('\n✅ Next steps to complete setup:');
console.log('   1. Enable Firestore in Firebase Console (Build > Firestore Database)');
console.log('   2. Enable Anonymous Auth (Build > Authentication > Anonymous)');
console.log('   3. Deploy security rules from firestore.rules file');
console.log('   4. Run: npm run dev');
console.log('\n🎮 Then open http://localhost:5173 to play!\n');
