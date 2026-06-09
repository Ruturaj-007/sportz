import { z } from 'zod';

export const MATCH_STATUS = {
    SCHEDULED: 'scheduled', 
    LIVE: 'live', 
    FINISHED: 'finished'
};

// * QUERY PARAMETER VALIDATION 
// coerce converts it into numbers, adds safety ceiling preventing users to access million records & req will be still accepted
export const listMatchesQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
});

// * URL ROUTE PARAMETER VALIDATION
// validates variable inside url /matches/:id or /matches/42 query parameters, URL path seg are str transforms the str "42" -> 42
export const matchIdParamSchema = z.object({
    id: z.coerce.number().int().positive()
});

// * PAYLOAD VALIDATION LOGIC 
// This validates data payloads sent during POST requests to create a new match.
export const createMatchSchema = z.object({
  sport: z.string().min(1),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  startTime: z.iso.datetime(),
  endTime: z.iso.datetime(),
  homeScore: z.coerce.number().int().nonnegative().optional(),
  awayScore: z.coerce.number().int().nonnegative().optional(),
}).superRefine((data, ctx) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  if (end <= start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "endTime must be chronologically after startTime",
      path: ["endTime"],
    });
  }
});

// * PARTIAL PAYLOAD VALIDATION 
export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().nonnegative(),
  awayScore: z.coerce.number().int().nonnegative(),
});