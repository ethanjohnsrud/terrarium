import React, {useState,  useEffect} from 'react';
import { useSelector, useDispatch} from 'react-redux';
import axios from 'axios';
import dateFormat from 'dateformat';
import DURATION_LIST, {getDurationName, getDurationValue} from '../Duration';
import SettingsButton, {HoldButton} from '../../Settings/SettingsButton';
import Verify from '../../Verify';

import '../../index.css';
import './Schedule.css';

const getButtonColor=(buttonText)=> (buttonText=='UPDATE' || buttonText=='') ? 'var(--main-color)' : (buttonText=='PASS' || buttonText=='INVALID' || buttonText=='FAILED') ? '#e8000d' : (buttonText=='PENDING' || buttonText=='BLANK') ? 'orange' : '#cc5500';

const DropMenu = (props) => {
    const [custom, setCustom] = useState(props.customDefault);
    const [multipleList, setMultipleList] = useState(props.multipleList);
    const openList = useSelector(root => root.dropListOpen);
    const dispatch = useDispatch();

    useEffect(()=>{setMultipleList(props.multipleList);},[props.multipleList]); //Syncing single selection with custom
    useEffect(()=>{setCustom(props.customDefault);},[props.customDefault]); //Syncing single selection with custom


    //Guidelines Abstracted
    const buttonColor = (props.buttonColor != undefined) ? props.buttonColor : '';
    const customName = (props.customName != undefined) ? props.customName : false;
    const inputType = (props.inputType != undefined) ? props.inputType : 'text';
    const selectMultiple = (multipleList != undefined);

    return(<div className='schedule-drop-menu-container' style={props.outerStyle} onFocus={()=>{}} onBlur={()=>{}} >
        <button className={`schedule-input schedule-drop-menu-button ${props.buttonStyleClass || ''}`} style={{color: (isNaN(props.value)) ? 'white' : buttonColor, backgroundColor: (isNaN(props.value)) ? buttonColor : null}} onClick={()=>dispatch({type: 'setDropList', payload: props.dropListId})}>{(props.value != undefined) ? props.value : (props.multipleList != undefined) ? props.multipleList.toString() : ''}{props.subValue ? <span><label style={{color: 'grey', margin: '0 0.5rem'}}>|</label><label style={{color: 'orange'}}>{props.subValue || ''}</label></span> : null}</button>
        {(openList == props.dropListId) ? <div className='schedule-drop-menu-list' style={{top: props.options.length <= 5 ? null : '5vh'}}>
                    <button key='cancel-button' className='schedule-drop-menu-item' style={{borderBottom: '1px solid whitesmoke', color: 'var(--main-color)'}} onClick={()=>{
                                dispatch({type: 'setDropList'});
                            }}>Cancel</button>
            {selectMultiple ? <button key='save-button-1' className='schedule-drop-menu-item schedule-save-button' style={{borderBottom: '1px solid whitesmoke', marginTop: 0}} onClick={()=>{
                        props.onSelect(multipleList);
                        dispatch({type: 'setDropList'});
                    }}>SAVE</button>:<div className='none no-size'></div>}
                {props.options.map((option, i) => 
                    <button key={`${option}-${JSON.stringify(multipleList)}`} className='schedule-drop-menu-item' style={{ border: (selectMultiple ? multipleList.includes(option) : props.value == option) ? '1px solid var(--main-color)' : 'none', backgroundColor: (option == 'UPDATE') ? 'var(--main-color)' : (option == 'DELETE') ? 'red' : '',  color: (option == 'UPDATE') ? 'white' : (option == 'DELETE') ? 'black' : ''}} onClick={()=>{
                        if(selectMultiple && multipleList.includes(option)) setMultipleList(multipleList.filter(m => m != option));
                        else if(selectMultiple) setMultipleList([...multipleList, option]);
                        else { props.onSelect(option);
                        dispatch({type: 'setDropList'});
                    }}}>{option}</button>
                )}
                {(props.extraList && selectMultiple) ? <button key='save-button-2' className='schedule-drop-menu-item schedule-save-button' style={{borderTop: '1px solid whitesmoke', borderBottom: '1px solid whitesmoke'}} onClick={()=>{
                        props.onSelect(multipleList);
                        dispatch({type: 'setDropList'});
                    }}>{props.extraName || 'SAVE'}</button>:<div className='none no-size'></div>}
                {props.extraList ? props.extraList.map((option, i) => 
                    <button key={`${option}-${JSON.stringify(multipleList)}`} className='schedule-drop-menu-item' style={{border: (selectMultiple ? multipleList.includes(option) : props.value == option) ? '1px solid var(--main-color)' : 'none', backgroundColor: (option == 'UPDATE') ? 'var(--main-color)' : (option == 'DELETE') ? 'red' : '',  color: (option == 'UPDATE') ? 'white' : (option == 'DELETE') ? 'black' : ''}} onClick={()=>{
                        props.onExtra(option);
                        dispatch({type: 'setDropList'});
                    }}>{option}</button>
                ) : null}
                {customName ? <div className='none' style={{display:'inline-grid', gridColumn: 1}}>
                        <input key='settings-add-input' type={inputType} className='schedule-drop-menu-item' style={{gridColumn: 1, width: '10.0rem', border: 'none', borderRadius: 0, border: '1px solid whitesmoke', backgroundColor: 'black', color: 'white'}} 
                            value={custom}
                            onChange={(c)=>setCustom(c.target.value)}
                            onKeyPress={(e)=>{ if (e.charCode == 13) {
                                props.onSelect(selectMultiple ? [...multipleList, custom] : custom);
                                dispatch({type: 'setDropList'});
                            }}}/>
                        <button key='settings-add-button' className='schedule-drop-menu-item' style={{gridColumn: 2, border: 'none', borderRadius: 0, borderBottom: '1px solid whitesmoke', backgroundColor: 'whitesmoke', color: 'black'}} onClick={()=>{
                                props.onSelect(selectMultiple ? [...multipleList, custom] : custom);
                                dispatch({type: 'setDropList'});
                            }}>{customName}</button>
                </div> : <div className='none no-size'></div>}
                {selectMultiple ? <button key='save-button-3' className='schedule-save-button schedule-drop-menu-item ' style={{borderTop: '1px solid whitesmoke', marginBottom: 0}} onClick={()=>{
                        props.onSelect(multipleList);
                        dispatch({type: 'setDropList'});
                    }}>SAVE</button>:<div className='none no-size'></div>}
            </div>
        : <div ></div>}
    </div>);
}
const getDateAbbreviation = (t) => {const time = parseInt(t) || 0;
    const day = new Date(time).getDate(); 
    if(day == 1 || day == 21 || day == 31) return `${dateFormat(time, 'mmm')}, ${day}st`;
    else if(day == 2 || day == 22) return `${dateFormat(time, 'mmm')}, ${day}nd`;
    else if(day == 3 || day == 23) return `${dateFormat(time, 'mmm')}, ${day}rd`;
    else return `${dateFormat(time, 'mmm')}, ${day}th`;
}
//labels yesterday, today, tomorrow, within week (sunday); otherwise date with abbreviation
const getDay = (t) => { const time = parseInt(t) || 0; let today = new Date(); today.setHours(0,0,0,0); const tomorrow = new Date(today.getTime()+(24*60*60*1000)); const yesterday = new Date(today.getTime()-(24*60*60*1000)); 
    if(time >= today.getTime() && time < tomorrow.getTime()) return `Today`;
    if(time >= tomorrow.getTime() && time < (new Date(tomorrow.getTime()+(24*60*60*1000)).getTime())) return `Tomorrow`;
    if(time >= (new Date(yesterday.getTime()-(24*60*60*1000)).getTime()) && time < today.getTime()) return `Yesterday`;
    if(time >= (new Date(today.getTime()-(6*24*60*60*1000)).getTime()) && time <= (new Date(today.getTime()+(7*24*60*60*1000)).getTime())) {
        const day = new Date(time).getDay();    
        return day == 0 ? 'Sunday' : day == 1 ? 'Monday' : day == 2 ? 'Tuesday' : day == 3 ? 'Wednesday' : day == 4 ? 'Thursday' : day == 5 ? 'Friday' : day == 6 ? 'Saturday' : 'New Day';
    } else return getDateAbbreviation(time);
}
const getDateList = () => { const list = [];
        let time = new Date(); time = time.setHours(7,0,0,0); 
        for(var i=(0); i<(30); i++){  list.push(time); time += (24*60*60*1000);  }
        return list;
    }
