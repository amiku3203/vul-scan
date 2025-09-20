const fs = require('fs-extra');
const path = require('path');
const semver = require('semver');

class PackageParser {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.packageJsonPath = path.join(projectPath, 'package.json');
    this.packageLockPath = path.join(projectPath, 'package-lock.json');
  }

  async parsePackageJson() {
    try {
      if (!await fs.pathExists(this.packageJsonPath)) {
        throw new Error('package.json not found in the specified directory');
      }

      const packageJson = await fs.readJson(this.packageJsonPath);
      
      return {
        name: packageJson.name || 'unknown',
        version: packageJson.version || '0.0.0',
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
        peerDependencies: packageJson.peerDependencies || {},
        optionalDependencies: packageJson.optionalDependencies || {}
      };
    } catch (error) {
      throw new Error(`Failed to parse package.json: ${error.message}`);
    }
  }

  async parsePackageLock() {
    try {
      if (!await fs.pathExists(this.packageLockPath)) {
        console.warn('package-lock.json not found, using package.json only');
        return null;
      }

      const packageLock = await fs.readJson(this.packageLockPath);
      
      return {
        name: packageLock.name,
        version: packageLock.version,
        lockfileVersion: packageLock.lockfileVersion,
        packages: packageLock.packages || {},
        dependencies: packageLock.dependencies || {}
      };
    } catch (error) {
      console.warn(`Failed to parse package-lock.json: ${error.message}`);
      return null;
    }
  }

  async getAllDependencies() {
    const packageJson = await this.parsePackageJson();
    const packageLock = await this.parsePackageLock();

    const allDeps = new Map();

    // Collect all dependencies from package.json
    const depTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
    
    depTypes.forEach(depType => {
      Object.entries(packageJson[depType] || {}).forEach(([name, version]) => {
        allDeps.set(name, {
          name,
          requestedVersion: version,
          installedVersion: version,
          type: depType,
          isDirect: true
        });
      });
    });

    // If package-lock exists, get actual installed versions
    if (packageLock) {
      if (packageLock.lockfileVersion >= 2) {
        // npm v7+ format
        Object.entries(packageLock.packages || {}).forEach(([packagePath, packageInfo]) => {
          if (packagePath === '') return; // Skip root package
          
          const name = packagePath.startsWith('node_modules/') 
            ? packagePath.replace('node_modules/', '') 
            : packagePath;
          
          const existing = allDeps.get(name);
          if (existing) {
            existing.installedVersion = packageInfo.version;
          } else {
            // This is a transitive dependency
            allDeps.set(name, {
              name,
              requestedVersion: packageInfo.version,
              installedVersion: packageInfo.version,
              type: 'transitive',
              isDirect: false
            });
          }
        });
      } else {
        // npm v6 format
        this.extractDependenciesFromLegacyLock(packageLock.dependencies, allDeps);
      }
    }

    return Array.from(allDeps.values());
  }

  extractDependenciesFromLegacyLock(dependencies, allDeps, prefix = '') {
    Object.entries(dependencies || {}).forEach(([name, depInfo]) => {
      const fullName = prefix ? `${prefix}/${name}` : name;
      
      const existing = allDeps.get(name);
      if (existing) {
        existing.installedVersion = depInfo.version;
      } else {
        allDeps.set(name, {
          name,
          requestedVersion: depInfo.version,
          installedVersion: depInfo.version,
          type: 'transitive',
          isDirect: false
        });
      }

      // Recursively process nested dependencies
      if (depInfo.dependencies) {
        this.extractDependenciesFromLegacyLock(depInfo.dependencies, allDeps, fullName);
      }
    });
  }

  isVersionVulnerable(installedVersion, vulnerableRange) {
    try {
      return semver.satisfies(installedVersion, vulnerableRange);
    } catch (error) {
      console.warn(`Error checking version ${installedVersion} against range ${vulnerableRange}`);
      return false;
    }
  }

  suggestVersionUpdate(currentVersion, safeVersion) {
    try {
      if (semver.gt(safeVersion, currentVersion)) {
        const currentMajor = semver.major(currentVersion);
        const safeMajor = semver.major(safeVersion);
        
        if (currentMajor === safeMajor) {
          return {
            type: 'minor',
            suggestion: `^${safeVersion}`,
            breaking: false
          };
        } else {
          return {
            type: 'major',
            suggestion: `^${safeVersion}`,
            breaking: true
          };
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = PackageParser;
