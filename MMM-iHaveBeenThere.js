/* MMM-iHaveBeenThere.js
 * A MagicMirror module to display travel history on a map
 * Uses amCharts 5 for map visualization
 *
 * By Sebastian Merkel (Original)
 * Updated to amCharts 5
 * MIT Licensed.
 */

Module.register("MMM-iHaveBeenThere", {
  // Default module config
  defaults: {
    title: "My Holidays",
    animationEnabled: true, // Whether to animate the plane icon
    pauseDuration: 0.0, // Animation pause duration in seconds
    animationDuration: 60.0, // Animation duration in seconds
    displayDesc: true, // Whether to show location descriptions
    zoomLevel: 4.5, // Initial map zoom level
    zoomLongitude: -60, // Initial center longitude
    zoomLatitude: 30, // Initial center latitude
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
    colorCountries: "#BDBDBD", // Country fill color
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
      // Core amCharts 5 files
      "https://cdn.amcharts.com/lib/5/index.js",
      // Map plugin
      "https://cdn.amcharts.com/lib/5/map.js",
      // World map geodata
      "https://cdn.amcharts.com/lib/5/geodata/worldLow.js",
      // Animation theme
      "https://cdn.amcharts.com/lib/5/themes/Animated.js"
    ];
  },

  // Create the DOM element for the module
  getDom: function () {
    const wrapper = document.createElement("div");
    wrapper.style.width = "100%";
    wrapper.style.height = "700px";
    wrapper.id = "MapDiv";
    return wrapper;
  },

  // Create line data for the map
  createLines: function () {
    const lines = [];
    for (let i = 0; i < this.config.trips.length; i++) {
      const line = {
        geometry: {
          type: "LineString",
          coordinates: []
        }
      };

      // Determine starting point (home or previous destination)
      if (this.config.trips[i].isConnectedToPrevious && i > 0) {
        line.geometry.coordinates.push([
          this.config.trips[i - 1].longitude,
          this.config.trips[i - 1].latitude
        ]);
      } else {
        line.geometry.coordinates.push([
          this.config.home.longitude,
          this.config.home.latitude
        ]);
      }

      // Add destination point
      line.geometry.coordinates.push([
        this.config.trips[i].longitude,
        this.config.trips[i].latitude
      ]);

      lines.push(line);
    }
    return lines;
  },

  // Initialize the module
  start: function () {
    const self = this;

    setTimeout(() => {
      // Create root element
      const root = am5.Root.new("MapDiv");

      // Set themes
      root.setThemes([am5themes_Animated.new(root)]);
      
      // Create the map chart
      const chart = root.container.children.push(
        am5map.MapChart.new(root, {})
      );

	  if (self.config.mapType == "orthographic") {
		chart.set("projection", am5map.geoOrthographic());
	  	chart.set("panX", "rotateX");
		chart.set("panY", "rotateY");
		chart.set("wheelX", "none");
		chart.set("wheelY", "none");  
		chart.set("rotationX", self.config.rotationX);
		chart.set("rotationY", self.config.rotationY);
	  } else {
		chart.set("projection", am5map.geoMercator());
	  	chart.set("panX", "translateX");
	  	chart.set("panY", "translateY");
	  }
	  
      // Add cleanup for the rotation interval when the module is hidden
      this.onHide = function () {
        // clearInterval(rotationInterval);
        root.dispose();
      };
      // // Create series for background fill
      // const backgroundSeries = chart.series.push(am5map.MapPolygonSeries.new(root, {}));
      // backgroundSeries.mapPolygons.template.setAll({
      // 	fill: root.interfaceColors.get("alternativeBackground"),
      // 	fillOpacity: 0,
      // 	strokeOpacity: 0
      // });

      // // Add background polygon
      // backgroundSeries.data.push({
      // 	geometry: am5map.getGeoRectangle(90, 180, -90, -180)
      // });

      // Create main polygon series for countries
      const polygonSeries = chart.series.push(
        am5map.MapPolygonSeries.new(root, {
          geoJSON: am5geodata_worldLow,
          exclude: ["AQ"], // Exclude Antarctica
          fill: am5.color(self.config.colorCountries),
          stroke: am5.color(self.config.colorCountryBorders)
        })
      );

      // Create line series for trajectory lines
      const lineSeries = chart.series.push(am5map.MapLineSeries.new(root, {}));
      lineSeries.mapLines.template.setAll({
        stroke: am5.color(self.config.colorPlaneLine)
        // strokeWidth: 2,
        // strokeOpacity: 0.4,
      });

      // Create point series for markers
      const pointSeries = chart.series.push(
        am5map.MapPointSeries.new(root, {})
      );

      // Configure point markers
      pointSeries.bullets.push(function () {
        const circle = am5.Circle.new(root, {
          radius: 5,
          tooltipY: 0,
          fill: am5.color(self.config.colorTargetPoints),
          stroke: root.interfaceColors.get("background"),
          strokeWidth: 2,
          tooltipText: "{title}"
        });

        return am5.Bullet.new(root, {
          sprite: circle
        });
      });

      // Add home location
      const home = addLocation({
        latitude: self.config.home.latitude,
        longitude: self.config.home.longitude,
        title: self.config.home.description
      });

      // Array to store all points for connecting lines
      const points = [home];

      // Add all trip locations
      self.config.trips.forEach((trip, index) => {
        const location = addLocation({
          latitude: trip.latitude,
          longitude: trip.longitude,
          title: trip.description
        });
        points.push(location);

        // Create line from home or previous point
        if (trip.isConnectedToPrevious && index > 0) {
          lineSeries.pushDataItem({
            pointsToConnect: [points[index], location]
          });
        } else {
          lineSeries.pushDataItem({
            pointsToConnect: [home, location]
          });
        }
      });

      // Helper function to add locations
      function addLocation(coords) {
        return pointSeries.pushDataItem({
          latitude: coords.latitude,
          longitude: coords.longitude,
          title: coords.title
        });
      }

      // Set map zoom and center
      // Set map zoom and center
      chart.set("zoom", self.config.zoomLevel);
      chart.set("centerGeoPoint", {
        latitude: self.config.zoomLatitude,
        longitude: self.config.zoomLongitude
      });

      if (self.config.rotationEnabled) {
        // Add continuous rotation animation
        chart.animate({
          key: "rotationX",
          from: 0,
          to: 360,
          duration: self.config.rotationDuration * 1000,
          loops: Infinity
        });
      }

      // Add title if configured
      if (self.config.title) {
        chart.children.push(
          am5.Label.new(root, {
            text: self.config.title,
            fontSize: 25,
            fill: am5.color(self.config.colorTitleFont),
            x: am5.percent(50),
            centerX: am5.percent(50),
            paddingTop: 15,
            paddingBottom: 15
          })
        );
      }

      // Add legend if enabled
      if (self.config.displayDesc) {
        const legend = chart.children.push(
          am5.Legend.new(root, {
            centerX: am5.percent(50),
            x: am5.percent(50),
            layout: root.horizontalLayout
          })
        );
        legend.data.setAll(pointSeries.dataItems);
      }

      // Optional: Add plane animation if enabled
      if (self.config.animationEnabled) {
        // Create line series for trajectory lines
        const lineSeries = chart.series.push(
          am5map.MapLineSeries.new(root, {})
        );
        lineSeries.mapLines.template.setAll({
          stroke: am5.color(self.config.colorPlaneLine),
          strokeWidth: 2,
          strokeOpacity: 0.4
        });

        // Helper function to add locations
        function addLocation(coords) {
          return pointSeries.pushDataItem({
            latitude: coords.latitude,
            longitude: coords.longitude
          });
        }

        // Add all points and create lineDataItem
        const points = [];
        points.push(addLocation(self.config.home)); // Add home

        // Add all trips
        self.config.trips.forEach((trip) => {
          points.push(addLocation(trip));
        });

        // Create line connecting all points
        const lineDataItem = lineSeries.pushDataItem({
          pointsToConnect: points
        });

        // Create plane series
        const planeSeries = chart.series.push(
          am5map.MapPointSeries.new(root, {})
        );

        // Create plane sprite
        const plane = am5.Graphics.new(root, {
          svgPath:
            "m2,106h28l24,30h72l-44,-133h35l80,132h98c21,0 21,34 0,34l-98,0 -80,134h-35l43,-133h-71l-24,30h-28l15,-47",
          scale: 0.06,
          centerY: am5.p50,
          centerX: am5.p50,
          fill: am5.color(self.config.colorPlane)
        });

        // Add plane to series
        planeSeries.bullets.push(function () {
          const container = am5.Container.new(root, {});
          container.children.push(plane);
          return am5.Bullet.new(root, { sprite: container });
        });

        // Create plane data item
        const planeDataItem = planeSeries.pushDataItem({
          lineDataItem: lineDataItem,
          positionOnLine: 0,
          autoRotate: true
        });

        // Add data context for rotation handling
        planeDataItem.dataContext = {};

        console.log(self.config.animationDuration);

        // Animate plane
        planeDataItem.animate({
          key: "positionOnLine",
          to: 1,
          duration: self.config.animationDuration * 1000,
          loops: Infinity,
          easing: am5.ease.yoyo(am5.ease.linear)
        });

        // Handle plane rotation
        planeDataItem.on("positionOnLine", (value) => {
          if (planeDataItem.dataContext.prevPosition < value) {
            plane.set("rotation", 0);
          }
          if (planeDataItem.dataContext.prevPosition > value) {
            plane.set("rotation", -180);
          }
          planeDataItem.dataContext.prevPosition = value;
        });
      }

      // Make stuff animate on load
      chart.appear(1000, 100);

      // Dispose of the chart when the module is hidden
      this.onHide = function () {
        clearInterval(rotationInterval);
        root.dispose();
      };
    }, 1000);
  }
});
