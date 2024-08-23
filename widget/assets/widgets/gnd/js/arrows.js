
var DM_COORDS = 1;
var DM_INDEX = 2;

var ARROW_ADD_PAGE = 0;
var ARROW_RESET_REFRESH = 1;
var ARROW_REFRESH = 2;
var DEFAULT_PAGE_SIZE = 20;
var NB_WINDOW = 90;
var SCALE_FACTOR = 91;
var DEFAULT_SCALE_FACTOR = 5;


// filterUpdateCb is the callback for updating the UI filter checkboxes, when we CTRL+click to add a family filter.
function ArrowDiagram(canvasId, displayModeCbId, canvasContainerId, popupIds, numDiagramsPerPage) {

    this.canvasId = canvasId;
    this.canvasContainerId = canvasContainerId;
    this.popupIds = popupIds;

    this.displayMode = DM_COORDS;
    this.diagramHeight = 70;
    this.padding = 10;
    this.S = Snap("#" + this.canvasId);
    this.fontHeight = 15;
    this.arrowHeight = 15;
    this.pointerWidth = 5;
    this.axisThickness = 1;
    this.axisBuffer = 2;
    this.colors = getColors();
    this.axisColor = "black";
    this.selectedGeneColor = "red";
    this.pfamColorMap = {};
    this.pfamColorCount = 0;

    this.diagramPage = 0;
    this.diagramCount = 0;
    this.maxDiagrams = 0;
    this.displayedDiagrams = 0;
    this.nbSize = 10;
    this.scaleType = NB_WINDOW;
    this.scaleFactor = DEFAULT_SCALE_FACTOR;

    this.popupElement = $("#" + this.popupIds.ParentId);

    this.arrowMap = {};
    this.pfamFilter = {};
    this.pfamList = {};
    this.groupList = [];
    this.legendGroup = undefined;
    this.pageSize = typeof numDiagramsPerPage === 'undefined' ? DEFAULT_PAGE_SIZE : numDiagramsPerPage;

    this.idKeyQueryString = ""; 

    var container = document.getElementById(this.canvasContainerId);
    this.initialWidth = container.getBoundingClientRect().width + this.padding * 2;

    this.S.attr({viewBox: "0 0 " + this.initialWidth + " " + this.diagramHeight});

    var that = this;
    $("#" + this.popupIds.CopyId).click(function(ev) {
        if (typeof that.selInfoBoxArrow !== 'undefined' && that.selInfoBoxArrow !== false)
            copyTextToClipboard(getInfoText(that.selInfoBoxArrow));
    });
}

ArrowDiagram.prototype.setUiFilterUpdateCb = function(callback) {
    this.filterUpdateCb = callback;
}

ArrowDiagram.prototype.nextPage = function(callback, pageSize = 0) {
    this.diagramPage++;
    this.retrieveArrowData(this.idList, true, ARROW_ADD_PAGE, callback, this.pageSize);
}

ArrowDiagram.prototype.refreshCanvas = function(usePaging, callback) {
    this.retrieveArrowData(this.idList, usePaging, ARROW_REFRESH, callback, this.pageSize);
}

ArrowDiagram.prototype.searchArrows = function(usePaging, callback) {
    this.retrieveArrowData(this.idList, usePaging, ARROW_RESET_REFRESH, callback, this.pageSize);
}

ArrowDiagram.prototype.retrieveArrowData = function(idList, usePaging, canvasAction, callback, pageSize) {
    if (typeof idList !== 'undefined')
        this.idList = idList;

    var resetCanvas = typeof canvasAction === 'undefined' ? false : (canvasAction == ARROW_REFRESH || canvasAction == ARROW_RESET_REFRESH);
    if (canvasAction == ARROW_RESET_REFRESH)
        this.diagramPage = 0;

    if (typeof this.idList !== 'undefined' && this.idList.length > 0) {
        var idListQuery = this.idList.replace(/\n/g, " ").replace(/\r/g, " ");
        var that = this;

        usePaging = typeof usePaging === 'undefined' ? false : usePaging;
        var pageString = "";
        if (usePaging) {
            if (canvasAction == ARROW_REFRESH)
                pageString = "&page=0-" + this.diagramPage;
            else 
                pageString = "&page=" + this.diagramPage;
            pageString += "&pagesize=" + pageSize;
        }
        var scaleString = "";
        scaleString = "&window=" + this.nbSize;
        if (this.scaleType == SCALE_FACTOR)
            scaleString += "&scale-factor=" + this.scaleFactor;

        var theUrl = "get_neighbor_data.php?" + this.idKeyQueryString + "&query=" + idListQuery + pageString + scaleString;
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", theUrl, true);
        xmlhttp.onload = function() {
            if (this.readyState == 4 && this.status == 200) {
                var data = null;
                var isError = false;
                try {
                    data = JSON.parse(this.responseText);
                } catch (e) {
                    isError = true;
                }
                var eod = false;
                if (data !== null) {
                    that.makeArrowDiagram(data, usePaging, resetCanvas, callback);
                    that.data = data;
                    eod = data.eod;
                } else {
                    typeof callback === 'function' && callback(eod, true);
                    that.data = {'data': []};
                }
            }
        };
        xmlhttp.send(null);
    }
}

