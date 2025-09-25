/**
 * Shared schema constants to eliminate duplication of hardcoded type definitions
 * These basic schemas appear across multiple files and should be centralized
 */

/**
 * Standard Storyblok schemas that are commonly referenced
 */
export const STORYBLOK_SCHEMA_DEFINITIONS = {
  iSbAlternateObject: `const iSbAlternateObjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  published: z.boolean(),
  full_slug: z.string(),
  is_folder: z.boolean(),
  parent_id: z.number()
});`,

  iSbLinkURLObject: `const iSbLinkURLObjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  full_slug: z.string(),
  url: z.string(),
  uuid: z.string()
});`,

  localizedPath: `const localizedPathSchema = z.object({
  path: z.string(),
  name: z.string().nullable(),
  lang: z.string(),
  published: z.boolean()
});`,

  previewToken: `const previewTokenSchema = z.string();`,

  iSbMultipleStoriesData: `const iSbMultipleStoriesDataSchema = z.any();`,

  // Standard Storyblok types that are commonly used
  storyblokAsset: `const storyblokAssetSchema = z.object({
  alt: z.string().nullable(),
  copyright: z.string().nullable(),
  fieldtype: z.literal("asset"),
  id: z.number(),
  filename: z.string().nullable(),
  name: z.string(),
  title: z.string().nullable(),
  focus: z.string().nullable(),
  meta_data: z.record(z.any()),
  source: z.string().nullable(),
  is_external_url: z.boolean(),
  is_private: z.boolean(),
  src: z.string(),
  updated_at: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  aspect_ratio: z.number().nullable(),
  public_id: z.string().nullable(),
  content_type: z.string()
});`,

  storyblokMultilink: `const storyblokMultilinkSchema = z.object({
  fieldtype: z.literal("multilink"),
  id: z.string(),
  url: z.string(),
  cached_url: z.string(),
  target: z.union([z.literal("_blank"), z.literal("_self")]).optional(),
  anchor: z.string().optional(),
  rel: z.string().optional(),
  title: z.string().optional(),
  prep: z.string().optional(),
  linktype: z.union([z.literal("story"), z.literal("url"), z.literal("email"), z.literal("asset")]),
  story: z.object({
    name: z.string(),
    created_at: z.string(),
    published_at: z.string(),
    id: z.number(),
    uuid: z.string(),
    content: z.record(z.any()),
    slug: z.string(),
    full_slug: z.string(),
    sort_by_date: z.string().optional(),
    position: z.number().optional(),
    tag_list: z.array(z.string()).optional(),
    is_startpage: z.boolean().optional(),
    parent_id: z.number().optional().nullable(),
    meta_data: z.record(z.any()).optional().nullable(),
    group_id: z.string().optional(),
    first_published_at: z.string().optional(),
    release_id: z.number().optional().nullable(),
    lang: z.string().optional(),
    path: z.string().optional().nullable(),
    alternates: z.array(z.any()).optional(),
    default_full_slug: z.string().optional().nullable(),
    translated_slugs: z.array(z.any()).optional().nullable()
  }).optional(),
  email: z.string().optional()
});`,

  storyblokRichtext: `const storyblokRichtextSchema: z.ZodSchema<StoryblokRichtext> = z.lazy(() => z.object({
  type: z.string(),
  content: z.array(storyblokRichtextSchema).optional(),
  marks: z.array(storyblokRichtextSchema).optional(),
  attrs: z.record(z.any()).optional(),
  text: z.string().optional()
}));`
} as const;

/**
 * Gets all the standard schema definitions as a formatted string
 * 
 * @returns All schema definitions formatted for output
 */
export function getAllStandardSchemaDefinitions(): string {
  return Object.values(STORYBLOK_SCHEMA_DEFINITIONS).join('\n\n');
}

/**
 * Gets specific schema definitions by name
 * 
 * @param schemaNames - Array of schema names to include
 * @returns Formatted schema definitions
 */
export function getSchemaDefinitions(schemaNames: (keyof typeof STORYBLOK_SCHEMA_DEFINITIONS)[]): string {
  return schemaNames
    .map(name => STORYBLOK_SCHEMA_DEFINITIONS[name])
    .join('\n\n');
}

/**
 * Schema names that are considered "core" and should always be included
 */
export const CORE_SCHEMA_NAMES: (keyof typeof STORYBLOK_SCHEMA_DEFINITIONS)[] = [
  'iSbAlternateObject',
  'iSbLinkURLObject', 
  'localizedPath',
  'previewToken',
  'iSbMultipleStoriesData'
];

/**
 * Gets the core schema definitions needed for ISbStoryData
 * 
 * @returns Core schema definitions
 */
export function getCoreSchemaDefinitions(): string {
  return getSchemaDefinitions(CORE_SCHEMA_NAMES);
}