/**
 * Shared templates and utilities for ISbStoryData schema generation
 * This eliminates duplication of the hardcoded ISbStoryData schema structure
 */

/**
 * Generates the ISbStoryData schema template with a given content schema
 * This replaces the duplicated 60+ line template found in convertComponentJsonToZod.ts and test output
 * 
 * @param contentSchemaName - The name of the content schema to use (e.g., "callToActionSchema")
 * @returns The formatted ISbStoryData schema template
 */
export function generateISbStoryDataTemplate(contentSchemaName: string): string {
  return `z.lazy(() => z.object({
  alternates: z.array(iSbAlternateObjectSchema),
  breadcrumbs: z.array(iSbLinkURLObjectSchema).optional(),
  content: ${contentSchemaName},
  created_at: z.string(),
  deleted_at: z.string().optional(),
  default_full_slug: z.string().optional().nullable(),
  default_root: z.string().optional(),
  disable_fe_editor: z.boolean().optional(),
  favourite_for_user_ids: z.array(z.number()).optional().nullable(),
  first_published_at: z.string().optional().nullable(),
  full_slug: z.string(),
  group_id: z.string(),
  id: z.number(),
  imported_at: z.string().optional(),
  is_folder: z.boolean().optional(),
  is_startpage: z.boolean().optional(),
  lang: z.string(),
  last_author: z.object({
    id: z.number(),
    userid: z.string()
  }).optional(),
  last_author_id: z.number().optional(),
  localized_paths: z.array(localizedPathSchema).optional().nullable(),
  meta_data: z.any(),
  name: z.string(),
  parent: iSbStoryDataSchema.optional(),
  parent_id: z.number().nullable(),
  path: z.string().optional(),
  pinned: z.union([z.literal("1"), z.boolean()]).optional(),
  position: z.number(),
  preview_token: previewTokenSchema.optional(),
  published: z.boolean().optional(),
  published_at: z.string().nullable(),
  release_id: z.number().optional().nullable(),
  scheduled_date: z.string().optional().nullable(),
  slug: z.string(),
  sort_by_date: z.string().nullable(),
  tag_list: z.array(z.string()),
  translated_slugs: z.array(z.object({
    path: z.string(),
    name: z.string().nullable(),
    lang: z.string(),
    published: z.boolean()
  })).optional().nullable(),
  unpublished_changes: z.boolean().optional(),
  updated_at: z.string().optional(),
  uuid: z.string()
}))`;
}

/**
 * Creates a complete ISbStoryData variant schema for a component
 * 
 * @param componentName - The component name in kebab-case (e.g., "call-to-action")
 * @param componentSchemaName - The camelCase schema name (e.g., "callToActionSchema")  
 * @returns The complete schema declaration
 */
export function createComponentStorySchema(componentName: string, componentSchemaName: string): string {
  const kebabToCamelCase = (str: string): string => {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  };
  
  const isbVariantName = kebabToCamelCase(componentName) + "StorySchema";
  const template = generateISbStoryDataTemplate(componentSchemaName);
  
  return `export const ${isbVariantName}: z.ZodSchema<ISbStoryData & { content: z.infer<typeof ${componentSchemaName}> }> = ${template};\n`;
}