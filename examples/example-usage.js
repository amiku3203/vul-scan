#!/usr/bin/env node

/**
 * Example usage of the Vulnerability Scanner CLI
 * This file demonstrates how to use the scanner programmatically
 */

const VulnerabilityScanner = require('../src/scanner');
const path = require('path');

async function exampleUsage() {
  console.log('🔍 Vulnerability Scanner CLI - Example Usage\n');

  try {
    // Example 1: Basic scan
    console.log('Example 1: Basic vulnerability scan');
    const scanner1 = new VulnerabilityScanner({
      path: process.cwd(),
      severity: 'moderate'
    });
    
    const results1 = await scanner1.scan();
    await scanner1.displayResults(results1);

    console.log('\n' + '='.repeat(50) + '\n');

    // Example 2: Scan with alternatives
    console.log('Example 2: Scan with alternative suggestions');
    const scanner2 = new VulnerabilityScanner({
      path: process.cwd(),
      alternatives: true,
      severity: 'high'
    });
    
    const results2 = await scanner2.scan();
    await scanner2.displayResults(results2);

    console.log('\n' + '='.repeat(50) + '\n');

    // Example 3: Find alternatives for a specific package
    console.log('Example 3: Find alternatives for lodash');
    const scanner3 = new VulnerabilityScanner();
    const alternatives = await scanner3.findAlternatives('lodash');
    
    console.log('Alternatives for lodash:');
    alternatives.forEach((alt, index) => {
      console.log(`${index + 1}. ${alt.name} - ${alt.description}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  exampleUsage();
}

module.exports = { exampleUsage };
