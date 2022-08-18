import React, {useState, useEffect} from 'react';
import { useSelector} from 'react-redux';
import axios from 'axios';
import useInterval from '../useInterval';
import DURATION_LIST from './Duration';
import SettingsButton, {HoldButton} from '../Settings/SettingsButton';
import {fetchData} from '../index';

import '../index.css';
import './Control.css';

const ACTIVE_COLOR = 'rgba(0, 102, 0, 0.6)';
const DEACTIVE_COLOR = 'rgba(0, 0, 0, 0.5)';
const EXCLUDE_CONTROL_TYPES = ['On', 'Off'];

//auto generate type button

const MakeToggle = (props) => {
    const [timer, setTimer] = useState(1);
    const interval = useInterval(()=>{setTimer((props.until - new Date().getTime()) * (((props.until - new Date().getTime()) < 0) ? -1 : 1)); }, 1000);
    const overridden = /(severe|schedule|toggle|immediate)/i.test(props.topReason);
    const severe = /(severe|extreme)/i.test(props.topReason);

    return (
    <div className='none control-toggle-outer' style={{}} onClick={props.onClick}> 
        <div className='none control-toggle-inner' style={{borderColor: props.isSelected ? 'whitesmoke' : props.select ? 'transparent' : overridden ? 'var(--accent-color)' : 'transparent',
                backgroundColor: severe ? 'darkred' : props.active ? ACTIVE_COLOR : DEACTIVE_COLOR, }}>
            <strong className='none control-toggle-text'>{props.title}</strong>
            <p className='none control-toggle-timer' style={{}} >{props.topReason}</p>
            <p className='none control-toggle-timer' style={{fontSize: '0.75rem', color: ((props.until - new Date().getTime()) < 0) ? 'gold' : null}} >{(props.until <= 0) ? `${props.active ? 'ON' : 'OFF'} : INDEFINITELY` : `${(timer>3600000)?`${Math.floor(timer/3600000)}:`:''}${(timer>60000)?`${Math.floor((timer%3600000)/60000)}:`:''}${((timer>60000) && (timer%60000<10000))?'0':''}${Math.floor((timer%60000)/1000)}` }</p>
        </div>
    </div>
    );
}