const DropDateMenu = (props) => {
    const openList = useSelector(root => root.dropListOpen);
    const [customDate, setCustomDate] = useState(props.time);
    // const [customTime, setCustomTime] = useState((props.time % (24*60*60*1000))/(60000)); //Handle Time Locally below in <input/>
    // useEffect(()=>{setCustomDate(props.time); setCustomTime(props.time % (24*60*60*1000));}, [props.time])
    const dispatch = useDispatch();
    return(<div className='schedule-drop-menu-container' style={props.outerStyle} onFocus={()=>{}} onBlur={()=>{}} >
        <button className={`schedule-input schedule-drop-menu-button ${props.buttonStyleClass || ''}`} onClick={()=>dispatch({type: 'setDropList', payload: props.dropListId})}>{`${getDay(props.time)} ${dateFormat(parseInt(props.time) || 0, 'H:MM')}`}</button>
        {(openList == props.dropListId) ? <div className='schedule-drop-date-menu' style={{}} >
                <div className='schedule-drop-menu-list' style={{top: '5vh', gridRow: 1, gridColumn: 1, left: '2.0rem'}}>         
                    <label key='cancel-button' className='schedule-drop-menu-item' style={{gridRow: (1), borderBottom: '1px solid whitesmoke', color: 'var(--main-color)'}} onClick={()=>{
                               dispatch({type: 'setDropList'});
                            }}>Cancel</label>  
                    {getDateList().map((t, i) => 
                        <label key={t} className='schedule-drop-menu-item' style={{gridRow: (i+2), border: ((new Date(props.time).getMonth() == (new Date(t).getMonth())) && (new Date(props.time).getDate() == (new Date(t).getDate()))) ? '1px solid var(--main-color)' : 'none'}} onClick={()=>{
                            props.onSelect(t);
                            // dispatch({type: 'setDropList'});
                        }}>{getDay(t)}</label>)}
                    <div className='none' style={{display:'inline-grid', gridColumn: 1}}>
                        <input key='settings-add-input' type='number' step={24*60*60*1000} className='schedule-drop-menu-item' style={{gridColumn: 1, width: '10.0rem', border: 'none', borderRadius: 0, border: '1px solid whitesmoke', backgroundColor: 'black', color: 'white'}} 
                            value={customDate}
                            onChange={(c)=>setCustomDate(c.target.value)}
                            onKeyPress={(e)=>{ if (e.charCode == 13) {
                                props.onSelect(customDate);
                                dispatch({type: 'setDropList'});
                            }}}/>
                        <button key='settings-add-button' className='schedule-drop-menu-item' style={{gridColumn: 2, border: 'none', borderRadius: 0, borderBottom: '1px solid whitesmoke', backgroundColor: 'whitesmoke', color: 'black'}} onClick={()=>{
                                props.onSelect(customDate);
                                dispatch({type: 'setDropList'});
                            }}>EPOCH</button>
                    </div>
                </div>
                <div className='schedule-drop-menu-list' style={{top: '5vh', gridRow: 1, gridColumn: 1, right: '2.0rem'}}>  
                        <label key='cancel-button' className='schedule-drop-menu-item' style={{gridRow: (1), borderBottom: '1px solid whitesmoke', color: 'var(--main-color)'}} onClick={()=>{
                                dispatch({type: 'setDropList'});
                            }}>Cancel</label>               
                    {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24].map((h, i) => 
                        <label key={h} className='schedule-drop-menu-item' style={{gridRow: (i+2), border: (new Date(props.time).getHours() == (h)) ? '1px solid var(--main-color)' : 'none'}} onClick={()=>{
                            props.onSelect(new Date(props.time).setHours(h,0,0,0)); setCustomDate(new Date(props.time).setHours(h,0,0,0));
                            dispatch({type: 'setDropList'});
                        }}>{h} : 00</label>)}
                        <div className='none' style={{display:'inline-grid', gridColumn: 1}}>
                        <input key='settings-add-input' type='number' step={60} className='schedule-drop-menu-item' style={{gridColumn: 1, width: '10.0rem', border: 'none', borderRadius: 0, border: '1px solid whitesmoke', backgroundColor: 'black', color: 'white'}} 
                            value={(new Date(customDate).getHours()*60) + (new Date(customDate).getMinutes())}
                            onChange={(c)=>setCustomDate(new Date(props.time).setHours(0,(c.target.value),0,0))}
                            onKeyPress={(e)=>{ if (e.charCode == 13) {
                                props.onSelect(customDate);
                                dispatch({type: 'setDropList'});
                            }}}/>
                        <button key='settings-add-button' className='schedule-drop-menu-item' style={{gridColumn: 2, border: 'none', borderRadius: 0, borderBottom: '1px solid whitesmoke', backgroundColor: 'whitesmoke', color: 'black'}} onClick={()=>{
                                props.onSelect(customDate);
                                dispatch({type: 'setDropList'});
                            }}>Time (m)</button>
                    </div>
                </div>
            </div>
        : <div ></div>}
    </div>);
}

