const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class EnvManager {
  constructor() {
    this.envFile = path.join(os.homedir(), '.api-key-manager', '.env');
    this.blockStart = '# >>> api-key-manager >>>';
    this.blockEnd = '# <<< api-key-manager <<<'
  }

  async applyEnv(envMap) {
    const previousKeys = this.getPreviousKeys();
    const commands = this.generateEnvCommands(previousKeys, envMap);
    await this.execute(commands);
    await this.updateShellConfig(envMap);
    await this.saveToEnvFile(envMap);
    return { success: true };
  }

  getPreviousKeys() {
    try {
      if (!fs.existsSync(this.envFile)) return [];
      const content = fs.readFileSync(this.envFile, 'utf8');
      const keys = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split('=')[0])
        .filter(Boolean);
      return Array.from(new Set(keys));
    } catch {
      return [];
    }
  }

  generateEnvCommands(previousKeys, nextEnvMap) {
    const unsets = (previousKeys || [])
      .filter((k) => k && !(k in nextEnvMap))
      .map((k) => `unset ${k}`)
      .join(' && ');

    const exports = Object.entries(nextEnvMap)
      .map(([k, v]) => `export ${k}="${String(v).replace(/"/g, '\\"')}"`)
      .join(' && ');

    const cmds = [];
    if (unsets) cmds.push(unsets);
    if (exports) cmds.push(exports);
    return cmds;
  }

  async execute(commands) {
    if (!commands.length) return;
    return new Promise((resolve, reject) => {
      exec(commands.join(' && '), (error, stdout) => error ? reject(error) : resolve(stdout));
    });
  }

  async saveToEnvFile(envMap) {
    const content = Object.entries(envMap).map(([k, v]) => `${k}=${v}`).join('\n');
    fs.writeFileSync(this.envFile, content);
  }

  getShellConfigFile() {
    const shell = process.env.SHELL || '/bin/zsh';
    if (shell.includes('zsh')) return path.join(os.homedir(), '.zshrc');
    if (shell.includes('bash')) return path.join(os.homedir(), '.bashrc');
    return path.join(os.homedir(), '.profile');
  }

  async updateShellConfig(envMap) {
    const shellConfig = this.getShellConfigFile();
    const exportsText = Object.entries(envMap)
      .map(([k, v]) => `export ${k}="${String(v).replace(/\"/g, '"').replace(/"/g, '\\"')}"`)
      .join('\n');

    const block = [
      this.blockStart,
      '# Managed by API Key Manager. Do not edit between these markers.',
      exportsText,
      this.blockEnd,
      ''
    ].join('\n');

    let original = '';
    try {
      if (fs.existsSync(shellConfig)) {
        original = fs.readFileSync(shellConfig, 'utf8');
      }
    } catch (error) {
      console.error('Error reading shell config file:', error);
      throw new Error(`Failed to read shell config file: ${error.message}`);
    }

    // More robust regex pattern that handles various line endings and whitespace
    const startEsc = this.blockStart.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const endEsc = this.blockEnd.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Match the entire block with any characters (including newlines) in between
    const blockRegexGlobal = new RegExp(`\n?${startEsc}[^]*?${endEsc}\n?`, 'g');

    // Remove any existing blocks
    let next = original.replace(blockRegexGlobal, '').trim();
    
    // Add new block with proper spacing
    if (next) {
      next = `${next}\n\n${block}`;
    } else {
      next = block;
    }

    try {
      // Ensure the file ends with a single newline
      fs.writeFileSync(shellConfig, `${next}\n`, { encoding: 'utf8' });
    } catch (error) {
      console.error('Error writing to shell config file:', error);
      throw new Error(`Failed to update shell config file: ${error.message}`);
    }
  }
}

module.exports = EnvManager; 