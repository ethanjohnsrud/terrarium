import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
const __dirname = path.resolve();
// import NGROK from 'ngrok';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config(); 
import { exec } from 'child_process';
import dateFormat from 'dateformat';
import DATA from './backend/data.mjs';
import DM from './backend/data-manage.mjs';
import DATABASE from './backend/database.mjs';
import UTILITY from './backend/utility.mjs';
import errorLights from './backend/error-lights.mjs';
import logMessage, {sendEmail} from './backend/communicate.mjs';
import SERVER from './backend/server.mjs';


/***************************** */
/* ****  Server SETUP    ***** */
/***************************** */
const HTTP_SERVER_PORT = process.env.HTTP_SERVER_PORT || 4700;
const HTTPS_SERVER_PORT = process.env.HTTPS_SERVER_PORT || 4750;
const apiServer = express();
//Open SSL for HTTPS
const SERVER_KEY = fs.readFileSync('./key.pem');
const SERVER_CERT = fs.readFileSync('./cert.pem');

//Middleware :: gives access to local files
apiServer.use(express.static(path.join(__dirname, 'frontend', 'build')));

apiServer.use(express.json());  //NEEDED to read request.body || caused error /log: PayloadTooLargeError: request entity too large

apiServer.use(cors());


/** bodyParser.urlencoded(options)
 * Parses the text as URL encoded data (which is how browsers tend to send form data from regular forms set to POST)
 * and exposes the resulting object (containing the keys and values) on request.body
 */
//  apiServer.use(bodyParser.urlencoded({
//     extended: true
// }));

/**bodyParser.json(options)
 * Parses the text as JSON and exposes the resulting object on request.body.
 */
// apiServer.use(bodyParser.json());

/***************************** */
/* *** SETUP PUBLIC TUNNEL *** */
/***************************** */
// if(process.env.PUBLIC_URL != undefined && process.env.PUBLIC_URL != 'NULL')
    // DATA.LOCAL.publicURL = process.env.PUBLIC_URL;
// else {
    // await NGROK.authtoken(process.env.NGROK_AUTHENTICATION_TOKEN); //Set in ngrok config file and use for all tunnels on pi
    // DATA.LOCAL.publicURL = await NGROK.connect(SERVER_PORT);
    // console.log(`NGROK Port Tunneling: ${DATA.LOCAL.publicURL}`);
// }
/***************************** */
/* ******     ROUTES     ***** */
/***************************** */

apiServer.get('/', function(request, response) {
    // response.redirect(`${request.protocol}://${request.get('host')}${request.originalUrl}`.replace(API_PORT, DISPLAY_PORT));
    response.sendFile(path.join(__dirname, 'frontend', 'build', 'index.html'));
});

apiServer.get('/image-landscape', (request, response) => {
    const images = fs.readdirSync('./Screensavers-Landscape');
    response.header("Access-Control-Allow-Origin", "*");
    response.status(200).sendFile(path.join(__dirname,'/Screensavers-Landscape/',images[Math.floor(Math.random() * images.length)]));
    //__dirname : It will resolve to your project folder.
});

apiServer.get('/image-portrait', (request, response) => {
    const images = fs.readdirSync('./Screensavers-Portrait');
    response.header("Access-Control-Allow-Origin", "*");
    response.status(200).sendFile(path.join(__dirname,'/Screensavers-Portrait/',images[Math.floor(Math.random() * images.length)]));
    //__dirname : It will resolve to your project folder.
});

apiServer.get('/data', async (request, response) => {
    const controlTypes = await DM.getControlTypes();
    const topSchedules = [...DATA.CONTROLS.filter((c, i, arr) => (RegExp(/^Schedule /).test(c.settings[0].reason))).map(c => RegExp(/^Schedule (.+)/).exec(c.settings[0].reason)[1])];
    response.status(200).send(JSON.stringify({
        ...DATA.SETTINGS,
        CONTROLS: DATA.CONTROLS,
        ...DATA.LOCAL,
        sensorTypes: DATA.sensorTypes,
        sensorModes: DATA.sensorModes,
        updateRegularityOptions: DATA.updateRegularityOptions,
        controlTypes: controlTypes,
        operatingSchedules: [...topSchedules.filter((t, i)=> topSchedules.indexOf(t) === i)],
    }));
});