ArrowDiagram.prototype.retrieveFamilyData = function(callback) {
    var that = this;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "get_neighbor_data.php?" + this.idKeyQueryString + "&fams=1", true);
    xmlhttp.onload = function() {
        if (this.readyState == 4 && this.status == 200) {
            var data = JSON.parse(this.responseText);
            that.families = data.families;
            typeof callback === 'function' && callback(that.families);
        }
    };
    xmlhttp.send(null);
}

ArrowDiagram.prototype.clearFamilyData = function() {
    this.pfamList = {};
}

ArrowDiagram.prototype.hasFamilyData = function() {
    return typeof this.families !== 'undefined';
}

ArrowDiagram.prototype.getFamilies = function(sortById) {
    var fams = [];
    var keys = Object.keys(this.pfamList);
    for (var fi = 0; fi < keys.length; fi++) {
        var famId = keys[fi];
        var famName = "";
        if (famId == "none")
            famName = "None";
        else
            famName = this.pfamList[famId];

        var isChecked = typeof this.pfamFilter[famId] !== 'undefined';
        fams.push({'id': famId, 'name': famName, 'checked': isChecked});
    }

    if (sortById)
        fams.sort(function(a, b) { return a.id.localeCompare(b.id); });
    else
        fams.sort(function(a, b) { return a.name.localeCompare(b.name); });

    return fams;
}

ArrowDiagram.prototype.getPfamColor = function(pfam) {
    if (pfam in this.pfamColorMap) {
        return this.pfamColorMap[pfam];
    } else {
        return "transparent";
    }
}

ArrowDiagram.prototype.makeArrowDiagram = function(data, usePaging, resetCanvas, callback) {
    canvas = document.getElementById(this.canvasId);
    
    //var drawingWidth = canvas.getBoundingClientRect().width - this.padding * 2;
    if (!usePaging || resetCanvas) {
        while (canvas.hasChildNodes()) {
            canvas.removeChild(canvas.lastChild);
        }
        document.getElementById(this.canvasId).setAttribute("style","height:" + this.diagramHeight + "px");
        this.S.attr({viewBox: "0 0 " + this.initialWidth + " 70"});
    }

    this.maxDiagrams = data.counts.max;
    this.displayedDiagrams = data.counts.displayed;
    this.scaleFactor = data.scale_factor;

    var drawingWidth = this.initialWidth - this.padding * 2;

    var i = usePaging && !resetCanvas ? this.diagramCount : 0;

    var arrowUi = this;
    function finishDrawing() {
        var extraPadding = 60; // for popup for last one
        var ypos = arrowUi.diagramCount * arrowUi.diagramHeight + arrowUi.padding * 2 + arrowUi.fontHeight;
        arrowUi.S.attr({viewBox: "0 0 " + arrowUi.initialWidth + " " + ypos});
        document.getElementById(arrowUi.canvasId).setAttribute("style","height:" + (ypos + arrowUi.diagramHeight + arrowUi.padding + extraPadding) + "px");
    }
    
    var chunkSize = 10; // we effectively disable this here, since we're going to do batch retrievals instead of batch drawing.
    var chunkIndex = 0;
    function batchDraw() {
        var cs = chunkSize;
        while (cs-- && chunkIndex < data.data.length) {
            arrowUi.drawDiagram(canvas, i, data.data[chunkIndex], drawingWidth);
            i++;
            chunkIndex++;
        }
        if (chunkIndex < data.data.length) {
            arrowUi.diagramCount = i;
            finishDrawing();
            setTimeout(batchDraw, 1);
        } else {
            arrowUi.diagramCount = i;
            finishDrawing();
            arrowUi.drawLegendLine(canvas, arrowUi.diagramCount, data, drawingWidth);
            arrowUi.scaleType = SCALE_FACTOR;
            typeof callback === 'function' && callback(data.eod, false);
        }
    }
    batchDraw();
}