const ScheduleRow = (props) => {
    const DATA = useSelector(root => root.data);   
    const dispatch = useDispatch(); 
    const [pendingAction, setPendingAction] = useState(undefined);
    const [verification, setVerification] = useState(undefined);
    const [buttonText, setButtonText] = useState('');

    const [priority, setPriority] = useState(props.priority || null);
    const [time, setTime] = useState(props.time || new Date().setMinutes(0,0,0));
    const [title, setTitle] = useState(props.title || '');
    const [titleEdited, setTitleEdited] = useState(false); //Detect Auto Populate Name
    const [names, setNames] = useState(props.names || []);
    const [duration, setDuration] = useState(props.duration || (15*60*1000));
    const [set, setSet] = useState(props.set || true);
    const [repeat, setRepeat] = useState(props.repeat || 0);

    const resetVariables = (clear = false) => { 
        setPriority(props.priority || null);
        setTime((clear || props.time == undefined) ? new Date().setMinutes(0,0,0) : props.time);
        setTitle((clear || props.title == undefined) ? '' : props.title);
        setNames((clear || props.names == undefined) ? [] : props.names);
        setDuration((clear || props.duration == undefined) ? (15*60*1000) : props.duration);
        setSet((clear || props.set == undefined) ? true : props.set);
        setRepeat((clear || props.repeat == undefined) ? 0 : props.repeat);
        if(clear) setButtonText('NEW');
    }
    useEffect(()=>resetVariables(),[props]);    
    useEffect(()=>resetVariables(),[props]); 

    //Guidelines Abstracted
    const verifyLevel = (props.verifyLevel != undefined) ? props.verifyLevel : 1;
    const insertNew = (props.insertNew != undefined);

    const isControlsChanged = () => {if(!props.names) return true;
        if(Array.isArray(props.names))
        for(var i=0; i<props.names.length; i++) {
                if(!names.includes(props.names[i])) return true;
        } if(Array.isArray(names))
        for(var y=0; y<names.length; y++) {
            if(!props.names.includes(names[y])) return true;
        } return false;
    }
    const isTimeChanged = () =>(!props.time || props.time != time);
    const isTitleChanged = () =>(!props.title || props.title != title);
    const isDurationChanged = () =>(!props.duration || props.duration != duration);
    const isSetChanged = () =>(props.set != set);
    const isRepeatChanged = () => (props.repeat == undefined || props.repeat != repeat);
    const isChanged=()=>{
        if(isTimeChanged()) return true;
        if(isTitleChanged()) return true;
        if(!props.names || isControlsChanged()) return true;
        if(isDurationChanged()) return true;
        if(isSetChanged()) return true;
        if(isRepeatChanged()) return true;
        return false;
    }
    const isControlsValid = () => {
        if(Array.isArray(names)) {
            if(names.length == 0) return false;
            for(var i=0; i<names.length; i++) {
                if(names[i] == undefined) return false;
        }} else if(!names || !names.length) return false;
        return true;
    }
    const isTimeValid = () =>(time && !isNaN(time));
    const isTitleValid = () =>(title && title != '');
    const isDurationValid = () =>(duration && !isNaN(duration));
    const isSetValid = () =>(set == false || set == true);
    const isRepeatValid = () => (repeat != null && repeat != undefined && !isNaN(repeat));
    useEffect(()=>{ let text = isChanged() ? 'UPDATE' : ''; 
        if(!isTimeValid()) text='TIME';
        if(!isTitleValid()) text='TITLE';
        if(!isControlsValid()) text='CONTROLS';
        if(!isDurationValid()) text='DURATION';
        if(!isSetValid()) text='SET';
        if(!isRepeatValid()) text='REPEAT';
        setButtonText(text);
    
    if(!titleEdited && insertNew && names.length) 
        setTitle(`${shortedNameList()} ${set ? 'On' : 'Off'} for ${(duration>3600000)?`${Math.floor(duration/3600000)}:`:''}${(duration>60000)?`${Math.floor((duration%3600000)/60000)}:`:''}${((duration>60000) && (duration%60000<10000))?'0':''}${Math.floor((duration%60000)/1000)}`);
    }, [priority, time, title, names, duration, set, repeat]);
        
    //*********************************
    //   API REQUEST & VERIFICATION
    //*********************************
    const makeRequest=async(password, action)=>{ setVerification(undefined); //saving local until fetch up stream is called to replace data 
        if(verifyLevel == 1 && !localStorage.getItem("password")) await localStorage.setItem("password", password.toString());
        const success = await props.onUpdate(action || pendingAction, password, priority, time, title, names, duration, set, repeat);
        if(success == true || isNaN(success)) {setButtonText((success != true) ? success : 'SAVED'); setTimeout(()=>{if(insertNew) resetVariables(true);}, 5000);}
        else if(success == 401) { setButtonText('PASS');  localStorage.clear(); setTimeout(()=>setButtonText('UPDATE'), 5000);}
        else if(success == 404) { setButtonText('INVALID');  setTimeout(()=>resetVariables(), 5000);}
        else {setButtonText('FAILED');  setTimeout(()=>resetVariables(), 5000);}
        setPendingAction(undefined);
        return buttonText;
    }

    const processUpdate=async(action)=>{ setButtonText('PENDING'); if(action) setPendingAction(action); 
        if(verifyLevel == 0) makeRequest(undefined, action); //No Security
        else if(verifyLevel == 1 && !localStorage.getItem("password")) setVerification('Enter Control Password to Continue:'); //Only Request if not stored
        else if(verifyLevel == 1) makeRequest(localStorage.getItem("password"), action); //Use Saved Password
        else setVerification('Enter Advanced Passphrase to Proceed:'); //undefined || >1
    }

    //*********************************
    //   HTML DISPLAY
    //*********************************
    const shortedNameList = (space = window.innerWidth) => { 
        if(!DATA.CONTROLS || !names || names.length == 0) return '-'; 
        if(DATA.CONTROLS != undefined && names.length == DATA.CONTROLS.length) return '[ALL]'; 
        if(names.length > 1) //Identify Common Type
            for(var i=0; i<DATA.controlTypes.length; i++) {let match = true;
                for(var y=0; y<DATA.CONTROLS.length; y++) {
                    if((names.includes(DATA.CONTROLS[y].name) && !DATA.CONTROLS[y].types.includes(DATA.controlTypes[i]))
                        || !names.includes(DATA.CONTROLS[y].name) && DATA.CONTROLS[y].types.includes(DATA.controlTypes[i])) { match = false; break;}
                } if(match) return `[${DATA.controlTypes[i]}]`;
            } 
        //Abbreviated List Names
        let result = '';
        names.forEach(name =>  result += (' - '+(space > 900 ? name : name.match(/\b(\w)/g).join('.'))));
        return result.substring(3).toUpperCase();//removes first dash :)
    }

    const getUpdateOptions = () => {const list = ['DELETE', 'INCREASE', 'DECREASE'];
        if(isChanged()) list.unshift('RESET');
        if(buttonText == 'UPDATE') list.unshift('UPDATE'); return list;}

    return <div className='none schedule-row'>
            {(insertNew) ? <SettingsButton title={(buttonText != 'UPDATE') ? buttonText : 'SAVE'} buttonColor={(buttonText != 'UPDATE') ? 'orange' : 'var(--main-color)'} buttonStyle={{gridRow: 1, gridColumn: 1, height: '85%', width: 'auto', maxWidth: '100%', overflowX: 'auto'}}
                    pendingText='SCHEDULING'
                    condense={true}
                    verifyLevel={1}
                    onUpdate={async(password)=>(buttonText == 'UPDATE') ? await makeRequest(password, 'INSERT') : false}
                />
            : <section className='none schedule-value-box' style={{gridRow: (1), gridColumn: 1, backgroundColor: (buttonText != '') ? 'transparent' : (time < DATA.timeNextEvaluation) ? 'black' : null}}>
                <DropMenu value={buttonText == '' ? priority : buttonText} dropListId={`${JSON.stringify(props)}-update`}   subValue={(props.overriddenList && props.overriddenList.length) ? `${props.overriddenList.join(', ')}` : undefined}      buttonColor={getButtonColor(buttonText)} customName='PRIORITY' inputType='number' 
                    customDefault={priority}
                    options={getUpdateOptions()}
                    onSelect={(action)=>{if(action == 'RESET') resetVariables(insertNew); else  processUpdate(action);}}
                />
            </section>                
            }
            <section className='none schedule-value-box' style={{gridRow: (1), gridColumn: 2, backgroundColor: (time < DATA.timeNextEvaluation) ? 'black' : null, border: (!isTimeValid()) ? '1px solid darkred' : (isTimeChanged()) ? '1px solid var(--main-color)' : null}}>
                <DropDateMenu  dropListId={`${JSON.stringify(props)}-time`}
                    time={time}
                    onSelect={(t)=>setTime(parseInt(t) || time)}
                />
            </section>
            <section className='none schedule-value-box' style={{gridRow: (1), gridColumn: 3, backgroundColor: (time < DATA.timeNextEvaluation) ? 'black' : null, border: (!isTitleValid()) ? '1px solid darkred' : (isTitleChanged()) ? '1px solid var(--main-color)' : null}}>
                <input type='text' className={'schedule-input schedule-drop-menu-button'} onClick={()=>{setTitleEdited(true); dispatch({type: 'setDropList'});}} value={title} onChange={(event)=>setTitle(event.target.value)} />
            </section>
            <section className='none schedule-value-box' style={{gridRow: (1), gridColumn: 4, backgroundColor: (time < DATA.timeNextEvaluation) ? 'black' : null, border: (!isControlsValid()) ? '1px solid darkred' : (isControlsChanged()) ? '1px solid var(--main-color)' : null}} >
                <DropMenu value={shortedNameList()}   dropListId={`${JSON.stringify(props)}-names`}
                    multipleList={[...names]}
                    options={DATA.CONTROLS ? [...DATA.CONTROLS.map(c=>c.name)] : []}
                    onSelect={(list)=>setNames(Array.isArray(list) ? [...list] : [list])}
                    extraName='TYPES'
                    extraList={DATA.controlTypes ? ['[ALL]', '[NONE]', ...DATA.controlTypes.map(t=>`[${t}]`)] : []}
                    onExtra={(type)=>setNames((type == '[ALL]') ? [...DATA.CONTROLS.map(c=>c.name)] : (type == '[NONE]') ? [] : [...DATA.CONTROLS.filter(c=>c.types.includes(type.replace(/\[|\]/g, ''))).map(c=>c.name)])}
                />             
            </section>
            <section className='none schedule-value-box' style={{gridRow: (1), gridColumn: 5, backgroundColor: (time < DATA.timeNextEvaluation) ? 'black' : null, border: (!isDurationValid()) ? '1px solid darkred' : (isDurationChanged()) ? '1px solid var(--main-color)' : null}}>
                <DropMenu value={getDurationName(duration)}   dropListId={`${JSON.stringify(props)}-duration`}
                    options={DURATION_LIST.map(e => e.name)}
                    customName='Minutes'
                    inputType='number'
                    customDefault={duration / 60000}
                    onSelect={(d)=>setDuration(isNaN(d) ? getDurationValue(d) : (d * 60000))}
                />
            </section>
            <section className='none schedule-value-box' style={{gridRow: (1), gridColumn: 6, backgroundColor: (time < DATA.timeNextEvaluation) ? 'black' : null, border: (!isSetValid()) ? '1px solid darkred' : (isSetChanged()) ? '1px solid var(--main-color)' : null}}>
                <DropMenu value={set ? 'ON' : 'OFF'}   dropListId={`${JSON.stringify(props)}-set`}
                    options={['ON', 'OFF']} 
                    onSelect={(s)=>{setSet(s == 'ON')}}
                />
            </section>
            <section className='none schedule-value-box' style={{gridRow: (1), gridColumn: 7, backgroundColor: (time < DATA.timeNextEvaluation) ? 'black' : null, border: (!isRepeatValid()) ? '1px solid darkred' : (isRepeatChanged()) ? '1px solid var(--main-color)' : null}}>
                <DropMenu value={repeat ? getDurationName(repeat) : 'ONCE'}   dropListId={`${JSON.stringify(props)}-repeat`}
                    options={['ONCE', ...DURATION_LIST.map(e => e.name)]}
                    customName='Minutes'
                    inputType='number'
                    customDefault={repeat / 60000}
                    onSelect={(r)=>setRepeat((r == 'ONCE') ? 0 : isNaN(r) ? getDurationValue(r) : (r * 60000))}
                />
            </section>
        {verification ?
            <Verify
                prompt={verification}
                onSubmit={(password)=>makeRequest(password, pendingAction)}
                onCancel={()=>{setVerification(undefined); setButtonText('UPDATE');}}
            />  : <div className='none no-size' style={{position:'absolute'}}></div>}
    </div>;
}


