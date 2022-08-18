const EXCLUDE_CONTROL_TYPES = ['On', 'Off', 'Day', 'Night']


const DATA = {};
const selectMode = false;
DATA.controlTypes = ["On", "Off", "Water", "Light", "Feeding", "Heating", "Day"];

DATA.CONTROLS = [
    {id: 0, types: ["On"], settings: [{reason: 'Initial', set: 1, until: Number.POSITIVE_INFINITY}]},
    {id: 1, types: ["Water", "Light"], settings: [{reason: 'Schedule Initial', set: 1, until: Number.POSITIVE_INFINITY}]},
    {id: 2, types: ["Feeding", "Water"], settings: [{reason: 'Schedule First', set: 1, until: Number.POSITIVE_INFINITY}]},
    {id: 3, types: ["Water", "Light"], settings: [{reason: 'Schedule Initial', set: 1, until: Number.POSITIVE_INFINITY}]},
    {id: 4, types: ["Feeding", "Heating", "Water"], settings: [{reason: 'Schedule Important', set: 1, until: Number.POSITIVE_INFINITY}]},
    {id: 5, types: ["Heating", "Day"], settings: [{reason: 'Second', set: 1, until: Number.POSITIVE_INFINITY}]},
    {id: 6, types: ["Feeding", "Water"], settings: [{reason: 'Now', set: 1, until: Number.POSITIVE_INFINITY}]},
    {id: 7, types: ["Weather", "Food"], settings: [{reason: 'Now', set: 1, until: Number.POSITIVE_INFINITY}]},
    {id: 8, types: ["Weather", "Food"], settings: [{reason: 'Initial', set: 1, until: Number.POSITIVE_INFINITY}]},
];

console.log("CONTROLS", DATA.CONTROLS);

const topSchedules = [...DATA.CONTROLS.filter((c, i, arr) => (RegExp(/^Schedule /).test(c.settings[0].reason))).map(c => RegExp(/^Schedule (.+)/).exec(c.settings[0].reason)[1])];
console.log(topSchedules);

console.log(topSchedules.filter((t, i)=> topSchedules.indexOf(t) === i));



    
