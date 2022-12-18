//Node Version 14.8+ :: async main thread ::must be in .mjs format :: https://stackoverflow.com/questions/46515764/how-can-i-use-async-await-at-the-top-level 
import schedule from 'node-schedule';
import DATA from './data.mjs';
import DM from './data-manage.mjs';
import DATABASE from './database.mjs';
await DATABASE.setupDatabase();
import UTILITY from './utility.mjs';
import errorLights from './error-lights.mjs';
import logMessage, {sendEmail} from './communicate.mjs';
import dateFormat from 'dateformat';

const UNTIL_INDEFINITE = -1;

//FREQUENCY LOOP
let frequencyInterval;
const evaluateConditions = async (sensorAttempts = 2) => {try {
  //Validate Data

  //Sensor Evaluation
    const sensorReading = await UTILITY.evaluateSensor(sensorAttempts);
    DATA.LOCAL.statusMessage = sensorReading.statusMessage; //Resets

    const now = sensorReading.time || new Date().getTime();
    const hour = new Date(now).getHours();
    const minutes = new Date(now).getMinutes();

    const climate = UTILITY.getClimate(now);
    DATA.LOCAL.goalTemperature = climate.temperature;
    DATA.LOCAL.goalHumidity = climate.humidity;
    
    //TEMP :: Detect blank history entries 11/14/2021
      const active = UTILITY.listActive(true);
      const inactive = UTILITY.listActive(false);
      if(!active.length && !inactive.length) {
        const message = DATA.CONTROLS(c => {const settings = c.settings.map(s=>`${s.set}+${s.reason} | `);
          return `${c.name}-${c.operating ? 'ACTIVE' : 'INACTIVE'}=${settings.length}=> ${settings}\n`;});
        logMessage(true, 'Empty Active List Detected', message);
      }

    if((DATA.LOCAL.sensorErrorCode == 0) && ((now - DATA.LOCAL.timeLastReadingSaved) > (minutes*60*1000)) && ((minutes+(DATA.SETTINGS.evaluationFrequency / (60*1000))) > 57)) {
      
      await DATABASE.databaseSaveReading(sensorReading.time, sensorReading.temperature, climate.temperature, sensorReading.humidity, climate.humidity, UTILITY.listActive(true), UTILITY.listActive(false));

    }

  //Reset Control Settings
  DATA.CONTROLS.forEach((c) => { c.settings = [{reason: `Default`, set: 0, until: UNTIL_INDEFINITE}]; });

  //Climate Evaluate
  const percentMessageOffset = 0.15;
    // if(UTILITY.getHumidityPercent() > (1 + percentMessageOffset)) {DATA.LOCAL.statusMessage = `Humidity is High: ${(UTILITY.getHumidityPercent()*100).toFixed(0)}%\n` + DATA.LOCAL.statusMessage; }
    // if(UTILITY.getHumidityPercent() < (1 - percentMessageOffset)) {DATA.LOCAL.statusMessage = `Humidity is Low: ${(UTILITY.getHumidityPercent()*100).toFixed(0)}%\n` + DATA.LOCAL.statusMessage; }
    // if(UTILITY.getTemperaturePercent() > (1 + percentMessageOffset)) {DATA.LOCAL.statusMessage = `Temperature is High: ${(UTILITY.getTemperaturePercent()*100).toFixed(0)}%\n` + DATA.LOCAL.statusMessage; }
    // if(UTILITY.getTemperaturePercent() < (1 - percentMessageOffset)) {DATA.LOCAL.statusMessage = `Temperature is Low: ${(UTILITY.getTemperaturePercent()*100).toFixed(0)}%\n` + DATA.LOCAL.statusMessage; }
     
    DATA.CONTROLS.forEach((c) => { //Ordered by Increasing Priority //No Percent b/c either
      if((DATA.LOCAL.operatingHumidity > climate.humidity) && UTILITY.matchList('Dehumidify', c.types)) c.settings.unshift({reason: 'Climate Dehumidifying', set: 1, until: DATA.LOCAL.timeNextEvaluation}); 
      if((DATA.LOCAL.operatingHumidity > climate.humidity) && UTILITY.matchList('Humidify', c.types)) c.settings.unshift({reason: 'Climate Dehumidifying', set: 0, until: DATA.LOCAL.timeNextEvaluation}); 
      if((DATA.LOCAL.operatingHumidity < climate.humidity) && UTILITY.matchList('Humidify', c.types)) c.settings.unshift({reason: 'Climate Humidifying', set: 1, until: DATA.LOCAL.timeNextEvaluation}); 
      if((DATA.LOCAL.operatingHumidity < climate.humidity) && UTILITY.matchList('Dehumidify', c.types)) c.settings.unshift({reason: 'Climate Humidifying', set: 0, until: DATA.LOCAL.timeNextEvaluation});
      if((DATA.LOCAL.operatingTemperature > climate.temperature) && UTILITY.matchList('Cool', c.types)) c.settings.unshift({reason: 'Climate Cooling', set: 1, until: DATA.LOCAL.timeNextEvaluation}); 
      if((DATA.LOCAL.operatingTemperature > climate.temperature) && UTILITY.matchList('Heat', c.types)) c.settings.unshift({reason: 'Climate Cooling', set: 0, until: DATA.LOCAL.timeNextEvaluation}); 
      if((DATA.LOCAL.operatingTemperature < climate.temperature) && UTILITY.matchList('Heat', c.types)) c.settings.unshift({reason: 'Climate Heating', set: 1, until: DATA.LOCAL.timeNextEvaluation}); 
      if((DATA.LOCAL.operatingTemperature < climate.temperature) && UTILITY.matchList('Cool', c.types)) c.settings.unshift({reason: 'Climate Heating', set: 0, until: DATA.LOCAL.timeNextEvaluation}); 
//Specific, eventually able based on conditions
      if(UTILITY.getTemperaturePercent() < (0.84) && UTILITY.matchList('Extra Heat', c.types)) c.settings.unshift({reason: 'ON : Extreme Low Temperature', set: 1, until: DATA.LOCAL.timeNextEvaluation}); 

    });

  //Types on/off & Day/NightOverrides
  DATA.CONTROLS.forEach((c) => { //Ordered by Increasing Priority
    if(UTILITY.matchList('Day', c.types) && !UTILITY.isDay(now)) c.settings.unshift({reason: 'Nighttime', set: 0, until: (new Date(now).setHours(DATA.SETTINGS.dayHourStart, 0, 0) + ((hour >= DATA.SETTINGS.dayHourStart) ? (24*60*60*1000) : 0))}); 
    if(UTILITY.matchList('Night', c.types) && UTILITY.isDay(now)) c.settings.unshift({reason: 'Daytime', set: 0, until: (new Date(now).setHours(DATA.SETTINGS.nightHourStart, 0, 0) + ((hour >= DATA.SETTINGS.nightHourStart) ? (24*60*60*1000) : 0))}); 
    if(UTILITY.matchList('On', c.types)) c.settings.unshift({reason: 'ON Override', set: 1, until: UNTIL_INDEFINITE}); 
    if(UTILITY.matchList('Off', c.types)) c.settings.unshift({reason: 'OFF Override', set: 0, until: UNTIL_INDEFINITE}); 
  });

  //Schedule Overrides
  const currentNextEvaluation = DATA.LOCAL.timeNextEvaluation; 
  const schedules = await DATABASE.databaseFetchCurrentSchedules(); //sorted priority ascending
  schedules.forEach((s,i) => {    //DATA.LOCAL.statusMessage = /(toggle|immediate|schedule)/i.test(s.title) ? `${s.title}\n` : `Schedule ${s.title}\n` + DATA.LOCAL.statusMessage; 
    DATA.CONTROLS.forEach((c)=>{ const currentSetting = {reason: s.title.match(/(toggle|immediate|schedule)/i) ? `${s.title}` : `Schedule ${s.title}\n`, set: s.set ? 1 : 0, until: (((s.time + s.duration) < DATA.LOCAL.timeNextEvaluation) && (s.duration < DATA.SETTINGS.evaluationFrequency)) ? (now + s.duration) : (s.time + s.duration)};
      if(UTILITY.matchList(c.name, s.names)) c.settings.unshift(currentSetting);
      if(currentSetting.until < (DATA.LOCAL.timeNextEvaluation - (2*60*60*1000))) {
        setTimeout(()=>{if(currentNextEvaluation == DATA.LOCAL.timeNextEvaluation && c.settings.length >= 2) c.settings.filter(s=>s!=currentSetting)}, (currentSetting.until - now)); 
      } 
    });
    if(DATA.LOCAL.timeNextEvaluation > (s.time + s.duration)) DATABASE.databaseProgressSchedule(s.priority, s.time, s.repeat);   
  });
 
  //Limit Email Notifications 
  //Maximum Temperature
  if(DATA.LOCAL.operatingTemperature > DATA.SETTINGS.maximumTemperature) { logMessage((DATA.LOCAL.maximumTemperatureErrorCode == 2 || (DATA.LOCAL.maximumTemperatureErrorCode % 3 == 2)), 'SEVERE HIGH TEMPERATURE -> IMMEDIATE ACTION REQUIRED',
    `${UTILITY.getFahrenheit(DATA.LOCAL.operatingTemperature).toFixed(2)}-F = ${DATA.LOCAL.operatingTemperature.toFixed(2)}-C  > ${DATA.SETTINGS.maximumTemperature.toFixed(2)}-C = ${UTILITY.getFahrenheit(DATA.SETTINGS.maximumTemperature).toFixed(2)}-F`);
    DATA.LOCAL.maximumTemperatureErrorCode += 1; 
    DATA.MAX_TEMP_CONTROL.setting = 1;
    errorLights('flash', 5);
    DATA.LOCAL.statusMessage = 'Maximum Temperature Exceeded -> Responding accordingly by enabling \'Cool\' and disabling everything else.\n' + DATA.LOCAL.statusMessage; 
    DATA.CONTROLS.forEach((c) => { //Rewrite
      c.settings.unshift({reason: 'OFF : Severe High Temperature', set: 0, until: now}); 
      if(UTILITY.matchList('Cool', c.types, true)) c.settings.unshift({reason: 'ON : Severe High Temperature', set: 1, until: now}); 
    });
  } else { if(DATA.LOCAL.maximumTemperatureErrorCode == 1) logMessage(DATA.LOCAL.maximumTemperatureErrorCode > 2, 'Temperature Reestablished from Maximum', `${UTILITY.getFahrenheit(DATA.LOCAL.operatingTemperature).toFixed(2)}-F = ${DATA.LOCAL.operatingTemperature.toFixed(2)}-C `);
    DATA.LOCAL.maximumTemperatureErrorCode = 0;  
    DATA.MAX_TEMP_CONTROL.setting = 0;  
    errorLights('reset');
  }
  //Minimum Temperature
  if(DATA.LOCAL.operatingTemperature < DATA.SETTINGS.minimumTemperature) { logMessage((DATA.LOCAL.minimumTemperatureErrorCode == 2 || (DATA.LOCAL.minimumTemperatureErrorCode % 3 == 2)), 'SEVERE LOW TEMPERATURE -> IMMEDIATE ACTION REQUIRED',
    `${UTILITY.getFahrenheit(DATA.LOCAL.operatingTemperature).toFixed(2)}-F = ${DATA.LOCAL.operatingTemperature.toFixed(2)}-C  < ${DATA.SETTINGS.minimumTemperature.toFixed(2)}-C = ${UTILITY.getFahrenheit(DATA.SETTINGS.minimumTemperature).toFixed(2)}-F`);
    DATA.LOCAL.minimumTemperatureErrorCode += 1; 
    DATA.MIN_TEMP_CONTROL.setting = 1;
    errorLights('flash', 5);
    DATA.LOCAL.statusMessage = 'Minimum Temperature Exceeded -> Responding accordingly by enabling \'Heat\' and disabling \'Cool\'\n' + DATA.LOCAL.statusMessage; 
    DATA.CONTROLS.forEach((c) => { //Rewrite
      if(UTILITY.matchList('Heat', c.types, true)) c.settings.unshift({reason: 'ON : Severe Low Temperature', set: 1, until: now}); 
      if(UTILITY.matchList('Cool', c.types, true)) c.settings.unshift({reason: 'OFF : Severe Low Temperature', set: 0, until: now}); 
    }); 
  } else { if(DATA.LOCAL.minimumTemperatureErrorCode == 1) logMessage(DATA.LOCAL.minimumTemperatureErrorCode > 2, 'Temperature Reestablished from Minimum', `${UTILITY.getFahrenheit(DATA.LOCAL.operatingTemperature).toFixed(2)}-F = ${DATA.LOCAL.operatingTemperature.toFixed(2)}-C `);
    DATA.LOCAL.minimumTemperatureErrorCode = 0;
    DATA.MIN_TEMP_CONTROL.setting = 0; 
    errorLights('reset');
  }
  //Maximum Humidity
  if(DATA.LOCAL.operatingHumidity > DATA.SETTINGS.maximumHumidity) { logMessage((DATA.LOCAL.maximumHumidityErrorCode == 2 || (DATA.LOCAL.maximumHumidityErrorCode % 2 == 2)), 'SEVERE HIGH HUMIDITY -> IMMEDIATE ACTION REQUIRED',
    `${DATA.LOCAL.operatingHumidity.toFixed(2)}%  > ${DATA.SETTINGS.maximumHumidity.toFixed(2)}%`);
    DATA.LOCAL.maximumHumidityErrorCode += 1;
    DATA.HUMIDITY_CONTROL.setting = 1; 
    errorLights('flash', 5);
    DATA.LOCAL.statusMessage = 'Maximum Humidity Exceeded -> Responding accordingly by enabling \'Dehumidify\' and disabling \'Humidify\'\n' + DATA.LOCAL.statusMessage;  
    DATA.CONTROLS.forEach((c) => { //Rewrite
      if(UTILITY.matchList('Dehumidify', c.types, true)) c.settings.unshift({reason: 'ON : Severe High Humidity', set: 1, until: now}); 
      if(UTILITY.matchList('Humidify', c.types, true)) c.settings.unshift({reason: 'OFF : Severe High Humidity', set: 0, until: now}); 
    });   
  } else { if(DATA.LOCAL.maximumHumidityErrorCode) logMessage(DATA.LOCAL.maximumHumidityErrorCode > 2, 'Humidity Reestablished', `${DATA.LOCAL.operatingHumidity.toFixed(2)}% `);
    DATA.LOCAL.maximumHumidityErrorCode = 0;
    DATA.HUMIDITY_CONTROL.setting = 0;
    errorLights('reset');
  } 
  //Minimum Humidity
  if(DATA.LOCAL.operatingHumidity < DATA.SETTINGS.minimumHumidity) { logMessage((DATA.LOCAL.minimumHumidityErrorCode == 2 || (DATA.LOCAL.minimumHumidityErrorCode % 3 == 2)), 'SEVERE LOW HUMIDITY -> IMMEDIATE ACTION REQUIRED',
    `${DATA.LOCAL.operatingHumidity.toFixed(2)}%  < ${DATA.SETTINGS.minimumHumidity.toFixed(2)}%`);
    DATA.LOCAL.minimumHumidityErrorCode += 1; 
    DATA.HUMIDITY_CONTROL.setting = 1;
    errorLights('flash', 5);
    DATA.LOCAL.statusMessage = 'Minimum Humidity Exceeded -> Responding accordingly by enabling \'Humidify\' and disabling \'Dehumidify\'\n' + DATA.LOCAL.statusMessage; 
    DATA.CONTROLS.forEach((c) => { //Rewrite
      if(UTILITY.matchList('Humidify', c.types, true)) c.settings.unshift({reason: 'ON : Severe Low Humidity', set: 1, until: now}); 
      if(UTILITY.matchList('Dehumidify', c.types, true)) c.settings.unshift({reason: 'OFF : Severe Low Humidity', set: 0, until: now}); 
    });  
  } else { if(DATA.LOCAL.minimumHumidityErrorCode) logMessage(DATA.LOCAL.minimumHumidityErrorCode > 2, 'Humidity Reestablished', `${DATA.LOCAL.operatingHumidity.toFixed(2)}% `);
    DATA.LOCAL.minimumHumidityErrorCode = 0;  
    DATA.HUMIDITY_CONTROL.setting = 0;
    errorLights('reset');
  }

  //Timers for short Durations
  // DATA.CONTROLS.forEach(c => { if((c.settings.length >= 2) && (c.settings[0].until > 0) && ((c.settings[0].until + (0.1 * DATA.SETTINGS.evaluationFrequency)) < DATA.LOCAL.timeNextEvaluation) && (c.settings[0].set != c.settings[1].set)) {
  //   const current = DATA.LOCAL.timeNextEvaluation;
  //   setTimeout(()=>{if(current == DATA.LOCAL.timeNextEvaluation && c.settings.length >= 2) c.settings.shift();}, (now - c.settings[0].until)); } }); //Verify from most previous evaluationLoop and settings length

  // UTILITY.consoleCurrentSituation();
  errorLights('reset');
  return true;
} catch(error) {await logMessage(true, 'ATTENTION :: EXCEPTION',`Frequency Condition Evaluation Error`, '-> Resetting Settings as Possible Fix', error);
 await DM.resetSettings();}  return false;
}

