const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

import axios from 'axios';
import Airtable from 'airtable';
import 'dotenv/config';


// Airtable configuration
const PAT = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_ID = process.env.AIRTABLE_TABLE_ID;
const baseApiUrl = process.env.BASE_API_URL;
const year = process.env.SEASON_YEAR
const teamUrl = process.env.TEAM_API_URL;
const matchupUrl = process.env.SCOREBOARD_API_URL;

const apiUrl = baseApiUrl + year;

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: PAT
});
const base = Airtable.base(BASE_ID);

// Check if Airtable already has records
async function checkAirtableInitialized() {
  try {
    const records = await base(TABLE_ID).select({
      maxRecords: 1,
      view: "All Teams"
    }).firstPage();
    
    if (records.length > 0) {
      console.log('Airtable has been initialized. Updating entries...');
      return true;
    } else {
      console.log('Airtable is empty. Initializing...');
      return false;
    }
  } catch (error) {
    console.error('Error checking Airtable initialization:', error);
  }
}

// Function to fetch data from API
async function getLeagueAPI(url) {
  try {
    const response = await axios.get(url);
    console.log(`Successfully pulled all teams data for the ${year} season.`);
    return response.data;
  } catch (error) {
    console.error("Error fetching data from API:", error);
    return null;
  }
}

// Function to process teams array
async function getTeamsArray(data) {
  try {
    const NCAAconferences = data.children;
    const NCAAteams = [];

    NCAAconferences.forEach(conference => {
      const conferenceName = conference.shortName;
      const hasDivisions = !!(conference.children);

      console.log(`Getting teams for ${conferenceName} with ${hasDivisions ? conference.children.length + ' divisions' : 'no divisions'}.`);
      
      let teams = [];
      
      if (hasDivisions) {
        conference.children.forEach(division => {
          teams = teams.concat(division.standings.entries);
        });
      } else {
        teams = conference.standings.entries;
      }


      teams.forEach(team => {
        NCAAteams.push({
          conference: conferenceName,
          displayName: team.team.displayName,
          location: team.team.location,
          overallWins: team.stats.find(stat => stat.name === 'wins').value,
          overallRecord: team.stats.find(stat => stat.name === 'overall').displayValue,
          awayPointDiff: team.stats.find(stat => stat.name === 'pointDifferential').value,
          abbreviation: team.team.abbreviation,
          id: team.team.id
        });
      });
    });

    return NCAAteams;
  } catch (error) {
    console.error("Error processing teams array:", error);
    return [];
  }
}

// Function to get additional team data
async function getTeamData(teams) {
  try {
    const teamData = [];
    
    for (const team of teams) {
      console.log(`Getting additional data for ${team.location}...`);
      const response = await axios.get(teamUrl + team.id);
      const teamInfo = response.data.team;

      teamData.push({
        ...team,
        standingSummary: teamInfo.standingSummary,
        logo: teamInfo.logos[0].href,
        // predictedRecord: teamInfo.predictedRecord,
        espnUrl: teamInfo.links[0].href
      });

      const nextGameDetails = teamInfo.nextEvent?.[0]?.shortName ?? null;
      if (nextGameDetails) {
        teamData.push({
          ...team,
          nextGameDetails: nextGameDetails
        });
      }
    }

    return teamData;
  } catch (error) {
    console.error("Error fetching team data:", error);
    return [];
  }
}

// Function to get odds for games
async function getMatchupOdds(teams) {
  try {
    const teamData = [];
    
    console.log(`Getting odds for upcoming matchups...`);
    const response = await axios.get(matchupUrl);
    const weeklyMatchups = response.data.events;
    console.log(`Successfully pulled odds for ${weeklyMatchups.length} matchups. Populating....`);

    for (const team of teams) {
      if (!team.nextGameDetails) {
        continue;
      }
      console.log(`Getting odds for ${team.nextGameDetails}...`);
      for (const matchup of weeklyMatchups) {
        if (matchup.shortName == team.nextGameDetails) {
          const nextGameOdds = matchup?.competitions?.[0]?.odds?.[0]?.details ?? null;
          if (nextGameOdds) {
            teamData.push({
              ...team,
              nextGameOdds: nextGameOdds
            });
          }
        }
      }
    }

    return teamData;
  } catch (error) {
    console.error("Error fetching matchup odds:", error);
    return [];
  }
}

// Function to update team record in Airtable
async function updateTeamRecord(team) {
  const nextGameDetails = team?.nextGameDetails ? team.nextGameDetails : '';
  const nextGameOdds = team?.nextGameOdds ? team.nextGameOdds : '';
  
  try {
    // Update team via field IDs
    await base(TABLE_ID).update(team.displayName, {
      fldECHdTFhzJXczaU: team.overallRecord,
      fldB5TAOajQ4fcBEV: team.overallWins,
      fldwUh1llsuqfcefE: team.standingSummary,
      fldr9L1u7ouUh42uR: nextGameDetails,
      fldzp5QddXZmA3K3S: nextGameOdds,
      fldpzovvWKafBv8P4: team.awayPointDiff
    });
    console.log(`Success! Updated record for ${team.location}.`);
  } catch (error) {
    console.error(`Error updating ${team.location} in Airtable:`, error);
  }
}

// Function to add team to Airtable
async function addTeamToAirtable(team) {
  const nextGameDetails = team?.nextGameDetails ? team.nextGameDetails : '';
  const nextGameOdds = team?.nextGameOdds ? team.nextGameOdds : '';

  try {
    // Add team to Airtable via field IDs
    await base(TABLE_ID).create({
      flddG7XLZc20dgWmq: team.displayName,
      fldECHdTFhzJXczaU: team.overallRecord,
      fldMxQHaRzDBU69ho: team.conference,
      fldB5TAOajQ4fcBEV: team.overallWins,
      fldCG4qAAwpJlVvXD: team.abbreviation,
      fldVuh4vWxmLnqmpe: team.location,
      fldwUh1llsuqfcefE: team.standingSummary,
      fldAh58GvZbwkyMox: [{ url: team.logo }],
      fldr9L1u7ouUh42uR: nextGameDetails,
      fldzp5QddXZmA3K3S: nextGameOdds,
      fldZ20Gy4VMskTvBj: team.espnUrl
    });
    console.log(`Success! Added ${team.location}.`);
  } catch (error) {
    console.error(`Error adding ${team.location} to Airtable:`, error);
  }
}

// Main function to fetch and update data
(async function() {
  // Check if Airtable has been initialized
  const hasInitialized = await checkAirtableInitialized();

  console.log("Starting the entries...");
  const espnApi = await getLeagueAPI(apiUrl);

  if (espnApi) {
    let teamsArray = await getTeamsArray(espnApi);
    teamsArray = await getTeamData(teamsArray);
    teamsArray = await getMatchupOdds(teamsArray);
    
    // only update a few fields on the records
    if (hasInitialized) {
      teamsArray = addAirtableIDs(teamsArray);
      for (const team of teamsArray) {
        await updateTeamRecord(team);
      }
      return;
    }

    // add all records
    for (const team of teamsArray) {
      await addTeamToAirtable(team);
    }

    console.log(`All ${teamsArray.length} NCAA team data for the ${year} season have been added to Airtable.`);
    return;
  }

  console.log("No data was fetched from the API.");
  return;
})();