

class GndColor {
    constructor() {
        // This is for default colors in case the app doesn't have a color assigned for a family.
        this.colors = getColors();
        this.pfamColorMap = {};
        this.pfamColorCount = 0;
        this.selectedGeneColor = "red";
    }


    ///////////////////////////////////////////////////////////////////////////////////////////
    // PUBLIC COLOR METHODS
    //
    getPfamColor(pfam) {
        if (pfam in this.pfamColorMap) {
            return this.pfamColorMap[pfam];
        } else {
            return "transparent";
        }
    }


    ////////////////////////////////////////////////////////////////////////////////////////////
    // PUBLIC 
    //
    // The Color array property in the data variable is updated in this function call, to assign
    assignColor(data, isQuery = true) {
        var colors = [];
        for (var i = 0; i < data.family.length; i++) {
            var pfam = data.family[i];
            var color;
            if (i < data.color.length)
                color = data.color[i];
            if (isQuery && i == data.family.length-1) // set the primary family to be the selected gene color
                color = this.selectedGeneColor;

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

            if (isQuery)
                colors.push(this.selectedGeneColor);
            else
                colors.push(color);
        }
        if (colors.length == 0) {
            if (isQuery)
                colors.push(this.selectedGeneColor);
            else
                colors.push("grey");
        }

        return colors;
    }
}


function getColors() {
    var colors = [
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

