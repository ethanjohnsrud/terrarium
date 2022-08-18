import React, {useState,  useEffect, useRef} from 'react';
import { useSelector} from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom'
import axios from 'axios';
import SettingsButton from '../SettingsButton';


import '../../index.css';
import '../Settings.css';


const LogView = (props) => {
    const SERVER_URL = useSelector(root => root.serverURL);
    const [current, setCurrent] = useState('');
    const [fileName, setFileName] = useState('');
    const topRef = useRef();
    const location = useLocation();
    const routeHistory = useHistory();

    //USAGE: http://localhost:3000/log/5 => Loads the 5th log file ago
    const getFileNumber = () => { console.log(SERVER_URL);
        const result = /^\/log\/([0-9]+)*/.exec(location.pathname) || [0,0];
        return result[1];
    }

    const updateLog = async (latest = false) => await axios.put(`${SERVER_URL}/log/`, latest ? {} : {fileName: fileName, fileNumber: `${getFileNumber()}`})
        .then((response)=>{
            setCurrent(response.data); 
            setFileName(response.headers['content-name']); 
            if(response.headers['content-name'] == 'log.txt') routeHistory.replace('/log');
        return 'LOADING';})
        .catch((error)=>error.response ? error.response.status : false);
    useEffect(()=>updateLog(),[SERVER_URL]);

    //Text Log Message Type Per Line
    const isError = (line) => (/error|fail/i.test(line));
    const isHeader = (line) => (/\[\d{1,2}-\d{1,2}-\d{4} \d{1,2}:\d{1,2}:\d{1,2}]/.test(line));
    const isClimate = (line) => (/severe|high|low/i.test(line));
    const isTrace = (line) => (/^\s*\>{1}/.test(line));
    const isSystem = (line) => (/restart|server/i.test(line));

    
    return(<div id='sensor-test-container' >
        <SettingsButton title='UPDATE' pendingText='RETRIEVING'
            condense={true}
            verifyLevel={0}
            onUpdate={async(password)=>await updateLog(true)}
            />
        <strong id='title' ref={topRef} className='settings-value-title' style={{marginTop: '1.5rem'}}>File: {fileName}</strong>
    <div className='sensor-test-results'>
    {current.split(/(?=\[\d{1,2}-\d{1,2}-\d{4} \d{1,2}:\d{1,2}:\d{1,2}])/g).reverse()
        .map(entry=>entry.split(/\n/g)
            .map((line, k) => !line.length ? <span key={k} className='no-size'></span>
                : <p key={k} style={{
                    color: (isHeader(line) && isError(line)) ? 'red' 
                        : isSystem(line) ? 'goldenrod' 
                        : isClimate(line) ? 'orangered' 
                        : isHeader(line) ? 'white'
                        : isTrace(line) ? 'var(--main-color)'
                        : '#848884',
                    fontSize: isHeader(line) ? '14px'
                        : isTrace(line) ? '12px'
                        : '12px',
                    fontWeight: isHeader(line) ? '500'
                        : isTrace(line) ? '300'
                        : '400',
                    fontStyle: isTrace(line) ? 'italic' : 'normal',
                    margin: isTrace(line) ? '0.1rem' : '0.2rem',
                    marginLeft: isHeader(line) ? '0' 
                        : isTrace(line) ? '3.0rem' : '2.0rem',
                    marginTop: isHeader(line) ? '1.0rem' 
                        : isTrace(line) ? '0.05rem' : '0.2rem'
                    }}
            >{line}</p>))}    </div>
    {(fileName == undefined) ?  <div className='none no-size' style={{position:'absolute'}}></div> 
    : <SettingsButton title='PREVIOUS LOG' pendingText='SEARCHING'
            condense={true}
            verifyLevel={0}
            onUpdate={async(password)=>await updateLog()
                .then((response)=>{
                    topRef.current.scrollIntoView({block: 'nearest', inline: 'start' });
                    routeHistory.replace(`/log/${getFileNumber()+1}`);
                    return 'LOADING';})
                .catch((error)=>error.response ? error.response.status : false)}
            />}
    </div>);
}
export default LogView;