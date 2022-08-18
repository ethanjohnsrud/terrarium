import {useEffect, useRef} from 'react';

//Custom Hook : Interval for autoplay
export default function useInterval (callback, delay, limit) {
    const savedCallback = useRef();
    // Remember the latest callback.
    useEffect(() => {
      savedCallback.current = callback;
    }, [callback]);
    // Set up the interval.
    useEffect(() => {
      let id = setInterval(() => {
        savedCallback.current();
      }, delay);
      if(limit) setTimeout(() => {clearInterval(id);}, limit);
      return () => {clearInterval(id);}
    }, [delay]);
  }