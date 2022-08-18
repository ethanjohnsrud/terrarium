import { useSelector} from 'react-redux';
import defaultImage from './terrarium-buddies.jpg';
import '../index.css';
import './Background.css';


const Background = (props) => {

  const IMAGE = useSelector(root => root.image);

return(
    <div key='Background Component'>
      <div key='background-black' style={{
        position: 'absolute', 
        zIndex: 0,
        height:'100vh', 
        width: '100vw', 
        backgroundColor: 'black'
        }}></div>
      <div key='Background Image' style={{position: 'absolute',  }}>
        {/* <div key='background-cover' style={{
        position: 'absolute', 
          zIndex: '3',
          height:'100vh', 
          width: '100vw', 
          backgroundColor: 'black',
          opacity: 0.4,

          }}></div> */}
        <img  className="blur-effect" src={IMAGE.location || defaultImage} alt={'background-image'}  style={{
          zIndex: '2',
          display: 'block',
          objectFit: 'cover',
          overflow: 'hidden',
          width: '100vw', 
          height: '100vh', 
          opacity: IMAGE.visible ? 0.9 : 0.3, 
          transition: `all ${IMAGE.TRANSITION_INTERVAL*0.6}ms ease`}}/>
        
      </div>
    </div>
);
}
export default Background;