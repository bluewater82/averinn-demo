import "../index.css"
import "../index1.css"
import { slContext } from "../App.jsx"
import { useContext } from "react";

function InputSLXParams({sInputs, bInputs, setResults}){
    const {currentStep, setCurrentStep} = useContext(slContext)
    /* Parse the options form, send data to the backend. The first params can be sent as-is, 
    the initial State Vector is sent as a list*/
    async function handleOptEvent(event){
        event.preventDefault();
        document.getElementById("submitFormButton").setAttribute("disabled", true)
        // Set up formdata
        const form = document.getElementById('optsform')
        const fd = new FormData(form)
        const formsubmit = Object.fromEntries(fd)
        // replace formdata with lists
        formsubmit.initialState = (fd.getAll("initState").map(Number))
        formsubmit.initialBlock = (fd.getAll("initBlock").map(Number))
        delete formsubmit["initState"]
        delete formsubmit["initBlock"]
        //send http request
        const jsondata = JSON.stringify(formsubmit)
        console.log(jsondata)
        const request = await fetch("http://127.0.0.1:8000/slxfileOpts", 
            {method:"POST", headers:{"Content-type": "application/json"}, body:jsondata});
        //handle request
        document.getElementById("submitFormButton").setAttribute("disabled", false)
        if(request.ok){
            const resp = await request.json();
            setResults(resp)
            setCurrentStep(currentStep + 1)
        } else{
            window.alert("Please Enter Values")
        }
    }


    
    /* html */
    return (
        <div className="card shadow-sm border-1 mx-auto" style={{ maxWidth: "850px" }}>
            <div className="card-body p-2">
                <h3 className="mb-4">
                    Simulation Parameters</h3>
                <form id="optsform" onSubmit={handleOptEvent}>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label">
                                Time Step</label>
                            <input
                                className="form-control"
                                type="number"
                                step="any"
                                name="stepSize"
                                placeholder="0.1"
                                required/>
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">
                                Max Time</label>
                            <input
                                className="form-control"
                                type="number"
                                step="any"
                                name="timePeriod"
                                placeholder="10"
                                required/>
                        </div>
                    </div>
                    <hr className="my-4" />
                    <h5 className="mb-3">
                        Initial State Values</h5>
                    <div className="row stateVars">
                        { (!!sInputs && Array.from({ length: sInputs }, (_, i) => (
                            <div
                                className="col-md-4 col-lg-3 mb-3"
                                key={i}>
                                <input className="form-control"
                                    type="number"
                                    step="any"
                                    name="initState"
                                    placeholder={`x${i}`}
                                    required/>
                            </div>
                        ))) || 
                        <p className="mb-3">
                            No state values needed. If this is unexpected, verify you are using the correct slx file.
                        </p>}
                    </div>
                    <h5 className="mb-3">
                        Initial Block Values</h5>
                    <div className="row blockVars">
                        { (!!bInputs && 
                        Array.from({ length: bInputs }, (_, i) => (
                            <div
                                className="col-md-4 col-lg-3 mb-3"
                                key={i}>
                                <input className="form-control"
                                    type="number"
                                    step="any"
                                    name="initBlock"
                                    placeholder={`x${i}`}
                                    required/>
                            </div>
                        ))) || 
                        <p className="mb-3">
                            No block values needed. If this is unexpected, verify you are using the correct slx file.
                        </p>}
                    </div>
                </form>
                <div>
                    <div className="aclass alert alert-danger d-none" id="457">
                        <p className="mr-auto">Error simulating SLX file. Try again later</p>
                        <button className="ml-auto albutton"
                                onClick={() => document.getElementById("457").classList.add('d-none')}>
                            <strong>×</strong>
                        </button>
                    </div>
                    <div className="aclass alert alert-danger d-none" id="456">
                        <p className="mr-auto">An Error Occured. Please try again later.</p>
                        <button className="ml-auto albutton"
                                onClick={() => document.getElementById("456").classList.add('d-none')}>
                            <strong>×</strong>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default InputSLXParams