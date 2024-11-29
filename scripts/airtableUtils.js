import Airtable from "airtable";
import { config } from "./config.js";

Airtable.configure({
  endpointUrl: "https://api.airtable.com",
  apiKey: config.AIRTABLE_PAT,
});

export const base = Airtable.base(config.BASE_ID);

// Check if Airtable already has records
async function checkAirtableInitialized() {
  try {
    const records = await base(config.TABLE_ID)
      .select({
        maxRecords: 1,
        view: "All Teams",
      })
      .firstPage();

    if (records.length > 0) {
      console.log("Airtable has been initialized. Updating entries...");
      return true;
    } else {
      console.log("Airtable is empty. Initializing...");
      return false;
    }
  } catch (error) {
    console.error("Error checking Airtable initialization:", error);
  }
}

// Function to update team record in Airtable
async function updateTeamRecord(team) {
  try {
    // Dynamically build the update object
    const updateData = {
      fldECHdTFhzJXczaU: team.overallRecord,
      fldB5TAOajQ4fcBEV: team.overallWins,
      fldwUh1llsuqfcefE: team.standingSummary,
      fldr9L1u7ouUh42uR: team.nextGameDetails,
      fldqq5h0eVrbSz1tb: team.nextGameTime,
      fldK3fF59cefvZPyq: team.lastResult,
      fldpzovvWKafBv8P4: team.awayPointDiff,
      fldFB6ygI8QvD1qtt: team.winPercentage,
      // only update the next game odds if there are odds to take,
      // otherwise leave last game's odds there for comparison
      ...(!!team.nextGameOdds ? { fldzp5QddXZmA3K3S: team.nextGameOdds } : {}),
    };

    // Update team via field IDs
    await base(config.TABLE_ID).update(team.airtableID, updateData);
    console.log(`${team.location} record updated.`);
  } catch (error) {
    console.error(`Error updating ${team.location} in Airtable:`, error);
  }
}

// Function to add team to Airtable
async function addTeamToAirtable(team) {
  const nextGameDetails =
    team?.nextGameDetails?.length > 0 ? team.nextGameDetails : "-- No Game --";
  const nextGameOdds =
    team?.nextGameOdds?.length > 0 ? team.nextGameOdds : "-- No Odds --";

  try {
    // Add team to Airtable via field IDs
    await base(config.TABLE_ID).create({
      flddG7XLZc20dgWmq: team.displayName,
      fldECHdTFhzJXczaU: team.overallRecord,
      fldMxQHaRzDBU69ho: team.conference,
      fldB5TAOajQ4fcBEV: team.overallWins,
      fldFB6ygI8QvD1qtt: team.winPercentage,
      fldCG4qAAwpJlVvXD: team.abbreviation,
      fldVuh4vWxmLnqmpe: team.location,
      fldwUh1llsuqfcefE: team.standingSummary,
      fldAh58GvZbwkyMox: [{ url: team.logo }],
      fldr9L1u7ouUh42uR: nextGameDetails,
      fldzp5QddXZmA3K3S: nextGameOdds,
      fldZ20Gy4VMskTvBj: team.espnUrl,
    });
    console.log(`Updated ${team.location} data in Airtable.`);
  } catch (error) {
    console.error(`Error adding ${team.location} to Airtable:`, error);
  }
}

// make these functions available to other files
export { checkAirtableInitialized, updateTeamRecord, addTeamToAirtable };