ArrowDiagram.prototype.drawLegendLine = function(canvas, index, data, drawingWidth) {
    if (this.legendGroup)
        this.legendGroup.remove();

    var ypos = index * this.diagramHeight + this.padding + this.fontHeight;

    var legendScale = data["legend_scale"]; // This comes in base-pair units, whereas the GUI displays things in terms of AA position.
    var l1 = Math.log10(legendScale);
    var l2 = Math.ceil(l1) - 2;
    var legendLength = Math.pow(10, l2); // In AA
    var legendBp = legendLength * 3;
    var legendScaleFactor = drawingWidth / legendScale;
    var lineLength = legendBp * legendScaleFactor;
    var legendText = legendLength * 3 / 1000;

    //var minBp = data["min_pct"];
    //var maxBp = data["max_pct"];
    //var legendScale = drawingWidth / (maxBp - minBp); //drawingWidth / data["legend_scale"];
    //var legendBp = 1; //0.20; //1400 * legendScale;

//  //  var legendBp = (maxBp - minBp) / 100;
    ////var legendBp = drawingWidth / (maxBp - minBp);
//  //  var legendScale = data["legend_scale"];
    //var lineLength = legendScale * legendBp; //legendBp * legendBp * 100; //legendScale * 100;
    //console.log(lineLength);
    //var bpWidth = data["max_bp"] - data["min_bp"];
    //var legendScale = Math.abs(Math.floor(bpWidth * legendBp));

    var group = this.S.paper.group();

    group.line(this.padding, ypos, this.padding + lineLength, ypos)
        .attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness });
    group.line(this.padding, ypos - 5, this.padding, ypos + 5)
        .attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness });
    group.line(this.padding + lineLength, ypos - 5, this.padding + lineLength, ypos + 5)
        .attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness });

    var textYpos = index * this.diagramHeight + this.fontHeight;
    var textObj = group.text(this.padding, textYpos, "Scale:");
    textObj.attr({'style':'diagram-title'});
    
    var textYpos = index * this.diagramHeight + this.fontHeight * 2;
    textObj = group.text(this.padding + lineLength + 10, textYpos, legendText + " kbp");
    textObj.attr({'style':'diagram-title'});
    
    this.legendGroup = group;
}

// Draw a diagram for a single arrow
ArrowDiagram.prototype.drawDiagram = function(canvas, index, data, drawingWidth) {
    var ypos = index * this.diagramHeight + this.padding * 2 + this.fontHeight;

    // Orient the query arrows in the same direction (flip the diagram)
    var orientSameDir = true;

    var indexGeneWidth = 1 / 21;
    var geneXpos = 0,
        geneWidth = indexGeneWidth,
        geneXoffset = 0;
    var isComplement = data.attributes.direction == "complement";
    if (this.displayMode == DM_COORDS) {
        geneXpos = parseFloat(data.attributes.rel_start);
        geneWidth = parseFloat(data.attributes.rel_width);
    } else {
        var refGeneXpos = (isComplement ? 11 : 10);
        geneXpos = refGeneXpos * indexGeneWidth;
        geneXoffset = data.attributes.num - 10; 
    }

    var minXpct = 1.1, maxXpct = -0.1;

    var group = this.S.paper.group();

    var attrData = makeStruct(data.attributes);
    this.assignColor(attrData, true);

    // Always face to the right which is why isComplement isn't provided, rather false is given in this call.
    var arrow = this.drawArrow(group, geneXpos, ypos, geneWidth, orientSameDir ? false : isComplement,
                               drawingWidth, attrData);

    for (var i = 0; i < attrData.family.length; i++) {
        var theFam = attrData.family[i];
        if (!(theFam in this.arrowMap))
            this.arrowMap[theFam] = [];
        this.arrowMap[theFam].push(arrow);
        this.pfamList[theFam] = attrData.family_desc[i];
        this.pfamColorMap[theFam] = attrData.color[i];
    }
//    this.pfamList[attrData.family.join("-")] = attrData.family_desc;
    this.pfamColorMap[attrData.family[0]] = this.selectedGeneColor;

    var isBound = attrData.is_bound;
    minXpct = (geneXpos < minXpct) ? geneXpos : minXpct;
    maxXpct = (geneXpos+geneWidth > maxXpct) ? geneXpos+geneWidth : maxXpct;

    var max_start = 0;
    for (var i = 0; i < data.neighbors.length; i++) {
        var N = data.neighbors[i];
        var neighborXpos = 0;
        var neighborWidth = indexGeneWidth;
        var nIsComplement = N.direction == "complement";

        if (this.displayMode == DM_COORDS) {
            neighborXpos = parseFloat(N.rel_start);
            neighborWidth = parseFloat(N.rel_width);
            if (orientSameDir && isComplement) {
                nIsComplement = !nIsComplement;
                neighborXpos = 1.0 - neighborXpos - neighborWidth + geneWidth;
            }
        } else {
            neighborXpos = (parseInt(N.num) - geneXoffset) * indexGeneWidth;
            if (nIsComplement)
                neighborXpos += indexGeneWidth;
        }
        minXpct = (neighborXpos < minXpct) ? neighborXpos : minXpct;
        maxXpct = (neighborXpos+neighborWidth > maxXpct) ? neighborXpos+neighborWidth : maxXpct;

        var attrData = makeStruct(N);
        this.assignColor(attrData, false);

//        if (neighborXpos < minBp)
//            minBp = neighborXpos;
//        if (neighborXpos + neighborWidth > maxBp)
//            maxBp = neighborXpos + neighborWidth;
        arrow = this.drawArrow(group, neighborXpos, ypos, neighborWidth, nIsComplement, drawingWidth, attrData);

        for (var famIdx in attrData.family) {
            var fam = attrData.family[famIdx];
            if (!(fam in this.arrowMap))
                this.arrowMap[fam] = [];
            this.arrowMap[fam].push(arrow);
            this.pfamList[fam] = attrData.family_desc[famIdx];
        }
//        this.pfamList[attrData.family.join("-")] = attrData.family_desc;
        
        if (i == 0)
            max_start = N.start;
        else
            max_stop = N.stop;
    }
    
    this.drawAxis(group, ypos, drawingWidth, minXpct, maxXpct, isBound, isComplement);

    data.attributes.max_start = max_start;
    //data.attributes.max_stop = max_stop;
    this.drawTitle(group, index * this.diagramHeight + this.fontHeight - 2, data.attributes);

    this.groupList.push(group);
}

