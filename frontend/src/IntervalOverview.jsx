import "./IntervalOverview.css";

/*****************************************************************************
 * IntervalOverview.jsx
 *
 * Displays each state-variable interval history on its own local scale.
 * Each variable receives 15% horizontal padding beyond its minimum and
 * maximum bounds so its interval evolution remains easy to inspect.
 *****************************************************************************/


/** 
 * Renders the complete reachable set overview
 * 
 * Props:
 * - variables: array of state variables and their interval histories for each step
 * - selectedVariable: Name of the variable currently selected by user
 * - onSelectVariable: callback used to update selected variable
*/
function IntervalOverview({
    variables,
    selectedVariable,
    onSelectVariable
}) {
    if (!Array.isArray(variables) || variables.length === 0) {
        return null;
    }

    /*
    * Layout for results section
    */
    return (
        <section className="interval-overview">
            <div className="interval-overview-header">
                <div>
                    <p className="results-section-kicker">
                        Reachability visualization
                    </p>

                    <h2>Reachable Set Evolution</h2>

                    <p className="interval-overview-description">
                        Select a variable to inspect its initial,
                        intermediate, and final reachable bounds.
                    </p>
                </div>
            </div>

            <div className="interval-variable-list">
                {variables.map((variable) => (
                    <IntervalRow
                        key={variable.name}
                        variable={variable}
                        isSelected={
                            selectedVariable === variable.name
                        }
                        onSelect={() =>
                            onSelectVariable(variable.name)
                        }
                    />
                ))}
            </div>
        </section>
    );
}

/**
 * Renders the complete interval history for one state variable
 * 
 * The entire row is a button for use to select
 */
function IntervalRow({
    variable,
    isSelected,
    onSelect
}) {
    const {
        localMinimum,
        localMaximum,
        scaleRange
    } = getLocalScale(variable.history);

    return (
        <button
            type="button"
            className={
                `interval-variable-row ${
                    isSelected
                        ? "interval-variable-row--selected"
                        : ""
                }`
            }
            onClick={onSelect}
            aria-pressed={isSelected}
        >
            <div className="interval-variable-name">
                {variable.name}
            </div>

            <div className="interval-row-content">
                <div
                    className="interval-track"
                    style={{
                        "--set-count": variable.history.length
                    }}
                >
                    {variable.history.map(
                        (interval, position) => (
                            <IntervalMark
                                key={interval.set_index}
                                interval={interval}
                                position={position}
                                totalSets={
                                    variable.history.length
                                }
                                localMinimum={
                                    localMinimum
                                }
                                scaleRange={scaleRange}
                            />
                        )
                    )}
                </div>

                <div className="interval-scale-labels">
                    <span>{formatNumber(localMinimum)}</span>
                    <span>{formatNumber(localMaximum)}</span>
                </div>

                <div className="interval-row-values">
                    {variable.history.map((interval) => (
                        <span key={interval.set_index}>
                            {interval.short_label}:{" "}
                            [{formatNumber(interval.low)},{" "}
                            {formatNumber(interval.high)}]
                        </span>
                    ))}
                </div>
            </div>
        </button>
    );
}


/**
 * Renders each interval per history in a vertical column
 * 
 * Non-zero intervals are displayed as horizontal bars spanning the interval range
 * Zero-width intervals are displayed as a single point
 */
function IntervalMark({
    interval,
    position,
    totalSets,
    localMinimum,
    scaleRange
}) {
    const intervalPosition = getIntervalPosition(
        interval.low,
        interval.high,
        localMinimum,
        scaleRange
    );

    const verticalPosition =
        getVerticalPosition(position, totalSets);

    const setColor =
        getSetColor(position, totalSets);

    const sharedStyle = {
        left: `${intervalPosition.left}%`,
        top: `${verticalPosition}%`,
        "--set-color": setColor
    };

    const tooltip =
        `${interval.label}: ` +
        `[${formatNumber(interval.low)}, ` +
        `${formatNumber(interval.high)}]`;

    /*
    * If interval width is zero, use interval-point dot style
    */
    if (Math.abs(interval.width) < Number.EPSILON) {
        return (
            <div
                className="interval-point"
                style={sharedStyle}
                title={tooltip}
            />
        );
    }

    return (
        <div
            className="interval-range"
            style={{
                ...sharedStyle,
                width: `${intervalPosition.width}%`
            }}
            title={tooltip}
        />
    );
}


/** 
 * Converts an interval's bounds into horizontal percentages
 * 
 * The local percentages are measured from 0-100%.
 */
function getIntervalPosition(
    low,
    high,
    localMinimum,
    scaleRange
) {
    const left =
        ((low - localMinimum) / scaleRange) * 100;

    const width =
        ((high - low) / scaleRange) * 100;

    return {
        left: clamp(left, 0, 100),
        width: clamp(width, 0.75, 100)
    };
}


/**
 * Calculates one variable's local horizontal scale.
 *
 * The scale extends 15% of the observed range beyond both the minimum and
 * maximum. Constant variables receive a small fallback range so their point
 * is still centered and visible.
 */
function getLocalScale(history) {
    const bounds = history.flatMap((interval) => [
        Number(interval.low),
        Number(interval.high)
    ]).filter(Number.isFinite);

    if (bounds.length === 0) {
        return {
            localMinimum: -1,
            localMaximum: 1,
            scaleRange: 2
        };
    }

    const observedMinimum = Math.min(...bounds);
    const observedMaximum = Math.max(...bounds);
    const observedRange = observedMaximum - observedMinimum;

    const padding = observedRange > 0
        ? observedRange * 0.15
        : Math.max(Math.abs(observedMinimum) * 0.20, 0.20);

    const localMinimum = observedMinimum - padding;
    const localMaximum = observedMaximum + padding;

    return {
        localMinimum,
        localMaximum,
        scaleRange: localMaximum - localMinimum
    };
}


/**
 * Calculates the vertical percentage for one history set.
 * 
 * Sets are distributed evenly with an 18% padding above and below
 * consecutive sets
 */
function getVerticalPosition(position, totalSets) {
    if (totalSets <= 1) {
        return 50;
    }

    const top = 18;
    const bottom = 82;

    return (
        top +
        (position / (totalSets - 1)) *
            (bottom - top)
    );
}


/**
 * Control the blue bar used for the interval history
 * 
 * Earlier sets are more muted and then saturation increases
 * for each consecutive step throughout the variable's histories.
 */
function getSetColor(position, totalSets) {
    if (totalSets <= 1) {
        return "hsl(216 70% 45%)";
    }

    const progress =
        position / (totalSets - 1);

    const saturation =
        28 + progress * 52;

    const lightness =
        42 + progress * 10;

    return `hsl(
        216
        ${saturation}%
        ${lightness}%
    )`;
}

/**
 * Restricts values to the provided min/max limits
 */
function clamp(value, minimum, maximum) {
    return Math.min(
        Math.max(value, minimum),
        maximum
    );
}


/** */
function formatNumber(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return "—";
    }

    return Number(
        numericValue.toFixed(3)
    ).toString();
}


export default IntervalOverview;