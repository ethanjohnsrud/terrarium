import fs from 'fs';
import dateFormat from 'dateformat';
import { parse } from 'stack-trace';
import { exec } from 'child_process';
import nodeMailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
import DATA from './data.mjs';
import DATABASE from './database.mjs';
import errorLights from './error-lights.mjs';
import UTILITY from './utility.mjs';


const EMAIL_TEMPLATE_FILE = process.env.EMAIL_TEMPLATE_FILE || './backend/email.html'; //With reference to location of 'terrarium.mjs'

const SAVE_TO_LOG = DATA.SAVE_TO_LOG || true;
const SEND_EMAILS = DATA.SEND_EMAILS || true;

/******************************** */
/* ***  [LOCAL]  UTILITY      ***** */
/******************************** */
const getFahrenheit = (celsius) => (celsius* (9.0/5.0)) + 32;

const getDuration = (ms) => `${Math.floor(ms/60000)}:${Math.abs(ms)%60000<10000?'0':''}${Math.floor((Math.abs(ms)%60000)/1000)}`;

const getPublicIP = async(extras)=> extras ? await new Promise((res, rej)  => 
        exec('curl ifconfig.me', (err, stdout, stderr) => {
            if(err) {writeMessage(`publicIP Error: ${err}`); res('');}
            res(stdout);
        })) : '';

const getPrivateIP = async(extras)=> extras ? await new Promise((res, rej)  => 
        exec('hostname -I | awk \'{print $1}\'', (err, stdout, stderr) => {
            if(err) {writeMessage(`privateInfo Error: ${err}`); res('');}
            res(stdout);
        })) : '';


