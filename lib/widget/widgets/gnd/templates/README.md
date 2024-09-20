# GND Frontend JavaScript Documentation

## Overview

This JavaScript code is responsible for initializing and managing the Genome Neighborhood Diagram (GND) widget on the frontend. It handles user interactions, data fetching, filtering, and visualization of gene diagrams. The code uses jQuery for DOM manipulation and event handling, uses variables to manage state changes, uses information from the GND widget and returns it in many different formats (SVG, PNG, TSV, TXT), and implements various classes for managing different aspects of the widget.

## Main Components

### Document Ready Function

```javascript
$(document).ready(function() {
    // ...
});
```

- **Description**: Initializes the widget when the document is fully loaded.
- **Functionality**:
  - Sets up initial UI state (checkboxes, input fields).
  - Initializes main objects and components.
  - Registers UI event handlers.
  - Sets up tooltips and modals.

### GND Objects Initialization

```javascript
var gndVars = new GndVars();
var gndColor = new GndColor();
var gndRouter = new GndMessageRouter();
var gndHttp = new GndHttp(gndRouter);
// ... (other object initializations)
```

- **Description**: Creates instances of various GND-related classes.
- **Notes**: These objects handle different aspects of the widget's functionality, such as variables, colors, routing, HTTP requests, database operations, filtering, and view management.

### UI Registration

```javascript
ui.registerZoom("#scale-zoom-out-large", "#scale-zoom-out-small", "#scale-zoom-in-small", "#scale-zoom-in-large");
ui.registerShowMoreBtn("#show-more-arrows-button");
// ... (other UI registrations)
```

- **Description**: Registers UI elements with corresponding functionality.
- **Functionality**: Handles zooming, showing more/all arrows, window size updates, filtering, and search operations.

### Event Handlers

```javascript
$("#save-canvas-button").click(function(e) {
    // ... (SVG saving logic)
});

$("#save-canvas-as-png-button").click(function(e) {
    // ... (PNG saving logic)
});

$("#export-gene-graphics-button").click(async function(e) {
    // ... (Gene graphics export logic)
});
```

- **Description**: Defines click event handlers for various buttons.
- **Functionality**: Handles saving the canvas as SVG or PNG, exporting gene graphics data.
- **Notes**: 
  - Save canvas saves the diagrams as an SVG.
  - Save canvas as PNG converts the diagrams from their original SVG format to PNG, but only captures a portion of the results. This is because it has to map the diagrams to a pixel representation.
  - Export gene graphics downloads a tsv file to the user's device that contains all of the information from the diagrams in text form. It works by making another call to the data widget and formatting the data returned. Since the user can interact with the diagrams in various ways, like by zooming in and out of the graph or changing the window size, separate variables capture these state changes and are used in the call to /data. This way, the data in the tsv, reflects what is on the screen at that point in time, regardless of the initial parameters when the page is first loaded.

### Helper Functions

```javascript
function showAlertMsg() {
    // ... (Alert message display logic)
}

function downloadUnmatchedIds(unmatchedIds, downloadName) {
    // ... (Download logic for unmatched IDs)
}

function downloadBlastSeq(blastSeq, downloadName) {
    // ... (Download logic for BLAST sequence)
}

function downloadUniProtIds(uniProtIds, downloadName) {
    // ... (Download logic for UniProt IDs)
}
```

- **Description**: Utility functions for various widget operations.
- **Functionality**: Displays alert messages, handles downloads for unmatched IDs, BLAST sequences, and UniProt IDs.
- **Notes**: 
  - This code converts the information already stored in the variables from the GND widget to text files the user can download.