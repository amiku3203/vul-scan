#!/usr/bin/env node

/**
 * Demo script to showcase the Vulnerability Scanner CLI
 * This creates a sample vulnerable project and demonstrates the scanner
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

async function createDemoProject() {
  const demoPath = path.join(__dirname, 'demo-project');
  
  console.log(chalk.blue.bold('🚀 Creating demo project with vulnerable dependencies...\n'));

  // Create demo directory
  await fs.ensureDir(demoPath);

  // Create package.json with intentionally vulnerable packages
  const vulnerablePackageJson = {
    name: 'vulnerable-demo-app',
    version: '1.0.0',
    description: 'Demo project with vulnerable dependencies',
    main: 'index.js',
    dependencies: {
      'lodash': '4.17.20',        // Known vulnerability
      'minimist': '1.2.5',        // Known vulnerability
      'axios': '0.21.0',          // Known vulnerability
      'express': '4.17.0',        // Potentially vulnerable
      'moment': '2.29.1'          // Deprecated package
    },
    devDependencies: {
      'node-fetch': '2.6.6',      // Known vulnerability
      'yargs-parser': '20.2.3'    // Known vulnerability
    }
  };

  await fs.writeJson(path.join(demoPath, 'package.json'), vulnerablePackageJson, { spaces: 2 });

  // Create a simple index.js file
  const indexJs = `
const lodash = require('lodash');
const minimist = require('minimist');
const axios = require('axios');
const express = require('express');
const moment = require('moment');

console.log('Demo app with vulnerable dependencies');
console.log('Lodash version:', lodash.VERSION);
console.log('Current time:', moment().format());

const app = express();
const args = minimist(process.argv.slice(2));

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from vulnerable demo app!',
    timestamp: moment().toISOString(),
    args: args
  });
});

const port = args.port || 3000;
app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});
`;

  await fs.writeFile(path.join(demoPath, 'index.js'), indexJs);

  console.log(chalk.green('✅ Demo project created at:'), demoPath);
  console.log(chalk.gray('📦 Package.json contains several vulnerable dependencies\n'));

  return demoPath;
}

async function runDemo() {
  try {
    // Create demo project
    const demoPath = await createDemoProject();

    console.log(chalk.blue.bold('🔍 Running vulnerability scan on demo project...\n'));

    // Run the scanner on the demo project
    const scanCommand = `node ${path.join(__dirname, 'bin/cli.js')} scan --path "${demoPath}" --alternatives`;
    
    try {
      execSync(scanCommand, { 
        stdio: 'inherit',
        cwd: __dirname 
      });
    } catch (error) {
      console.log(chalk.yellow('\n⚠️  Scanner execution completed (some vulnerabilities expected in demo)'));
    }

    console.log(chalk.blue.bold('\n🔧 Demonstrating auto-fix feature...\n'));
    
    // Demonstrate auto-fix (with user confirmation disabled for demo)
    const fixCommand = `node ${path.join(__dirname, 'bin/cli.js')} scan --path "${demoPath}" --fix`;
    
    console.log(chalk.gray('Command that would be run:'), fixCommand);
    console.log(chalk.gray('(Auto-fix requires user confirmation in real usage)\n'));

    console.log(chalk.blue.bold('🔄 Demonstrating alternative package suggestions...\n'));
    
    // Demonstrate finding alternatives
    const altCommand = `node ${path.join(__dirname, 'bin/cli.js')} check-alternatives lodash`;
    
    try {
      execSync(altCommand, { 
        stdio: 'inherit',
        cwd: __dirname 
      });
    } catch (error) {
      console.log(chalk.yellow('Alternative search completed'));
    }

    console.log(chalk.green.bold('\n✅ Demo completed successfully!'));
    console.log(chalk.gray('\nDemo project files:'));
    console.log(chalk.gray(`  - ${path.join(demoPath, 'package.json')}`));
    console.log(chalk.gray(`  - ${path.join(demoPath, 'index.js')}`));
    
    console.log(chalk.blue('\n📚 Try these commands:'));
    console.log(chalk.gray(`  npm install                    # Install dependencies`));
    console.log(chalk.gray(`  vuln-scan scan                 # Basic scan`));
    console.log(chalk.gray(`  vuln-scan scan --fix           # Scan with auto-fix`));
    console.log(chalk.gray(`  vuln-scan scan --severity high # Filter by severity`));
    console.log(chalk.gray(`  vuln-scan scan --output json   # JSON output`));

  } catch (error) {
    console.error(chalk.red.bold('❌ Demo failed:'), error.message);
    process.exit(1);
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  runDemo();
}

module.exports = { createDemoProject, runDemo };
