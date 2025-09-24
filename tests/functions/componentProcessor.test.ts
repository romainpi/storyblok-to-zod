import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  discoverComponentFiles, 
  buildDependencyGraph, 
  performTopologicalSort,
  convertComponents 
} from '../../src/functions/componentProcessor';
import { ValidationError } from '../../src/validation';
import fs from 'fs/promises';
import path from 'path';

const TEST_DATA_DIR = './tests/fixtures';
const TEST_OUTPUT_DIR = './tests/output';

describe('componentProcessor', () => {
  const testComponentsPath = path.join(TEST_DATA_DIR, '.storyblok/components/testspace123');
  
  beforeEach(async () => {
    // Ensure test output directory exists
    await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test output
    try {
      await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    } catch {
      // Ignore errors if directory doesn't exist
    }
  });

  describe('discoverComponentFiles', () => {
    it('should discover JSON component files successfully', async () => {
      const files = await discoverComponentFiles(testComponentsPath);
      
      expect(files).toHaveLength(4);
      expect(files).toContain('card.json');
      expect(files).toContain('button.json');
      expect(files).toContain('article-page.json');
      expect(files).toContain('text-block.json');
    });

    it('should throw ValidationError for non-existent directory', async () => {
      const nonExistentPath = '/non/existent/path';
      
      await expect(discoverComponentFiles(nonExistentPath))
        .rejects.toThrow(ValidationError);
    });

    it('should exclude ignored files', async () => {
      // Create temporary ignored files
      const tempGroupsFile = path.join(testComponentsPath, 'groups.json');
      const tempTagsFile = path.join(testComponentsPath, 'tags.json');
      
      try {
        await fs.writeFile(tempGroupsFile, '{}');
        await fs.writeFile(tempTagsFile, '{}');
        
        const files = await discoverComponentFiles(testComponentsPath);
        
        expect(files).not.toContain('groups.json');
        expect(files).not.toContain('tags.json');
      } finally {
        // Clean up temp files
        await fs.unlink(tempGroupsFile).catch(() => {});
        await fs.unlink(tempTagsFile).catch(() => {});
      }
    });
  });

  describe('performTopologicalSort', () => {
    it('should sort components with no dependencies', () => {
      const dependencies = new Map([
        ['button', []],
        ['card', []],
        ['text-block', []]
      ]);

      const sorted = performTopologicalSort(dependencies);
      
      expect(sorted).toHaveLength(3);
      expect(sorted).toContain('button');
      expect(sorted).toContain('card');
      expect(sorted).toContain('text-block');
    });

    it('should sort components with dependencies correctly', () => {
      const dependencies = new Map([
        ['article-page', ['card', 'button', 'text-block']],
        ['card', []],
        ['button', []],
        ['text-block', []]
      ]);

      const sorted = performTopologicalSort(dependencies);
      
      expect(sorted).toHaveLength(4);
      
      // Dependencies should come before dependents
      const articleIndex = sorted.indexOf('article-page');
      const cardIndex = sorted.indexOf('card');
      const buttonIndex = sorted.indexOf('button');
      const textBlockIndex = sorted.indexOf('text-block');
      
      expect(cardIndex).toBeLessThan(articleIndex);
      expect(buttonIndex).toBeLessThan(articleIndex);
      expect(textBlockIndex).toBeLessThan(articleIndex);
    });

    it('should detect cyclic dependencies', () => {
      const dependencies = new Map([
        ['component-a', ['component-b']],
        ['component-b', ['component-c']],
        ['component-c', ['component-a']]
      ]);

      expect(() => performTopologicalSort(dependencies))
        .toThrow(ValidationError);
    });

    it('should handle complex dependency chains', () => {
      const dependencies = new Map([
        ['page', ['section']],
        ['section', ['card', 'button']],
        ['card', ['button']],
        ['button', []]
      ]);

      const sorted = performTopologicalSort(dependencies);
      
      expect(sorted).toEqual(['button', 'card', 'section', 'page']);
    });
  });

  describe('buildDependencyGraph', () => {
    it('should build dependency graph from component files', async () => {
      const componentFiles = [
        'card.json',
        'button.json', 
        'article-page.json',
        'text-block.json'
      ];

      const sorted = await buildDependencyGraph(componentFiles, testComponentsPath);
      
      expect(sorted).toContain('card');
      expect(sorted).toContain('button');
      expect(sorted).toContain('article-page');
      expect(sorted).toContain('text-block');
      
      // article-page depends on others, so it should come last
      const articleIndex = sorted.indexOf('article-page');
      expect(articleIndex).toBeGreaterThan(-1);
      
      // Dependencies should come before article-page
      const cardIndex = sorted.indexOf('card');
      const buttonIndex = sorted.indexOf('button');
      const textBlockIndex = sorted.indexOf('text-block');
      
      if (cardIndex !== -1) expect(cardIndex).toBeLessThan(articleIndex);
      if (buttonIndex !== -1) expect(buttonIndex).toBeLessThan(articleIndex);
      if (textBlockIndex !== -1) expect(textBlockIndex).toBeLessThan(articleIndex);
    });

    it('should handle components with no blok fields', async () => {
      const componentFiles = ['button.json', 'text-block.json'];
      
      const sorted = await buildDependencyGraph(componentFiles, testComponentsPath);
      
      expect(sorted).toContain('button');
      expect(sorted).toContain('text-block');
    });

    it('should handle invalid JSON files gracefully', async () => {
      // Create a temporary invalid JSON file
      const invalidFile = path.join(testComponentsPath, 'invalid.json');
      await fs.writeFile(invalidFile, '{ invalid json }');
      
      try {
        const componentFiles = ['card.json', 'invalid.json'];
        
        // Should not throw, but should skip invalid file
        const sorted = await buildDependencyGraph(componentFiles, testComponentsPath);
        
        expect(sorted).toContain('card');
        expect(sorted).not.toContain('invalid');
      } finally {
        await fs.unlink(invalidFile).catch(() => {});
      }
    });
  });
});