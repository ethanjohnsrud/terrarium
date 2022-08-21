import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import axios from 'axios';
import{Provider} from 'react-redux';
import {createStore, combineReducers} from 'redux';

import defaultImage from './Background/terrarium-buddies.jpg';



//Action Creators (manipulate State) => Doing in Component | Traditional Method is to predefine here and import into component, just to send back to reducer

//Single State with one Reducer | Could all be separate with separate reducers and combine with: 'combineReducers'

//Reducers : Perform state Update
const setServerURLReducer = (state = process.env.REACT_APP_SERVER_URL || '', action) => {
  if(action.type == 'setServerURL')  return action.payload;
  else return state;
}

const initialImage = {
  IMAGE_INTERVAL: 6000,
  TRANSITION_INTERVAL: 1000,
  SCREENSAVER_INACTIVE_TIME: 60000,
  location: defaultImage,
  isVisible: false,  // https://stackoverflow.com/questions/40064249/react-animate-mount-and-unmount-of-a-single-component
}
const setImageReducer = (state = initialImage, action) => {
  if(action.type == 'setImage') { return {...state, location: action.payload, isVisible: true};}
  else if(action.type == 'setImageVisible') return {...state, isVisible: true};
  else if(action.type == 'setImageInvisible') return {...state, isVisible: false};
  else return state;
}
const screenSaverActiveReducer = (state = true, action) => { //Image Opacity on/off -> transition css
  if(action.type == 'activateScreenSaver')  return true; 
  else if(action.type == 'deactivateScreenSaver')  return false;
  else return state;
}
const initialScreenSaverBrightness = {
  settingOptions: ['Default', 'Scheduled', 'Black', 'Disabled'],
  setting: 'Default',
  dayOpacity: 1.00,
  dayHourStart: 7,
  nightOpacity: 0.35,
  nightHourStart: 19,
  blackHourStart: 21,
}
const ScreenSaverBrightnessReducer = (state = initialScreenSaverBrightness, action) => {
  switch(action.type) {
    case 'setting':
      if(state.settingOptions.includes(action.payload)) return {...state, setting: action.payload};
      else return state;
    case 'dayOpacity':
      return {...state, setting: 'Scheduled', dayOpacity: action.payload};
    case 'dayHourStart':
      return {...state, setting: 'Scheduled', dayHourStart: action.payload};
    case 'nightOpacity':
      return {...state, setting: 'Scheduled', nightOpacity: action.payload};
    case 'nightHourStart':
      return {...state, setting: 'Scheduled', nightHourStart: action.payload};
    case 'blackHourStart':
      return {...state, setting: 'Scheduled', blackHourStart: action.payload};
    default: return state;
  }
}
const setDataReducer = (state = {}, action) => {
  if(action.type == 'setData') return {...action.payload};
  else return state;
}

const toggleConvertToFahrenheitReducer = (state = true, action) => { 
  if(action.type == 'toggleConvertToFahrenheit') return !state; 
  else return state;
}

const setDropListReducer = (state = 'OFF', action) => { 
  if(action.type == 'setDropList' && state == action.payload) return 'OFF';
  else if(action.type == 'setDropList' && action.payload == undefined) return 'OFF';  
  else if(action.type == 'setDropList') return action.payload; 
  else return state;
}

/*********************
  Setup Redux Store
********************/
const allStateDomains = combineReducers({
  serverURL: setServerURLReducer,
  image: setImageReducer,
  isScreenSaverActive: screenSaverActiveReducer, 
  screenSaverBrightness: ScreenSaverBrightnessReducer,
  data: setDataReducer,
  convertToFahrenheit: toggleConvertToFahrenheitReducer,
  dropListOpen: setDropListReducer
});

const store = createStore(allStateDomains,{});


/*********************
     Fetch Background Image
********************/
setInterval(()=>{//console.log('fetching Image', store.getState().image.image);
  axios.get(`${store.getState().serverURL}/${(window.innerHeight > window.innerWidth) ? 'image-portrait' : 'image-landscape'}/`, { responseType: "blob" })
  .then((response) => {
    store.dispatch({type: 'setImageInvisible'});
    setTimeout(() => {
      store.dispatch({type: 'setImage', payload: URL.createObjectURL(response.data)});//also sets image viable // CSS transitions
    
    }, store.getState().image.TRANSITION_INTERVAL/2);
  })
  .catch((error) => {
      console.error(error);
      // setImage(defaultImage);
    });
}, store.getState().image.IMAGE_INTERVAL+store.getState().image.TRANSITION_INTERVAL || 5000);

/*********************
     Fetch Data
********************/
export const fetchData = async(testURL)=> {
  const url = testURL || store.getState().serverURL;

  return await axios.get(`${url}/data/`, { responseType: "json", timeout: testURL ? 500 : undefined })
    .then((res) => {const response = res.data;
      store.dispatch({type: 'setData', payload: response});

      store.dispatch({type: 'setServerURL', payload: url});
      localStorage.setItem("server", url);

      console.log('Fetching Data Successful: ', url, response);
      setTimeout(()=>fetchData(), response ? (((response.timeNextEvaluation) - new Date().getTime())+30000) : (60*1000));
      return true;
    })
    .catch((error) => {
        console.error('Failed to Fetch Data:', url, error);
        // store.dispatch({type: 'setData'});
      if(!testURL) 
        setTimeout(()=>fetchData(), (60*1000));
      return false;
    });
  }

/**************************************
 Initialization and Find Server URL
***************************************/
//Sample URL: https://terrarium-control.tech/?server=70.124.144.161:4750&server=192.168.1.240:4700&redirect=http://192.168.1.240:4700/
const start = async() => {

const redirectURL = /(?<=redirect=).*?(?:(?!&|$).)*/.exec(window.location.search);
const serverPramList = window.location.search.match(/(?<=server=).*?(?:(?!\/|&|$).)*/g);
let foundServer = false;
console.log(redirectURL);
if(serverPramList) {
  for(let serverPram of serverPramList) { console.log("Server Pram:", serverPram, serverPramList);
    //Query Parameter HTTPS Secure
    if(!foundServer && await fetchData(`https://${serverPram}`)) {
      console.log('HTTPS Query Server Identified:', store.getState().serverURL);
      foundServer = true;
      break;
    }

    //Query Parameter HTTP
    else if(!foundServer && await fetchData(`http://${serverPram}`)) {
      console.log('HTTP Query Server Identified:', store.getState().serverURL);
      foundServer = true;
      break;
    } 
  }
} 

  //Local Storage
if(!foundServer && await fetchData(localStorage.getItem("server"))) {
      console.log('LocalStorage Server Identified:', store.getState().serverURL);
  }
  //Failed: Assign Current URL
else if(!foundServer && redirectURL) {
  window.location.replace(redirectURL[0]);
}
if(!foundServer) {
  console.error('Failed to Identify Server');
  store.dispatch({type: 'setServerURL', payload: window.location.origin});
  fetchData(); //Enter Reattempt State
}
}

start();

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store} >
          <App />
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);


// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();