const generateEmailHTML = async (subject, message, typeIssue=true, extras = true) => { if(!extras) return message;
    const template = await fs.readFileSync(EMAIL_TEMPLATE_FILE).toString();
    let publicIP = await getPublicIP(extras);
        publicIP = publicIP.toString().replace(/\s/g, '');
    let privateIP = await getPrivateIP(extras);
        privateIP = privateIP.toString().replace(/\s/g, '');

//Time Precalculations
    const hour = new Date().getHours();
    // const timeTillEvaluationFrequency = DATA.LOCAL.timeLastReading + DATA.SETTINGS.evaluationFrequency - new Date().getTime();
    // const timeTillRequestRemoteServerFrequency = DATA.LOCAL.timeLastServerRequest + DATA.SETTINGS.requestRemoteServerFrequency - new Date().getTime();
//Split Message Newlines
    const messageList = message.split('\n').map(m=>`<div>
            <p style="margin: 0; color: goldenrod; text-align: ${(message.split('\n').length > 3) ? 'left' : 'center'};">${m}</p>
        </div>`).join().replace(/,/g,'');
//Status Message Split
    const statusList = DATA.LOCAL.statusMessage.length == 0 ? [] : DATA.LOCAL.statusMessage.match(/[^\r\n]+/g).reverse();
    const statusMessage1 = statusList.length > 0 ? statusList[0] : '';
    statusList.shift();
    const statusMessage2 = statusList.length == 0 ? '' : statusList.map(s=>`<tr><td ></td>
                <td style="width: 100%; padding: 3px; border: 0.05rem solid #013214; text-align: center;" >${s}</td>
                            </tr>`).join().replace(/,/g,'');
//Controls Layout
const controlRows = DATA.CONTROLS.map(c=>`<tr>
                <td style="padding: 3px; font-weight: 700; text-align: right;" >${c.name}</td>
                <td style="padding: 3px; border: 0.05rem solid #013214; text-align: center;" >${c.operating == 1 ? 'Active' : 'Inactive'}</td>
                <td style="padding: 3px; border: 0.05rem solid #013214; text-align: left;" >${c.settings[0].reason}</td>
            </tr>`).join().replace(/,/g,'');
//History Layout
    const dayList = await DATABASE.databaseGetReadingRange((new Date().getTime()-(25*60*60*1000)), undefined, true);
    const historyRows = !dayList.length ? `<tr><td style="padding: 3px; text-align: center;" >No History Past 24 Hours</td></tr>`
                        : dayList.map(r=>`<tr>
                            <td style="padding: 3px; border: 0.05rem solid #013214; text-align: center;" >${dateFormat(r.time, 'H:MM')}</td>
                            <td style="padding: 3px; border: 0.05rem solid #013214; text-align: center;" >${r.temperature}-C  [${Math.floor(UTILITY.getTemperaturePercent(r.temperature, r.goalTemperature) * 100)}%]</td>
                            <td style="padding: 3px; border: 0.05rem solid #013214; text-align: center;" >${r.humidity}%  [${Math.floor(UTILITY.getHumidityPercent(r.humidity, r.goalHumidity) * 100)}%]</td>
                            <td style="padding: 3px; border: 0.05rem solid #013214; text-align: center;" >${
                                !r.active.length ? '' : `<table style="margin: 0; width: 100%; border-spacing: 2px;">
                                ${r.active.map(c=>`<tr>
                                        <td style="text-align: center;" >${c.name}  [${c.settings[0].reason}]</td>
                                    </tr>`).join().replace(/,/g,'')}
                                </table>`
                            }</td>
                        </tr>`).join().replace(/,/g,'');

return await template.replace(/{subject}/g, subject)
    .replace(/\{emailTypeColor\}/g, typeIssue ? 'red' : 'black')
    .replace(/{emailType}/g, typeIssue ? 'Terrarium Error' : 'Terrarium Status Update')
    .replace(/{hosted}/g, `<a href="http://${process.env.HOSTED_DOMAIN}?server=http://${publicIP}:${process.env.HTTP_SERVER_PORT}&server=https://${publicIP}:${process.env.HTTPS_SERVER_PORT}&server=http://${privateIP}:${process.env.HTTP_SERVER_PORT}&public=http://${publicIP}:${process.env.HTTP_SERVER_PORT}&private=http://${privateIP}:${process.env.HTTP_SERVER_PORT}&redirect=http://${privateIP}:${process.env.HTTP_SERVER_PORT}&redirect=http://${publicIP}:${process.env.HTTP_SERVER_PORT}/">${process.env.HOSTED_DOMAIN}</a>`)
    .replace(/{public}/g, `<a href="http://${publicIP}:${process.env.HTTP_SERVER_PORT}/">${publicIP}:${process.env.HTTP_SERVER_PORT}</a>`)
    .replace(/{private}/g, `<a href="http://${privateIP}:${process.env.HTTP_SERVER_PORT}/">${privateIP}:${process.env.HTTP_SERVER_PORT}</a>`)
    .replace(/{message}/g, messageList)
    .replace(/{statusMessage1}/g, statusMessage1)
    .replace(/{statusMessage2}/g, statusMessage2)
    .replace(/{currentTime}/g, `${dateFormat(new Date().getTime(), 'dddd, m-d-yyyy H:MM:ss')}`)
    .replace(/{timeLastReading}/g, `${dateFormat(DATA.LOCAL.timeLastReading, 'mmm-d, H:MM:ss',)}`)
    .replace(/{operatingTemperature}/g, `${DATA.LOCAL.operatingTemperature}-C = ${getFahrenheit(DATA.LOCAL.operatingTemperature).toFixed(2)}-F`)
    .replace(/{operatingHumidity}/g, `${DATA.LOCAL.operatingHumidity}%`)
    .replace(/{climateTemperature}/g, `${DATA.LOCAL.goalTemperature}-C = ${getFahrenheit(DATA.LOCAL.goalTemperature).toFixed(2)}-F`)
    .replace(/{climateHumidity}/g, `${DATA.LOCAL.goalHumidity}%`)
    .replace(/{climateHour}/g, hour)
    .replace(/{climateTemperaturePercent}/g, `${(UTILITY.getTemperaturePercent()*100).toFixed()}%`)
    .replace(/{climateHumidityPercent}/g, `${(UTILITY.getHumidityPercent()*100).toFixed()}%`)
    .replace(/{day}/g, (hour >= DATA.SETTINGS.dayHourStart && hour < DATA.SETTINGS.nightHourStart) ? 'Daytime' : 'Nighttime')
    .replace(/{dayStartHour}/g, DATA.SETTINGS.dayHourStart)    
    .replace(/{nightStartHour}/g, DATA.SETTINGS.nightHourStart)
    .replace(/{evaluationFrequency}/g, getDuration(DATA.SETTINGS.evaluationFrequency))
    .replace(/{nextEvaluation}/g, `${dateFormat(DATA.LOCAL.timeNextEvaluation, 'mmm-d, H:MM',)}`)
    .replace(/{sensorType}/g, DATA.SETTINGS.sensorType)
    .replace(/{sensorMode}/g, DATA.SETTINGS.sensorMode)
    .replace(/{sensorActive}/g, DATA.SENSOR_CONTROL.operating == 1 ? 'Active' : 'Inactive')
    .replace(/{sensorCode}/g, DATA.LOCAL.sensorErrorCode)
    .replace(/{maximumTemperatureCode}/g, DATA.LOCAL.maximumTemperatureErrorCode)
    .replace(/{minimumTemperatureCode}/g, DATA.LOCAL.minimumTemperatureErrorCode)
    .replace(/{maximumHumidityCode}/g, DATA.LOCAL.maximumHumidityErrorCode)
    .replace(/{minimumHumidityCode}/g, DATA.LOCAL.minimumHumidityErrorCode) 
    .replace(/{controlRows}/g, controlRows)
    .replace(/{historyRows}/g, historyRows)
    .toString();
}

