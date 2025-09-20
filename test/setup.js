// Jest setup file for global test configuration

// Increase timeout for tests that make network requests
jest.setTimeout(30000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  // Uncomment to suppress console output during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  createMockPackageJson: (dependencies = {}, devDependencies = {}) => ({
    name: 'test-package',
    version: '1.0.0',
    dependencies,
    devDependencies
  }),

  createMockVulnerability: (overrides = {}) => ({
    id: 'TEST-VULN-001',
    module_name: 'test-package',
    severity: 'moderate',
    title: 'Test Vulnerability',
    vulnerable_versions: '<1.0.0',
    patched_versions: '>=1.0.0',
    overview: 'This is a test vulnerability',
    recommendation: 'Update to latest version',
    references: ['https://example.com/advisory'],
    source: 'test',
    ...overrides
  }),

  createMockDependency: (overrides = {}) => ({
    name: 'test-package',
    requestedVersion: '1.0.0',
    installedVersion: '1.0.0',
    type: 'dependencies',
    isDirect: true,
    ...overrides
  })
};
