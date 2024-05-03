

class GndView {
    constructor(gndRouter, gndDb, gndFilter, gndPopup, svgCanvasId, uniRefSupport) {
        this.db = gndDb;
        this.filter = gndFilter;
        this.gndRouter = gndRouter;
        this.popup = gndPopup;

        // Get jQuery/DOM objects
        this.S = Snap(svgCanvasId);
        this.canvas = $(svgCanvasId);

        // Constant values
        this.defaultDiagramHeight = 70;
        this.padding = 10;
        this.topPadding = 0;
        this.fontHeight = 15;
        this.arrowHeight = 15;
        this.pointerWidth = 5;
        this.axisThickness = 1;
        this.axisBuffer = 2;
        this.titleHeight = 18;
        this.axisColor = "black";
        this.orientSameDir = true; // Orient the query arrows in the same direction (flip the diagram)
        this.legendScale = 3000;
        this.uniRefSupport = uniRefSupport;

        //TODO: figure out why SnapSVG doesn't give the correct width (which is why I'm using DOM).
        var container = document.getElementById(svgCanvasId.substring(1));
        var width = container.getBoundingClientRect().width;
        //TODO: long term, allow resize of window. Currently data is only drawn correctly using the
        // original screen width.
        this.initialWidth = width + this.padding * 2;

        // Variable variables (e.g. num diagrams)
        this.diagramCount = 0;
        this.legendGroup = undefined;
        this.groupList = [];
        this.isEndOfData = false;

        // Handlers, actions
        this.clickHandler = this.getArrowClickHandler();
        this.mouseOverHandler = this.getArrowOverHandler();
        this.mouseOutHandler = this.getArrowOutHandler();
    }



    setLegendScale(legendScale) {
        this.legendScale = legendScale;
    }


    clearCanvas() {
        this.diagramCount = 0;
        this.canvas.empty();
        this.canvas.css({height: this.defaultDiagramHeight + "px"});
        this.S.attr({viewBox: "0 0 " + this.initialWidth + " 70"});
    }


    getDiagramCount() {
        return this.diagramCount;
    }
    getEndOfData() {
        return this.isEndOfData;
    }


    addDiagrams(drawables, viewData) {
        var drawingWidth = this.initialWidth - this.padding * 2;
        var urVer = this.uniRefSupport.getVersion();

        var diagramHeight = this.defaultDiagramHeight;
        var titleHeight = 0;
        var xPadding = this.padding;
        var drawUniRefExpand = this.showUniRefTitleInfo();
        if (drawUniRefExpand) {
            titleHeight = this.titleHeight;
            diagramHeight += titleHeight;
            xPadding *= 2;
            this.topPadding = 50;
        }

        if (this.diagramCount == 0 && drawUniRefExpand) {
            var group = this.S.paper.group();
            var textObj = group.text(0, this.padding*3, "")
                .attr({fontFamily: "FontAwesome", fontSize: "2em"});
            group.text(30, this.padding*2+5, "Click this icon on the diagrams below to open a new window with the sequences contained in the given UniRef cluster.")
                .attr({'class':'diagram-title-uniref-help'});
        }

        // Loop over the input list and call drawDiagram() for each drawable
        for (var i = 0; i < drawables.length; i++) {
            var index = this.diagramCount;
            this.drawDiagram(index, drawables[i], drawingWidth, diagramHeight, titleHeight, xPadding, drawUniRefExpand);
            this.diagramCount++;
        }

        this.setLegendScale(viewData.LegendScale);
        this.drawLegendLine(this.diagramCount, diagramHeight, drawingWidth);
        this.isEndOfData = viewData.EndOfData;
        
        var extraPadding = 60; // for popup for last one
        var ypos = this.diagramCount * diagramHeight + this.padding * 2 + this.fontHeight + this.topPadding;
        this.S.attr({viewBox: "0 0 " + this.initialWidth + " " + ypos});
        this.canvas.css({height: (ypos + diagramHeight + this.padding + extraPadding + this.topPadding) + "px"});
    }