/******************************** */
/* **  Write Error to File   [LOCAL]  ** */
/******************************** */
const writeMessage = async (message) => !SAVE_TO_LOG ? false : 
    await fs.appendFile (DATA.LOG_FILE, `${message}\n`, function (error) {     //console.error(message);  
        if (error) {console.error(error, message); }
            return true;
});

/******************************** */
/* ******    SEND EMAIL   [Exported Individually]  ***** */
/******************************** */
const mail = nodeMailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    host: process.env.EMAIL_HOST,
    port: 465,
    secure: true, // true for 465, false for other ports
    secureConnection: false,
    ignoreTLS: true, // add this 
    auth: {
        user: process.env.EMAIL_SENDER,
        pass: process.env.EMAIL_PASSWORD
    }
});

const getAttachments = async(extras) => extras ? [
    {filename: DATA.LOG_FILE.substring(2), path: DATA.LOG_FILE},
    {filename: DATA.SETTINGS_FILE.substring(2), path: DATA.SETTINGS_FILE},    
    {filename: DATA.DATABASE_FILE.substring(2), path: DATA.DATABASE_FILE},
] : [];

const resendEmail = async(email, attempts=20, interval) => setTimeout(()=>{try{ //Must identify errors
    mail.sendMail(email, (error) => {
        if(attempts && /EHOSTUNREACH/i.test(error)) resendEmail(email, attempts-1, interval);
        else if(!attempts) throw 'Max attempts Reached';
        else throw error;
    });
} catch(er) { writeMessage(`# FAILED TO RESEND EMAIL -> Error: ${er}\nSubject: ${email.subject}\nMessage: ${email.message}`);
}}, interval || (15*60*1000));

