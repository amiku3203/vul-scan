const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const semver = require('semver');
const { execSync } = require('child_process');

class AutoFixer {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.packageJsonPath = path.join(projectPath, 'package.json');
    this.packageLockPath = path.join(projectPath, 'package-lock.json');
  }

  async fixVulnerabilities(vulnerabilities) {
    console.log(chalk.blue.bold('\n🔧 Starting automatic fixes...\n'));

    const fixes = [];
    const packageJson = await fs.readJson(this.packageJsonPath);
    
    for (const vuln of vulnerabilities) {
      const fix = await this.analyzeFix(vuln, packageJson);
      if (fix) {
        fixes.push(fix);
      }
    }

    if (fixes.length === 0) {
      console.log(chalk.yellow('No automatic fixes available.'));
      return;
    }

    // Display proposed fixes
    console.log(chalk.white('Proposed fixes:'));
    fixes.forEach((fix, index) => {
      console.log(`${index + 1}. ${chalk.cyan(fix.package)}: ${chalk.gray(fix.currentVersion)} → ${chalk.green(fix.newVersion)}`);
      console.log(`   ${chalk.gray(fix.reason)}`);
    });

    // Apply fixes
    const spinner = ora('Applying fixes...').start();
    
    try {
      // Create backup
      await this.createBackup();
      
      // Apply package.json changes
      let modified = false;
      for (const fix of fixes) {
        if (await this.applyFix(fix, packageJson)) {
          modified = true;
        }
      }

      if (modified) {
        // Write updated package.json
        await fs.writeJson(this.packageJsonPath, packageJson, { spaces: 2 });
        
        // Update package-lock.json
        await this.updatePackageLock();
        
        spinner.succeed(`Applied ${fixes.length} fixes successfully!`);
        
        console.log(chalk.green.bold('\n✅ Fixes applied successfully!'));
        console.log(chalk.gray('Run the scan again to verify the fixes.'));
        console.log(chalk.gray('Backup created at: package.json.backup'));
      } else {
        spinner.warn('No fixes were applied');
      }
      
    } catch (error) {
      spinner.fail('Failed to apply fixes');
      console.error(chalk.red('Error applying fixes:'), error.message);
      
      // Restore backup if available
      await this.restoreBackup();
    }
  }

  async analyzeFix(vulnerability, packageJson) {
    const { package: pkgName, installedVersion, patchedVersions, severity } = vulnerability;
    
    // Find the package in dependencies
    const depTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
    let currentDep = null;
    let depType = null;

    for (const type of depTypes) {
      if (packageJson[type] && packageJson[type][pkgName]) {
        currentDep = packageJson[type][pkgName];
        depType = type;
        break;
      }
    }

    if (!currentDep) {
      return null; // Package not found in direct dependencies
    }

    // Parse patched versions
    const patchedVersion = this.findBestPatchedVersion(installedVersion, patchedVersions);
    if (!patchedVersion) {
      return null;
    }

    // Determine update strategy
    const updateStrategy = this.determineUpdateStrategy(installedVersion, patchedVersion, currentDep);
    
    return {
      package: pkgName,
      currentVersion: installedVersion,
      currentRange: currentDep,
      newVersion: patchedVersion,
      newRange: updateStrategy.newRange,
      depType,
      severity,
      reason: updateStrategy.reason,
      breaking: updateStrategy.breaking
    };
  }

  findBestPatchedVersion(currentVersion, patchedVersions) {
    if (!patchedVersions || patchedVersions === 'unknown') {
      return null;
    }

    try {
      // Parse patched versions (could be ranges like ">=1.2.3" or specific versions)
      const ranges = patchedVersions.split(',').map(v => v.trim());
      
      for (const range of ranges) {
        // Extract version from range
        const versionMatch = range.match(/(\d+\.\d+\.\d+)/);
        if (versionMatch) {
          const version = versionMatch[1];
          if (semver.gt(version, currentVersion)) {
            return version;
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  determineUpdateStrategy(currentVersion, patchedVersion, currentRange) {
    try {
      const currentMajor = semver.major(currentVersion);
      const patchedMajor = semver.major(patchedVersion);
      
      if (currentMajor === patchedMajor) {
        // Same major version - safe to update
        return {
          newRange: `^${patchedVersion}`,
          reason: `Update to patched version ${patchedVersion}`,
          breaking: false
        };
      } else {
        // Major version change - potentially breaking
        return {
          newRange: `^${patchedVersion}`,
          reason: `Major version update to ${patchedVersion} (may contain breaking changes)`,
          breaking: true
        };
      }
    } catch (error) {
      return {
        newRange: patchedVersion,
        reason: `Update to specific version ${patchedVersion}`,
        breaking: true
      };
    }
  }

  async applyFix(fix, packageJson) {
    try {
      if (packageJson[fix.depType] && packageJson[fix.depType][fix.package]) {
        packageJson[fix.depType][fix.package] = fix.newRange;
        console.log(chalk.green(`✓ Updated ${fix.package} in ${fix.depType}`));
        return true;
      }
      return false;
    } catch (error) {
      console.log(chalk.red(`✗ Failed to update ${fix.package}: ${error.message}`));
      return false;
    }
  }

  async updatePackageLock() {
    try {
      // Remove package-lock.json to force regeneration
      if (await fs.pathExists(this.packageLockPath)) {
        await fs.remove(this.packageLockPath);
      }

      // Remove node_modules to ensure clean install
      const nodeModulesPath = path.join(this.projectPath, 'node_modules');
      if (await fs.pathExists(nodeModulesPath)) {
        await fs.remove(nodeModulesPath);
      }

      // Run npm install to regenerate lock file
      console.log(chalk.gray('Regenerating package-lock.json...'));
      execSync('npm install', { 
        cwd: this.projectPath, 
        stdio: 'pipe'
      });
      
    } catch (error) {
      console.warn(chalk.yellow('Warning: Failed to regenerate package-lock.json'));
      console.warn(chalk.gray('You may need to run "npm install" manually'));
    }
  }

  async createBackup() {
    try {
      const backupPath = this.packageJsonPath + '.backup';
      await fs.copy(this.packageJsonPath, backupPath);
      
      if (await fs.pathExists(this.packageLockPath)) {
        await fs.copy(this.packageLockPath, this.packageLockPath + '.backup');
      }
    } catch (error) {
      console.warn('Failed to create backup:', error.message);
    }
  }

  async restoreBackup() {
    try {
      const backupPath = this.packageJsonPath + '.backup';
      if (await fs.pathExists(backupPath)) {
        await fs.copy(backupPath, this.packageJsonPath);
        console.log(chalk.yellow('Restored package.json from backup'));
      }

      const lockBackupPath = this.packageLockPath + '.backup';
      if (await fs.pathExists(lockBackupPath)) {
        await fs.copy(lockBackupPath, this.packageLockPath);
        console.log(chalk.yellow('Restored package-lock.json from backup'));
      }
    } catch (error) {
      console.error('Failed to restore backup:', error.message);
    }
  }

  async cleanupBackups() {
    try {
      const backupFiles = [
        this.packageJsonPath + '.backup',
        this.packageLockPath + '.backup'
      ];

      for (const backup of backupFiles) {
        if (await fs.pathExists(backup)) {
          await fs.remove(backup);
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup backups:', error.message);
    }
  }
}

module.exports = AutoFixer;
