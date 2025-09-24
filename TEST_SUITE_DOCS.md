# Test Suite Documentation

This document provides comprehensive information about the test suite for the storyblok-to-zod project.

## Quick Start

Run all tests:
```bash
pnpm test:run
```

Run tests in watch mode during development:
```bash
pnpm test:watch
```

Run tests with coverage report:
```bash
pnpm test:coverage
```

Open interactive test UI:
```bash
pnpm test:ui
```

## Test Structure

```
tests/
├── setup.ts                          # Test configuration and utilities
├── fixtures/                         # Mock data and test files
│   └── .storyblok/
│       ├── components/testspace123/   # Sample component definitions
│       │   ├── card.json
│       │   ├── button.json
│       │   ├── article-page.json
│       │   └── text-block.json
│       └── types/storyblok.d.ts      # Mock Storyblok type definitions
├── functions/                         # Unit tests for core functions
│   ├── componentProcessor.test.ts
│   └── typeConverter.test.ts
├── validation.test.ts                 # Input validation tests
└── cli.integration.test.ts           # End-to-end CLI workflow tests
```

## Test Categories

### Unit Tests

#### Component Processor Tests (`tests/functions/componentProcessor.test.ts`)
- **File Discovery**: Tests component file discovery and filtering
- **Dependency Graph**: Tests building and sorting component dependencies
- **Topological Sort**: Tests correct ordering of components based on dependencies
- **Error Handling**: Tests graceful handling of invalid JSON files

#### Type Converter Tests (`tests/functions/typeConverter.test.ts`)
- **Field Type Conversion**: Tests all Storyblok field types to Zod schema conversion
- **Edge Cases**: Tests handling of unknown types and missing properties
- **Bloks Handling**: Tests nested component field processing

#### Validation Tests (`tests/validation.test.ts`)
- **CLI Options**: Tests command-line argument validation
- **Path Validation**: Tests file system path checking and validation
- **Default Values**: Tests proper handling of optional parameters

### Integration Tests

#### CLI Integration Tests (`tests/cli.integration.test.ts`)
- **Full Workflow**: End-to-end testing with real CLI invocation
- **Output Generation**: Verifies correct Zod schema file generation
- **Error Scenarios**: Tests handling of invalid inputs and edge cases
- **Flag Handling**: Tests all CLI flags (verbose, debug, help, etc.)

## Test Data

The test suite uses carefully crafted mock data that mirrors real Storyblok components:

### Mock Components

1. **Card Component** (`card.json`)
   - Fields: title (text), description (textarea), image (asset), variant (option), show_button (boolean)
   - Use case: Testing basic field types and options

2. **Button Component** (`button.json`)
   - Fields: label (text), url (multilink), style (option), size (option)
   - Use case: Testing multilink fields and multiple options

3. **Text Block Component** (`text-block.json`)
   - Fields: content (richtext), alignment (option), background_color (text)
   - Use case: Testing richtext field handling

4. **Article Page Component** (`article-page.json`)
   - Fields: SEO fields, content_blocks (bloks), featured_image (asset), etc.
   - Use case: Testing component composition and bloks fields
   - Dependencies: Uses card, button, and text-block components

### Test Arguments

The test suite uses these default arguments for CLI testing:
- Space ID: `testspace123`
- Output file: Various test-specific files in `tests/output/`
- Folder: `tests/fixtures/.storyblok`

## Running Specific Tests

Run specific test files:
```bash
pnpm test:run validation.test.ts
pnpm test:run functions/componentProcessor.test.ts
pnpm test:run cli.integration.test.ts
```

Run tests matching a pattern:
```bash
pnpm test:run --grep "validation"
pnpm test:run --grep "should convert.*type"
```

## Test Configuration

The test suite is configured via `vitest.config.ts`:
- **Environment**: Node.js
- **Coverage Provider**: V8
- **Setup Files**: `tests/setup.ts`
- **Include Pattern**: `**/*.{test,spec}.{js,ts}`

## Debugging Tests

### Enable Debug Output
```bash
DEBUG=1 pnpm test:run
```

### Run with Verbose Output
```bash
pnpm test:run --reporter=verbose
```

### Debug Integration Tests
Integration tests include timeout settings (30s) for CLI execution. If tests are failing due to timeouts, check:
1. Build process is working (`pnpm build`)
2. CLI tool is executable
3. Test fixtures are properly structured

## Writing New Tests

### Adding Unit Tests
1. Create test file in appropriate directory (`tests/functions/`)
2. Import the function/module to test
3. Use describe/it structure with clear test names
4. Include both happy path and error cases

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../src/myModule';

describe('myFunction', () => {
  it('should handle valid input', () => {
    const result = myFunction('valid input');
    expect(result).toBe('expected output');
  });

  it('should throw error for invalid input', () => {
    expect(() => myFunction(null)).toThrow('Invalid input');
  });
});
```

### Adding Integration Tests
1. Add test to `tests/cli.integration.test.ts`
2. Use the `runCLI` helper function
3. Set appropriate timeout (30s for CLI tests)
4. Test both success and failure scenarios

### Test Fixtures
When adding new test data:
1. Place component JSON files in `tests/fixtures/.storyblok/components/testspace123/`
2. Follow the existing naming convention
3. Include realistic field definitions
4. Update dependencies if components reference each other

## Continuous Integration

The test suite is designed to run in CI environments:
- No external dependencies required
- All test data is self-contained
- Deterministic test execution
- Comprehensive error reporting

## Performance

Current test metrics:
- **Total Tests**: 45
- **Average Runtime**: ~17 seconds
- **Pass Rate**: 100%
- **Coverage**: Available via `pnpm test:coverage`

The integration tests take the most time due to CLI process spawning, but provide valuable end-to-end validation.

## Troubleshooting

### Common Issues

1. **Build Failures**: Ensure `pnpm build` works before running integration tests
2. **File Permissions**: Check that test output directory is writable
3. **Path Issues**: Use absolute paths in test configurations
4. **Timeout Issues**: Integration tests have 30s timeout; adjust if needed

### Getting Help

If tests fail unexpectedly:
1. Check the error output carefully
2. Run individual test files to isolate issues
3. Use `--reporter=verbose` for detailed output
4. Verify test fixtures are correctly structured

## Example Usage

Test your changes during development:
```bash
# Watch mode for immediate feedback
pnpm test:watch

# Full test run before commit
pnpm test:run

# Check coverage
pnpm test:coverage

# Test your tool with the mock data
pnpm build
node dist/index.js -s testspace123 -o output.zod.ts -f tests/fixtures/.storyblok
```

This ensures your storyblok-to-zod tool works correctly with various component configurations and edge cases.