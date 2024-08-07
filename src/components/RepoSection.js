import './RepoSection.css';
import {useEffect, useState } from "react";
import RepoCard from "./RepoCard";

function RepoSection(){
    const[repos, setRepos] = useState([]);
    useEffect(() => {
        fetch('https://api.github.com/users/JohnN05/repos')
        .then(response => {
            if(!response.ok){
                throw new Error(`GitHub request failed: ${response.status}`)
            }
            return response.json()
        })
        .then(jsonData => {
            jsonData.sort((a, b) => {
                return new Date(b.updated_at) - new Date(a.updated_at);
            })
            setRepos(jsonData.map((repo) => {
                return(<RepoCard
                    url={repo.html_url}
                    name={repo.name}
                    description={repo.description}
                    created={repo.created_at}
                    updated={repo.updated_at}
                    />
                )
            }))
        })

    })

    return(
        <section className='repoSection'>
            <h1>My Repos</h1>
            <div className="repos blurFadeIn">
                {repos}
            </div>
        </section>
    )
}

export default RepoSection;