function getDefaultOrder(start, numElements) {
    var order = [];
    for (var i = start; i < start+numElements; i++) {
        order.push(i);
    }
    return order;
}

function makeStruct(data) {
    struct = {
        "accession": data.accession,
        "family": data.family,
        "ipro_family": data.ipro_family,
        "id": data.id,
        "gene_direction": data.direction,
        "seq_len": data.seq_len,
        "start": data.start,
        "stop": data.stop,
        "num": data.num,
        "anno_status": data.anno_status,
        "family_desc": data.family_desc,
        "ipro_family_desc": data.ipro_family_desc,
        "desc": data.desc,
    };

    if (!struct.family)
        struct.family = [""];
    
    if (data.hasOwnProperty("cluster_num"))
        struct.cluster_num = data.cluster_num;

    if (data.hasOwnProperty("evalue"))
        struct.evalue = data.evalue;
    
    if (data.hasOwnProperty("is_bound"))
        struct.is_bound = data.is_bound;
    else
        struct.is_bound = 0;

    if (data.hasOwnProperty("strain"))
        struct.strain = data.strain;

    if (data.hasOwnProperty("color") && data.color)
        struct.color = data.color;
    else
        struct.color = [];

    return struct;
}

ArrowDiagram.prototype.drawAxis = function(svgContainer, ypos, drawingWidth, minXpct, maxXpct, isBound, isComplement) {
    ypos = ypos + this.axisThickness - 1;
    // A single line, full width:
    //svgContainer.line(this.padding, ypos, this.padding + drawingWidth, ypos).attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness });
    svgContainer.line(this.padding + minXpct * drawingWidth - 3, ypos,
                      this.padding + maxXpct * drawingWidth + 3, ypos)
        .attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness });
    
    if (isBound & 1) { // end of contig on left
        var xc = isComplement ? maxXpct * drawingWidth + 3 :
                                minXpct * drawingWidth - 3;
        svgContainer.line(this.padding + xc, ypos - 5,
                          this.padding + xc, ypos + 5)
        //svgContainer.line(this.padding + minXpct * drawingWidth - 3, ypos - 5,
        //                  this.padding + minXpct * drawingWidth - 3, ypos + 5)
            .attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness });
    } else if (minXpct > 0) {
        var x1 = isComplement ? maxXpct * drawingWidth + 3 :
                                0;
        var x2 = isComplement ? drawingWidth :
                                minXpct * drawingWidth - 3;
        svgContainer.line(this.padding + x1, ypos,
                          this.padding + x2, ypos)
        //svgContainer.line(this.padding, ypos,
        //                  this.padding + minXpct * drawingWidth - 3, ypos)
            .attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness, 'stroke-dasharray': '2px, 4px' });
    }
    
    if (isBound & 2) { // end of contig on right
        var xc = isComplement ? minXpct * drawingWidth - 3 :
                                maxXpct * drawingWidth + 3;
        svgContainer.line(this.padding + xc, ypos - 5,
                          this.padding + xc, ypos + 5)
        //svgContainer.line(this.padding + maxXpct * drawingWidth + 3, ypos - 5,
        //                  this.padding + maxXpct * drawingWidth + 3, ypos + 5)
            .attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness });
    } else if (minXpct > 0) {
        var x1 = isComplement ? 0 :
                                maxXpct * drawingWidth + 3;
        var x2 = isComplement ? minXpct * drawingWidth - 3 :
                                drawingWidth;
        svgContainer.line(this.padding + x1, ypos,
                          this.padding + x2, ypos)
        //svgContainer.line(this.padding + maxXpct * drawingWidth + 3, ypos,
        //                  this.padding + drawingWidth, ypos)
            .attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness, 'stroke-dasharray': '2px, 4px' });
    }
}

ArrowDiagram.prototype.drawTitle = function(svgContainer, ypos, data) {
    var title = "";
    if (data.hasOwnProperty("accession"))
        title = title + "Query UniProt ID: " + data.accession + "; ";
    if (data.hasOwnProperty("organism"))
        title = title + data.organism + "; ";
    if (data.hasOwnProperty("taxon_id"))
        title = title + "NCBI Taxon ID: " + data.taxon_id;
    if (data.hasOwnProperty("id"))
        title = title + "; ENA ID: " + data.id;
    if (data.hasOwnProperty("cluster_num"))
        title = title + "; Cluster: " + data.cluster_num;
    if (data.hasOwnProperty("evalue"))
        title = title + "; E-Value: " + data.evalue;
//    if (title.length == 0)
//        title = data.strain + " [global width = " + (data.max_stop - data.max_start) + "]";
//    if (data.hasOwnProperty("evalue") && data.evalue >= 0)
//        title = title + "; e-value: " + data.evalue;
//    if (data.hasOwnProperty("pid") && data.pid >= 0)
//        title = title + "; %ID: " + data.pid;
    if (title.length > 0) {
        var textObj = svgContainer.text(this.padding, ypos, title);
        //textObj.attr({'font-size':12});
        textObj.attr({'style':'diagram-title'});
    }
}

