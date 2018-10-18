var canvas;
var width;
var height;
var x;
var y;
var context;
var plot;
var scale;
var scaleObject;
var scaleData;
var zoom;
var pixelsPerInch = 96.3;

function Plot(data)
{
	plot = data;

	canvas = d3.select("#myCanvas");
	width = canvas[0][0].width;
	height = canvas[0][0].height;

	scaleObject = { MinY: -90, MaxY: 90, MinX: -180, MaxX: 180 };
	scaleData = GetScale(scaleObject);

	var initScale = 0.9 * (height / (scaleObject.MaxY - scaleObject.MinY));

	var translateX = scaleData.ScreenCenterX - scaleData.DataCenterX;
	var translateY = scaleData.ScreenCenterY - scaleData.DataCenterY;

	x = d3.scale.linear()
    .domain([0, width])
    .range([0, width]);
	y = d3.scale.linear()
    .domain([0, height])
    .range([height, 0]);

	zoom = d3.behavior.zoom().x(x).y(y).scaleExtent([4, 240]).translate([translateX, -translateY]).on("zoom", Draw);

	context = canvas
    .call(zoom)
    .on("mousemove", function ()
    {
        DisplayCoords();
        DisplayTip();
    })
    .node().getContext("2d");

	Draw();

	ZoomPlot(initScale);
}

function ZoomByFeet(feet, plotFn)
{
	if (feet == "") plotFn();
	if ($.isNumeric(feet)) ZoomPlot(95 / feet);
}

function ZoomPlot(initScale)
{
	// Record the coordinates (in data space) of the center (in screen space).
	var center0 = [scaleData.ScreenCenterX, scaleData.ScreenCenterY];
	var translate0 = zoom.translate();
	var coordinates0 = coordinates(center0);
	zoom.scale(initScale);

	// Translate back to the center.
	var center1 = point(coordinates0);
	zoom.translate([translate0[0] + center0[0] - center1[0], translate0[1] + center0[1] - center1[1]]);

	canvas.transition().duration(500).call(zoom.event);
}

function MovePlot(chemicalID, inchesFromLeft, inchesFromTop, callback)
{
	//Get current source coordinates in pixels
	var source = plot.Source[chemicalID];
	if (!source) return;
	var currentPixelX = x(source.X);
	var currentPixelY = y(source.Y);

	//Get absolute coordinates in pixels where we want source
	// based on the offset arguments provided in inches.
	var absolutePixelsX = inchesFromLeft * pixelsPerInch;
	var absolutePixelsY = inchesFromTop * pixelsPerInch;

	//Get the amount of pixels we need to move the source by
	// subtracting the current position from the absolute position
	var offsetX = currentPixelX - absolutePixelsX;
	var offsetY = currentPixelY - absolutePixelsY;

	//Record the coordinates (in data space) of the center (in screen space).
	var center0 = [scaleData.ScreenCenterX, scaleData.ScreenCenterY];
	var translate0 = zoom.translate();
	var coordinates0 = coordinates(center0);

	//Move center
	translate0[0] -= offsetX;
	translate0[1] -= offsetY;

	var center1 = point(coordinates0);
	zoom.translate([translate0[0] + center0[0] - center1[0], translate0[1] + center0[1] - center1[1]]);

	canvas.transition().call(zoom.event).each("end", callback);
}

function coordinates(point)
{
	var scale = zoom.scale(), translate = zoom.translate();
	return [(point[0] - translate[0]) / scale, (point[1] - translate[1]) / scale];
}

function point(coordinates)
{
	var scale = zoom.scale(), translate = zoom.translate();
	return [coordinates[0] * scale + translate[0], coordinates[1] * scale + translate[1]];
}

function Draw()
{
	if (d3.event != null)
	{
		scale = d3.event.scale;
	}

	context.clearRect(0, 0, width, height);

	//Drawing all patterns 3 times to make the patterns
	// sharper and thicker as described here...
	// http://stackoverflow.com/a/41557540
	for (var i = 0; i < 3; i++)
	{
	    PlotFrame();

		if (plot.Shores != null)
		{
		    $.each(plot.Shores, function (index, value)
			{
				PlotShore(value);
			});
		}

		if (plot.POI != null)
		{
			PlotPOIs(plot.POI);
		}

		if (plot.Messages != null)
		{
			PlotMessages(plot.Messages);
		}
	}
}

function PlotFrame()
{
    context.strokeStyle = 'black';
    context.fillStyle = 'black';

    context.beginPath();
    context.moveTo(x(scaleObject.MinX), y(scaleObject.MinY));
    context.lineTo(x(scaleObject.MinX), y(scaleObject.MaxY));
    context.lineTo(x(scaleObject.MaxX), y(scaleObject.MaxY));
    context.lineTo(x(scaleObject.MaxX), y(scaleObject.MinY));
    context.lineTo(x(scaleObject.MinX), y(scaleObject.MinY));

    context.stroke();
}