apiServer.get('/data-schedules', async (request, response) => {
    const schedules = await DATABASE.databaseGetAllSchedules();
    response.status(200).send({
        schedules: schedules,
    });
});

apiServer.get('/data-climate', async (request, response) => {
    const CLIMATE =  await Promise.all(DATA.SETTINGS.CLIMATE.map(async(c,i) => { const average = await DATABASE.databaseGetAverageValues(c.hour, 100, 0); 
        return {
            hour: c.hour,
            temperature: c.temperature,
            temperatureAverage: await average.temperature,
            humidity: c.humidity,
            humidityAverage: await average.humidity,
        };})); 
    response.status(200).send({
        climate: await CLIMATE,
        minimumTemperature: DATA.SETTINGS.minimumTemperature,
        maximumTemperature: DATA.SETTINGS.maximumTemperature,
        minimumHumidity: DATA.SETTINGS.minimumHumidity,
        maximumHumidity: DATA.SETTINGS.maximumHumidity,
    });
});

apiServer.get('/data-history', async (request, response) => {
    response.status(200).send(
        await DATABASE.databaseGetReadingRange((new Date().getTime()-(10*24*60*60*1000)), undefined, true)
    );
});

/* Expected PUT Request with JSON Body, optional Parameters:
        {"fileName": "log.txt" //Will Return Previous Log
        "fileNumber": "3" //Will Return 3 logs older than log.txt
        } //Blank or Error Returns log.txt
*/
apiServer.put('/log', (request, response) => { try{
    const LOG_FILE_NAME = DATA.LOG_FILE.substring(2);
    let selectedFileName;
    let fileName = request.body.fileName && request.body.fileName.length ? request.body.fileName : undefined;
    let fileNumber = getInt(request.body.fileNumber, 0, undefined, 0);

    if(fileName || fileNumber) {
        let logFileCount = 0;
        let foundCurrentFile = (fileName == LOG_FILE_NAME) ? true : false;
        
        const records = fs.readdirSync('./Records').reverse();

        for(var i=0; i<records.length; i++) {
            if(records[i].includes(LOG_FILE_NAME)) {
            //Find Previous Log File by Numbers Ago
                if(fileNumber) { 
                        logFileCount++;
                        if(fileNumber === logFileCount) {
                            selectedFileName = records[i];
                            break;
                        }
                } else if(fileName) {  
                //Find The Previous Log File
                    if(!foundCurrentFile && records[i] == fileName) 
                        foundCurrentFile = true;

                //Match after finding current
                    else if(foundCurrentFile & records[i] != LOG_FILE_NAME){ 
                        selectedFileName = records[i]; 
                        break;
                    } 
                }
            }
        }
    }

    var filePath = (selectedFileName) ? path.join(__dirname, 'Records', selectedFileName) : path.join(__dirname, DATA.LOG_FILE);
    var stat = fs.statSync(filePath);
    // response.header("Access-Control-Allow-Origin", "*");
    response.header('Access-Control-Expose-Headers', "*"); //https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Expose-Headers
    response.setHeader('Content-Name', selectedFileName || LOG_FILE_NAME);
    response.writeHead(200, {
        'Content-Type': 'txt',
        'Content-Length': stat.size,
    });

    var readStream = fs.createReadStream(filePath);
    // We replaced all the event handlers with a simple call to readStream.pipe()
    readStream.pipe(response);
} catch(error) {response.status(500).send(`API :: Failed to Retrieve Log: ${error}`); logMessage(error);
}});

/***************************** */
/* ******     UTILITY    ***** */
/***************************** */
const getInt = (str, min, max, defaultValue) => { try {
        if(str == undefined || str == null) throw 'Value is Undefined';
        const value = parseInt(str); 
        if(isNaN(value)) throw `Failed to Parse Integer: ${str}`; 
        if(min != undefined && value < min) throw `Value is less than minimum: ${str} < ${min}`; 
        if(max != undefined && value > max) throw `Value is greater than maximum: ${str} > ${max}`;  
        return value;
    } catch(error) {
        if(defaultValue != undefined) return defaultValue;
        else throw error;
    }
}

