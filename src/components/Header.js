import './Header.css';
import resume from '../assets/Resume.pdf'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {faGithub, faInstagram, faLinkedin } from "@fortawesome/free-brands-svg-icons";
import {faEnvelope} from "@fortawesome/free-regular-svg-icons";
import { faFileArrowDown } from '@fortawesome/free-solid-svg-icons';

function Header(){
    return(
        <nav className="header">
            <p>John Ng</p>
            <a className="resume" href={resume} rel="noreferrer" target="_blank">
                <FontAwesomeIcon alt="Resume" className="shake" icon={faFileArrowDown} size="2x" style={{color: "#ffffff",}} />
                <p className="mobileHide">Like what you see? Check out my resume!</p>
            </a>
            
        
            <ul className="headerLinks">
                <li><a href="https://linkedin.com/in/johnn05" rel="noreferrer" target="_blank">
                    <FontAwesomeIcon className="icon" icon={faLinkedin} size="2x" style={{color: "#000000",}} />
                </a></li>
                <li><a href="https://github.com/JohnN05" rel="noreferrer" target="_blank">
                    <FontAwesomeIcon className="icon" icon={faGithub} size="2x" style={{color: "#000000",}} />
                </a></li>
                <li><a href = "https://www.instagram.com/its_john_n/" rel="noreferrer" target="_blank">
                    <FontAwesomeIcon className="icon" icon={faInstagram} size="2x" style={{color: "#000000",}} />
                </a></li>
                <li><a href = "mailto:jng0511@umd.edu">
                    <FontAwesomeIcon className="icon" icon={faEnvelope} size="2x" style={{color: "#000000",}} />
                </a></li>
            </ul>
            
        </nav>
    );
}

export default Header;