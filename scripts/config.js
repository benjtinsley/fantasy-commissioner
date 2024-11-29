import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);
export const config = {
  AIRTABLE_PAT: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
  BASE_ID: process.env.AIRTABLE_BASE_ID,
  TABLE_ID: process.env.AIRTABLE_TABLE_ID,
  BASE_API_URL: process.env.BASE_API_URL,
  SEASON_YEAR: process.env.SEASON_YEAR,
  TEAM_API_URL: process.env.TEAM_API_URL,
  SCOREBOARD_API_URL: process.env.SCOREBOARD_API_URL,
  WEEK: -1
};
