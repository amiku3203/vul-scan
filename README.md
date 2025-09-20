# Vulnerability Scanner CLI

A comprehensive dependency vulnerability scanner for Node.js applications that detects vulnerable packages, suggests safer alternatives, and provides automatic fixes.

## 🚀 Features

- **Comprehensive Scanning**: Analyzes both `package.json` and `package-lock.json` files
- **Multiple Data Sources**: Uses npm audit API and OSV (Open Source Vulnerabilities) database
- **Vulnerability Detection**: Identifies security issues in direct and transitive dependencies
- **Alternative Suggestions**: Recommends safer package alternatives
- **Auto-Fix Capability**: Automatically updates vulnerable packages when possible
- **Multiple Output Formats**: Supports table, JSON, and CSV output
- **Severity Filtering**: Filter results by severity level (low, moderate, high, critical)
- **Backup & Restore**: Creates backups before making changes

## 📦 Installation

### Global Installation
```bash
npm install -g vuln-scanner-cli
```

### Local Installation
```bash
npm install vuln-scanner-cli
```

### From Source
```bash
git clone <repository-url>
cd vuln-scanner-cli
npm install
npm link  # For global usage
```

## 🔧 Usage

### Basic Scan
```bash
vuln-scan scan
```

### Scan with Auto-fix
```bash
vuln-scan scan --fix
```

### Scan Specific Directory
```bash
vuln-scan scan --path /path/to/your/project
```

### Filter by Severity
```bash
vuln-scan scan --severity high
```

### Show Alternative Packages
```bash
vuln-scan scan --alternatives
```

### Different Output Formats
```bash
vuln-scan scan --output json
vuln-scan scan --output csv
vuln-scan scan --output table  # default
```

### Find Alternatives for Specific Package
```bash
vuln-scan check-alternatives lodash
```

## 📋 Command Options

### `scan` Command

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --path <path>` | Path to the project directory | Current directory |
| `-f, --fix` | Automatically fix vulnerabilities when possible | false |
| `-o, --output <format>` | Output format (json, table, csv) | table |
| `--severity <level>` | Minimum severity level (low, moderate, high, critical) | low |
| `--alternatives` | Show alternative packages for vulnerable dependencies | false |

### `check-alternatives` Command

Find alternative packages for a specific dependency:
```bash
vuln-scan check-alternatives <package-name>
```

## 📊 Output Examples

### Table Output (Default)
```
📊 Vulnerability Scan Results
══════════════════════════════════════════════════════

📋 Summary:
Total dependencies: 245
Vulnerable packages: 3
High: 1
Moderate: 2

🚨 Vulnerabilities:
┌─────────────┬─────────┬──────────┬──────────────────────┬────────────┐
│ Package     │ Version │ Severity │ Title                │ Type       │
├─────────────┼─────────┼──────────┼──────────────────────┼────────────┤
│ lodash      │ 4.17.20 │ HIGH     │ Prototype Pollution  │ Direct     │
│ minimist    │ 1.2.5   │ MODERATE │ Prototype Pollution  │ Transitive │
└─────────────┴─────────┴──────────┴──────────────────────┴────────────┘
```

### JSON Output
```json
{
  "summary": {
    "total": 245,
    "vulnerable": 3,
    "critical": 0,
    "high": 1,
    "moderate": 2,
    "low": 0
  },
  "vulnerabilities": [
    {
      "id": "GHSA-jf85-cpcp-j695",
      "package": "lodash",
      "installedVersion": "4.17.20",
      "severity": "high",
      "title": "Prototype Pollution in lodash",
      "recommendation": "Upgrade to version 4.17.21 or later"
    }
  ]
}
```

## 🔧 Auto-Fix Feature

The auto-fix feature can automatically update vulnerable packages in your `package.json`:

1. **Analyzes** vulnerable packages that are direct dependencies
2. **Identifies** safe version updates based on patched versions
3. **Creates backups** of your package files before making changes
4. **Updates** package.json with safer versions
5. **Regenerates** package-lock.json with new dependencies

### Auto-Fix Process
```bash
vuln-scan scan --fix
```

The tool will:
- Show you proposed fixes before applying them
- Ask for confirmation before making changes
- Create backups (`package.json.backup`, `package-lock.json.backup`)
- Update your package files
- Reinstall dependencies

## 🔄 Alternative Package Suggestions

When using the `--alternatives` flag, the scanner will suggest alternative packages for vulnerable dependencies:

```bash
vuln-scan scan --alternatives
```

Example output:
```
🔄 Alternative Packages:

lodash alternatives:
  1. ramda - A practical functional library for JavaScript programmers
     Quality: 95% | Popularity: 88%
  2. underscore - JavaScript's functional programming helper library
     Quality: 92% | Popularity: 85%
```

## 🗂️ Project Structure

```
vuln-scanner-cli/
├── bin/
│   └── cli.js              # CLI entry point
├── src/
│   ├── scanner.js          # Main scanner class
│   ├── vulnerabilityDb.js  # Vulnerability database interface
│   ├── autoFixer.js        # Auto-fix functionality
│   └── parsers/
│       └── packageParser.js # Package file parser
├── cache/                  # Vulnerability data cache
├── package.json
└── README.md
```

## 🔍 How It Works

1. **Package Analysis**: Parses `package.json` and `package-lock.json` to extract all dependencies
2. **Vulnerability Lookup**: Queries npm audit API and OSV database for known vulnerabilities
3. **Version Matching**: Checks if installed versions match vulnerable version ranges
4. **Severity Assessment**: Categorizes vulnerabilities by severity level
5. **Alternative Research**: Searches for similar packages with better security records
6. **Auto-Fix Generation**: Analyzes safe update paths for vulnerable packages

## 🛡️ Data Sources

- **npm audit API**: Official npm vulnerability database
- **OSV Database**: Open Source Vulnerabilities database
- **npm Registry**: Package metadata and alternative suggestions

## ⚙️ Configuration

The scanner uses sensible defaults but can be configured through command-line options. Future versions may support configuration files.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Known Issues

- Rate limiting may occur when scanning projects with many dependencies
- Some transitive dependencies may not have automatic fixes available
- Alternative suggestions are limited to npm registry packages

## 🔮 Future Enhancements

- [ ] Support for Yarn and pnpm lock files
- [ ] Integration with GitHub Security Advisories
- [ ] Custom vulnerability database support
- [ ] CI/CD integration templates
- [ ] Web dashboard for scan results
- [ ] Scheduled scanning capabilities

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/vuln-scanner-cli/issues) page
2. Create a new issue with detailed information
3. Include your Node.js version and operating system

## 🙏 Acknowledgments

- npm audit team for the vulnerability API
- OSV project for the open vulnerability database
- All the open-source contributors who make security tools possible
#   v u l - s c a n  
 