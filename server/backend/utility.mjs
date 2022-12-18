
import dateFormat from 'dateformat';
import DATA from './data.mjs';
import DATABASE from './database.mjs';
import errorLights from './error-lights.mjs';
import logMessage from './communicate.mjs';

/******************************** */
/* ******      UTILITY      ***** */
/******************************** */
const getFahrenheit = (celsius) => (celsius* (9.0/5.0)) + 32;

const isDay = (now) => {const hour = new Date(now || new Date()).getHours(); return (hour >= DATA.SETTINGS.dayHourStart && hour < DATA.SETTINGS.nightHourStart)};

const getClimate = (now) => {const hour = new Date(now || new Date()).getHours();   let climate; for(var i=0; i<DATA.SETTINGS.CLIMATE.length; i++) { if(hour == DATA.SETTINGS.CLIMATE[i].hour) { climate = DATA.SETTINGS.CLIMATE[i]; break;}}
    if(!climate) { logMessage(true, 'File Corruption', `# Climate Settings are Corrupted: unable to find: ${hour}:00`); return {hour: hour, temperature: DATA.DEFAULT_TEMPERATURE, humidity: DEFAULT_HUMIDITY}; }
    else return climate; }

const delayPromise = (ms) => new Promise((resolve, reject) => setTimeout(()=>resolve(), ms)); 

const getDuration = (ms) => `${Math.floor(ms/60000)}:${Math.abs(ms)%60000<10000?'0':''}${Math.floor((Math.abs(ms)%60000)/1000)}`;

const getTemperaturePercent = (current = DATA.LOCAL.operatingTemperature, goal = DATA.LOCAL.goalTemperature, min = DATA.SETTINGS.minimumTemperature, max = DATA.SETTINGS.maximumTemperature) => (current >= max) ? 2 + ((current-max) * (1/(max-min))) : (current <= min) ? ((current-min) * (1/(max-min))) : 1 - ((goal-current) * (1/(max-min))); 
const getHumidityPercent = (current = DATA.LOCAL.operatingHumidity, goal = DATA.LOCAL.goalHumidity, min = DATA.SETTINGS.minimumHumidity, max = DATA.SETTINGS.maximumHumidity) => (current >= max) ? 2 + ((current-max) * (1/(max-min))) : (current <= min) ? ((current-min) * (1/(max-min))) : 1 - ((goal-current) * (1/(max-min))); 

const listActive = (active = true, namesOnly = false) => {const list = [];   DATA.CONTROLS.forEach(c => { if(c.settings.length && c.settings[0].set == active)    list.push(namesOnly ? c.name : {name: c.name, settings: c.settings});});    return list;}

const printActive = (active = true, maxReasons = 0) => {const list = [];   DATA.CONTROLS.forEach(c => { if(c.settings.length > 0 && c.settings[0].set == active) {  const reasonsList = [] ;
    for(var i=0; (i<maxReasons && i<c.settings.length); i++){ reasonsList.push(`${c.settings[i].set ? 'ON' : 'OFF'} -> ${c.settings[i].reason}`)}
    list.push(maxReasons <= 0 ? c.name : `${c.name} = [${reasonsList.join(' | ')}]`);
}});    return list.toString().replace(/,/g, ' * ');}

const matchList = (str = '', list, include = false) => { for(var i=0; i<list.length; i++){ if(str.toLowerCase().replace(/ /g, '') == list[i].toLowerCase().replace(/ /g, '') || (include && list[i].toLowerCase().split(' ').includes(str.toLowerCase()))) return true; } return false; }

