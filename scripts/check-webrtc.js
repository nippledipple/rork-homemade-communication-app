const fs = require('fs');
const path = require('path');

const keywords = [
  'RTCPeerConnection', 
  'iceServers', 
  'react-native-webrtc', 
  'stun:', 
  'turn:',
  'dataChannel',
  'createDataChannel',
  'signalingState',
  'iceConnectionState',
  'iceCandidate'
];

const projectRoot = path.resolve(process.cwd());

function searchInDir(dir) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.lstatSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, .git, and other common directories
        if (!['node_modules', '.git', '.expo', 'dist', 'build'].includes(item)) {
          searchInDir(fullPath);
        }
      } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        for (const keyword of keywords) {
          if (content.includes(keyword)) {
            console.error(`🚨 FATAL: WebRTC-Symbol '${keyword}' found in file ${fullPath}! Build aborted.`);
            console.error(`This violates the WSS-only architecture. WebRTC has been completely removed.`);
            process.exit(1);
          }
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not scan directory ${dir}: ${error.message}`);
  }
}

console.log('🔍 Build-Gate: Checking for forbidden WebRTC symbols...');
searchInDir(path.join(projectRoot, 'app'));
searchInDir(path.join(projectRoot, 'providers'));
searchInDir(path.join(projectRoot, 'utils'));
console.log('✅ Build-Gate: No WebRTC symbols found. WSS-only architecture verified.');