const Schedule = (props) => {
    const SERVER_URL = useSelector(root => root.serverURL);
    const [SCHEDULES, setSCHEDULES] = useState([]);
    const [sortByTime, setSortByTime] = useState(true);
    const [calculatedList, setCalculatedList] = useState([]);

    //Search Schedules for overlapping
    const calculateOccurrenceList = (schedules = SCHEDULES, days=3) =>{ if(!schedules || !schedules.length) return; 
        let minimum = 0; let bottom = 0; const end = (new Date().getTime()+(days*24*60*60*1000)); let count=0;
        const occurrences = [...schedules.map(s => ({time: s.time, duration: s.duration, repeat: s.repeat, priority: s.priority, names: s.names || [], overrides: []}))];
        do { minimum = occurrences.reduce((min,s)=>(s.time < min && s.time > bottom) ? s.time : min, end); count++;
            const least = occurrences.find(s=>(minimum == s.time)); 
            if(least == undefined) break; 
            occurrences.forEach(s => { if((!least.overrides.includes(s.priority)) && (least.priority > s.priority) && ((s.time) < (least.time + least.duration)) && ((s.time + s.duration) > (least.time)) && (least.names.some(e=>s.names.includes(e)))) least.overrides.push(s.priority);});
            bottom  = least.time;
            least.time += least.repeat;
            if(count > 1000) {console.log('Schedule.calculateOccurrenceList() Maxed Search: ', count, occurrences); break;}
        } while(minimum < end);
        setCalculatedList([...occurrences.map(s=>({priority: s.priority, overrides: [...s.overrides.sort((a,b)=>(b-a))]}))]);
    }

    //API Referencing
    const fetchSchedules = () => axios.get(`${SERVER_URL}/data-schedules/`).then((response) => { console.log('SCHEDULES', response.data.schedules);
            setSCHEDULES(response.data.schedules);  calculateOccurrenceList(response.data.schedules);
        }).catch((error) => {console.log('Failed to Fetch Schedule Information', error); return error.response ? error.response.status : false;});
    useEffect(()=>fetchSchedules(),[]);

    const getOverriddenList=(priority)=>{if(!calculatedList || (SCHEDULES.length != calculatedList.length) || priority == undefined) return [];
        const list = calculatedList.find(s=>(s.priority == priority));
        return list ? list.overrides : []; };

    return( <div id='schedule-list' className='none border-box'>
            <div className='none schedule-row'>
                <label className='schedule-header' style={{gridColumn: 1}}>Edit</label>
                <label className='schedule-header' style={{gridColumn: 2}}>Occurrence</label>
                <label className='schedule-header' style={{gridColumn: 3}}>Title</label>
                <label className='schedule-header' style={{gridColumn: 4}}>Control</label>
                <label className='schedule-header' style={{gridColumn: 5}}>Duration</label>
                <label className='schedule-header' style={{gridColumn: 6}}>Set</label>
                <label className='schedule-header' style={{gridColumn: 7}}>Repeat</label>
            </div>
{/* LIST NEW SCHEDULE Fields */}
          <ScheduleRow insertNew={true} 
            onUpdate={async(action, password, priority, time, title, names, duration, set, repeat)=>{
                if(action == 'INSERT') return await axios.post(`${SERVER_URL}/schedule-add/`, {
                    PASSWORD: password, time: time, title: title, names: JSON.stringify(names), duration: duration, set: set, repeat: repeat
                }).then((response) => {fetchSchedules(); return true;}).catch((error) => error.response ? error.response.status : false);
            }} />
{/* LIST EXISTING props.SCHEDULES : onTap Editable */}
            <div className='schedule-button-row'>
                <SettingsButton title={sortByTime ? 'Sort Priority' : 'Sort Time'} buttonStyle={{padding: '0.40rem'}}
                    condense={true}
                    buttonColor='orange'
                    verifyLevel={0}
                    onUpdate={async(password)=>{setSortByTime(!sortByTime); return 'Sorting';}}
                />
                <HoldButton buttonColor='black' buttonStyle={{padding: '0.45rem'}}/>
                <SettingsButton title='UPDATE' buttonStyle={{padding: '0.40rem'}} pendingText='RETRIEVING'
                    condense={true}
                    verifyLevel={1}
                    onUpdate={async(password)=>{const response = await fetchSchedules(); return (response == true) ? 'UPDATED' : response; }}
                />
            </div>
            {[...SCHEDULES.sort((a,b) => sortByTime ? (a.time - b.time) : (b.priority - a.priority))].map((schedule,index) => <ScheduleRow key={`Schedule-${index}`} verifyLevel={1}
                priority={schedule.priority} time={schedule.time} title={schedule.title} names={schedule.names} duration={schedule.duration} set={(schedule.set == true || schedule.set == 1)} repeat={schedule.repeat} overriddenList={getOverriddenList(schedule.priority)}
            onUpdate={async (action, password, priority, time, title, names, duration, set, repeat)=>{
                if(action == 'DELETE') return await axios.post(`${SERVER_URL}/schedule-delete/`, {
                    PASSWORD: password, priority: schedule.priority
                }).then((response) => {fetchSchedules(); return true;}).catch((error) => error.response ? error.response.status : false);
                else if(action == 'UPDATE')  return await axios.post(`${SERVER_URL}/schedule-replace/`, {
                    PASSWORD: password, currentPriority: schedule.priority, priority: priority, time: time, title: title, names: JSON.stringify(names), duration: duration, set: set, repeat: repeat
                }).then((response) => {fetchSchedules(); return true;}).catch((error) => error.response ? error.response.status : false);
                else if(action == 'INCREASE' || action == 'DECREASE') return await axios.post(`${SERVER_URL}/schedule-priority-increase/`, {
                    PASSWORD: password, priority: schedule.priority, increase: (action == 'INCREASE')
                }).then((response) => {fetchSchedules(); return true;}).catch((error) => error.response ? error.response.status : false);
                else if(!isNaN(parseInt(action))) return await axios.post(`${SERVER_URL}/schedule-update/`, {
                    PASSWORD: password, priority: schedule.priority, attributeName: 'priority', value: parseInt(action) || 0
                }).then((response) => {fetchSchedules(); return true;}).catch((error) => error.response ? error.response.status : false);

            }} />)}
    </div>);
}

export default Schedule;