    finishDrawFetched() {
    }

    // Draw a diagram (query + neighbors)
    drawDiagram(index, data, drawingWidth, diagramHeight, titleHeight, xPadding, drawUniRefExpand) {
        var ypos = index * diagramHeight + this.padding * 2 + this.fontHeight + titleHeight + this.topPadding;
        var geneXpos = parseFloat(data.Query.RelStart);
        var geneWidth = parseFloat(data.Query.RelWidth);

        // Create new SVG group.  All elements that are part of this diagram (axes, neighbors, etc) are 
        // included in this group.
        var group = this.S.paper.group();

        // Always face to the right which is why isComplement isn't provided, rather false is given in this call.
        var queryIsComplement = this.orientSameDir ? false : data.Query.IsComplement;
        var arrow = this.drawArrow(group, geneXpos, ypos, geneWidth, xPadding, queryIsComplement, drawingWidth, data.Query);
        this.filter.addArrow(arrow, data.Query, index);

        var minXpct = 1.1, maxXpct = -0.1;
        minXpct = (geneXpos < minXpct) ? geneXpos : minXpct;
        maxXpct = (geneXpos+geneWidth > maxXpct) ? geneXpos+geneWidth : maxXpct;

        for (var i = 0; i < data.N.length; i++) {
            var N = data.N[i];

            var nIsComplement = N.IsComplement;
            var neighborXpos = parseFloat(N.RelStart);
            var neighborWidth = parseFloat(N.RelWidth);

            if (this.orientSameDir && data.Query.IsComplement) {
                nIsComplement = !nIsComplement;
                neighborXpos = 1.0 - neighborXpos - neighborWidth + geneWidth;
            }

            minXpct = (neighborXpos < minXpct) ? neighborXpos : minXpct;
            maxXpct = (neighborXpos+neighborWidth > maxXpct) ? neighborXpos+neighborWidth : maxXpct;

            var arrow = this.drawArrow(group, neighborXpos, ypos, neighborWidth, xPadding, nIsComplement, drawingWidth, N);
            this.filter.addArrow(arrow, N, index);
        }

        if (drawUniRefExpand) {
            var plusPos = index * diagramHeight + this.fontHeight + 2 + this.topPadding;//+ titleHeight;
            this.drawUniRefExpand(group, plusPos, this.padding, data.Query.Attr);
        }
        this.drawAxis(group, ypos, drawingWidth, xPadding, minXpct, maxXpct, data.Query.IsBound, data.Query.IsComplement);
        var titleYpos = index * diagramHeight + this.fontHeight - 2 + this.topPadding;
        this.drawTitle(group, titleYpos, data.Query.Attr, titleHeight, xPadding);
        this.groupList.push(group);
    }


