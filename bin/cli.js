#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const VulnerabilityScanner = require('../src/scanner');
const { version } = require('../package.json');

const program = new Command();

program
  .name('vuln-scan')
  .description('Dependency vulnerability scanner for Node.js applications')
  .version(version);

program
  .command('scan')
  .description('Scan package.json and package-lock.json for vulnerabilities')
  .option('-p, --path <path>', 'Path to the project directory', process.cwd())
  .option('-f, --fix', 'Automatically fix vulnerabilities when possible')
  .option('-o, --output <format>', 'Output format (json, table, csv)', 'table')
  .option('--severity <level>', 'Minimum severity level (low, moderate, high, critical)', 'low')
  .option('--alternatives', 'Show alternative packages for vulnerable dependencies')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🔍 Starting vulnerability scan...\n'));
      
      const scanner = new VulnerabilityScanner(options);
      const results = await scanner.scan();
      
      await scanner.displayResults(results);
      
      if (options.fix && results.vulnerabilities.length > 0) {
        await scanner.autoFix(results);
      }
      
    } catch (error) {
      console.error(chalk.red.bold('❌ Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('check-alternatives <package>')
  .description('Find alternative packages for a specific dependency')
  .action(async (packageName) => {
    try {
      const scanner = new VulnerabilityScanner();
      const alternatives = await scanner.findAlternatives(packageName);
      
      console.log(chalk.blue.bold(`\n🔄 Alternatives for ${packageName}:\n`));
      alternatives.forEach(alt => {
        console.log(chalk.green(`• ${alt.name} - ${alt.description}`));
        console.log(chalk.gray(`  Downloads: ${alt.downloads} | Stars: ${alt.stars}`));
      });
      
    } catch (error) {
      console.error(chalk.red.bold('❌ Error:'), error.message);
      process.exit(1);
    }
  });

program.parse();