const getFloat = (str, min, max, defaultValue) => { try {
        if(str == undefined || str == null) throw 'Value is Undefined';
        const value = parseFloat(str); 
        if(isNaN(value)) throw `Failed to Parse Float: ${str}`; 
        if(min != undefined && value < min) throw `Value is less than minimum: ${str} < ${min}`; 
        if(max != undefined && value > max) throw `Value is more than maximum: ${str} > ${max}`;    
        return value.toFixed(2)*1;
    } catch(error) {
        if(defaultValue) return defaultValue;
        else throw error;
    }
}

const getJsonList = (str, defaultEmpty) => { try {
        if(str == undefined || str == null) throw 'List is Undefined';
        const list = JSON.parse(str); 
        if(Array.isArray(list) && list.length > 0) return list;
        else throw `Failed to Parse List: ${str}`; 
    } catch(error) {
        if(defaultEmpty) return [];
        else throw error;
    }
}

/* ******************************* */
/*     UNIVERSAL POST TEMPLATE     */
/* ******************************* */

const validate = async(request, response, verifyLevel = 2, callBack, label = 'API', sendSuccess = true) => { //Successful returns true, still need response
    if((verifyLevel == 0) || (verifyLevel == 1 && request.body.PASSWORD && (request.body.PASSWORD == process.env.PASSWORD))
        || (request.body.ADVANCED_PASSPHRASE && (request.body.ADVANCED_PASSPHRASE == process.env.ADVANCED_PASSPHRASE))) {
            if(!callBack) return true;
            try { const result = await callBack();
                if(result == false) throw `Unsuccessful`;
                else if(sendSuccess) { 
                    response.status(202).send(label);
                    await logMessage(`API :: Successful: ${label}`);
                }  
                return result;
            } catch(error) { response.status(500).send(`API :: Attempt to ${label} Failed: ${error}`);
                await logMessage(`API :: Attempt to ${label} Failed: ${error}`);
                return false; }
    } else {response.status(401).send(`API :: INVALID ${(verifyLevel == 1) ? 'PASSWORD' : 'ADVANCED_PASSPHRASE'} to ${label}`); return false;}
    return false;
}

apiServer.post('/save-log', (request, response) => {if(validate(request, response, 1, ()=> request.body.email ? logMessage(true, 'API Message', request.body.message) : logMessage('API Message', request.body.message), 'Message Saved to Log', false)) response.status(202).send('Message Saved.');});

apiServer.put('/send-update-email', (request, response) => validate(request, response, 1, ()=> sendEmail(undefined, undefined, false), 'Status Email Queued'));

apiServer.put('/evaluate', (request, response) => validate(request, response, 1, ()=> SERVER.evaluateConditions(5), 'Immediate-Evaluation has been Queued'));

apiServer.put('/feed', (request, response) => validate(request, response, 2, ()=> UTILITY.executeFeed(), 'Immediate-Feeding has been Queued'));

apiServer.put('/feed-open', (request, response) => validate(request, response, 1, ()=> UTILITY.feedOpen(), 'Immediate-Feeding OPEN has been Queued'));

apiServer.put('/feed-close', (request, response) => validate(request, response, 1, ()=> UTILITY.feedClose(), 'Immediate-Feeding CLOSED has been Queued'));

apiServer.put('/feed-stop', (request, response) => validate(request, response, 1, ()=> UTILITY.feedStop(), 'Immediate-Feeding STOP has been Queued'));

