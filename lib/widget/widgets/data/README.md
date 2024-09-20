# Data Widget Documentation

## Overview

This widget is responsible for reading the requested data from a SQLite file corresponding to the Genome Neighborhood Diagram and returning it as JSON according to several parameters. The function is called by visiting the /data endpoint and including the parameters in the query, upon which the JSON is rendered in HTML. The JSON is then passed to the frontend, where the Javaacript uses its fields to construct the diagrams.

## Methods

```python
def __init__(self, db: str, query_range: str, scale_factor: float, window: int, query: Optional[str], uniref_id: str, id_type: Any, log_file: str):
```

- **Description**: Initializes the GND object with the given parameters.
- **Parameters**:
  - `db`: Path to the SQLite database file.
  - `query_range`: Range of diagrams to query, set by the frontend and is usually 20 diagrams.
  - `scale_factor`: Specifies the level of zoom into the diagrams.
  - `window`: Window size for data retrieval. The number of neighbors on either side of each attribute
  - `query`: Optional query string. Only applicable for the initial call that triggers `get_stats()`
  - `uniref_id`: UniRef ID for specific queries.
  - `id_type`: Type of ID being used, can be uniprot, 90, or 50.
  - `log_file`: Path to the log file for query metrics.
- **Returns**: None

```python
def set_uniref_table_names(self):
```

- **Description**: Sets the names of UniRef-related tables based on the `id_type` and existing tables in the database.
- **Parameters**: None
- **Returns**: None
- **Notes**: 
  - If `id_type` is empty, it checks for the existence of UniRef50 or UniRef90 tables.
  - Sets `UNIREF_CLUSTER_INDEX`, `UNIREF_RANGE`, and `UNIREF_INDEX` global variables.

```python
def error_output(self, message: str) -> None:
```

- **Description**: Sets error information in the output dictionary.
- **Parameters**:
  - `message`: Error message to be stored.
- **Returns**: None
- **Notes**: Sets `message`, `error`, and `eod` fields in the `output` dictionary.

```python
def _ensure_log_file(self):
```

- **Description**: Initializes the log file with a header row.
- **Parameters**: None
- **Returns**: None
- **Notes**: Creates a CSV file with columns for query metrics.

```python
def log_query(self, query, params, exec_time, rows_returned, rows_scanned, index_used):
```

- **Description**: Logs information about an executed query to the log file.
- **Parameters**:
  - `query`: The SQL query string.
  - `params`: Query parameters.
  - `exec_time`: Execution time of the query.
  - `rows_returned`: Number of rows returned by the query.
  - `rows_scanned`: Number of rows scanned during query execution.
  - `index_used`: Information about the index used, if any.
- **Returns**: None
- **Notes**: Calculates scan ratio and appends a new row to the log file.

```python
def _extract_info_from_plan(self, plan):
```

- **Description**: Extracts information from a query execution plan.
- **Parameters**:
  - `plan`: The query execution plan.
- **Returns**: A tuple containing the index used (if any) and the number of rows scanned.
- **Notes**: Parses the plan to determine if an index was used and how many rows were scanned.

```python
def fetch_data(self, query: str, params: Optional[Tuple] = None) -> List[Tuple]:
```

- **Description**: Executes a SQL query and returns the results, with caching and logging.
- **Parameters**:
  - `query`: SQL query string to execute.
  - `params`: Optional tuple of parameters for the query.
- **Returns**: A list of tuples containing the query results.
- **Notes**:
  - Uses caching to store and retrieve query results.
  - Logs query execution details.
  - Extracts and logs information about the query plan.

```python
def check_table_exists(self, table_name: str) -> bool:
```

- **Description**: Checks if a table exists in the database.
- **Parameters**:
  - `table_name`: Name of the table to check.
- **Returns**: Boolean indicating whether the table exists.

```python
def check_column_exists(self, column, table):
```

- **Description**: Checks if a column exists in a specified table.
- **Parameters**:
  - `column`: Name of the column to check.
  - `table`: Name of the table to check in.
- **Returns**: Boolean indicating whether the column exists in the given table.

```python
def is_direct_job(self) -> bool:
```

- **Description**: Determines if the current job is a direct job (including UniRef jobs).
- **Returns**: Boolean indicating whether the job is a direct job.
- **Notes**: 
  - Returns True if:
    - The "metadata" table exists and its type is not "gnn", or
    - `uniref_id` is not empty, or
    - `id_type` is "uniprot"

```python
def is_gnn_job(self) -> bool:
```

- **Description**: Determines if the current job is a GNN (Genome Neighborhood Network) job.
- **Returns**: Boolean indicating whether the job is a GNN job.
- **Notes**: 
  - Checks if the "metadata" table exists and its type is "gnn"

```python
def get_cluster_num_from_query(self) -> int:
```

- **Description**: Retrieves the cluster number based on the query range.
- **Returns**: The cluster number as an integer, or None if not found.
- **Notes**: 
  - Splits the `query_range` into start and end indices
  - Queries the `UNIREF_CLUSTER_INDEX` table to find the matching cluster number
  - Not being used in the most recent version

```python
def get_stats(self) -> None:
```

