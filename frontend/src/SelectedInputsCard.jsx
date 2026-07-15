import "./SettingsCards.css";

/****************************************************************
 * SelectedInputsCard.jsx
 *
 * Displays a summary of the verification type, selected formats,
 * and uploaded files chosen during the previous steps.
 ****************************************************************/

function SelectedInputsCard({
    verificationType,
    networkFormat,
    networkFile,
    propertyType,
    propertyFile,
    dynamicsFile
}) {
    const verificationTypeLabels = {
        nn: "Neural network property checking",
        nncs: "NN-controlled linear system",
        hybrid: "NN-controlled hybrid system"
    };

    const requiresDynamicsFile =
        verificationType === "nncs" ||
        verificationType === "hybrid";

    const dynamicsFormat =
        verificationType === "hybrid"
            ? "YAML"
            : "INI";

    return (
        <div className="verification-card">
            <h2 className="verification-card-title">
                Selected Inputs
            </h2>

            <SelectedInput
                label="Verification type"
                value={
                    verificationTypeLabels[verificationType] ??
                    "Not selected"
                }
            />

            <SelectedInput
                label="Model format"
                value={networkFormat ?? "Not selected"}
            />

            <SelectedInput
                label="Model file"
                value={networkFile?.name ?? "Not selected"}
            />

            <SelectedInput
                label="Property format"
                value={propertyType ?? "Not selected"}
            />

            <SelectedInput
                label="Property file"
                value={propertyFile?.name ?? "Not selected"}
            />

            {requiresDynamicsFile && (
                <>
                    <SelectedInput
                        label="Dynamics format"
                        value={dynamicsFormat}
                    />

                    <SelectedInput
                        label="Dynamics file"
                        value={dynamicsFile?.name ?? "Not selected"}
                    />
                </>
            )}

            <SelectedInput
                label="Expected output"
                value="SAT / UNSAT / UNKNOWN"
            />
        </div>
    );
}

function SelectedInput({ label, value }) {
    return (
        <div className="selected-input-row">
            <span>{label}</span>
            <span>...........</span>
            <span>{value}</span>
        </div>
    );
}

export default SelectedInputsCard;
