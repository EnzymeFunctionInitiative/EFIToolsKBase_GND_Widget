/*
A KBase module: EFIToolsKBase_GND_Widget
*/

module EFIToolsKBase_GND_Widget {
    typedef structure {
        string report_name;
        string report_ref;
    } ReportResults;

    /*
        This example function accepts any number of parameters and returns results in a KBaseReport
    */
    funcdef run_GND_Widget(mapping<string,UnspecifiedObject> params) returns (ReportResults output) authentication required;

};
