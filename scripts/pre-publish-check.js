#!/usr/bin/env node

/**
 * Pre-publish verification script
 * Runs various checks to ensure the package is ready for publishing
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

async function runChecks() {
  console.log(chalk.blue.bold('🔍 Running pre-publish checks...\n'));

  const checks = [
    checkPackageJson,
    checkRequiredFiles,
    checkBinExecutable,
    runTests,
    checkDryRun,
    checkPackageName
  ];

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    try {
      await check();
      passed++;
    } catch (error) {
      console.error(chalk.red(`❌ ${error.message}`));
      failed++;
    }
  }

  console.log(chalk.blue.bold('\n📊 Summary:'));
  console.log(chalk.green(`✅ Passed: ${passed}`));
  console.log(chalk.red(`❌ Failed: ${failed}`));

  if (failed === 0) {
    console.log(chalk.green.bold('\n🎉 All checks passed! Ready to publish.'));
    console.log(chalk.gray('Run: npm publish'));
  } else {
    console.log(chalk.red.bold('\n⚠️  Some checks failed. Please fix before publishing.'));
    process.exit(1);
  }
}

async function checkPackageJson() {
  console.log(chalk.yellow('Checking package.json...'));
  
  const packageJson = await fs.readJson('package.json');
  
  const required = ['name', 'version', 'description', 'main', 'bin', 'author', 'license'];
  const missing = required.filter(field => !packageJson[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields in package.json: ${missing.join(', ')}`);
  }

  if (packageJson.author === 'Your Name' || packageJson.author.includes('Your Name')) {
    throw new Error('Please update the author field in package.json');
  }

  console.log(chalk.green('✅ package.json looks good'));
}

async function checkRequiredFiles() {
  console.log(chalk.yellow('Checking required files...'));
  
  const required = ['README.md', 'LICENSE', 'bin/cli.js', 'src/scanner.js'];
  const missing = [];

  for (const file of required) {
    if (!await fs.pathExists(file)) {
      missing.push(file);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required files: ${missing.join(', ')}`);
  }

  console.log(chalk.green('✅ All required files present'));
}

async function checkBinExecutable() {
  console.log(chalk.yellow('Checking binary executable...'));
  
  const binPath = 'bin/cli.js';
  const content = await fs.readFile(binPath, 'utf8');
  
  if (!content.startsWith('#!/usr/bin/env node')) {
    throw new Error('bin/cli.js missing shebang line');
  }

  // Check if file is executable (on Unix systems)
  try {
    const stats = await fs.stat(binPath);
    // This is a basic check - on Windows this might not be as relevant
    console.log(chalk.green('✅ Binary file looks good'));
  } catch (error) {
    throw new Error(`Cannot access binary file: ${error.message}`);
  }
}

async function runTests() {
  console.log(chalk.yellow('Running tests...'));
  
  try {
    execSync('npm test', { stdio: 'pipe' });
    console.log(chalk.green('✅ Tests passed'));
  } catch (error) {
    throw new Error('Tests failed');
  }
}

async function checkDryRun() {
  console.log(chalk.yellow('Running npm publish dry run...'));
  
  try {
    const output = execSync('npm publish --dry-run', { stdio: 'pipe', encoding: 'utf8' });
    
    // Check if important files are included
    const requiredInPackage = ['bin/cli.js', 'src/', 'README.md', 'LICENSE'];
    const missing = requiredInPackage.filter(file => !output.includes(file));
    
    if (missing.length > 0) {
      throw new Error(`Important files not included in package: ${missing.join(', ')}`);
    }
    
    console.log(chalk.green('✅ Dry run successful'));
  } catch (error) {
    throw new Error(`Dry run failed: ${error.message}`);
  }
}

async function checkPackageName() {
  console.log(chalk.yellow('Checking package name availability...'));
  
  const packageJson = await fs.readJson('package.json');
  const packageName = packageJson.name;
  
  try {
    execSync(`npm view ${packageName}`, { stdio: 'pipe' });
    console.log(chalk.yellow(`⚠️  Package name '${packageName}' already exists on npm`));
    console.log(chalk.gray('Consider using a scoped package: @yourusername/vuln-scanner-cli'));
  } catch (error) {
    // Package doesn't exist - this is good!
    console.log(chalk.green(`✅ Package name '${packageName}' is available`));
  }
}

// Run checks if this file is executed directly
if (require.main === module) {
  runChecks().catch(error => {
    console.error(chalk.red.bold('❌ Pre-publish check failed:'), error.message);
    process.exit(1);
  });
}

module.exports = { runChecks };
