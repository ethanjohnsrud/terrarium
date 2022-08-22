import React, {useState, useEffect} from 'react';
import { useSelector} from 'react-redux';
import axios from 'axios';
import useInterval from '../useInterval';
import Verify from '../Verify';
import {fetchData} from '../index';

import '../index.css';
import './Settings.css';

const SettingsButton = (props) => {
    const [verification, setVerification] = useState(undefined);
    const [buttonText, setButtonText] = useState('UPDATE');

    //Guidelines Abstracted
    const verifyLevel = (props.verifyLevel != undefined) ? props.verifyLevel : 1;
    const condense = (props.condense != undefined) ? props.condense : false;
    const pendingText = (props.pendingText != undefined) ? props.pendingText : 'PENDING';
    const buttonColor = (props.buttonColor != undefined) ? props.buttonColor : 'var(--main-color)';
    const getButtonColor=(buttonText)=>(buttonText=='UPDATE') ? buttonColor : (buttonText=='PASS' || buttonText=='INVALID' || buttonText=='FAILED') ? '#e8000d' : (buttonText=='PENDING' || buttonText=='BLANK') ? 'orange' : '#cc5500';

    //*********************************
    //   API REQUEST & VERIFICATION
    //*********************************
    const makeRequest=async(password)=>{ setVerification(undefined); //saving local until fetch up stream is called to replace data
        if(verifyLevel == 1 && !localStorage.getItem("password")) await localStorage.setItem("password", password.toString());
        const success = await props.onUpdate(password);
        if(success == null || success == undefined) setButtonText('UPDATE');
        else if(success == true || isNaN(success)) {setButtonText((success != true) ? success : 'SAVED'); setTimeout(()=>setButtonText('UPDATE'), 3000); }
        else if(success == 401) { setButtonText('PASS'); setTimeout(()=>setButtonText('UPDATE'), 5000); localStorage.clear();}
        else if(success == 404) { setButtonText('INVALID'); setTimeout(()=>setButtonText('UPDATE'), 5000); }
        else {setButtonText('FAILED'); setTimeout(()=>setButtonText('UPDATE'), 5000);}
    }

    const processUpdate=(event)=>{
        event.stopPropagation();
        if(buttonText == 'UPDATE') { setButtonText('PENDING');
        if(verifyLevel == 0) makeRequest(undefined); //No Security
        else if(verifyLevel == 1 && !localStorage.getItem("password")) setVerification('Enter Control Password to Continue:'); //Only Request if not stored
        else if(verifyLevel == 1) makeRequest(localStorage.getItem("password")); //Use Saved Password
        else setVerification('Enter Advanced Passphrase to Proceed:'); //undefined || >1
    }}
    
    //*********************************
    //   HTML DISPLAY
    //*********************************

    return(<section style={{overflow: 'hidden'}}>
        {(condense) ?   <button className={`settings-single-button`} onClick={processUpdate}  style={{...props.buttonStyle, overflow: 'hidden', backgroundColor: buttonColor}}>{props.title}
                                <label className={`settings-single-button-overlay`} style={{display: buttonText == 'UPDATE' ? 'none' : 'flex', overflow: 'hidden', backgroundColor: getButtonColor(buttonText)}}>{buttonText}</label></button>
        : <div className='settings-value-box' style={{display: (condense) ? 'block' : 'grid'}}>
        <button className={`settings-single-button`} onClick={processUpdate}  style={{...props.buttonStyle, overflow: 'hidden', backgroundColor:  getButtonColor(buttonText)}}>{buttonText == 'UPDATE' ? props.title : buttonText == 'PENDING' ? pendingText : buttonText}</button>
        </div>}
        {verification ?
            <Verify
                prompt={verification}
                onSubmit={makeRequest}
                onCancel={()=>{setVerification(undefined); setButtonText('UPDATE');}}
            />  : <div className='none no-size' style={{position:'absolute'}}></div>}
    </section>);
}
export default SettingsButton;

export const HoldButton = (props) => {
    const SERVER_URL = useSelector(root => root.serverURL);
    const DATA = useSelector(root => root.data);
    const [time, setTime] = useState(0);
    useEffect(()=>setTime(DATA.timeNextEvaluation),[DATA]);
    const [timer, setTimer] = useState(0);
    useInterval(()=>setTimer(time - new Date().getTime()), 1000);

    return (<SettingsButton title={`${!DATA.frequencyActive ? 'HOLDING' : 'HOLD'}    -  ${(timer <= 0) ? 'evaluating' : `${(timer>3600000)?`${Math.floor(timer/3600000)}:`:''}${(timer>60000)?`${Math.floor((timer%3600000)/60000)}:`:''}${((timer>60000) && (timer%60000<10000))?'0':''}${Math.floor((timer%60000)/1000)}`}`}
    condense={true}
    buttonStyle={props.buttonStyle}
    buttonColor={!DATA.frequencyActive ? '#cc5500' : props.buttonColor}
    verifyLevel={props.verifyLevel || 1}
    onUpdate={(password)=>{setTimeout(()=>fetchData(), 5000); return axios.post(`${SERVER_URL}/postpone-evaluation/`, {PASSWORD: password, duration: props.duration || DATA.evaluationFrequency}).then((response)=>{setTime((props.duration || DATA.evaluationFrequency) + new Date().getTime());  return 'HOLDING';}).catch((error)=>error.response ? error.response.status : false);}} 
    />);
}