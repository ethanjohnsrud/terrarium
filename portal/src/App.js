import React, {useRef, useEffect} from 'react';
import { BrowserRouter as Router, Switch, Route, } from "react-router-dom";
import Readings from './Readings/Readings';
import Background from './Background/Background';
import ScreenSaver from './Background/ScreenSaver/ScreenSaver';
import Menu from './Menu/Menu';
import Control from './Control/Control';
import Schedule from './Control/Schedule/Schedule';
import Climate from './Climate/Climate';
import ErrorBar from './Readings/ErrorBar';
import Settings from './Settings/Settings';
import SensorTest from './Settings/Details/SensorTest';
import LogView from './Settings/Details/LogView';


import './App.css';
import History from './History/History';



const App = () => {

  //ScreenSaver Detection
  //https://stackoverflow.com/questions/37949981/call-child-method-from-parent
  const screenSaverRef = useRef();
  
  const deactivateScreenSaver = () => { if(screenSaverRef.current) screenSaverRef.current.deactivateScreenSaver(); }
  useEffect(() => window.addEventListener('scroll', deactivateScreenSaver, false), []); //https://stackoverflow.com/questions/5657292/why-is-false-used-after-this-simple-addeventlistener-function   

  return (<Strong>Can you se me???</Strong>
    // <Router basename={window.location.pathname || ''}>
    //   <div id="App" className=' border-box' 
    //   onClick={()=>screenSaverRef.current.deactivateScreenSaver()}
    //   onMouseMove={()=>screenSaverRef.current.deactivateScreenSaver()}
    //   onWheel={()=>screenSaverRef.current.deactivateScreenSaver()}
    //   >
    //     <Background /> 
    //     {/* Screen saver toggle to not render and diable timer is reduct screenSaverBrightness.setting == 'Disabled' */}
    //     <ScreenSaver ref={screenSaverRef}/>
            
    //     {/* <div id='page-box' className=' border-box' style={{ top: 0, padding: '1.0rem', height: `${menuRef.current ?  (window.innerHeight - (menuRef.current.offsetHeight) - 75) : window.innerHeight}px` }}>  */}
        
    //       <Switch>
    //         <Route exact path="/">
    //         <div id='page-box' className=' border-box' style={{boxSizing: 'border-box'}}>
    //           <Readings hideDetails={false}/>
    //           <Menu />
    //         </div>
    //         </Route>
    //         <Route path="/controls">
    //           <ErrorBar />
    //           <div id='page-box' className=' border-box' style={{boxSizing: 'border-box'}}>
    //             <Control/>
    //             <Menu />
    //           </div>
    //         </Route>
    //         <Route path="/schedules">
    //           <ErrorBar />
    //           <div id='page-box' className=' border-box' style={{boxSizing: 'border-box'}}>
    //             <Schedule/>
    //             <Menu />
    //           </div>
    //         </Route>
    //         <Route path="/climate">
    //           <ErrorBar />
    //           <div id='page-box' className=' border-box' style={{boxSizing: 'border-box'}}>
    //             <Climate/>
    //             <Menu />
    //           </div>
    //         </Route>
    //         <Route path="/history">
    //           <ErrorBar />
    //           <div id='page-box' className=' border-box' style={{boxSizing: 'border-box'}}>
    //             <History/>
    //             <Menu />
    //           </div>
    //         </Route>
    //         <Route path="/settings">
    //           <ErrorBar />
    //           <div id='page-box' className=' border-box' style={{boxSizing: 'border-box'}}>
    //             <Settings deactivateScreenSaver={(d)=>screenSaverRef.current.deactivateScreenSaver(d)}/>
    //             <Menu />
    //           </div>
    //         </Route>
    //         <Route path="/log">
    //           <ErrorBar />
    //           <div id='page-box' className=' border-box' style={{boxSizing: 'border-box'}}>
    //             <LogView/>
    //             <Menu />
    //           </div>
    //         </Route>
    //         <Route path="/sensor-testing">
    //           <ErrorBar />
    //           <div id='page-box' className=' border-box' style={{boxSizing: 'border-box'}}>
    //             <SensorTest/>
    //             <Menu />
    //           </div>
    //         </Route>
    //       </Switch>       
    //     </div>
    // </Router>
    ); //top layer last
}

export default App;