// xpos is in percent (0-1)
// ypos is in pixels from top
// width is in percent (0-1)
// drawingWidth is in pixels and is the area of the canvas in which we can draw (need to add padding to it to get proper coordinate)
ArrowDiagram.prototype.drawArrow = function(svgContainer, xpos, ypos, width, isComplement, drawingWidth, attrData) {
    // Upper left and right of rect. portion of arrow
    coords = [];
    llx = lrx = urx = ulx = px = 0;
    lly = lry = ury = uly = py = 0;

    if (!isComplement) {
        // lower left of rect. portion
        llx = this.padding + xpos * drawingWidth;
        lly = ypos - this.axisThickness - this.axisBuffer;
        // lower right of rect. portion
        lrx = this.padding + (xpos + width) * drawingWidth - this.pointerWidth;
        lry = lly;
        // pointer of arrow, facing right
        px = this.padding + (xpos + width) * drawingWidth;
        py = ypos - this.axisThickness - this.axisBuffer - this.arrowHeight / 2;
        // upper right of rect. portion
        urx = lrx; //this.padding + (xpos + width) * drawingWidth - this.pointerWidth;
        ury = ypos - this.arrowHeight - this.axisThickness - this.axisBuffer; 
        // upper left of rect. portion
        ulx = llx; //this.padding + xpos * drawingWidth;
        uly = ury;

        if (llx > lrx) {
            lrx = llx;
            urx = ulx;
        }

        coords = [llx, lly, lrx, lry, px, py, urx, ury, ulx, uly];
    } else { // pointing left
        // pointer of arrow, facing left
        //px = this.padding + (xpos - width) * drawingWidth;
        px = this.padding + xpos * drawingWidth;
        py = ypos + this.axisThickness + this.axisBuffer + this.arrowHeight / 2;
        // lower left of rect. portion
        //llx = this.padding + (xpos - width) * drawingWidth + this.pointerWidth;
        llx = this.padding + xpos * drawingWidth + this.pointerWidth;
        lly = ypos + this.axisThickness + this.axisBuffer + this.arrowHeight;
        // lower right of rect. portion
        //lrx = this.padding + xpos * drawingWidth;
        lrx = this.padding + (xpos + width) * drawingWidth;
        lry = lly;
        // upper right of rect. portion
        urx = lrx; //this.padding + (xpos + width) * drawingWidth - this.pointerWidth;
        ury = ypos + this.axisThickness + this.axisBuffer;
        // upper left of rect. portion
        ulx = llx; //this.padding + xpos * drawingWidth + this.pointerWidth;
        uly = ury;

        if (llx > lrx) {
            llx = lrx;
            ulx = urx;
        }

        coords = [px, py, llx, lly, lrx, lry, urx, ury, ulx, uly];
    }

    // Careful- assigning an array into an SVG object will flatten the array into a string.
    var famParts = attrData.family;

    attrData = Object.assign({}, attrData); // Copy
    attrData.cx = ulx + (urx - ulx) / 2;
    attrData.cy = lly; //py;
    attrData.class = "an-arrow";

    var familyMerged = [];
    for (var i = 0; i < attrData.family.length; i++)
        familyMerged[i] = attrData.family[i] + " (" + attrData.family_desc[i] + ")";
    attrData.family_merged = familyMerged.join(", ");
    attrData.family = attrData.family.join("-"); // Shown on popup
    attrData.family_desc = attrData.family_desc.join("-"); // Shown on popup

    var familyMerged = [];
    for (var i = 0; i < attrData.ipro_family.length; i++)
        familyMerged[i] = attrData.ipro_family[i] + " (" + attrData.ipro_family_desc[i] + ")";
    attrData.ipro_family_merged = familyMerged.join(", ");
    attrData.ipro_family = attrData.ipro_family.join("-"); // Shown on popup
    attrData.ipro_family_desc = attrData.ipro_family_desc.join("-"); // Shown on popup
    attrData.base_family = famParts.length ? famParts[famParts.length-1] : "";

    var arrow = svgContainer.polygon(coords).attr(attrData);

    var that = this;
    var pos = $("#" + this.canvasId).offset();
    var clickEvt = function(ev) {
        if (ev.ctrlKey || ev.altKey) {
            var fams = this.attr("family").split("-");
            var isActive = ev.target.className.baseVal.includes("an-arrow-selected");
            fams.forEach((fam, idx) => {
                if (isActive)
                    that.removePfamFilter(fam);
                else
                    that.addPfamFilter(fam);
                that.filterUpdateCb(fam, isActive);
            });
        } else {
            if (typeof that.selInfoBoxArrow !== typeof undefined && that.selInfoBoxArrow !== false)
                that.selInfoBoxArrow.attr("keep_open", 0);
            arrow.attr("keep_open", 1);
            that.selInfoBoxArrow = arrow;
        }
    };
    var overEvt = function(e) {
        var boxX, boxY;
        var yOffset = that.arrowHeight / 2;
        var bbox = arrow.getBBox();
        var matrix = this.transform().globalMatrix;
        boxX = matrix.x(bbox.cx, bbox.cy + yOffset) + pos.left;
        boxY = matrix.y(bbox.cx, bbox.cy + yOffset) + pos.top;
        that.doPopup(boxX, boxY, true, this);
        if (typeof that.selInfoBoxArrow !== typeof undefined && that.selInfoBoxArrow !== false)
            that.selInfoBoxArrow.attr("keep_open", 0);
    };
    var outEvt = function(e) {
        var attr = arrow.attr("keep_open");
        var attrExists = typeof attr !== typeof undefined && attr !== false;
        if (!attrExists || attr == null || attr != 1) {
            that.doPopup(e.pageX, e.pageY, false, null);
        }
    };

    var subArrows = [];

    if (famParts.length > 1) {
        var arrowWidth = urx - llx;
        var wPct = arrowWidth / famParts.length;

        for (var i = 0; i < famParts.length-1; i++) {
            var colorIndex = i;
            var subData = Object.assign({}, attrData); // Copy
            subData.sub_family = famParts[i];
            subData.fill = attrData.colors[colorIndex];
            subData.fillColor = subData.fill;
            
            var subX1 = llx + wPct * i;
            var subX2 = llx + wPct * (i+1);
            if (isComplement) {
                subX1 = urx - wPct * i;
                subX2 = urx - wPct * (i+1);
            }
            var off1 = off2 = 0;
            if (i > 0) {
                off1 = -2;
                off2 = 4;
            }
            var subCoords = [subX1+off1, lly, subX2-2, lly, subX2+4, ury, subX1+off2, ury];
            var subArrow = svgContainer.polygon(subCoords).attr(subData);
            subArrow.click(clickEvt);
            subArrow.mouseover(overEvt);
            subArrow.mouseout(outEvt);
            subArrows.push(subArrow);
        }
    }

    arrow.click(clickEvt);
    arrow.mouseover(overEvt);
    arrow.mouseout(outEvt);

    // There are filters applied
    if (Object.keys(this.pfamFilter).length > 0) {
        var inFilter = false;
        for (var fam in famParts) {
            inFilter = (famParts[fam] in this.pfamFilter);
            if (inFilter)
                break;
        }

        if (inFilter) {
            arrow.addClass("an-arrow-selected");
            for (var idx in subArrows)
                subArrows[idx].addClass("an-arrow-selected");
        } else {
            arrow.addClass("an-arrow-mute");
            for (var idx in subArrows)
                subArrows[idx].addClass("an-arrow-mute");
        }
    }

    return {arrow: arrow, subArrows: subArrows};
}

