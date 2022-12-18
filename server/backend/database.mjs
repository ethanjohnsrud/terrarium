import sqlite3 from 'sqlite3';
// sqlite3.verbose(); // Error Interpretation Mode
import DATA from './data.mjs';
const DATABASE_FILE = DATA.DATABASE_FILE;
import logMessage from './communicate.mjs';

/*********************************** */
/* ******     SQL DATABASE     ***** */
/*********************************** */
// const sqlite3 = require('sqlite3').verbose(); // https://github.com/mapbox/node-sqlite3 https://www.w3resource.com/node.js/nodejs-sqlite.php https://www.codecademy.com/learn/learn-node-sqlite/modules/learn-node-sqlite-module/cheatsheet
//Default has callback, need to convert to return promise to send result with 'until' library : https://www.freecodecamp.org/news/how-to-make-a-promise-out-of-a-callback-function-in-javascript-d8ec35d1f981/ 
//Need Node Version: 14.8+ for main node thread to be async/await https://stackoverflow.com/questions/46515764/how-can-i-use-async-await-at-the-top-level 
//Query Utilities return true/false | self log Errors
const queryRun = (query, ...parameters) => {
    if(DATA.SETTINGS.accessDatabase) {
        const database = new sqlite3.Database(DATABASE_FILE);
        
            return new Promise((resolve, reject) => {
                database.run(query, parameters,  (error, result) => {
                    database.close((err) => {
                        if(err) 
                            logMessage(`FAILED to CLOSE DATABASE [${DATABASE_FILE}] => ${err}`);
                        if(error) 
                            reject(error); 
                        else 
                            resolve(result);
                    }); 
            });})
            .then(() => true)
            .catch(error => {logMessage(true, `# QUERY RUN ERROR: '${query}' :: ${parameters} => ${error}`);   
            return false;
        }
        );} else {
            logMessage(`# DATABASE ACCESS DENIED => '${query}' =>${parameters}`); 
            return false;
        }  
}
const queryAll = (query, ...parameters) => {
    if(DATA.SETTINGS.accessDatabase) {
        const database = new sqlite3.Database(DATABASE_FILE);

            return new Promise(async(resolve, reject) => {
                database.all(query, parameters,  
                    (error, result) => {
                        database.close((err) => {
                            if(err) 
                                logMessage(`FAILED to CLOSE DATABASE [${DATABASE_FILE}] => ${err}`);
                            if(error) 
                                reject(error); 
                            else 
                                resolve(result);
                    });                    
            });})
            .then(result => result)
            .catch(error => { 
                logMessage(true, `# QUERY ALL ERROR: '${query}' :: ${parameters} => ${error}`);   
                return false;
            }
            );} else {
                logMessage(`# DATABASE ACCESS DENIED => '${query}' =>${parameters}`); 
                return false;
            }  
}

const queryExecuteSequence = async (queryList) => {            
    if(!DATA.SETTINGS.accessDatabase || !Array.isArray(queryList) || !queryList.length) {
        logMessage(`# DATABASE ACCESS DENIED => '${queryList}'`); 
        return false;
    } 
    else 
        return new Promise(async(resolve, reject) => { 
            const database = new sqlite3.Database(DATABASE_FILE);
            const list = [];   

            queryList.forEach(query => list.push(()=>new Promise((r,j) =>{ database.run(query, (err) => { 
                if(err) {logMessage(`Sequential Query Fail: ${err}`); reject(err);} else r();})})));
            
            list.push(()=>new Promise(r =>{ database.close((err) => {
                if(err) {
                    logMessage(`FAILED to CLOSE DATABASE [${DATABASE_FILE}] => ${err}`); r(); 
                    reject(err);
                } 
                else {
                    r();
                     resolve();
                }})}));

            list.reduce((p, next) => p.then(next), Promise.resolve()); 

            }).then(result => true).catch(error => {
                logMessage(true, `# SEQUENTIAL QUERY RUN ERROR: '${queryList}' => ${error}`);  

                database.close((er) => {
                    if(err) {
                        logMessage(`FAILED to CLOSE DATABASE in Catch [${DATABASE_FILE}] => ${err}`); }}); 
                        return false;
                        }
                );
}

