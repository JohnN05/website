import './Footer.css'

function Footer(){
    return(
        <section className="footer">
            <div>
                <h1>Contact Info</h1>
                <address>
                    <p>
                    John Ng <br/>
                    Email: <a href="mailto:jng0511@umd.edu">jng0511@umd.edu</a> <br/>
                    Phone Number: <a href="tel:3015008388">301-500-8388</a> <br />
                    </p>
                </address>
            </div>
            <div>
                <h1>Find Me Online</h1>
                <ul>
                    <li><a href="https://linkedin.com/in/johnn05" target="_blank">Linkedin</a></li>
                    <li><a href="https://github.com/JohnN05" target="_blank">Github</a></li>
                    <li><a href="https://www.instagram.com/its_john_n/" target="_blank">Instagram</a></li>
                </ul>
            </div>
            <p className="note">
                Note: The site you're looking at is a rework of my original website.  
                I started off using Chakra UI to design my website but decided to write 
                all the components by myself for more creative freedom and to test the
                React.js skills that I have recently learned.  I hope you enjoyed my web design.
                If you have any suggestions on how I could improve my website, please don't 
                hesitate to contact me.  I would be happy to hear them! :)
                <br /><p className="signature">-John Ng 8/6/2024</p>
            </p>
        </section>
        
    );
}

export default Footer;