ArrowDiagram.prototype.assignColor = function(attrData, isQuery = false) {
    var colors = [];
    for (var i = 0; i < attrData.family.length; i++) {
        var pfam = attrData.family[i];
        var color;
        if (i < attrData.color.length)
            color = attrData.color[i];

        if (color) {
            this.pfamColorMap[pfam] = color;
        } else if (pfam.length > 0) {
            if (pfam in this.pfamColorMap) {
                color = this.pfamColorMap[pfam];
            } else {
                var colorIndex = this.pfamColorCount++ % this.colors.length;
                color = this.colors[colorIndex]; // global color list
                this.pfamColorMap[pfam] = color;
            }
        }

        colors.push(color);
    }
    if (colors.length == 0)
        colors.push("grey");

    // Assign the color for the base polygon
    if (isQuery) {
        attrData.fill = this.selectedGeneColor;
        attrData.fillColor = attrData.fill;
    } else {
        attrData.fill = colors[colors.length-1];
        attrData.fillColor = colors[colors.length-1];
    }

    attrData.colors = colors;
}


ArrowDiagram.prototype.addPfamFilter = function(pfam) {
    this.pfamFilter[pfam] = 1;

    $(".an-arrow").addClass("an-arrow-mute");

    for (pf in this.pfamFilter) {
        for (idx in this.arrowMap[pf]) {
            var arrow = this.arrowMap[pf][idx];
            arrow.arrow.removeClass("an-arrow-mute");
            arrow.arrow.addClass("an-arrow-selected");
            for (subIdx in arrow.subArrows) {
                arrow.subArrows[subIdx].removeClass("an-arrow-mute");
                arrow.subArrows[subIdx].addClass("an-arrow-selected");
            }
        }
    }
}

