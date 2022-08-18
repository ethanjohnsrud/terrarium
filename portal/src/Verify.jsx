import React, {useState} from 'react';


const Verify = (props) => {
    const [input, setInput] = useState();
    const [seeText, setSeeText] = useState(false);

    const isAdvanced = () => props.prompt.toLowerCase().includes('advance' || 'passphrase');

    return (<div id='verify-container' style={{position: 'fixed', zIndex: 35, width: '100vw', height: '100vh', top: 0, left:0, backgroundColor: `rgba(0,0,0,${isAdvanced() ? '1.0' : '0.7'})`, 
                                                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
        <div id='verify-inside' style={{position: 'relative', display: 'grid', textAlign: 'center', padding: '1.0rem 2.0rem', backgroundColor: isAdvanced() ? 'darkred' : 'var(--main-color)', borderRadius: '5px', }}>
            <strong style={{margin: '0.5rem', width: '100%', textAlign: 'left', color: isAdvanced() ? 'whitesmoke' : 'black'}}>{props.prompt}:</strong>
            <div style={{display: 'grid', backgroundColor: 'black', borderRadius: '5px', padding: '0.25rem 0.5rem',}}>
                <input autoFocus style={{gridColumn: 1, border: 'none', backgroundColor: 'black', color: 'whitesmoke'}} type={seeText ? 'text' : 'password'} onChange={(e)=>setInput(e.target.value)} onKeyPress={(e)=>{if(e.charCode == 13 && input != undefined && input != '') props.onSubmit(input);}}/>
                <input type='checkbox'value={seeText} onClick={()=>setSeeText(!seeText)} style={{gridColumn: 2, border: 'none', color: 'var(--main-color)', height: '1.2rem', width: '1.2rem', marginLeft: '1.0rem'}} />
            </div>
            <div>
                <button style={{border: '2px solid white', backgroundColor: 'whitesmoke', color: 'black', padding: '0.25rem', margin: '0.5rem'}} onClick={()=>props.onCancel()}>CANCEL</button>
                <button style={{border: 'none', backgroundColor: 'black', color: 'white', padding: '0.35rem', margin: '0.5rem'}} onClick={()=>{if(input != undefined && input != '') props.onSubmit(input);}}>SUBMIT</button>
            </div>
        </div>
    </div>);
}
export default Verify;