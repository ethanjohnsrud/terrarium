/************************************* */
/*         TESTING IMPORTS             */
/************************************* */    
const CONTROL_SERVER = false;    
const dht22Sensor = undefined;
const bme280Sensor = undefined;
const SAVE_TO_LOG = true;
const SEND_EMAILS = false;

/************************************* */
/* ******  RASPBERRY PI IMPORTS  ***** */
/************************************* */
// const CONTROL_SERVER =  ((process.env.CONTROL_SERVER || 'true') == 'true') || true; 
// import {Gpio} from 'onoff';
// import dht22Sensor from 'node-dht-sensor';
// import BME280 from 'bme280-sensor';
// const BME280OPTIONS = {
//         i2cBusNo   : 1, // defaults to 1
//         i2cAddress : 0x76, // defaults to 0x77
//       };
// const bme280Sensor = new BME280(BME280OPTIONS);
// const SAVE_TO_LOG = true;
// const SEND_EMAILS = true;

/************************************* */
/* ******    Universal Imports   ***** */
/************************************* */
import fs from 'fs';
import { exec } from 'child_process';
import nodeMailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

/************************************* */
/* ******     SETUP CONTROLS     ***** */
/************************************* */
//Reference to location of terrarium.mjs
const DEFAULT_SETTINGS_FILE=  process.env.DEFAULT_SETTINGS_FILE || './SETTINGS-DEFAULT.json'; //Need to start with './', removed  for naming later
const SETTINGS_FILE= process.env.SETTINGS_FILE || './settings.json';
const DATABASE_FILE =  process.env.DATABASE_FILE || './database.db';
const LOG_FILE =  process.env.LOG_FILE || './log.txt';

/******************************** */
/* ******     VARIABLES     ***** */
/******************************** */

