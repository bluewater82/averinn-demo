import { slContext } from "../App";
import "./index.css"
import {useContext, useEffect, useState} from 'react'
function SLXResults({results}){
    const [showGraph, setShowGraph] = useState(true);
    const [plotUrl, setPlotUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const {API_BASE_URL} = useContext(slContext)

    useEffect(() => {
        // Fetch the image from FastAPI
        URL.revokeObjectURL(plotUrl)
        fetch(`${API_BASE_URL}/slxplt`)
        .then((response) => response.blob())
        .then((blob) => {
            // Create an Object URL for the blob
            const url = URL.createObjectURL(blob);
            setPlotUrl(url);
            setLoading(false);
        })
        .catch((error) => {
            console.error('Error fetching the plot:', error);
            setLoading(false);
        });
    }, []);

    return(
        <>
        <button className="btn btn-primary mb-5" onClick={() => setShowGraph(!showGraph)}>
            {showGraph ? "Show Data" : "Show Graph"}
        </button>
        {loading &&  <div>Loading plot...</div>}
        {showGraph && <div>
            {plotUrl && <img src={plotUrl} alt="Matplotlib Plot from FastAPI" />}
        </div>}
        {!showGraph && <table id="slxtable">
            <thead>
                <tr>
                    <th className="slxth">Timestamp</th>
                    <th className="slxth" colSpan={30}>Data</th>
                </tr>
            </thead>
            <tbody>
            {Object.entries(results).map((arr) => 
                <tr>
                <td className="slxtd">{arr[0].replace(/[\[\]]/g, "")}</td>
                {arr[1].split("-=-").map((value) => (
                    <td className="slxtd">{value.replace(/[\[\]]/g, "").replaceAll(" ", "\u2003\u2003\u2003")}</td>
                ))}
                </tr>
            )}
            </tbody>
        </table>}
        </>
    )
}

export default SLXResults