const getCurrentSituation = () => { 
  return `[${dateFormat(DATA.LOCAL.timeLastReading, 'm/d/yy HH:MM:ss')}] | Temperature: ${DATA.LOCAL.operatingTemperature.toFixed(2)}-C = ${getFahrenheit(DATA.LOCAL.operatingTemperature).toFixed(2)}-F { ${((DATA.LOCAL.operatingTemperature/DATA.LOCAL.goalTemperature)*100).toFixed()}% } | Humidity: ${DATA.LOCAL.operatingHumidity.toFixed(2)}% { ${((DATA.LOCAL.operatingHumidity/DATA.LOCAL.goalHumidity)*100).toFixed()}% }
    Status: ${DATA.LOCAL.statusMessage}
        Operating: ${printActive(true, 3)} 
        Disabled: ${printActive(false, 3)} `;
}

const consoleCurrentSituation = () => { 
    console.log(`\n[${dateFormat(DATA.LOCAL.timeLastReading, 'm/d/yy HH:MM:ss')}] | Temperature: ${DATA.LOCAL.operatingTemperature.toFixed(2)}-C = ${getFahrenheit(DATA.LOCAL.operatingTemperature).toFixed(2)}-F { ${((DATA.LOCAL.operatingTemperature/DATA.LOCAL.goalTemperature)*100).toFixed()}% } | Humidity: ${DATA.LOCAL.operatingHumidity.toFixed(2)}% { ${((DATA.LOCAL.operatingHumidity/DATA.LOCAL.goalHumidity)*100).toFixed()}% } \nStatus: ${DATA.LOCAL.statusMessage.match(/[^\r\n]+/g).reverse().toString()}`);
    console.table([...DATA.CONTROLS.map(c => [c.name, c.settings[0].set ? 'ON' : 'OFF', `${[...c.settings.map(s => `${s.reason}->${s.set ? 'ON' : 'OFF'}`)].toString()}`])]);
    return true;
}

/******************************** */
/* ******  Evaluate SENSOR  ***** */
/******************************** */


