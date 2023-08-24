import { Client } from "@notionhq/client";
import fetch from 'cross-fetch';
import 'dotenv/config'

const notion = new Client({ auth: process.env.NOTION_INTEGRATION_KEY });

const databaseId = process.env.NOTION_DATABASE_ID
const baseApiUrl = 'https://site.web.api.espn.com/apis/v2/sports/football/college-football/standings?season='
const seasonYear = '2023'

const apiUrl = baseApiUrl + seasonYear

async function getNumberOfEntries() {
    try{
        const response = await notion.databases.query({ database_id: databaseId });
        return response.results.length;
    } catch (error) {
        console.error(error.body)
    }
};

var numberOfEntries = await getNumberOfEntries();

async function getEspnAPI(url, data = {}) {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
    
        const result = await response.json();
        console.log("Successfully pulled all ESPN teams data.")
        return result;
    } catch (error) {
        console.error("Error:", error);
    }
}
  
async function getUpdatedTeamsArray(data) {
    try {
        var ACC = data.children[1];
        var BigXII = data.children[2];
        var Big10 = data.children[3];
        var FBSInd = data.children[5];
        var Pac12 = data.children[8];
        var SEC = data.children[9];
    
        var allConferenceData = [ACC, BigXII, FBSInd, Pac12, Big10, SEC];
        var allTeams = [];
        
        function generateTeamObject(teams) {
            teams.forEach(team => {
                var newTeam = {}
                newTeam.displayName = team.team.displayName;
                newTeam.overallWins = team.stats[8].value;
                newTeam.overallRecord = team.stats[12].summary;
                allTeams.push(newTeam);
            });
        }

        allConferenceData.forEach(conference => {
            var conferenceName = conference.shortName;
            if ( conference.hasOwnProperty('children') ) {
                var division1Teams = conference.children[0].standings.entries;
                var division2Teams = conference.children[1].standings.entries;
                generateTeamObject(division1Teams, conferenceName);
                generateTeamObject(division2Teams, conferenceName);
            } else {
                var allConferenceTeams = conference.standings.entries;
                generateTeamObject(allConferenceTeams, conferenceName);
            }
        });

        return allTeams;
    } catch (error) {
        console.error("Error:", error);
    }
}

async function queryNotionDB() {
  try {
    const response = await notion.databases.query({
        database_id: databaseId
    })
    return response.results;
  } catch (error) {
    console.log(error)
  }
}

async function generateTeamIdArray(data) {
    try {
        var allEntries = []

        data.forEach(entry => {
            allEntries.push({ 
                pageId: entry.id, 
                teamName: entry.properties['Team'].title[0].text.content
            })    
        });

        return allEntries
    } catch (error) {
        console.log(error)
    }
}

async function getMatchingTeamData(teamName, data) {
    try {
        var matchingEntry = {}
        data.forEach(entry => {
            if (entry.displayName === teamName) {
                matchingEntry = entry;
            }
        });
        return matchingEntry;
    }  catch (error) {
        console.log(error)
    }
}

async function updateTeam(team, data) {
    try {
        var matchingTeamData = await getMatchingTeamData(team.teamName, data);
        const pageId = team.pageId;
        const response = await notion.pages.update({
            page_id: pageId,
            properties: {
                "Record": {
                    "rich_text": [
                        {
                            "text": {
                                "content": matchingTeamData.overallRecord
                            }
                        }
                    ]
                }, 
                "Overall Wins": {
                    "number": matchingTeamData.overallWins
                },
            },
        });
        console.log(`Updated record for ${team.teamName}`);
    }  catch (error) {
        console.log(error)
    }
}

if (numberOfEntries <= 0) {
    console.log("There are no entries in this database. Please run the init script to generate them.")
} else {
    console.log("Starting the update...")
    var notionDB = await queryNotionDB();
    var teamIdArray = await generateTeamIdArray(notionDB);
    var espnApi = await getEspnAPI(apiUrl);
    var updatedTeamsArray = await getUpdatedTeamsArray(espnApi);
    teamIdArray.forEach(team => {
        updateTeam(team, updatedTeamsArray);
    });
}