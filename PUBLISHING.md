# Publishing Guide for Vulnerability Scanner CLI

This guide will walk you through publishing your vulnerability scanner CLI to npm.

## 📋 Pre-Publishing Checklist

### 1. **Update Package Information**
Before publishing, update these fields in `package.json`:

```json
{
  "author": "Your Name <your.email@example.com>",
  "homepage": "https://github.com/yourusername/vuln-scanner-cli#readme",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yourusername/vuln-scanner-cli.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/vuln-scanner-cli/issues"
  }
}
```

### 2. **Check Package Name Availability**
```bash
npm view vuln-scanner-cli
```
If the package exists, you'll need to choose a different name like:
- `@yourusername/vuln-scanner-cli`
- `vulnerability-scanner-cli`
- `node-vuln-scanner`
- `dep-security-scanner`

## 🚀 Publishing Steps

### Step 1: Set Up npm Account
1. **Create npm account** (if you don't have one):
   - Go to [npmjs.com](https://www.npmjs.com/)
   - Click "Sign Up"
   - Verify your email

2. **Login to npm CLI**:
   ```bash
   npm login
   ```
   Enter your npm username, password, and email.

### Step 2: Prepare Your Package

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run tests**:
   ```bash
   npm test
   ```

3. **Test the CLI locally**:
   ```bash
   npm link
   vuln-scan --version
   vuln-scan scan --help
   ```

4. **Run the demo**:
   ```bash
   npm run demo
   ```

### Step 3: Version Management

For future updates, use semantic versioning:
```bash
# Patch version (bug fixes): 1.0.0 -> 1.0.1
npm version patch

# Minor version (new features): 1.0.0 -> 1.1.0
npm version minor

# Major version (breaking changes): 1.0.0 -> 2.0.0
npm version major
```

### Step 4: Publish to npm

1. **Dry run** (see what would be published):
   ```bash
   npm publish --dry-run
   ```

2. **Publish**:
   ```bash
   npm publish
   ```

   For scoped packages:
   ```bash
   npm publish --access public
   ```

### Step 5: Verify Publication

1. **Check on npm**:
   ```bash
   npm view vuln-scanner-cli
   ```

2. **Test installation**:
   ```bash
   # In a different directory
   npm install -g vuln-scanner-cli
   vuln-scan --version
   ```

## 🔄 Alternative Publishing Options

### Option 1: Scoped Package
If the name is taken, use a scoped package:

```json
{
  "name": "@yourusername/vuln-scanner-cli"
}
```

Then publish with:
```bash
npm publish --access public
```

### Option 2: Different Package Name
Choose an available name:
- `vulnerability-dep-scanner`
- `node-security-scanner`
- `npm-vuln-checker`

### Option 3: GitHub Packages
Publish to GitHub Packages instead:

1. Create `.npmrc` file:
   ```
   @yourusername:registry=https://npm.pkg.github.com
   ```

2. Update package.json:
   ```json
   {
     "name": "@yourusername/vuln-scanner-cli",
     "publishConfig": {
       "registry": "https://npm.pkg.github.com"
     }
   }
   ```

3. Authenticate with GitHub:
   ```bash
   npm login --scope=@yourusername --registry=https://npm.pkg.github.com
   ```

4. Publish:
   ```bash
   npm publish
   ```

## 📊 Post-Publishing

### Update README Badges
Add npm badges to your README:

```markdown
[![npm version](https://badge.fury.io/js/vuln-scanner-cli.svg)](https://badge.fury.io/js/vuln-scanner-cli)
[![npm downloads](https://img.shields.io/npm/dm/vuln-scanner-cli.svg)](https://www.npmjs.com/package/vuln-scanner-cli)
```

### Set Up CI/CD (Optional)
Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 🛠️ Troubleshooting

### Common Issues:

1. **Package name already exists**:
   - Choose a different name or use scoped package

2. **Authentication failed**:
   ```bash
   npm logout
   npm login
   ```

3. **Permission denied**:
   - Make sure you're the owner or have publish rights
   - Use `npm owner add <username> <package-name>`

4. **Version already exists**:
   ```bash
   npm version patch
   npm publish
   ```

5. **Files not included**:
   - Check the `files` field in package.json
   - Use `npm publish --dry-run` to see what gets included

## 📈 Marketing Your Package

1. **GitHub**: Create a repository and push your code
2. **Documentation**: Ensure README is comprehensive
3. **Examples**: Provide clear usage examples
4. **Community**: Share on relevant forums/communities
5. **Blog**: Write about your tool

## 🔐 Security Best Practices

1. **Enable 2FA** on your npm account
2. **Use npm tokens** for CI/CD instead of passwords
3. **Regularly update dependencies**
4. **Monitor for vulnerabilities** in your own package

---

**Ready to publish?** Follow the steps above and your vulnerability scanner will be available to the Node.js community! 🎉
