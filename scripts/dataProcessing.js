// At the top, add imports
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../');

// Process the data to get the teams array
async function getTeamsArray(data) {
  try {
    const NCAAconferences = data.children;
    const NCAAteams = [];

    NCAAconferences.forEach((conference) => {
      const conferenceName = conference.shortName;
      const hasDivisions = !!conference.children;

      console.log(
        `${conferenceName} team info taken with ${
          hasDivisions
            ? conference.children.length + " divisions"
            : "no divisions"
        }.`
      );

      let teams = [];

      if (hasDivisions) {
        conference.children.forEach((division) => {
          teams = teams.concat(division.standings.entries);
        });
      } else {
        teams = conference.standings.entries;
      }

      teams.forEach((team) => {
        NCAAteams.push({
          conference: conferenceName,
          displayName: team.team.displayName,
          location: team.team.location,
          overallWins: team.stats.find((stat) => stat.type === "wins").value,
          overallRecord: team.stats.find((stat) => stat.name === "overall")
            .displayValue,
          awayPointDiff: team.stats.find(
            (stat) => stat.type === "awayrecord_pointdifferential"
          ).value,
          abbreviation: team.team.abbreviation,
          id: team.team.id,
        });
      });
    });

    return NCAAteams;
  } catch (error) {
    console.error("Error processing teams array:", error);
    return [];
  }
}

// Add stored Airtable IDs to the teams array
async function addAirtableIDs(teams) {
  const teamsCsvPath = path.join(projectRoot, "data", "team-to-id.csv");

  const parseCsv = (csvFilePath) => {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", () => resolve(results))
        .on("error", (error) => reject(error));
    });
  };

  try {
    const csvData = await parseCsv(teamsCsvPath);

    // Create a map of team names to Airtable IDs for quick lookup
    const airtableIdMap = {};
    csvData.forEach((row) => {
      const teamName = row["Team"].trim();
      const environmentVar = row["Environment_Var"].trim();
      // use the environment variable to get the Airtable ID
      airtableIdMap[teamName] = process.env[environmentVar];
    });

    // Add Airtable ID to team data objects
    // console.log(`Adding Airtable IDs to team the ${teams.length} records...`);
    teams.forEach((team) => {
      const airtableID = airtableIdMap[team.displayName];
      if (airtableID) {
        team.airtableID = airtableID;
      } else {
        console.warn(`Airtable ID not found for team: ${team.displayName}`);
      }
    });
    // console.log(`Added Airtable IDs to ${teams.length} team records.`);
    return teams;
  } catch (error) {
    console.error("Error adding Airtable IDs:", error);
    return;
  }
}

export { getTeamsArray, addAirtableIDs };
