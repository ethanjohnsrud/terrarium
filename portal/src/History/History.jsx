import React, {useState, useEffect} from 'react';
import { useSelector} from 'react-redux';
import axios from 'axios';
import dateFormat from 'dateformat';
import SettingsButton from '../Settings/SettingsButton';


import '../index.css';
import './History.css';


const History = (props) => {
    const SERVER_URL = useSelector(root => root.serverURL);
    const DATA = useSelector(root => root.data);
    const convertToFahrenheit = useSelector(root => root.convertToFahrenheit);
    const [dayList, setDayList] = useState([]);
    const [climate, setClimate] = useState([]);

    const formatTemperature = (temp) => convertToFahrenheit ? (Math.round(((temp*(9/5)+32)) * 100) / 100) : temp;

    const getTemperatureOff = (current = DATA.operatingTemperature, goal = DATA.goalTemperature) => (Math.abs(current - goal) < 1) ? <span></span> : <span>[<small>{current > goal ? '+' : '-'}</small>{Math.floor(Math.abs(current - goal))}<span>&#176;</span>]</span>;

    const getHumidityOff = (current = DATA.operatingHumidity, goal = DATA.goalHumidity) => (Math.abs(current - goal) < 1) ? <span></span> : <span>[<small>{current > goal ? '+' : '-'}</small>{Math.floor(Math.abs(current - goal))}<small>%</small>]</span>;

    const getEfficiency = (value, time, temperature = true) => {if(climate == undefined) return '-';
        const hour = new Date(time).getHours(); 
        let current = undefined;  for(var i=0; i<climate.length; i++) { if(hour == climate[i].hour) { current = climate[i]; break;}}
      return !current ? 0 : Math.floor((value/(temperature ? current.temperature : current.humidity)) * 100);
    }
    
    const getDuration = (ms) => `${Math.floor(ms/60000)}:${Math.abs(ms)%60000<10000?'0':''}${Math.floor((Math.abs(ms)%60000)/1000)}`;
    
    const updateHistory = async() => {
        axios.get(`${SERVER_URL}/data-climate/`).then((response) => { setClimate(response.data.climate);  console.log('CLIMATE', response.data);
                    }).catch((error) => console.log('Failed to Fetch Climate Information', error));
        return await axios.get(`${SERVER_URL}/data-history/`)
                    .then((response)=>{setDayList(response.data);  console.log('HISTORY', response.data); return 'LOADING'})
                    .catch((error)=>error.response ? error.response.status : false);;
    }
    useEffect(()=>updateHistory(),[]);
    
    return(<div id='history-container' >
        <SettingsButton title='UPDATE' pendingText='RETRIEVING'
            condense={true}
            verifyLevel={0}
            onUpdate={()=>updateHistory()}
            />
        <table style={{margin: 0, width: '100%', border: '2px solid #013214', color: 'white', borderSpacing: '4px'}}>
            <thead>
                <tr>
                    <th style={{padding: '3px', fontWeight: 700,  fontFamily: `'New Tegomin', serif`, textAlign: 'center',}} >Time</th>
                    <th style={{padding: '3px', fontWeight: 700,  fontFamily: `'New Tegomin', serif`, textAlign: 'center',}} >Temperature</th>
                    <th style={{padding: '3px', fontWeight: 700,  fontFamily: `'New Tegomin', serif`, textAlign: 'center',}} >Humidity</th>
                    <th style={{padding: '3px', fontWeight: 700,  fontFamily: `'New Tegomin', serif`, textAlign: 'center',}} >Active</th>
                    <th style={{padding: '3px', fontWeight: 700,  fontFamily: `'New Tegomin', serif`, textAlign: 'center',}} >Inactive</th>
                </tr>
            </thead>
            <tbody>
            {!(dayList && dayList.length) ? <tr><td style={{padding: '3px', textAlign: 'center' }} >No History Available</td></tr>
                : dayList.map(r=><tr>
                    <td style={{padding: '3px', border: '0.05rem solid #013214', textAlign: 'center' }} >{dateFormat(r.time, ((new Date().getTime() - r.time)<(6*24*60*60*1000)) ? 'DDDD, H:MM' : 'mmm-d H:MM')}</td>
                    <td style={{padding: '3px', border: '0.05rem solid #013214', textAlign: 'center' }} >{formatTemperature(r.temperature)}{convertToFahrenheit ? <small>&#8457;</small> : <small>&#8451;</small>} {getTemperatureOff(formatTemperature(r.temperature), formatTemperature(r.goalTemperature))}</td>
                    <td style={{padding: '3px', border: '0.05rem solid #013214', textAlign: 'center' }} >{r.humidity}% {getHumidityOff(r.humidity, r.goalHumidity)}</td>
                    <td style={{padding: '3px', border: '0.05rem solid #013214', textAlign: 'center', fontSize: '0.7em' }} >{
                        !r.active.length ? null : <table style={{margin: 0, width: '100%', borderSpacing: '2px' }}><tbody>
                        {r.active.map(c=><tr>
                                <td style={{textAlign: 'center' }} >{`${c.name}  [${c.settings[0].reason}]`}</td>
                            </tr>)}
                            </tbody>
                        </table>
                    }</td>
                    <td style={{padding: '3px', border: '0.05rem solid #013214', textAlign: 'center', fontSize: '0.7em' }} >{
                        !r.active.length ? null : <table style={{margin: 0, width: '100%', borderSpacing: '2px' }}><tbody>
                        {r.inactive.map(c=><tr>
                                <td style={{textAlign: 'center' }} >{`${c.name}  [${c.settings[0].reason}]`}</td>
                            </tr>)}
                            </tbody>
                        </table>
                    }</td>
                </tr>)}             
            </tbody> 
        </table>
    </div>);
}
export default History;