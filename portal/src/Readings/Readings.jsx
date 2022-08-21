import React, {useState, useEffect, forwardRef, useRef} from 'react';
import { useHistory} from "react-router-dom";
import { useSelector, useDispatch} from 'react-redux';
import dateFormat from 'dateformat';
import useInterval from '../useInterval';
import './Readings.css';
import '../index.css';
import SettingsButton from '../Settings/SettingsButton';
import { fetchData } from '..';
import SettingsBlank from '../Settings/SettingsBlank';


const BACKGROUNDCOLOR = 'rgba(24, 98, 24, 0.5)';
const ERRORBACKGROUNDCOLOR = 'darkred';
const HOLDINGBACKGROUNDCOLOR = '#cc5500';


 const Readings = forwardRef((props, ref) => {
    const [nextCountDown, setNextCountDown] = useState(0);
    const [previousCountUp, setPreviousCountUp] = useState(0);
    const [sensorColor, setSensorColor] = useState(BACKGROUNDCOLOR);
    const [maxError, setMaxError] = useState(2);
    const [ERROR_LIST, setERROR_LIST] = useState(['SERVER DISCONNECTED']);
    const DATA = useSelector(root => root.data);
    const SERVER_URL = useSelector(root => root.serverURL);
    const convertToFahrenheit = useSelector(root => root.convertToFahrenheit);
    const dispatch = useDispatch();
    const routeHistory = useHistory();
    const sensorRef = useRef(); 
    
    const showDetails = () => (props.hideDetails && maxError == 0) ? false : true;

    const getDefaultBackgroundColor = () => showDetails() ? 'rgba(24, 98, 24, 0.85)' : 'rgba(24, 98, 24, 0.3)';

    const getSensorFontColor = () => (sensorColor == ERRORBACKGROUNDCOLOR || !maxError || !DATA.frequencyActive) ? 'white' : ERRORBACKGROUNDCOLOR;

    const getTemperaturePercent = (current = DATA.operatingTemperature, goal = DATA.goalTemperature, min = DATA.minimumTemperature, max = DATA.maximumTemperature) => (current >= max) ? 2 + ((current-max) * (1/(max-min))) : (current <= min) ? ((current-min) * (1/(max-min))) : 1 - ((goal-current) * (1/(max-min))); 

    const getHumidityPercent = (current = DATA.operatingHumidity, goal = DATA.goalHumidity, min = DATA.minimumHumidity, max = DATA.maximumHumidity) => (current >= max) ? 2 + ((current-max) * (1/(max-min))) : (current <= min) ? ((current-min) * (1/(max-min))) : 1 - ((goal-current) * (1/(max-min))); 

//Evaluate Current Errors //Error 0, 1, 2
    useEffect(()=>{let max = 0; let list = [];
        if(DATA.sensorErrorCode == undefined) {max = 2; list.push('SERVER DISCONNECTED');}
        else {//Ordered Importance
            if(DATA.sensorErrorCode) {max = Math.max(max, DATA.sensorErrorCode); list.push('SENSOR ERROR');}
            if(DATA.maximumTemperatureErrorCode) {max = Math.max(max, DATA.maximumTemperatureErrorCode); list.push('MAXIMUM TEMPERATURE');}
            if(DATA.minimumTemperatureErrorCode) {max = Math.max(max, DATA.minimumTemperatureErrorCode); list.push('MINIMUM TEMPERATURE');}
            if(DATA.maximumHumidityErrorCode) {max = Math.max(max, DATA.maximumHumidityErrorCode); list.push('MAXIMUM HUMIDITY');}
            if(DATA.minimumHumidityErrorCode) {max = Math.max(max, DATA.minimumHumidityErrorCode); list.push('MINIMUM HUMIDITY');}
            if((DATA.accessDatabase != undefined && !DATA.accessDatabase)) {max = Math.max(max, 1); list.push('DATABASE LOCKED');}
        } setMaxError(max); setERROR_LIST(list);
    },[DATA]);

    useInterval(()=>{setNextCountDown(DATA.timeNextEvaluation - new Date().getTime()); setPreviousCountUp(new Date().getTime() - DATA.timeLastReading)
                    setSensorColor(previous => (maxError == 1 || previous == 'whitesmoke') ? ERRORBACKGROUNDCOLOR : (maxError > 1) ? 'whitesmoke' : getDefaultBackgroundColor()); 
    }, 1000);

    const formatTemperature = (temp) => (Math.round((convertToFahrenheit ? ((temp*(9/5)+32)) : temp) * 100) / 100);

    const getSensor = () => (DATA.operatingTemperature && !showDetails()) ? <div className='none no-size'></div>
        : <div ref={sensorRef} id='condition-details' className='none readings-box-outer' style={{color: getSensorFontColor()}}>
            <div className='readings-box-inner' style={{backgroundColor: sensorColor}}>
                <div className=' readings-value-box' >
                    {(ERROR_LIST.length) 
                        ? <strong id={'readings-top-error'} style={{color: sensorColor == ERRORBACKGROUNDCOLOR ? 'white' : ERRORBACKGROUNDCOLOR}}>{ERROR_LIST[0]}</strong>
                        : <div className='none no-size'></div>
                     }
                    {(ERROR_LIST.length > 1) ? ERROR_LIST.slice(1).map((e,i)=><strong key={`error-${i}`} className=' ' style={{gridRow: (i+3), gridColumn: 1, overflowX: 'auto', fontSize: '1.2rem', fontFamily: `'New Tegomin', serif`, margin: 0, color: sensorColor == ERRORBACKGROUNDCOLOR ? 'white' : ERRORBACKGROUNDCOLOR}} >{e}</strong>): <div className='none no-size'></div>}
                    {(ERROR_LIST.length > 1) ? <hr style={{borderColor: getSensorFontColor()}}></hr> : <div className='none no-size'></div>}
                    {(DATA.statusMessage && DATA.statusMessage.length) ?  <div style={{display: 'inline-grid', gridRow: 2, gridColumn: 1,}}>
                    {DATA.statusMessage.match(/[^\r\n]+/g).reverse().map((m, i)=>
                        <section key={`statusMessage-${i}`} className='readings-status-message' style={{gridRow: (i+2)}} >➳ {m}</section>
                    )} </div> : <div className='none no-size'></div>}
                    {(DATA.operatingSchedules || []).length 
                        ? <p className={'readings-schedule-list'}  >{DATA.operatingSchedules.join(' | ')}</p>
                        : <div className='none no-size'></div>}
                </div>
                {(DATA.operatingTemperature) ? <section className='readings-value-box'>
                    <hr style={{borderColor: getSensorFontColor()}}></hr>
                    <p className='none readings-description' style={{gridRow: 2, gridColumn: 1,}} >Last Sensor Reading:</p>
                    <strong className='none readings-value' style={{gridRow: 2, gridColumn: 2, }} >{dateFormat(DATA.timeLastReading, 'm-d-yy HH:MM')}{previousCountUp > DATA.evaluationFrequency ? ` [${`${(previousCountUp>3600000)?`${Math.floor(previousCountUp/3600000)}:`:''}${(previousCountUp>60000)?`${Math.floor((previousCountUp%3600000)/60000)}:`:''}${((previousCountUp>60000) && (previousCountUp%60000<10000))?'0':''}${Math.floor((previousCountUp%60000)/1000)}`}]`: ''}</strong>
                    <p className='none readings-description' style={{gridRow: 3, gridColumn: 1, }} >Sensor Frequency:</p>
                    <strong className='none readings-value' style={{gridRow: 3, gridColumn: 2, }} >{DATA.evaluationFrequency/60000} minutes</strong>
                    <p className='none readings-description' style={{gridRow: 4, gridColumn: 1,  }} >Next Evaluation:</p>
                    <strong className='none readings-value' style={{gridRow: 4, gridColumn: 2, }} >{nextCountDown <= 0 ? 'Reading' : nextCountDown > 60000 ? `${Math.floor(nextCountDown/60000)}:${nextCountDown%60000<10000?'0':''}${Math.floor((nextCountDown%60000)/1000)}` : `${Math.floor(nextCountDown/1000)} seconds`}</strong>
                </section> 
                : <div className='none no-size'></div>}
            </div>
            {(DATA.sensorErrorCode == undefined) ? 
                <div className='readings-box-inner' style={{backgroundColor: 'rgba(0,0,0,0.75)'}}>
                <SettingsBlank title='Server URL:'
                    current={SERVER_URL}
                    verifyLevel={0}
                    cache={true}
                    overrideValidation={true}
                    onUpdate={async(value, password)=>{
                        dispatch({type: 'setServerURL', payload: value}); 
                        const response = await fetchData(); if(response == true) routeHistory.push('/'); 
                        return (response == true) ? 'UPDATING' : response;}}
                />
            </div> : <div className='none no-size'></div>}
        </div>;

    const getTemperature = () => (DATA.operatingTemperature) ? <div id='temperature-section' className='none readings-box-outer' style={{marginLeft: align ? 'auto' : 0}}>
            <div className='readings-box-inner' style={{backgroundColor: maxError ? ERRORBACKGROUNDCOLOR : getDefaultBackgroundColor()}}>
                <section className='none readings-value-box' style={{columnGap: '0'}}>
                        <strong className='none readings-main-value' style={{}} >{formatTemperature(DATA.operatingTemperature)}</strong>
                        <p className='none ' style={{gridRow: 1, gridColumn: 2, verticalAlign: 'top', fontSize: '1.0rem'}} >{convertToFahrenheit ? <span>&#8457;</span> : <span>&#8451;</span>}</p>
                    </section>
                {!showDetails() ? <div className='none no-size'></div> 
                : <section className='readings-value-box'>
                        <p className='none readings-title' style={{}} >Temperature</p>
                        <p className='none readings-description' style={{gridRow: 2, gridColumn: 1, }} >Efficiency:</p>
                        <strong className='none readings-value' style={{gridRow: 2, gridColumn: 2, }} >{Math.floor(getTemperaturePercent()*100)}%</strong>
                        <p className='none readings-description' style={{gridRow: 3, gridColumn: 1, }} >Range:</p>
                        <strong className='none readings-value' style={{gridRow: 3, gridColumn: 2, }} >{formatTemperature(DATA.minimumTemperature)} - {formatTemperature(DATA.maximumTemperature)}{convertToFahrenheit ? <span>&#8457;</span> : <span>&#8451;</span>}</strong>
                </section> }     
            </div>     
        </div> : <div id='temperature-section' className='none no-size'></div>;


    const getHumidity = () => (DATA.operatingHumidity) ? <div id='humidity-section'  className='none readings-box-outer' style={{marginRight: align ? 'auto' : '0'}}>
            <div className='readings-box-inner' style={{backgroundColor: maxError ? ERRORBACKGROUNDCOLOR : getDefaultBackgroundColor()}}>
                <section className='none readings-value-box' style={{columnGap: '0'}}>
                    <strong className='none readings-main-value' style={{}} >{Math.round(DATA.operatingHumidity * 100) / 100}</strong>
                    <p className='none ' style={{gridRow: 1, gridColumn: 2, verticalAlign: 'top', fontSize: '1.0rem'}} >%</p>
                </section>
                {!showDetails() ? <div className='none no-size'></div> 
                : <section className='readings-value-box'>
                    <p className='none readings-title' style={{textAlign: 'center'}} >Humidity</p>
                    <p className='none readings-description' style={{gridRow: 2, gridColumn: 1, }} >Efficiency:</p>
                    <strong className='none readings-value' style={{gridRow: 2, gridColumn: 2, }} >{Math.floor(getHumidityPercent()*100)}%</strong>
                    <p className='none readings-description' style={{gridRow: 3, gridColumn: 1, }} >Range:</p>
                    <strong className='none readings-value' style={{gridRow: 3, gridColumn: 2, }} >{(DATA.minimumHumidity)} - {(DATA.maximumHumidity)}%</strong>
                </section> }
            </div> 
        </div> : <div id='humidity-section' className='none no-size'></div>;

//Detect flew-wrap and center horizontally
const [align, setAlign] = useState((window.innerWidth < 900));
useEffect(()=>{setTimeout(()=>{
    const temperatureSectionTop = document.getElementById('temperature-section').getBoundingClientRect().top;
    const humiditySectionTop = document.getElementById('humidity-section').getBoundingClientRect().top;
    if(temperatureSectionTop != undefined && temperatureSectionTop != humiditySectionTop) setAlign(true);
},500);},[]);    

const HumidityOnClick = async(password) => {const response = await fetchData(); routeHistory.push('/'); return response == true ? 'UPDATING' : response;}
const TemperatureOnClick = async(password) => {dispatch({type: 'toggleConvertToFahrenheit'}); return null;}
const sensorOnClick = async(password) => {if(maxError && DATA.sensorErrorCode != undefined) routeHistory.push('/log'); else routeHistory.push('/settings'); return null;}

const ReadingsArrangement = [
    {mobile: 1, desktop: 2, 
        getWidget:  getSensor,
        getUpdate: sensorOnClick,
        pendingText: 'DIRECTING'
    },
    {mobile: 2, desktop: 1, 
        getWidget:  getTemperature,
        getUpdate: TemperatureOnClick,
        pendingText: 'CONVERTING'
    },
    {mobile: 3, desktop: 3, 
        getWidget:  getHumidity,
        getUpdate: HumidityOnClick,
        pendingText: 'RETRIEVING'
    }     
];
    return (
    <div ref={ref} id='readings-container' className={align ? 'readings-align' : 'readings-top' }  >
        {ReadingsArrangement.sort((a,b) => align ? (a.mobile - b.mobile) : (a.desktop - b.desktop))
            .map(widget =>
                <div style={{margin: 'auto', padding: '2.0rem'}}>
                    <SettingsButton title={widget.getWidget()}
                            condense={true}
                            buttonColor={'transparent'}
                            buttonStyle={{border: 'none', margin: '0', padding: '0', borderRadius: '0.75rem'}}
                            verifyLevel={0}
                            pendingText={widget.pendingText}
                            onUpdate = {widget.getUpdate}
                        />
                </div>
            )
        }
    </div>
    );
});


/* ------------------------------
Depreciated For Now: 8/10/2022
------------------------------ */
const ScrollText=(props)=>{
    const boxRef = useRef();
    const textRef = useRef();
    const [scrollLeft, setScrollLeft] = useState(true);
    const [minLeft, setMinLeft] = useState(0);
    const [position, setPosition] = useState(0);

    useEffect(()=>{
        if(boxRef.current.offsetWidth > (props.parentRef.current.offsetWidth)) 
            setMinLeft(-1*(textRef.current.offsetWidth - (props.parentRef.current.offsetWidth)));
    }, [boxRef, textRef]);

    useInterval(()=>{ if(minLeft<0) {
        if(position < minLeft) {setScrollLeft(false); setPosition(minLeft+1)}
        if(position > 0) {setScrollLeft(true); setPosition(-1)}
        setPosition(previous => scrollLeft ? (previous - 1) : (previous + 1));
        textRef.current.style.transform = `translateX(${position}px)`;
    }}, 20);

    return (<span ref={boxRef} style={{display: 'grid', gridAutoFlow: 'column'}}><span style={{margin: 'auto'}}
        >{props.leading}</span><p  ref={textRef} id={props.id} className={props.class}  style={{overflowX: 'visible'}}
        >{props.text}</p><span style={{margin: 'auto'}}>{props.trailing}</span></span>);
}

export default Readings;