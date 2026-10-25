const { execFileSync } = require('node:child_process');
const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'x64' ? 'x64' : null;
if (!arch) throw new Error(`Unsupported macOS architecture: ${process.arch}`);
console.log(`Packaging unsigned PII Shield DMG for ${arch}`);
execFileSync(require.resolve('electron-builder/cli.js'), ['--mac', 'dmg', `--${arch}`], { stdio: 'inherit' });
