"""
main.py

FastAPI backend for the AVERINN web interface.

Responsibilities:
- Receives uploaded benchmark files from the React frontend.
- Validates uploaded file types.
- Dynamically generates AVERINN configuration files.
- Executes either nn-averinn.py or nncs-averinn.py.
- Collects generated output files.
- Returns verification results to the frontend as JSON.
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
import json
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from configparser import ConfigParser
import subprocess
import csv
import sys
from tempfile import TemporaryDirectory
import tempfile
# Richard's Simulink backend imports
from contextlib import asynccontextmanager
import simulinkengine as sl
import numpy as np
import onnx
import onnxruntime
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from fastapi.responses import StreamingResponse
import io

import os
os.makedirs("./tmp/", exist_ok=True)

# Allowed file extensions for each upload category.
# Files are validated before being written to disk.
ALLOWED_EXTENSIONS = {
    "network": {
        ".onnx",
        ".nnet",
        ".sherlock",
        ".isherlock"
    },
    "property": {".vnnlib"},
    "dynamics": {".ini"},
    "hybrid_dynamics": {".yaml"}
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global simulink
    global nnpath
    ...
    yield
    try:
        if simulink is not None:
            simulink.close()
    finally:
        if os.path.exists(str(nnpath)):
            os.remove(str(nnpath))
        simulink = None
        nnpath = None

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware,
                   allow_origins=["http://localhost:5173"],
                   allow_methods=["*"],
                   allow_headers=["*"],
                   expose_headers=["*"])


# ==========================================================
# SLX Functions
# ==========================================================

onnxruntime.set_default_logger_severity(3)
# simulink object : simulink engine that runs simulations
simulink = None
#nnpath - path to neural network
nnpath = None
# nninputs - number of inputs to the neural network
nninputs = 0
engine = sl.slEngineHolder()
eng = engine.geteng()

class slxfileOpts(BaseModel):
    """
        Options for slx file
        TODO: replace timePeriod with Start/Stop Time
    """
    stepSize: float
    timePeriod: float
    initialState: list[float] = None
    initialBlock: list[float] = None

def delfile(slx: bool):
    global simulink, nnpath
    if slx:
        if simulink is not None:
            simulink.close()
            simulink = None
    else:
        if nnpath is not None and os.path.exists(str(nnpath)):
            os.remove(str(nnpath))
        nnpath = None

def finishSlxInit(slx: bool):
    """
    Finish the initialization of the SLX file.

    To complete all the way through, both the slx and nn files need to be submitted.
    Only small checks on each individual part are done before this requirement is satisfied:
        SLX: Checks for a single ONNX block
        NN: Verifies validity using ONNX runtime

    After both are initialized, this function:
        Verifies that the SLX file's ONNX block input/output dimensions match the NN
        file's, and sends the size of the InitialState vector back to the frontend.
    """
    global nninputs, simulink, nnpath
    dval = -1 # default return value
    if simulink is None:
        return {"message": "Success: Awaiting Simulink File", "numSIn": dval, "numBIn": dval, "numOut": dval}

    if nnpath is None:
        return {"message": "Success: Awaiting NN File", "numSIn": dval, "numBIn": dval, "numOut": simulink.getNumOut()}

    try:
        actual_inputs = simulink.getnnInputDims()
    except Exception:
        delfile(slx)
        raise HTTPException(status_code=400, detail="Verify Matching Input and Output Dimensions")

    if nninputs != actual_inputs:
        delfile(slx)
        raise HTTPException(
            status_code=400,
            detail=f"Incorrect inputs ({nninputs}, {actual_inputs})"
        )

    try:
        simulink.changeModelNN(nnpath)
    except Exception:
        delfile(slx)
        raise HTTPException(status_code=400, detail="Verify Matching Input and Output Dimensions")

    return {
        "message": "Success: Simulink File Fully Initialized",
        "numSIn": simulink.getNumIn(),
        "numBIn": simulink.getNumBIn(),
        "numOut": simulink.getNumOut(),
    }

"""
Takes in a simulink file and initializes the simulinkengine to be ready to simulate that file.
"""
@app.get("/continueok")
async def continueok():
    return {"message": simulink is not None and nnpath is not None}

@app.get("/reset")
async def reset():
    """
        Refresh Globals
    """
    global simulink
    global nnpath
    global nninputs
    delfile(True)
    delfile(False)
    nninputs = 0

@app.post("/slxfile")
async def read_file(file: UploadFile = File(...)):
    """
        Read SLX file, attempts to finalize initialization, see above:
            def finishSlxInit
    """
    global simulink
    global nnpath
    global eng
    slxpath: str = None
    delfile(True)
    try:
        with open((slxpath := tempfile.NamedTemporaryFile("w+b", dir="./tmp/", suffix=".slx", delete=False).name), 'wb') as f:
            while chunk := await file.read(65536):
                f.write(chunk)
    except:
        raise HTTPException(
            status_code=498,
            detail=f"OS ERROR: Tempfile Error - SLX"
        )
    try:
        simulink = sl.sl(slxpath, eng)
        return finishSlxInit(True)
    except HTTPException:
        delfile(True)
        raise
    except Exception as e:
        delfile(True)
        raise HTTPException(
            status_code=455,
            detail=f"Error Initializing slx File"
        )

"""
/slxFileOpts
Takes in file options and sets the simulink object to use those options
"""
@app.post("/slxfileOpts")
async def read_json(opts: slxfileOpts):
    """
        Read SLX Options, and Simulates the system.
        Returns the results of the simulation, if any
        The simulink system will only return results here if it has outports.
        Displays or other blocks will not generate results.
        attempts to finalize initialization, see above:
            def finishSlxInit
    """
    global simulink
    global nnpath
    global nninputs
    try:
        if simulink is None:
            raise HTTPException(
                status_code=456,
                detail=f"Uninitialized Simulink Object is Attempting to Submit!"
            )
        simulink.params(opts.stepSize, opts.timePeriod, opts.initialState, opts.initialBlock)
        out = simulink.sim()
        di = {}
        ls = []
        plt.clf()
        for i in range(len(out[1])):
            for j in range(len(out[1][i][0])):
                ls.append(f"x{i}_{j}")
            plt.plot(np.transpose(out[0])[0],out[1][i])
            plt.xlabel("Time (s)")
            plt.ylabel("Output")
            plt.title("Simulink Output")


        plt.legend(ls,bbox_to_anchor=(1.05,1))
        for i in range(len(out[0])):
            rs = ""
            for j in range(len(out[1])):
                 rs += np.array2string(out[1][j][i], formatter={'float_kind': lambda x: f"{x:.3f}"}) + ("-=-" if j != simulink.getNumOut() - 1 else "")
                 #rs += str(out[1][j][i]) + ("-=-" if j != simulink.getNumOut() - 1 else "")
            di[np.array2string(out[0][i], formatter={'float_kind': lambda x: f"{x:.1f}"})] = rs
        return di
    except HTTPException:
        raise
    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=457,
            detail=f"Error Simulating SLX File"
        )

@app.get("/slxplt")
def get_plot_base64():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    buf.seek(0)
    plt.clf()
    return StreamingResponse(buf, media_type="image/png")
"""
/slxnnfile
Read_file reads in a neural network file to be processed by the simulink engine.
This currently only supports ONNX Files, so that is what is checked for.
"""

@app.post("/nnfile")
async def read_file(file: UploadFile = File(...)):
    """
        Read neural network file and verify it is a valid ONNX file
        only ONNX formats are supported
    """
    global nnpath
    try:
        #Write to tempfile
        with open((nnpath := tempfile.NamedTemporaryFile("w+b", dir="./tmp/", suffix=".onnx", delete=False).name), 'wb') as f:
            while chunk := await file.read(65536):
                f.write(chunk)
    except:
        #attempt to delete temp file
        delfile(False)
        raise HTTPException(
            status_code=499,
            detail=f"OS ERROR: Tempfile Error - ONNX"
        )
    try:
        # Verify onnx validity
        onnx_model = onnx.load(nnpath)
        onnx.checker.check_model(onnx_model)
        global nninputs
        ort = onnxruntime.InferenceSession(nnpath)
        nninputs = ort.get_inputs()[0].shape[3]
        return finishSlxInit(False)
    except HTTPException:
        delfile(False)
        raise
    except Exception as e:
        delfile(False)
        raise HTTPException(
            status_code=422,
            detail=f"Cannot accept Neural Network"
        )



# ==========================================================
# Helper Functions
# ==========================================================

# Reads the CSV file generated from AVERINN and creates a summary that the
# frontend will use for displaying results to the user.
#
# Only the initial and final sets for each run/loop are returned rather than
# sending the entire CSV contents over the API.
def summarize_csv(csv_path: Path):
    if not csv_path.exists():
        return None

    with open(csv_path, newline="") as file:
        reader = csv.DictReader(file)
        rows = list(reader)

    if not rows:
        return None

    return {
        "row_count": len(rows),
        "columns": reader.fieldnames,
        "initial_set": rows[0],
        "final_set": rows[-1]
    }


# Ensures that uploaded files have the expected extensions before saving them
# to disk or passing to AVERINN.
#
# Additional layer of protection against accidental uploads of unsupported
# files.
def validate_extension(file: UploadFile, allowed_extensions: set[str]):
    filename = file.filename or ""
    filename = filename.lower()

    if not any(filename.endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type for {filename}. Allowed: {', '.join(allowed_extensions)}"
        )


# ==========================================================
# Request Models
# ==========================================================

# Settings expected from the frontend when running a standard NN verification
class NNVerificationSettings(BaseModel):
    probType: str
    absRequired: str
    numOfAbsNodes: int
    technique: str
    lastRelu: str
    absType: str
    partitionType: str
    solverType: str


# Settings expected from the frontend when running NNCS verification
class NNCSVerificationSettings(BaseModel):
    probType: str
    absRequired: str
    numOfAbsNodes: int
    technique: str
    lastRelu: str
    K: int
    absType: str
    partitionType: str
    solverType: str

class HybridVerificationSettings(BaseModel):
    lastRelu: str
    K: int

# ==========================================================
# Configuration Builders
# ==========================================================

# Constructs a temporary nn-config.ini file based on the user's selected
# verification settings and uploaded files.
#
# The resulting ConfigParser object is written to disk immediately before
# launching AVERINN.
def build_nn_config(
        settings: NNVerificationSettings,
        network_path: Path,
        property_path: Path
):

    config = ConfigParser()
    config.optionxform = str

    config["settings"] = {
        "nnformat": '"ONNX"',
        "nnpath": f'"{network_path}"',
        "specpath": f'"{property_path}"',

        "probType": f'"{settings.probType}"',
        "absRequired": f'"{settings.absRequired}"',
        "numOfAbsNodes": str(settings.numOfAbsNodes),
        "technique": f'"{settings.technique}"',
        "lastRelu": f'"{settings.lastRelu}"',
        "absType": f'"{settings.absType}"',
        "partitionType": f'"{settings.partitionType}"',
        "solverType": f'"{settings.solverType}"'
    }

    return config


# Constructs a temporary nncs-config.ini file based on the user's selected
# verification settings and uploaded files.
#
# The resulting ConfigParser object is written to disk immediately before
# launching AVERINN.
def build_nncs_config(
        settings: NNCSVerificationSettings,
        network_path: Path,
        dyn_path: Path,
        property_path: Path
):

    config = ConfigParser()
    config.optionxform = str

    config["settings"] = {
    "nnformat": '"ONNX"',
    "nnpath": f'"{network_path}"',
    "dynpath": f'"{dyn_path}"',
    "specpath": f'"{property_path}"',

    "probType": f'"{settings.probType}"',
    "absRequired": f'"{settings.absRequired}"',
    "numOfAbsNodes": str(settings.numOfAbsNodes),
    "technique": f'"{settings.technique}"',
    "lastRelu": f'"{settings.lastRelu}"',
    "K": str(settings.K),
    "absType": f'"{settings.absType}"',
    "partitionType": f'"{settings.partitionType}"',
    "solverType": f'"{settings.solverType}"'
}

    return config

def build_hybrid_config(
        settings: HybridVerificationSettings
):

    config = ConfigParser()
    config.optionxform = str

    config["settings"] = {
        "lastRelu": f'"{settings.lastRelu}"',
        "K": str(settings.K)
    }

    return config

# ==========================================================
# API Endpoints
# ==========================================================

# ------------------------------------------------------------------
# NNCS Verification Endpoint
#
# Workflow:
#   1. Receive uploaded files and verification settings.
#   2. Validate file types.
#   3. Create a temporary execution directory.
#   4. Generate an AVERINN configuration file.
#   5. Launch nncs-averinn.py.
#   6. Collect output artifacts.
#   7. Return results as JSON.
# ------------------------------------------------------------------
@app.post("/run-nncs-averinn")
async def run_nncs_averinn(
    settings: str = Form(...),
    network_file: UploadFile = File(...),
    property_file: UploadFile = File(...),
    dynamics_file: UploadFile = File(...)
):
    
    # Convert submitted JSON setting into object
    settings_dict = json.loads(settings)
    settings_obj = NNCSVerificationSettings(**settings_dict)

    # Locate the project root and tool script
    project_root = Path(__file__).resolve().parent.parent
    script_path_tool = project_root / "nncs-averinn.py"

    # Rejects attempt to write to disk if uploaded files do not meet
    # required extension types.
    validate_extension(network_file, ALLOWED_EXTENSIONS["network"])
    validate_extension(property_file, ALLOWED_EXTENSIONS["property"])
    validate_extension(dynamics_file, ALLOWED_EXTENSIONS["dynamics"])

    # Each verification run executes inside an isolated temp directory.
    # Prevents concurrent users from overwriting files.
    # TODO: Include a way to let users download results
    with TemporaryDirectory(prefix="averinn_run_") as temp_dir:
        run_dir = Path(temp_dir)

        network_path = run_dir / network_file.filename
        property_path = run_dir / property_file.filename
        dyn_path = run_dir / dynamics_file.filename

        generated_config_path = run_dir / "generated-nncs-config.ini"

        # Save uploaded files into temp workspace
        network_path.write_bytes(await network_file.read())
        dyn_path.write_bytes(await dynamics_file.read())
        property_path.write_bytes(await property_file.read())

        # Build the custom configuration file expected by AVERINN
        generated_config = build_nncs_config(
            settings_obj,
            network_path=network_path,
            dyn_path=dyn_path,
            property_path=property_path
        )

        with open(generated_config_path, "w") as config_file:
            generated_config.write(config_file)

        # Execute AVERINN and capture console output
        completed = subprocess.run(
            [sys.executable, str(script_path_tool), str(generated_config_path)],
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=60
        )

    # Collect all output artifacts generated by AVERINN
    csv_path = project_root / "data.csv"
    log_path = project_root / "log.txt"
    lp_path = project_root / "model.lp"
    sol_path = project_root / "model.sol"

    csv_summary = summarize_csv(csv_path)

    safety_result = None

    # Looks at end of generated log.txt file to extract safety verdict
    if log_path.exists():
        with open(log_path, "r", encoding="utf-8", errors="replace") as file:
            lines = [line.strip() for line in file.readlines() if line.strip()]

        if lines:
            safety_result = lines[-1]

    # Return execution information for frontend display
    return {
        "returncode": completed.returncode,
        "success": completed.returncode == 0,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
        "csv_summary": csv_summary,
        "safety_result": safety_result,
        "files_created": {
            "data_csv": csv_path.exists(),
            "log_txt": log_path.exists(),
            "model_lp": lp_path.exists(),
            "model_sol": sol_path.exists()
        }
    }


# ------------------------------------------------------------------
# Standard Neural Network Verification Endpoint
#
# Workflow:
#   1. Receive uploaded files.
#   2. Validate extensions.
#   3. Generate a temporary configuration file.
#   4. Execute nn-averinn.py.
#   5. Collect generated artifacts.
#   6. Return verification results.
# ------------------------------------------------------------------
@app.post("/run-nn-averinn")
async def run_nn_averinn(
    settings: str = Form(...),
    network_file: UploadFile = File(...),
    property_file: UploadFile = File(...)
):
    # Convert submitted json setting into object
    settings_dict = json.loads(settings)
    settings_obj = NNVerificationSettings(**settings_dict)

    # Locate the project root and tool script
    project_root = Path(__file__).resolve().parent.parent
    script_path_tool = project_root / "nn-averinn.py"

    # Rejects attempt to write to disk if uploaded files do not meet
    # required extension types.
    validate_extension(network_file, ALLOWED_EXTENSIONS["network"])
    validate_extension(property_file, ALLOWED_EXTENSIONS["property"])

    # Each verification run executes inside an isolated temp directory.
    # Prevents concurrent users from overwriting files.
    with TemporaryDirectory(prefix="averinn_run_") as temp_dir:
        run_dir = Path(temp_dir)

        network_path = run_dir / network_file.filename
        property_path = run_dir / property_file.filename

        generated_config_path = run_dir / "generated-nn-config.ini"

        # Save uploaded files into temp workspace
        network_path.write_bytes(await network_file.read())
        property_path.write_bytes(await property_file.read())

        # Build the custom configuration file expected by AVERINN
        generated_config = build_nn_config(
            settings_obj,
            network_path=network_path,
            property_path=property_path
        )

        with open(generated_config_path, "w") as config_file:
            generated_config.write(config_file)

        # Execute AVERINN and capture console output
        completed = subprocess.run(
            [sys.executable, str(script_path_tool), str(generated_config_path)],
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=60
        )

    # Collect all output artifacts generated by AVERINN
    csv_path = project_root / "data.csv"
    log_path = project_root / "log.txt"
    lp_path = project_root / "model.lp"
    sol_path = project_root / "model.sol"

    csv_summary = summarize_csv(csv_path)

    safety_result = None

    # Looks at end of generated log.txt file to extract safety verdict
    if log_path.exists():
        with open(log_path, "r", encoding="utf-8", errors="replace") as file:
            lines = [line.strip() for line in file.readlines() if line.strip()]

        if lines:
            safety_result = lines[-1]

    # Return execution information for frontend display
    return {
        "returncode": completed.returncode,
        "success": completed.returncode == 0,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
        "csv_summary": csv_summary,
        "safety_result": safety_result,
        "files_created": {
            "data_csv": csv_path.exists(),
            "log_txt": log_path.exists(),
            "model_lp": lp_path.exists(),
            "model_sol": sol_path.exists()
        }
    }

@app.post("/run-hybrid-averinn")
async def run_hybrid_averinn(
    settings: str = Form(...),
    network_file: UploadFile = File(...),
    property_file: UploadFile = File(...),
    dynamics_file: UploadFile = File(...)
):
    try:
        # Convert submitted JSON setting into object
        settings_dict = json.loads(settings)
        settings_obj = HybridVerificationSettings(**settings_dict)

        # Locate the project root and tool script
        project_root = Path(__file__).resolve().parent.parent
        script_path_tool = project_root / "AVERINN" / "hybrid-nncs-averinn.py"

        # Rejects attempt to write to disk if uploaded files do not meet
        # required extension types.
        validate_extension(network_file, ALLOWED_EXTENSIONS["network"])
        validate_extension(property_file, ALLOWED_EXTENSIONS["property"])
        validate_extension(dynamics_file, ALLOWED_EXTENSIONS["hybrid_dynamics"])

        # Each verification run executes inside an isolated temp directory.
        # Prevents concurrent users from overwriting files.
        # TODO: Include a way to let users download results
        with TemporaryDirectory(prefix="averinn_run_") as temp_dir:
            run_dir = Path(temp_dir)

            network_path = run_dir / network_file.filename
            property_path = run_dir / property_file.filename
            dyn_path = run_dir / dynamics_file.filename

            generated_config_path = run_dir / "generated-hybrid-config.ini"

            # Save uploaded files into temp workspace
            network_path.write_bytes(await network_file.read())
            dyn_path.write_bytes(await dynamics_file.read())
            property_path.write_bytes(await property_file.read())

            # Build the custom configuration file expected by AVERINN
            generated_config = build_hybrid_config(settings_obj)

            with open(generated_config_path, "w") as config_file:
                generated_config.write(config_file)

            # Execute AVERINN and capture console output
            #
            # hybrid-nncs-averinn.py expects exactly 4 positional args, in this
            # order: <ini config> <yaml hybrid-system file> <nn file> <specfile>
            completed = subprocess.run(
                [
                    sys.executable,
                    str(script_path_tool),
                    str(generated_config_path),
                    str(dyn_path),
                    str(network_path),
                    str(property_path)
                ],
                cwd=project_root,
                capture_output=True,
                text=True,
                timeout=60
            )

        # Collect all output artifacts generated by AVERINN
        csv_path = project_root / "data.csv"
        log_path = project_root / "AVERINN" / "log.txt"
        lp_path = project_root / "model.lp"
        sol_path = project_root / "model.sol"
        log_path = completed.stdout
        csv_summary = summarize_csv(csv_path)
        safety_result = None

        # Looks at end of generated log.txt file to extract safety verdict
        return parse_hybrid_log(log_path.splitlines())
    except Exception as e:
        raise
        # print(e)
        # return {
        #     "success": False,
        # }


def parse_hybrid_log(log_obj):
    iternum = -1
    iterations = {}

    end = 0;
    final_lower = ""
    final_upper = ""
    safety_status = ""
    for line in log_obj:
        if end == 1:
            final_upper = line[7::]
            end = -1
        elif end == 2:
            final_lower = line[7::]
            end -= 1
        if end == -1 and line.startswith("Safety Status: "):
            safety_status = line[15::]
        if end == 0 and line.startswith("Lower: "):
            if iternum != -1:
                iterations[iternum] = [line[7::], None]
        elif end == 0 and line.startswith("Upper: "):
            if iternum != -1:
                low = iterations[iternum][0]
                iterations[iternum] = [low, line[7::]]
            iternum += 1
        if end == 0 and line.startswith("Final X_k"):
            end = 2
    lowiter = []
    highiter = []
    for line in list(iterations.values()):
        lowiter.append(np.fromstring(line[0].strip("[]"), dtype=float, sep=" "))
        highiter.append(np.fromstring(line[0].strip("[]"), dtype=float, sep=" "))
    fl = np.fromstring(final_lower.strip("[]"), dtype=float, sep=" ")
    fu = np.fromstring(final_upper.strip("[]"), dtype=float, sep=" ")
    retlow = [[b.item() for b in a] for a in lowiter]
    retlow.append([b.item() for b in fl])
    rethi = [[b.item() for b in a] for a in highiter]
    rethi.append([b.item() for b in fu])
    return {
        "success": True,
        "lowiter": retlow,
        "highiter": rethi,
        "safety_status": safety_status
    }