const restartFrequencyLoop = () => {
  clearInterval(frequencyInterval);
  DATA.LOCAL.timeNextEvaluation = (new Date().getTime() + DATA.SETTINGS.evaluationFrequency);
  evaluateConditions();
  frequencyInterval = setInterval(async () => {  DATA.LOCAL.timeNextEvaluation = (new Date().getTime() + DATA.SETTINGS.evaluationFrequency); await evaluateConditions();}, DATA.SETTINGS.evaluationFrequency || 300000);
  DATA.LOCAL.frequencyActive = true;
  return true;
}
const delayFrequencyLoop = (ms = DATA.SETTINGS.evaluationFrequency) => {
  DATA.LOCAL.frequencyActive = false;
  DATA.LOCAL.timeNextEvaluation = new Date().getTime() + ms;
  DATA.LOCAL.statusMessage = `HOLDING evaluation for: [${UTILITY.getDuration(ms)}] until: ${dateFormat(DATA.LOCAL.timeNextEvaluation, 'mmm-d, H:MM',)}\n` + DATA.LOCAL.statusMessage; 
  clearInterval(frequencyInterval);
  errorLights('on');
  setTimeout(()=>restartFrequencyLoop(), ms);
  return true;
}
// restartFrequencyLoop();


//CONTROL LOOP
let controlInterval;
const restartControlLoop = () => {
  clearInterval(controlInterval);
  if(DATA.CONTROL_SERVER) { 
    controlInterval = setInterval(async () => {
      try {        
        DATA.CONTROLS.forEach((c) => {
          if(c.settings.length > 0) {
              if(c.settings[0].set != c.operating) 
                  c.pin.writeSync((c.operating = c.settings[0].set) ? 1 : 0);
          } else { logMessage(true,  `Error Control Settings Cleared`, `${c.id} | ${c.name} => Failed to Have Settings List -> unable to set correctly, will disable for now`, `${c.settings}`);
                  c.settings = [{reason: 'ERROR -> Defaulting', set: 0, until: UNTIL_INDEFINITE}];  c.operating = 0;  c.pin.writeSync(0); 
        }});

        // if(DATA.SENSOR_CONTROL.setting != DATA.SENSOR_CONTROL.operating)
        //     DATA.SENSOR_CONTROL.pin.writeSync((DATA.SENSOR_CONTROL.operating = DATA.SENSOR_CONTROL.setting) ? 1 : 0);
          
      } catch(error) {logMessage(true, `Control Loop Error`, error);}  
    }, 1000);
  } return true;
}
// restartControlLoop();

