/* MMM-iHaveBeenThere.js */

Module.register("MMM-iHaveBeenThere", {
  defaults: {
    title: "My Travels",
    animationEnabled: true, // Whether to animate the plane icon
    pauseDuration: 0.0, // Animation pause duration in seconds
    animationDuration: 60.0, // Animation duration in seconds
    displayDesc: true, // Whether to show location descriptions
    zoomLevel: 4.5, // Initial map zoom level
    zoomLongitude: 10, // Initial center longitude
    zoomLatitude: 45, // Initial center latitude
    rotationEnabled: true,
    rotationDuration: 60, // Duration of one full rotation in milliseconds
    rotationX: 100,
    rotationY: -40,
	  mapType: "mercator", // orthographic, mercator

    // Home location configuration
    home: {
      latitude: 48.1548256,
      longitude: 11.4017537,
      description: "München"
    },

    // Array of trip destinations
    trips: [
      {
        latitude: 48.8588377,
        longitude: 2.2775175,
        description: "Paris 1999",
        isConnectedToPrevious: false
      },
      {
        latitude: 51.5285582,
        longitude: -0.2416802,
        description: "London 2005",
        isConnectedToPrevious: false
      },
      {
        latitude: 44.3569914,
        longitude: 24.6273942,
        description: "Bukarest 2010",
        isConnectedToPrevious: false
      },
      {
        latitude: 41.0049822,
        longitude: 28.7319992,
        description: "Istanbul 2010",
        isConnectedToPrevious: true
      }
    ],

    // Color configuration
    colorCountries: "#DADADA", // Country fill color
    colorCountryBorders: "#000000", // Country border color
    colorTargetPoints: "#FFFFFF", // Location marker color
    colorPlane: "#FF0000", // Plane icon color (if animation enabled)
    colorPlaneLine: "#FFFFFF", // Flight path line color
    colorLegendBorder: "#FFFFFF", // Legend border color
    colorLegendFont: "#FFFFFF", // Legend text color
    colorTitleFont: "#FFFFFF" // Title text color
  },

  // Required scripts for amCharts 5
  getScripts: function () {
    return [
      "https://cdn.amcharts.com/lib/4/core.js",
      "https://cdn.amcharts.com/lib/4/maps.js",
      "https://cdn.amcharts.com/lib/4/geodata/worldLow.js",
      "https://cdn.amcharts.com/lib/4/themes/animated.js"
    ];
  },

  // Create the DOM element for the module
  getDom: function () {
    const wrapper = document.createElement("div");
    wrapper.style.width = "100%";
    wrapper.style.height = "700px";
    wrapper.id = "chartdiv";
    return wrapper;
  },

  start: function() {
    const self = this;
    
    setTimeout(function() {
      // Themes begin
      am4core.useTheme(am4themes_animated);

      // Create map instance
      var chart = am4core.create("chartdiv", am4maps.MapChart);
      chart.geodata = am4geodata_worldLow;
      chart.projection = new am4maps.projections.Miller();
      
      // Set zoom level and center
      chart.homeZoomLevel = self.config.zoomLevel;
      chart.homeGeoPoint = {
        latitude: self.config.zoomLatitude,
        longitude: self.config.zoomLongitude
      };

      // Create map polygon series
      var polygonSeries = chart.series.push(new am4maps.MapPolygonSeries());
      polygonSeries.useGeodata = true;
      polygonSeries.mapPolygons.template.fill = self.config.colorCountries;
      polygonSeries.mapPolygons.template.stroke = self.config.colorCountryBorders;
      polygonSeries.mapPolygons.template.nonScalingStroke = true;
      polygonSeries.exclude = ["AQ"];

      // Add city points
      var cities = chart.series.push(new am4maps.MapImageSeries());
      cities.mapImages.template.nonScaling = true;

      var city = cities.mapImages.template.createChild(am4core.Circle);
      city.radius = 5;
      city.tooltipY = 0;
      city.fill = self.config.colorTargetPoints;
      city.strokeWidth = 2;
      city.stroke = "#DDD";

      // Function to add cities
      function addCity(coords, title) {
        var city = cities.mapImages.create();
        city.latitude = coords.latitude;
        city.longitude = coords.longitude;
        city.tooltipText = title;
        return city;
      }

      // Add home and all cities
      var cityPoints = [];
      var home = addCity(self.config.home, self.config.home.description);
      cityPoints.push(home);

      self.config.trips.forEach(trip => {
        cityPoints.push(addCity(trip, trip.description));
      });

      // Add lines
      var lineSeries = chart.series.push(new am4maps.MapArcSeries());
      lineSeries.mapLines.template.line.strokeWidth = 2;
      lineSeries.mapLines.template.line.strokeOpacity = 0.4;
      lineSeries.mapLines.template.line.stroke = self.config.colorPlaneLine;
      lineSeries.mapLines.template.line.nonScalingStroke = true;
      lineSeries.mapLines.template.line.strokeDasharray = "1,1";
      lineSeries.zIndex = 10;

      // Add shadow lines
      var shadowLineSeries = chart.series.push(new am4maps.MapLineSeries());
      shadowLineSeries.mapLines.template.line.strokeOpacity = 0;
      shadowLineSeries.mapLines.template.line.nonScalingStroke = true;
      shadowLineSeries.mapLines.template.shortestDistance = false;
      shadowLineSeries.zIndex = 5;

      // Function to add lines
      function addLine(from, to) {
        var line = lineSeries.mapLines.create();
        line.imagesToConnect = [from, to];
        line.line.controlPointDistance = -0.3;

        var shadowLine = shadowLineSeries.mapLines.create();
        shadowLine.imagesToConnect = [from, to];
        return line;
      }

      // Add all lines
      self.config.trips.forEach((trip, index) => {
        if (trip.isConnectedToPrevious && index > 0) {
          addLine(cityPoints[index], cityPoints[index + 1]);
        } else {
          addLine(cityPoints[0], cityPoints[index + 1]);
        }
      });

      // Add plane
      var plane = lineSeries.mapLines.getIndex(0).lineObjects.create();
      plane.position = 0;
      plane.width = 48;
      plane.height = 48;

      plane.adapter.add("scale", function(scale, target) {
        return 0.5 * (1 - (Math.abs(0.5 - target.position)));
      });

      var planeImage = plane.createChild(am4core.Sprite);
      planeImage.scale = 0.2;
      planeImage.horizontalCenter = "middle";
      planeImage.verticalCenter = "middle";
      planeImage.path = "m2,106h28l24,30h72l-44,-133h35l80,132h98c21,0 21,34 0,34l-98,0 -80,134h-35l43,-133h-71l-24,30h-28l15,-47";
      planeImage.fill = self.config.colorPlane;
      planeImage.strokeOpacity = 0;

      // Add shadow plane
      var shadowPlane = shadowLineSeries.mapLines.getIndex(0).lineObjects.create();
      shadowPlane.position = 0;
      shadowPlane.width = 48;
      shadowPlane.height = 48;

      var shadowPlaneImage = shadowPlane.createChild(am4core.Sprite);
      shadowPlaneImage.scale = 0.05;
      shadowPlaneImage.horizontalCenter = "middle";
      shadowPlaneImage.verticalCenter = "middle";
      shadowPlaneImage.path = "m2,106h28l24,30h72l-44,-133h35l80,132h98c21,0 21,34 0,34l-98,0 -80,134h-35l43,-133h-71l-24,30h-28l15,-47";
      shadowPlaneImage.fill = am4core.color("#000");
      shadowPlaneImage.strokeOpacity = 0;

      shadowPlane.adapter.add("scale", function(scale, target) {
        target.opacity = (0.6 - (Math.abs(0.5 - target.position)));
        return 0.5 - 0.3 * (1 - (Math.abs(0.5 - target.position)));
      });

      // Plane animation
      var currentLine = 0;
      var direction = 1;

      function flyPlane() {
        // Get current line to attach plane to
        plane.mapLine = lineSeries.mapLines.getIndex(currentLine);
        plane.parent = lineSeries;
        shadowPlane.mapLine = shadowLineSeries.mapLines.getIndex(currentLine);
        shadowPlane.parent = shadowLineSeries;
        shadowPlaneImage.rotation = planeImage.rotation;

        // Set up animation
        var from, to;
        var numLines = lineSeries.mapLines.length;

        if (direction == 1) {
          from = 0;
          to = 1;
          if (planeImage.rotation != 0) {
            planeImage.animate({ to: 0, property: "rotation" }, 1000).events.on("animationended", flyPlane);
            return;
          }
        } else {
          from = 1;
          to = 0;
          if (planeImage.rotation != 180) {
            planeImage.animate({ to: 180, property: "rotation" }, 1000).events.on("animationended", flyPlane);
            return;
          }
        }

        // Start the animation
        var animation = plane.animate({
          from: from,
          to: to,
          property: "position"
        }, 5000, am4core.ease.sinInOut);

        animation.events.on("animationended", flyPlane);

        shadowPlane.animate({
          from: from,
          to: to,
          property: "position"
        }, 5000, am4core.ease.sinInOut);

        // Increment line, or reverse the direction
        currentLine += direction;
        if (currentLine < 0) {
          currentLine = 0;
          direction = 1;
        } else if ((currentLine + 1) > numLines) {
          currentLine = numLines - 1;
          direction = -1;
        }
      }

      // Start the plane animation
      flyPlane();

      // Clean up on hide
      self.onHide = function() {
        chart.dispose();
      };

    }, 1000);
  }
});