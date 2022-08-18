import React, {useState, useEffect} from 'react';
import Verify from '../Verify';

import '../index.css';
import './Settings.css';

const getButtonColor=(buttonText)=>(buttonText=='') ? 'transparent' : (buttonText=='UPDATE') ? 'var(--main-color)' : (buttonText=='PASS' || buttonText=='INVALID' || buttonText=='FAILED') ? '#e8000d' : (buttonText=='PENDING' || buttonText=='BLANK') ? 'orange' : '#cc5500';

const SettingsBlank = (props) => {
    const [verification, setVerification] = useState(undefined);
    const [current, setCurrent] = useState(props.current);
    const [value, setValue] = useState(current);
    const [buttonText, setButtonText] = useState('');

    //Guidelines Abstracted
        const verifyLevel = (props.verifyLevel != undefined) ? props.verifyLevel : 2;
        const inputType = (props.inputType != undefined && props.condense == undefined) ? props.inputType : (isNaN(props.current) ? 'text' : 'number' );
        const numberStep = (props.numberStep != undefined) ? props.numberStep : 1;
        const condense = (props.condense != undefined) ? props.condense : false;

        const updateButton = async()=>{const text = (value == current && props.current == undefined) ? 'BLANK' : (inputType == 'number' && isNaN(value)) ? 'NUMBER' : (value != current) ? 'UPDATE' : '';
                                        setButtonText(text); return text;}
        useEffect(()=>updateButton(), [value]);

    //*********************************
    //   API REQUEST & VERIFICATION
    //*********************************
    const makeRequest=async(password)=>{ setVerification(undefined); //saving local until fetch up stream is called to replace data
        if(verifyLevel == 1 && !localStorage.getItem("password")) await localStorage.setItem("password", password.toString());
        const success = await props.onUpdate(value, password);
        if(success == true || isNaN(success)) {setButtonText((success != true) ? success : 'SAVED'); setCurrent(inputType == 'textarea' ? '' : value); if(inputType == 'textarea') setValue(''); setTimeout(()=>setButtonText(''), 5000); }
        else if(success == 401) { setButtonText('PASS'); setTimeout(()=>setValue(current), 5000);  localStorage.clear();}
        else if(success == 404) { setButtonText('INVALID');setTimeout(()=>setValue(current), 5000); }
        else {setButtonText('FAILED'); setTimeout(()=>setValue(current), 5000); }

    }

    const processUpdate=async()=>{ if(await updateButton() == 'UPDATE') { setButtonText('PENDING');
        if(verifyLevel == 0) makeRequest(undefined); //No Security
        else if(verifyLevel == 1 && !localStorage.getItem("password")) setVerification('Enter Control Password to Continue:'); //Only Request if not stored
        else if(verifyLevel == 1) makeRequest(localStorage.getItem("password")); //Use Saved Password
        else setVerification('Enter Advanced Passphrase to Proceed:'); //undefined || >1
    }}

    //*********************************
    //   HTML DISPLAY
    //*********************************

    return(<div className='settings-value-box' style={{gridTemplateColumns: (condense) ? '1fr 1fr' : null}}>
        {(props.title==undefined) ?  <div className='none no-size' style={{position:'absolute'}}></div> : <strong className='settings-value-title' >{props.title}</strong>}
        {inputType == 'textarea' ? <textarea name="textarea" value={value} onChange={(v)=>setValue(v.target.value)} />
        : <input className='settings-value-input' style={{color: (condense && buttonText != '') ? getButtonColor(buttonText) : null}} type={inputType} step={inputType == 'number' ? numberStep : null} value={value} onChange={(v)=>setValue(v.target.value)} onKeyPress={(e)=>{if(e.charCode == 13) {processUpdate();}}}/>}
        {condense ?  <div className='none no-size' style={{position:'absolute'}}></div> : <button className='settings-value-button' onClick={processUpdate}  style={{backgroundColor:  getButtonColor(buttonText)}}>{(inputType == 'textarea' && value != '') ? 'SAVE' : buttonText}</button>}
        {verification ?
            <Verify
                prompt={verification}
                onSubmit={makeRequest}
                onCancel={()=>{setVerification(undefined); setButtonText('UPDATE');}}
            />  : <div className='none no-size' style={{position:'absolute'}}></div>}
    </div>);
}
export default SettingsBlank;