//https://www.npmjs.com/package/node-schedule
/*    *    *    *    *    *
┬    ┬    ┬    ┬    ┬    ┬
│    │    │    │    │    │
│    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
│    │    │    │    └───── month (1 - 12)
│    │    │    └────────── day of month (1 - 31)
│    │    └─────────────── hour (0 - 23)
│    └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59, OPTIONAL) */
//    DATA.updateRegularityOptions = ["None", "Hour", "Day", "Week", "Month"];
let updateSchedule;
const updateStatusUpdate = () => { if(updateSchedule) updateSchedule.cancel();
  let time;
  if(DATA.SETTINGS.updateRegularity == 'Hour') time = '0 0 * * * *';
  if(DATA.SETTINGS.updateRegularity == 'Day') time = '0 0 5 * * *';
  if(DATA.SETTINGS.updateRegularity == 'Week') time = '0 0 5 * * 0';
  if(DATA.SETTINGS.updateRegularity == 'Month') time = '0 0 5 0 * *';
  if(time) updateSchedule = schedule.scheduleJob(time, async () =>{if(!await sendEmail(undefined, `${DATA.SETTINGS.updateRegularity} Status Report`)) {
    await logMessage('FAILED TO SEND SCHEDULED STATUS UPDATE', 'COMMENCING PI RESTART');
    setTimeout(() => exec('sudo reboot'), 5000);
  }});
}
updateStatusUpdate();

