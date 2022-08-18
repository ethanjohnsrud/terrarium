
import React, {useState, useEffect} from 'react';
import { useSelector} from 'react-redux';
import { Link, useHistory, useLocation} from "react-router-dom";
import '../index.css';
import './ErrorBar.css';

const ErrorBar = (props) => {
    const DATA = useSelector(root => root.data);
    const [ERROR_LIST, setERROR_LIST] = useState([]);
    const routeHistory = useHistory();
    const routeLocation = useLocation();

    useEffect(()=>{ const list = [];
        if(DATA.sensorErrorCode == undefined) list.push('SERVER DISCONNECTED');
        if(DATA.sensorErrorCode) list.push('SENSOR ERROR');
        if(DATA.maximumTemperatureErrorCode) list.push('MAXIMUM TEMPERATURE');
        if(DATA.minimumTemperatureErrorCode) list.push('MINIMUM TEMPERATURE');
        if(DATA.maximumHumidityErrorCode) list.push('MAXIMUM HUMIDITY');
        if(DATA.minimumHumidityErrorCode) list.push('MINIMUM HUMIDITY');
        if(DATA.accessDatabase != undefined && !DATA.accessDatabase) list.push('DATABASE DISCONNECTED');
    setERROR_LIST(list); },[DATA]);

    return(
        <div id='error-bar-container'  style={{display: ERROR_LIST.length ? 'block': 'none'}} onClick={()=>{
            if(routeLocation.pathname == '/settings') routeHistory.push('/log');
                else routeHistory.push('/settings');
        }}>
            <div id='error-bar-wrap' >
                {ERROR_LIST.map(e=><strong key={e} className='error-bar-text'>{e}</strong>)}
            </div>
        </div>
    );
}

export default ErrorBar;