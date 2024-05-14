

function GndDrawableArrow() {
    this.Id = "";
    this.Attr = {}; // Data that comes from the json object
    this.Colors = []; // one color per pfam family.  This is assigned in filter.js (GndFilter)
    this.RelStart = 0;
    this.RelWidth = 0;
    this.IsComplement = false;
    this.IsBound = false;
    this.IsSwissProt = false;
}

function GndDrawableDiagram() {
    this.Query = {}; // GndDrawableArrow
    this.N = []; // list of GndDrawableArrow objects (neighbors)
}

function GndViewData() {
    this.LegendScale = 1;
}


class GndArrowData {
    constructor(struct) {
        this.data = struct;
    }

    attr(attrName) {
        return this.data[attrName];
    }
}


class GndDb {
    constructor(gndColor) {
        this.arrowData = {};
        this.colors = gndColor;
    }

    reset() {
        this.arrowData = {};
    }

    update(start, end, jsonData) {
        var drawables = [];
        var diagramList = jsonData.data;
        
        for (var i = 0; i < diagramList.length; i++) {
            var diagramData = new GndDrawableDiagram();

            var queryRawData = diagramList[i].attributes; 
            var neighborData = diagramList[i].neighbors;
            
            var query = new GndDrawableArrow();
            this.setData(query, queryRawData);
            query.IsBound = queryRawData.is_bound;
            query.Colors = this.colors.assignColor(queryRawData, true);
            this.arrowData[query.Id] = query;
            diagramData.Query = query;

            for (var j = 0; j < neighborData.length; j++) {
                var rawData = neighborData[j];

                var nb = new GndDrawableArrow();
                this.setData(nb, rawData);
                nb.Colors = this.colors.assignColor(rawData, false);

                diagramData.N.push(nb);
                this.arrowData[nb.Id] = nb;
            }

            drawables.push(diagramData);
        }

        return drawables;
    }

    setData(obj, data) { // data is raw data from HTTP
        obj.Attr = data;
        obj.Pfam = data.pfam;
        obj.PfamDesc = data.pfam_desc;
        obj.InterPro = data.interpro;
        obj.InterProDesc = data.interpro_desc;
        obj.PfamMerged = this.mergeFamily(data.pfam, data.pfam_desc);
        obj.InterProMerged = this.mergeFamily(data.interpro, data.interpro_desc);
        obj.Id = data.accession;
        obj.RelStart = data.rel_start;
        obj.RelWidth = data.rel_width;
        obj.IsComplement = data.direction == "complement";
        obj.IsSwissProt = data.anno_status == 1 || data.anno_status == "Reviewed";
    }

    mergeFamily(famList, famDesc) {
        var familyMerged = [];
        for (var i = 0; i < famList.length; i++)
            familyMerged[i] = famList[i] + " (" + famDesc[i] + ")";
        return familyMerged;
    }

    getData(arrowId) {
        // Don't bother with validation because everything is added internally so the data should
        // be consistent.
        return this.arrowData[arrowId];
    }

    getViewData(jsonData) {
        var vd = new GndViewData();
        vd.EndOfData = jsonData.eod;
        vd.LegendScale = jsonData.legend_scale;
        return vd;
    }
}

