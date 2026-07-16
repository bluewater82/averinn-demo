import { useContext, useState } from "react";
import "./index.css"
import SlUploadCard from "./slUploadCard";
import { slContext } from "../App";

function UploadSLX({setSInputs, setBInputs, sdocContinueOk, setFileVerif}){
    const [nnfile, setnnfile] = useState(null);
    const [slxfile, setslxfile] = useState(null);
    const [yamlurl, setyamlurl] = useState(null);
    const [nnurl, setnnurl] = useState(null);
    const {API_BASE_URL} = useContext(slContext);
    /* Submit the entered SLX File, check if both files are submitted,
         which allows the user to continue the form */
         
    async function handleSLXEvent(e) {
        URL.revokeObjectURL(yamlurl)
        sdocContinueOk(false)
        setFileVerif(true)
        let eventfile = (e.target.files[0])
        setslxfile(eventfile)
        if(eventfile){
            console.log(eventfile)
            console.log("SLX File Read - Sending...")
            const fd = new FormData();
            fd.append("file", eventfile);
            const request = await fetch(`${API_BASE_URL}/slxfile`, {method:"POST", body:fd});
            const resp = await request.json();
            if(request.ok){
                console.log(resp.message)
                setSInputs(resp.numSIn)
                setBInputs(resp.numBIn)
                if(resp.numOut == 0){
                    document.getElementById("noOut").classList.remove("d-none")
                }
                const creq = await fetch(`${API_BASE_URL}/continueok`)
                if (creq.ok){
                    const response = await creq.json();
                    sdocContinueOk(response.message)
                }
            } else{
                e.target.value = ""
                document.getElementById(request.status).classList.remove("d-none")
                setslxfile(null)
                
            }
        } 
        setFileVerif(false)
    }

    /* Submit the entered NN file, check if both files are submitted,
         which allows the user to continue the form */
    async function handleNNfile(e){
        URL.revokeObjectURL(nnurl)
        setFileVerif(true)
        sdocContinueOk(false)
        let eventfile = (e.target.files[0])
        setnnfile(eventfile)
        if(eventfile){
            console.log(eventfile)
            const fd = new FormData();
            fd.append("file", eventfile)
            console.log("NN File Read - Sending...")
            const reqslx = await fetch(`${API_BASE_URL}/nnfile`, {method:"POST", body:fd})
            const respslx = await reqslx.json();
            if(!reqslx.ok){
                e.target.value = ""
                setnnfile(null)
                document.getElementById(reqslx.status).classList.remove("d-none")
            }  else {
                console.log(respslx.message)
                setSInputs(respslx.numSIn)
                setBInputs(respslx.numBIn)
                if(respslx.numOut == 0){
                    document.getElementById("noOut").classList.remove("d-none")
                }
                const request = await fetch(`${API_BASE_URL}/continueok`)
                if (request.ok){
                    const response = await request.json();
                    sdocContinueOk(response.message)
                }
            }
        }
        setFileVerif(false)
    } 
    async function getYamlFile() {
        URL.revokeObjectURL(yamlurl)
        if(slxfile){
            const request = await fetch(`${API_BASE_URL}/slxyamlconv`)
            if (request.ok){
                const file = await request.blob()
                const url = URL.createObjectURL(file)
                setyamlurl(url)
            } else{
                console.error(request)
            }
        }
    }

    async function getNNPlot(){
        URL.revokeObjectURL(nnurl);
        if(nnfile){
            const request = await fetch(`${API_BASE_URL}/pltnn`)
            if (request.ok){
                const file = await request.blob()
                const url = URL.createObjectURL(file)
                setyamlurl(url)
            } else{
                console.error(await request.json().detail)
            }
        }
    }
    /* html */
    return (
        <div>
            <h1 className="h3 fw-bold">
                    Simulink Systems
                </h1>

                <p className="fs-5">
                    Provide the Neural Network, and Neural Network Controlled Dynamics Simulink Files.
                </p>

            <form
                id="nfileform"
                className="row justify-content-center g-4 p-2"
                encType="multipart/form-data">
                <div className="row g-4 mt-3">
                    <div className={"col-12 col-lg-6"}>
                        <SlUploadCard
                            title="Neural Network"
                            fileLabel="Model file"
                            file={nnfile}
                            onFileChange={handleNNfile}
                            acceptedFileTypes=".onnx,.nnet,.sherlock,.isherlock,.txt"
                            primaryButtonText="View Network"
                            primaryAction={getNNPlot}
                            secondaryButtonText="Download Network img"
                            secondaryHref={nnurl}
                            showSecondary={!!nnurl}
                        />
                    </div>

                    <div className={"col-12 col-lg-6"}>
                        <SlUploadCard
                            title="Simulink File"
                            fileLabel="Simulink file"
                            file={slxfile}
                            onFileChange={handleSLXEvent}
                            acceptedFileTypes=".slx"
                            primaryButtonText="Convert to YAML"
                            primaryAction={getYamlFile}
                            secondaryButtonText="Download YAML"
                            secondaryHref={yamlurl}
                            showSecondary={!!yamlurl}
                        />
                    </div>
                </div>
            </form>
            <section>
                <div className="aclass alert alert-danger d-none" id="400">
                    <p className="mr-auto">Verify the ONNX block in the SLX file has matching input and output dimensions to the given controller.</p>
                    <button className="ml-auto albutton"
                            onClick={() => document.getElementById("400").classList.add('d-none')}>
                        <strong>×</strong>
                    </button>
                </div>
                <div className="aclass alert alert-danger d-none" id="455">
                    <p className="mr-auto">Could not launch slx file. Please try again later.</p>
                    <button className="ml-auto albutton"
                            onClick={() => document.getElementById("455").classList.add('d-none')}>
                        <strong>×</strong>
                    </button>
                </div>
                <div className="aclass alert alert-danger d-none" id="422">
                    <p className="mr-auto">Server cannot accept neural network. Please try a different file.</p>
                    <button className="ml-auto albutton"
                            onClick={() => document.getElementById("422").classList.add('d-none')}>
                        <strong>×</strong>
                    </button>
                </div>
                <div className="aclass alert alert-warning d-none" id="noOut">
                    <p className="mr-auto">The selected simulink file has no outports on its top level. Without outports, data will be read from the built-in state value. To guarantee the program reads the right values, add outports to the .slx file. If this is intentional, you are free to ignore this warning.</p>
                    <button className="ml-auto albutton"
                            onClick={() => document.getElementById("noOut").classList.add('d-none')}>
                        <strong>×</strong>
                    </button>
                </div>
            </section>
        </div>
    )
}

export default UploadSLX