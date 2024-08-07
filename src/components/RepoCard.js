import './RepoCard.css'
import { format } from 'date-fns';

function RepoCard(props){
    const created = new Date(props.created);
    const updated = new Date(props.updated);

    return(
        
        <a href={props.url} rel="noreferrer" target='_blank'>
            <div className="repoCard">
                <h1>{props.name}</h1>
                <p>{props.description}</p>
                <div className="dates">
                    <h2>Created <br /><em>{format(created,'MMMM dd, yyyy')}</em></h2>
                    <h2>Last updated <br /><em>{format(updated,'MMMM dd, yyyy')}</em></h2>
                </div>  
            </div>
        </a>
    );
}

export default RepoCard;