
---
name: secops
description: >-
  Scan dependencies for vulnerabilities using OSV Scanner before installing any packages.
  Use when installing, updating, or auditing dependencies with pip, npm, cargo, go get,
  gem, composer, nuget, or maven.
---

## 🔒 CRITICAL SECURITY - OSV-Scanner Requirement

**MANDATORY SECOPS POLICY**: All dependency installations MUST be scanned with `osv-scanner` BEFORE installation. This is a non-negotiable security requirement.

### Security Workflow - ALWAYS Follow This Order

**BEFORE installing ANY dependencies:**

1. **Query the OSV API to check the package before installing:**

   ```bash
   curl -s -X POST "https://api.osv.dev/v1/query" \
     -H "Content-Type: application/json" \
     -d '{"package": {"name": "PACKAGE_NAME", "ecosystem": "ECOSYSTEM"}, "version": "VERSION"}'
   ```

   | Package Manager | Ecosystem |
   |---|---|
   | pip | `PyPI` |
   | npm/yarn/pnpm | `npm` |
   | cargo | `crates.io` |
   | go get | `Go` |
   | gem | `RubyGems` |
   | composer | `Packagist` |
   | nuget | `NuGet` |
   | maven | `Maven` |

   - Empty `{}` = no known vulnerabilities → proceed
   - Response contains `vulns` = **STOP**. Report to user, suggest safe version.

2. **Prepare the lockfile for scanning:**

   ```bash
   # If only pyproject.toml exists, generate requirements.txt first
   # (osv-scanner works best with concrete dependency lists)

   # Check if requirements.txt exists
   ls requirements.txt 2>/dev/null || echo "No requirements.txt found"

   # If no requirements.txt, generate from pyproject.toml
   uv pip compile pyproject.toml -o requirements.txt

   # OR use uv to generate lock file
   uv lock
   ```

3. **Scan the lockfile:**

   ```bash
   osv-scanner scan -r .

   # Or specific lockfile:
   osv-scanner scan -L requirements.txt
   osv-scanner scan -L package-lock.json
   osv-scanner scan -L Cargo.lock
   osv-scanner scan -L go.sum
   ```

   | Language | Lockfiles |
   |---|---|
   | Python | `requirements.txt`, `Pipfile.lock`, `poetry.lock`, `uv.lock` |
   | JavaScript | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` |
   | Rust | `Cargo.lock` |
   | Go | `go.mod`, `go.sum` |
   | Ruby | `Gemfile.lock` |
   | PHP | `composer.lock` |
   | .NET | `packages.lock.json` |

4. **Review the scan results:**

   - ❌ **If vulnerabilities are found:** STOP - Do NOT install. Report findings to the user and discuss mitigation options.
   - ✅ **If scan is clean:** Proceed with installation.

5. **Only after clean scan, install dependencies:**

   ```bash
   # Python with uv (this project's standard)
   uv sync
   uv pip install <package>

   # Node.js
   npm install
   ```

6. **After installation, scan the entire project:**

   ```bash
   # Scan all dependencies recursively
   osv-scanner scan -r .

   # Scan with specific config
   osv-scanner scan --config osv-scanner.toml .
   ```

### Generating Requirements Files

If a project only has `pyproject.toml` and you need to scan dependencies:

```bash
# Generate requirements.txt from pyproject.toml
uv pip compile pyproject.toml -o requirements.txt

# OR generate detailed lock file
uv lock

# Then scan the generated file
osv-scanner scan -L requirements.txt
# OR
osv-scanner scan -L uv.lock
```

**Why generate requirements.txt?**

- OSV-Scanner provides better results with concrete dependency lists
- requirements.txt includes resolved transitive dependencies
- Lock files (uv.lock) capture exact versions for reproducible scans

### Examples

#### ❌ WRONG - Installing without scanning:

```bash
# This is FORBIDDEN - no security scan!
uv pip install requests
```

#### ✅ CORRECT - Full security workflow:

```bash
# Step 1: Query OSV API
curl -s -X POST "https://api.osv.dev/v1/query" \
  -H "Content-Type: application/json" \
  -d '{"package": {"name": "requests", "ecosystem": "PyPI"}, "version": "2.28.0"}'

# Step 2: Ensure requirements.txt exists
if [ ! -f requirements.txt ]; then
  uv pip compile pyproject.toml -o requirements.txt
fi

# Step 3: Scan before installation
osv-scanner scan -L requirements.txt

# Step 4: If clean, proceed with installation
uv sync

# Step 5: Scan again after installation
osv-scanner scan -r .
```

#### ✅ CORRECT - Adding a new package:

```bash
# Step 1: Add to pyproject.toml manually or:
# uv add <package> (this also installs - use with caution)

# Step 2: Generate/update requirements.txt
uv pip compile pyproject.toml -o requirements.txt

# Step 3: Scan the updated dependencies
osv-scanner scan -L requirements.txt

# Step 4: If vulnerabilities found, STOP and report
# Step 5: If clean, proceed with sync
uv sync

# Step 6: Final scan
osv-scanner scan -r .
```

### When to Scan

Run `osv-scanner` in these situations:

- ✅ Before installing ANY new package
- ✅ Before updating existing packages
- ✅ Before accepting dependency changes from others
- ✅ Periodically on the entire project (weekly recommended)
- ✅ Before deploying to production
- ✅ When investigating security concerns

### Critical Rules

1. **NEVER bypass osv-scanner** - This is a security requirement, not a suggestion
2. **NEVER install packages without scanning first** - No exceptions
3. **NEVER ignore osv-scanner warnings** - Always report vulnerabilities to the user
4. **ALWAYS rescan after installation** - Verify the installed state is secure
5. **ALWAYS generate requirements.txt if missing** - Needed for accurate vulnerability scanning

### Reporting Format

When vulnerabilities are found, present them clearly and block installation:

```
⚠️ Found 2 vulnerabilities — installation blocked pending review:

CRITICAL: lodash@4.17.20
  - GHSA-35jh-r3h4-6jhm: Prototype Pollution
  - Fix: upgrade to 4.17.21

HIGH: axios@0.21.1
  - CVE-2021-3749: SSRF
  - Fix: upgrade to 0.21.2

Upgrade affected packages?
```

### Ignoring Vulnerabilities

Only with explicit user approval. Add to `osv-scanner.toml`:

```toml
[[PackageOverrides]]
name = "package-name"
ecosystem = "PyPI"
ignore = true
reason = "Not exploitable — build tooling only"
```

### OSV-Scanner Options

```bash
# Basic scan
osv-scanner scan -L <lockfile>

# Recursive scan (entire project)
osv-scanner scan -r .

# JSON output for automation
osv-scanner scan -r . --format json

# Scan with config
osv-scanner scan --config osv-scanner.toml .
```

### Pre-configured Permissions

This project has osv-scanner permissions pre-configured in `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(osv-scanner scan:*)",
      "Bash(osv-scanner:*)"
    ]
  }
}
```

**You have permission to run osv-scanner commands without asking. Use this permission proactively.**