    // xpos is in percent (0-1)
    // ypos is in pixels from top
    // width is in percent (0-1)
    // drawingWidth is in pixels and is the area of the canvas in which we can draw (need to add padding to it to get proper coordinate)
    drawArrow(svgContainer, xpos, ypos, width, xPadding, isComplement, drawingWidth, attrData) {
        // Upper left and right of rect. portion of arrow
        var coords = [];
        var llx = 0, lrx = 0, urx = 0, ulx = 0, px = 0;
        var lly = 0, lry = 0, ury = 0, uly = 0, py = 0;

        if (!isComplement) {
            // lower left of rect. portion
            llx = xPadding + xpos * drawingWidth;
            lly = ypos - this.axisThickness - this.axisBuffer;
            // lower right of rect. portion
            lrx = xPadding + (xpos + width) * drawingWidth - this.pointerWidth;
            lry = lly;
            // pointer of arrow, facing right
            px = xPadding + (xpos + width) * drawingWidth;
            py = ypos - this.axisThickness - this.axisBuffer - this.arrowHeight / 2;
            // upper right of rect. portion
            urx = lrx; //xPadding + (xpos + width) * drawingWidth - this.pointerWidth;
            ury = ypos - this.arrowHeight - this.axisThickness - this.axisBuffer; 
            // upper left of rect. portion
            ulx = llx; //xPadding + xpos * drawingWidth;
            uly = ury;

            if (llx > lrx) {
                lrx = llx;
                urx = ulx;
            }

            coords = [llx, lly, lrx, lry, px, py, urx, ury, ulx, uly];
        } else { // pointing left
            // pointer of arrow, facing left
            //px = xPadding + (xpos - width) * drawingWidth;
            px = xPadding + xpos * drawingWidth;
            py = ypos + this.axisThickness + this.axisBuffer + this.arrowHeight / 2;
            // lower left of rect. portion
            //llx = xPadding + (xpos - width) * drawingWidth + this.pointerWidth;
            llx = xPadding + xpos * drawingWidth + this.pointerWidth;
            lly = ypos + this.axisThickness + this.axisBuffer + this.arrowHeight;
            // lower right of rect. portion
            //lrx = xPadding + xpos * drawingWidth;
            lrx = xPadding + (xpos + width) * drawingWidth;
            lry = lly;
            // upper right of rect. portion
            urx = lrx; //xPadding + (xpos + width) * drawingWidth - this.pointerWidth;
            ury = ypos + this.axisThickness + this.axisBuffer;
            // upper left of rect. portion
            ulx = llx; //xPadding + xpos * drawingWidth + this.pointerWidth;
            uly = ury;

            if (llx > lrx) {
                llx = lrx;
                ulx = urx;
            }

            coords = [px, py, llx, lly, lrx, lry, urx, ury, ulx, uly];
        }

        // Careful- assigning an array into an SVG object will flatten the array into a string.

        var svgAttr = {};
        svgAttr.cx = ulx + (urx - ulx) / 2;
        svgAttr.cy = lly;
        svgAttr.class = "an-arrow";
        svgAttr.fill = attrData.Colors[attrData.Colors.length-1];
        svgAttr.fillColor = svgAttr.fill;

        var arrow = svgContainer.polygon(coords).attr(svgAttr);
        arrow.attr({"arrow-id": attrData.Id});
        var subArrows = [];
        var that = this;

        // We have to do this ...Handler(e, this, arrow) code below since we want to reference
        // the popup box to the original parent arrow, not the family domain sub-arrows.

        if (attrData.Colors.length > 1) {
            var arrowWidth = urx - llx;
            var wPct = arrowWidth / attrData.Colors.length;

            for (var i = 0; i < attrData.Colors.length-1; i++) {
                var colorIndex = i;
                var subData = {};
                subData.class = "an-arrow";
                subData.fill = attrData.Colors[colorIndex];
                subData.fillColor = subData.fill;

                var subX1 = llx + wPct * i;
                var subX2 = llx + wPct * (i+1);
                if (isComplement) {
                    subX1 = urx - wPct * i;
                    subX2 = urx - wPct * (i+1);
                }
                var off1 = 0, off2 = 0;
                if (i > 0) {
                    off1 = -2;
                    off2 = 4;
                }
                var subCoords = [subX1+off1, lly, subX2-2, lly, subX2+4, ury, subX1+off2, ury];
                var subArrow = svgContainer.polygon(subCoords).attr(subData);
                subArrow.click(function(e) { that.clickHandler(e, this, arrow); });
                subArrow.mouseover(function(e) { that.mouseOverHandler(e, this, arrow); });
                subArrow.mouseout(this.mouseOutHandler);
                subArrows.push(subArrow);
            }
        }

        arrow.click(function(e) { that.clickHandler(e, this, arrow); });
        arrow.mouseover(function(e) { that.mouseOverHandler(e, this, arrow); });
        arrow.mouseout(that.mouseOutHandler);

        return {arrow: arrow, subArrows: subArrows};
    }


