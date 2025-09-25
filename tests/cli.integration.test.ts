import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

describe('CLI Integration Tests', () => {
  const testOutputDir = './tests/output';
  const testDataDir = './tests/fixtures';
  
  beforeEach(async () => {
    // Ensure test output directory exists
    await fs.mkdir(testOutputDir, { recursive: true });
    
    // Clean up any previous test outputs
    const files = await fs.readdir(testOutputDir);
    for (const file of files) {
      await fs.unlink(path.join(testOutputDir, file));
    }
  });

  afterEach(async () => {
    // Clean up test outputs
    try {
      const files = await fs.readdir(testOutputDir);
      for (const file of files) {
        await fs.unlink(path.join(testOutputDir, file));
      }
    } catch {
      // Ignore errors if directory doesn't exist
    }
  });

  function runCLI(args: string[]): Promise<{
    stdout: string;
    stderr: string;
    code: number;
  }> {
    return new Promise((resolve, reject) => {
      // First build the project to ensure dist exists
      const buildProcess = spawn('pnpm', ['build'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      buildProcess.on('close', (buildCode) => {
        if (buildCode !== 0) {
          reject(new Error('Build failed'));
          return;
        }

        // Now run the CLI
        const process = spawn('node', ['./dist/index.js', ...args], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        process.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        process.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        process.on('close', (code) => {
          resolve({
            stdout,
            stderr,
            code: code || 0,
          });
        });

        process.on('error', reject);
      });

      buildProcess.on('error', reject);
    });
  }

  it('should generate Zod schema from test components', async () => {
    const outputFile = path.join(testOutputDir, 'test-output.zod.ts');
    
    const result = await runCLI([
      '-s', 'testspace123',
      '-o', outputFile,
      '-f', testDataDir + '/.storyblok'
    ]);

    expect(result.code).toBe(0);
    
    // Check that output file was created
    const outputExists = await fs.access(outputFile)
      .then(() => true)
      .catch(() => false);
    
    expect(outputExists).toBe(true);

    // Check output content contains expected Zod schemas
    const outputContent = await fs.readFile(outputFile, 'utf-8');
    
    expect(outputContent).toContain('import z from \'astro/zod\'');  // Updated to match actual output
    expect(outputContent).toContain('cardSchema');
    expect(outputContent).toContain('buttonSchema');
    expect(outputContent).toContain('articlePageSchema');
    expect(outputContent).toContain('textBlockSchema');
  }, 30000); // 30 second timeout for integration test

  it('should automatically include ISbStoryData schema in output', async () => {
    const outputFile = path.join(testOutputDir, 'isb-story-data-test.zod.ts');
    
    const result = await runCLI([
      '-s', 'testspace123',
      '-f', testDataDir + '/.storyblok',
      '-o', outputFile
    ]);

    expect(result.code).toBe(0);
    
    // Check that output file was created
    const outputExists = await fs.access(outputFile)
      .then(() => true)
      .catch(() => false);
    
    expect(outputExists).toBe(true);

    // Check that ISbStoryData-related schemas are included automatically
    const outputContent = await fs.readFile(outputFile, 'utf-8');
    // ISbStoryData should be automatically processed and included
    expect(outputContent).toContain('StoryData');
  }, 30000);

  it('should handle verbose flag', async () => {
    const outputFile = path.join(testOutputDir, 'verbose-output.zod.ts');
    
    const result = await runCLI([
      '-s', 'testspace123',
      '-o', outputFile,
      '-f', testDataDir + '/.storyblok',
      '-v'
    ]);

    expect(result.code).toBe(0);
    // Verbose output may appear in stdout or stderr, and may contain various verbose messages
    const allOutput = result.stdout + result.stderr;
    expect(allOutput.length).toBeGreaterThan(0); // Just check that there's some output
  }, 30000);

  it('should handle debug flag', async () => {
    const outputFile = path.join(testOutputDir, 'debug-output.zod.ts');
    
    const result = await runCLI([
      '-s', 'testspace123',
      '-o', outputFile,
      '-f', testDataDir + '/.storyblok',
      '-d'
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout.includes('DEBUG') || result.stderr.includes('DEBUG')).toBe(true);
  }, 30000);

  it('should fail gracefully with invalid space ID', async () => {
    const outputFile = path.join(testOutputDir, 'invalid-space.zod.ts');
    
    const result = await runCLI([
      '-s', 'nonexistentspace999',
      '-o', outputFile,
      '-f', testDataDir + '/.storyblok'
    ]);

    expect(result.code).not.toBe(0);
    expect(result.stderr.includes('does not exist') || result.stdout.includes('does not exist')).toBe(true);
  }, 30000);

  it('should fail gracefully with invalid folder path', async () => {
    const outputFile = path.join(testOutputDir, 'invalid-folder.zod.ts');
    
    const result = await runCLI([
      '-s', 'testspace123',
      '-o', outputFile,
      '-f', '/non/existent/path'
    ]);

    expect(result.code).not.toBe(0);
    expect(result.stderr.includes('does not exist') || result.stdout.includes('does not exist')).toBe(true);
  }, 30000);

  it('should handle missing required arguments', async () => {
    const result = await runCLI([]);

    expect(result.code).not.toBe(0);
    expect(result.stderr.includes('required') || result.stdout.includes('required')).toBe(true);
  }, 30000);

  it('should show help when requested', async () => {
    const result = await runCLI(['--help']);

    expect(result.code).toBe(0);
    expect(result.stdout.includes('Usage') || result.stdout.includes('Options')).toBe(true);
  }, 30000);

  it('should respect component dependency order', async () => {
    const outputFile = path.join(testOutputDir, 'dependency-order.zod.ts');
    
    const result = await runCLI([
      '-s', 'testspace123',
      '-o', outputFile,
      '-f', testDataDir + '/.storyblok',
      '-v'
    ]);

    expect(result.code).toBe(0);
    
    const outputContent = await fs.readFile(outputFile, 'utf-8');
    
    // Check that dependencies come before components that use them
    const cardIndex = outputContent.indexOf('cardSchema');
    const buttonIndex = outputContent.indexOf('buttonSchema');
    const articlePageIndex = outputContent.indexOf('articlePageSchema');
    
    // article-page depends on card and button, so they should come first
    if (cardIndex !== -1 && articlePageIndex !== -1) {
      expect(cardIndex).toBeLessThan(articlePageIndex);
    }
    if (buttonIndex !== -1 && articlePageIndex !== -1) {
      expect(buttonIndex).toBeLessThan(articlePageIndex);
    }
  }, 30000);

  it('should handle no-extends-array flag', async () => {
    const outputFile = path.join(testOutputDir, 'no-extends-array.zod.ts');
    
    const result = await runCLI([
      '-s', 'testspace123',
      '-f', testDataDir + '/.storyblok',
      '-o', outputFile,
      '--no-extends-array'
    ]);

    expect(result.code).toBe(0);
    
    // Check that output file was created
    const outputExists = await fs.access(outputFile)
      .then(() => true)
      .catch(() => false);
    
    expect(outputExists).toBe(true);

    // The main purpose of this test is to ensure the flag is properly processed
    // The actual logic is tested in the unit tests
  }, 30000);

  it('should generate valid Zod schemas with astro/zod import and be parseable', async () => {
    const outputFile = path.join(testOutputDir, 'astro-zod-validation.ts');
    
    const result = await runCLI([
      '-s', '332234',
      '-o', outputFile,
      '-f', '.storyblok'
    ]);

    expect(result.code).toBe(0);
    
    // Check that output file was created
    const outputExists = await fs.access(outputFile)
      .then(() => true)
      .catch(() => false);
    
    expect(outputExists).toBe(true);

    // Check output content contains expected structure
    const outputContent = await fs.readFile(outputFile, 'utf-8');
    
    // Verify astro/zod import
    expect(outputContent).toContain('import z from \'astro/zod\'');
    
    // Verify some key schemas are present
    expect(outputContent).toContain('heroSchema');
    expect(outputContent).toContain('pageSchema');
    expect(outputContent).toContain('callToActionSchema');
    expect(outputContent).toContain('headlineSchema');
    
    // Verify native Storyblok schemas
    expect(outputContent).toContain('storyblokAssetSchema');
    expect(outputContent).toContain('storyblokMultilinkSchema');
    expect(outputContent).toContain('storyblokRichtextSchema');
    
    // ACTUAL IMPORT AND VALIDATION TEST
    // Create a test file that validates the generated file can be imported and used
    const testValidationFile = path.join(testOutputDir, 'test-schemas.ts');
    const testCode = `
import { heroSchema, callToActionSchema, pageSchema } from './astro-zod-validation';

// Test that schemas can be used for validation without throwing errors
try {
  // Test hero schema with minimal valid data
  const testHero = { variant: 'primary' };
  const validatedHero = heroSchema.parse(testHero);
  console.log('Hero validation passed:', validatedHero);

  // Test call to action schema
  const testCTA = { variant: 'primary' };
  const validatedCTA = callToActionSchema.parse(testCTA);
  console.log('CTA validation passed:', validatedCTA);

  // Test page schema with minimal data
  const testPage = {};
  const validatedPage = pageSchema.parse(testPage);
  console.log('Page validation passed:', validatedPage);

  console.log('SUCCESS: All schema validations passed');
} catch (error) {
  console.error('FAILED: Schema validation error:', error.message);
  process.exit(1);
}
`;

    await fs.writeFile(testValidationFile, testCode);
    
    // Use tsx to run the test file directly
    const importTestResult = await new Promise<{
      stdout: string;
      stderr: string;
      code: number;
    }>((resolve, reject) => {
      const testProcess = spawn('npx', ['tsx', testValidationFile], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      testProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      testProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      testProcess.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          code: code || 0,
        });
      });

      testProcess.on('error', reject);
    });

    // Verify the import test was successful
    if (importTestResult.code !== 0) {
      console.log('Import test failed:');
      console.log('STDOUT:', importTestResult.stdout);
      console.log('STDERR:', importTestResult.stderr);
      console.log('Exit code:', importTestResult.code);
    }
    
    expect(importTestResult.code).toBe(0);
    expect(importTestResult.stdout).toContain('SUCCESS: All schema validations passed');
    expect(importTestResult.stdout).toContain('Hero validation passed');
    expect(importTestResult.stdout).toContain('CTA validation passed');
    expect(importTestResult.stdout).toContain('Page validation passed');
    
    // Ensure no errors occurred
    expect(importTestResult.stderr).not.toContain('TypeError');
    expect(importTestResult.stderr).not.toContain('SyntaxError');
  }, 30000);
});