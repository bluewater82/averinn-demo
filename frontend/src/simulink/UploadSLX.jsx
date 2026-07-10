import "../index.css"

function UploadSLX({setSInputs, setBInputs, sdocContinueOk}){

    /* Submit the entered SLX File, check if both files are submitted,
         which allows the user to continue the form */
    async function handleSLXEvent() {
        const file = document.getElementById("sfile").files[0];
        document.getElementById("sfilelabel").innerText = "Input File: " + file.name
        console.log(file)
        if(file){
            console.log("SLX File Read - Sending...")
            const fd = new FormData();
            fd.append("file", file);
            const request = await fetch("http://127.0.0.1:8000/slxfile", {method:"POST", body:fd});
            const resp = await request.json();
            if(request.ok){
                console.log(resp.message)
                setSInputs(resp.numSIn)
                setBInputs(resp.numBIn)
                if(resp.numOut == 0){
                    document.getElementById("noOut").classList.remove("d-none")
                }
                const creq = await fetch("http://127.0.0.1:8000/continueok")
                if (creq.ok){
                    const response = await creq.json();
                    sdocContinueOk(response.message)
                }
            } else{
                document.getElementById(request.status).classList.remove("d-none")
                document.getElementById("sfile").value = "";
                document.getElementById("sfilelabel").innerText = "Could Not Read File!"
                
            }
        } 
    }

    /* Submit the entered NN file, check if both files are submitted,
         which allows the user to continue the form */
    async function handleNNfile(){
        const nnfile = document.getElementById("nfile").files[0];
        if(nnfile){
            console.log(nnfile)
            document.getElementById("nfilelabel").innerText = "Input File: " + nnfile.name 
            const fd = new FormData();
            fd.append("file", nnfile)
            console.log("NN File Read - Sending...")
            const req = await fetch("http://127.0.0.1:8000/nnfile", {method:"POST", body:fd})
            const resp = await req.json();
            const reqslx = await fetch("http://127.0.0.1:8000/slxnnfile", {method:"POST"})
            const respslx = await reqslx.json();
            if(!req.ok || !reqslx.ok){
                document.getElementById("nfile").value = "";
                document.getElementById("nfilelabel").innerText = "Could Not Read File!" 
                document.getElementById(reqslx.status).classList.remove("d-none")
            }  else {
                console.log(resp.message)
                console.log(respslx.message)
                setSInputs(respslx.numSIn)
                setBInputs(respslx.numBIn)
                if(respslx.numOut == 0){
                    document.getElementById("noOut").classList.remove("d-none")
                }
                const request = await fetch("http://127.0.0.1:8000/continueok")
                if (request.ok){
                    const response = await request.json();
                    sdocContinueOk(response.message)
                }
            }
        }
    } 

    /* html */
    return (
        <div>
            <div className="text-center mb-5">
                <h2 className="h2 fw-bold">Simulink Systems</h2>
                <p className="text-muted">
                    Upload your Neural Network and Simulink model to begin.
                </p>
            </div>

            <form
                id="nfileform"
                className="row justify-content-center g-4 p-2"
                encType="multipart/form-data">
                <div className="col-lg-5">
                    <div className="card shadow-sm upload-card h-100">
                        <div className="card-body text-center">
                            <h4 className="mb-3">Neural Network</h4>
                            <label
                                htmlFor="nfile"
                                id="nfilelabel"
                                className="upload-area mx-5">
                                <h5>Click to Upload</h5>
                                <p className="text-muted mb-0">
                                    .onnx or .txt</p>
                            </label>
                            <input
                                id="nfile"
                                type="file"
                                accept=".txt,.onnx"
                                onChange={handleNNfile}/>
                        </div>
                    </div>
                </div>
                <div className="col-lg-5">
                    <div className="card shadow-sm upload-card h-100">
                        <div className="card-body text-center">
                            <h4 className="mb-3">Simulink Model</h4>
                            <label
                                htmlFor="sfile"
                                id="sfilelabel"
                                className="upload-area mx-5">
                                <h5>Click to Upload</h5>
                                <p className="text-muted mb-0">
                                    .slx</p>
                            </label>
                            <input
                                id="sfile"
                                type="file"
                                accept=".slx"
                                onChange={handleSLXEvent}/>
                        </div>
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