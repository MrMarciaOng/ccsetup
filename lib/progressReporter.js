class ProgressReporter {
  constructor() {
    this.startTime = Date.now();
    this.filesScanned = 0;
    this.totalFiles = 0;
    this.currentPhase = '';
    this.isVerbose = false;
  }

  start(message = 'Scanning repository...') {
    console.log(`🔍 ${message}`);
    this.startTime = Date.now();
  }

  updateProgress(current, total, phase) {
    this.filesScanned = current;
    this.totalFiles = total;
    this.currentPhase = phase;
    
    if (this.isVerbose) {
      const percentage = Math.round((current / total) * 100);
      const progressBar = this.createProgressBar(percentage);
      console.log(`   ${phase} ${progressBar} ${percentage}% | ${current}/${total} files`);
    }
  }

  createProgressBar(percentage) {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  phase(phaseName, details = '') {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    this.currentPhase = phaseName;
    
    if (details) {
      console.log(`├── ${phaseName}... ${details} (${elapsed}s)`);
    } else {
      console.log(`├── ${phaseName}...`);
    }
  }

  phaseComplete(phaseName, result = '') {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    if (result) {
      console.log(`├── ${phaseName}... ✓ (${result})`);
    } else {
      console.log(`├── ${phaseName}... ✓`);
    }
  }

  success(message) {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`└── ${message} ✓ (completed in ${duration}s)`);
  }

  fail(message) {
    console.log(`└── ❌ ${message}`);
  }

  warn(message) {
    console.log(`⚠️  ${message}`);
  }

  info(message) {
    console.log(`ℹ️  ${message}`);
  }

  setVerbose(verbose = true) {
    this.isVerbose = verbose;
  }

  getElapsedTime() {
    return ((Date.now() - this.startTime) / 1000).toFixed(1);
  }

  getScanStats() {
    return {
      filesScanned: this.filesScanned,
      totalFiles: this.totalFiles,
      elapsedTime: this.getElapsedTime(),
      currentPhase: this.currentPhase
    };
  }
}

module.exports = ProgressReporter;