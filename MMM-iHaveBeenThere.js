/* MMM-iHaveBeenThere.js
 * MagicMirror module for displaying travel history on a map using amCharts 4
 * 
 * By Sebastian Merkel. Updated by Harshit S
 * MIT Licensed
 */

Module.register("MMM-iHaveBeenThere", {
  /**
   * Module config defaults
   */
  defaults: {
    // Display settings
    title: "My Travels",
    displayDesc: true,        // Show location descriptions
    zoomLevel: 1,          // Initial map zoom level
    zoomLongitude: 10,       // Initial center longitude
    zoomLatitude: 45,        // Initial center latitude

    // Animation settings
    animationEnabled: true,   // Enable plane animation
    animationDuration: 5,   // Duration of each flight in seconds
    pauseDuration: 1,      // Pause between flights in seconds

    // Home location
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
    colorCountries: "#777777",      // Country fill color
    colorCountryBorders: "#000000", // Country border color
    colorTargetPoints: "#777777",   // Location marker color
    colorPlane: "#FF0000",         // Plane icon color
    colorPlaneLine: "#BBBBBB",     // Flight path line color
    colorLegendBorder: "#FFFFFF",  // Legend border color
    colorLegendFont: "#FFFFFF",    // Legend text color
    colorTitleFont: "#FFFFFF"      // Title text color
  },

  /**
   * Required scripts for amCharts 4
   */
  getScripts: function() {
    return [
      "https://cdn.amcharts.com/lib/4/core.js",
      "https://cdn.amcharts.com/lib/4/maps.js",
      "https://cdn.amcharts.com/lib/4/geodata/worldLow.js",
      "https://cdn.amcharts.com/lib/4/themes/animated.js"
    ];
  },

  /**
   * Create module DOM element
   */
  getDom: function() {
    const wrapper = document.createElement("div");
    wrapper.style.width = "100%";
    wrapper.style.height = "700px";
    wrapper.id = "chartdiv";
    return wrapper;
  },

  /**
   * Initialize the module
   */
  start: function() {
    const self = this;
    
    setTimeout(function() {
      // Initialize amCharts theme
      am4core.useTheme(am4themes_animated);

      // Create map instance
      const chart = am4core.create("chartdiv", am4maps.MapChart);
      chart.geodata = am4geodata_worldLow;
      chart.projection = new am4maps.projections.Miller();

      // Configure map view
      chart.homeZoomLevel = self.config.zoomLevel;
      chart.homeGeoPoint = {
        latitude: self.config.zoomLatitude,
        longitude: self.config.zoomLongitude
      };
      chart.mouseWheelBehavior = "zoom";

      // Create base map
      const polygonSeries = chart.series.push(new am4maps.MapPolygonSeries());
      polygonSeries.useGeodata = true;
      polygonSeries.exclude = ["AQ"]; // Exclude Antarctica
      polygonSeries.mapPolygons.template.fill = self.config.colorCountries;
      polygonSeries.mapPolygons.template.stroke = self.config.colorCountryBorders;
      polygonSeries.mapPolygons.template.nonScalingStroke = true;

      // Create location markers
      const cities = chart.series.push(new am4maps.MapImageSeries());
      cities.mapImages.template.nonScaling = true;

      const city = cities.mapImages.template.createChild(am4core.Circle);
      city.radius = 5;
      city.tooltipY = 0;
      city.fill = self.config.colorTargetPoints;
      city.strokeWidth = 2;
      city.stroke = "#DDD";

      // Helper function to add cities
      function addCity(coords, title) {
        const city = cities.mapImages.create();
        city.latitude = coords.latitude;
        city.longitude = coords.longitude;
        city.tooltipText = title;
        return city;
      }

      // Add all locations
      const cityPoints = [];
      cityPoints.push(addCity(self.config.home, self.config.home.description));

      self.config.trips.forEach(trip => {
        cityPoints.push(addCity(trip, trip.description));
      });

      // Create flight paths
      const lineSeries = chart.series.push(new am4maps.MapArcSeries());
      lineSeries.mapLines.template.line.strokeWidth = 2;
      lineSeries.mapLines.template.line.strokeOpacity = 0.4;
      lineSeries.mapLines.template.line.stroke = self.config.colorPlaneLine;
      lineSeries.mapLines.template.line.nonScalingStroke = true;
      lineSeries.mapLines.template.line.strokeDasharray = "1,1";
      lineSeries.zIndex = 10;

      // Create shadow lines for animation
      const shadowLineSeries = chart.series.push(new am4maps.MapLineSeries());
      shadowLineSeries.mapLines.template.line.strokeOpacity = 0;
      shadowLineSeries.mapLines.template.line.nonScalingStroke = true;
      shadowLineSeries.mapLines.template.shortestDistance = false;
      shadowLineSeries.zIndex = 5;

      // Helper function to add flight paths
      function addLine(from, to) {
        const line = lineSeries.mapLines.create();
        line.imagesToConnect = [from, to];
        line.line.controlPointDistance = -0.3;

        const shadowLine = shadowLineSeries.mapLines.create();
        shadowLine.imagesToConnect = [from, to];
        return line;
      }

      // Add all flight paths
      self.config.trips.forEach((trip, index) => {
        if (trip.isConnectedToPrevious && index > 0) {
          addLine(cityPoints[index], cityPoints[index + 1]);
        } else {
          addLine(cityPoints[0], cityPoints[index + 1]);
        }
      });

      // Add plane animation if enabled
      if (self.config.animationEnabled) {
        // Create plane object
        const plane = lineSeries.mapLines.getIndex(0).lineObjects.create();
        plane.position = 0;
        plane.width = 48;
        plane.height = 48;

        plane.adapter.add("scale", (scale, target) => {
          return 0.5 * (1 - (Math.abs(0.5 - target.position)));
        });

        // Create plane icon
        const planeImage = plane.createChild(am4core.Sprite);
        planeImage.scale = 0.2;
        planeImage.horizontalCenter = "middle";
        planeImage.verticalCenter = "middle";
        planeImage.path = "m2,106h28l24,30h72l-44,-133h35l80,132h98c21,0 21,34 0,34l-98,0 -80,134h-35l43,-133h-71l-24,30h-28l15,-47";
        planeImage.fill = self.config.colorPlane;
        planeImage.strokeOpacity = 0;

        // Create shadow plane
        const shadowPlane = shadowLineSeries.mapLines.getIndex(0).lineObjects.create();
        shadowPlane.position = 0;
        shadowPlane.width = 48;
        shadowPlane.height = 48;

        const shadowPlaneImage = shadowPlane.createChild(am4core.Sprite);
        shadowPlaneImage.scale = 0.05;
        shadowPlaneImage.horizontalCenter = "middle";
        shadowPlaneImage.verticalCenter = "middle";
        shadowPlaneImage.path = planeImage.path;
        shadowPlaneImage.fill = am4core.color("#000");
        shadowPlaneImage.strokeOpacity = 0;

        shadowPlane.adapter.add("scale", (scale, target) => {
          target.opacity = (0.6 - (Math.abs(0.5 - target.position)));
          return 0.5 - 0.3 * (1 - (Math.abs(0.5 - target.position)));
        });

        // Plane animation logic
        let currentLine = 0;
        let direction = 1;

        function flyPlane() {
          plane.mapLine = lineSeries.mapLines.getIndex(currentLine);
          plane.parent = lineSeries;
          shadowPlane.mapLine = shadowLineSeries.mapLines.getIndex(currentLine);
          shadowPlane.parent = shadowLineSeries;
          shadowPlaneImage.rotation = planeImage.rotation;

          const numLines = lineSeries.mapLines.length;
          const [from, to] = direction === 1 ? [0, 1] : [1, 0];

          // Handle plane rotation
          if ((direction === 1 && planeImage.rotation !== 0) || 
              (direction === -1 && planeImage.rotation !== 180)) {
            planeImage.animate({
              to: direction === 1 ? 0 : 180,
              property: "rotation"
            }, 1000).events.on("animationended", flyPlane);
            return;
          }

          // Animate plane position
          const animation = plane.animate({
            from: from,
            to: to,
            property: "position"
          }, self.config.animationDuration * 1000, am4core.ease.sinInOut);

          animation.events.on("animationended", () => {
            if (self.config.pauseDuration > 0) {
              setTimeout(flyPlane, self.config.pauseDuration * 1000);
            } else {
              flyPlane();
            }
          });

          // Animate shadow
          shadowPlane.animate({
            from: from,
            to: to,
            property: "position"
          }, self.config.animationDuration * 1000, am4core.ease.sinInOut);

          // Update line and direction
          currentLine += direction;
          if (currentLine < 0) {
            currentLine = 0;
            direction = 1;
          } else if ((currentLine + 1) > numLines) {
            currentLine = numLines - 1;
            direction = -1;
          }
        }

        // Start animation
        flyPlane();
      }

      // Add title if configured
      if (self.config.title) {
        const title = chart.titles.create();
        title.text = self.config.title;
        title.fontSize = 25;
        title.marginBottom = 30;
        title.align = "center";
        title.fill = am4core.color(self.config.colorTitleFont);
      }

      // Clean up on hide
      self.onHide = function() {
        chart.dispose();
      };

    }, 1000);
  }
});