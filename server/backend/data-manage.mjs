import fs from 'fs';
import DATA, {INITIALIZE_DATA} from './data.mjs';
import DATABASE from './database.mjs';
import logMessage from './communicate.mjs';

/***************************** */
/* ******     UTILITY    ***** */
/***************************** */
const getControlTypes=()=>{ const list = JSON.parse(JSON.stringify([...DATA.defaultControlTypes]));
    DATA.CONTROLS.forEach(c=>c.types.forEach(t=>{if(!list.includes(t)) list.push(t);}));
    return list; }


/***************************** */
/* ******     EXPORT     ***** */
/***************************** */

const saveSettings = async () => { if(DATA.SETTINGS.accessDatabase) { 
    if(DATA.CONTROL_SERVER) DATA.SETTINGS.CONTROLS = DATA.CONTROLS.map((c, i) => {return {id: c.id, name: c.name, types: c.types};});
        return await new Promise((resolve, reject)=>fs.writeFile(DATA.SETTINGS_FILE, JSON.stringify(DATA.SETTINGS), (error)=>error ? reject(error) : resolve(error)))
                    .then(()=>{   return true;}).catch((error) => { logMessage(true, 'Failed to Save Settings', JSON.stringify(DATA.SETTINGS), error); return false;});
    } else return false; } 

const resetClearSavedData = async(callFront, callBack, terminate=false) => { try { const now = new Date().getTime();
    if(callFront) callFront();

    await new Promise((resolve, reject)=>fs.copyFile(DATA.DATABASE_FILE, `./Records/${now}-${DATA.DATABASE_FILE.substring(2)}`, fs.constants.COPYFILE_FICLONE, (error)=>error ? reject(error) : resolve(error)))
                .then(()=>logMessage(`>> MOVE ${DATA.DATABASE_FILE} File to ./Records => Success`)).catch((error) => logMessage(`>> FAILED to MOVE  ${DATA.DATABASE_FILE} File  to ./Record=> ${error}`));
    await new Promise((resolve, reject)=>fs.unlink(DATA.DATABASE_FILE,(error) => error ? reject(error) : resolve(error)))
                .then(()=>logMessage(`>> DELETED ${DATA.DATABASE_FILE} File => Success`)).catch((error) => logMessage(`>> FAILED to DELETE ${DATA.DATABASE_FILE} => ${error}`));
    await new Promise((resolve, reject)=>fs.copyFile(DATA.LOG_FILE, `./Records/${now}-${DATA.LOG_FILE.substring(2)}`, fs.constants.COPYFILE_FICLONE, (error) => error ? reject(error) : resolve(error)))
                .then(()=>logMessage(`>> MOVED ${DATA.LOG_FILE} File to ./Records => Success`)).catch((error) => logMessage(`>> FAILED to MOVE ${DATA.LOG_FILE} File to ./Record=> ${error}`));
    await new Promise((resolve, reject)=>fs.unlink(DATA.LOG_FILE,(error) => error ? reject(error) : resolve(error)))
                .then(()=>logMessage(`>> DELETED ${DATA.LOG_FILE} File => Success`)).catch((error) => logMessage(`>> FAILED to DELETE ${DATA.LOG_FILE} => ${error}`));
    await new Promise((resolve, reject)=>fs.copyFile(DATA.SETTINGS_FILE, `./Records/${now}-${DATA.SETTINGS_FILE.substring(2)}`, fs.constants.COPYFILE_FICLONE, (error) => error ? reject(error) : resolve(error)))
                .then(()=>logMessage(`>> MOVE ${DATA.SETTINGS_FILE} File to ./Records => Success`)).catch((error) => logMessage(`>> FAILED to MOVE ${DATA.SETTINGS_FILE} File  to ./Record=> ${error}`));
    await new Promise((resolve, reject)=>fs.copyFile(DATA.DEFAULT_SETTINGS_FILE, DATA.SETTINGS_FILE, fs.constants.COPYFILE_FICLONE, (error) => error ? reject(error) : resolve(error)))
                .then(()=>logMessage(`>> COPIED ${DATA.DEFAULT_SETTINGS_FILE} File to ${DATA.SETTINGS_FILE} => Success`)).catch((error) => logMessage(`>> FAILED to COPY ${DATA.DEFAULT_SETTINGS_FILE} to ${DATA.SETTINGS_FILE} File => ${error}`));

    await logMessage(true, 'Resetting File Structure', `SAVED DATA AND DELETED FILES :: ${DATA.DATABASE_FILE} | ${DATA.LOG_FILE} | ${DATA.SETTINGS_FILE}`).then(async () => {
        if(terminate) { 
            if(callBack) await callBack();
            process.exit(0);
        } else {
            await INITIALIZE_DATA();
            await DATABASE.setupDatabase();
            if(callBack) await callBack();
            return true;
        }
    });
} catch(error) {logMessage(true, 'Failed to Reset File Structure', error); return false;};
            
}
const logoutData = async () => { //Call on SIGINT
    console.log('SAVING SETTINGS');
    console.log(await saveSettings() ? `=> SETTINGS SAVED : ${DATA.SETTINGS_FILE}` : `# SETTINGS SAVE FAILED : ${DATA.SETTINGS_FILE}`);
    console.log(`> ${DATA.LOCAL.statusMessage}`);
    return true;
}
const resetSettings = async(callFront, callBack) => { await logMessage('RESETTING DATA SETTINGS'); const now = new Date().getTime();
    if(callFront) await callFront();
        await new Promise((resolve, reject)=>fs.copyFile(DATA.SETTINGS_FILE, `./Records/${now}-${DATA.SETTINGS_FILE.substring(2)}`, fs.constants.COPYFILE_FICLONE, (error) => error ? reject(error) : resolve(error)))
                .then(()=>logMessage(`>> MOVE ${DATA.SETTINGS_FILE} File to ./Record => Success`)).catch((error) => logMessage(`>> FAILED to MOVE ${DATA.SETTINGS_FILE} File  to ./Record=> ${error}`));
        await new Promise((resolve, reject)=>fs.copyFile(DATA.DEFAULT_SETTINGS_FILE, DATA.SETTINGS_FILE, fs.constants.COPYFILE_FICLONE, (error) => error ? reject(error) : resolve(error)))
                .then(()=>logMessage(`>> COPIED ${DATA.DEFAULT_SETTINGS_FILE} File to ${DATA.SETTINGS_FILE} => Success`)).catch((error) => logMessage(`>> FAILED to COPY ${DATA.DEFAULT_SETTINGS_FILE} to ${DATA.SETTINGS_FILE} File => ${error}`));
        await INITIALIZE_DATA();
    if(callBack) await callBack();
    return true;
}