apiServer.post('/schedule-add', async (request, response) => {
    
//TODO: DEBUG THIS : 5/10/2022
    // await logMessage('Debug This, still executes immediately with bad password; correctly doesn\'t add to schedule???', 'Location: terrarium.mjs:apiserver.post.sechedule-add: Line: 207', await validate(request, response, 1, ()=> DATABASE.databaseAddSchedule(getInt(request.body.time), request.body.title, getJsonList(request.body.names), getInt(request.body.duration, 1),(request.body.set || (request.body.set == 'true')),getInt(request.body.repeat)), `New Schedule Created: ${request.body.title} : ${request.body.time}`));
    
    if(await validate(request, response, 1, ()=> 
        DATABASE.databaseAddSchedule(getInt(request.body.time), 
            request.body.title, 
            getJsonList(request.body.names), 
            getInt(request.body.duration, 1),
            (request.body.set || (request.body.set == 'true')),
            getInt(request.body.repeat)
            ), `New Schedule Created: ${request.body.title} : ${request.body.time}`)) {
        //Activate Immediately if current
                // if(getInt(request.body.time) < (new Date().getTime())) { 
                    const timeRemaining = (parseInt(request.body.time) + parseInt(request.body.duration));
                    const nameList = getJsonList(request.body.names);
                    DATA.CONTROLS.forEach((c)=>{ if(UTILITY.matchList(c.name, nameList)) c.settings.unshift({reason: /(toggle|immediate|schedule)/i.test(request.body.title) ? `${request.body.title}` : `Schedule ${request.body.title}`, set: (request.body.set || (request.body.set == 'true')) ? 1 : 0, until: timeRemaining});
                            });
                    // DATA.LOCAL.statusMessage = `${request.body.title}\n` + DATA.LOCAL.statusMessage;
                 }
        });

apiServer.post('/schedule-delete', async (request, response) => validate(request, response, 1, ()=>  DATABASE.databaseDeleteSchedule(getInt(request.body.priority)), `Delete Schedule: ${request.body.priority}`));

apiServer.post('/schedule-update', async (request, response) => validate(request, response, 1, ()=>  DATABASE.databaseUpdateSchedule(getInt(request.body.priority), 
    request.body.attributeName,
    request.body.value,
    ), `Schedule Updated: ${request.body.currentPriority} :: Attribute: ${request.body.attributeName} = ${request.body.value}`));

apiServer.post('/schedule-replace', async (request, response) => validate(request, response, 1, ()=>  DATABASE.databaseReplaceSchedule(getInt(request.body.currentPriority), 
        getInt(request.body.priority),
        getInt(request.body.time),
        request.body.title, 
        getJsonList(request.body.names), 
        getInt(request.body.duration, 1),
        (request.body.set || request.body.set == 'true'),
        getInt(request.body.repeat)
        ), `Replace Schedule: ${request.body.title} : ${request.body.time}`));

apiServer.post('/schedule-priority-swap', async (request, response) => validate(request, response, 1, ()=>  DATABASE.databaseSwapPriority(getInt(request.body.firstPriority), getInt(request.body.secondPriority)), `Swap Priority Schedule: ${request.body.firstPriority} : ${request.body.secondPriority}`));

apiServer.post('/schedule-priority-increase', async (request, response) => validate(request, response, 1, ()=>  DATABASE.databaseIncreasePriority(getInt(request.body.priority), request.body.increase), `${request.body.increase ? 'INCREASE' : 'DECREASE'} Priority Schedule: ${request.body.priority}`));

apiServer.post('/postpone-evaluation', async (request, response) => validate(request, response, 1, ()=> SERVER.delayFrequencyLoop(getInt(request.body.duration, 1)), `Postponing Next Evaluation for: ${request.body.duration}`));

apiServer.post('/restart-pi', async (request, response) => { 
    if(validate(request, response, 2, ()=> ()=>DM.logoutData(), 'RESTART PI')) setTimeout(() => exec('sudo reboot'), 5000);});


apiServer.post('/terminate', async (request, response) => {
    if(validate(request, response, 2, ()=> ()=>DM.logoutData(), 'TERMINATING SERVER')) setTimeout(() => process.exit(0), 5000);});

apiServer.post('/reset-file-system', (request, response) => validate(request, response, 2, ()=> DM.resetClearSavedData(undefined, async ()=>{await SERVER.restartFrequencyLoop(); await SERVER.restartControlLoop(); return true;}), 'RESETTING SETTINGS -> Server will Reinstate and be Offline Temporary'));

apiServer.post('/reset-settings', (request, response) => validate(request, response, 2, ()=> DM.resetSettings(undefined, async ()=>{await SERVER.restartFrequencyLoop(); await SERVER.restartControlLoop(); return true;}), 'RESETTING SETTINGS -> Server will Reinstate and be Offline Temporary'));

