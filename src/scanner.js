const chalk = require('chalk');
const ora = require('ora');
const { table } = require('table');
const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');

const PackageParser = require('./parsers/packageParser');
const VulnerabilityDatabase = require('./vulnerabilityDb');
const AutoFixer = require('./autoFixer');

class VulnerabilityScanner {
  constructor(options = {}) {
    this.options = {
      path: options.path || process.cwd(),
      fix: options.fix || false,
      output: options.output || 'table',
      severity: options.severity || 'low',
      alternatives: options.alternatives || false,
      ...options
    };
    
    this.severityLevels = {
      low: 0,
      moderate: 1,
      high: 2,
      critical: 3
    };
    
    this.parser = new PackageParser(this.options.path);
    this.vulnDb = new VulnerabilityDatabase();
    this.autoFixer = new AutoFixer(this.options.path);
  }

  async scan() {
    const spinner = ora('Analyzing dependencies...').start();
    
    try {
      // Parse package files
      spinner.text = 'Parsing package.json and package-lock.json...';
      const dependencies = await this.parser.getAllDependencies();
      
      spinner.text = 'Fetching vulnerability data...';
      const vulnerabilities = await this.vulnDb.getVulnerabilities(dependencies);
      
      spinner.text = 'Analyzing vulnerabilities...';
      const results = await this.analyzeVulnerabilities(dependencies, vulnerabilities);
      
      spinner.succeed(`Scan completed! Found ${results.vulnerabilities.length} vulnerabilities.`);
      
      return results;
      
    } catch (error) {
      spinner.fail('Scan failed');
      throw error;
    }
  }

  async analyzeVulnerabilities(dependencies, vulnerabilities) {
    const results = {
      summary: {
        total: dependencies.length,
        vulnerable: 0,
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0
      },
      vulnerabilities: [],
      dependencies,
      alternatives: new Map()
    };

    const depMap = new Map(dependencies.map(dep => [dep.name, dep]));
    
    for (const vuln of vulnerabilities) {
      const dependency = depMap.get(vuln.module_name);
      if (!dependency) continue;

      // Check if the installed version is vulnerable
      const isVulnerable = this.parser.isVersionVulnerable(
        dependency.installedVersion,
        vuln.vulnerable_versions
      );

      if (!isVulnerable) continue;

      // Filter by severity
      const vulnSeverityLevel = this.severityLevels[vuln.severity] || 0;
      const minSeverityLevel = this.severityLevels[this.options.severity] || 0;
      
      if (vulnSeverityLevel < minSeverityLevel) continue;

      const vulnerabilityInfo = {
        id: vuln.id,
        package: vuln.module_name,
        installedVersion: dependency.installedVersion,
        severity: vuln.severity,
        title: vuln.title,
        overview: vuln.overview,
        recommendation: vuln.recommendation,
        vulnerableVersions: vuln.vulnerable_versions,
        patchedVersions: vuln.patched_versions,
        references: vuln.references,
        isDirect: dependency.isDirect,
        dependencyType: dependency.type,
        source: vuln.source
      };

      results.vulnerabilities.push(vulnerabilityInfo);
      results.summary[vuln.severity]++;
    }

    results.summary.vulnerable = results.vulnerabilities.length;

    // Get alternatives for vulnerable packages if requested
    if (this.options.alternatives && results.vulnerabilities.length > 0) {
      const uniquePackages = [...new Set(results.vulnerabilities.map(v => v.package))];
      
      for (const packageName of uniquePackages.slice(0, 5)) { // Limit to 5 to avoid rate limits
        try {
          const alternatives = await this.vulnDb.getPackageAlternatives(packageName);
          if (alternatives.length > 0) {
            results.alternatives.set(packageName, alternatives);
          }
        } catch (error) {
          console.warn(`Failed to get alternatives for ${packageName}`);
        }
      }
    }

    return results;
  }

  async displayResults(results) {
    console.log('\n' + chalk.blue.bold('📊 Vulnerability Scan Results'));
    console.log('═'.repeat(50));

    // Display summary
    this.displaySummary(results.summary);

    if (results.vulnerabilities.length === 0) {
      console.log(chalk.green.bold('\n✅ No vulnerabilities found!'));
      return;
    }

    // Display vulnerabilities based on output format
    switch (this.options.output) {
      case 'json':
        console.log(JSON.stringify(results, null, 2));
        break;
      case 'csv':
        this.displayCSV(results.vulnerabilities);
        break;
      default:
        this.displayTable(results.vulnerabilities);
    }

    // Display alternatives if available
    if (results.alternatives.size > 0) {
      this.displayAlternatives(results.alternatives);
    }
  }

  displaySummary(summary) {
    console.log(chalk.white('\n📋 Summary:'));
    console.log(`Total dependencies: ${chalk.blue(summary.total)}`);
    console.log(`Vulnerable packages: ${chalk.red(summary.vulnerable)}`);
    
    if (summary.critical > 0) {
      console.log(`Critical: ${chalk.red.bold(summary.critical)}`);
    }
    if (summary.high > 0) {
      console.log(`High: ${chalk.red(summary.high)}`);
    }
    if (summary.moderate > 0) {
      console.log(`Moderate: ${chalk.yellow(summary.moderate)}`);
    }
    if (summary.low > 0) {
      console.log(`Low: ${chalk.gray(summary.low)}`);
    }
  }