    drawTitle(svgContainer, ypos, data, titleHeight, xPadding) {
        var urVer = this.uniRefSupport.getVersion();
        var title = "";
        var idType = "UniProt";
        if (urVer !== false && urVer > 0 && !this.hasIdQuery) {
            if (this.uniRefSupport.getShowUniRefUi()) {
                idType = "UniRef"+urVer;
            } else if (urVer == 50) {
                idType = "UniRef90";
            }
        }
        if (data.hasOwnProperty("accession"))
            title = title + "Query " + idType + " ID: " + data.accession + "; ";
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
        if (title.length > 0) {
            var textObj = svgContainer.text(xPadding, ypos, title);
            textObj.attr({'class':'diagram-title'});
        }
        if (this.showUniRefTitleInfo()) {
            var info = this.uniRefSupport.getUniRefSizeFieldInfo(data);
            var infoText = "Number of " + info.ValueFieldName + " IDs in " + info.UniRefType + " cluster: ";
            infoText += info.UniRefSize;
            //if (urVer == 90)
            //    info += "UniProt: " + uniRefSize;
            //if (urVer == 50)
            //    info += "UniRef90: " + uniRefSize;
            var textObj = svgContainer.text(xPadding, ypos + titleHeight, infoText);
            textObj.attr({'class':'diagram-title'});
        }
    }


    drawUniRefExpand(svgContainer, ypos, xpos, data) {
        if (!this.uniRefSupport.showUniRefExpandButton(data))
            return;
        var that = this;
        var textObj = svgContainer.text(0, ypos, "")
            .attr({fontFamily: "FontAwesome", fontSize: "1.5em", cursor: "pointer"})
            .click(function(e) {
                var id = data.accession;
                var url = new URL(window.location.href);
                that.uniRefSupport.updateLinkRequestParams(id, url.searchParams);
                window.open(url.toString());
            });
        //textObj.append(Snap.parse('<title>Open UniRef</title>'));
        //var size = 8;
        //svgContainer.rect(-3, ypos-size-3, size*2+6, size*2+6)
        //    .attr({ 'fill': 'white' })
        //    .click(function(e) { alert("New window"); });
        //svgContainer.line(0, ypos, size*2, ypos)
        //    .attr({ 'stroke': this.axisColor, 'strokeWidth': 3 })
        //    .click(function(e) { alert("New window"); });
        //svgContainer.line(size, ypos-size, size, ypos+size)
        //    .attr({ 'stroke': this.axisColor, 'strokeWidth': 3 })
        //    .click(function(e) { alert("New window"); });
    }