const evaluateSensor = (attempts = 5, testingMode = false) => new Promise(async (resolve, reject) => { try{ try{ 
    DATA.LOCAL.statusMessage = testingMode ? 'Testing Sensor' : 'Evaluating Sensor';
    errorLights(testingMode ? 'flash' : 'on');
    if(!DATA.CONTROL_SERVER || DATA.SETTINGS.sensorMode == 'Off') throw 'SENSOR Mode == \'OFF\' -> Unable to Read Sensor';

    //Activate & Initialization :: Ignore Errors
    if(DATA.SENSOR_CONTROL.operating != 1) { 
        await DATA.SENSOR_CONTROL.pin.writeSync(DATA.SENSOR_CONTROL.operating = 1);
        if(!testingMode) await delayPromise(10000);
        if(DATA.SETTINGS.sensorType=='DHT22') { await DATA.dht22Sensor.initialize(22, DATA.SENSOR_READ_PIN);
            await DATA.dht22Sensor.setMaxRetries(10);
           }     
        if(DATA.SETTINGS.sensorType == 'BME280') await new Promise((res, rej)=>DATA.bme280Sensor.init().then(()=>res())
                .catch((err) => {logMessage(`BME280 initialization failed: ${err} \n[Sensor is ${DATA.SENSOR_CONTROL.operating ? 'ON' : 'OFF'}]\n\t-> Attempting to Read Anyways`); res();}));
        if(!testingMode) await delayPromise(5000);
    } 
    // Conducting Sensor Reading
    if(DATA.SETTINGS.sensorType == 'DHT22') await new Promise((res, rej)=>DATA.dht22Sensor.read(22, DATA.SENSOR_READ_PIN, (err, temperature, humidity) => { //https://www.npmjs.com/package/node-dht-sensor
            DATA.LOCAL.timeLastReading = new Date().getTime();
            if(!err) {
                DATA.LOCAL.operatingTemperature = Math.floor(temperature * 100) / 100;
                DATA.LOCAL.operatingHumidity = Math.floor(humidity * 100) / 100;
                res(); 
            } else rej(err);
            })).catch((err) => {throw (err);});
    else if(DATA.SETTINGS.sensorType == 'BME280')   await DATA.bme280Sensor.readSensorData().then((value)=>{
            DATA.LOCAL.timeLastReading = new Date().getTime();
            DATA.LOCAL.operatingTemperature = Math.floor(value.temperature_C * 100) / 100;
            DATA.LOCAL.operatingHumidity = Math.floor(value.humidity * 100) / 100;
            }).catch((err) => {throw (err);});
    else throw `Invalid Sensor Type: [${DATA.SETTINGS.sensorType}] -> Unable to execute Sensor Evaluation`;

    //Evaluate
    if(testingMode) resolve({time: DATA.LOCAL.timeLastReading, temperature: DATA.LOCAL.operatingTemperature, humidity: DATA.LOCAL.operatingHumidity, statusMessage: 'Successful Sensor Reading', error: undefined});
    else {  
            if(DATA.LOCAL.operatingTemperature > 40 || DATA.LOCAL.operatingTemperature < 0) throw `Detected Invalid Temperature Reading: ${DATA.LOCAL.operatingTemperature}`;
            if(DATA.LOCAL.operatingHumidity < 10) throw `Detected Invalid Humidity Reading: ${DATA.LOCAL.operatingHumidity}`;
            if(DATA.LOCAL.sensorErrorCode == 2) logMessage(true, 'Sensor Reconnected', `${DATA.SETTINGS.sensorType} Sensor in ${DATA.SETTINGS.sensorMode} Mode | [Sensor is currently ${DATA.SENSOR_CONTROL.operating ? 'ON' : 'OFF'}]`, `Operating Status: Operating with Current Conditions`);
            DATA.LOCAL.sensorErrorCode = 0;
        resolve({time: DATA.LOCAL.timeLastReading, temperature: DATA.LOCAL.operatingTemperature, humidity: DATA.LOCAL.operatingHumidity, statusMessage: 'Operating with Current Conditions', error: undefined});

     //Clean-up :: Synchronously        
        errorLights('reset');
        if(!testingMode) await delayPromise(5000);
        if(!testingMode && (DATA.SETTINGS.sensorMode == 'Proactive' || DATA.SETTINGS.sensorMode == 'Off' )) await DATA.SENSOR_CONTROL.pin.writeSync(DATA.SENSOR_CONTROL.operating = 0);
    }
} catch(error) { 
    if(testingMode) 
        resolve({time: DATA.LOCAL.timeLastReading, temperature: undefined, humidity: undefined, statusMessage: 'Failed Sensor Reading', error: error});
    else {
        logMessage(`[#${attempts}] SENSOR ERROR [Sensor is ${DATA.SENSOR_CONTROL.operating ? 'ON' : 'OFF'}] :: ${error}`); 
        if(attempts > 1) { 
            await errorLights('flash', 3);         
            await evaluateSensor(attempts - 1).then(r => {resolve(r);});  //Repeat Failed Reading

        } else { //Return Hourly Average or default
                const replacement = await DATABASE.databaseGetAverageValues();
                DATA.LOCAL.operatingTemperature = replacement.temperature;
                DATA.LOCAL.operatingHumidity = replacement.humidity;
                if(DATA.LOCAL.sensorErrorCode == 1) logMessage(true, 'Sensor Disconnected', `${DATA.SETTINGS.sensorType} Sensor Failed Reading in ${DATA.SETTINGS.sensorMode} Mode | [Sensor is currently ${DATA.SENSOR_CONTROL.operating ? 'ON' : 'OFF'}]`,`Failed with Error: ${error}`, `Operating with ${replacement.statusMessage}`);
                DATA.LOCAL.sensorErrorCode = (DATA.LOCAL.sensorErrorCode >= 1) ? 2 : 1;
                resolve({temperature: replacement.temperature, humidity: replacement.humidity, statusMessage: `Operating with ${replacement.statusMessage}`, error: error});

            //Clean-up :: Synchronously
                errorLights('bounce');
                if(!testingMode) await delayPromise(5000);
                if(!testingMode && DATA.SETTINGS.sensorMode != 'On') await DATA.SENSOR_CONTROL.pin.writeSync(DATA.SENSOR_CONTROL.operating = 0);
        }} 
    return reject(null);
    }
} catch(er) {logMessage(true, 'Extra Sensor Evaluation Catch -> Resolving all Zeros', er); return resolve({time: 0, temperature: 0, humidity: 0, statusMessage: 'Severe Sensor Error -> Zero Values', error: er});}
});


