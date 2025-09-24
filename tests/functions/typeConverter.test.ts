import { describe, it, expect } from 'vitest';
import { convertSbToZodType } from '../../src/functions/typeConverter';
import type { Components } from '@storyblok/management-api-client';

describe('typeConverter', () => {
  describe('convertSbToZodType', () => {
    it('should convert text type to z.string()', () => {
      const field: Components.ComponentSchemaField = {
        type: 'text',
        pos: 0
      };
      
      const result = convertSbToZodType(field, 'TestComponent');
      expect(result).toBe('z.string()');
    });

    it('should convert textarea type to z.string()', () => {
      const field: Components.ComponentSchemaField = {
        type: 'textarea',
        pos: 0
      };
      
      const result = convertSbToZodType(field, 'TestComponent');
      expect(result).toBe('z.string()');
    });

    it('should convert markdown type to z.string()', () => {
      const field: Components.ComponentSchemaField = {
        type: 'markdown',
        pos: 0
      };
      
      const result = convertSbToZodType(field, 'TestComponent');
      expect(result).toBe('z.string()');
    });

    it('should convert number type to z.number()', () => {
      const field: Components.ComponentSchemaField = {
        type: 'number',
        pos: 0
      };
      
      const result = convertSbToZodType(field, 'TestComponent');
      expect(result).toBe('z.number()');
    });

    it('should convert boolean type to z.boolean()', () => {
      const field: Components.ComponentSchemaField = {
        type: 'boolean',
        pos: 0
      };
      
      const result = convertSbToZodType(field, 'TestComponent');
      expect(result).toBe('z.boolean()');
    });

    it('should convert datetime type to z.string().datetime()', () => {
      const field: Components.ComponentSchemaField = {
        type: 'datetime',
        pos: 0
      };
      
      const result = convertSbToZodType(field, 'TestComponent');
      expect(result).toBe('z.string().datetime()');
    });

    it('should convert option type to union of number and string', () => {
      const field: Components.ComponentSchemaField = {
        type: 'option',
        pos: 0,
        options: [
          { _uid: '1', name: 'Option 1', value: 'option1' },
          { _uid: '2', name: 'Option 2', value: 'option2' }
        ]
      };
      
      const result = convertSbToZodType(field, 'TestComponent');
      expect(result).toBe('z.union([z.number(), z.string()])');
    });

    it('should convert options type to array of union', () => {
      const field: Components.ComponentSchemaField = {
        type: 'options',
        pos: 0,
        options: [
          { _uid: '1', name: 'Option 1', value: 'option1' },
          { _uid: '2', name: 'Option 2', value: 'option2' }
        ]
      };
      
      const result = convertSbToZodType(field, 'TestComponent');
      expect(result).toBe('z.array(z.union([z.number(), z.string()]))');
    });

    it('should convert asset type to storyblokAssetSchema', () => {
      const field: Components.ComponentSchemaField = {
        type: 'asset',
        pos: 0
      };
      
      const result = convertSbToZodType(field, 'TestComponent');
      expect(result).toBe('storyblokAssetSchema');
    });

    it('should convert multilink type to storyblokMultilinkSchema', () => {
      const field: Components.ComponentSchemaField = {
        type: 'multilink',
        pos: 0
      };
      
      const result = convertSbToZodType(field, 'TestComponent');
      expect(result).toBe('storyblokMultilinkSchema');
    });

    it('should convert richtext type to storyblokRichtextSchema', () => {
      const field: Components.ComponentSchemaField = {
        type: 'richtext',
        pos: 0
      };
      
      const result = convertSbToZodType(field, 'TestComponent');
      expect(result).toBe('storyblokRichtextSchema');
    });

    it('should handle bloks type', () => {
      const field: Components.ComponentSchemaField = {
        type: 'bloks',
        pos: 0,
        component_whitelist: ['Button', 'Card']
      };
      
      const result = convertSbToZodType(field, 'TestComponent');
      // The exact result depends on the bloksHandler implementation
      expect(result).toContain('z.');
    });

    it('should handle unknown types with fallback', () => {
      const field: Components.ComponentSchemaField = {
        type: 'unknown-type' as any,
        pos: 0
      };
      
      const result = convertSbToZodType(field, 'TestComponent');
      expect(result).toBe('z.any() /* Unknown type: unknown-type */');
    });

    it('should handle fields without type property', () => {
      const field: Components.ComponentSchemaField = {
        pos: 0
      } as any; // Intentionally missing type
      
      const result = convertSbToZodType(field, 'TestComponent');
      expect(result).toBe('z.any()');
    });
  });
});