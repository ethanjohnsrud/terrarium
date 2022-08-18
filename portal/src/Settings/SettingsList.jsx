import React, {useState, useEffect} from 'react';
import { useSelector, useDispatch} from 'react-redux';
import Verify from '../Verify';

import '../index.css';
import './Settings.css';

const getButtonColor=(buttonText)=>(buttonText=='') ? 'transparent' : (buttonText=='UPDATE') ? 'var(--main-color)' : (buttonText=='PASS' || buttonText=='INVALID') ? '#e8000d' : (buttonText=='PENDING' || buttonText=='BLANK') ? 'orange' : '#cc5500';

const SettingsList = (props) => { 
    const [verification, setVerification] = useState(undefined);
    const openList = useSelector(root => root.dropListOpen);
    const dispatch = useDispatch();
    const [current, setCurrent] = useState(props.current == undefined ? [] : Array.isArray(props.current) ? props.current : [props.current]);
    const [options, setOptions] = useState(props.options == undefined ? current : Array.isArray(props.options) ? props.options : [props.options]);
    const [list, setList] = useState(props.current == undefined ? [] : Array.isArray(props.current) ? props.current : [props.current]);
    const [custom, setCustom] = useState('');
    const [buttonText, setButtonText] = useState('');

    useEffect(()=>{//Syncing Props b/c initial render redux.data == {} -> fetchData() //Not proper solution, but others didn't work :: https://tkdodo.eu/blog/putting-props-to-use-state
        const newCurrent = props.current == undefined ? [] : Array.isArray(props.current) ? props.current : [props.current];
        const newOptions = props.options == undefined ? newCurrent : Array.isArray(props.options) ? props.options : [props.options];
        setCurrent(newCurrent);
        setOptions(newOptions); 
        setList(newCurrent);
    },[props]);

    //Guidelines Abstracted
    const verifyLevel = (props.verifyLevel != undefined) ? props.verifyLevel : 2;
    const selectMultiple = (props.selectMultiple != undefined) ? props.selectMultiple : (Array.isArray(props.current));
    const inputType = (props.inputType != undefined) ? props.inputType : (isNaN(props.current) ? 'text' : 'number' );
    const addCustom = (props.addCustom != undefined) ? props.addCustom : false;
    const condense = (props.condense != undefined) ? props.condense : false;

    const isChanged=(latestList)=>{
        const l = latestList || list;
        if(Array.isArray(l))
            for(var i=0; i<l.length; i++) {
                    if(!current.includes(l[i])) return true;
            } 
        if(Array.isArray(current))
            for(var y=0; y<current.length; y++) {
                if(!l.includes(current[y])) return true;
        }return false;
    }

    const updateButton = async(latestList) => { const l = latestList || list;
        let text = isChanged(l) ? 'UPDATE' : ''; 
        if(Array.isArray(l)){
        l.forEach(v=>{if(!options.includes(v)) text='INVALID';});
        if(!selectMultiple && l.length > 1) text='INVALID';
        if(l.length == 0) text='BLANK';
        for(var i=0; i<l.length; i++) {
            if(l[i] == undefined) text='BLANK';
        } 
    } setButtonText(text);
        return text; }
    useEffect(()=>updateButton(), [list]);

    //*********************************
    //   API REQUEST & VERIFICATION
    //*********************************
    const makeRequest=async(password, latestList)=>{ setVerification(undefined); //saving local until fetch up stream is called to replace data
        if(verifyLevel == 1 && !localStorage.getItem("password")) await localStorage.setItem("password", password.toString());

        const success = await props.onUpdate(selectMultiple ? JSON.stringify(latestList || list) : list[0], password);
        if(success == true || isNaN(success)) { setButtonText((success != true) ? success : 'SAVED'); setCurrent(list); setTimeout(()=>setButtonText(''), 5000); }
        else if(success == 401) { setButtonText('PASS'); setTimeout(()=>setList(current), 5000); localStorage.clear();}
        else if(success == 404) { setButtonText('INVALID'); setTimeout(()=>setList(current), 5000); localStorage.clear();}
        else {setButtonText('FAILED'); setTimeout(()=>setList(current), 5000); }
    }

    const processUpdate=async(latestList)=>{ if(await updateButton(latestList) == 'UPDATE') { setButtonText('PENDING'); dispatch({type: 'setDropList'});
        if(verifyLevel == 0) makeRequest(undefined, latestList); //No Security
        else if(verifyLevel == 1 && !localStorage.getItem("password")) setVerification('Enter Control Password to Continue:'); //Only Request if not stored
        else if(verifyLevel == 1) makeRequest(localStorage.getItem("password"), latestList); //Use Saved Password
        else setVerification('Enter Advanced Passphrase to Proceed:'); //undefined || >1
    }}

    const toggleOption=async(option)=>{ let latest = [...list]; let allowed = [...options];
    //Special Email Verification
        if(props.inputType == 'email' && !(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).test(option)) {setButtonText('Email'); return 'Email';}
    //Add Custom to Options
        if(addCustom && !allowed.includes(option)) allowed = [...options, option];
        //Add to Select List
            if(!selectMultiple && (addCustom || allowed.includes(option))) latest=[option]; //Single set as list
            else if(list.includes(option)) latest= [...list.filter((o) => (o != option && allowed.includes(o)))]; //remove list
            else latest =  [...list.filter((o) => allowed.includes(o)), option]; //add list

            setOptions([...allowed]); setList([...latest]);
            if(!selectMultiple) processUpdate(latest);
        return await updateButton(latest);
    }
    
    //*********************************
    //   HTML DISPLAY
    //*********************************
    const getOldOptions = () => [...list.filter(c=>!options.includes(c))]; //old/changed control names

    return(<div id={props.title} className='settings-value-box'  style={{ gridTemplateColumns: (condense) ? 'auto 40%' : null}} onFocus={()=>{}} onBlur={()=>{}} >
        {(props.title==undefined) ?  <div className='none no-size' style={{position:'absolute'}}></div> : <strong className='settings-value-title' >{props.title}</strong>}
            {(openList == props.dropListId) ? <div ><button className='settings-value-input ' onClick={()=>dispatch({type: 'setDropList', payload: props.dropListId})} >{list ? list.toString() : ''}</button>
                        <div className='drop-menu-list' style={{top: options.length <= 5 ? null : '5vh', position: options.length <= 5 ? 'absolute' : 'fixed'}}>
                            <button key='settings-close-button' className='drop-menu-item' style={{border: 'none', borderRadius: 0, borderBottom: '1px solid whitesmoke', backgroundColor: 'whitesmoke', color: 'black'}} onClick={()=>{
                                        dispatch({type: 'setDropList'});
                                    }}>Close</button>
                        {getOldOptions().map((option, i) => 
                            <label key={option+i+'old'} className='drop-menu-item' style={{gridRow: (i+2), color: 'gold'}} onClick={()=>{ 
                                setList(old => [...old.filter((o) => (o != option && options.includes(o)))])
                                if(!selectMultiple) dispatch({type: 'setDropList'});
                                if(!selectMultiple) processUpdate();
                            }}>{option.toString()}</label>
                        )}
                        {options.map((option, i) => 
                            <label key={option+i} className='drop-menu-item' style={{gridRow: (i+2+getOldOptions().length), border: list.includes(option) ? '1px solid var(--main-color)' : 'none', color: list.includes(option) ? 'var(--main-color)' : 'white'}} onClick={async()=>{
                                await toggleOption(option);
                                if(!selectMultiple) dispatch({type: 'setDropList'});
                                if(!selectMultiple) processUpdate();
                            }}>{option.toString()}</label>
                        )}
                         {addCustom ? <div className='none' style={{display:'inline-grid', gridRow: (getOldOptions().length + options.length+3), gridColumn: 1}}>
                                <input key='settings-add-input' type={inputType} className='drop-menu-item' style={{gridRow: (1), gridColumn: 1, width: '10.0rem', borderRadius: 0, border: '1px solid whitesmoke', backgroundColor: 'black', color: 'white'}} 
                                    value={custom}
                                    onChange={(c)=>setCustom(c.target.value)}
                                    onKeyPress={async(e)=>{ if (e.charCode == 13) {
                                        if(await toggleOption(custom) == 'UPDATE') setCustom('');
                                        if(!selectMultiple) dispatch({type: 'setDropList'});
                                        if(!selectMultiple) processUpdate();
                                    }}}/>
                                <button key='settings-add-button' className='drop-menu-item' style={{gridRow: (1), gridColumn: 2, border: 'none', borderRadius: 0, borderBottom: '1px solid whitesmoke', backgroundColor: 'whitesmoke', color: 'black'}} onClick={async()=>{
                                        if(await toggleOption(custom) == 'UPDATE') setCustom('');
                                        if(!selectMultiple) dispatch({type: 'setDropList'});
                                    }}>ADD</button>
                        </div> : <div className='none no-size'></div>}
                        {(condense || buttonText == 'UPDATE') ? <button key='settings-save-button' className='drop-menu-item' style={{border: 'none', borderRadius: 0, border: 'none', backgroundColor: getButtonColor(buttonText), color: 'white'}} onClick={()=>{
                                        processUpdate();
                                    }}>{buttonText}</button> : <div className='none no-size'></div>}
                </div></div> 
            : <button className='settings-value-input ' onClick={()=>dispatch({type: 'setDropList', payload: props.dropListId})} >{list ? list.toString() : ''}</button>}
        {(condense && !selectMultiple) ?  <div className='none no-size' style={{position:'absolute'}}></div> : <button className='settings-value-button' onClick={processUpdate}  style={{backgroundColor: getButtonColor(buttonText)}}>{buttonText}</button> }
        {verification ?
            <Verify
                prompt={verification}
                onSubmit={makeRequest}
                onCancel={()=>{setVerification(undefined); setButtonText('UPDATE'); if(condense) setList([...current]); }}
            />  : <div className='none no-size' style={{position:'absolute'}}></div>}
    </div>);
}

export default SettingsList;
