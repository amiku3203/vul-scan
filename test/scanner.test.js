const VulnerabilityScanner = require('../src/scanner');
const PackageParser = require('../src/parsers/packageParser');
const VulnerabilityDatabase = require('../src/vulnerabilityDb');
const fs = require('fs-extra');
const path = require('path');

// Mock dependencies
jest.mock('fs-extra');
jest.mock('../src/parsers/packageParser');
jest.mock('../src/vulnerabilityDb');

describe('VulnerabilityScanner', () => {
  let scanner;
  let mockParser;
  let mockVulnDb;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create scanner instance
    scanner = new VulnerabilityScanner({
      path: '/test/project',
      severity: 'low'
    });

    // Setup mocks
    mockParser = new PackageParser();
    mockVulnDb = new VulnerabilityDatabase();
    
    scanner.parser = mockParser;
    scanner.vulnDb = mockVulnDb;
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultScanner = new VulnerabilityScanner();
      expect(defaultScanner.options.path).toBe(process.cwd());
      expect(defaultScanner.options.severity).toBe('low');
      expect(defaultScanner.options.output).toBe('table');
    });

    it('should initialize with custom options', () => {
      const customScanner = new VulnerabilityScanner({
        path: '/custom/path',
        severity: 'high',
        output: 'json',
        fix: true
      });
      
      expect(customScanner.options.path).toBe('/custom/path');
      expect(customScanner.options.severity).toBe('high');
      expect(customScanner.options.output).toBe('json');
      expect(customScanner.options.fix).toBe(true);
    });
  });

  describe('scan', () => {
    it('should successfully scan and return results', async () => {
      // Mock dependencies data
      const mockDependencies = [
        {
          name: 'lodash',
          installedVersion: '4.17.20',
          isDirect: true,
          type: 'dependencies'
        },
        {
          name: 'minimist',
          installedVersion: '1.2.5',
          isDirect: false,
          type: 'transitive'
        }
      ];

      // Mock vulnerabilities data
      const mockVulnerabilities = [
        {
          id: 'GHSA-jf85-cpcp-j695',
          module_name: 'lodash',
          severity: 'high',
          title: 'Prototype Pollution in lodash',
          vulnerable_versions: '<4.17.21',
          patched_versions: '>=4.17.21',
          overview: 'Lodash is vulnerable to prototype pollution',
          recommendation: 'Upgrade to version 4.17.21 or later',
          references: ['https://github.com/advisories/GHSA-jf85-cpcp-j695'],
          source: 'npm'
        }
      ];

      // Setup mocks
      mockParser.getAllDependencies.mockResolvedValue(mockDependencies);
      mockVulnDb.getVulnerabilities.mockResolvedValue(mockVulnerabilities);
      mockParser.isVersionVulnerable.mockReturnValue(true);

      const results = await scanner.scan();

      expect(results).toHaveProperty('summary');
      expect(results).toHaveProperty('vulnerabilities');
      expect(results).toHaveProperty('dependencies');
      expect(results.vulnerabilities).toHaveLength(1);
      expect(results.summary.vulnerable).toBe(1);
      expect(results.summary.high).toBe(1);
    });

    it('should handle scan errors gracefully', async () => {
      mockParser.getAllDependencies.mockRejectedValue(new Error('Parse error'));

      await expect(scanner.scan()).rejects.toThrow('Parse error');
    });
  });

  describe('analyzeVulnerabilities', () => {
    it('should filter vulnerabilities by severity', async () => {
      const dependencies = [
        { name: 'test-pkg', installedVersion: '1.0.0', isDirect: true, type: 'dependencies' }
      ];

      const vulnerabilities = [
        {
          id: 'low-vuln',
          module_name: 'test-pkg',
          severity: 'low',
          title: 'Low severity issue',
          vulnerable_versions: '<=1.0.0',
          patched_versions: '>1.0.0'
        },
        {
          id: 'high-vuln',
          module_name: 'test-pkg',
          severity: 'high',
          title: 'High severity issue',
          vulnerable_versions: '<=1.0.0',
          patched_versions: '>1.0.0'
        }
      ];

      // Test with high severity filter
      scanner.options.severity = 'high';
      mockParser.isVersionVulnerable.mockReturnValue(true);

      const results = await scanner.analyzeVulnerabilities(dependencies, vulnerabilities);

      expect(results.vulnerabilities).toHaveLength(1);
      expect(results.vulnerabilities[0].severity).toBe('high');
    });

    it('should correctly identify vulnerable versions', async () => {
      const dependencies = [
        { name: 'test-pkg', installedVersion: '1.0.0', isDirect: true, type: 'dependencies' }
      ];

      const vulnerabilities = [
        {
          id: 'test-vuln',
          module_name: 'test-pkg',
          severity: 'moderate',
          vulnerable_versions: '<=1.0.0',
          patched_versions: '>1.0.0'
        }
      ];

      // Mock version check to return false (not vulnerable)
      mockParser.isVersionVulnerable.mockReturnValue(false);

      const results = await scanner.analyzeVulnerabilities(dependencies, vulnerabilities);

      expect(results.vulnerabilities).toHaveLength(0);
    });
  });

  describe('getSeverityColor', () => {
    it('should return correct colors for different severities', () => {
      const criticalColor = scanner.getSeverityColor('critical');
      const highColor = scanner.getSeverityColor('high');
      const moderateColor = scanner.getSeverityColor('moderate');
      const lowColor = scanner.getSeverityColor('low');
      const unknownColor = scanner.getSeverityColor('unknown');

      expect(typeof criticalColor).toBe('function');
      expect(typeof highColor).toBe('function');
      expect(typeof moderateColor).toBe('function');
      expect(typeof lowColor).toBe('function');
      expect(typeof unknownColor).toBe('function');
    });
  });

  describe('findAlternatives', () => {
    it('should find alternatives for a package', async () => {
      const mockAlternatives = [
        {
          name: 'ramda',
          description: 'A practical functional library',
          quality: 0.95,
          stars: 0.88
        }
      ];

      mockVulnDb.getPackageAlternatives.mockResolvedValue(mockAlternatives);

      const alternatives = await scanner.findAlternatives('lodash');

      expect(alternatives).toEqual(mockAlternatives);
      expect(mockVulnDb.getPackageAlternatives).toHaveBeenCalledWith('lodash');
    });

    it('should handle errors when finding alternatives', async () => {
      mockVulnDb.getPackageAlternatives.mockRejectedValue(new Error('API error'));

      await expect(scanner.findAlternatives('lodash')).rejects.toThrow('API error');
    });
  });
});

describe('Integration Tests', () => {
  const testProjectPath = path.join(__dirname, 'fixtures', 'test-project');

  beforeAll(async () => {
    // Create test project structure
    await fs.ensureDir(testProjectPath);
    
    // Create test package.json
    const testPackageJson = {
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        'lodash': '4.17.20'
      },
      devDependencies: {
        'minimist': '1.2.5'
      }
    };

    await fs.writeJson(path.join(testProjectPath, 'package.json'), testPackageJson, { spaces: 2 });
  });

  afterAll(async () => {
    // Cleanup test files
    await fs.remove(testProjectPath);
  });

  it('should scan a real project structure', async () => {
    const scanner = new VulnerabilityScanner({
      path: testProjectPath,
      severity: 'low'
    });

    // This test would require actual network calls, so we'll mock the vulnerability DB
    const mockVulnDb = {
      getVulnerabilities: jest.fn().mockResolvedValue([])
    };
    scanner.vulnDb = mockVulnDb;

    const results = await scanner.scan();

    expect(results).toHaveProperty('summary');
    expect(results).toHaveProperty('vulnerabilities');
    expect(results).toHaveProperty('dependencies');
    expect(results.dependencies.length).toBeGreaterThan(0);
  });
});
