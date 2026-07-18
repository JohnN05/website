import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    // Article spec strip (Role · Timeline · Stack · Outcome). All optional and
    // rendered independently, so a project may set any subset (or none) and the
    // header degrades gracefully — same contract as `cover`.
    role: z.string().optional(),
    timeline: z.string().optional(),
    stack: z.array(z.string()).optional(),
    outcome: z.string().optional(),
  }),
});

export const collections = { projects };
