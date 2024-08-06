import './Header.css';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {faGithub, faInstagram, faLinkedin } from "@fortawesome/free-brands-svg-icons";
import {faEnvelope} from "@fortawesome/free-regular-svg-icons";

function Header(){
    return(
        <nav className="header">
            <p>John Ng</p>
            <ul className="headerLinks">
                <li><a href="https://linkedin.com/in/johnn05" target="_blank">
                    <FontAwesomeIcon className="icon" icon={faLinkedin} size="2x" style={{color: "#283618",}} />
                </a></li>
                <li><a href="https://github.com/JohnN05" target="_blank">
                    <FontAwesomeIcon className="icon" icon={faGithub} size="2x" style={{color: "#283618",}} />
                </a></li>
                <li><a href = "https://www.instagram.com/its_john_n/" target="_blank">
                    <FontAwesomeIcon className="icon" icon={faInstagram} size="2x" style={{color: "#283618",}} />
                </a></li>
                <li><a href = "mailto:jng0511@umd.edu">
                    <FontAwesomeIcon className="icon" icon={faEnvelope} size="2x" style={{color: "#283618",}} />
                </a></li>
            </ul>
            
        </nav>
    );
}

export default Header;