import React from 'react';
import { useHistory} from "react-router-dom";
import { useSelector, useDispatch} from 'react-redux';
import axios from 'axios';
import SettingsList from './SettingsList';
import SettingsBlank from './SettingsBlank';
import SettingsButton from './SettingsButton';
import {fetchData} from '../index';

import '../index.css';
import './Settings.css';

/*SETTINGS Props Key : 9-26-2021
SettingsList.jsx
    + dropListId
    + title
    + current
    + options
    + onUpdate
    ? verifyLevel = 2
    ? selectMultiple = current type
    ? addCustom = false
SettingsBlank.jsx
    + title
    + current
    + onUpdate
    ? verifyLevel = 2
    ? inputType = current type: text/number
    ? numberStep = 1
    ? cache: true/false //Won't clear Input on Failed Request
SettingsButton.jsx
    + title
    + onUpdate
    ? verifyLevel = 1
*/

const Settings = (props) => {
// console.log(props);
const SERVER_URL = useSelector(root => root.serverURL);
const DATA = useSelector(root => root.data);
const SCREENSAVER_BRIGHTNESS = useSelector(root => root.screenSaverBrightness);
const convertToFahrenheit = useSelector(root => root.convertToFahrenheit);
const dispatch = useDispatch();
const routeHistory = useHistory();

    const post = async(route, body, onSuccess) => axios.post(`${SERVER_URL}${route}/`, body).then((response)=>onSuccess == 'response' ? response : onSuccess || true).catch((error)=>error.response ? error.response.status : false);
    const put = async(route, body, onSuccess) => axios.put(`${SERVER_URL}${route}/`, body).then((response)=>onSuccess == 'response' ? response : onSuccess || true).catch((error)=>error.response ? error.response.status : false);

    const LOCAL_SETTINGS = [
        <SettingsList title='Temperature:'
            dropListId='temperature-conversion'
            current={convertToFahrenheit ? 'Fahrenheit' : 'Celsius'}
            options={['Celsius', 'Fahrenheit']}
            verifyLevel={0}
            onUpdate={(value, password)=>{dispatch({type: 'toggleConvertToFahrenheit', payload: (value == 'Fahrenheit')}); return true;}}/>, 
        <SettingsButton title='Deactivate Screen Saver' pendingText='Deactivating'
            onUpdate={async()=>{props.deactivateScreenSaver(300000); return '5 Minutes';}} />,
        <SettingsList title='ScreenSaver Brightness:'
            dropListId='screensaver-brightness'
            current={SCREENSAVER_BRIGHTNESS.setting}
            options={SCREENSAVER_BRIGHTNESS.settingOptions}
            verifyLevel={0}
            onUpdate={(value, password)=>{
                if(SCREENSAVER_BRIGHTNESS.settingOptions.includes(value)) {dispatch({type: 'setting', payload: value}); return true;}
                else return false;}}/>, 
        <div style={{borderBottom: '1px solid var(--main-color)', margin: '0.5rem 0', width: '100%'}}></div>,
        <SettingsBlank title='Server URL:'
                current={SERVER_URL}
                verifyLevel={0}
                cache={true}
                onUpdate={async(value, password)=>{dispatch({type: 'setServerURL', payload: value}); const response = await fetchData(); if(response == true) routeHistory.push('/'); return (response == true) ? 'UPDATING' : response;}}/>,
        <SettingsButton title='Update Data' pendingText='RETRIEVING'
        onUpdate={async()=>{const response = await fetchData(); return (response == true) ? 'UPDATED' : response;}} />
    ];
    if(SCREENSAVER_BRIGHTNESS.setting == 'Scheduled') 
        LOCAL_SETTINGS.splice(2,0,
            <SettingsBlank title='ScreenSaver Day Hour Start: (0-23/24)'
                current={SCREENSAVER_BRIGHTNESS.dayHourStart}
                verifyLevel={0}
                onUpdate={(value, password)=>{const hour = parseInt(value);
                    if(hour >=0 && hour <= 24) {dispatch({type: 'dayHourStart', payload: hour}); return true;} //24 is disabled
                    else return false;}}/>,
            <SettingsBlank title='ScreenSaver Day Opacity: (%)'
                current={SCREENSAVER_BRIGHTNESS.dayOpacity*100}
                verifyLevel={0}
                onUpdate={(value, password)=>{const opacity = (parseInt(value)/100);
                    if(opacity >=0 && opacity <= 1) {dispatch({type: 'dayOpacity', payload: opacity}); return true;}
                    else return false;}}/>,  
            <SettingsBlank title='ScreenSaver Night Hour Start: (0-23/24)'
                current={SCREENSAVER_BRIGHTNESS.nightHourStart}
                verifyLevel={0}
                onUpdate={(value, password)=>{const hour = parseInt(value);
                    if(hour >=0 && hour <= 24) {dispatch({type: 'nightHourStart', payload: hour}); return true;}
                    else return false;}}/>,
            <SettingsBlank title='ScreenSaver Night Opacity: (%)'
                current={SCREENSAVER_BRIGHTNESS.nightOpacity*100}
                verifyLevel={0}
                onUpdate={(value, password)=>{const opacity = (parseInt(value)/100);
                    if(opacity >=0 && opacity <= 1) {dispatch({type: 'nightOpacity', payload: opacity}); return true;}
                    else return false;}}/>,  
            <SettingsBlank title='ScreenSaver Black Hour Start: (0-23/24)'
                current={SCREENSAVER_BRIGHTNESS.blackHourStart}
                verifyLevel={0}
                onUpdate={(value, password)=>{const hour = parseInt(value);
                    if(hour >=0 && hour <= 24) {dispatch({type: 'blackHourStart', payload: hour}); return true;}
                    else return false;}}/>            
            );
    
    return((DATA == {} || DATA.CONTROLS == undefined) ? <div id='settings-container'>{LOCAL_SETTINGS}</div>
    : <div id='settings-container'>
        {LOCAL_SETTINGS}
        <SettingsButton title='Evaluate Conditions' pendingText='EXECUTING'
            onUpdate={async(password)=>{setTimeout(()=>fetchData(), 60000); return await put('/evaluate', {PASSWORD: password}, 'COMPLETE');}} />  
        <SettingsBlank title='Postpone Next Evaluation: (ms)'
            current={0}
            numberStep={60000}
            verifyLevel={1}
            onUpdate={(value, password)=>post('/postpone-evaluation', {PASSWORD: password,
                duration: value,
            })}/>  
        <SettingsList title='Status Email Recipients:'
            dropListId='status-email'
            current={DATA.emailStatusRecipients}
            verifyLevel={1}
            addCustom={true}
            inputType='email'
            onUpdate={(value, password)=>post('/set-settings', {PASSWORD: password,
                tag: 'emailStatusRecipients',
                emailStatusRecipients: value,
            })}/> 
        <SettingsButton title='Send Update Email' pendingText='SENDING'
            onUpdate={(password)=>put('/send-update-email', {PASSWORD: password}, 'SENT')}/>
        <SettingsList title='Issue Email Recipients:'
            dropListId='issue-email'
            current={DATA.emailIssueRecipients}
            addCustom={true}
            inputType='email'
            onUpdate={(value, password)=>post('/set-settings', {ADVANCED_PASSPHRASE: password,
                tag: 'emailIssueRecipients',
                emailIssueRecipients: value,
            })}/> 
        <SettingsBlank title='Email Report:'
            current={''}
            inputType='textarea'
            verifyLevel={1}
            onUpdate={(value, password)=>post('/save-log', {PASSWORD: password, email: true,
                message: value,
            })}/> 
        <SettingsList title='Email Update Regularity:'
            dropListId='email-update-regularity'
            current={DATA.updateRegularity}
            options={DATA.updateRegularityOptions}
            onUpdate={(value, password)=>post('/set-settings', {ADVANCED_PASSPHRASE: password,
                tag: 'updateRegularity',
                updateRegularity: value,
            })}/> 
        <SettingsList title='Allow Database Access:'
            dropListId='allow-database'
            current={DATA.accessDatabase}
            options={[true, false]}
            onUpdate={(value, password)=>post('/set-settings', {ADVANCED_PASSPHRASE: password,
                tag: 'accessDatabase',
                accessDatabase: value,
            })}/>  
        <SettingsBlank title='Evaluation Frequency: (m)'
            current={DATA.evaluationFrequency/(60000)}
            numberStep={1}
            onUpdate={(value, password)=>post('/set-settings', {ADVANCED_PASSPHRASE: password,
                tag: 'evaluationFrequency',
                evaluationFrequency: (value*60000),
            })}/> 
        <SettingsBlank title='Maximum Temperature: (c)'
            current={DATA.maximumTemperature}
            numberStep={0.5}
            onUpdate={(value, password)=>post('/set-settings', {ADVANCED_PASSPHRASE: password,
                tag: 'maximumTemperature',
                maximumTemperature: value,
            })}/> 
        <SettingsBlank title='Minimum Temperature: (c)'
            current={DATA.minimumTemperature}
            numberStep={0.5}
            onUpdate={(value, password)=>post('/set-settings', {ADVANCED_PASSPHRASE: password,
                tag: 'minimumTemperature',
                minimumTemperature: value,
            })}/> 
        <SettingsBlank title='Maximum Humidity: (%)'
            current={DATA.maximumHumidity}
            onUpdate={(value, password)=>post('/set-settings', {ADVANCED_PASSPHRASE: password,
                tag: 'maximumHumidity',
                maximumHumidity: value,
            })}/> 
        <SettingsBlank title='Minimum Humidity: (%)'
            current={DATA.minimumHumidity}
            onUpdate={(value, password)=>post('/set-settings', {ADVANCED_PASSPHRASE: password,
                tag: 'minimumHumidity',
                minimumHumidity: value,
            })}/> 
        <SettingsBlank title='Hour Day Starts: (h)'
            current={DATA.dayHourStart}
            onUpdate={(value, password)=>post('/set-settings', {ADVANCED_PASSPHRASE: password,
                tag: 'dayHourStart',
                dayHourStart: value,
            })}/> 
        <SettingsBlank title='Hour Night Starts: (h)'
            current={DATA.nightHourStart}
            onUpdate={(value, password)=>post('/set-settings', {ADVANCED_PASSPHRASE: password,
                tag: 'nightHourStart',
                nightHourStart: value,
            })}/> 
        <SettingsList title='Sensor Type:'
            dropListId='sensor-type'
            current={DATA.sensorType}
            options={DATA.sensorTypes}
            onUpdate={(value, password)=>post('/set-settings', {ADVANCED_PASSPHRASE: password,
                tag: 'sensorType',
                sensorType: value,
            })}/>  
        <SettingsList title='Sensor Mode:'
            dropListId='sensor-mode'
            current={DATA.sensorMode}
            options={DATA.sensorModes}
            onUpdate={(value, password)=>post('/set-settings', {ADVANCED_PASSPHRASE: password,
                tag: 'sensorMode',
                sensorMode: value,
            })}/>
        <SettingsButton title='Test Sensor' pendingText='Redirecting'
            verifyLevel={0}
            onUpdate={(password)=>routeHistory.push('/sensor-testing')} />
        {DATA.CONTROLS.map((c,i)=><div key={`${c.id}-${i}`} ><SettingsBlank key={`name-${c.id}`} title={`[${c.id}] Control Name:`}
                current={c.name}
                onUpdate={(value, password)=>post('/set-settings', {ADVANCED_PASSPHRASE: password,
                    tag: 'controls-name',
                    id: c.id,
                    name: value,
                })}/> 
            <SettingsList key={`types-${c.id}`} title={`[${c.id}] Control Types:`}
                dropListId={`control-types-${c}-${i}`}
                current={c.types}
                options={DATA.controlTypes}
                selectMultiple={true}
                addCustom={true}
                onUpdate={(value, password)=>post('/set-settings', {ADVANCED_PASSPHRASE: password,
                    tag: 'controls-types',
                    id: c.id,
                    types: value,
                })}/></div>)}

        <SettingsButton title='Reset Settings' pendingText='CONFIGURING'
            verifyLevel={3}
            onUpdate={async(password)=>{const result = await post('/reset-settings', {ADVANCED_PASSPHRASE: password}, 'RESETTING'); fetchData(); return result;}} />
        <SettingsButton title='Reset File System' pendingText='CONFIGURING'
            verifyLevel={3}
            onUpdate={async(password)=>{const result = await post('/reset-file-system', {ADVANCED_PASSPHRASE: password}, 'RESETTING'); fetchData(); return result;}} />
        <SettingsButton title='Terminate Server' pendingText='CONFIGURING'
            verifyLevel={3}
            onUpdate={(password)=>post('/terminate', {ADVANCED_PASSPHRASE: password}, 'TERMINATING')} />
        <SettingsButton title='Restart PI' pendingText='CONFIGURING'
            verifyLevel={3}
            onUpdate={(password)=>post('/restart-pi', {ADVANCED_PASSPHRASE: password}, 'RESTARTING')} />
        <SettingsList dropListId={`Error_Lights_Override`}
                title='Error Lights:'
                current={'Select Mode'}
                options={['on', 'off', 'flash', 'bounce', 'max', 'min', 'humid', 'lock', 'unlock', 'reset']}
                selectMultiple={false}
                addCustom={true}
                verifyLevel={1}
                onUpdate={(value, password)=>post('/execute-error-lights', {PASSWORD: password,
                    tag: 'error-lights',
                    mode: new Array(value).pop(),
                })}/>
        <SettingsButton title='Server Log' pendingText='Redirecting'
            verifyLevel={0}
            onUpdate={(password)=>routeHistory.push('/log')} />
        <SettingsBlank title='Save to Log:'
            current={''}
            inputType='textarea'
            verifyLevel={1}
            onUpdate={(value, password)=>post('/save-log', {PASSWORD: password,
                message: value,
            })}/> 
        <SettingsButton title='Log Out' pendingText='CLEARING'
            verifyLevel={0}
            onUpdate={()=>{localStorage.clear(); return 'CLEARED PASSWORD'}} />

    </div>);
}
export default Settings;