const conditionalMaxDatabaseFileSize = 1573000; //1000 Readings Entries = 45 Days
const conditionalMaxLogFileSize = 30000; //700 Lines

const clearOldLogs = async(callFront, conditional = false) => {const now = new Date().getTime();
    if(callFront) await callFront();

    if(!conditional || (fs.statSync(DATA.DATABASE_FILE).size > conditionalMaxDatabaseFileSize)) {
        await logMessage('COPYING DATABASE to RECORDS and CLEARING OLD READINGS'); 
        await new Promise((resolve, reject)=>fs.copyFile(DATA.DATABASE_FILE, `./Records/${now}-${DATA.DATABASE_FILE.substring(2)}`, fs.constants.COPYFILE_FICLONE, (error)=>error ? reject(error) : resolve(error)))
                    .then(()=>logMessage(`>> MOVE ${DATA.DATABASE_FILE} File to ./Records => Success`)).catch((error) => logMessage(`>> FAILED to MOVE  ${DATA.DATABASE_FILE} File  to ./Record=> ${error}`));
        await DATABASE.databaseClearOldReadings(conditional ? 45 : 30);
    }
    if(!conditional || (fs.statSync(DATA.LOG_FILE).size > conditionalMaxLogFileSize)) {
        await logMessage('COPYING LOG to RECORDS and DELETING'); 
        await new Promise((resolve, reject)=>fs.copyFile(DATA.LOG_FILE, `./Records/${now}-${DATA.LOG_FILE.substring(2)}`, fs.constants.COPYFILE_FICLONE, (error) => error ? reject(error) : resolve(error)))
                    .then(()=>logMessage(`>> MOVED ${DATA.LOG_FILE} File to ./Records => Success`)).catch((error) => logMessage(`>> FAILED to MOVE ${DATA.LOG_FILE} File to ./Record=> ${error}`));
        await new Promise((resolve, reject)=>fs.unlink(DATA.LOG_FILE,(error) => error ? reject(error) : resolve(error)))
                    .then(()=>logMessage(`>> DELETED ${DATA.LOG_FILE} File => Success`)).catch((error) => logMessage(`>> FAILED to DELETE ${DATA.LOG_FILE} => ${error}`));
    }
    //TODO TEMP Testing: 1/5/2023
    logMessage('clearOldLogs(): -finished');
        return true;
}

export default  {
    getControlTypes, 
    saveSettings,
    logoutData,
    resetClearSavedData,
    resetSettings,
    clearOldLogs,
     };