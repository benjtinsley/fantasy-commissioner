import axios from 'axios';
import Airtable from 'airtable';
import 'dotenv/config';


// Airtable configuration
const PAT = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_ID = process.env.AIRTABLE_TABLE_ID;
const YEAR = process.env.SEASON_YEAR

const baseApiUrl = 'https://site.web.api.espn.com/apis/v2/sports/football/college-football/standings?season=';
const teamUrl = 'http://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/';
const apiUrl = baseApiUrl + YEAR;


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
      view: "Grid view"
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

// Function to fetch data from ESPN API
async function getEspnAPI(url) {
  try {
    const response = await axios.get(url);
    console.log(`Successfully pulled all ESPN teams data for the ${YEAR} season.`);
    return response.data;
  } catch (error) {
    console.error("Error fetching data from ESPN API:", error);
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
      const response = await axios.get(teamUrl + team.id);
      const teamInfo = response.data.team;

      teamData.push({
        ...team,
        standingSummary: teamInfo.standingSummary,
        logo: teamInfo.logos[0].href,
        // predictedRecord: teamInfo.predictedRecord,
        // nextGame: teamInfo.nextEvent[0].shortName,
        espnUrl: teamInfo.links[0].href
      });
    }

    return teamData;
  } catch (error) {
    console.error("Error fetching team data:", error);
    return [];
  }
}

// Function to update team record in Airtable
async function updateTeamRecord(team) {
  try {
    await base(TABLE_ID).update(team.id, {
      fldECHdTFhzJXczaU: team.overallRecord,
      fldB5TAOajQ4fcBEV : team.overallWins,
      fldwUh1llsuqfcefE: team.standingSummary,
      // fldr9L1u7ouUh42uR: team.nextGame,
      fldpzovvWKafBv8P4: team.awayPointDiff
    });
    console.log(`Success! Updated record for ${team.location}.`);
  } catch (error) {
    console.error(`Error updating ${team.location} in Airtable:`, error);
  }
}

// Function to add team to Airtable
async function addTeamToAirtable(team) {
  try {
    await base(TABLE_ID).create({
      flddG7XLZc20dgWmq: team.displayName,
      fldECHdTFhzJXczaU: team.overallRecord,
      fldMxQHaRzDBU69ho: team.conference,
      fldB5TAOajQ4fcBEV: team.overallWins,
      fldCG4qAAwpJlVvXD: team.abbreviation,
      fldVuh4vWxmLnqmpe: team.location,
      fldwUh1llsuqfcefE: team.standingSummary,
      fldAh58GvZbwkyMox: [{ url: team.logo }],
      // fldr9L1u7ouUh42uR: team.nextGame
      // fldzp5QddXZmA3K3S: team.predictedRecord,
      fldZ20Gy4VMskTvBj: team.espnUrl, 
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
  const espnApi = await getEspnAPI(apiUrl);

  if (espnApi) {
    const teamsArray = await getTeamsArray(espnApi);
    const augmentedTeamArray = await getTeamData(teamsArray);
    
    // only update a few fields on the records
    if (hasInitialized) {
      for (const team of augmentedTeamArray) {
        await updateTeamRecord(team);
      }
      return;
    }

    // add all records
    for (const team of augmentedTeamArray) {
      await addTeamToAirtable(team);
    }

    console.log(`All ${augmentedTeamArray.length} NCAA team data for the ${YEAR} season have been added to Airtable.`);
  }
})();