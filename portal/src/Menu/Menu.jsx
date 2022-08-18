
import React, {forwardRef} from 'react';
import { Link, useHistory, useLocation} from "react-router-dom";
import {useDispatch} from 'react-redux';

import '../index.css';
import './Menu.css';
import icon from './frog-logo.png';


const Menu = forwardRef((props, ref) => {
    const routeHistory = useHistory();
    const routeLocation = useLocation();
    const dispatch = useDispatch();


    return(<div>
        <div id='menu-container-spacer'></div>
        <div ref={ref} id='menu-container' className=' border-box' >
            <div className='menu-icon-box' style={{ textDecoration: 'none' }} onClick={()=>{
                if(routeLocation.pathname == '/') setTimeout(()=>dispatch({type: 'activateScreenSaver' }), 1500);
                else routeHistory.push('/');
            }}>
                    <img className='menu-icon' src={icon} />
                    <strong className='menu-icon-text'>Current</strong>
            </div>
            <Link to="/controls" className='menu-icon-box' style={{ textDecoration: 'none' }}>
                    <img className='menu-icon' src={icon} />
                    <strong className='menu-icon-text'>Controls</strong>
            </Link>
            <Link to="/schedules" className='menu-icon-box' style={{ textDecoration: 'none' }}>
                <img className='menu-icon' src={icon} />
                <strong className='menu-icon-text'>Schedules</strong>
            </Link>
            <Link to="/climate" className='menu-icon-box' style={{ textDecoration: 'none' }}>
                <img className='menu-icon' src={icon} />
                <strong className='menu-icon-text'>Climate</strong>
            </Link>
            <Link to="/history" className='menu-icon-box' style={{ textDecoration: 'none' }}>
                <img className='menu-icon' src={icon} />
                <strong className='menu-icon-text'>History</strong>
            </Link>
            <div className='menu-icon-box' style={{ textDecoration: 'none' }} onClick={()=>{
                if(routeLocation.pathname == '/settings') routeHistory.push('/log');
                else routeHistory.push('/settings');
            }}>
                    <img className='menu-icon' src={icon} />
                <strong className='menu-icon-text'>Settings</strong>
            </div>
        </div>
    </div>);
});

export default Menu;