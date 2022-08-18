import React, {useState, useEffect} from 'react';
import { useSelector} from 'react-redux';
import axios from 'axios';
import Verify from '../Verify';

import '../index.css';
import './Climate.css';

const getButtonColor=(buttonText)=>(buttonText=='') ? 'transparent' : (buttonText=='UPDATE') ? 'var(--main-color)' : (buttonText=='PASS' || buttonText=='INVALID' || buttonText=='FAILED') ? '#e8000d' : (buttonText=='PENDING' || buttonText=='BLANK') ? 'orange' : '#cc5500';

const Climate = (props) => {
    const convertToFahrenheit = useSelector(root => root.convertToFahrenheit);
    const SERVER_URL = useSelector(root => root.serverURL);
    const [CLIMATE, setCLIMATE] = useState([]);
    const [range, setRange] = useState({maximumTemperature: 24, maximumHumidity: 75, minimumTemperature: 24, minimumHumidity: 75})
    const [temperatureMode, setTemperatureMode] = useState(true);
    const [saveButtonText, setSaveButtonText] = useState('Pending');
    const [verification, setVerification] = useState(undefined);

//API Referencing
    const fetchClimate = () => axios.get(`${SERVER_URL}/data-climate/`).then((response) => { console.log('CLIMATE', response.data);
        setCLIMATE(response.data.climate);  setSaveButtonText('');
        setRange({maximumTemperature: response.data.maximumTemperature, maximumHumidity: response.data.maximumHumidity, minimumTemperature: response.data.minimumTemperature, minimumHumidity: response.data.minimumHumidity});
    }).catch((error) => console.log('Failed to Fetch Climate Information', error));
    useEffect(()=>fetchClimate(),[temperatureMode]);

    const sendChanges = (password) => {setVerification(undefined); 
    // if(saveButtonText == 'Save Changes')
        axios.post(`${SERVER_URL}/set-settings/`, {ADVANCED_PASSPHRASE: password,
            tag: temperatureMode ? 'climate-temperature' : 'climate-humidity',
            climate: JSON.stringify(CLIMATE),
        }).then((response) => { setSaveButtonText('Saved'); console.log(response);
            setTimeout(()=>{fetchClimate();}, 5000);
        }).catch((error) => console.log('Failed to Fetch Climate Information', error));
    // else setSaveButtonText('45');
}

//UI Utilities
    const formatTemperature = (temp) => convertToFahrenheit ? (Math.round((temp*(9/5)+32)*10)/10) : temp;
    const getMaxValue = (format=false, ghost=false, round = true) => {const value = (temperatureMode != ghost) ? format ? formatTemperature(range.maximumTemperature) : range.maximumTemperature  : range.maximumHumidity; return round ? Math.ceil(value) : value; }
    const getMinValue = (format=false, ghost=false, round = true) => {const value = (temperatureMode != ghost) ? format ? formatTemperature(range.minimumTemperature) : range.minimumTemperature :  range.minimumHumidity; return round ? Math.floor(value) : value; }

    const getWidthOffset = () => 5.0 * parseFloat(getComputedStyle(document.documentElement).fontSize); //rem unit = column 1 & margin/padding

    const getRange = (format=false) => {let values = [];
        const cellRatio = ((window.innerWidth-(getWidthOffset()))/((getMaxValue(format)-getMinValue(format))*(2.0*parseFloat(getComputedStyle(document.documentElement).fontSize))));
        for(var i=(getMinValue(format)); i<(getMaxValue(format)); i += Math.ceil(1/cellRatio)) { values.push(i); }
                values.push(getMaxValue(format)); return values; }

    const calculatedWidth = (3.5 * getRange(true).length * (1.0*parseFloat(getComputedStyle(document.documentElement).fontSize)))+getWidthOffset(); //Designed to Allow twice space for getRange() list


    return(<div id='climate-container'  >
        <div id='climate-header-box'>
            <button className='climate-header-button' style={{backgroundColor: temperatureMode ? 'rgba(0, 102, 0, 0.6)' : 'rgba(255, 255, 255, 0.4)', color: temperatureMode ? 'white' : 'black'}} onClick={()=>setTemperatureMode(true)}>Temperature</button>
            <button className='climate-header-button' style={{backgroundColor: temperatureMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 102, 0, 0.6)',  color: temperatureMode ? 'black' : 'white'}} onClick={()=>setTemperatureMode(false)}>Humidity</button>
            {saveButtonText != '' ? <button className='climate-header-button' style={{backgroundColor: (saveButtonText == 'Saved' || saveButtonText == 'Save Changes') ? '#cc5500' : (saveButtonText == 'Pending') ? 'orange' : '#e8000d',  color: 'black'}} onClick={()=>{setSaveButtonText('Pending'); setVerification('Enter Advanced Passphrase to Proceed:');}}>{saveButtonText}</button> : <section className='none no-size'></section>}
        </div>
        <div id='climate-slider-box' className='none ' style={{maxWidth: `${calculatedWidth}px`}}>
                <div className='none climate-slider-value-box' style={{gridRow: 1, gridColumn: 1, paddingLeft: '4.0rem', paddingRight: '2.0rem', width: `${(calculatedWidth*1)-(1*getWidthOffset())-0}px`,}}>
                    {getRange(false).map((v,j) => <label key={`climate-slider-range-value-$first-${j}`} className='climate-slider-range-value' style={{gridColumn: (j+1), textAlign: j==0 ? 'left' : (j == (getRange(false).length-1)) ? 'right' : 'center'}}>{v}</label>)}
                </div>
            {CLIMATE.map( (item, i) => <div key={`slider-${i}`} className='none climate-slider-outer-box' style={{gridRow: (i+2)}} >              
                <strong className='climate-hour-value' style={{}}>{item.hour}:00</strong>
                <strong className='climate-hour-value' style={{gridRow: 2, color: 'var(--main-color)', fontSize: '0.8rem'}}>{temperatureMode ? parseFloat(item.temperature).toFixed(1) : parseFloat(item.humidity).toFixed(1)} {temperatureMode ? <span className='none' style={{fontSize: '0.65rem', verticalAlign: 'top'}}>&#8457;</span> : '%'}</strong>

                <input readOnly className='none climate-slider-range-bar climate-slider-range-bar-ghost' style={{width: `${(calculatedWidth*1)-(1*getWidthOffset())-0}px`, }} type='range' step='0.01' min={getMinValue(false, true, false)} max ={getMaxValue(false, true, false)} value={!temperatureMode ? CLIMATE[i].temperature : CLIMATE[i].humidity} />
                <input readOnly className='none climate-slider-range-bar climate-slider-range-bar-ghost-dot' style={{width: `${(calculatedWidth*1)-(1*getWidthOffset())-0}px`, }} type='range' step='0.01' min={getMinValue(false, false, false)} max ={getMaxValue(false, false, false)} value={temperatureMode ? CLIMATE[i].temperatureAverage : CLIMATE[i].humidityAverage} />
                <input className='none climate-slider-range-bar' style={{width: `${(calculatedWidth*1)-(1*getWidthOffset())-0}px`, }} type='range' step='0.01' min={getMinValue(false, false, false)} max ={getMaxValue(false, false, false)} value={temperatureMode ? CLIMATE[i].temperature : CLIMATE[i].humidity} onChange={(event)=>{temperatureMode ? CLIMATE[i].temperature=event.target.value : CLIMATE[i].humidity=event.target.value;  setCLIMATE([...CLIMATE]); setSaveButtonText('Save Changes');}} />
                {/* <input className='none climate-slider-range-bar' style={{width: `${(calculatedWidth*1)-(1*getWidthOffset())-0}px`, }}  type='range' step='0.01'  min={getMinValue(false)} max ={getMaxValue(false)} value={sample} onChange={(event)=>{console.log(event.target.value, formatTemperature(event.target.value)); setSample(event.target.value);}} /> */}

                <div id={`data-${i}`} className='none climate-slider-value-box' style={{width: `${(calculatedWidth*1)-(1*getWidthOffset())-0}px`, }}>
                    {getRange((i % 2) == 0).map((v,j) => <label key={`climate-slider-range-value-${i}-${j}`} className='climate-slider-range-value' style={{gridColumn: (j+1), textAlign: j==0 ? 'left' : (j == (getRange((i % 2) == 0).length-1)) ? 'right' : 'center'}}>{v}</label>)}
                </div>
                </div>)}
        </div>
        {verification ?
            <Verify
                prompt={verification}
                onSubmit={sendChanges}
                onCancel={()=>{setVerification(undefined); setSaveButtonText(''); fetchClimate();}}
            />  : <div className='none no-size' style={{position:'absolute'}}></div>}
    </div>);
}
export default Climate;