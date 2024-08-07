import'./WIPSection.css';
import HoverGif from './HoverGif';

import play from '../assets/slam-smash.gif';
import pause from '../assets/still-smash.png';

function WIPSection(){
    return(
        <section className="wipSection blurFadeIn">
            
            <div>
                <h1>Work in progress</h1>
                <p>
                    Whether its creating new projects or learning new skills,  
                    I'm constantly trying to gain new experiences and perspectives that I can apply to CS.
                    I hope you check back some day to see how much I've grown.
                </p>
            </div>
            <HoverGif alt="Patrick Star smashing computer" maxWidth='300px' play={play} pause={pause}/>
        </section>
    );
}

export default WIPSection;