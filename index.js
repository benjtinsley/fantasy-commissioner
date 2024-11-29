import { checkAirtableInitialized, updateTeamRecord, addTeamToAirtable } from './scripts/airtableUtils.js';
import { getLeagueAPI, getTeamData, getMatchupOdds } from './scripts/apiUtils.js';
import { getTeamsArray, addAirtableIDs } from './scripts/dataProcessing.js';
import { config } from './scripts/config.js';

(async function main() {
  const hasInitialized = await checkAirtableInitialized();
  const apiData = await getLeagueAPI(`${config.BASE_API_URL}${config.SEASON_YEAR}`);
  if (!apiData) {
    console.log("No data was fetched from the API.");
    return;
  }

  const teamsArray = await getTeamsArray(apiData);
  let extendedTeams = await getTeamData(teamsArray);
  let teamsWithOdds = await getMatchupOdds(extendedTeams);
  const teams = await addAirtableIDs(teamsWithOdds);

  if (hasInitialized) {
    for (const team of teams) {
      await updateTeamRecord(team);
    }
  } else {
    for (const team of teams) {
      await addTeamToAirtable(team);
    }
  }
})();