- **Description**: Retrieves and sets statistical information about the data.
- **Returns**: None
- **Notes**: 
  - This function is triggered by the initial call when a GND is requested, followed by any number of calls with a `query_range` parameter that get the actual diagrams
  - Calculates various statistics including index ranges, base pair ranges, and scale factors
  - Handles both UniRef and non-UniRef cases
  - Populates the `stats` field in the `output` dictionary with calculated values

```python
def get_family_values(self, family_str: str, ipro_family_str: str, family_desc_str: str, ipro_family_desc_str: str) -> Dict[str, List[str]]:
```

- **Description**: Processes and formats family-related values from given strings.
- **Parameters**:
  - `family_str`: String containing family information
  - `ipro_family_str`: String containing IPro family information
  - `family_desc_str`: String containing family descriptions
  - `ipro_family_desc_str`: String containing IPro family descriptions
- **Returns**: Dictionary with lists of family and IPro family values and descriptions
- **Notes**: 
  - Handles special cases like empty strings and "none" values
  - Splits strings into lists based on "-" or ";" separators

```python
def get_attributes(self, idx: int) -> Dict[str, Union[str, int, List[str], float, bool]]:
```

- **Description**: Retrieves and formats attributes for a given index.
- **Parameters**:
  - `idx`: Index for which to retrieve attributes
- **Returns**: Dictionary containing various attributes for the given index
- **Notes**: 
  - Fetches data from the "attributes" table
  - Processes family-related information using `get_family_values`
  - Handles special cases for GNN jobs and UniRef data
  - Includes additional checks for UniRef-specific columns

```python
def get_neighbors(self, n: int, idx: int) -> List[Dict[str, Union[str, int, List[str], float]]]:
```

- **Description**: Retrieves neighbor information for a given index.
- **Parameters**:
  - `n`: Center point for the neighbor range.
  - `idx`: Index for which to retrieve neighbors.
- **Returns**: List of dictionaries containing neighbor information.
- **Notes**: 
  - Fetches data from the "neighbors" table for each attribute.
  - The number of neighbors we want to return depends on the window size around the central point `n`, which is given by the attribute
  - Processes family-related information using `get_family_values`.
  - Formats each neighbor's data into a dictionary.

```python
def is_cluster_child(self, attr: Dict[str, Any]) -> bool:
```

- **Description**: Determines if an attribute set represents a cluster child.
- **Parameters**:
  - `attr`: Dictionary of attributes to check.
- **Returns**: Boolean indicating whether the attribute set represents a cluster child.
- **Notes**: 
  - Checks for UniRef90 and UniRef50 sizes.
  - Returns True if the relevant UniRef size is 0.
  - Helps determine whether or not we should skip rendering a certain diagram in the highest level function

```python
def lowest_nesting_level(self) -> bool:
```

- **Description**: Determines if the current query is at the lowest nesting level. Nesting level determines which diagrams should be displayed.
- **Returns**: Boolean indicating whether at the lowest nesting level.
- **Notes**: 
  - Returns True if `id_type` is "uniprot" or if `id_type` is "90" and `uniref_id` is not empty.

```python
def retrieve_and_process(self) -> None:
```

- **Description**: Main method to retrieve and process data based on job type and parameters.
- **Returns**: None
- **Notes**: 
  - Handles different job types (direct, UniRef).
  - Retrieves attributes and neighbors for each index.
  - Checks nesting level and uniref90, uniref50 sizes to determine if a diagram should be returned to the frontend
  - Sorts data based on UniRef sizes if not at the lowest nesting level.
  - Populates the `data` field in the `output` dictionary.

```python
def compute_rel_coords(self) -> None:
```

- **Description**: Computes relative coordinates for the data visualization, positions of each diagram with respect to the previous ones.
- **Returns**: None
- **Notes**: 
  - Calculates relative start and width for attributes and neighbors.
  - Updates the `output` dictionary with computed values and scales.
  - Handles scaling and offset calculations for proper visualization.

```python
def get_arrow_data(self) -> None:
```

- **Description**: Prepares and processes data for visualization.
- **Returns**: None
- **Notes**: 
  - Calculates the number of queries based on the query range.
  - Updates the `output` dictionary with:
    - `scale_factor`
    - Time information (placeholder values)
    - Counts (max, invalid, displayed)
  - Calls `retrieve_and_process()` to fetch and process the data.
  - Calls `compute_rel_coords()` to calculate relative coordinates for visualization.

```python
def generate_json(self) -> bytes:
```
- **Description**: Generates the final JSON output for the widget.
- **Returns**: JSON data as bytes.
- **Notes**: 
  - Handles two main scenarios:
    1. If `query_range` is empty, it calls `get_stats()`.
    2. Otherwise, it calls `get_arrow_data()`.
  - Catches and handles any exceptions, storing error messages in the output.
  - Calculates and stores the total execution time.
  - Converts the `output` dictionary to JSON format and encodes it as UTF-8.

## Example

Here's an example of how to use the GND class. It is used in a similar way to display the JSON results in HTML at the /data endpoint:

```python
gnd = GND(db="30093.sqlite", query_range="60-79", scale_factor=7.5, window=10, query=None, uniref_id="", id_type=false, log_file="query_log.csv")
json_data = gnd.generate_json()
print(json_data)
```

That class instantiation would be triggered by visiting this endpoint:
`http://localhost:5100/widgets/data?direct-id=30093&key=52eb593c2fed778dcfd6a2cf16d1f5ced3f3f617&window=10&scale-factor=7.5&range=60-79&id-type=false`