ArrowDiagram.prototype.removePfamFilter = function(pfam) {
    delete this.pfamFilter[pfam];

    for (idx in this.arrowMap[pfam]) {
        var arrow = this.arrowMap[pfam][idx];
        
        var baseFamily = arrow.arrow.attr("base_family");
        var baseRemove = baseFamily == pfam || !(baseFamily in this.pfamFilter);
        var subRemove = true;

        // Make sure that other pfams on the fusion aren't already in the filter list (only want
        // to remove the highlight if they aren't selected by the user).
        for (subIdx in arrow.subArrows) {
            var subPfam = arrow.subArrows[subIdx].attr("sub_family");
            subRemove = !(subPfam != pfam && subPfam in this.pfamFilter);
        }

        if (baseRemove && subRemove) {
            arrow.arrow.removeClass("an-arrow-selected");
            for (subIdx in arrow.subArrows) {
                arrow.subArrows[subIdx].removeClass("an-arrow-selected");
            }
        }
    }
    
    if (Object.keys(this.pfamFilter).length == 0) {
        $(".an-arrow").removeClass("an-arrow-mute");
    }
}

ArrowDiagram.prototype.showHiddenDiagrams = function() {
    for (var i = 0; i < this.groupList.length; i++) {
        this.groupList.attr({visibility: "visible"});
    }
}

ArrowDiagram.prototype.clearPfamFilters = function() {
    var pfams = Object.keys(this.pfamFilter);
    for (var i = 0; i < pfams.length; i++) {
        this.removePfamFilter(pfams[i]);
    }
    $(".an-arrow-mute").toggleClass("an-arrow-mute");
}

ArrowDiagram.prototype.doPopup = function(xPos, yPos, doShow, data) {
    
    if (doShow) {
        this.popupElement.css({top: yPos, left: xPos});

        var family = data.attr("family");
        if (!family || family.length == 0)
            family = "none";
        var familyDesc = data.attr("family_desc");
        if (!familyDesc || familyDesc.length == 0)
            familyDesc = "none";
        var familyMerged = data.attr("family_merged");
        if (!familyMerged || familyMerged.length == 0)
            familyMerged = "";

        var iproFamily = data.attr("ipro_family");
        if (!iproFamily || iproFamily.length == 0)
            iproFamily = "none";
        var iproFamilyDesc = data.attr("ipro_family_desc");
        if (!iproFamilyDesc || iproFamilyDesc.length == 0)
            iproFamilyDesc = "none";
        var iproFamilyMerged = data.attr("ipro_family_merged");
        if (!iproFamilyMerged || iproFamilyMerged.length == 0)
            iproFamilyMerged = "";

        //    family = family.join("-");
        $("#" + this.popupIds.IdId + " span").text(data.attr("accession"));
        $("#" + this.popupIds.IdId + " a").attr("href", "https://www.uniprot.org/uniprot/" + data.attr("accession"));
        $("#" + this.popupIds.DescId + " span").text(data.attr("desc"));
        $("#" + this.popupIds.SpTrId + " span").text(data.attr("anno_status"));
        $("#" + this.popupIds.SeqLenId + " span").text(data.attr("seq_len") + " AA");
        
        if (familyMerged) {
            if (family == "none")
                $("#" + this.popupIds.FamilyId + " span").text(family);
            else
                $("#" + this.popupIds.FamilyId + " span").text(familyMerged);
            $("#" + this.popupIds.FamilyDescId + " span").hide();
        } else {
            $("#" + this.popupIds.FamilyId + " span").text(family);
            $("#" + this.popupIds.FamilyDescId + " span").text(familyDesc);
            $("#" + this.popupIds.FamilyDescId + " span").show();
        }

        if (iproFamilyMerged) {
            if (iproFamily == "none")
                $("#" + this.popupIds.IproFamilyId + " span").text(iproFamily);
            else
                $("#" + this.popupIds.IproFamilyId + " span").text(iproFamilyMerged);
            $("#" + this.popupIds.IproFamilyDescId + " span").hide();
        } else {
            $("#" + this.popupIds.IproFamilyId + " span").text(iproFamily);
            $("#" + this.popupIds.IproFamilyDescId + " span").text(iproFamilyDesc);
            $("#" + this.popupIds.IproFamilyDescId + " span").show();
        }

        //this.popupElement.show();
        this.popupElement.removeClass("hidden");
    } else {
        //this.popupElement.hide();
        this.popupElement.addClass("hidden");
    }
}

