
const DURATION_LIST = [ //return in millisecond and interpret slider
    {name: '1m', value: 1 * 60 * 1000},
    {name: '2m', value: 2 * 60 * 1000},
    {name: '3m', value: 3 * 60 * 1000},
    {name: '4m', value: 4 * 60 * 1000},
    {name: '5m', value: 5 * 60 * 1000},
    {name: '6m', value: 6 * 60 * 1000},
    {name: '7m', value: 7 * 60 * 1000},
    {name: '8m', value: 8 * 60 * 1000},
    {name: '9m', value: 9 * 60 * 1000},
    {name: '10m', value: 10 * 60 * 1000},
    {name: '15m', value: 15 * 60 * 1000},
    {name: '30m', value: 30 * 60 * 1000},
    {name: '45m', value: 45 * 60 * 1000},
    {name: '1h', value: 60 * 60 * 1000},
    {name: '2h', value: 2 * 60 * 60 * 1000},
    {name: '3h', value: 3 * 60 * 60 * 1000},
    {name: '4h', value: 4 * 60 * 60 * 1000},
    {name: '5h', value: 5 * 60 * 60 * 1000},
    {name: '6h', value: 6 * 60 * 60 * 1000},
    {name: '12h', value: 12 * 60 * 60 * 1000},
    {name: '1d', value: 24 * 60 * 60 * 1000},
    {name: '3d', value: 3 * 24 * 60 * 60 * 1000},
    {name: '1w', value: 7 * 24 * 60 * 60 * 1000},
    {name: '2w', value: 14 * 24 * 60 * 60 * 1000},
    {name: '1M', value: 30 * 24 * 60 * 60 * 1000},
];

export default DURATION_LIST;

export const getDurationName = (v, places = 1) => {
    try{const value = parseInt(v);
            if((value / (30 * 24 * 60 * 60 * 1000)) >= 1) return `${Math.floor(value / (30 * 24 * 60 * 60 * 1000) * (places * 10))/(places * 10)}M`;
            else if((value / (7 * 24 * 60 * 60 * 1000)) >= 1) return `${Math.floor(value / (7 * 24 * 60 * 60 * 1000) * (places * 10))/(places * 10)}w`;
            else if((value / (24 * 60 * 60 * 1000)) >= 1) return `${Math.floor(value / (24 * 60 * 60 * 1000) * (places * 10))/(places * 10)}d`;
            else if((value / (60 * 60 * 1000)) >= 1) return `${Math.floor(value / (60 * 60 * 1000) * (places * 10))/(places * 10)}h`;
            else if((value / (60 * 1000)) >= 1) return `${Math.floor(value / (60 * 1000))}m`;
            else return 'ZERO';
    } catch(error){return 'INVALID';}
}

export const getDurationValue = (name) => {
    try{ const cleanedValue = /\d+/.exec(name)[0];
        const value = parseInt(cleanedValue);
        const label = /[a-zA-Z]+/.exec(name)[0];

        if(label == 'm') return value * 60 * 1000;
        else if(label == 'h')  return value * 60 * 60 * 1000;
        else if(label == 'd')  return value * 24 * 60 * 60 * 1000;
        else if(label == 'w')  return value * 7 * 24 * 60 * 60 * 1000;
        else if(label == 'M')  return value * 30 * 24 * 60 * 60 * 1000;
        else return value;
    } catch(error){return 0;}
}