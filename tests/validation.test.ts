import { describe, it, expect } from 'vitest';
import { validateCLIOptions, validatePaths, ValidationError } from '../src/validation';
import fs from 'fs/promises';
import path from 'path';

const TEST_DATA_DIR = './tests/fixtures';

describe('validation', () => {
  describe('validateCLIOptions', () => {
    it('should validate valid CLI options', () => {
      const options = {
        space: 'testspace123',
        output: 'output.zod.ts',
        folder: '.storyblok',
        verbose: false,
        debug: false,
        extendsArray: true
      };

      const result = validateCLIOptions(options);
      
      expect(result.space).toBe('testspace123');
      expect(result.output).toBe('output.zod.ts');
      expect(result.folder).toBe('.storyblok');
      expect(result.verbose).toBe(false);
      expect(result.debug).toBe(false);
      expect(result.extendsArray).toBe(true);
    });

    it('should throw ValidationError for missing space', () => {
      const options = {
        output: 'output.zod.ts',
        folder: '.storyblok',
        verbose: false,
        debug: false,
        extendsArray: true
      };

      expect(() => validateCLIOptions(options))
        .toThrow(ValidationError);
    });

    it('should use default values for optional fields', () => {
      const options = {
        space: 'testspace123',
        folder: '.storyblok'  // Add required folder parameter
      };

      const result = validateCLIOptions(options);
      
      expect(result.space).toBe('testspace123');
      expect(result.output).toBeUndefined(); // Output is optional and can be undefined
      expect(result.folder).toBe('.storyblok');
      expect(result.verbose).toBe(false);
      expect(result.debug).toBe(false);
      expect(result.extendsArray).toBe(false); // Default is false when not provided
    });

    it('should handle verbose and debug flags', () => {
      const options = {
        space: 'testspace123',
        folder: '.storyblok',  // Add required folder parameter
        verbose: true,
        debug: true
      };

      const result = validateCLIOptions(options);
      
      expect(result.verbose).toBe(true);
      expect(result.debug).toBe(true);
    });

    it('should handle extendsArray flag', () => {
      const options = {
        space: 'testspace123',
        folder: '.storyblok',  // Add required folder parameter
        extendsArray: false
      };

      const result = validateCLIOptions(options);
      
      expect(result.extendsArray).toBe(false);
    });

    it('should validate space ID format', () => {
      const options = {
        space: '123456',
        folder: '.storyblok'  // Add required folder parameter
      };

      const result = validateCLIOptions(options);
      expect(result.space).toBe('123456');
    });

    it('should handle output file extension', () => {
      const options = {
        space: 'testspace123',
        folder: '.storyblok',  // Add required folder parameter
        output: 'schemas.ts'
      };

      const result = validateCLIOptions(options);
      expect(result.output).toBe('schemas.ts');
    });
  });

  describe('validatePaths', () => {
    it('should validate existing paths successfully', async () => {
      const options = {
        space: 'testspace123',
        output: 'test-output.ts',
        folder: TEST_DATA_DIR + '/.storyblok',
        verbose: false,
        debug: false,
        extendsArray: true
      };

      // Should not throw for valid paths
      await expect(validatePaths(options)).resolves.not.toThrow();
    });

    it('should throw ValidationError for non-existent folder', async () => {
      const options = {
        space: 'testspace123',
        output: 'test-output.ts',
        folder: '/non/existent/path',
        verbose: false,
        debug: false,
        extendsArray: true
      };

      await expect(validatePaths(options))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for non-existent components directory', async () => {
      // Create a temporary folder without components subdirectory
      const tempDir = path.join(TEST_DATA_DIR, 'temp-no-components');
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const options = {
          space: 'testspace123',
          output: 'test-output.ts',
          folder: tempDir,
          verbose: false,
          debug: false,
          extendsArray: true
        };

        await expect(validatePaths(options))
          .rejects.toThrow(ValidationError);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('should throw ValidationError for non-existent space directory', async () => {
      const options = {
        space: 'nonexistentspace999',
        output: 'test-output.ts',
        folder: TEST_DATA_DIR + '/.storyblok',
        verbose: false,
        debug: false,
        extendsArray: true
      };

      await expect(validatePaths(options))
        .rejects.toThrow(ValidationError);
    });

    it('should validate output directory creation', async () => {
      const options = {
        space: 'testspace123',
        output: 'nested/deep/output.ts',
        folder: TEST_DATA_DIR + '/.storyblok',
        verbose: false,
        debug: false,
        extendsArray: true
      };

      // Should handle nested output paths
      await expect(validatePaths(options)).resolves.not.toThrow();

      // Clean up created directories
      const outputDir = path.dirname(options.output);
      if (await fs.access(outputDir).then(() => true).catch(() => false)) {
        await fs.rm(outputDir, { recursive: true, force: true });
      }
    });
  });
});