/******************************** */
/* ******  FEED FLIES  ***** */
/******************************** */

const feedOpen = async(duration = 1700) => {
    //Lid Direction
    await DATA.FEED_MOTOR_DIRECTION.pin.writeSync(DATA.FEED_MOTOR_DIRECTION.operating = 1);

    //Turn On Pressure Sensor & Start Motor Power
    await DATA.FEED_POWER.pin.writeSync(DATA.FEED_POWER.operating = 1);

    //Allow Flies to Escape
    await delayPromise(duration);

    //Turn Off Power
    await DATA.FEED_POWER.pin.writeSync(DATA.FEED_POWER.operating = 0);

    logMessage("Fly Feeding moved to OPEN position");
}

const feedClose = async(duration = 1700) => {
    //Lid Direction
    await DATA.FEED_MOTOR_DIRECTION.pin.writeSync(DATA.FEED_MOTOR_DIRECTION.operating = 0);

    //Turn On Pressure Sensor & Start Motor Power
    await DATA.FEED_POWER.pin.writeSync(DATA.FEED_POWER.operating = 1);

    //Allow Flies to Escape
    await delayPromise(duration);

    //Turn Off Power
    await DATA.FEED_POWER.pin.writeSync(DATA.FEED_POWER.operating = 0);

    logMessage("Fly Feeding moved to CLOSE position");
}

const feedStop = async() => {
    //Turn Off Power
    await DATA.FEED_POWER.pin.writeSync(DATA.FEED_POWER.operating = 0);

    logMessage("Fly Feeding power STOP immediately at: ", new Date().getTime());
}


const executeFeed = (duration = 17000) => new Promise(async (resolve, reject) => { try{ 

    //Lid Direction
    await DATA.FEED_MOTOR_DIRECTION.pin.writeSync(DATA.FEED_MOTOR_DIRECTION.operating = 1);

    //Turn On Pressure Sensor & Start Motor Power
    await DATA.FEED_POWER.pin.writeSync(DATA.FEED_POWER.operating = 1);

    //Allow Flies to Escape
    await delayPromise(duration);

    //Lower Lid

    const timeStart = new Date().getTime();
    const maxTime = 7800;

    //Lid Direction
    await DATA.FEED_MOTOR_DIRECTION.pin.writeSync(DATA.FEED_MOTOR_DIRECTION.operating = 0);

    while(DATA.FEED_SENSOR.pin.readSync() == 0) {

        if((new Date().getTime() - timeStart) > maxTime) {
            logMessage(true, "Fly Feed | Max Timeout on lid lower.");
            break;
        }

        delayPromise(200);
    }


    await DATA.FEED_POWER.pin.writeSync(DATA.FEED_POWER.operating = 0);
    await DATA.FEED_MOTOR_DIRECTION.pin.writeSync(DATA.FEED_MOTOR_DIRECTION.operating = 1);
    logMessage(true, "Successfully Feed Flies for:", duration);
    resolve("Success Feeding");

} catch(er) {logMessage(true, 'Feeding Flies - ERROR:', er); return resolve(true);}
});


export default  {

    delayPromise,
    listActive,
    printActive,
    getDuration,
    getTemperaturePercent,
    getHumidityPercent,
    isDay,
    getClimate,
    getFahrenheit,
    matchList,
    getCurrentSituation,
    consoleCurrentSituation,    
    evaluateSensor,
    executeFeed,
    feedClose,
    feedOpen,
    feedStop
        
}