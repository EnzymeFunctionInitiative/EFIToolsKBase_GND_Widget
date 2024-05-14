
function getLegendSvg() {

    var selLegendItems = $("#active-filter-list div");
    var allLegendItems = []; //TODO: get the list of all families

    var width = 300;
    var rowHeight = 25;
    var xOffsetAll = 1000;
    var xOffsetSel = allLegendItems.length > 0 ? 1300 : 1000;
    var selHeight = rowHeight * selLegendItems.length;
    var allHeight = rowHeight * allLegendItems.length;

    var code = '<div style="background-color: white; width: 500px; height: 500px; position: absolute; left: 400px; top: 200px; display: none">' +
        '<svg width="' + width + 'px" height="' + selHeight + 'px" viewBox="0 0 ' + width + ' ' + selHeight + '" id="legend-export-selected"></svg>' +
        '<svg width="' + width + 'px" height="' + allHeight + 'px" viewBox="0 0 ' + width + ' ' + allHeight + '" id="legend-export-all"></svg>' +
        '</div>';
    var newCanvas = $("body").append(code);
    $("#legend-export-selected").empty();
    $("#legend-export-all").empty();

//    var that = this;
//    var allSvg = Snap("#legend-export-all");
//    G = allSvg.paper.group();
//    allLegendItems.each(function(i, elem) {
//        var span = elem.childNodes[0];
//        if (span !== undefined) {
//            var color = that.arrows.getPfamColor(id);
//            var text = elem.childNodes[1];
//            if (text !== undefined) {
//                var g = G.group();
//                g.text(28+xOffsetAll, rowHeight*i+22, text.data).attr({'font-size': "15px"});
//                var c = g.rect(5+xOffsetAll, rowHeight*i+5, 20, 20);
//                c.attr({fill: color});
//            }
//        }
//    });
//
//    var allSvgMarkup = allSvg.outerSVG();
    var allSvgMarkup = "";

    var svg = Snap("#legend-export-selected");
    var G = svg.paper.group();
    selLegendItems.each(function(i, elem) {
        var span = elem.childNodes[0];
        if (span !== undefined) {
            var color = span.style.backgroundColor;
            var text = elem.childNodes[1];
            if (text !== undefined) {
                var g = G.group();
                g.text(28+xOffsetSel, rowHeight*i+22, text.data); //.attr({'font-size': "15px"});
                var c = g.rect(5+xOffsetSel, rowHeight*i+5, 20, 20);
                c.attr({fill: color});
            }
        }
    });

    var selSvgMarkup = svg.outerSVG();

    return [allSvgMarkup, selSvgMarkup, allHeight, selHeight];
}

