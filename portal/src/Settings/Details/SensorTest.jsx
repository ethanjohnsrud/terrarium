import React, {useEffect, useState} from 'react';
import { useSelector} from 'react-redux';
import axios from 'axios';
import SettingsList from '../SettingsList';
import SettingsBlank from '../SettingsBlank';
import SettingsButton from '../SettingsButton';


import '../../index.css';
import '../Settings.css';


const SensorTest = (props) => {
    const SERVER_URL = useSelector(root => root.serverURL);
    const DATA = useSelector(root => root.data);
    const [current, setCurrent] = useState('');
    const [testingDuration, setTestingDuration] = useState(60000);
    const [testingInterval, setTestingInterval] = useState(5000);
    const [fetchingError, setFetchingError] = useState('');

    let interval = null;
    let timer = null;
    const startTesting = () => { clearInterval(interval); clearTimeout(timer); setFetchingError('');
        interval = setInterval(async()=>await axios.get(`${SERVER_URL}/sensor-test/`)
                .then((response)=>{setCurrent(response.data); setFetchingError('');})
                .catch((error)=>{console.log('Failed to Get Sensor Testing Data', error); setFetchingError(error);}), 500);
        timer = setTimeout(()=>{clearInterval(interval); setFetchingError('');}, testingDuration+30000);
        }
    
    return(<div id='sensor-test-container' >
    <div className='sensor-test-first-header' >
        {/* <section style={{gridColumn: 1, gridRow:1, width: '100%'}}> */}
        <SettingsList title='Sensor Type:' 
            dropListId='sensor-testing-sensor-type'
            current={DATA.sensorType}
            options={DATA.sensorTypes}
            condense={true}
            onUpdate={async(value, password)=>await axios.get(`${SERVER_URL}/settings/`, {ADVANCED_PASSPHRASE: password,
                tag: 'sensorType',
                sensorType: value,
            }).then((response)=>true)
            .catch((error)=>error.response ? error.response.status : false)}/> 
        {/* </section><section style={{gridColumn: 3, gridRow:1, width: '100%'}}> */}
        <SettingsBlank title='Test Duration: (m)'
            current={testingDuration/60000}
            condense={true}
            verifyLevel={0}
            onUpdate={(value, password)=>{const minutes = parseInt(value); if(!isNaN(minutes) && value == minutes && minutes > 0) {setTestingDuration(minutes*60000); return true;} else return false;}}/> 
        {/* </section><section style={{gridColumn: 4, gridRow:1, width: '100%'}}> */}
        <SettingsBlank title='Test Interval: (s)'
            current={testingInterval/1000}
            condense={true}
            verifyLevel={0}
            onUpdate={(value, password)=>{const seconds = parseInt(value); if(!isNaN(seconds) && value == seconds && seconds > 0) {setTestingInterval(seconds*1000); return true;} else return false;}}/>
            {/* </section> */}
    </div><div className='sensor-test-second-header' >
        <SettingsButton title={fetchingError == '' ? 'RESTART' : 'fetchingError'} pendingText='QUEUING'
            buttonColor={fetchingError != '' ? 'darkred' : ''}
            condense={true}
            verifyLevel={2}
            onUpdate={async(password)=>await axios.post(`${SERVER_URL}/sensor-test-restart/`, {ADVANCED_PASSPHRASE: password,
                duration: testingDuration, interval: testingInterval,
            }).then((response)=>{startTesting(); return 'INITIATING';})
            .catch((error)=>error.response ? error.response.status : false)}
            />
        <SettingsButton title='UPDATE' pendingText='LOADING'
            condense={true}
            verifyLevel={0}
            onUpdate={async(password)=>await axios.get(`${SERVER_URL}/sensor-test/`)
                .then((response)=>{setCurrent(response.data); return 'CURRENT';})
                .catch((error)=>error.response ? error.response.status : false)}
            />
    </div><div className='sensor-test-results'>
        <table style={{margin: 0, width: '100%', border: 'none', borderSpacing: '4px'}}>
            <tr>
                <th style={{padding: '3px', textAlign: 'center'}} >Time</th>
                <th style={{padding: '3px', textAlign: 'center'}} >Temperature</th>
                <th style={{padding: '3px', textAlign: 'center'}} >Humidity</th>
                <th style={{padding: '3px', textAlign: 'center'}} >Message</th>
            </tr>
            {current.split('\n').map((p,i) => (p=='') ? <br key={`${p}-${current.length}`}/> : <tr key={`${p}-${current.length}`}> 
                {p.split('|').map((r, i) => <td key={`${r}-${p}-${current.length}`} style={{padding: '3px', textAlign: (i == 0) ? 'left' : 'center'}} colspan={((4 / p.split('|').length) > 1) ? Math.floor((4 / p.split('|').length)) : 1}>{r}</td>)}
            </tr>)}

        </table>
    </div>
    </div>);
}
export default SensorTest;