//Update Notifications :: Daily at 5AMca
schedule.scheduleJob('0 0 5 * * *', () =>{let message = '';
  if(DATA.LOCAL.sensorErrorCode > 1) message += 'Notice: Sensor Not Reading';
  if(DATA.LOCAL.timeNextEvaluation > (new Date().getTime() + DATA.SETTINGS.evaluationFrequency)) message += `Reminder: Condition Evaluating is Holding until: ${dateFormat(DATA.LOCAL.timeNextEvaluation, 'dddd, m-d-yyyy H:MM',)}\n`;
  if(!DATA.SETTINGS.accessDatabase) message += 'Reminder: Database Access is Disabled\n';
  if(message != '') logMessage(true, message, 'DAILY NOTICE');
  errorLights('reset');
});
//Clear Data logs :: Monthly
schedule.scheduleJob('0 0 4 1 * *', () =>DM.clearOldLogs());
//Condense Schedule Priority Numbering Daily
schedule.scheduleJob('0 15 4 * * *', () =>DATABASE.databaseSimplifyPriority());

//Feed Flies
schedule.scheduleJob('0 0 9 * * *', () => {

  if(DATA.FEED_SCHEDULE != undefined && DATA.FEED_SCHEDULE.length > 0) {

    DATA.FEED_SCHEDULE.forEach(entry => {

      if(entry.day === new Date().getDate()) { //TODO: Based on Day of the Month, update to date with UI
        UTILITY.executeFeed(entry.duration);
      }

    });

  } else {
    logMessage("Feed Schedule Not Identified; executing Feed routine");
    UTILITY.executeFeed();
  }   
  
});

export default  {
  evaluateConditions,
  restartFrequencyLoop, 
  delayFrequencyLoop,
  restartControlLoop,
  updateStatusUpdate,
}