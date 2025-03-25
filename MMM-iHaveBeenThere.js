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
        AnimationEnabled: true,        // Whether to animate the plane icon
        pauseDuration: 3.0,           // Animation pause duration in seconds
        animationDuration: 10.0,      // Animation duration in seconds
        displayDesc: true,            // Whether to show location descriptions
        zoomLevel: 4.5,              // Initial map zoom level
        zoomLongitude: -2,           // Initial center longitude
        zoomLatitude: 46,            // Initial center latitude

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
        colorCountries: "#BDBDBD",        // Country fill color
        colorCountryBorders: "#000000",   // Country border color
        colorTargetPoints: "#FFFFFF",     // Location marker color
        colorPlane: "#FF0000",           // Plane icon color (if animation enabled)
        colorPlaneLine: "#FFFFFF",        // Flight path line color
        colorLegendBorder: "#FFFFFF",     // Legend border color
        colorLegendFont: "#FFFFFF",       // Legend text color
        colorTitleFont: "#FFFFFF"         // Title text color
    },

    // Required scripts for amCharts 5
    getScripts: function() {
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
    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.style.width = "100%";
        wrapper.style.height = "700px";
        wrapper.id = "MapDiv";
        return wrapper;
    },

    // Create line data for the map
    createLines: function() {
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
    start: function() {
        const self = this;
        
        // Wait for DOM to be ready
        setTimeout(() => {
            // Create root element
            const root = am5.Root.new("MapDiv");

            // Set themes
            root.setThemes([am5themes_Animated.new(root)]);

            // Create the map chart
            const chart = root.container.children.push(
                am5map.MapChart.new(root, {
                    panX: "translateX",
                    panY: "translateY",
                    projection: am5map.geoMercator()
                })
            );

            // Create main polygon series for countries
            const polygonSeries = chart.series.push(
                am5map.MapPolygonSeries.new(root, {
                    geoJSON: am5geodata_worldLow,
                    exclude: ["AQ"], // Exclude Antarctica
                    fill: am5.color(self.config.colorCountries),
                    stroke: am5.color(self.config.colorCountryBorders)
                })
            );

			// Create line series for trip routes
			const lineSeries = chart.series.push(
				am5map.MapLineSeries.new(root, {
					stroke: am5.color(self.config.colorPlaneLine),
					strokeWidth: 2,
					strokeOpacity: 0.4
				})
			);

			// Add lines data
			const linesData = [];
			for (let i = 0; i < this.config.trips.length; i++) {
				const startPoint = this.config.trips[i].isConnectedToPrevious && i > 0
					? {
						latitude: this.config.trips[i - 1].latitude,
						longitude: this.config.trips[i - 1].longitude
					}
					: {
						latitude: this.config.home.latitude,
						longitude: this.config.home.longitude
					};

				linesData.push({
					geometry: {
						type: "LineString",
						coordinates: [
							[startPoint.longitude, startPoint.latitude],
							[this.config.trips[i].longitude, this.config.trips[i].latitude]
						]
					}
				});
			}
			lineSeries.data.setAll(linesData);

			// Create point series for locations
			const pointSeries = chart.series.push(
				am5map.MapPointSeries.new(root, {})
			);

			// Create point data
			const pointData = [
				// Add home location
				{
					longitude: self.config.home.longitude,
					latitude: self.config.home.latitude,
					title: self.config.home.description
				}
			];

			// Add all trip locations
			self.config.trips.forEach(trip => {
				pointData.push({
					longitude: trip.longitude,
					latitude: trip.latitude,
					title: trip.description
				});
			});

			// Configure location markers
			pointSeries.bullets.push(function() {
				const circle = am5.Circle.new(root, {
					radius: 5,
					fill: am5.color(self.config.colorTargetPoints),
					tooltipText: "{title}"
				});

				circle.states.create("hover", {
					scale: 1.2
				});

				return am5.Bullet.new(root, {
					sprite: circle
				});
			});

			// Set point data
			pointSeries.data.setAll(pointData);

            // Set map zoom and center
            chart.set("zoomLevel", self.config.zoomLevel);
            chart.set("centerMapOnZoomOut", true);
            chart.setCenter({
                longitude: self.config.zoomLongitude,
                latitude: self.config.zoomLatitude
            });

            // Add title if configured
            if (self.config.title) {
                const title = chart.children.push(
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

            // Dispose of the chart when the module is hidden
            this.onHide = function() {
                root.dispose();
            };
        }, 1000);
    }
});