//Utility Local Methods
//Priority is Primary Key in SQL Database schedules table, Needs Salting to Reset.
const saltSchedulesPriority = async (salt) => { 
    try{ if(!DATA.SETTINGS.accessDatabase) throw 'Database Access Denied';
        
        const rows = await queryAll(`SELECT * FROM schedules ORDER BY time ASC, time ASC;`); 

        if(!rows || rows.length==0 || !Array.isArray(rows)) throw 'Failed to Fetch Schedules List';

        let queryList = [];

        rows.forEach(s => {
                queryList.push(`UPDATE schedules SET priority = ${s.priority.toString().slice(undefined, 3)}${salt} WHERE priority = ${s.priority};`); //Set New Priority       
            });  

        return queryExecuteSequence(queryList);

    } catch(error){logMessage(`Failed to Utility Sort Priority: ${error}`); return false;}
}

//Predefine Actions
const databaseSaveReading = async (time = DATA.LOCAL.timeLastReading, temperature = DATA.DEFAULT_TEMPERATURE, goalTemperature = DATA.LOCAL.goalTemperature, humidity = DATA.DEFAULT_HUMIDITY, goalHumidity = DATA.LOCAl.goalHumidity, active, inactive) =>  { 
    
    if(!time || !temperature || !humidity) {
        logMessage(true, `Error Invalid DATABASE.databaseSaveReading call with Invalid Values -> Not adding to Database`, 
                    time, 
                    temperature, 
                    humidity
                ); 
    
        return false;
    
    } else { 
        DATA.LOCAL.timeLastReadingSaved = time; 
        
        return await queryRun('INSERT INTO readings (time, hour, temperature, goalTemperature, humidity, goalHumidity, active, inactive) VALUES (?, ?, ?, ?, ?, ?, ?, ?);', 
            time, 
            new Date(time).getHours(), 
            Math.floor(temperature*100)/100, 
            Math.floor(goalTemperature*100)/100, 
            Math.floor(humidity*100)/100, 
            Math.floor(goalHumidity*100)/100, 
            JSON.stringify(Array.isArray(active) ? active : []), 
            JSON.stringify(Array.isArray(inactive) ? inactive : [])
        ); 
    }}

const databaseGetReadingRange = async (start, end = new Date().getTime(), recentFirst = false) => { //Recent First
    
    const rows = await queryAll(`SELECT * FROM readings WHERE time BETWEEN ? AND ? ORDER BY time ${recentFirst ? 'DESC' : 'ASC'};`, start, end);
        
    if(rows.length > 0) {
                rows.forEach((row,i) => {
                    row.active = JSON.parse(row.active); 
                    row.inactive = JSON.parse(row.inactive);
                }); 
            return rows;

        } else return [];
    }

const databaseGetAverageValues = async (hour = new Date().getHours(), days = 10) => { //Recent First
        
        const rows = await queryAll(`SELECT * FROM readings WHERE hour = ? ORDER BY time ASC LIMIT ?;`, hour, days);
        
        const average = {temperature: 0, humidity: 0}; 
        
        if(rows.length > 0) {
            rows.forEach(row => {average.temperature += row.temperature;  average.humidity += row.humidity;}); 
                            return {
                                temperature: Math.floor((average.temperature / rows.length)*100)/100, 
                                humidity: Math.floor((average.humidity / rows.length)*100)/100, 
                                statusMessage: `Historic ${rows.length} Average Values`
                            };                            
        } else return {
            temperature: DATA.DEFAULT_TEMPERATURE, 
            humidity: DATA.DEFAULT_HUMIDITY, 
            statusMessage: `Default Values`
        };
    }

const databaseAddSchedule = async (time = new Date().getTime(), title = 'New Schedule', names, duration = 0, set=true, repeat = 0) =>  //priority default to auto-increment
    await queryRun('INSERT INTO schedules (time, title, names, duration, "set", repeat) VALUES (?, ?, ?, ?, ?, ?);', time, title, names.toString(), duration, set, repeat);

