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
  

async function getTeamsArray(data) {
    try {
        var ACC = data.children[1];
        var BigXII = data.children[2];
        var Big10 = data.children[3];
        var FBSInd = data.children[5];
        var Pac12 = data.children[8];
        var SEC = data.children[9];
    
        var nonDivisionConferenceData = [ACC, BigXII, FBSInd, Pac12];
        var divisionConferenceData = [Big10, SEC];
        var allTeams = [];
    
        function generateTeamObject(teams, conferenceName) {
            teams.forEach(team => {
                var newTeam = {}
                newTeam.conference = conferenceName;
                newTeam.uid = team.team.uid;
                newTeam.displayName = team.team.displayName;
                newTeam.overallWins = team.stats[8].value;
                newTeam.overallRecord = team.stats[12].summary;
                allTeams.push(newTeam);
            });
        }

        function getTeams(conference, hasDivions) {
            var conferenceName = conference.shortName;
            if (hasDivions) {
                var division1Teams = conference.children[0].standings.entries;
                var division2Teams = conference.children[1].standings.entries;
                generateTeamObject(division1Teams, conferenceName);
                generateTeamObject(division2Teams, conferenceName);
            } else {
                var allConferenceTeams = conference.standings.entries;
                generateTeamObject(allConferenceTeams, conferenceName);
            }
        }
    
        nonDivisionConferenceData.forEach(conference => {
            getTeams(conference, false);
        });

        divisionConferenceData.forEach(conference => {
            getTeams(conference, true);
        });

        return allTeams;
    } catch (error) {
        console.error("Error:", error);
    }
}

async function addTeam(team) {
  try {
    console.log(`Adding ${team.displayName}.`)
    const response = await notion.pages.create({
      parent: { 
        "type": "database_id",
        "database_id": databaseId
     },
      properties: {
        "Team": {
            "title": [
                {
                    "text": {
                        "content": team.displayName
                    }
                }
            ]
        },
        "Record": {
            "rich_text": [
                {
                    "text": {
                        "content": team.overallRecord
                    }
                }
            ]
        }, 
        "Conference": {
            "select": {
                "name": team.conference
            }
        },
        "Overall Wins": {
            "number": team.overallWins
        },
        "UID": {
            "rich_text": [
                {
                    "text": {
                        "content": team.uid
                    }
                }
            ]
        }
      }
    })
    console.log(`Success! Added ${team.displayName}.`)
  } catch (error) {
    console.log(error)
  }
}

if (numberOfEntries > 0) {
    console.log("There are already entries in this database. Please delete them or manually remove this error if you'd like to proceed.")
} else {
    console.log("Starting the entries...")
    var espnApi = await getEspnAPI(apiUrl);
    var teamsArray = await getTeamsArray(espnApi);
    teamsArray.forEach(team => {
        addTeam(team);
    });
}