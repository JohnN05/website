import './BioSection.css';
import bio from '../assets/bio.jpeg';
function BioSection(){
    return(
        <section className="bio">
            <img alt="John Ng" src={bio}></img>
            <article>
                <h1>Hi, I'm John!</h1>
                <h2>I'm currently a student at UMD studying CS.</h2>
                <p>I'm proficient in Java and Python but I also know JavaScript, React.JS and C.  With 5+ years of coding experience, I've been able to mentor and teach a variety of coders from Brazil to Ukraine.  I plan on using my experience to create applications that will benefit public sectors such as education and health.</p>
            </article>

        </section>
    );
}

export default BioSection;