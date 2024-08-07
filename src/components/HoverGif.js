
import { useState } from "react";

function HoverGif(props){

    const [isHovered, setIsHovered] = useState(false);
    return(
        <div className = "hoverGIF"  onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            {isHovered?<img alt={props.alt} className="verticalShake" width={props.maxWidth} src={props.play} />
            :<img alt={props.alt} width={props.maxWidth} src={props.pause} />
            }
            
        </div>
    );
}

export default HoverGif;