function PlotShore(line)
{
	context.strokeStyle = 'blue';
	context.fillStyle = 'blue';

	context.beginPath();
	context.moveTo(x(line[0].X), y(line[0].Y));
	for (var i = 1; i < line.length; i++)
	{
	    context.lineTo(x(line[i].X), y(line[i].Y));
	}
	context.stroke();

	context.font = 'bold 10pt Calibri';
}

function PlotPOIs(pois)
{
	context.strokeStyle = 'black';
	$.each(pois, function (index, value)
	{
		context.fillStyle = 'black';

		context.beginPath();
		context.arc(x(value.X), y(value.Y), 3, 0, 2 * Math.PI, false);

		context.font = 'bold 10pt Calibri';

		context.stroke();
	});
}

function PlotMessages(messages)
{
	context.font = 'bold 12pt Calibri';
	context.fillStyle = 'black';

	var y = -60;
	$.each(messages, function (index, value)
	{
		context.fillText(value, 20, -y);
		y = y - 12;
	});
}

function GetScale(dataMaxMin)
{
	var canvas = document.getElementById('myCanvas');

	var dataCenterX = (dataMaxMin.MaxX + dataMaxMin.MinX) / 2;
	var dataCenterY = (dataMaxMin.MaxY + dataMaxMin.MinY) / 2;
	var screenCenterX = canvas.width / 2;
	var screenCenterY = canvas.height / 2;
	var scaleFactor;

	if (canvas.width / (dataMaxMin.MaxX - dataMaxMin.MinX) < canvas.height / (dataMaxMin.MaxY - dataMaxMin.MinY)) {
		scaleFactor = (canvas.width - 60) / (dataMaxMin.MaxX - dataMaxMin.MinX);
	}
	else {
		scaleFactor = (canvas.height - 60) / (dataMaxMin.MaxY - dataMaxMin.MinY);
	}

	return {
		DataCenterX: dataCenterX,
		DataCenterY: dataCenterY,
		ScreenCenterX: screenCenterX,
		ScreenCenterY: screenCenterY,
		ScaleFactor: scaleFactor
	};
}

function DisplayCoords()
{
    var coords = GetCords();

	context.clearRect((width - 100), 20, 600, -25);
	context.fillText("(" + coords.Y.toFixed(2) + "," + coords.X.toFixed(2) + ")", (width - 100), 10)
}

function DisplayTip()
{
    var coords = GetCords();
    var tip = d3.select("#tip");
    var tipCtx = tip.node().getContext("2d");

    var hit = false;
    for (var i = 0; i < plot.POI.length; i++)
    {
        var poi = plot.POI[i];
        var dx = x(coords.X) - x(poi.X);
        var dy = y(coords.Y) - y(poi.Y);
        if(dx * dx + dy * dy < 20)
        {
            tip.style({ 'left': x(poi.X) + 25 + 'px', 'top': y(poi.Y) + 15 +'px' });
            tipCtx.clearRect(0, 0, tip[0][0].width, tip[0][0].height);

            var yText = 10;
            if (poi.Type != null)
            {
                tipCtx.fillText(poi.Type, 5, yText);
                yText = yText + 15;
            }
            
            if (poi.Region != null)
            {
                tipCtx.fillText(poi.Region, 5, yText);
                yText = yText + 15;
            }

            tipCtx.fillText(poi.Y + ', ' + poi.X, 5, yText);
            hit = true;
        }
    }
    if (!hit)
    {
        tip.style({ 'left': '-200px' });
    }
}

function GetCords(coordX, coordY)
{
    var c = $('#myCanvas');
    var rect = c[0].getBoundingClientRect();
    var xLoc = d3.event.clientX - rect.left;
    var yLoc = d3.event.clientY - rect.top;

    var percentPixelToDataX = 1 / (x(scaleObject.MaxX) - x(scaleObject.MinX));
    var pixelDistanceX = (scaleObject.MaxX - scaleObject.MinX) * percentPixelToDataX;
    var distanceFromMinX = xLoc - x(scaleObject.MinX);
    var coordX = (distanceFromMinX * pixelDistanceX) + scaleObject.MinX;

    var percentPixelToDataY = 1 / (y(scaleObject.MaxY) - y(scaleObject.MinY));
    var pixelDistanceY = (scaleObject.MaxY - scaleObject.MinY) * percentPixelToDataY;
    var distanceFromMinY = yLoc - y(scaleObject.MinY);
    var coordY = (distanceFromMinY * pixelDistanceY) + scaleObject.MinY;

    return { X: coordX, Y: coordY };
}
