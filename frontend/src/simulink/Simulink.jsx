import { useState, useContext} from "react"
import "../index.css"
import "../index1.css"
import UploadSLX from "./UploadSLX.jsx";
import InputSLXParams from "./InputParamsSLX.jsx";
import SLXResults from "./SLXResults.jsx";
import { slContext } from "../App.jsx"

function Simulink(){
    const {currentStep, setCurrentStep, setCurrentType} = useContext(slContext)
    const [sInputs, setSInputs] = useState(0);
    const [bInputs, setBInputs] = useState(0);
    const [results, setResults] = useState({});
    const [docContinueOk, sdocContinueOk] = useState(false);
    
    /* Request Submission of the options form
        TODO: Allow initialState Vector inputs to be optional - This may change
          */
    function attemptSubmit() {
        document.getElementById('optsform').requestSubmit()
    }
    
    /* 
        Verify that both required files have been submitted, and continue to the next page
          */
    async function docContinue() {
        const request = await fetch("http://127.0.0.1:8000/continueok")
        if (request.ok){
            const response = await request.json();
            if(response.message){
                setCurrentStep(currentStep + 1)
            } else{
                window.alert("Please enter the required files")
            }
        }
    }
    
    /* 
        Go to the previous page.
        This currently resets the backend files input if you are returning to the page where you submit them. 
        This is to prevent the backend from having a stale, unexpected state after refresh.
          */
    async function back(){
        if (currentStep === 3){
            fetch("http://127.0.0.1:8000/reset")
            sdocContinueOk(false)
        } else if (currentStep === 2){
            fetch("http://127.0.0.1:8000/reset")
            setCurrentType(-1)
        }
        setCurrentStep(currentStep - 1)
    }

    /* 
        Go to the next page.
        This currently resets the backend files input if you are returning to the page where you submit them. 
        This is to prevent the backend from having a stale, unexpected state after refresh.
          */
    async function resetNext(){
        if (currentStep === 1){
            fetch("http://127.0.0.1:8000/reset")
            sdocContinueOk(false)
        }
        setCurrentStep(currentStep + 1)
    }

    /* 
        html
          */
    return (
    <div className="d-flex flex-column justify-content-between" style={{flexGrow:"1"}}>
        <div className="container py-5 mb-auto">
            {currentStep === 2 && (
                <UploadSLX setSInputs={setSInputs} setBInputs={setBInputs} sdocContinueOk={sdocContinueOk}/>
            )}
            {currentStep === 3 && (
                <InputSLXParams sInputs={sInputs} bInputs={bInputs} setResults={setResults}/>
            )}
            {currentStep === 4 && (
                <SLXResults results={results}/>
            )}
        </div>
        <div id="plt"></div>
        <footer className="mt-auto" style={{minWidth:"100svw"}}>
            <div className="d-flex bg-dark justify-content-end align-items-center">
                {(currentStep === 2) && (
                    <>
                        <button
                            type="button"
                            onClick={back}
                            className="btn btn-outline-secondary px-4 m-4">
                            Back
                        </button>
                        <button
                            id="continueButton"
                            type="button"
                            onClick={docContinue}
                            className="btn btn-primary px-5 m-4"
                            disabled={!docContinueOk}>
                            Next
                        </button>
                    </>)
                    }
                {currentStep === 3 && (
                    <>
                    <button
                        type="button"
                        onClick={back}
                        className="btn btn-outline-secondary px-4 m-4">
                        Back
                    </button>
                    <button
                        onClick={attemptSubmit}
                        className="btn btn-primary px-5 m-4"
                        id="submitFormButton">
                        Next
                    </button>
                    </>)
                }
                {currentStep === 4 && (
                    <>
                    <button
                        type="button"
                        onClick={back}
                        className="btn btn-outline-secondary px-4 m-4">
                        Use Different Values
                    </button>
                    <button
                        onClick={(event) => {setCurrentStep(1); setCurrentType(-1)}}
                        className="btn btn-primary px-5 m-4">
                        Restart
                    </button>
                    </>)
                }
                
            </div>
        </footer>
    </div>
);
}

export default Simulink