export default function Control(props) {
    const SERVER_URL = useSelector(root => root.serverURL);
    const DATA = useSelector(root => root.data);
    const [durationIndex, setDurationIndex] = useState(10)
    const [selectMode, setSelectMode] = useState(false);
    const [selectedList, setSelectedList] = useState([]);
    const [controlTypes, setControlTypes] = useState([]);
    useEffect(()=>{if(DATA.controlTypes != undefined) setControlTypes(DATA.controlTypes);
                const smartIndex = DURATION_LIST.findIndex(d=>(d.value > (DATA.timeNextEvaluation - new Date().getTime())))-1;  
                if(smartIndex > 4) setDurationIndex(smartIndex); },[DATA]);

    const shortedNameList = (names) => {  
        for(var i=0; i<DATA.controlTypes.length; i++) {let match = true;
            for(var y=0; y<DATA.CONTROLS.length; y++) {
                if((names.includes(DATA.CONTROLS[y].name) && !DATA.CONTROLS[y].types.includes(DATA.controlTypes[i]))
                    || !names.includes(DATA.CONTROLS[y].name) && DATA.CONTROLS[y].types.includes(DATA.controlTypes[i])) { match = false; break;}
            } if(match) return `[${DATA.controlTypes[i]}]`;
        } let result = '';
         names.forEach(name =>  result += ('-'+(name.match(/\b(\w)/g).join('.'))));
        return `(${result.substring(1).toUpperCase()})`;//removes first dash :)
    }

    const scheduleNow = async(password, names, set = true, reason = `Immediate ${shortedNameList(names)}`) =>  await axios.post(`${SERVER_URL}/schedule-add/`, {
                                PASSWORD: password, time: new Date().getTime(), title: reason, names: JSON.stringify(names), duration: DURATION_LIST[durationIndex].value, set: (set || set == 'true'), repeat: 0
                            }).then((response) => {setTimeout(()=>fetchData(),10000); return 'EXECUTING';}).catch((error) => error.response ? error.response.status : false);

    //Filter Control Types List
    const getControlTypes = () => { const typesMap = new Map();
        //Populate Map    
        DATA.CONTROLS.forEach((c,i)=>c.types.forEach(t=>typesMap.set(t, [...(typesMap.get(t) || []), c.id])));
        //Filter            
        return [...typesMap].filter(([type, controlList], index, mapList) => 
                (controlList.length > 1) 
                && (selectMode || !EXCLUDE_CONTROL_TYPES.includes(type)) 
                && (mapList.findIndex(([k, v], i) => (v.toString() == controlList.toString())) === index) //Remove Duplicates
            ).map(([type, controlList])=>type);
    }


    return(
        <div id='control-container'>
            <div id='duration-box' >
                <label id='duration-label' style={{color:'white'}} onClick={()=>setDurationIndex(10)}>{DURATION_LIST[durationIndex].name}</label>
                <input id='duration-slider' type='range' min={0} max ={DURATION_LIST.length-1} value={durationIndex} onChange={(event) => setDurationIndex(event.target.value)} />
            </div>
            <div id='control-box'>
                {DATA.CONTROLS === undefined ? <div></div> :
                DATA.CONTROLS.map((c) => <SettingsButton key={c.name} 
                    title={
                        <MakeToggle 
                            title={c.name} 
                            active= {(c.settings[0].set || c.settings[0].set == 'true')}
                            topReason= {c.settings[0].reason}
                            until= {c.settings[0].until}
                            select={selectMode}
                            isSelected = {selectedList.includes(c.name)}
                            onClick={()=>{}}
        
                        />}
                    pendingText='SCHEDULING'
                    condense={true}
                    buttonColor={'transparent'}
                    buttonStyle={{border: 'none', margin: '1.0rem', padding: '0', width: '15.0rem'}}
                    verifyLevel={1}
                    onUpdate = {(password) =>  {if(selectMode) {(selectedList.includes(c.name) ? setSelectedList((list) => [...list.filter(name => name !== c.name)]) : setSelectedList((list) => [...list, c.name])); return null;}
                            else return scheduleNow(password, [c.name], !(c.settings[0].set || (c.settings[0].set == 'true')), `Toggle ${shortedNameList([c.name])}`)}}/>)
                    }
            </div>
                <div id='control-select-box'>
                    <SettingsButton title={selectMode ? 'ALL' : 'ON'}
                        pendingText='ACTIVATING'
                        condense={true}
                        buttonColor={'rgba(0, 0, 0, 0.95)'}
                        buttonStyle={{border: 'none', padding: '0.70rem 2rem', fontSize: '0.9rem', width: 'auto', minWidth: '6.0rem', borderRadius: '0.5rem'}}
                        verifyLevel={1}
                        onUpdate={(password)=>selectMode ? setSelectedList([...DATA.CONTROLS.map(c=>c.name)]) : scheduleNow(password, [...DATA.CONTROLS.map(c=>c.name)], true, 'ALL ON')} />
                    <SettingsButton title='ACTIVE'
                        pendingText='SCHEDULING'
                        condense={true}
                        buttonColor={'rgba(0, 0, 0, 0.95)'}
                        buttonStyle={{display: !selectMode ? 'none' : null, border: 'none', padding: '0.70rem 2rem', fontSize: '0.9rem', width: 'auto', minWidth: '6.0rem', borderRadius: '0.5rem'}}
                        verifyLevel={1}
                        onUpdate={(password)=>selectMode ? setSelectedList([...DATA.CONTROLS.filter((c)=>c.settings[0].set).map(c=>c.name)]) : scheduleNow(password, [...DATA.CONTROLS.filter((c)=>c.settings[0].set).map(c=>c.name)], false, 'DEACTIVATING')} />
                    <SettingsButton title='INACTIVE'
                        pendingText='SCHEDULING'
                        condense={true}
                        buttonColor={'rgba(0, 0, 0, 0.95)'}
                        buttonStyle={{display: !selectMode ? 'none' : null, border: 'none', padding: '0.70rem 2rem', fontSize: '0.9rem', width: 'auto', minWidth: '6.0rem', borderRadius: '0.5rem'}}
                        verifyLevel={1}
                        onUpdate={(password)=>selectMode ? setSelectedList([...DATA.CONTROLS.filter((c)=>!c.settings[0].set).map(c=>c.name)]) : scheduleNow(password, [...DATA.CONTROLS.filter((c)=>!c.settings[0].set).map(c=>c.name)], true, 'ACTIVATING')} />
                    {getControlTypes().map((t,i)=><SettingsButton key={t} title={t}
                        pendingText='SCHEDULING'
                        condense={true}
                        buttonColor={'rgba(0, 0, 0, 0.95)'}
                        buttonStyle={{border: 'none', padding: '0.70rem 2rem', fontSize: '0.9rem', width: 'auto',  minWidth: '6.0rem', borderRadius: '0.5rem'}}
                        verifyLevel={1}
                        onUpdate={(password)=>selectMode ? setSelectedList(original => [...DATA.CONTROLS.filter((c)=>c.types.includes(t)).map(c=>c.name)].every((val, i, arr) => selectedList.includes(val)) 
                                    ? [...DATA.CONTROLS.filter((c)=>(!c.types.includes(t) && original.includes(t))).map(c=>c.name)] 
                                    : [...DATA.CONTROLS.filter((c)=>c.types.includes(t)).map(c=>c.name)]) 
                                    : scheduleNow(password, [...DATA.CONTROLS.filter((c)=>c.types.includes(t)).map(c=>c.name)], 
                                        ([...DATA.CONTROLS.filter((c)=>c.types.includes(t))].every((val, i, arr) => val.settings[0].set == arr[0].settings[0].set) && [...DATA.CONTROLS.filter((c)=>c.types.includes(t))].length)
                                        ? ![...DATA.CONTROLS.filter((c)=>c.types.includes(t))][0].settings[0].set : true, `Immediate ${t}`)} />)}
                     <SettingsButton title={selectMode ? 'NONE' : 'OFF'}
                        pendingText='DEACTIVATING'
                        condense={true}
                        buttonColor={'rgba(0, 0, 0, 0.95)'}
                        buttonStyle={{border: 'none', padding: '0.70rem 2rem', fontSize: '0.9rem', width: 'auto', minWidth: '6.0rem', borderRadius: '0.5rem'}}
                        verifyLevel={1}
                        onUpdate={(password)=>selectMode ? setSelectedList([]) : scheduleNow(password, [...DATA.CONTROLS.map(c=>c.name)], false, 'ALL OFF')} />
                </div>
            {selectMode ? 
                <div id='control-select-box'>
                    <SettingsButton title='ON'
                        pendingText='ACTIVATING'
                        condense={true}
                        // buttonColor={'rgba(255, 255, 255, 0.5)'}
                        buttonStyle={{border: 'none', padding: '0.45rem 2rem', width: 'auto',  minWidth: '6.0rem', borderRadius: '0.5rem', color: 'black'}}
                        verifyLevel={1}
                        onUpdate={(password)=>scheduleNow(password, selectedList, true)} />
                    <SettingsButton title='OFF'
                        pendingText='DEACTIVATING'
                        condense={true}
                        // buttonColor={'rgba(255, 255, 255, 0.5)'}
                        buttonStyle={{border: 'none', padding: '0.45rem 2rem', width: 'auto', minWidth: '6.0rem', borderRadius: '0.5rem', color: 'black'}}
                        verifyLevel={1}
                        onUpdate={(password)=>scheduleNow(password, selectedList, false)} />
                    <button className='none control-button control-button-exit' onClick={()=>{setSelectMode(false); setSelectedList([]);}}>Exit</button>
                    {/* <button className='none control-button' onClick={()=>{}}>Schedule</button> */}
                </div>
                : <div id='control-select-box'>
                    <button className='none control-button' onClick={()=>setSelectMode(true)}>Select</button>
                </div>
            }
            <HoldButton duration={DURATION_LIST[durationIndex].value} verifyLevel={(DURATION_LIST[durationIndex].value < (24*60*60*1000)) ? 1 : 2} buttonStyle={{padding: '0.4rem'}}/>
        </div>
    );
}



