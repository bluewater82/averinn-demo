import NNImage from "./assets/icons/nn.png";
import HybridImage from "./assets/icons/avhybimg.png";
import Cog from "./assets/icons/avwipimg.png";
import LinearUp from "./assets/icons/avlin.png";
import NonLinear from "./assets/icons/avnlin.png";
import SimLink from "./assets/icons/avssimg.png";
import "./VerifTypePanel.css";

/****************************************************************
 * VerifTypePanel.jsx
 *
 * Displays the available verification branches and reports the
 * selected branch to App.jsx.
 ****************************************************************/

function VerifTypePanel({ onSelectType }) {
    return (
        <section className="container my-5">
            <div className="verification-grid">
                <div className="col-md-4">
                    <button
                        className="verif-type-card"
                        onClick={() => onSelectType("nn")}
                    >
                        <img
                            src={NNImage}
                            className="type-icon"
                            alt="Neural Network"
                        />

                        <span>Neural Network</span>
                        <span>Property Checking</span>
                    </button>
                </div>

                <div className="col-md-4">
                    <button
                        className="verif-type-card"
                        onClick={() => onSelectType("nncs")}
                    >
                        <img
                            src={LinearUp}
                            className="type-icon"
                            alt="Linear System"
                        />

                        <span>NN-Controlled</span>
                        <span>Linear System</span>
                    </button>
                </div>

                <div className="col-md-4">
                    <button
                        className="verif-type-card"
                        onClick={() =>
                            onSelectType("nonlinear-system")
                        }
                    >
                        <img
                            src={NonLinear}
                            className="type-icon"
                            alt="Non-Linear System"
                        />

                        <span>NN-Controlled</span>
                        <span>Non-Linear System</span>
                    </button>
                </div>

                <div className="col-md-4">
                    <button
                        className="verif-type-card"
                        onClick={() => onSelectType("hybrid")}
                    >
                        <img
                            src={HybridImage}
                            className="type-icon-enlarge"
                            alt="Hybrid System"
                        />

                        <span>NN-Controlled</span>
                        <span>Hybrid System</span>
                    </button>
                </div>

                <div className="col-md-4">
                    <button
                        className="verif-type-card"
                        onClick={() =>
                            onSelectType("simulink-system")
                        }
                    >
                        <img
                            src={SimLink}
                            className="type-icon"
                            alt="Simulink System"
                        />

                        <span>Simulink Systems</span>
                    </button>
                </div>

                <div className="col-md-4">
                    <button
                        className="verif-type-card"
                        onClick={() => onSelectType("todo-2")}
                    >
                        <img
                            src={Cog}
                            className="type-icon"
                            alt="Future verification type"
                        />

                        <span>TODO 2</span>
                    </button>
                </div>
            </div>
        </section>
    );
}

export default VerifTypePanel;