apiServer.post('/set-settings', (request, response) => { try { let success = false;
    if(request.body.ADVANCED_PASSPHRASE == process.env.ADVANCED_PASSPHRASE) {
        switch (request.body.tag) {
            case 'emailIssueRecipients':
                    DATA.SETTINGS.emailIssueRecipients = getJsonList(request.body.emailIssueRecipients);
                    success = true;
                break;
            case 'emailStatusRecipients':
                    DATA.SETTINGS.emailStatusRecipients = getJsonList(request.body.emailStatusRecipients);
                    success = true;
                break;
            case 'updateRegularity':
                if(request.body.updateRegularity != undefined && DATA.updateRegularityOptions.includes(request.body.updateRegularity)) { 
                    DATA.SETTINGS.updateRegularity = request.body.updateRegularity;
                    success = true;
                    SERVER.updateStatusUpdate();
                } break; 
            case 'requestRemoteServerFrequency':
                        DATA.SETTINGS.requestRemoteServerFrequency = getInt(request.body.requestRemoteServerFrequency, 300000, (24*60*60*1000)); //5m to day
                        //RESTART REMOTE SERVER REQUEST LOOP
                        success = true;
                break; 
            case 'evaluationFrequency':
                        DATA.SETTINGS.evaluationFrequency = getInt(request.body.evaluationFrequency, 60000, (24*60*60*1000)); //1m to day
                        SERVER.restartFrequencyLoop();
                        success = true;
                 break; 
            case 'accessDatabase':
                if(request.body.accessDatabase != undefined) {
                    DATA.SETTINGS.accessDatabase = (request.body.accessDatabase || request.body.accessDatabase == 'true');
                    success = true;
                }
                break;
            case 'maximumTemperature':
                        DATA.SETTINGS.maximumTemperature =getFloat(request.body.maximumTemperature, 15, 32); //60 to 90
                        DATA.SETTINGS.CLIMATE.forEach(c=>{if(c.temperature > DATA.SETTINGS.maximumTemperature) c.temperature = DATA.SETTINGS.maximumTemperature; });
                        success = true;
                 break; 
            case 'minimumTemperature':
                        DATA.SETTINGS.minimumTemperature = getFloat(request.body.minimumTemperature, 15, 32); //60 to 90
                        DATA.SETTINGS.CLIMATE.forEach(c=>{if(c.temperature < DATA.SETTINGS.minimumTemperature) c.temperature = DATA.SETTINGS.minimumTemperature; });
                        success = true;
                 break; 
            case 'maximumHumidity':
                        DATA.SETTINGS.maximumHumidity = getFloat(request.body.maximumHumidity, 0, 100); //0 to 100
                        DATA.SETTINGS.CLIMATE.forEach(c=>{if(c.humidity > DATA.SETTINGS.maximumHumidity) c.humidity = DATA.SETTINGS.maximumHumidity; });
                        success = true;
                 break; 
            case 'minimumHumidity':
                        DATA.SETTINGS.minimumHumidity = getFloat(request.body.minimumHumidity, 0, 100); //0 to 100
                        DATA.SETTINGS.CLIMATE.forEach(c=>{if(c.humidity < DATA.SETTINGS.minimumHumidity) c.humidity = DATA.SETTINGS.minimumHumidity; });
                        success = true;
                 break; 
            case 'dayHourStart':
                        DATA.SETTINGS.dayHourStart = getInt(request.body.dayHourStart, 0, 23); //0 to 23
                        success = true;
                 break; 
            case 'nightHourStart':
                        DATA.SETTINGS.nightHourStart = getInt(request.body.nightHourStart, 0, 23); //0 to 23
                        success = true;
                 break; 
            case 'sensorType':
                if(request.body.sensorType != undefined && DATA.sensorTypes.includes(request.body.sensorType)) { 
                        DATA.SETTINGS.sensorType = request.body.sensorType;
                        success = true;
                } break; 
            case 'sensorMode':
                if(request.body.sensorMode != undefined && DATA.sensorModes.includes(request.body.sensorMode)) { 
                    DATA.SETTINGS.sensorMode = request.body.sensorMode;
                    success = true;
                } break; 
            case 'climate-hour':
                    DATA.SETTINGS.CLIMATE[getInt(request.body.hour, 0, 23)].temperature = getFloat(request.body.temperature, 15, 32); //60 to 90
                    DATA.SETTINGS.CLIMATE[getInt(request.body.hour, 0, 23)].humidity = getFloat(request.body.humidity, 0, 100); //0 to 100
                    success = true;
                 break;
            case 'climate-temperature':
                getJsonList(request.body.climate).forEach(c=>{
                        DATA.SETTINGS.CLIMATE[getInt(c.hour, 0, 23)].temperature = getFloat(c.temperature, DATA.SETTINGS.minimumTemperature, DATA.SETTINGS.maximumTemperature); //60 to 90
                        success = true;
                }); break;
            case 'climate-humidity':
                getJsonList(request.body.climate).forEach(c=>{
                        DATA.SETTINGS.CLIMATE[getInt(c.hour, 0, 23)].humidity = getFloat(c.humidity, DATA.SETTINGS.minimumHumidity, DATA.SETTINGS.maximumHumidity); //0 to 100
                        success = true;
                }); break;
            case 'climate-all':
                getJsonList(request.body.climate).forEach(c=>{
                        DATA.SETTINGS.CLIMATE[getInt(c.hour, 0, 23)].temperature = getFloat(c.temperature, DATA.SETTINGS.minimumTemperature, DATA.SETTINGS.maximumTemperature); //60 to 90
                        DATA.SETTINGS.CLIMATE[getInt(c.hour, 0, 23)].humidity = getFloat(c.humidity, DATA.SETTINGS.minimumHumidity, DATA.SETTINGS.maximumHumidity); //0 to 100
                        success = true;
                }); break;
            case 'controls-name':
                if(request.body.id != undefined && request.body.name != undefined && !(/[^A-Za-z ]/g).test(request.body.name)) {
                    if(DATA.SETTINGS.CONTROLS.length != DATA.CONTROLS.length) {DM.resetSettings();
                    throw 'API [controls-name] detected un-synced CONTROLS list -> voiding request and executing immediate rest of SETTINGS.';}
                    const name = request.body.name.toLowerCase().replace(/[^A-Za-z]/g, "");
                    DATA.CONTROLS.forEach(c=>{const control = c.name.toLowerCase().replace(/[^A-Za-z]/g, ""); 
                        if(control == name) throw new Error(`Name already exists in Controls: ${c.id} :: ${c.name} | ${request.body.id}`);});

                    for(var i=0; i<DATA.CONTROLS.length; i++) { if(DATA.CONTROLS[i].id == getInt(request.body.id, 0, DATA.CONTROLS[i].length+1)) DATA.CONTROLS[i].name = request.body.name;}
                    for(var i=0; i<DATA.SETTINGS.CONTROLS.length; i++) { if(DATA.SETTINGS.CONTROLS[i].id == getInt(request.body.id, 0, DATA.CONTROLS[i].length+1)) DATA.SETTINGS.CONTROLS[i].name = request.body.name;}
                    success = true;
                } break;
            case 'controls-types':
                    if(DATA.SETTINGS.CONTROLS.length != DATA.CONTROLS.length) {DM.resetSettings();
                    throw 'API [controls-name] detected un-synced CONTROLS list -> voiding request and executing immediate rest of SETTINGS.';}
                    for(var i=0; i<DATA.CONTROLS.length; i++) { if(DATA.CONTROLS[i].id == getInt(request.body.id, 0, DATA.CONTROLS[i].length-1)) DATA.CONTROLS[i].types = getJsonList(request.body.types);}
                    for(var i=0; i<DATA.SETTINGS.CONTROLS.length; i++) { if(DATA.SETTINGS.CONTROLS[i].id == getInt(request.body.id, 0, DATA.CONTROLS[i].length-1)) DATA.SETTINGS.CONTROLS[i].types = getJsonList(request.body.types);}
                    success = true;
                break;
            }
    if(success) { response.status(202).send(`API :: Settings ${request.body.tag} Successfully Updated`);
        logMessage(`API :: Settings ${request.body.tag} Successfully Updated`);
        DM.saveSettings();
    } else throw `Invalid Settings Request: ${request.body.tag}`;
} else response.status(401).send(`API :: INVALID PASS PHRASE to Adjust Settings.`);
} catch(error) { logMessage(`API :: Attempt to Alter Settings Failed: ${error}`);
    response.status(500).send(`API :: Attempt to Alter Settings Failed: ${error}`);
}
});