const databaseDeleteSchedule = async (priority) => 
    await queryRun('DELETE FROM schedules WHERE priority = ?;', priority);

const databaseUpdateSchedule = async (currentPriority, attributeName, value) => 
    await queryRun(`UPDATE schedules SET ${attributeName} = ? WHERE priority = ?;`, value, currentPriority);

const databaseReplaceSchedule = async (currentPriority, priority, time, title, names, duration, set, repeat) => 
    await queryRun('UPDATE schedules SET priority = ?, time = ?, title = ?, names = ?, duration = ?, "set" = ?, repeat = ? WHERE priority = ?;', priority, time, title, names.toString(), duration, set, repeat, currentPriority);

const databaseSwapPriority = async (firstPriority, secondPriority) => { 
    try{ if(!DATA.SETTINGS.accessDatabase) throw 'Database Access Denied';

        const rows = await queryAll(`SELECT * FROM schedules ORDER BY time ASC, time ASC;`); 

        if(!rows || rows.length==0 || !Array.isArray(rows)) throw 'Failed to Fetch Schedules List';

    //Calculate placing
        const SCHEDULES = [...rows.sort((a,b) => (a.priority - b.priority))]; //Ascending
        let higherIndex = SCHEDULES.findIndex(s => s.priority == (firstPriority > secondPriority ? firstPriority : secondPriority));
        let lowerIndex = SCHEDULES.findIndex(s => s.priority == (firstPriority < secondPriority ? firstPriority : secondPriority));

        if(higherIndex<0 || lowerIndex<0 || higherIndex >= SCHEDULES.length || lowerIndex >= SCHEDULES.length || higherIndex == lowerIndex) throw 'Invalid Priorities';
        
        let queryList = [`UPDATE schedules SET priority = ${SCHEDULES[higherIndex].priority+1} WHERE priority = ${SCHEDULES[lowerIndex].priority};`];
        
        for(var i=(higherIndex+1); i<SCHEDULES.length; i++) {
            //move above up +1
            if((SCHEDULES[i].priority - SCHEDULES[i-1].priority) > 1)  //Find Gap in priorities
                break;
            else queryList.push(`UPDATE schedules SET priority = ${SCHEDULES[i].priority+1} WHERE priority = ${SCHEDULES[i].priority};`); //Shift current up        
        } //set higher remains the same and lower is inserted above 
        
        // queryList.push(`UPDATE schedules SET priority = ${SCHEDULES[lowerIndex].priority} WHERE priority = ${SCHEDULES[higherIndex].priority};`); //Add lower index here
    
        //EXECUTE Changes
        return await queryExecuteSequence(queryList);
    
    } catch(error){logMessage(`Failed to Swap Priority: ${error}`); return false;}
}

const databaseIncreasePriority = async (priority, increase = true) => {
    try{ if(!DATA.SETTINGS.accessDatabase) throw 'Database Access Denied';

    const rows = await queryAll(`SELECT * FROM schedules ORDER BY time ASC, time ASC;`); 

        if(!rows || rows.length==0 || !Array.isArray(rows)) 
            throw 'Failed to Fetch Schedules List';

    const SCHEDULES = [...rows.sort((a,b) => (a.priority - b.priority))]; //Ascending

    let priorityIndex = SCHEDULES.findIndex(s => s.priority == priority);

    if(priorityIndex<0 || priorityIndex >= SCHEDULES.length) 
        throw 'Invalid Priority';

        else if(priorityIndex == 0 && !increase) 
            return await queryRun(`UPDATE schedules SET priority = ? WHERE priority = ?;`,(priority - 1), priority);

        else if(priorityIndex == (SCHEDULES.length - 1) && increase) 
            return await queryRun(`UPDATE schedules SET priority = ? WHERE priority = ?;`,(priority + 1), priority);

        else 
            return await databaseSwapPriority(priority, SCHEDULES[priorityIndex + (increase ? 1 : -1)].priority);

    } catch(error){logMessage(`Failed to ${increase ? 'Increase' : 'Decrease'} Priority: ${error}`); return false;}
}