  displayTable(vulnerabilities) {
    console.log(chalk.white('\n🚨 Vulnerabilities:'));
    
    const tableData = [
      ['Package', 'Version', 'Severity', 'Title', 'Type']
    ];

    vulnerabilities.forEach(vuln => {
      const severityColor = this.getSeverityColor(vuln.severity);
      tableData.push([
        vuln.package,
        vuln.installedVersion,
        severityColor(vuln.severity.toUpperCase()),
        vuln.title.substring(0, 40) + (vuln.title.length > 40 ? '...' : ''),
        vuln.isDirect ? 'Direct' : 'Transitive'
      ]);
    });

    console.log(table(tableData, {
      border: {
        topBody: '─',
        topJoin: '┬',
        topLeft: '┌',
        topRight: '┐',
        bottomBody: '─',
        bottomJoin: '┴',
        bottomLeft: '└',
        bottomRight: '┘',
        bodyLeft: '│',
        bodyRight: '│',
        bodyJoin: '│',
        joinBody: '─',
        joinLeft: '├',
        joinRight: '┤',
        joinJoin: '┼'
      }
    }));

    // Display detailed information for critical and high severity
    const criticalVulns = vulnerabilities.filter(v => ['critical', 'high'].includes(v.severity));
    if (criticalVulns.length > 0) {
      console.log(chalk.red.bold('\n🔥 Critical & High Severity Details:'));
      criticalVulns.forEach(vuln => {
        console.log(`\n${chalk.red.bold('●')} ${chalk.white.bold(vuln.package)} (${vuln.installedVersion})`);
        console.log(`  ${chalk.red('Severity:')} ${vuln.severity.toUpperCase()}`);
        console.log(`  ${chalk.white('Title:')} ${vuln.title}`);
        console.log(`  ${chalk.white('Recommendation:')} ${vuln.recommendation}`);
        if (vuln.references && vuln.references.length > 0) {
          console.log(`  ${chalk.blue('References:')} ${vuln.references.slice(0, 2).join(', ')}`);
        }
      });
    }
  }

  displayCSV(vulnerabilities) {
    console.log('\nPackage,Version,Severity,Title,Type,Recommendation');
    vulnerabilities.forEach(vuln => {
      console.log(`"${vuln.package}","${vuln.installedVersion}","${vuln.severity}","${vuln.title}","${vuln.isDirect ? 'Direct' : 'Transitive'}","${vuln.recommendation}"`);
    });
  }

  displayAlternatives(alternatives) {
    console.log(chalk.blue.bold('\n🔄 Alternative Packages:'));
    
    alternatives.forEach((alts, packageName) => {
      console.log(`\n${chalk.yellow.bold(packageName)} alternatives:`);
      alts.forEach((alt, index) => {
        console.log(`  ${index + 1}. ${chalk.green(alt.name)} - ${alt.description}`);
        console.log(`     Quality: ${chalk.blue(Math.round(alt.quality * 100))}% | Popularity: ${chalk.blue(Math.round(alt.stars * 100))}%`);
      });
    });
  }

  getSeverityColor(severity) {
    switch (severity) {
      case 'critical': return chalk.red.bold;
      case 'high': return chalk.red;
      case 'moderate': return chalk.yellow;
      case 'low': return chalk.gray;
      default: return chalk.white;
    }
  }

  async autoFix(results) {
    if (results.vulnerabilities.length === 0) {
      console.log(chalk.green('\n✅ No vulnerabilities to fix!'));
      return;
    }

    console.log(chalk.blue.bold('\n🔧 Auto-fix Analysis:'));
    
    const fixableVulns = results.vulnerabilities.filter(v => 
      v.isDirect && v.patchedVersions && v.patchedVersions !== 'unknown'
    );

    if (fixableVulns.length === 0) {
      console.log(chalk.yellow('No automatically fixable vulnerabilities found.'));
      console.log(chalk.gray('Most vulnerabilities are in transitive dependencies or require manual intervention.'));
      return;
    }

    console.log(`Found ${chalk.green(fixableVulns.length)} potentially fixable vulnerabilities.`);

    const { shouldFix } = await inquirer.prompt([{
      type: 'confirm',
      name: 'shouldFix',
      message: 'Do you want to proceed with automatic fixes?',
      default: true
    }]);

    if (shouldFix) {
      await this.autoFixer.fixVulnerabilities(fixableVulns);
    }
  }

  async findAlternatives(packageName) {
    const spinner = ora(`Finding alternatives for ${packageName}...`).start();
    
    try {
      const alternatives = await this.vulnDb.getPackageAlternatives(packageName);
      spinner.succeed(`Found ${alternatives.length} alternatives`);
      return alternatives;
    } catch (error) {
      spinner.fail('Failed to find alternatives');
      throw error;
    }
  }
}

module.exports = VulnerabilityScanner;