apiServer.post('/execute-error-lights', (request, response) => {
    if(validate(request, response, 1, ()=> errorLights(request.body.mode, 10), `Executing Error Lights Mode: ${request.body.mode}`, false))
        logMessage(false, `Executing Error Lights Mode: ${request.body.mode}`, 
                ["MAX_TEMP_CONTROL", DATA.MAX_TEMP_CONTROL.lock ? "Locked" : "Unlocked", `Operating: ${DATA.MAX_TEMP_CONTROL.operating}`, `Setting: ${DATA.MAX_TEMP_CONTROL.setting}`],
                ["MIN_TEMP_CONTROL", DATA.MIN_TEMP_CONTROL.lock ? "Locked" : "Unlocked", `Operating: ${DATA.MIN_TEMP_CONTROL.operating}`, `Setting: ${DATA.MIN_TEMP_CONTROL.setting}`],
                ["HUMIDITY_CONTROL", DATA.HUMIDITY_CONTROL.lock ? "Locked" : "Unlocked", `Operating: ${DATA.HUMIDITY_CONTROL.operating}`, `Setting: ${DATA.HUMIDITY_CONTROL.setting}`]);
});



//Sensor Test :: Interval with timeout/cancel
let sensorInterval = null;
let sensorTimer = null;
let count = 0;
let testLog = '';
const startSensorTesting = (duration = (5*60*1000), interval = 5000) => {
    clearInterval(sensorInterval);
    clearTimeout(sensorTimer);
    count = 0;
    testLog = `Initiating ${duration / 60000} minute Sensor Test, at ${interval/1000} second intervals: ${dateFormat(new Date().getTime(), 'm-d-yyyy H:MM')}\n\n`;
    sensorInterval = setInterval(async ()=>{const result = await UTILITY.evaluateSensor(1, true);
        if(result.error) testLog += `${count++}] ${dateFormat(result.time, 'MM:ss',)} | ${result.statusMessage} | ERROR: ${result.error}\n`;
        else testLog += `${count++}] ${dateFormat(result.time, 'MM:ss',)} | ${result.temperature}-C | ${result.humidity}% | ${result.statusMessage}\n`; }, interval || 5000);
    sensorTimer = setTimeout(()=>{clearInterval(sensorInterval); logMessage(true, 'Sensor Testing Completed', testLog)}, duration || (5*60*1000));
}