let DATA = {};
export const INITIALIZE_DATA = async() => {if(fs.existsSync(SETTINGS_FILE) && fs.existsSync(DEFAULT_SETTINGS_FILE)) {

//Constant Settings
    DATA.CONTROL_SERVER = CONTROL_SERVER;
    DATA.SAVE_TO_LOG = SAVE_TO_LOG;
    DATA.SEND_EMAILS = SEND_EMAILS;
    DATA.dht22Sensor = dht22Sensor;
    DATA.bme280Sensor = bme280Sensor;
    DATA.DEFAULT_SETTINGS_FILE = DEFAULT_SETTINGS_FILE;
    DATA.SETTINGS_FILE = SETTINGS_FILE;
    DATA.DATABASE_FILE = DATABASE_FILE;
    DATA.LOG_FILE = LOG_FILE;
    DATA.DEFAULT_TEMPERATURE = parseFloat(process.env.DEFAULT_TEMPERATURE) || 24;
    DATA.DEFAULT_HUMIDITY = parseFloat(process.env.DEFAULT_HUMIDITY) || 75;
    DATA.sensorTypes = ["DHT22", "BME280"];
    DATA.sensorModes = ["On", "Reactive", "Proactive", "Off"];
    DATA.defaultControlTypes = ["On", "Off", "Day", "Night", "Heat", "Cool", "Humidify", "Dehumidify"]; //Handled Directly in Server ; Can't be Deleted
    DATA.updateRegularityOptions = ["None", "Hour", "Day", "Week", "Month"];

    //SAVED settings
    DATA.SETTINGS = JSON.parse(await fs.readFileSync(SETTINGS_FILE));

    //Declare Pins
    DATA.SENSOR_READ_PIN = parseInt(process.env.SENSOR_READ_PIN || 2) || 2;
    DATA.SENSOR_CONTROL = {pin:  CONTROL_SERVER ? new Gpio(process.env.SENSOR_CONTROL_PIN || '25', 'out') : null, setting: 0, operating: 0};
    DATA.MAX_TEMP_CONTROL = {pin: CONTROL_SERVER ? new Gpio(process.env.MAX_TEMP_CONTROL_PIN || '26', 'out') : null, setting: 0, operating: 0, lock: false};
    DATA.MIN_TEMP_CONTROL = {pin: CONTROL_SERVER ? new Gpio(process.env.MIN_TEMP_CONTROL_PIN || '19', 'out') : null, setting: 0, operating: 0, lock: false};
    DATA.HUMIDITY_CONTROL = {pin: CONTROL_SERVER ? new Gpio(process.env.HUMIDITY_CONTROL_PIN || '13', 'out') : null, setting: 0, operating: 0, lock: false};

    DATA.CONTROLS = [
        {id: 0, pin: CONTROL_SERVER ? new Gpio(process.env.CONTROL_0_PIN || '8', 'out') : null, name: DATA.SETTINGS.CONTROLS[0].name, types: DATA.SETTINGS.CONTROLS[0].types, settings: [{reason: 'Initial', set: 1, until: Number.POSITIVE_INFINITY}], operating: 0},
        {id: 1, pin: CONTROL_SERVER ? new Gpio(process.env.CONTROL_1_PIN || '7', 'out') : null, name: DATA.SETTINGS.CONTROLS[1].name, types: DATA.SETTINGS.CONTROLS[1].types, settings: [{reason: 'Initial', set: 1, until: Number.POSITIVE_INFINITY}], operating: 0},
        {id: 2, pin: CONTROL_SERVER ? new Gpio(process.env.CONTROL_2_PIN || '12', 'out') : null, name: DATA.SETTINGS.CONTROLS[2].name, types: DATA.SETTINGS.CONTROLS[2].types, settings: [{reason: 'Initial', set: 1, until: Number.POSITIVE_INFINITY}], operating: 0},
        {id: 3, pin: CONTROL_SERVER ? new Gpio(process.env.CONTROL_3_PIN || '16', 'out') : null, name: DATA.SETTINGS.CONTROLS[3].name, types: DATA.SETTINGS.CONTROLS[3].types, settings: [{reason: 'Initial', set: 1, until: Number.POSITIVE_INFINITY}], operating: 0},
        {id: 4, pin: CONTROL_SERVER ? new Gpio(process.env.CONTROL_4_PIN || '20', 'out') : null, name: DATA.SETTINGS.CONTROLS[4].name, types: DATA.SETTINGS.CONTROLS[4].types, settings: [{reason: 'Initial', set: 1, until: Number.POSITIVE_INFINITY}], operating: 0},
        {id: 5, pin: CONTROL_SERVER ? new Gpio(process.env.CONTROL_5_PIN || '21', 'out') : null, name: DATA.SETTINGS.CONTROLS[5].name, types: DATA.SETTINGS.CONTROLS[5].types, settings: [{reason: 'Initial', set: 1, until: Number.POSITIVE_INFINITY}], operating: 0},
        {id: 6, pin: CONTROL_SERVER ? new Gpio(process.env.CONTROL_6_PIN || '1', 'out') : null, name: DATA.SETTINGS.CONTROLS[6].name, types: DATA.SETTINGS.CONTROLS[6].types, settings: [{reason: 'Initial', set: 1, until: Number.POSITIVE_INFINITY}], operating: 0},
    ];

    //Ram Variables
    DATA.LOCAL = {
        timeLastReading: new Date().getTime(), //milliseconds
        timeNextEvaluation: new Date().getTime(), //milliseconds
        timeLastServerRequest: new Date().getTime(), //milliseconds
        timeLastReadingSaved: new Date().getTime()-(45*60*1000), //milliseconds
        frequencyActive: false,
        operatingTemperature: DATA.DEFAULT_TEMPERATURE, //Celsius
        operatingHumidity: DATA.DEFAULT_HUMIDITY,
        goalTemperature: DATA.DEFAULT_TEMPERATURE, //Celsius
        goalHumidity: DATA.DEFAULT_HUMIDITY,
        sensorErrorCode: 0,
        maximumTemperatureErrorCode: 0,
        minimumTemperatureErrorCode: 0,
        maximumHumidityErrorCode: 0,
        minimumHumidityErrorCode: 0,
        statusMessage: 'Initialization Procedure',
        publicURL: 'NGROK publicURL'
    }
} else {
    /******************************** */
    /* **  VERIFY SETTINGS EXIST  ** */
    /******************************** */
    let EMERGENCY_MESSAGE = `[${new Date().getTime()}] = ERROR = SETTINGS FILES MISSING => INITIALIZATION FAIL => REPORTING & TERMINATING SERVER :: SETTINGS_FILE: ${SETTINGS_FILE} :: DEFAULT_SETTINGS_FILE: ${DEFAULT_SETTINGS_FILE}`;
    if(fs.existsSync(DEFAULT_SETTINGS_FILE))  await new Promise((resolve, reject)=>fs.copyFile(DEFAULT_SETTINGS_FILE, SETTINGS_FILE, fs.constants.COPYFILE_FICLONE, (error) => error ? reject(error) : resolve(error)))
                                                .then(()=>{EMERGENCY_MESSAGE += ` => SETTINGS FILE RESET TO DEFAULT => CONTINUING INITIALIZATION`}).catch((error) => {EMERGENCY_MESSAGE += ` => FAILED to COPY ${DEFAULT_SETTINGS_FILE} to ${SETTINGS_FILE} File => ${error}`;});
    console.error(EMERGENCY_MESSAGE);
    await fs.writeFileSync ('./EMERGENCY_MESSAGE.txt', EMERGENCY_MESSAGE,()=>{});
    await fs.appendFileSync (LOG_FILE, `${EMERGENCY_MESSAGE}\n`,()=>{});
    //Send Simple Email
    const mail = nodeMailer.createTransport({
        service: process.env.EMAIL_SENDER,
        port: 465,
        secure: true, // true for 465, false for other ports
        secureConnection: false,
        auth: {
            user: process.env.EMAIL_SENDER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
    await mail.sendMail({
                from: process.env.EMAIL_SENDER,
                to: process.env.EMAIL_RECEIVER,
                subject: `TERRARIUM EMERGENCY`,
                text: EMERGENCY_MESSAGE,
            });
    if(!fs.existsSync(SETTINGS_FILE) || !fs.existsSync(DEFAULT_SETTINGS_FILE)) await new Promise((resolve, reject) => setTimeout(() => { console.error('TERMINATING');
            exec('pm2 delete terrarium');
            process.exit(1);}, 5000));
    else INITIALIZE_DATA();
}}

await INITIALIZE_DATA();

//CJS IMPORTS   == https://stackoverflow.com/questions/53235199/importing-all-exports-in-a-module-nodejs/53235666
// export default function importAll() { Object.keys(this).forEach((id) => { if (id === 'importAll') { return; }; global[id] = this[id]; }); };
export default  DATA;

