import numpy as np
import pandas as pd


def write_reachability_csv(
    lower_bounds,
    upper_bounds,
    elapsed_times,
    output_path="data.csv"
):
    columns = {}

    for step, (lower, upper) in enumerate(
        zip(lower_bounds, upper_bounds)
    ):
        lower = np.asarray(lower).reshape(-1)
        upper = np.asarray(upper).reshape(-1)

        elapsed = elapsed_times[step]

        lower = np.append(lower, elapsed)
        upper = np.append(upper, elapsed)

        columns[f"{step}Low"] = lower
        columns[f"{step}High"] = upper

    dataframe = pd.DataFrame(columns)

    state_count = len(lower_bounds[0])

    dataframe.index = [
        *range(state_count),
        "elapsed_time"
    ]

    dataframe.to_csv(
        output_path,
        index=True
    )