function getInfoText(data) {
    var family = data.attr("family");
    if (!family || family.length == 0)
        family = "none";
    var familyDesc = data.attr("family_desc");
    if (!familyDesc || familyDesc.length == 0)
        familyDesc = "none";
    var familyMerged = data.attr("family_merged");
    if (!familyMerged || familyMerged.length == 0)
        familyMerged = "";
    if (family == "none")
        familyMerged = "none";

    var iproFamily = data.attr("ipro_family");
    if (!iproFamily || iproFamily.length == 0)
        iproFamily = "none";
    var iproFamilyDesc = data.attr("ipro_family_desc");
    if (!iproFamilyDesc || iproFamilyDesc.length == 0)
        iproFamilyDesc = "none";
    var iproFamilyMerged = data.attr("ipro_family_merged");
    if (!iproFamilyMerged || iproFamilyMerged.length == 0)
        iproFamilyMerged = "";
    if (iproFamily == "none")
        iproFamilyMerged = "none";

    var acc = data.attr("accession");
    var desc = data.attr("desc");
    var annoStatus = data.attr("anno_status");
    var seqLen = data.attr("seq_len") + " AA";

    var text =
        "UniProt ID\t" + acc + "\n" +
        "Description\t" + desc + "\n" +
        "Annotation Status\t" + annoStatus + "\n";
    if (familyMerged)
        text += "Pfam\t" + familyMerged + "\n";
    else
        text += "Pfam\t" + family + "\n" + "Pfam Description\t" + familyDesc + "\n";
    if (iproFamilyMerged)
        text += "InterPro\t" + iproFamilyMerged + "\n";
    else
        text += "InterPro\t" + iproFamily + "\n" + "InterPro Desc\t" + iproFamilyDesc + "\n";
    text += "Sequence Length\t" + seqLen + "\n";

    return text;
}

function getColors() {
    var colors = [
/*        //"crimson",
        "bisque",
        "blue",
        "blueviolet",
        "brown",
        "cadetblue",
        "chartreuse",
        "chocolate",
        "coral",
        "cornflowerblue",
        "cyan",
        "darkblue",
        "darkgreen",
        "darkorange",
        "darkslateblue",
        "gold",
        "hotpink",
        "greenyellow",
        "lightskyblue",
        "maroon",
        "olive",
        "purple",
        "sienna",
        "teal",
        "turquoise",
        "violet"
        */
        "Pink",
        "HotPink",
        "DeepPink",
        "PaleVioletRed",
        "Salmon",
        "DarkSalmon",
        "LightCoral",
        "IndianRed",
        "DarkRed",
        "OrangeRed",
        "Tomato",
        "Coral",
        "DarkOrange",
        "Orange",
        "DarkKhaki",
        "Gold",
        "BurlyWood",
        "Tan",
        "RosyBrown",
        "SandyBrown",
        "Goldenrod",
        "DarkGoldenrod",
        "Peru",
        "Chocolate",
        "SaddleBrown",
        "Sienna",
        "Brown",
        "Maroon",
        "DarkOliveGreen",
        "Olive",
        "OliveDrab",
        "YellowGreen",
        "LimeGreen",
        "Lime",
        "LightGreen",
        "DarkSeaGreen",
        "MediumAquamarine",
        "MediumSeaGreen",
        "SeaGreen",
        "Green",
        "DarkGreen",
        "Cyan",
        "Turquoise",
        "LightSeaGreen",
        "CadetBlue",
        "Teal",
        "LightSteelBlue",
        "SkyBlue",
        "DeepSkyBlue",
        "DodgerBlue",
        "CornflowerBlue",
        "SteelBlue",
        "RoyalBlue",
        "Blue",
        "MediumBlue",
        "DarkBlue",
        "Navy",
        "MidnightBlue",
        "Thistle",
        "Plum",
        "Violet",
        "Orchid",
        "Fuchsia",
        "MediumOrchid",
        "MediumPurple",
        "BlueViolet",
        "DarkViolet",
        "DarkOrchid",
        "Purple",
        "Indigo",
        "DarkSlateBlue",
        "SlateBlue",
        "LightSlateGray",
        "DarkSlateGray",
    ];
    return colors;
}

ArrowDiagram.prototype.setJobInfo = function(idKeyQueryString) {
    this.idKeyQueryString = idKeyQueryString; 
}

ArrowDiagram.prototype.getDiagramCounts = function() {
    return [this.displayedDiagrams, this.maxDiagrams];
}

ArrowDiagram.prototype.setNeighborhoodWindow = function(nbSize) {
    this.nbSize = nbSize;
    this.scaleType = NB_WINDOW;
}

ArrowDiagram.prototype.setScaleFactor = function(scaleFactor) {
    this.scaleFactor = scaleFactor;
    this.scaleType = SCALE_FACTOR;
}

ArrowDiagram.prototype.getScaleFactor = function() {
    return this.scaleFactor;
}

ArrowDiagram.prototype.resetScaleFactor = function() {
    this.scaleType = NB_WINDOW;
    this.scaleFactor = DEFAULT_SCALE_FACTOR;
}

ArrowDiagram.prototype.setIdList = function(idList) {
    if (typeof idList !== 'undefined')
        this.idList = idList;
}

function copyTextToClipboard(text) {
    var temp = document.createElement('textarea');
    temp.textContent = text;
    temp.style.position = "fixed";
    document.body.appendChild(temp);
    temp.select();
    try {
        document.execCommand('copy');
    } catch (ex) {
        console.warn("Unable to copy to clipboard: ", ex);
    } finally {
        document.body.removeChild(temp);
    }
}