export const sendEmail = async (message = DATA.LOCAL.statusMessage, subject = 'Status Update', typeIssue = true, extras=true) => !SEND_EMAILS ? false : new Promise(async (resolve, reject) => { try{ 

        const email  = await {
                from: process.env.EMAIL_SENDER,
                to: extras ? (typeIssue ? DATA.SETTINGS.emailIssueRecipients.toString() : DATA.SETTINGS.emailStatusRecipients.toString()) : process.env.EMAIL_RECEIVER,
                subject: `Terrarium: ${subject}`,
                message: message,
                attachments: await getAttachments(extras),

                html: await generateEmailHTML(subject, message, typeIssue, extras),
            };
            errorLights('flash', 2);
            await mail.sendMail(email, (error) => {writeMessage(!error ? '-> Email Sent Successfully' : `# ERROR Sending Email ${error}  ${extras ? '\t->Attempting to resend without Attachment and Stats' : ''}`);
                if(/EHOSTUNREACH/i.test(error)) {
                    email.subject = `NETWORK DELAYED: ${email.subject}`; email.message = `Initially Sent: [${dateFormat(new Date().getTime(), 'dddd, m-d-yyyy H:MM:ss')}]\n${email.message}`;
                    writeMessage(`NETWORK CONNECTION UNAVAILABLE -> Error: ${er}\nSubject: ${email.subject}\nMessage: ${email.message}\n=> Will attempt to resend every 45m for the next 1.5 days.`);
                    resendEmail(email, 50, (45*60*1000));//1.5 Days
                } else if(error && extras) sendEmail(message, subject, true, false);
        });
        // writeMessage(`${typeIssue ? 'Issue' : ' Status'} Email Sent: `);
            return resolve(true);
    } catch(er) {//Network 6~hour disconnect: 11/12/2021 Error: connect EHOSTUNREACH 142.250.114.109:465
        if(/EHOSTUNREACH/i.test(er)){
            if(!controlledResend) {writeMessage(`# ERROR with sendEmail :: NETWORK CONNECTION UNAVAILABLE -> Error: ${er}\nSubject: ${subject}\nMessage: ${message}`);
                setTimeout(()=>sendEmail(`${message}`, `NETWORK DELAYED: ${subject}`, true, false), (5*60*1000));
            } else  setTimeout(()=>sendEmail(message, subject, true, false), (15*60*1000));
            return resolve(false);
        } if(extras) { writeMessage(`# ERROR with sendEmail :: ${typeIssue ? 'Issue' : ' Status'} Email -> Attempting to resend without Attachments and Stats:  ${er}`); 
                await sendEmail(message, subject, true, false).then(r => {resolve(r);});
        } else {
            writeMessage(`# ERROR with sendEmail :: ${typeIssue ? 'Issue' : ' Status'} Email -> Failed to Send: ${er}\nSubject: ${subject}\nMessage: ${message}`);
                return resolve(false);
    } return resolve(false);
}});


/******************************** */
/* **    Log Error Message     ** */
/******************************** */ 
export default async (email, ...message) => { const isError = ((/error|fail|value/i.test(email) || (/error|fail|value/i.test(message[0]))));
    const stack = parse(new Error()); let trace = '';    
        if(stack.length>=2) trace  += `     > ${stack[1].getFunctionName()} = ${stack[1].getLineNumber()}:${stack[1].getColumnNumber()} => ${stack[1].getFileName()}\n`;
        if(stack.length>=3 && isError) trace  += `     >> ${stack[2].getFunctionName()} = ${stack[2].getLineNumber()}:${stack[2].getColumnNumber()} => ${stack[2].getFileName()}\n`;
        if(stack.length>=4 && isError) trace  += `     >>> ${stack[3].getFunctionName()} = ${stack[3].getLineNumber()}:${stack[3].getColumnNumber()} => ${stack[3].getFileName()}\n`;
        const content = (message.length == 0) ? email : message.reduce((previous, current)=>previous+=`${current}\n`, '');
    // console.trace();
    await writeMessage(`[${dateFormat(new Date().getTime(), 'm-d-yyyy H:MM:ss',)}] ${content}\n${(email === false) ? '' : trace}`);//false email == no trace
    if(email === true) await sendEmail((message.length>2) ? message.slice(1).reduce((previous, current)=>previous+=`${current}\n`, '')+`\n\n${trace}` : content, (message.length>1) ? message[0] : 'Terrarium Error', true, true);
    return true;
}


// export default  {
//     logMessage,
//     getCurrentSituation,
//     sendEmail,
// }
