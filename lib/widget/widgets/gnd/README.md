# GND Widget Documentation

## Overview

This widget is responsible for filling out the dynamically generated information about each GND on the frontend. It replaces the role of the PHP in the old implementation by working at the same endpoint as the actual GND, using the SQLite file's metadata and query parameters as input, returning a large JSON object of GND metadata as output. The frontend can then use Jinja2 templating syntax to use these variables in headers, dropdowns, buttons, as part of conditional statements in the HTML and JS, etc.

> **IMPORTANT:**  Throughout this class, many functions, instead of returning `True` or `False`, return `"true"` and `"false"`. This is a less-than-ideal workaround that stems from the fact that JavaScript and Python types Booleans slightly differently. This workaround allows types Booleans as string literals, which allows for their uses in JavaScript functions and templating syntax, but affects readability and introduces some semantic complexity.

## Methods

```python
def __init__(self, params: Dict[str, str]) -> None:
```

- **Description**: Initializes the widget parameters object.
- **Parameters**:
  - `params`: A dictionary of input parameters.
- **Notes**: 
  - Sets up internal variables and parameters (P dictionary).
  - Determines job type and sets related flags.
  - Initializes database connection parameters.

```python
def fetch_data(self, query: str, params: Optional[Tuple] = None) -> List[Tuple]:
```

- **Description**: Executes a SQL query and returns the results, with caching.
- **Parameters**:
  - `query`: SQL query string to execute.
  - `params`: Optional tuple of parameters for the query.
- **Returns**: List of tuples containing query results.
- **Notes**: 
  - Implements a caching mechanism to optimize repeated queries.
  - Uses a context manager for database connections.

```python
def check_table_exists(self, table_name: str) -> str:
```

- **Description**: Checks if a table exists in the database.
- **Parameters**:
  - `table_name`: Name of the table to check.
- **Returns**: "true" if the table exists, "false" otherwise.

```python
def check_has_unmatched_ids(self) -> str:
```

- **Description**: Checks if there are any unmatched IDs in the database.
- **Returns**: "true" if unmatched IDs exist, "false" otherwise.
- **Notes**: 
  - First checks if the 'unmatched' table exists.
  - If it exists, checks that there is at least one entry in the table.

```python
def get_ids_from_accessions(self) -> List[str]:
```
- **Description**: Retrieves a list of accession IDs from the 'attributes' table.
- **Returns**: List of accession IDs as strings.
- **Notes**: Fetches all accessions and orders them alphabetically.

```python
def get_ids_from_match_table(self) -> Dict[str, str]:
```
- **Description**: Retrieves UniProt IDs and their corresponding ID lists from the 'matched' table.
- **Returns**: Dictionary with UniProt IDs as keys and ID lists as values.
- **Notes**: Orders the results by UniProt ID.

```python
def get_uniprot_ids(self) -> Union[List[str], Dict[str, str]]:
```
- **Description**: Retrieves UniProt IDs, either as a list or a dictionary, depending on the database structure.
- **Returns**: Either a list of IDs or a dictionary of ID mappings.
- **Notes**: 
  - If 'matched' table doesn't exist, returns a list of accessions.
  - Otherwise, returns a dictionary from the 'matched' table.

```python
def retrieve_info(self) -> Dict[str, Any]:
```
- **Description**: Retrieves and processes various metadata and configuration information.
- **Returns**: Dictionary containing processed parameters and metadata.
- **Notes**: 
  - Sets header and window title fields.
  - Sets modal text for different popups depending on metadata from the SQLite file.
  - Adds additional information to the query string that is used to hit the /data endpoint. Gives the data widget all the necessary context regarding the diagram it is processing so it knows exactly what to return.