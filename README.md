# Fantasy Conferences

Pick as many NCAA teams as you like from whatever Power 5 or FBS independed conference and make realignment hell a reality.

## Get set uo
1. add `NOTION_INTEGRATION_KEY` and `NOTION_DATABASE_KEY` to .env file linking to your account and the database you wish to use
1. run `npm install`


## Tasks

`node init.js` will dump all the NCAA Power 5 and FBS Independent teams into your specified Notion database

`node update.js` will update the weekly records of all the teams. Run this on Sunday morning or Monday, once all the games of the week are completed