import "../UploadCard.css";

function SlUploadCard({
    title,
    fileLabel,
    file,
    onFileChange,
    acceptedFileTypes,
    primaryButtonText,
    primaryAction,
    secondaryButtonText,
    secondaryHref,
    showSecondary
}) {
    function handleFileInput(e) {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            onFileChange(selectedFile);
        }
    }

    return (
        <div className="upload-card">
            <h2 className="upload-card-title">{title}</h2>

            <div className="upload-field">
                <label>{fileLabel}</label>

                <label className="upload-dropzone">
                    <input
                        type="file"
                        accept={acceptedFileTypes}
                        onChange={onFileChange}
                        hidden
                    />

                    <span className="upload-icon">↑</span>

                    <div>
                        {file
                            ? file.name
                            : <strong>Click to upload or drag and drop</strong>}
                    </div>
                </label>
                <div className="small text-muted align-self-center">({acceptedFileTypes})</div>

                
            </div>

            <div className="upload-actions">
                <button type="button" className="btn btn-outline-primary mx-2" onClick={primaryAction}>
                    {primaryButtonText}
                </button>

                <a className="btn btn-outline-primary" href={secondaryHref} hidden={!showSecondary} download="SlxDynamics.yaml">
                    {secondaryButtonText}
                </a>
            </div>
        </div>
    );
}

export default SlUploadCard;