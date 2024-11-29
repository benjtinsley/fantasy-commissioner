import axios from "axios";
import { config } from "./config.js";

const teamUrl = config.TEAM_API_URL;
const matchupUrl = config.SCOREBOARD_API_URL;

// Fetch data from API
async function getLeagueAPI(url) {
  try {
    const response = await axios.get(url);
    console.log(`Successfully pulled all teams data for the ${config.SEASON_YEAR} season.`);
    return response.data;
  } catch (error) {
    console.error("Error fetching data from API:", error);
    return null;
  }
}

// Get additional team data by checking the team's API
async function getTeamData(teams) {
  try {
    const teamData = [];

    for (const team of teams) {
      console.log(`${team.location} data taken from ${teamUrl + team.id}`);
      const response = await axios.get(teamUrl + team.id);
      const teamInfo = response.data.team;
      const nextGameDetails = teamInfo.nextEvent?.[0]?.shortName;
      const nextGameTimeString = teamInfo.nextEvent?.[0]?.date;
      const winPercentage = teamInfo.record.items[0].stats.find(
        (stat) => stat.name === "winPercent"
      ).value;

      teamData.push({
        ...team,
        standingSummary: teamInfo.standingSummary,
        logo: teamInfo.logos[0].href,
        espnUrl: teamInfo.links[0].href,
        nextGameDetails: nextGameDetails,
        nextGameTime: nextGameTimeString,
        winPercentage: winPercentage,
      });
    }

    return teamData;
  } catch (error) {
    console.error("Error fetching team data:", error);
    return [];
  }
}

// Pull the odds for games (only applies in Wild Week but useful to have other weeks, I guess)
async function getMatchupOdds(teams) {
  // todo: keep table of previously stored matchups and check that first before checking API

  try {
    const teamData = [];

    console.log(`Getting odds for upcoming matchups...`);
    const response = await axios.get(matchupUrl);
    // for console message
    config.WEEK = response.data.weekNumber;

    const weeklyMatchups = Object.values(response.data.events).flat();

    console.log(
      `Successfully pulled odds for ${weeklyMatchups.length} matchups. Populating....`
    );

    for (const team of teams) {
      if (!team.nextGameDetails) {
        console.warn(`No matchup found for ${team.location}. Skipping odds...`);
        continue;
      }

      // for setting default odds if no matchup found
      let matchupFound = false;

      // console.log(`Checking odds for ${team.nextGameDetails}...`);

      for (const matchup of weeklyMatchups) {
        const isFirstTeam =
          matchup.competitors[0].abbrev.toString() ==
          team.abbreviation.toString();
        const isSecondTeam =
          matchup.competitors[1].abbrev.toString() ==
          team.abbreviation.toString();
        const isParticipating = isFirstTeam || isSecondTeam;

        if (isParticipating) {
          const nextGameOdds = matchup?.odds?.details;
          const isCompleted = matchup?.completed;

          // announce the matchup found
          console.log(
            `${team.location}'s matchup ${
              team.nextGameDetails
            } found. Odds: ${nextGameOdds}. It ${
              isCompleted ? "IS completed" : "is NOT completed"
            }.`
          );

          if (!!nextGameOdds) {
            matchupFound = true;

            teamData.push({
              ...team,
              nextGameOdds: nextGameOdds,
              lastResult: null,
            });
          } else if (isCompleted) {
            const competitor1 = matchup.competitors[0].abbrev;
            const competitor1Score = matchup.competitors[0].score;
            const competitor2 = matchup.competitors[1].abbrev;
            const competitor2Score = matchup.competitors[1].score;
            const finalSpread =
              competitor1Score > competitor2Score
                ? `${competitor1} by ${competitor1Score - competitor2Score}`
                : `${competitor2} by ${competitor2Score - competitor1Score}`;
            const finalScore = matchup.status.resultColumnText;
            const recap = `${finalSpread}\n${!!finalScore ? finalScore : ""}`;

            console.log(
              `Last game result for ${team.nextGameDetails}: ${finalSpread}`
            );

            teamData.push({
              ...team,
              lastResult: recap,
            });
            // console.log(`Last game result for ${team.nextGameDetails}: ${recap}`);
          }
          continue;
        }
      }

      if (!matchupFound) {
        console.log(
          `No odds found for ${team.location}'s matchup ${team.nextGameDetails}.`
        );
        // set default odds to no odds
        teamData.push({
          ...team,
          nextGameOdds: "",
        });
      }
    }

    return teamData;
  } catch (error) {
    console.error("Error fetching matchup odds:", error);
    return [];
  }
}

export { getLeagueAPI, getTeamData, getMatchupOdds };