    drawAxis(svgContainer, ypos, drawingWidth, xPadding, minXpct, maxXpct, isBound, isComplement) {
        ypos = ypos + this.axisThickness - 1;
        // A single line, full width:
        //svgContainer.line(xPadding, ypos, xPadding + drawingWidth, ypos).attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness });
        var minx = xPadding + minXpct * drawingWidth - 3;
        //if (minx < xPadding)
        //    minx = xPadding;
        svgContainer.line(minx, ypos,
                          xPadding + maxXpct * drawingWidth + 3, ypos)
            .attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness });

        if (isBound & 1) { // end of contig on left
            var xc = isComplement ? maxXpct * drawingWidth + 3 :
                                    minXpct * drawingWidth - 3;
            svgContainer.line(xPadding + xc, ypos - 5,
                              xPadding + xc, ypos + 5)
            //svgContainer.line(xPadding + minXpct * drawingWidth - 3, ypos - 5,
            //                  xPadding + minXpct * drawingWidth - 3, ypos + 5)
                .attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness });
        } else if (minXpct > 0) {
            var x1 = isComplement ? maxXpct * drawingWidth + 3 :
                                    0;
            var x2 = isComplement ? drawingWidth :
                                    minXpct * drawingWidth - 3;
            svgContainer.line(xPadding + x1, ypos,
                              xPadding + x2, ypos)
            //svgContainer.line(xPadding, ypos,
            //                  xPadding + minXpct * drawingWidth - 3, ypos)
                .attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness, 'stroke-dasharray': '2px, 4px' });
        }

        if (isBound & 2) { // end of contig on right
            var xc = isComplement ? minXpct * drawingWidth - 3 :
                                    maxXpct * drawingWidth + 3;
            svgContainer.line(xPadding + xc, ypos - 5,
                              xPadding + xc, ypos + 5)
            //svgContainer.line(xPadding + maxXpct * drawingWidth + 3, ypos - 5,
            //                  xPadding + maxXpct * drawingWidth + 3, ypos + 5)
                .attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness });
        } else if (minXpct > 0) {
            var x1 = isComplement ? 0 :
                                    maxXpct * drawingWidth + 3;
            var x2 = isComplement ? minXpct * drawingWidth - 3 :
                                    drawingWidth;
            svgContainer.line(xPadding + x1, ypos,
                              xPadding + x2, ypos)
            //svgContainer.line(xPadding + maxXpct * drawingWidth + 3, ypos,
            //                  xPadding + drawingWidth, ypos)
                .attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness, 'stroke-dasharray': '2px, 4px' });
        }
    }


    drawLegendLine(index, diagramHeight, drawingWidth) {
        if (this.legendGroup)
            this.legendGroup.remove();

        var ypos = index * diagramHeight + this.padding + this.fontHeight + this.topPadding;

        var legendScale = this.legendScale; // This comes in base-pair units, whereas the GUI displays things in terms of AA position.
        var l1 = Math.log10(legendScale);
        var l2 = Math.ceil(l1) - 2;
        var legendLength = Math.pow(10, l2); // In AA
        var legendBp = legendLength * 3;
        var legendScaleFactor = drawingWidth / legendScale;
        var lineLength = legendBp * legendScaleFactor;
        var legendText = legendLength * 3 / 1000;

        var group = this.S.paper.group();

        group.line(this.padding, ypos, this.padding + lineLength, ypos)
            .attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness });
        group.line(this.padding, ypos - 5, this.padding, ypos + 5)
            .attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness });
        group.line(this.padding + lineLength, ypos - 5, this.padding + lineLength, ypos + 5)
            .attr({ 'stroke': this.axisColor, 'strokeWidth': this.axisThickness });

        var textYpos = index * diagramHeight + this.fontHeight;
        var textObj = group.text(this.padding, textYpos, "Scale:");
        textObj.attr({'class':'diagram-title'});

        var textYpos = index * diagramHeight + this.fontHeight * 2;
        textObj = group.text(this.padding + lineLength + 10, textYpos, legendText + " kbp");
        textObj.attr({'class':'diagram-title'});

        this.legendGroup = group;
    }


    getArrowClickHandler() {
        var that = this;
        var clickFn = function (event, context, parentArrow) {
            // If the user presses the alt or ctrl key and clicks on an arrow, we highlight the families
            // that the arrow has.
            //
            // context is an SnapSVG object.
            var id = parentArrow.attr("arrow-id");

            if (event.ctrlKey || event.altKey) {
                that.filter.toggleFamilyFilterByArrowId(id, event.target.className.baseVal);
            } else {
                that.popup.setAutoClose(false);
            }
        };
        return clickFn;
    }


    getArrowOverHandler() {
        var that = this;
        var overEvt = function(event, context, parentArrow) {
            var id = parentArrow.attr("arrow-id");
            var yOffset = that.arrowHeight / 2;
            var bbox = parentArrow.getBBox();
            var pos = that.canvas.offset();
            var matrix = context.transform().globalMatrix;
            var boxX = matrix.x(bbox.cx, bbox.cy + yOffset) + pos.left;
            var boxY = matrix.y(bbox.cx, bbox.cy + yOffset) + pos.top;
            that.popup.setAutoClose(true);
            that.popup.showPopup(boxX, boxY, id);
        };
        return overEvt;
    }


    getArrowOutHandler() {
        var that = this;
        var outEvt = function(event) {
            that.popup.hidePopup(); // won't hide it if autoClose = false;
        };
        return outEvt;
    }

    setQueryHasProteinId(hasId) {
        this.hasIdQuery = hasId;
    }
    showUniRefTitleInfo() {
        return !this.hasIdQuery && this.uniRefSupport.showUniRefTitleInfo();
    }
}