apiServer.get('/sensor-test', (request, response) => response.status(200).send(testLog));

apiServer.post('/sensor-test-restart', (request, response) => validate(request, response, 2, ()=> startSensorTesting(request.body.duration, request.body.interval), `Initiating Sensor Testing for: ${request.body.duration}, with interval of: ${request.body.interval}`)); 

//Otherwise Redirect -> Searches routes in file top to bottom, * matches everything
apiServer.get('*', function(request, response) {
    response.redirect('/');
});

http.createServer(apiServer).listen(HTTP_SERVER_PORT, () => console.log(`Back End Server listening on LOCAL HTTP port: ${HTTP_SERVER_PORT}`));
https.createServer({key: SERVER_KEY, cert: SERVER_CERT }, apiServer).listen(HTTPS_SERVER_PORT, () => console.log(`Back End Server listening on LOCAL HTTP port: ${HTTPS_SERVER_PORT}`));

/***************************** */
/* ***   INITIALIZATION    *** */
/***************************** */

const onExit = async () => { //function to run when exiting program
    await DM.logoutData();
    errorLights('reset');
    console.log('=> Terminating Server');
    process.exit(0);    
  };
process.on('SIGINT', onExit); 

//Disable Network Sleep
exec('sudo iw wlan0 set power_save off');

await DM.clearOldLogs(undefined, true);
await DATABASE.databaseSimplifyPriority()
SERVER.restartFrequencyLoop();
SERVER.restartControlLoop();
console.log('\n------Initialization Complete---------\n');
errorLights('flash', 3);
logMessage(true, 'Terrarium Server Restarted', 'Initialization Complete');