//Reset Primary Key
const databaseSimplifyPriority = async () => { 
    try{ if(!DATA.SETTINGS.accessDatabase) throw 'Database Access Denied';

        await saltSchedulesPriority(new Date().getTime().toString().slice(8)).catch(err => {throw err;});

        const rows = await queryAll(`SELECT * FROM schedules ORDER BY time ASC, time ASC;`); 

        if(!rows || rows.length==0 || !Array.isArray(rows)) throw 'Failed to Fetch Schedules List';

        const SCHEDULES = [...rows.sort((a,b) => (a.priority - b.priority))]; //Ascending       
        let priority = 1;
        let queryList = [];

        SCHEDULES.forEach(s => {
            if(s.priority > priority) 
                queryList.push(`UPDATE schedules SET priority = ${priority} WHERE priority = ${s.priority};`); //Set New Priority       
                priority++;
            });  

            //Reset AUTO INCREMENT KEY: Priority
            queryList.push(`UPDATE 'sqlite_sequence' SET 'seq' = ${SCHEDULES.length + 2} WHERE 'name' = 'schedules';`);

        return queryExecuteSequence(queryList);

    } catch(error){logMessage(`Failed to Simplify Priority: ${error}`); return false;}
}

const databaseProgressSchedule = async (priority, time, repeat = 0) => { //delete and repeat
    if(repeat)
        return await queryRun('UPDATE schedules SET time = ? WHERE priority = ?;', (time+repeat), priority);
    else
        return await queryRun('DELETE FROM schedules WHERE priority = ?;', priority);
    }

const databaseGetAllSchedules = async () => { //Recent First
        const rows = await queryAll(`SELECT * FROM schedules ORDER BY time ASC, time ASC;`);
        if(rows.length > 0) {rows.forEach(row => row.names = row.names.split(",")); return rows;} else return [];
    }

const databaseFetchCurrentSchedules = async () => {//Recent First
        const rows = await queryAll(`SELECT * FROM schedules WHERE time < ? ORDER BY priority ASC;`, new Date().getTime());
        if(rows.length > 0) {rows.forEach(row => row.names = row.names.split(",")); return rows;} else return [];
    }

/***************************** */
/* ******     EXPORT     ***** */
/***************************** */
const setupDatabase = async () => {
    if(DATA.SETTINGS.accessDatabase) { //Initial Database Setup
        try {
            if(await !queryRun('CREATE TABLE IF NOT EXISTS readings (time INT, hour INT, temperature FLOAT(3,3), goalTemperature FLOAT(3,3), humidity FLOAT(3,3), goalHumidity FLOAT(3,3), active TEXT, inactive TEXT, PRIMARY KEY(time));')) throw '`readings` Table setup Failed';
            if(await !queryRun('CREATE TABLE IF NOT EXISTS schedules (priority  INTEGER PRIMARY KEY AUTOINCREMENT, time INT, title TEXT, names TEXT, duration INT, "set" BOOL, repeat INT);')) throw '`schedules` Table setup Failed';

        } catch(error) {
            logMessage(true, `DATABASE SETUP FAILED [${DATABASE_FILE}] => ${error}`);
            DATA.SETTINGS.accessDatabase = false;
            DATA.saveSettings();
        }
    } else 
        logMessage(true, `# SETUP DATABASE ACCESS DENIED [${DATABASE_FILE}] => DATA.accessDatabase:${DATA.SETTINGS.accessDatabase}`);
    return;
}

const databaseClearOldReadings = async(days = 30) => await queryRun(`DELETE FROM readings WHERE time < ?;`, (new Date().getTime()-(days*24*60*60*1000)));

export default  { 
    DATABASE_FILE,

    databaseSaveReading,
    databaseGetReadingRange,
    databaseGetAverageValues,
    databaseAddSchedule,
    databaseDeleteSchedule,
    databaseUpdateSchedule,
    databaseReplaceSchedule,
    databaseSwapPriority,
    databaseIncreasePriority,
    databaseSimplifyPriority,
    databaseProgressSchedule,
    databaseGetAllSchedules,
    databaseFetchCurrentSchedules,

    setupDatabase,
    databaseClearOldReadings,
     };

