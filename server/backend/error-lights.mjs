import DATA from './data.mjs';
import logMessage from './communicate.mjs';

/******************************** */
/* ******    ERROR LIGHTS   ***** */
/******************************** */

let errorLightTimer = undefined;
let errorLightLockTimer = undefined;

const lockLights = (lock = false) => {
    DATA.MAX_TEMP_CONTROL.lock = lock; 
    DATA.MIN_TEMP_CONTROL.lock = lock; 
    DATA.HUMIDITY_CONTROL.lock = lock;
    if(lock) errorLightLockTimer = setTimeout(()=>resetLights(), (24*60*60*1000)); //Backup
}

const resetLights = () => { 
    clearImmediate(errorLightLockTimer);
    clearInterval(errorLightTimer);
    lockLights(false);
}

const allLights = (set) => { if(DATA.CONTROL_SERVER) {
    lockLights(true);
    DATA.MIN_TEMP_CONTROL.setting = set == 0 ? 0 : 1;
    DATA.MAX_TEMP_CONTROL.setting = set == 0 ? 0 : 1;
    DATA.HUMIDITY_CONTROL.setting = set == 0 ? 0 : 1;
}}

export default (mode='reset', flash = 1) => new Promise((resolve, reject) => {
    resetLights(); 

    if(DATA.CONTROL_SERVER) {
        switch(mode) {
            case 'lock': lockLights(true); break;

            case 'unlock': lockLights(false); break;

            case 'max': DATA.MAX_TEMP_CONTROL.setting = !DATA.MAX_TEMP_CONTROL.setting ? 1 : 0;

            case 'min': DATA.MIN_TEMP_CONTROL.setting = !DATA.MIN_TEMP_CONTROL.setting ? 1 : 0;

            case 'humid': DATA.HUMIDITY_CONTROL.setting = !DATA.HUMIDITY_CONTROL.setting ? 1 : 0;

            case 'on': allLights(1); resolve(); break;

            case 'off': allLights(0); resolve(); break;

            case 'flash': 
                let loops = 0;
                lockLights(true);

                errorLightTimer = setInterval(()=>{ loops++;
                    allLights(1);

                        setTimeout( ()=>{ allLights(0);
                            if(loops >= flash) {
                                resolve(); 
                                resetLights(); 
                            }}, 1000);
                    }, 2000); 

                    const timerFlash = errorLightTimer;
                    setTimeout(()=>(timerFlash === errorLightTimer) ? ()=>{resolve(); resetLights();} : null,  (DATA.SETTINGS.timeNextEvaluation - new Date().getTime()) || 5000);
                    break;

            case 'bounce': //Indefinite
                lockLights(true);

                errorLightTimer = setInterval(()=>{
                    DATA.HUMIDITY_CONTROL.pin.write(0);
                    DATA.MIN_TEMP_CONTROL.pin.write(1);
                    
                    setTimeout(() => {DATA.MIN_TEMP_CONTROL.pin.write(0);
                        DATA.HUMIDITY_CONTROL.pin.write(1);
                    }, 750);

                    setTimeout(() => {DATA.HUMIDITY_CONTROL.pin.write(0);
                        DATA.MAX_TEMP_CONTROL.pin.write(1);
                    }, 1500);

                    setTimeout(() => {DATA.MAX_TEMP_CONTROL.pin.write(0);
                        DATA.HUMIDITY_CONTROL.pin.write(1);
                    }, 2250);
                }, 3000);

                resolve();
                
                const timerBounce = errorLightTimer;
                setTimeout(()=>(timerBounce === errorLightTimer) ? resetLights() 
                            : null, (DATA.SETTINGS.timeNextEvaluation - new Date().getTime()) || 5000);
                break;
            default:
                DATA.MAX_TEMP_CONTROL.setting = DATA.maximumHumidityErrorCode ? 1 : 0;
                DATA.MIN_TEMP_CONTROL.setting = DATA.minimumTemperatureErrorCode ? 1 : 0;
                DATA.HUMIDITY_CONTROL.setting = DATA.maximumHumidityErrorCode ? 1 : 0;             
        }    

        if(!DATA.MAX_TEMP_CONTROL.lock && DATA.MAX_TEMP_CONTROL.setting != DATA.MAX_TEMP_CONTROL.operating)
        DATA.MAX_TEMP_CONTROL.pin.writeSync((DATA.MAX_TEMP_CONTROL.operating = DATA.MAX_TEMP_CONTROL.setting) ? 1 : 0);

        if(!DATA.MIN_TEMP_CONTROL.lock && DATA.MIN_TEMP_CONTROL.setting != DATA.MIN_TEMP_CONTROL.operating)
            DATA.MIN_TEMP_CONTROL.pin.writeSync((DATA.MIN_TEMP_CONTROL.operating = DATA.MIN_TEMP_CONTROL.setting) ? 1 : 0);

        if(!DATA.HUMIDITY_CONTROL.lock && DATA.HUMIDITY_CONTROL.setting != DATA.HUMIDITY_CONTROL.operating)
            DATA.HUMIDITY_CONTROL.pin.writeSync((DATA.HUMIDITY_CONTROL.operating = DATA.HUMIDITY_CONTROL.setting) ? 1 : 0);       

    }         
    
    //Log Current Settings
    // if(mode != 'reset')
    //     logMessage(false, "Error Lights", `Mode: ${mode}`, 
    //         ["MAX_TEMP_CONTROL", DATA.MAX_TEMP_CONTROL.lock ? "Locked" : "Unlocked", `Operating: ${DATA.MAX_TEMP_CONTROL.operating}`, `Setting: ${DATA.MAX_TEMP_CONTROL.setting}`],
    //         ["MIN_TEMP_CONTROL", DATA.MIN_TEMP_CONTROL.lock ? "Locked" : "Unlocked", `Operating: ${DATA.MIN_TEMP_CONTROL.operating}`, `Setting: ${DATA.MIN_TEMP_CONTROL.setting}`],
    //         ["HUMIDITY_CONTROL", DATA.HUMIDITY_CONTROL.lock ? "Locked" : "Unlocked", `Operating: ${DATA.HUMIDITY_CONTROL.operating}`, `Setting: ${DATA.HUMIDITY_CONTROL.setting}`]
    //     );

    resolve();   
});
