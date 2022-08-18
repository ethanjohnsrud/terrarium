import React, {useState, useCallback, useEffect, useRef, useImperativeHandle} from 'react';
import { useHistory} from "react-router-dom";
import { useSelector, useDispatch} from 'react-redux';
import dateFormat from 'dateformat';
import useInterval from '../../useInterval';
import defaultImage from '../terrarium-buddies.jpg';
import '../../index.css';

import Readings from '../../Readings/Readings';


const TimeBar = (props) => {
  const DATA = useSelector(root => root.data);

  const [countUp, setCountUp] = useState(0);
  useInterval(()=>{setCountUp((new Date().getTime() - DATA.timeLastReading));},1000);

  return(<div className='none border-box' style={{position: 'fixed', bottom: 0, width: '100%', 
    padding: '0.3rem 1.0rem', 
    display: 'flex', justifyContent: 'space-between',
    backgroundColor: 'black', color: 'whitesmoke', fontSize: '0.8rem', whiteSpace: 'wrap', overflowX: 'scroll',
  }}>
      <p className='none' style={{whiteSpace: 'nowrap', left: 0}} >{dateFormat(new Date().getTime(), 'dddd, mmmm d, yyyy h:MM')}</p>
      <p className='none' style={{whiteSpace: 'nowrap', right: '100vw'}} >{isNaN(countUp) ? 'Disconnected' : countUp > 60000 ? `${Math.floor(countUp/60000)}:${countUp%60000<10000?'0':''}${Math.floor((countUp%60000)/1000)}` : `${Math.floor(countUp/1000)} seconds`}</p>
  </div>);
}

const ScreenSaver = React.forwardRef((props, ref) => {
//  Detection & Timeout: https://codesandbox.io/s/5xrrr09r9k?file=/src/index.js:480-1530

const IMAGE = useSelector(root => root.image);
const DATA = useSelector(root => root.data);
const [serverError, setServerError] = useState(false);
const isScreenSaverActive = useSelector(root => root.isScreenSaverActive);
const [showScreenSaver, setShowScreenSaver] = useState(true);
const [screenSaverOpacity, setScreenSaverOpacity] = useState('0'); //CSS Inline String
useEffect(()=>{if(isScreenSaverActive && !serverError) {
    // setScreenSaverOpacity('0');
    setShowScreenSaver(true);
    setTimeout(() => setScreenSaverOpacity('1'), ( 0.6*1000));
  } else {
    // setScreenSaverOpacity('1');
    setTimeout(() => setScreenSaverOpacity('0'), ( 0.6*1000));
    setTimeout(() => setShowScreenSaver(false), (1000));
  }}, [isScreenSaverActive, serverError]);
const screenSaverBrightness = useSelector(root => root.screenSaverBrightness);
const dispatch = useDispatch();
const routeHistory = useHistory();

const calculateBrightness = () => { if(screenSaverBrightness.setting == 'Black') return 1.0;
    if(screenSaverBrightness.setting == 'Scheduled') { const hour = 19;
    let options=[{hour: screenSaverBrightness.blackHourStart, opacity: 0}, {hour: screenSaverBrightness.dayHourStart, opacity: screenSaverBrightness.dayOpacity}, {hour: screenSaverBrightness.nightHourStart, opacity:screenSaverBrightness.nightOpacity}];
    options = options.sort((a,b) => (a.hour-b.hour));
    console.log(options);
    if((hour >= options[0].hour) && ((hour < options[1].hour) || (options[0].hour == options[1].hour)) && (options[0].hour >= 0 && options[0].hour <= 23)) return options[0].opacity;
    if((hour >= options[1].hour) && ((hour < options[2].hour) || (options[1].hour == options[2].hour)) && (options[1].hour >= 0 && options[1].hour <= 23)) return options[1].opacity;
    if((hour >= options[2].hour) || (hour < options[0].hour) && (options[2].hour >= 0 && options[2].hour <= 23)) return options[2].opacity;
    }
    return 1.0; //Default
}

//Evaluate Current Errors
  useEffect(()=>{ const list = [];
    if((DATA.sensorErrorCode == undefined) 
        || (DATA.sensorErrorCode) 
        || (DATA.maximumTemperatureErrorCode) 
        || (DATA.minimumTemperatureErrorCode) 
        || (DATA.maximumHumidityErrorCode) 
        || (DATA.minimumHumidityErrorCode) 
        || (DATA.accessDatabase != undefined && !DATA.accessDatabase)) setServerError(true);
    else setServerError(false);
  },[DATA]);

//Screen Saver
const screensaverTimer = useRef();
const resetTimer = useRef();
const deactivateScreenSaver = useCallback((duration) => {
  dispatch({type: 'deactivateScreenSaver'});
    //Set Timer
    clearTimeout(screensaverTimer.current);
    screensaverTimer.current = setTimeout(() => dispatch({type: 'activateScreenSaver' }), duration || IMAGE.SCREENSAVER_INACTIVE_TIME);
    clearTimeout(resetTimer.current);
    if(isScreenSaverActive) resetTimer.current = setTimeout(()=>routeHistory.push('/'), (duration || IMAGE.SCREENSAVER_INACTIVE_TIME)*3);
  }, []);
  useEffect(()=>deactivateScreenSaver(),[]); //call initially

      //Allows Parent: App.js to call on all mouse movements
      useImperativeHandle(ref, () => ({
        deactivateScreenSaver() {
          deactivateScreenSaver();
        }
      }));
    
return((!showScreenSaver) ? <div className='none no-size'></div> : 
    <div key='ScreenSaver Component' style={{zIndex: 20,
      position: 'absolute',
      width: '100vw',
      height: '100vh',
      opacity: screenSaverOpacity,
      transition: `all ${IMAGE.TRANSITION_INTERVAL*0.5}ms ease`
    }}
    // onClick={()=>deactivateScreenSaver()}
    // onMouseMove={()=>deactivateScreenSaver()}
    // onMouseLeave={()=>dispatch({type: 'activateScreenSaver' })}
    >
      <div key='ScreenSaver-black' style={{
        position: 'absolute', 
        // zIndex: '0',
        height:'100vh', 
        width: '100vw', 
        backgroundColor: 'black'
        }}></div>
      <div key='ScreenSaver Image' style={{position: 'absolute',  }}>
        <img  className="" src={IMAGE.location || defaultImage} alt={'screensaver'}  style={{
          // zIndex: '9',
          display: 'block',
          objectFit: 'cover',
          overflow: 'hidden',
          width: '100vw', 
          height: '100vh', 
          opacity: IMAGE.isVisible ? calculateBrightness() : (calculateBrightness() > 0.2) ? 0.2 : 0,
          transition: `all ${IMAGE.TRANSITION_INTERVAL*0.6}ms ease`}}/>
      </div>
          <Readings hideDetails={true}/>
          <TimeBar />
    </div>
);

});

export default ScreenSaver;